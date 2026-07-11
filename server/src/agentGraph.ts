import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { generateAnswer, type GeneratedAnswer } from './model.js'
import { containsSensitiveText, summarizeGuardrails } from './agentGuardrails.js'
import { executeAgentTool } from './agentTools.js'
import { buildAgentPlan, validateAgentToolIds } from './agentPlanner.js'
import type { PrismaClient } from '@prisma/client'
import type {
  AgentToolExecutionResult,
  InternalAgentMemberContext,
  InternalAgentPlan,
  InternalAgentRunInput,
  InternalAgentRunResult,
} from './agentTypes.js'
import type {
  AgentGraphNodeId,
  AgentRunStatus,
  AgentToolId,
  AssistantRetrievalMeta,
  Citation,
  RagChunkCitation,
} from './types.js'

export const AGENT_GRAPH_STEPS: AgentGraphNodeId[] = [
  'input_guard',
  'plan',
  'validate_plan',
  'execute_tools',
  'compose_answer',
  'self_check',
  'persist_trace',
]

const policyBlockedAnswer = '这次回答触发了内部安全策略，我已经阻止输出。请改成不包含密钥、连接串、私有地址或后台凭据的问题。'

const AgentGraphAnnotation = Annotation.Root({
  question: Annotation<string>,
  member: Annotation<InternalAgentMemberContext>,
  sessionId: Annotation<string>,
  sourceMessageId: Annotation<string | undefined>,
  prisma: Annotation<PrismaClient>,
  plannerMode: Annotation<InternalAgentRunInput['plannerMode'] | undefined>,
  studioDraftMode: Annotation<InternalAgentRunInput['studioDraftMode'] | undefined>,
  startedAt: Annotation<number>,
  inputBlocked: Annotation<boolean>,
  agentPlan: Annotation<InternalAgentPlan | undefined>,
  selectedToolIds: Annotation<AgentToolId[]>,
  toolResults: Annotation<AgentToolExecutionResult[]>,
  citations: Annotation<Citation[]>,
  chunks: Annotation<RagChunkCitation[]>,
  contextBlocks: Annotation<string[]>,
  retrieval: Annotation<AssistantRetrievalMeta | undefined>,
  generated: Annotation<GeneratedAnswer | undefined>,
  guardrails: Annotation<InternalAgentRunResult['meta']['guardrails'] | undefined>,
  answer: Annotation<string | undefined>,
  meta: Annotation<InternalAgentRunResult['meta'] | undefined>,
})

type AgentGraphState = typeof AgentGraphAnnotation.State

export async function runInternalAgentGraph(input: InternalAgentRunInput): Promise<InternalAgentRunResult> {
  const finalState = await compiledAgentGraph.invoke({
    question: input.question,
    member: input.member,
    sessionId: input.sessionId,
    sourceMessageId: input.sourceMessageId,
    prisma: input.prisma,
    plannerMode: input.plannerMode,
    studioDraftMode: input.studioDraftMode,
    startedAt: Date.now(),
    inputBlocked: false,
    agentPlan: undefined,
    selectedToolIds: [],
    toolResults: [],
    citations: [],
    chunks: [],
    contextBlocks: [],
    retrieval: undefined,
    generated: undefined,
    guardrails: undefined,
    answer: undefined,
    meta: undefined,
  })

  if (!finalState.answer || !finalState.meta) {
    return buildFailedAgentResult(finalState)
  }

  return {
    answer: finalState.answer,
    citations: finalState.citations,
    chunks: finalState.chunks,
    meta: finalState.meta,
  }
}

async function inputGuardNode(state: AgentGraphState) {
  return {
    inputBlocked: containsSensitiveText(state.question),
  }
}

async function planNode(state: AgentGraphState) {
  if (state.inputBlocked) {
    return {
      agentPlan: {
        toolIds: ['answer.direct'],
        intent: 'general',
        grounding: 'none',
        planner: 'mock',
        fallbackReason: 'policy_blocked',
      } satisfies InternalAgentPlan,
    }
  }
  return {
    agentPlan: await buildAgentPlan({
      question: state.question,
      member: state.member,
      sessionId: state.sessionId,
      sourceMessageId: state.sourceMessageId,
      prisma: state.prisma,
      plannerMode: state.plannerMode,
      studioDraftMode: state.studioDraftMode,
    }),
  }
}

async function validatePlanNode(state: AgentGraphState) {
  const toolIds = state.agentPlan?.toolIds ?? ['answer.direct']
  return {
    selectedToolIds: validateAgentToolIds(toolIds),
  }
}

async function executeToolsNode(state: AgentGraphState) {
  if (state.inputBlocked) {
    return {
      toolResults: [],
      citations: [],
      chunks: [],
      contextBlocks: [],
      retrieval: undefined,
    }
  }

  const toolResults: AgentToolExecutionResult[] = []
  for (const toolId of state.selectedToolIds) {
    toolResults.push(await executeAgentTool(toolId, {
      question: state.question,
      member: state.member,
      sessionId: state.sessionId,
      sourceMessageId: state.sourceMessageId,
      prisma: state.prisma,
      studioDraftMode: state.studioDraftMode,
    }))
  }

  return {
    toolResults,
    citations: dedupeCitations(toolResults.flatMap((result) => result.citations)),
    chunks: dedupeChunks(toolResults.flatMap((result) => result.chunks)),
    contextBlocks: toolResults.flatMap((result) => result.contextBlocks).slice(0, 10),
    retrieval: selectRetrieval(toolResults),
  }
}

async function composeAnswerNode(state: AgentGraphState) {
  if (state.inputBlocked) {
    return {
      answer: policyBlockedAnswer,
      generated: {
        answer: policyBlockedAnswer,
        mode: 'fallback',
        model: 'policy-guard',
        provider: 'local',
        reason: 'policy_blocked',
      } satisfies GeneratedAnswer,
    }
  }

  const plan = state.agentPlan ?? {
    toolIds: ['answer.direct'],
    intent: 'general',
    grounding: 'none',
    planner: 'mock',
  } satisfies InternalAgentPlan
  const generated = await generateAnswer(state.question, state.citations, 'internal', {
    chunks: state.chunks,
    contextBlocks: state.contextBlocks,
    intent: plan.intent,
    grounding: plan.grounding,
    modelChannelId: state.member.modelChannelId,
  })
  let answer = generated.answer
  if (generated.mode === 'fallback' && state.contextBlocks.length > 0 && !containsSensitiveText(state.contextBlocks.join('\n'))) {
    answer = buildToolBackedFallbackAnswer(state.contextBlocks, generated.reason)
  }

  return {
    generated,
    answer,
  }
}

async function selfCheckNode(state: AgentGraphState) {
  const plan = state.agentPlan ?? {
    toolIds: ['answer.direct'],
    intent: 'general',
    grounding: 'none',
    planner: 'mock',
  } satisfies InternalAgentPlan
  let answer = state.answer ?? policyBlockedAnswer
  let guardrails = summarizeGuardrails({
    traces: state.toolResults.map((result) => result.trace),
    citations: state.citations,
    grounding: plan.grounding,
    answer,
  })

  if (guardrails.sensitiveOutputBlocked) {
    answer = policyBlockedAnswer
    guardrails = summarizeGuardrails({
      traces: state.toolResults.map((result) => result.trace),
      citations: [],
      grounding: 'none',
      answer,
    })
  }
  if (state.inputBlocked) {
    guardrails = {
      ...guardrails,
      status: 'blocked',
      citationSufficiency: 'none',
      issues: [...new Set(['input-policy-blocked', ...guardrails.issues])].slice(0, 8),
    }
  }

  return {
    answer,
    guardrails,
  }
}

async function persistTraceNode(state: AgentGraphState) {
  const plan = state.agentPlan ?? {
    toolIds: ['answer.direct'],
    intent: 'general',
    grounding: 'none',
    planner: 'mock',
  } satisfies InternalAgentPlan
  const generated = state.generated ?? buildFallbackGeneratedAnswer()
  const guardrails = state.guardrails ?? summarizeGuardrails({
    traces: [],
    citations: [],
    grounding: plan.grounding,
    answer: state.answer ?? policyBlockedAnswer,
  })
  const toolTraces = state.toolResults.map((result) => result.trace)
  const reason = guardrails.sensitiveOutputBlocked ? 'policy_blocked' : generated.reason
  const durationMs = Date.now() - state.startedAt

  return {
    meta: {
      mode: generated.mode,
      model: generated.model,
      provider: generated.provider,
      reason,
      diagnostic: generated.diagnostic,
      modelChannel: generated.modelChannel,
      citationCount: state.citations.length,
      retrieval: state.retrieval,
      intent: plan.intent,
      grounding: plan.grounding,
      agent: {
        mode: 'agentic-workspace',
        planner: plan.planner,
        status: computeAgentStatus(guardrails, toolTraces, generated.mode),
        steps: [...AGENT_GRAPH_STEPS],
        toolCount: toolTraces.length,
        durationMs,
      },
      tools: toolTraces,
      guardrails,
      fallbackReason: reason ?? plan.fallbackReason,
    } satisfies InternalAgentRunResult['meta'],
  }
}

const compiledAgentGraph = new StateGraph(AgentGraphAnnotation)
  .addNode('input_guard', inputGuardNode)
  .addNode('plan', planNode)
  .addNode('validate_plan', validatePlanNode)
  .addNode('execute_tools', executeToolsNode)
  .addNode('compose_answer', composeAnswerNode)
  .addNode('self_check', selfCheckNode)
  .addNode('persist_trace', persistTraceNode)
  .addEdge(START, 'input_guard')
  .addEdge('input_guard', 'plan')
  .addEdge('plan', 'validate_plan')
  .addEdge('validate_plan', 'execute_tools')
  .addEdge('execute_tools', 'compose_answer')
  .addEdge('compose_answer', 'self_check')
  .addEdge('self_check', 'persist_trace')
  .addEdge('persist_trace', END)
  .compile()

function buildFailedAgentResult(state: AgentGraphState): InternalAgentRunResult {
  const fallback = buildFallbackGeneratedAnswer()
  const guardrails = state.guardrails ?? summarizeGuardrails({
    traces: [],
    citations: [],
    grounding: 'none',
    answer: fallback.answer,
  })
  return {
    answer: fallback.answer,
    citations: [],
    chunks: [],
    meta: {
      mode: 'fallback',
      model: fallback.model,
      provider: fallback.provider,
      reason: 'tool_error',
      citationCount: 0,
      intent: 'general',
      grounding: 'none',
      agent: {
        mode: 'agentic-workspace',
        planner: 'fallback',
        status: 'failed',
        steps: [...AGENT_GRAPH_STEPS],
        toolCount: 0,
        durationMs: Math.max(0, Date.now() - state.startedAt),
      },
      tools: [],
      guardrails,
      fallbackReason: 'tool_error',
    },
  }
}

function buildFallbackGeneratedAnswer(): GeneratedAnswer {
  return {
    answer: '内部助手运行时没有生成可用结果，已安全降级。请稍后重试或缩小问题范围。',
    mode: 'fallback',
    model: 'fallback',
    provider: 'local',
    reason: 'tool_error',
  }
}

function computeAgentStatus(
  guardrails: InternalAgentRunResult['meta']['guardrails'],
  toolTraces: InternalAgentRunResult['meta']['tools'],
  answerMode: GeneratedAnswer['mode'],
): AgentRunStatus {
  if (guardrails.status === 'blocked') return 'guarded'
  if (toolTraces.some((trace) => trace.status === 'failed' || trace.status === 'blocked') || answerMode === 'fallback') return 'degraded'
  return 'completed'
}

function selectRetrieval(results: AgentToolExecutionResult[]): AssistantRetrievalMeta | undefined {
  return results.find((result) => result.retrieval)?.retrieval
}

function buildToolBackedFallbackAnswer(contextBlocks: string[], reason: string | undefined) {
  const lines = contextBlocks
    .map((block) => compactText(block, 220))
    .filter(Boolean)
    .slice(0, 5)
  return [
    `模型通道当前没有产出可用回答${reason ? `（${reason}）` : ''}，我先按可读取工具给出摘要版：`,
    ...lines.map((line) => `- ${line}`),
    '这不是公开发布结果，涉及草稿、状态变更或发布动作仍需要人工审核。',
  ].join('\n')
}

function dedupeCitations(citations: Citation[]) {
  const seen = new Set<string>()
  return citations.filter((citation) => {
    if (seen.has(citation.id)) return false
    seen.add(citation.id)
    return true
  })
}

function dedupeChunks(chunks: RagChunkCitation[]) {
  const seen = new Set<string>()
  return chunks.filter((chunk) => {
    if (seen.has(chunk.id)) return false
    seen.add(chunk.id)
    return true
  })
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}
