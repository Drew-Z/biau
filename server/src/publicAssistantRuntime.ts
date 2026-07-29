import type {
  AssistantModelChannelSummary,
  Citation,
  ProviderDiagnostic,
  PublicAssistantClaim,
  PublicAssistantContractVersion,
  PublicAssistantGenerationIntent,
  PublicAssistantHistoryTurn,
  PublicAssistantMode,
  PublicAssistantPageContext,
  PublicAssistantRecoveryFailureClass,
  PublicAssistantRecoveryMeta,
  PublicAssistantRoute,
  PublicAssistantStatus,
} from './types.js'

export interface PublicAssistantRequest {
  contractVersion: PublicAssistantContractVersion
  requestId: string
  question: string
  mode: PublicAssistantMode
  sessionId: string
  pageContext?: PublicAssistantPageContext
  history: PublicAssistantHistoryTurn[]
  intent: PublicAssistantGenerationIntent
  signal?: AbortSignal
  onProgress?: (progress: PublicAssistantProgress) => void
}

export type PublicAssistantProgressStage =
  | 'planning'
  | 'researching'
  | 'evaluating'
  | 'refining'
  | 'answering'
  | 'verifying'
  | 'saving'

export type PublicAssistantModelFailureClass = PublicAssistantRecoveryFailureClass | 'cancelled' | 'policy'

export interface PublicAssistantModelAttemptTiming {
  attempt: 1 | 2 | 3
  durationMs: number
  firstActivityMs?: number
  failureClass?: PublicAssistantModelFailureClass
}

export interface PublicAssistantProgress {
  stage: PublicAssistantProgressStage
}

export interface PublicAssistantPlan {
  route: PublicAssistantRoute
  queries: string[]
  requiresFreshness: boolean
  planner: 'model' | 'fallback'
}

export interface PublicAssistantEvidence {
  id: string
  source: 'site' | 'web'
  title: string
  canonicalUrl: string
  section: string
  excerpt: string
  text: string
  publishedAt: string | null
  score: number
  citation: Citation
}

export interface PublicAssistantDraft {
  answer: string
  status: PublicAssistantStatus
  claims: PublicAssistantClaim[]
  suggestions: string[]
  model: string
  provider: string
  modelChannel?: AssistantModelChannelSummary
  diagnostic?: ProviderDiagnostic
  failure?: 'not_configured' | 'provider_error' | 'empty_response' | 'invalid_response'
  recovery?: PublicAssistantRecoveryMeta
  attempts?: PublicAssistantModelAttemptTiming[]
}

export interface PublicAssistantModel {
  plan(request: PublicAssistantRequest): Promise<PublicAssistantPlan>
  answer(input: {
    request: PublicAssistantRequest
    plan: PublicAssistantPlan
    evidence: PublicAssistantEvidence[]
  }): Promise<PublicAssistantDraft>
}
