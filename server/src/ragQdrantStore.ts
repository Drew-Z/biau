import { createHash } from 'node:crypto'
import { env } from './env.js'
import { publicKnowledgeV2, retrieveKnowledge } from './knowledge.js'
import { embedText, embedTexts, EmbeddingDimensionMismatchError, EmbeddingProviderError, isExternalEmbeddingConfigured } from './ragEmbeddings.js'
import type {
  AssistantScope,
  Citation,
  RagChunkCitation,
  RagHealthResponse,
  RagRetrievePayload,
  RagRetrieveResponse,
  RagSyncDocument,
  RagSyncPayload,
  RagSyncResponse,
} from './types.js'

interface QdrantScoredPoint {
  id: string | number
  score: number
  payload?: Record<string, unknown>
}

interface QdrantPayload {
  scope: AssistantScope
  source: 'public-knowledge-v2' | 'internal-knowledge-documents'
  documentId: string
  chunkId: string
  title: string
  summary: string
  href: string
  tags: string[]
  visibility: AssistantScope
  sourceType: string
  projectId?: string
  section: string
  text: string
  contentHash: string
}

interface QdrantCandidate {
  chunk: RagChunkCitation
  citation: Citation
}

const SERVICE_NAME = 'biau-rag-orchestrator'
const QDRANT_STORE_NAME = 'qdrant'
const DEFAULT_QDRANT_DIMENSION = 4096
const QDRANT_BATCH_SIZE = 32
const INTERNAL_CHUNK_TARGET_LENGTH = 1200
const QDRANT_DISTANCE = 'Cosine'
const QDRANT_TIMEOUT_MS = 15000

class QdrantProviderError extends Error {
  readonly reason: string
  readonly httpStatus?: number
  readonly expectedDimension?: number
  readonly actualDimension?: number
  readonly providerStep?: string
  readonly errorKind?: string
  readonly attemptedEndpoints?: number
  readonly timeoutMs?: number

  constructor(
    reason: string,
    httpStatus?: number,
    details: {
      expectedDimension?: number
      actualDimension?: number
      providerStep?: string
      errorKind?: string
      attemptedEndpoints?: number
      timeoutMs?: number
    } = {},
  ) {
    super(reason)
    this.name = 'QdrantProviderError'
    this.reason = reason
    this.httpStatus = httpStatus
    if (typeof details.expectedDimension === 'number') this.expectedDimension = details.expectedDimension
    if (typeof details.actualDimension === 'number') this.actualDimension = details.actualDimension
    if (typeof details.providerStep === 'string') this.providerStep = details.providerStep
    if (typeof details.errorKind === 'string') this.errorKind = details.errorKind
    if (typeof details.attemptedEndpoints === 'number') this.attemptedEndpoints = details.attemptedEndpoints
    if (typeof details.timeoutMs === 'number') this.timeoutMs = details.timeoutMs
  }
}

export function isQdrantRagStoreSelected() {
  return env.ragStoreProvider.toLowerCase() === 'qdrant'
}

export function isQdrantRagStoreConfigured() {
  return isQdrantRagStoreSelected() && Boolean(env.qdrantUrl && env.qdrantApiKey && env.qdrantPublicCollection)
}

export async function getQdrantRagHealth(): Promise<RagHealthResponse> {
  if (!isQdrantRagStoreConfigured()) return emptyQdrantHealth()

  const [publicCount, internalCount] = await Promise.all([
    getCollectionPointCount(env.qdrantPublicCollection).catch(() => 0),
    env.qdrantInternalCollection ? getCollectionPointCount(env.qdrantInternalCollection).catch(() => 0) : Promise.resolve(0),
  ])
  const chunkCount = publicCount + internalCount

  return {
    ok: true,
    service: SERVICE_NAME,
    store: QDRANT_STORE_NAME,
    vectorReady: chunkCount > 0,
    keywordReady: (publicKnowledgeV2?.knowledge_chunks.length ?? 0) > 0,
    rerankerReady: true,
    lastSyncAt: null,
    documentCount: publicCount > 0 ? publicKnowledgeV2?.public_documents.length ?? 0 : 0,
    chunkCount,
    entityCount: publicKnowledgeV2?.entities.length ?? 0,
    relationCount: publicKnowledgeV2?.relations.length ?? 0,
    collections: {
      public: buildCollectionHealth(env.qdrantPublicCollection, 'public', publicCount),
      ...(env.qdrantInternalCollection ? { internal: buildCollectionHealth(env.qdrantInternalCollection, 'internal', internalCount) } : {}),
    },
  }
}

export async function retrieveQdrantRagContext(
  payload: Required<Pick<RagRetrievePayload, 'query' | 'scope'>> & Omit<RagRetrievePayload, 'query' | 'scope'>,
): Promise<RagRetrieveResponse | null> {
  if (!isQdrantRagStoreConfigured()) return null

  const limit = normalizeRetrieveLimit(payload.limit)
  const localSignal = retrieveKnowledge(payload.query, limit)
  if (localSignal.intent === 'private-credential') {
    return buildEmptyResponse(localSignal.intent, 'private-credential')
  }

  const embedding = await embedText(payload.query, { expectedDimensions: expectedEmbeddingDimensions() }).catch(() => null)
  if (!embedding) return null

  const collections = payload.scope === 'public' ? [env.qdrantPublicCollection] : [env.qdrantPublicCollection, env.qdrantInternalCollection].filter(Boolean)
  const queryLimit = Math.max(8, limit * 6)
  const points = (
    await Promise.all(collections.map((collection) => queryCollection(collection, embedding.vector, queryLimit).catch(() => [])))
  ).flat()
  const candidates = mergeCandidates(points)
  if (candidates.length === 0) return null

  const citations = buildCitations(candidates, limit)
  const citationIds = new Set(citations.map((citation) => citation.id))
  const chunks = candidates
    .filter((candidate) => citationIds.has(candidate.chunk.documentId))
    .map((candidate) => candidate.chunk)
    .slice(0, Math.max(1, limit))
  const sufficiency = citations.length >= 2 || chunks.length >= 2 ? 'enough' : 'weak'

  return {
    intent: localSignal.intent,
    citations,
    chunks,
    meta: {
      retrievalMode: 'agentic-hybrid-qdrant',
      store: QDRANT_STORE_NAME,
      candidateCount: candidates.length,
      reranked: true,
      sufficient: sufficiency === 'enough',
      sufficiency,
      fallbackReason: null,
      citationCount: citations.length,
      expandedEntityCount: localSignal.expandedEntityIds.length,
      modelCalls: embedding.modelCalls,
    },
  }
}

export async function syncQdrantRagStore(): Promise<RagSyncResponse | null> {
  if (!isQdrantRagStoreConfigured()) return null
  if (!publicKnowledgeV2) return qdrantSyncDiagnostics(false, 'public', 'server/data/public-knowledge-v2.json', '', 0, 0, 1)

  try {
    await ensureQdrantCollection(env.qdrantPublicCollection)
    if (!isExternalEmbeddingConfigured()) {
      const localEmbedding = await embedText('dimension check').catch(() => null)
      if (!localEmbedding || localEmbedding.dimensions !== expectedEmbeddingDimensions()) {
        return qdrantSyncDiagnostics(
          false,
          'public',
          'server/data/public-knowledge-v2.json',
          hashJson(publicKnowledgeV2),
          publicKnowledgeV2.public_documents.length,
          publicKnowledgeV2.knowledge_chunks.length,
          1,
          'embedding_dimension_mismatch',
          undefined,
          {
            expectedDimension: expectedEmbeddingDimensions(),
            actualDimension: localEmbedding?.dimensions,
          },
        )
      }
    }

    const documentById = new Map(publicKnowledgeV2.public_documents.map((document) => [document.id, document]))
    const syncInputs = publicKnowledgeV2.knowledge_chunks
      .map((chunk) => {
        const document = documentById.get(chunk.documentId)
        if (!document) return null
        return {
          chunk,
          document,
          embeddingText: [chunk.section, chunk.text, ...chunk.metadata.tags].join('\n'),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
    const embeddings = await embedTexts(
      syncInputs.map((input) => input.embeddingText),
      { expectedDimensions: expectedEmbeddingDimensions() },
    )
    const points = []
    for (const [index, input] of syncInputs.entries()) {
      const embedding = embeddings[index]
      const { chunk, document } = input
      points.push({
        id: toQdrantPointId(chunk.id),
        vector: embedding.vector,
        payload: {
          scope: 'public',
          source: 'public-knowledge-v2',
          documentId: document.id,
          chunkId: chunk.id,
          title: document.title,
          summary: document.summary,
          href: document.href,
          tags: document.tags,
          visibility: document.visibility,
          sourceType: document.sourceType,
          projectId: document.projectId,
          section: chunk.section,
          text: chunk.text,
          contentHash: hashJson({ document, chunk }),
        } satisfies QdrantPayload,
      })
    }

    for (let index = 0; index < points.length; index += QDRANT_BATCH_SIZE) {
      await requestQdrantJson(
        `/collections/${encodeURIComponent(env.qdrantPublicCollection)}/points?wait=true`,
        'PUT',
        {
          points: points.slice(index, index + QDRANT_BATCH_SIZE),
        },
        'qdrant_upsert_points',
      )
    }

    const issueCount = await deleteStalePublicPoints(new Set(publicKnowledgeV2.knowledge_chunks.map((chunk) => chunk.id))).catch(() => 1)
    return qdrantSyncDiagnostics(
      true,
      'public',
      'server/data/public-knowledge-v2.json',
      hashJson(publicKnowledgeV2),
      publicKnowledgeV2.public_documents.length,
      points.length,
      issueCount,
    )
  } catch (error) {
    const providerError = normalizeQdrantError(error)
    return qdrantSyncDiagnostics(
      false,
      'public',
      'server/data/public-knowledge-v2.json',
      hashJson(publicKnowledgeV2),
      publicKnowledgeV2.public_documents.length,
      publicKnowledgeV2.knowledge_chunks.length,
      1,
      providerError.reason,
      providerError.httpStatus,
      {
        expectedDimension: providerError.expectedDimension,
        actualDimension: providerError.actualDimension,
        providerStep: providerError.providerStep,
        errorKind: providerError.errorKind,
        attemptedEndpoints: providerError.attemptedEndpoints,
        timeoutMs: providerError.timeoutMs,
      },
    )
  }
}

export async function syncQdrantInternalRagStore(payload: RagSyncPayload): Promise<RagSyncResponse | null> {
  if (!isQdrantRagStoreConfigured() || !env.qdrantInternalCollection) return null

  const documents = normalizeInternalSyncDocuments(payload.documents)
  const chunks = documents.flatMap(chunkInternalDocument)
  const sourceChecksum = hashJson({
    scope: 'internal',
    documents: documents.map((document) => ({
      id: document.id,
      slug: document.slug,
      title: document.title,
      status: document.status,
      sourceType: document.sourceType,
      updatedAt: document.updatedAt,
      bodyHash: hashJson(document.body),
    })),
  })

  if (documents.length === 0 || chunks.length === 0) {
    return qdrantSyncDiagnostics(false, 'internal', 'internal-knowledge-documents', sourceChecksum, documents.length, chunks.length, 0)
  }

  try {
    await ensureQdrantCollection(env.qdrantInternalCollection)
    if (!isExternalEmbeddingConfigured()) {
      const localEmbedding = await embedText('dimension check').catch(() => null)
      if (!localEmbedding || localEmbedding.dimensions !== expectedEmbeddingDimensions()) {
        return qdrantSyncDiagnostics(
          false,
          'internal',
          'internal-knowledge-documents',
          sourceChecksum,
          documents.length,
          chunks.length,
          1,
          'embedding_dimension_mismatch',
          undefined,
          {
            expectedDimension: expectedEmbeddingDimensions(),
            actualDimension: localEmbedding?.dimensions,
          },
        )
      }
    }

    const documentById = new Map(documents.map((document) => [document.id, document]))
    const syncInputs = chunks
      .map((chunk) => {
        const document = documentById.get(chunk.documentId)
        if (!document) return null
        return {
          chunk,
          document,
          embeddingText: [document.title, chunk.section, chunk.text, ...(document.tags ?? [])].join('\n'),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
    const embeddings = await embedTexts(
      syncInputs.map((input) => input.embeddingText),
      { expectedDimensions: expectedEmbeddingDimensions() },
    )
    const points = []
    for (const [index, input] of syncInputs.entries()) {
      const embedding = embeddings[index]
      const { chunk, document } = input
      points.push({
        id: toQdrantPointId(chunk.id),
        vector: embedding.vector,
        payload: {
          scope: 'internal',
          source: 'internal-knowledge-documents',
          documentId: document.id,
          chunkId: chunk.id,
          title: document.title,
          summary: document.summary || compactText(document.body, 180),
          href: '/assistant/admin',
          tags: document.tags ?? [],
          visibility: 'internal',
          sourceType: document.sourceType || 'manual',
          section: chunk.section,
          text: chunk.text,
          contentHash: hashJson({
            documentId: document.id,
            updatedAt: document.updatedAt,
            bodyHash: hashJson(document.body),
            chunkIndex: chunk.index,
            textHash: hashJson(chunk.text),
          }),
        } satisfies QdrantPayload,
      })
    }

    for (let index = 0; index < points.length; index += QDRANT_BATCH_SIZE) {
      await requestQdrantJson(
        `/collections/${encodeURIComponent(env.qdrantInternalCollection)}/points?wait=true`,
        'PUT',
        {
          points: points.slice(index, index + QDRANT_BATCH_SIZE),
        },
        'qdrant_upsert_points',
      )
    }

    const issueCount = await deleteStaleInternalPoints(new Set(chunks.map((chunk) => chunk.id))).catch(() => 1)
    return qdrantSyncDiagnostics(true, 'internal', 'internal-knowledge-documents', sourceChecksum, documents.length, points.length, issueCount)
  } catch (error) {
    const providerError = normalizeQdrantError(error)
    return qdrantSyncDiagnostics(
      false,
      'internal',
      'internal-knowledge-documents',
      sourceChecksum,
      documents.length,
      chunks.length,
      1,
      providerError.reason,
      providerError.httpStatus,
      {
        expectedDimension: providerError.expectedDimension,
        actualDimension: providerError.actualDimension,
        providerStep: providerError.providerStep,
        errorKind: providerError.errorKind,
        attemptedEndpoints: providerError.attemptedEndpoints,
        timeoutMs: providerError.timeoutMs,
      },
    )
  }
}

async function queryCollection(collection: string, vector: number[], limit: number) {
  const searchPayload = {
    vector,
    limit,
    with_payload: true,
    with_vector: false,
  }
  const searchResponse = await requestQdrantRaw(`/collections/${encodeURIComponent(collection)}/points/search`, 'POST', searchPayload)
  if (searchResponse.ok) return readScoredPoints(await searchResponse.json().catch(() => null))
  if (![404, 405].includes(searchResponse.status)) return []

  const queryResponse = await requestQdrantRaw(`/collections/${encodeURIComponent(collection)}/points/query`, 'POST', {
    query: vector,
    limit,
    with_payload: true,
    with_vector: false,
  })
  if (!queryResponse.ok) return []
  return readScoredPoints(await queryResponse.json().catch(() => null))
}

async function getCollectionPointCount(collection: string) {
  const payload = await requestQdrantJson(`/collections/${encodeURIComponent(collection)}/points/count`, 'POST', { exact: true }, 'qdrant_count_points')
  const result = isRecord(payload) && isRecord(payload.result) ? payload.result : null
  const count = result?.count
  return typeof count === 'number' && Number.isFinite(count) ? count : 0
}

async function ensureQdrantCollection(collection: string) {
  const countResponse = await requestQdrantRaw(`/collections/${encodeURIComponent(collection)}/points/count`, 'POST', { exact: true }, 'qdrant_count_collection')
  if (countResponse.ok) return
  if (countResponse.status !== 404) {
    throw new QdrantProviderError(reasonForQdrantStatus(countResponse.status), countResponse.status, {
      providerStep: 'qdrant_count_collection',
      errorKind: 'http_status',
    })
  }

  const createResponse = await requestQdrantRaw(
    `/collections/${encodeURIComponent(collection)}?wait=true`,
    'PUT',
    {
      vectors: {
        size: expectedEmbeddingDimensions(),
        distance: QDRANT_DISTANCE,
      },
    },
    'qdrant_create_collection',
  )
  if (!createResponse.ok) {
    throw new QdrantProviderError(
      createResponse.status === 400 ? 'qdrant_dimension_mismatch' : reasonForQdrantStatus(createResponse.status),
      createResponse.status,
      {
        providerStep: 'qdrant_create_collection',
        errorKind: 'http_status',
      },
    )
  }
}

async function deleteStalePublicPoints(currentChunkIds: Set<string>) {
  return deleteStaleScopedPoints(env.qdrantPublicCollection, 'public', 'public-knowledge-v2', currentChunkIds)
}

async function deleteStaleInternalPoints(currentChunkIds: Set<string>) {
  return deleteStaleScopedPoints(env.qdrantInternalCollection, 'internal', 'internal-knowledge-documents', currentChunkIds)
}

async function deleteStaleScopedPoints(
  collection: string,
  scope: AssistantScope,
  source: QdrantPayload['source'],
  currentChunkIds: Set<string>,
) {
  let offset: unknown
  let issueCount = 0
  const stalePointIds: Array<string | number> = []
  do {
    const payload: Record<string, unknown> = {
      limit: 256,
      with_payload: true,
      with_vector: false,
      filter: {
        must: [
          { key: 'scope', match: { value: scope } },
          { key: 'source', match: { value: source } },
        ],
      },
    }
    if (offset !== undefined && offset !== null) payload.offset = offset
    const response = await requestQdrantJson(`/collections/${encodeURIComponent(collection)}/points/scroll`, 'POST', payload, 'qdrant_scroll_points')
    const result = isRecord(response) && isRecord(response.result) ? response.result : null
    const points = Array.isArray(result?.points) ? result.points : []
    for (const point of points) {
      if (!isRecord(point)) continue
      const payloadValue = isRecord(point.payload) ? point.payload : {}
      const chunkId = typeof payloadValue.chunkId === 'string' ? payloadValue.chunkId : ''
      if (chunkId && !currentChunkIds.has(chunkId) && (typeof point.id === 'string' || typeof point.id === 'number')) {
        stalePointIds.push(point.id)
      }
    }
    offset = result?.next_page_offset
  } while (offset !== undefined && offset !== null)

  for (let index = 0; index < stalePointIds.length; index += QDRANT_BATCH_SIZE) {
    const ids = stalePointIds.slice(index, index + QDRANT_BATCH_SIZE)
    const response = await requestQdrantRaw(
      `/collections/${encodeURIComponent(collection)}/points/delete?wait=true`,
      'POST',
      {
        points: ids,
      },
      'qdrant_delete_points',
    )
    if (!response.ok) issueCount += ids.length
  }
  return issueCount
}

async function requestQdrantJson(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, providerStep = 'qdrant_request') {
  const response = await requestQdrantRaw(path, method, body, providerStep)
  if (!response.ok) {
    throw new QdrantProviderError(reasonForQdrantStatus(response.status), response.status, {
      providerStep,
      errorKind: 'http_status',
    })
  }
  return (await response.json().catch(() => null)) as unknown
}

async function requestQdrantRaw(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, providerStep = 'qdrant_request') {
  const url = `${env.qdrantUrl.replace(/\/+$/, '')}${path}`
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), QDRANT_TIMEOUT_MS)
  try {
    return await fetch(url, {
      method,
      headers: {
        'api-key': env.qdrantApiKey,
        'Content-Type': 'application/json',
      },
      signal: abort.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    const timedOut = isAbortError(error)
    throw new QdrantProviderError(timedOut ? 'qdrant_timeout' : 'qdrant_network_error', undefined, {
      providerStep,
      errorKind: timedOut ? 'timeout' : 'network_error',
      timeoutMs: QDRANT_TIMEOUT_MS,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeQdrantError(error: unknown) {
  if (error instanceof QdrantProviderError) return error
  if (error instanceof EmbeddingDimensionMismatchError) {
    return new QdrantProviderError('embedding_dimension_mismatch', undefined, {
      expectedDimension: error.expectedDimensions,
      actualDimension: error.actualDimensions,
      providerStep: 'embedding',
      errorKind: 'dimension_mismatch',
    })
  }
  if (error instanceof EmbeddingProviderError) {
    return new QdrantProviderError(error.reason, error.httpStatus, {
      providerStep: 'embedding',
      errorKind: error.reason,
      attemptedEndpoints: error.attemptedEndpoints,
      timeoutMs: error.timeoutMs,
    })
  }
  const reason = error instanceof Error && error.message === 'embedding-dimension-mismatch' ? 'embedding_dimension_mismatch' : 'qdrant_provider_error'
  return new QdrantProviderError(reason, undefined, {
    errorKind: 'unknown',
  })
}

function reasonForQdrantStatus(status: number) {
  if (status === 401 || status === 403) return 'qdrant_auth_failed'
  if (status === 404) return 'qdrant_collection_missing'
  if (status === 400) return 'qdrant_dimension_mismatch'
  if (status >= 500) return 'qdrant_unavailable'
  return 'qdrant_provider_error'
}

function mergeCandidates(points: QdrantScoredPoint[]) {
  const byChunk = new Map<string, QdrantCandidate>()
  for (const point of points) {
    const payload = readQdrantPayload(point.payload)
    if (!payload) continue
    const score = normalizeScore(point.score)
    const existing = byChunk.get(payload.chunkId)
    if (existing && existing.chunk.score >= score) continue
    byChunk.set(payload.chunkId, {
      chunk: {
        id: payload.chunkId,
        documentId: payload.documentId,
        text: payload.text,
        section: payload.section,
        score,
        reason: 'vector+qdrant',
      },
      citation: {
        id: payload.documentId,
        title: payload.title,
        summary: payload.summary,
        href: payload.href,
        tags: payload.tags,
        visibility: payload.visibility,
      },
    })
  }
  return Array.from(byChunk.values()).sort((a, b) => b.chunk.score - a.chunk.score || a.chunk.id.localeCompare(b.chunk.id, 'zh-CN'))
}

function buildCitations(candidates: QdrantCandidate[], limit: number) {
  const citations: Citation[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (seen.has(candidate.citation.id)) continue
    seen.add(candidate.citation.id)
    citations.push(candidate.citation)
    if (citations.length >= limit) break
  }
  return citations
}

function readScoredPoints(value: unknown): QdrantScoredPoint[] {
  if (!isRecord(value)) return []
  const result = value.result
  if (Array.isArray(result)) return result.map(readScoredPoint).filter((point): point is QdrantScoredPoint => Boolean(point))
  if (isRecord(result) && Array.isArray(result.points)) {
    return result.points.map(readScoredPoint).filter((point): point is QdrantScoredPoint => Boolean(point))
  }
  return []
}

function readScoredPoint(value: unknown): QdrantScoredPoint | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' && typeof value.id !== 'number') return null
  const score = typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : null
  if (score === null) return null
  return {
    id: value.id,
    score,
    payload: isRecord(value.payload) ? value.payload : undefined,
  }
}

function readQdrantPayload(value: unknown): QdrantPayload | null {
  if (!isRecord(value)) return null
  const scope = value.scope === 'internal' ? 'internal' : value.scope === 'public' ? 'public' : null
  const visibility = value.visibility === 'internal' ? 'internal' : value.visibility === 'public' ? 'public' : null
  const source = value.source === 'internal-knowledge-documents' ? 'internal-knowledge-documents' : 'public-knowledge-v2'
  if (!scope || !visibility) return null
  const documentId = readString(value.documentId)
  const chunkId = readString(value.chunkId)
  const title = readString(value.title)
  const summary = readString(value.summary)
  const href = readString(value.href)
  const section = readString(value.section)
  const text = readString(value.text)
  const sourceType = readString(value.sourceType)
  const contentHash = readString(value.contentHash)
  if (!documentId || !chunkId || !title || !summary || !href || !section || !text || !sourceType || !contentHash) return null
  return {
    scope,
    source,
    documentId,
    chunkId,
    title,
    summary,
    href,
    tags: readStringArray(value.tags),
    visibility,
    sourceType,
    projectId: readString(value.projectId) || undefined,
    section,
    text,
    contentHash,
  }
}

function qdrantSyncDiagnostics(
  accepted: boolean,
  scope: AssistantScope,
  sourceName: string,
  sourceChecksum: string,
  documentCount: number,
  chunkCount: number,
  issueCount: number,
  reason?: string,
  httpStatus?: number,
  details: {
    expectedDimension?: number
    actualDimension?: number
    providerStep?: string
    errorKind?: string
    attemptedEndpoints?: number
    timeoutMs?: number
  } = {},
): RagSyncResponse {
  return {
    ok: true,
    mode: 'qdrant',
    scope,
    accepted,
    health: accepted ? emptyQdrantHealthWithCounts(documentCount, chunkCount, scope) : emptyQdrantHealth(),
    diagnostics: {
      sourceName,
      sourceChecksum,
      mode: QDRANT_STORE_NAME,
      scope,
      accepted,
      documentCount,
      chunkCount,
      entityCount: scope === 'public' ? publicKnowledgeV2?.entities.length ?? 0 : 0,
      relationCount: scope === 'public' ? publicKnowledgeV2?.relations.length ?? 0 : 0,
      issueCount,
      ...(reason ? { reason } : {}),
      ...(typeof httpStatus === 'number' ? { httpStatus } : {}),
      ...(typeof details.expectedDimension === 'number' ? { expectedDimension: details.expectedDimension } : {}),
      ...(typeof details.actualDimension === 'number' ? { actualDimension: details.actualDimension } : {}),
      ...(typeof details.providerStep === 'string' ? { providerStep: details.providerStep } : {}),
      ...(typeof details.errorKind === 'string' ? { errorKind: details.errorKind } : {}),
      ...(typeof details.attemptedEndpoints === 'number' ? { attemptedEndpoints: details.attemptedEndpoints } : {}),
      ...(typeof details.timeoutMs === 'number' ? { timeoutMs: details.timeoutMs } : {}),
    },
  }
}

function emptyQdrantHealth(): RagHealthResponse {
  return emptyQdrantHealthWithCounts(0, 0)
}

function emptyQdrantHealthWithCounts(documentCount: number, chunkCount: number, scope: AssistantScope = 'public'): RagHealthResponse {
  const publicCount = scope === 'public' ? chunkCount : 0
  const internalCount = scope === 'internal' ? chunkCount : 0
  return {
    ok: true,
    service: SERVICE_NAME,
    store: QDRANT_STORE_NAME,
    vectorReady: chunkCount > 0,
    keywordReady: (publicKnowledgeV2?.knowledge_chunks.length ?? 0) > 0,
    rerankerReady: true,
    lastSyncAt: null,
    documentCount,
    chunkCount,
    entityCount: publicKnowledgeV2?.entities.length ?? 0,
    relationCount: publicKnowledgeV2?.relations.length ?? 0,
    collections: {
      public: buildCollectionHealth(env.qdrantPublicCollection || 'biau_public_chunks', 'public', publicCount),
      ...(env.qdrantInternalCollection ? { internal: buildCollectionHealth(env.qdrantInternalCollection, 'internal', internalCount) } : {}),
    },
  }
}

function buildCollectionHealth(name: string, scope: AssistantScope, pointCount: number) {
  return {
    name,
    scope,
    pointCount,
    vectorReady: pointCount > 0,
  }
}


function buildEmptyResponse(intent: string, fallbackReason: 'private-credential' | 'no_public_context'): RagRetrieveResponse {
  return {
    intent,
    citations: [],
    chunks: [],
    meta: {
      retrievalMode: 'agentic-hybrid-qdrant',
      store: QDRANT_STORE_NAME,
      candidateCount: 0,
      reranked: true,
      sufficient: false,
      sufficiency: 'none',
      fallbackReason,
      citationCount: 0,
      expandedEntityCount: 0,
      modelCalls: 0,
    },
  }
}

function expectedEmbeddingDimensions() {
  return env.embeddingDimension > 0 ? env.embeddingDimension : DEFAULT_QDRANT_DIMENSION
}

function normalizeRetrieveLimit(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return publicKnowledgeV2?.fallback_bundle.defaultLimit ?? 4
  return Math.min(8, Math.max(1, Math.trunc(value)))
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Number(Math.max(0.001, Math.min(1, value)).toFixed(3))
}

function toQdrantPointId(id: string) {
  const hex = createHash('sha256').update(id).digest('hex')
  const version = ((Number.parseInt(hex.slice(12, 16), 16) & 0x0fff) | 0x5000).toString(16).padStart(4, '0')
  const variant = ((Number.parseInt(hex.slice(16, 20), 16) & 0x3fff) | 0x8000).toString(16).padStart(4, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}-${variant}-${hex.slice(20, 32)}`
}

function hashJson(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

interface InternalSyncChunk {
  id: string
  documentId: string
  section: string
  text: string
  index: number
}

function normalizeInternalSyncDocuments(value: RagSyncPayload['documents']): RagSyncDocument[] {
  if (!Array.isArray(value)) return []
  return value
    .map((document) => ({
      id: compactIdentifier(document.id),
      slug: compactIdentifier(document.slug ?? ''),
      title: compactText(document.title, 140),
      summary: compactText(document.summary ?? '', 280),
      body: compactBody(document.body, 24000),
      tags: normalizeTags(document.tags),
      status: compactText(document.status ?? '', 40),
      sourceType: compactText(document.sourceType ?? 'manual', 60),
      updatedAt: compactText(document.updatedAt ?? '', 80),
    }))
    .filter((document) => document.id && document.title && document.body)
}

function chunkInternalDocument(document: RagSyncDocument): InternalSyncChunk[] {
  const paragraphs = document.body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
  const chunks: InternalSyncChunk[] = []
  const sourceParts = paragraphs.length > 0 ? paragraphs : [document.body.trim()].filter(Boolean)

  for (const part of sourceParts) {
    for (const text of splitLongText(part, INTERNAL_CHUNK_TARGET_LENGTH)) {
      const index = chunks.length
      chunks.push({
        id: `internal:${document.id}:chunk:${index + 1}`,
        documentId: document.id,
        section: document.title,
        text,
        index,
      })
    }
  }

  return chunks
}

function splitLongText(value: string, maxLength: number) {
  const text = value.trim()
  if (!text) return []
  const chunks: string[] = []
  for (let index = 0; index < text.length; index += maxLength) {
    chunks.push(text.slice(index, index + maxLength).trim())
  }
  return chunks.filter(Boolean)
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => compactText(item, 40))
        .filter(Boolean),
    ),
  ).slice(0, 12)
}

function compactIdentifier(value: unknown) {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160)
}

function compactText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function compactBody(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}
