import { publicKnowledgeV2, retrieveKnowledge } from './knowledge.js'
import { createLocalVectorStore, rerankChunksWithVector } from './ragAdapters.js'
import { getPostgresRagHealth, isPostgresRagStoreConfigured, retrievePostgresRagContext, syncPostgresRagStore } from './ragPostgresStore.js'
import { getQdrantRagHealth, isQdrantRagStoreSelected, retrieveQdrantRagContext, syncQdrantRagStore } from './ragQdrantStore.js'
import type { RagHealthResponse, RagRetrievePayload, RagRetrieveResponse, RagSyncPayload, RagSyncResponse } from './types.js'

const SERVICE_NAME = 'biau-rag-orchestrator'
const localVectorStore = createLocalVectorStore()

export async function getRagOrchestratorHealth(): Promise<RagHealthResponse> {
  if (isQdrantRagStoreSelected()) return getQdrantRagHealth()
  if (isPostgresRagStoreConfigured()) return getPostgresRagHealth()
  return {
    ok: true,
    service: SERVICE_NAME,
    store: 'local',
    vectorReady: (publicKnowledgeV2?.knowledge_chunks.length ?? 0) > 0,
    keywordReady: true,
    rerankerReady: true,
    lastSyncAt: null,
    documentCount: publicKnowledgeV2?.public_documents.length ?? 0,
    chunkCount: publicKnowledgeV2?.knowledge_chunks.length ?? 0,
    entityCount: publicKnowledgeV2?.entities.length ?? 0,
    relationCount: publicKnowledgeV2?.relations.length ?? 0,
  }
}

export async function retrieveRagContext(
  payload: Required<Pick<RagRetrievePayload, 'query' | 'scope'>> & Omit<RagRetrievePayload, 'query' | 'scope'>,
): Promise<RagRetrieveResponse> {
  if (isQdrantRagStoreSelected()) {
    const qdrantRetrieval = await retrieveQdrantRagContext(payload)
    if (qdrantRetrieval) return qdrantRetrieval
  }

  if (isPostgresRagStoreConfigured()) {
    const postgresRetrieval = await retrievePostgresRagContext(payload)
    if (postgresRetrieval) return postgresRetrieval
  }

  const limit = normalizeRetrieveLimit(payload.limit)
  const retrieval = retrieveKnowledge(payload.query, limit)
  const vectorCandidates = localVectorStore.search(payload.query, limit * 4)
  const chunks = rerankChunksWithVector(retrieval.chunks, vectorCandidates)
  const fallbackReason =
    retrieval.sufficiency === 'none'
      ? retrieval.intent === 'private-credential'
        ? 'private-credential'
        : 'no_public_context'
      : null

  return {
    intent: retrieval.intent,
    citations: retrieval.citations,
    chunks,
    meta: {
      retrievalMode: 'local-agentic-hybrid',
      store: 'local',
      candidateCount: retrieval.candidateCount,
      reranked: true,
      sufficient: retrieval.sufficiency === 'enough',
      sufficiency: retrieval.sufficiency,
      fallbackReason,
      citationCount: retrieval.citations.length,
      expandedEntityCount: retrieval.expandedEntityIds.length,
      modelCalls: 0,
    },
  }
}

export async function syncRagStore(payload: RagSyncPayload = {}): Promise<RagSyncResponse> {
  if (payload.scope === 'internal') return syncInternalRagPayload(payload)

  if (isQdrantRagStoreSelected()) {
    const syncResult = await syncQdrantRagStore()
    if (syncResult) return syncResult
  }

  if (isPostgresRagStoreConfigured()) {
    const syncResult = await syncPostgresRagStore()
    if (syncResult) return syncResult
  }

  return {
    ok: true,
    mode: 'local-readonly',
    accepted: false,
    health: await getRagOrchestratorHealth(),
  }
}

async function syncInternalRagPayload(payload: RagSyncPayload): Promise<RagSyncResponse> {
  const documents = Array.isArray(payload.documents) ? payload.documents : []
  return {
    ok: true,
    mode: 'local-readonly',
    accepted: false,
    health: await getRagOrchestratorHealth(),
    diagnostics: {
      sourceName: 'internal-knowledge-documents',
      documentCount: documents.length,
      chunkCount: countSyncPayloadChunks(documents),
      issueCount: 0,
    },
  }
}

function countSyncPayloadChunks(documents: NonNullable<RagSyncPayload['documents']>) {
  return documents.reduce((total, document) => {
    const body = typeof document.body === 'string' ? document.body : ''
    const paragraphs = body
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (paragraphs.length === 0) return total
    return total + paragraphs.reduce((chunkTotal, paragraph) => chunkTotal + Math.max(1, Math.ceil(paragraph.length / 1200)), 0)
  }, 0)
}

function normalizeRetrieveLimit(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return publicKnowledgeV2?.fallback_bundle.defaultLimit ?? 4
  return Math.min(8, Math.max(1, Math.trunc(value)))
}
