export type AssistantVisibility = 'public' | 'internal'
export type AssistantScope = 'public' | 'internal'
export type AssistantServiceMode = 'all' | 'public' | 'internal' | 'rag' | 'studio'
export type AssistantAnswerIntent = 'site_qa' | 'creative' | 'planning' | 'general'
export type AssistantGroundingMode = 'strict' | 'background' | 'none'

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
export type ChatFallbackReason = 'not_configured' | 'provider_error' | 'empty_response' | 'no_public_context' | 'self_check_failed'
export type ProviderDiagnosticKind = 'timeout' | 'network_error' | 'http_status' | 'empty_response'
export type RagAdapterDiagnosticKind = 'not_configured' | 'timeout' | 'network_error' | 'http_status' | 'invalid_response'

export interface ProviderDiagnostic {
  kind: ProviderDiagnosticKind
  httpStatus?: number
  attemptedEndpoints: number
  timeoutMs: number
}

export interface AssistantModelChannelSummary {
  id: string
  label: string
  provider: string
  model: string
  configured: boolean
  isDefault: boolean
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
    modelChannel?: AssistantModelChannelSummary
    retrieval?: AssistantRetrievalMeta
    intent?: AssistantAnswerIntent
    grounding?: AssistantGroundingMode
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
  scope?: AssistantScope
  limit?: number
  locale?: string
}

export interface RagSyncDocument {
  id: string
  slug?: string
  title: string
  summary?: string
  body: string
  tags?: string[]
  status?: string
  sourceType?: string
  updatedAt?: string
}

export interface RagSyncPayload {
  scope?: AssistantScope
  documents?: RagSyncDocument[]
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
    modelCalls: number
  }
}

export interface RagSyncResponse {
  ok: true
  mode: 'local-readonly' | 'postgres' | 'qdrant'
  accepted: boolean
  health: RagHealthResponse
  diagnostics?: {
    sourceName?: string
    sourceChecksum?: string
    documentCount?: number
    chunkCount?: number
    entityCount?: number
    relationCount?: number
    issueCount?: number
  }
}
