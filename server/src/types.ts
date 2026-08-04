export type AssistantVisibility = 'public'
export type AssistantScope = 'public'
export type AssistantServiceMode = 'all' | 'public' | 'rag' | 'studio'
export type PublicAssistantMode = 'auto' | 'site' | 'web'
export type PublicAssistantRoute = 'direct' | 'site' | 'web' | 'combined'
export type PublicAssistantStatus = 'answered' | 'partial' | 'uncertain' | 'degraded' | 'blocked'
export type PublicAssistantEvidenceSource = 'site' | 'web'
export type PublicAssistantContractVersion = 1 | 2
export type PublicAssistantRecoveryState = 'none' | 'recovered' | 'degraded'
export type PublicAssistantRecoveryFailureClass =
  | 'not_configured'
  | 'timeout'
  | 'network'
  | 'upstream'
  | 'empty'
  | 'invalid'

export interface PublicAssistantRecoveryMeta {
  state: PublicAssistantRecoveryState
  attempts: 1 | 2 | 3
  failureClass?: PublicAssistantRecoveryFailureClass
}

export type PublicAssistantGenerationIntent =
  | {
      kind: 'new-turn'
      branchId: string | null
      parentRevisionId: string | null
    }
  | {
      kind: 'answer-revision'
      branchId: string
      turnId: string
      baseRevisionId: string
    }

export interface PublicAssistantConversationIdentity {
  branchId: string
  branchOrdinal: number
  turnId: string
  revisionId: string
  revisionNo: number
  basedOnRevisionId: string | null
  activated: boolean
}

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
  source?: PublicAssistantEvidenceSource
  canonicalUrl?: string
  section?: string
  excerpt?: string
  publishedAt?: string | null
  evidenceStatus?: 'verified' | 'partial'
}

export interface ChatPayload {
  contractVersion?: number
  requestId?: string
  message?: string
  sessionId?: string
  mode?: PublicAssistantMode
  pageContext?: PublicAssistantPageContext
  history?: PublicAssistantHistoryTurn[]
  intent?: PublicAssistantGenerationIntent
}

export interface PublicAssistantPageContext {
  path: string
  title?: string
  description?: string
}

export interface PublicAssistantHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface PublicAssistantClaim {
  id: string
  text: string
  citationIds: string[]
}

export interface PublicAssistantResearchMeta {
  requestedMode: PublicAssistantMode
  route: PublicAssistantRoute
  status: PublicAssistantStatus
  evidenceCount: number
  siteEvidenceCount: number
  webEvidenceCount: number
  retryCount: number
  searchAvailable: boolean
  rerankerMode?: 'provider' | 'deterministic' | 'none'
  durationMs: number
}

export type ChatAnswerMode = 'model' | 'fallback'
export type ChatFallbackReason =
  | 'not_configured'
  | 'provider_error'
  | 'empty_response'
  | 'no_public_context'
  | 'self_check_failed'
  | 'tool_error'
  | 'policy_blocked'
export type ProviderDiagnosticKind = 'timeout' | 'network_error' | 'http_status' | 'empty_response'
export type ProviderRelayFailureKind =
  | 'provider_rejected'
  | 'upstream_unreachable'
  | 'invalid_response'
  | 'response_too_large'
  | 'timeout'
export type RagAdapterDiagnosticKind = 'not_configured' | 'timeout' | 'network_error' | 'http_status' | 'invalid_response'

export interface ProviderDiagnostic {
  kind: ProviderDiagnosticKind
  httpStatus?: number
  relayFailure?: ProviderRelayFailureKind
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
  isActive: boolean
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
  rerankerMode?: 'provider' | 'deterministic' | 'none'
  diagnostic?: RagAdapterDiagnostic
}

export interface ChatResponse {
  contractVersion?: 2
  requestId?: string
  answer: string
  citations: Citation[]
  status?: PublicAssistantStatus
  claims?: PublicAssistantClaim[]
  suggestions?: string[]
  meta?: {
    mode: ChatAnswerMode
    model: string
    citationCount: number
    provider?: string
    reason?: ChatFallbackReason
    diagnostic?: ProviderDiagnostic
    modelChannel?: AssistantModelChannelSummary
    retrieval?: AssistantRetrievalMeta
    fallbackReason?: ChatFallbackReason
    research?: PublicAssistantResearchMeta
    recovery?: PublicAssistantRecoveryMeta
  }
  sessionId?: string
  messageId?: string
  conversation?: PublicAssistantConversationIdentity
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
  rerankerMode?: 'provider' | 'deterministic' | 'none'
  lastSyncAt: string | null
  documentCount: number
  chunkCount: number
  entityCount: number
  relationCount: number
  buildCommit?: string | null
  publicSourceChecksum?: string
  collections?: {
    public?: RagCollectionHealth
  }
}

export interface RagCollectionHealth {
  name: string
  scope: AssistantScope
  pointCount: number
  vectorReady: boolean
}

export interface RagRetrievePayload {
  query?: string
  scope?: AssistantScope
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
      rerankerMode?: 'provider' | 'deterministic' | 'none'
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
  scope?: AssistantScope
  health: RagHealthResponse
  diagnostics?: {
    mode?: string
    scope?: AssistantScope
    reason?: string
    accepted?: boolean
    sourceName?: string
    sourceChecksum?: string
    documentCount?: number
    chunkCount?: number
    entityCount?: number
    relationCount?: number
    issueCount?: number
    httpStatus?: number
    expectedDimension?: number
    actualDimension?: number
    providerStep?: string
    errorKind?: string
    attemptedEndpoints?: number
    timeoutMs?: number
    cleanupStatus?: 'completed' | 'warning'
    cleanupReason?: string
    cleanupProviderStep?: string
    cleanupErrorKind?: string
    cleanupHttpStatus?: number
    cleanupTimeoutMs?: number
    cleanupScannedPointCount?: number
    cleanupStalePointCount?: number
    cleanupDeletedPointCount?: number
    cleanupIssueCount?: number
  }
}
