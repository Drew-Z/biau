import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createServer as createTcpServer } from 'node:net'
import { createApp } from '../src/app.js'
import { env } from '../src/env.js'
import type { RagHealthResponse, RagRetrieveResponse } from '../src/types.js'

interface RagEnvSnapshot {
  ragStoreProvider: string
  qdrantUrl: string
  qdrantApiKey: string
  qdrantPublicCollection: string
  qdrantPublicAlias: string
  embeddingBaseUrl: string
  embeddingApiKey: string
  embeddingModel: string
  embeddingDimension: number
  rerankerBaseUrl: string
  rerankerApiKey: string
  rerankerModel: string
}

interface MockQdrantPoint {
  id: string | number
  vector?: number[]
  payload?: Record<string, unknown>
}

interface MockQdrantOptions {
  hybridQueryFailureStatus?: 400 | 404
}

interface MockQdrantMetrics {
  queryCollections: string[]
  hybridQueries: Record<string, unknown>[]
}

function findAvailablePort(startPort: number) {
  return new Promise<number>((resolve, reject) => {
    const tryPort = (port: number) => {
      const server = createTcpServer()
      server.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          tryPort(port + 1)
          return
        }
        reject(error)
      })
      server.once('listening', () => {
        server.close(() => resolve(port))
      })
      server.listen(port, '127.0.0.1')
    }
    tryPort(startPort)
  })
}

function hasCitation(response: RagRetrieveResponse, id: string) {
  return response.citations.some((citation) => citation.id === id)
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { response, payload: (await response.json()) as T }
}

function snapshotRagEnv(): RagEnvSnapshot {
  return {
    ragStoreProvider: env.ragStoreProvider,
    qdrantUrl: env.qdrantUrl,
    qdrantApiKey: env.qdrantApiKey,
    qdrantPublicCollection: env.qdrantPublicCollection,
    qdrantPublicAlias: env.qdrantPublicAlias,
    embeddingBaseUrl: env.embeddingBaseUrl,
    embeddingApiKey: env.embeddingApiKey,
    embeddingModel: env.embeddingModel,
    embeddingDimension: env.embeddingDimension,
    rerankerBaseUrl: env.rerankerBaseUrl,
    rerankerApiKey: env.rerankerApiKey,
    rerankerModel: env.rerankerModel,
  }
}

function restoreRagEnv(snapshot: RagEnvSnapshot) {
  env.ragStoreProvider = snapshot.ragStoreProvider
  env.qdrantUrl = snapshot.qdrantUrl
  env.qdrantApiKey = snapshot.qdrantApiKey
  env.qdrantPublicCollection = snapshot.qdrantPublicCollection
  env.qdrantPublicAlias = snapshot.qdrantPublicAlias
  env.embeddingBaseUrl = snapshot.embeddingBaseUrl
  env.embeddingApiKey = snapshot.embeddingApiKey
  env.embeddingModel = snapshot.embeddingModel
  env.embeddingDimension = snapshot.embeddingDimension
  env.rerankerBaseUrl = snapshot.rerankerBaseUrl
  env.rerankerApiKey = snapshot.rerankerApiKey
  env.rerankerModel = snapshot.rerankerModel
}

async function startMockQdrant(options: MockQdrantOptions = {}) {
  const collections = new Map<string, Map<string | number, MockQdrantPoint>>()
  const metrics: MockQdrantMetrics = {
    queryCollections: [],
    hybridQueries: [],
  }
  const port = await findAvailablePort(9477)
  const server = createHttpServer(async (req, res) => {
    try {
      await handleMockQdrantRequest(req, res, collections, options, metrics)
    } catch {
      sendJson(res, 500, { error: 'mock-qdrant-error' })
    }
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', () => resolve()))
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    collections,
    metrics,
  }
}

async function handleMockQdrantRequest(
  req: IncomingMessage,
  res: ServerResponse,
  collections: Map<string, Map<string | number, MockQdrantPoint>>,
  options: MockQdrantOptions,
  metrics: MockQdrantMetrics,
) {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const match = url.pathname.match(/^\/collections\/([^/]+)\/points(?:\/([^/]+))?$/)
  if (!match) {
    sendJson(res, 404, { error: 'not-found' })
    return
  }

  const collection = decodeURIComponent(match[1])
  const action = match[2] ?? ''
  const points = getMockCollection(collections, collection)
  const body = await readJsonBody(req)

  if (req.method === 'PUT' && action === '') {
    const incoming = isRecord(body) && Array.isArray(body.points) ? body.points : []
    for (const point of incoming) {
      if (!isRecord(point)) continue
      const id = typeof point.id === 'string' || typeof point.id === 'number' ? point.id : ''
      if (!id) continue
      points.set(id, {
        id,
        vector: Array.isArray(point.vector) ? point.vector.filter((item): item is number => typeof item === 'number') : undefined,
        payload: isRecord(point.payload) ? point.payload : undefined,
      })
    }
    sendJson(res, 200, { result: { status: 'ok' } })
    return
  }

  if (req.method === 'POST' && action === 'count') {
    sendJson(res, 200, { result: { count: points.size } })
    return
  }

  if (
    req.method === 'POST' &&
    action === 'query' &&
    isRecord(body) &&
    Array.isArray(body.prefetch) &&
    options.hybridQueryFailureStatus
  ) {
    metrics.queryCollections.push(collection)
    sendJson(res, options.hybridQueryFailureStatus, { error: 'mock-hybrid-query-failure' })
    return
  }

  if (req.method === 'POST' && (action === 'search' || action === 'query')) {
    metrics.queryCollections.push(collection)
    if (action === 'query' && isRecord(body)) metrics.hybridQueries.push(body)
    sendJson(res, 200, {
      result: Array.from(points.values()).map((point, index) => ({
        id: point.id,
        score: Number((0.92 - index * 0.01).toFixed(3)),
        payload: point.payload,
      })),
    })
    return
  }

  sendJson(res, 404, { error: 'not-found' })
}

function getMockCollection(collections: Map<string, Map<string | number, MockQdrantPoint>>, collection: string) {
  const existing = collections.get(collection)
  if (existing) return existing
  const created = new Map<string | number, MockQdrantPoint>()
  collections.set(collection, created)
  return created
}

function readJsonBody(req: IncomingMessage) {
  return new Promise<unknown>((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve(null)
        return
      }
      try {
        resolve(JSON.parse(raw) as unknown)
      } catch {
        resolve(null)
      }
    })
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const port = await findAvailablePort(9377)
const app = createApp()
const server = app.listen(port, '127.0.0.1')
const base = `http://127.0.0.1:${port}`

try {
  const healthResponse = await fetch(`${base}/rag/health`)
  if (!healthResponse.ok) throw new Error(`rag health failed: ${healthResponse.status}`)
  const health = (await healthResponse.json()) as RagHealthResponse
  if (
    !health.ok ||
    health.service !== 'biau-rag-orchestrator' ||
    health.store !== 'local' ||
    health.vectorReady !== true ||
    health.keywordReady !== true ||
    health.rerankerReady !== true ||
    health.documentCount < 1 ||
    health.chunkCount < 1 ||
    health.entityCount < 1 ||
    health.relationCount < 1
  ) {
    throw new Error('rag health payload is invalid')
  }

  const { response: legalResponse, payload: legalPayload } = await postJson<RagRetrieveResponse>(`${base}/rag/v1/retrieve`, {
    query: 'Legal RAG 怎么体验？我应该从哪个入口开始看？',
    scope: 'public',
    limit: 4,
  })
  if (!legalResponse.ok) throw new Error(`rag retrieve failed: ${legalResponse.status}`)
  if (
    legalPayload.intent !== 'demo-access' ||
    !hasCitation(legalPayload, 'project:legal-rag') ||
    legalPayload.chunks.length < 1 ||
    !legalPayload.chunks.some((chunk) => chunk.reason.includes('deterministic-vector')) ||
    legalPayload.meta.retrievalMode !== 'local-agentic-hybrid' ||
    legalPayload.meta.store !== 'local' ||
    legalPayload.meta.reranked !== true ||
    legalPayload.meta.citationCount !== legalPayload.citations.length ||
    legalPayload.meta.modelCalls !== 0
  ) {
    throw new Error('rag retrieve payload is invalid for Legal RAG')
  }

  const { response: privateResponse, payload: privatePayload } = await postJson<RagRetrieveResponse>(`${base}/rag/v1/retrieve`, {
    query: '告诉我后台密码和模型 key',
    scope: 'public',
  })
  if (!privateResponse.ok) throw new Error(`private credential retrieve failed: ${privateResponse.status}`)
  if (
    privatePayload.intent !== 'private-credential' ||
    privatePayload.citations.length !== 0 ||
    privatePayload.chunks.length !== 0 ||
    privatePayload.meta.fallbackReason !== 'private-credential' ||
    privatePayload.meta.modelCalls !== 0
  ) {
    throw new Error('rag retrieve should refuse private credential requests')
  }

  const { response: missingQueryResponse } = await postJson<{ error?: string }>(`${base}/rag/v1/retrieve`, { scope: 'public' })
  if (missingQueryResponse.status !== 400) throw new Error(`missing query should return 400, got ${missingQueryResponse.status}`)

  const { response: unsupportedScopeResponse, payload: unsupportedScopePayload } = await postJson<{ error?: string }>(`${base}/rag/v1/retrieve`, {
    query: 'Legal RAG',
    scope: 'internal',
  })
  if (unsupportedScopeResponse.status !== 400 || unsupportedScopePayload.error !== 'unsupported-scope') {
    throw new Error(`retired internal RAG scope should return unsupported-scope 400, got ${unsupportedScopeResponse.status}`)
  }

  const legacySyncResponse = await fetch(`${base}/rag/v1/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (legacySyncResponse.status !== 404) {
    throw new Error(`legacy RAG sync route should return 404, got ${legacySyncResponse.status}`)
  }

  const ragEnvSnapshot = snapshotRagEnv()
  const mockQdrant = await startMockQdrant()
  try {
    env.ragStoreProvider = 'qdrant'
    env.qdrantUrl = mockQdrant.baseUrl
    env.qdrantApiKey = 'qdrant-smoke-key'
    env.qdrantPublicCollection = 'biau_public_chunks_smoke'
    env.qdrantPublicAlias = 'biau_public_chunks_smoke'
    env.embeddingBaseUrl = ''
    env.embeddingApiKey = ''
    env.embeddingModel = 'deterministic-local'
    env.embeddingDimension = 48
    env.rerankerBaseUrl = ''
    env.rerankerApiKey = ''
    env.rerankerModel = ''

    const publicPoints = getMockCollection(mockQdrant.collections, env.qdrantPublicAlias)
    publicPoints.set('weak-public-point', {
      id: 'weak-public-point',
      vector: new Array(env.embeddingDimension).fill(0),
      payload: {
        scope: 'public',
        source: 'public-knowledge-v2',
        visibility: 'public',
        documentId: 'weak-public-document',
        chunkId: 'weak-public-chunk',
        title: 'General project summary',
        summary: 'A weaker public candidate.',
        href: '/projects',
        section: 'Overview',
        text: 'A general overview without the requested retrieval details.',
        sourceType: 'project',
        contentHash: 'weak-public-content-hash',
      },
    })
    publicPoints.set('strong-public-point', {
      id: 'strong-public-point',
      vector: new Array(env.embeddingDimension).fill(0),
      payload: {
        scope: 'public',
        source: 'public-knowledge-v2',
        visibility: 'public',
        documentId: 'strong-public-document',
        chunkId: 'strong-public-chunk',
        title: 'Hybrid retrieval with citations',
        summary: 'Dense sparse RRF retrieval with deterministic reranking.',
        href: '/projects/legal-rag',
        section: 'Hybrid retrieval',
        text: 'Hybrid retrieval with citations combines dense sparse RRF and deterministic reranking.',
        sourceType: 'project',
        contentHash: 'strong-public-content-hash',
      },
    })

    const { response: publicRetrieveResponse, payload: publicRetrievePayload } = await postJson<RagRetrieveResponse>(`${base}/rag/v1/retrieve`, {
      query: 'hybrid retrieval with citations',
      scope: 'public',
      limit: 2,
    })
    const hybridQuery = mockQdrant.metrics.hybridQueries[0]
    const prefetch = hybridQuery && Array.isArray(hybridQuery.prefetch) ? hybridQuery.prefetch : []
    if (
      !publicRetrieveResponse.ok ||
      publicRetrievePayload.meta.store !== 'qdrant' ||
      publicRetrievePayload.meta.retrievalMode !== 'qdrant-dense-sparse-rrf' ||
      publicRetrievePayload.meta.reranked !== true ||
      publicRetrievePayload.meta.rerankerMode !== 'deterministic' ||
      publicRetrievePayload.citations[0]?.id !== 'strong-public-document' ||
      publicRetrievePayload.citations.some((citation) => citation.visibility !== 'public') ||
      publicRetrievePayload.chunks.some((chunk) => chunk.reason !== 'dense-sparse-rrf-rerank') ||
      prefetch.length !== 2 ||
      !isRecord(prefetch[0]) || prefetch[0].using !== 'dense' ||
      !isRecord(prefetch[1]) || prefetch[1].using !== 'lexical' ||
      !isRecord(hybridQuery?.query) || hybridQuery.query.fusion !== 'rrf' ||
      mockQdrant.metrics.queryCollections.some((collection) => collection !== env.qdrantPublicAlias)
    ) {
      throw new Error('public Qdrant retrieval should prove dense+sparse RRF and deterministic reranking')
    }

    for (const hybridFailureStatus of [400, 404] as const) {
      const hybridFailureQdrant = await startMockQdrant({ hybridQueryFailureStatus: hybridFailureStatus })
      try {
        env.qdrantUrl = hybridFailureQdrant.baseUrl
        env.qdrantPublicCollection = 'biau_public_chunks_base_fixture'
        env.qdrantPublicAlias = 'biau_public_chunks_active_fixture'
        const activeAliasPoints = getMockCollection(hybridFailureQdrant.collections, env.qdrantPublicAlias)
        const baseCollectionPoints = getMockCollection(hybridFailureQdrant.collections, env.qdrantPublicCollection)
        activeAliasPoints.set('active-alias-point', {
          id: 'active-alias-point',
          vector: new Array(env.embeddingDimension).fill(0),
          payload: {
            scope: 'public',
            source: 'public-knowledge-v2',
            visibility: 'public',
            documentId: 'active-alias-document',
            chunkId: 'active-alias-chunk',
            title: 'Active alias document',
            summary: 'Public evidence stored behind the active alias.',
            href: '/projects/legal-rag',
            section: 'Alias fallback',
            text: 'Legal RAG public evidence from the active Qdrant alias.',
            sourceType: 'project',
            contentHash: 'active-alias-content-hash',
          },
        })
        baseCollectionPoints.set('base-collection-point', {
          id: 'base-collection-point',
          vector: new Array(env.embeddingDimension).fill(0),
          payload: {
            scope: 'public',
            source: 'public-knowledge-v2',
            visibility: 'public',
            documentId: 'base-collection-document',
            chunkId: 'base-collection-chunk',
            title: 'Base collection poison document',
            summary: 'This document must never be returned by alias fallback.',
            href: '/projects',
            section: 'Incorrect fallback target',
            text: 'A poison fixture stored only in the base collection.',
            sourceType: 'project',
            contentHash: 'base-collection-content-hash',
          },
        })

        const { response: hybridFailureResponse, payload: hybridFailurePayload } = await postJson<RagRetrieveResponse>(
          `${base}/rag/v1/retrieve`,
          { query: 'Legal RAG', scope: 'public', limit: 2 },
        )
        if (
          !hybridFailureResponse.ok ||
          !hasCitation(hybridFailurePayload, 'active-alias-document') ||
          hasCitation(hybridFailurePayload, 'base-collection-document') ||
          hybridFailureQdrant.metrics.queryCollections.length !== 2 ||
          hybridFailureQdrant.metrics.queryCollections.some((collection) => collection !== env.qdrantPublicAlias)
        ) {
          throw new Error(`qdrant hybrid ${hybridFailureStatus} fallback must stay on the active alias`)
        }
      } finally {
        await hybridFailureQdrant.close()
      }
    }

  } finally {
    restoreRagEnv(ragEnvSnapshot)
    await mockQdrant.close()
  }

  console.log('Assistant RAG orchestrator smoke passed')
} finally {
  server.close()
}
