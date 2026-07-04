export type AssistantVisibility = 'public' | 'internal'

export interface KnowledgeItem {
  id: string
  title: string
  summary: string
  href: string
  tags: string[]
  visibility: AssistantVisibility
}

export interface Citation {
  id: string
  title: string
  summary: string
  href: string
  tags?: string[]
  visibility?: AssistantVisibility
}

export interface ChatPayload {
  message?: string
  sessionId?: string
}

export type ChatAnswerMode = 'model' | 'fallback'
export type ChatFallbackReason = 'not_configured' | 'provider_error' | 'empty_response' | 'no_public_context'
export type ProviderDiagnosticKind = 'timeout' | 'network_error' | 'http_status' | 'empty_response'
export type RagAdapterDiagnosticKind = 'not_configured' | 'timeout' | 'network_error' | 'http_status' | 'invalid_response'

export interface ProviderDiagnostic {
  kind: ProviderDiagnosticKind
  httpStatus?: number
  attemptedEndpoints: number
  timeoutMs: number
}

export interface RagAdapterDiagnostic {
  kind: RagAdapterDiagnosticKind
  httpStatusClass?: `${number}xx`
  attemptedEndpoints: number
  timeoutMs: number
}

export interface AssistantRetrievalMeta {
  source: 'local' | 'orchestrator'
  retrievalMode: string
  store: RagStoreProvider | string
  candidateCount: number
  citationCount: number
  sufficient: boolean
  sufficiency: 'enough' | 'weak' | 'none'
  fallbackReason?: RagAdapterDiagnosticKind | 'private-credential' | 'no_public_context' | null
  expandedEntityCount?: number
  modelCalls?: number
  diagnostic?: RagAdapterDiagnostic
}

export interface ChatResponse {
  answer: string
  citations: Citation[]
  meta?: {
    mode: ChatAnswerMode
    model: string
    citationCount: number
    provider?: string
    reason?: ChatFallbackReason
    diagnostic?: ProviderDiagnostic
    retrieval?: AssistantRetrievalMeta
  }
  sessionId?: string
  messageId?: string
}

export type RagStoreProvider = string
export type RagRetrievalMode = string

export interface RagHealthResponse {
  ok: true
  service: 'biau-rag-orchestrator'
  store: RagStoreProvider
  vectorReady: boolean
  keywordReady: boolean
  rerankerReady: boolean
  lastSyncAt: string | null
  documentCount: number
  chunkCount: number
  entityCount: number
  relationCount: number
}

export interface RagRetrievePayload {
  query?: string
  scope?: 'public'
  limit?: number
  locale?: string
}

export interface RagChunkCitation {
  id: string
  documentId: string
  text: string
  section: string
  score: number
  reason: string
}

export interface RagRetrieveResponse {
  intent: string
  citations: Citation[]
  chunks: RagChunkCitation[]
  meta: {
    retrievalMode: RagRetrievalMode
    store: RagStoreProvider
    candidateCount: number
    reranked: boolean
    sufficient: boolean
    sufficiency: 'enough' | 'weak' | 'none'
    fallbackReason: 'private-credential' | 'no_public_context' | null
    citationCount: number
    expandedEntityCount: number
    modelCalls: 0
  }
}

export interface RagSyncResponse {
  ok: true
  mode: 'local-readonly'
  accepted: false
  health: RagHealthResponse
}
