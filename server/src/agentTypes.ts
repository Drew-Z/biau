import type { Member, PrismaClient } from '@prisma/client'
import type {
  AgentPlannerMode,
  AgentRunMeta,
  AgentToolArtifact,
  AgentToolId,
  AgentToolPermission,
  AgentToolStatus,
  AgentToolTrace,
  AssistantAnswerIntent,
  AssistantGroundingMode,
  AssistantRetrievalMeta,
  ChatFallbackReason,
  Citation,
  ProviderDiagnostic,
  RagChunkCitation,
} from './types.js'

export type InternalAgentMemberContext = Pick<Member, 'id' | 'name' | 'role' | 'modelChannelId'>

export interface InternalAgentRunInput {
  question: string
  member: InternalAgentMemberContext
  sessionId: string
  sourceMessageId?: string
  prisma: PrismaClient
  plannerMode?: 'auto' | 'mock'
  studioDraftMode?: 'auto' | 'plan-only'
}

export interface InternalAgentPlan {
  toolIds: AgentToolId[]
  intent: AssistantAnswerIntent
  grounding: AssistantGroundingMode
  planner: AgentPlannerMode
  fallbackReason?: ChatFallbackReason
}

export interface AgentToolDefinition {
  id: AgentToolId
  label: string
  permission: AgentToolPermission
  description: string
}

export interface AgentToolContext {
  question: string
  member: InternalAgentMemberContext
  sessionId: string
  sourceMessageId?: string
  prisma: PrismaClient
  studioDraftMode?: 'auto' | 'plan-only'
}

export interface AgentToolPayload {
  citations: Citation[]
  chunks: RagChunkCitation[]
  contextBlocks: string[]
  retrieval?: AssistantRetrievalMeta
  summary: string
  itemCount?: number
  status?: AgentToolStatus
  errorClass?: AgentToolTrace['errorClass']
  artifacts?: AgentToolArtifact[]
}

export interface AgentToolExecutionResult extends AgentToolPayload {
  trace: AgentToolTrace
}

export interface InternalAgentRunResult {
  answer: string
  citations: Citation[]
  chunks: RagChunkCitation[]
  meta: {
    mode: 'model' | 'fallback'
    model: string
    provider?: string
    reason?: ChatFallbackReason
    diagnostic?: ProviderDiagnostic
    modelChannel?: {
      id: string
      label: string
      provider: string
      model: string
      configured: boolean
      isDefault: boolean
      isActive: boolean
    }
    citationCount: number
    retrieval?: AssistantRetrievalMeta
    intent: AssistantAnswerIntent
    grounding: AssistantGroundingMode
    agent: AgentRunMeta
    tools: AgentToolTrace[]
    guardrails: {
      status: 'passed' | 'warned' | 'blocked'
      allowedPermissions: AgentToolPermission[]
      blockedPermissions: AgentToolPermission[]
      citationSufficiency: 'enough' | 'weak' | 'none'
      sensitiveOutputBlocked: boolean
      issues: string[]
    }
    fallbackReason?: ChatFallbackReason
  }
}
