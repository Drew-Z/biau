import { createHash } from 'node:crypto'
import { env } from './env.js'
import { publicKnowledgeV2, retrieveKnowledge } from './knowledge.js'
import { embedText, embedTexts, EmbeddingDimensionMismatchError, EmbeddingProviderError, isExternalEmbeddingConfigured } from './ragEmbeddings.js'
import { isExternalRerankerConfigured, rerankRagCandidates } from './ragReranker.js'
import { buildPublicKnowledgeSparseCorpus, buildRagSparseVector, type RagSparseVector } from './ragSparse.js'
import type {
  AssistantScope,
  Citation,
  RagChunkCitation,
  RagHealthResponse,
  RagRetrievePayload,
  RagRetrieveResponse,
  RagSyncResponse,
} from './types.js'

interface QdrantScoredPoint {
  id: string | number
  score: number
  payload?: Record<string, unknown>
}

interface QdrantPayload {
  scope: AssistantScope
  source: 'public-knowledge-v2'
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
  syncVersion?: string
  syncedAt?: string
}

interface QdrantCandidate {
  chunk: RagChunkCitation
  citation: Citation
}

interface QdrantCleanupResult {
  status: 'completed' | 'warning'
  reason: string
  providerStep?: string
  errorKind?: string
  httpStatus?: number
  timeoutMs?: number
  scannedPointCount: number
  stalePointCount: number
  deletedPointCount: number
  issueCount: number
}

const SERVICE_NAME = 'biau-rag-orchestrator'
const QDRANT_STORE_NAME = 'qdrant'
const DEFAULT_QDRANT_DIMENSION = 4096
const QDRANT_BATCH_SIZE = 32
const QDRANT_DISTANCE = 'Cosine'
const QDRANT_TIMEOUT_MS = 15000
const QDRANT_DENSE_VECTOR = 'dense'
const QDRANT_SPARSE_VECTOR = 'lexical'

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

  const publicCount = await getCollectionPointCount(env.qdrantPublicAlias).catch(() => getCollectionPointCount(env.qdrantPublicCollection).catch(() => 0))
  const chunkCount = publicCount

  return {
    ok: true,
    service: SERVICE_NAME,
    store: QDRANT_STORE_NAME,
    vectorReady: chunkCount > 0,
    keywordReady: (publicKnowledgeV2?.knowledge_chunks.length ?? 0) > 0,
    rerankerReady: isExternalRerankerConfigured(),
    rerankerMode: isExternalRerankerConfigured() ? 'provider' : 'deterministic',
    lastSyncAt: null,
    documentCount: publicCount > 0 ? publicKnowledgeV2?.public_documents.length ?? 0 : 0,
    chunkCount,
    entityCount: publicKnowledgeV2?.entities.length ?? 0,
    relationCount: publicKnowledgeV2?.relations.length ?? 0,
    collections: {
      public: buildCollectionHealth(env.qdrantPublicAlias, 'public', publicCount),
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

  const queryLimit = Math.max(8, limit * 6)
  const sparseCorpus = publicKnowledgeV2 ? buildPublicKnowledgeSparseCorpus(publicKnowledgeV2.knowledge_chunks) : null
  const sparse = sparseCorpus ? buildRagSparseVector(payload.query, sparseCorpus) : { indices: [], values: [] }
  const publicPoints = await queryPublicCollection(embedding.vector, sparse, queryLimit).catch(() => [])
  const merged = mergeCandidates(publicPoints)
  const reranked = await rerankRagCandidates(payload.query, merged.map((candidate) => ({
    id: candidate.chunk.id,
    text: [candidate.citation.title, candidate.chunk.section, candidate.chunk.text].join('\n'),
    score: candidate.chunk.score,
  })))
  const candidates = applyRerankOrder(merged, reranked.candidates)
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
      retrievalMode: 'qdrant-dense-sparse-rrf',
      store: QDRANT_STORE_NAME,
      candidateCount: candidates.length,
      reranked: candidates.length > 1,
      rerankerMode: reranked.mode,
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
    const sourceChecksum = getPublicKnowledgeSourceChecksum()
    const syncVersion = sourceChecksum.slice(0, 12)
    const versionedCollection = buildVersionedCollectionName(env.qdrantPublicCollection, syncVersion)
    await ensureQdrantHybridCollection(versionedCollection)
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
    const sparseCorpus = buildPublicKnowledgeSparseCorpus(publicKnowledgeV2.knowledge_chunks)
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
        vector: {
          [QDRANT_DENSE_VECTOR]: embedding.vector,
          [QDRANT_SPARSE_VECTOR]: buildRagSparseVector(input.embeddingText, sparseCorpus),
        },
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
          syncVersion,
          syncedAt: new Date().toISOString(),
        } satisfies QdrantPayload,
      })
    }

    for (let index = 0; index < points.length; index += QDRANT_BATCH_SIZE) {
      await requestQdrantJson(
        `/collections/${encodeURIComponent(versionedCollection)}/points?wait=true`,
        'PUT',
        {
          points: points.slice(index, index + QDRANT_BATCH_SIZE),
        },
        'qdrant_upsert_points',
      )
    }

    const acceptedPointCount = await getCollectionPointCount(versionedCollection)
    if (acceptedPointCount !== points.length) {
      throw new QdrantProviderError('qdrant_sync_count_mismatch', undefined, {
        providerStep: 'qdrant_validate_versioned_collection',
        errorKind: 'invalid_response',
      })
    }
    await switchPublicCollectionAlias(versionedCollection)
    const cleanup: QdrantCleanupResult = {
      status: 'completed',
      reason: 'versioned-collection-retained-for-rollback',
      scannedPointCount: acceptedPointCount,
      stalePointCount: 0,
      deletedPointCount: 0,
      issueCount: 0,
    }
    return qdrantSyncDiagnostics(
      true,
      'public',
      'server/data/public-knowledge-v2.json',
      sourceChecksum,
      publicKnowledgeV2.public_documents.length,
      points.length,
      cleanup.issueCount,
      undefined,
      undefined,
      { cleanup },
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

export function getPublicKnowledgeSourceChecksum() {
  return publicKnowledgeV2 ? hashJson(publicKnowledgeV2) : ''
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

async function queryPublicCollection(vector: number[], sparse: RagSparseVector, limit: number) {
  if (sparse.indices.length > 0) {
    const hybridResponse = await requestQdrantRaw(
      `/collections/${encodeURIComponent(env.qdrantPublicAlias)}/points/query`,
      'POST',
      buildQdrantHybridQueryPayload(vector, sparse, limit),
      'qdrant_hybrid_query',
    )
    if (hybridResponse.ok) return readScoredPoints(await hybridResponse.json().catch(() => null))
    if (![400, 404, 405].includes(hybridResponse.status)) return []
  }
  return queryCollection(env.qdrantPublicAlias, vector, limit)
}

async function getCollectionPointCount(collection: string) {
  const payload = await requestQdrantJson(`/collections/${encodeURIComponent(collection)}/points/count`, 'POST', { exact: true }, 'qdrant_count_points')
  const result = isRecord(payload) && isRecord(payload.result) ? payload.result : null
  const count = result?.count
  return typeof count === 'number' && Number.isFinite(count) ? count : 0
}

async function ensureQdrantHybridCollection(collection: string) {
  const countResponse = await requestQdrantRaw(
    `/collections/${encodeURIComponent(collection)}/points/count`,
    'POST',
    { exact: true },
    'qdrant_count_hybrid_collection',
  )
  if (countResponse.ok) return
  if (countResponse.status !== 404) {
    throw new QdrantProviderError(reasonForQdrantStatus(countResponse.status, 'qdrant_count_hybrid_collection'), countResponse.status, {
      providerStep: 'qdrant_count_hybrid_collection',
      errorKind: 'http_status',
    })
  }
  const createResponse = await requestQdrantRaw(
    `/collections/${encodeURIComponent(collection)}?wait=true`,
    'PUT',
    buildQdrantHybridCollectionConfig(expectedEmbeddingDimensions()),
    'qdrant_create_hybrid_collection',
  )
  if (!createResponse.ok) {
    throw new QdrantProviderError(reasonForQdrantStatus(createResponse.status, 'qdrant_create_hybrid_collection'), createResponse.status, {
      providerStep: 'qdrant_create_hybrid_collection',
      errorKind: 'http_status',
    })
  }
}

async function switchPublicCollectionAlias(collection: string) {
  const aliasResponse = await requestQdrantRaw(
    `/aliases/${encodeURIComponent(env.qdrantPublicAlias)}`,
    'GET',
    undefined,
    'qdrant_read_public_alias',
  )
  if (!aliasResponse.ok && aliasResponse.status !== 404) {
    throw new QdrantProviderError(reasonForQdrantStatus(aliasResponse.status, 'qdrant_read_public_alias'), aliasResponse.status, {
      providerStep: 'qdrant_read_public_alias',
      errorKind: 'http_status',
    })
  }
  const actions: Array<Record<string, unknown>> = []
  if (aliasResponse.ok) actions.push({ delete_alias: { alias_name: env.qdrantPublicAlias } })
  actions.push({ create_alias: { collection_name: collection, alias_name: env.qdrantPublicAlias } })
  await requestQdrantJson('/collections/aliases?wait=true', 'POST', { actions }, 'qdrant_switch_public_alias')
}

async function requestQdrantJson(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, providerStep = 'qdrant_request') {
  const response = await requestQdrantRaw(path, method, body, providerStep)
  if (!response.ok) {
    throw new QdrantProviderError(reasonForQdrantStatus(response.status, providerStep), response.status, {
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

function reasonForQdrantStatus(status: number, providerStep?: string) {
  if (status === 401 || status === 403) return 'qdrant_auth_failed'
  if (status === 404) return 'qdrant_collection_missing'
  if (status === 400) return providerStep === 'qdrant_upsert_points' ? 'qdrant_dimension_mismatch' : 'qdrant_bad_request'
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

function applyRerankOrder(
  candidates: QdrantCandidate[],
  reranked: Array<{ id: string; score: number }>,
) {
  const byId = new Map(candidates.map((candidate) => [candidate.chunk.id, candidate]))
  const ordered: QdrantCandidate[] = []
  for (const item of reranked) {
    const candidate = byId.get(item.id)
    if (!candidate) continue
    ordered.push({
      ...candidate,
      chunk: { ...candidate.chunk, score: normalizeScore(item.score), reason: 'dense-sparse-rrf-rerank' },
    })
    byId.delete(item.id)
  }
  ordered.push(...byId.values())
  return ordered
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
  if (value.scope !== 'public' || value.visibility !== 'public' || value.source !== 'public-knowledge-v2') return null
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
    scope: 'public',
    source: 'public-knowledge-v2',
    documentId,
    chunkId,
    title,
    summary,
    href,
    tags: readStringArray(value.tags),
    visibility: 'public',
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
    cleanup?: QdrantCleanupResult
  } = {},
): RagSyncResponse {
  return {
    ok: true,
    mode: 'qdrant',
    scope,
    accepted,
    health: accepted ? emptyQdrantHealthWithCounts(documentCount, chunkCount) : emptyQdrantHealth(),
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
      ...(details.cleanup
        ? {
            cleanupStatus: details.cleanup.status,
            cleanupReason: details.cleanup.reason,
            cleanupScannedPointCount: details.cleanup.scannedPointCount,
            cleanupStalePointCount: details.cleanup.stalePointCount,
            cleanupDeletedPointCount: details.cleanup.deletedPointCount,
            cleanupIssueCount: details.cleanup.issueCount,
            ...(details.cleanup.providerStep ? { cleanupProviderStep: details.cleanup.providerStep } : {}),
            ...(details.cleanup.errorKind ? { cleanupErrorKind: details.cleanup.errorKind } : {}),
            ...(typeof details.cleanup.httpStatus === 'number' ? { cleanupHttpStatus: details.cleanup.httpStatus } : {}),
            ...(typeof details.cleanup.timeoutMs === 'number' ? { cleanupTimeoutMs: details.cleanup.timeoutMs } : {}),
          }
        : {}),
    },
  }
}

function emptyQdrantHealth(): RagHealthResponse {
  return emptyQdrantHealthWithCounts(0, 0)
}

function emptyQdrantHealthWithCounts(documentCount: number, chunkCount: number): RagHealthResponse {
  return {
    ok: true,
    service: SERVICE_NAME,
    store: QDRANT_STORE_NAME,
    vectorReady: chunkCount > 0,
    keywordReady: (publicKnowledgeV2?.knowledge_chunks.length ?? 0) > 0,
    rerankerReady: isExternalRerankerConfigured(),
    rerankerMode: isExternalRerankerConfigured() ? 'provider' : 'deterministic',
    lastSyncAt: null,
    documentCount,
    chunkCount,
    entityCount: publicKnowledgeV2?.entities.length ?? 0,
    relationCount: publicKnowledgeV2?.relations.length ?? 0,
    collections: {
      public: buildCollectionHealth(env.qdrantPublicAlias || 'biau_public_chunks_active', 'public', chunkCount),
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
      retrievalMode: 'qdrant-dense-sparse-rrf',
      store: QDRANT_STORE_NAME,
      candidateCount: 0,
      reranked: false,
      rerankerMode: 'none',
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

function buildVersionedCollectionName(base: string, version: string) {
  const normalized = base.replace(/[^a-zA-Z0-9_-]/gu, '_').slice(0, 40) || 'biau_public_chunks'
  return `${normalized}_v_${version}`
}

export function buildQdrantHybridQueryPayload(vector: number[], sparse: RagSparseVector, limit: number) {
  return {
    prefetch: [
      { query: vector, using: QDRANT_DENSE_VECTOR, limit },
      { query: sparse, using: QDRANT_SPARSE_VECTOR, limit },
    ],
    query: { fusion: 'rrf' },
    limit,
    with_payload: true,
    with_vector: false,
  }
}

export function buildQdrantHybridCollectionConfig(dimension: number) {
  return {
    vectors: {
      [QDRANT_DENSE_VECTOR]: {
        size: dimension,
        distance: QDRANT_DISTANCE,
      },
    },
    sparse_vectors: {
      [QDRANT_SPARSE_VECTOR]: {},
    },
  }
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
