import type {
  AssistantModelChannelSummary,
  Citation,
  ProviderDiagnostic,
  PublicAssistantClaim,
  PublicAssistantHistoryTurn,
  PublicAssistantMode,
  PublicAssistantPageContext,
  PublicAssistantRoute,
  PublicAssistantStatus,
} from './types.js'

export interface PublicAssistantRequest {
  question: string
  mode: PublicAssistantMode
  sessionId?: string
  pageContext?: PublicAssistantPageContext
  history: PublicAssistantHistoryTurn[]
  signal?: AbortSignal
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
}

export interface PublicAssistantModel {
  plan(request: PublicAssistantRequest): Promise<PublicAssistantPlan>
  answer(input: {
    request: PublicAssistantRequest
    plan: PublicAssistantPlan
    evidence: PublicAssistantEvidence[]
  }): Promise<PublicAssistantDraft>
}
