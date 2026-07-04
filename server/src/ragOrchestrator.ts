import { publicKnowledgeV2, retrieveKnowledge } from './knowledge.js'
import { createLocalVectorStore, rerankChunksWithVector } from './ragAdapters.js'
import type { RagHealthResponse, RagRetrievePayload, RagRetrieveResponse, RagSyncResponse } from './types.js'

const SERVICE_NAME = 'biau-rag-orchestrator'
const localVectorStore = createLocalVectorStore()

export function getRagOrchestratorHealth(): RagHealthResponse {
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

export function retrieveRagContext(payload: Required<Pick<RagRetrievePayload, 'query'>> & Omit<RagRetrievePayload, 'query'>): RagRetrieveResponse {
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

export function syncLocalRagStore(): RagSyncResponse {
  return {
    ok: true,
    mode: 'local-readonly',
    accepted: false,
    health: getRagOrchestratorHealth(),
  }
}

function normalizeRetrieveLimit(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return publicKnowledgeV2?.fallback_bundle.defaultLimit ?? 4
  return Math.min(8, Math.max(1, Math.trunc(value)))
}
