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
export type ChatFallbackReason =
  | 'not_configured'
  | 'provider_error'
  | 'empty_response'
  | 'no_public_context'
  | 'self_check_failed'
  | 'tool_error'
  | 'policy_blocked'
export type ProviderDiagnosticKind = 'timeout' | 'network_error' | 'http_status' | 'empty_response'
export type RagAdapterDiagnosticKind = 'not_configured' | 'timeout' | 'network_error' | 'http_status' | 'invalid_response'
export type AgentWorkflowStepId = 'plan' | 'validate' | 'execute' | 'critique' | 'compose' | 'sanitize' | 'persist'
export type AgentPlannerMode = 'model' | 'mock' | 'fallback'
export type AgentRunStatus = 'completed' | 'guarded' | 'degraded' | 'failed'
export type AgentToolPermission = 'read' | 'draft-write' | 'admin-write' | 'external-live'
export type AgentToolStatus = 'selected' | 'skipped' | 'completed' | 'failed' | 'blocked'
export type AgentToolId =
  | 'rag.retrieve'
  | 'status.query'
  | 'project.lookup'
  | 'knowledge.search'
  | 'studio.draft'
  | 'memory.search'
  | 'memory.write'
  | 'answer.direct'

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
  diagnostic?: RagAdapterDiagnostic
}

export interface AgentToolTrace {
  id: AgentToolId
  label: string
  permission: AgentToolPermission
  status: AgentToolStatus
  durationMs: number
  summary: string
  citationCount?: number
  itemCount?: number
  errorClass?: 'tool_error' | 'policy_blocked' | 'not_configured'
  artifacts?: AgentToolArtifact[]
}

export interface AgentStudioDraftArtifact {
  kind: 'studio-draft'
  id: string
  slug: string
  title: string
  column: string
  status: 'review-needed'
  visibility: 'hidden'
  reviewRequired: true
  href: '/studio' | `/studio?draft=${string}`
}

export type AgentToolArtifact = AgentStudioDraftArtifact

export interface AgentGuardrailSummary {
  status: 'passed' | 'warned' | 'blocked'
  allowedPermissions: AgentToolPermission[]
  blockedPermissions: AgentToolPermission[]
  citationSufficiency: 'enough' | 'weak' | 'none'
  sensitiveOutputBlocked: boolean
  issues: string[]
}

export interface AgentRunMeta {
  mode: 'agentic-workspace'
  planner: AgentPlannerMode
  status: AgentRunStatus
  steps: AgentWorkflowStepId[]
  toolCount: number
  durationMs: number
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
    agent?: AgentRunMeta
    tools?: AgentToolTrace[]
    guardrails?: AgentGuardrailSummary
    fallbackReason?: ChatFallbackReason | 'tool_error' | 'policy_blocked'
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
  collections?: {
    public?: RagCollectionHealth
    internal?: RagCollectionHealth
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
  }
}
