import { generateAnswer, planInternalAgentTools } from './model.js'
import { canUsePermission, containsSensitiveText, summarizeGuardrails } from './agentGuardrails.js'
import { agentToolRegistry, executeAgentTool, listAgentToolMenu } from './agentTools.js'
import type { AgentToolExecutionResult, InternalAgentPlan, InternalAgentRunInput, InternalAgentRunResult } from './agentTypes.js'
import type {
  AgentToolId,
  AssistantAnswerIntent,
  AssistantGroundingMode,
  AssistantRetrievalMeta,
  Citation,
  RagChunkCitation,
} from './types.js'

const WORKFLOW_STEPS = ['plan', 'validate', 'execute', 'critique', 'compose', 'sanitize', 'persist'] as const
const MAX_TOOL_CALLS = 4

export async function runInternalAgent(input: InternalAgentRunInput): Promise<InternalAgentRunResult> {
  const startedAt = Date.now()
  const plan = await buildAgentPlan(input)
  const toolIds = validateToolIds(plan.toolIds)
  const toolResults: AgentToolExecutionResult[] = []

  for (const toolId of toolIds.slice(0, MAX_TOOL_CALLS)) {
    toolResults.push(await executeAgentTool(toolId, {
      question: input.question,
      member: input.member,
      sessionId: input.sessionId,
      prisma: input.prisma,
      studioDraftMode: input.studioDraftMode,
    }))
  }

  const citations = dedupeCitations(toolResults.flatMap((result) => result.citations))
  const chunks = dedupeChunks(toolResults.flatMap((result) => result.chunks))
  const contextBlocks = toolResults.flatMap((result) => result.contextBlocks).slice(0, 10)
  const retrieval = selectRetrieval(toolResults)
  const generated = await generateAnswer(input.question, citations, 'internal', {
    chunks,
    contextBlocks,
    intent: plan.intent,
    grounding: plan.grounding,
    modelChannelId: input.member.modelChannelId,
  })
  let answer = generated.answer
  if (generated.mode === 'fallback' && contextBlocks.length > 0 && !containsSensitiveText(contextBlocks.join('\n'))) {
    answer = buildToolBackedFallbackAnswer(contextBlocks, generated.reason)
  }

  let guardrails = summarizeGuardrails({
    traces: toolResults.map((result) => result.trace),
    citations,
    grounding: plan.grounding,
    answer,
  })

  let reason = generated.reason
  if (guardrails.sensitiveOutputBlocked) {
    answer = '这次回答触发了内部安全策略，我已经阻止输出。请改成不包含密钥、连接串、私有地址或后台凭据的问题。'
    reason = 'policy_blocked'
    guardrails = summarizeGuardrails({
      traces: toolResults.map((result) => result.trace),
      citations: [],
      grounding: 'none',
      answer,
    })
  }

  const toolTraces = toolResults.map((result) => result.trace)
  const agentStatus = guardrails.status === 'blocked'
    ? 'guarded'
    : toolTraces.some((trace) => trace.status === 'failed' || trace.status === 'blocked') || generated.mode === 'fallback'
      ? 'degraded'
      : 'completed'
  const durationMs = Date.now() - startedAt

  return {
    answer,
    citations,
    chunks,
    meta: {
      mode: generated.mode,
      model: generated.model,
      provider: generated.provider,
      reason,
      diagnostic: generated.diagnostic,
      modelChannel: generated.modelChannel,
      citationCount: citations.length,
      retrieval,
      intent: plan.intent,
      grounding: plan.grounding,
      agent: {
        mode: 'agentic-workspace',
        planner: plan.planner,
        status: agentStatus,
        steps: [...WORKFLOW_STEPS],
        toolCount: toolTraces.length,
        durationMs,
      },
      tools: toolTraces,
      guardrails,
      fallbackReason: reason ?? plan.fallbackReason,
    },
  }
}

async function buildAgentPlan(input: InternalAgentRunInput): Promise<InternalAgentPlan> {
  const mockPlan = buildMockPlan(input.question)
  if (input.plannerMode === 'mock') return mockPlan

  const modelPlan = await planInternalAgentTools(input.question, listAgentToolMenu(), {
    modelChannelId: input.member.modelChannelId,
  })
  if (!modelPlan.plan) {
    return {
      ...mockPlan,
      planner: 'mock',
      fallbackReason: normalizePlannerFallbackReason(modelPlan.reason),
    }
  }

  return {
    ...modelPlan.plan,
    planner: modelPlan.planner,
  }
}

function buildMockPlan(question: string): InternalAgentPlan {
  const normalized = question.trim().toLowerCase()
  const toolIds: AgentToolId[] = []
  const writing = includesAny(normalized, ['写', '生成', '草稿', '文章', '日报', '文案', '提纲', '总结', '改写', '润色'])
  const status = includesAny(normalized, ['状态', '可靠性', '监控', '是否正常', '可用性', 'health', 'synthetic'])
  const project = includesAny(normalized, ['项目', '案例', '技术栈', '架构', '实现', '入口', '演示', 'legal', 'rag', 'erp', 'pet', 'xunqiu', '寻球', 'playlab', 'game'])
  const knowledge = includesAny(normalized, ['知识', '博客', '文档', '资料', '之前', '历史', '上下文'])
  const planning = includesAny(normalized, ['计划', '规划', '方案', '下一步', '怎么做', 'roadmap'])

  if (status) toolIds.push('status.query')
  if (project) toolIds.push('project.lookup', 'rag.retrieve')
  if (knowledge || planning) toolIds.push('knowledge.search')
  if (planning) toolIds.push('memory.search')
  if (writing && (project || status || knowledge)) toolIds.push('studio.draft')
  if (toolIds.length === 0) toolIds.push(writing ? 'answer.direct' : 'knowledge.search')

  return {
    toolIds: dedupeToolIds(toolIds).slice(0, MAX_TOOL_CALLS),
    intent: inferIntent({ writing, status, project, knowledge, planning }),
    grounding: inferGrounding({ writing, status, project, knowledge, planning }),
    planner: 'mock',
  }
}

function validateToolIds(toolIds: AgentToolId[]) {
  const validToolIds = toolIds.filter((toolId) => {
    const definition = agentToolRegistry.get(toolId)
    return Boolean(definition && canUsePermission(definition.permission))
  })
  return validToolIds.length > 0 ? validToolIds : (['answer.direct'] satisfies AgentToolId[])
}

function normalizePlannerFallbackReason(reason: string | undefined) {
  if (
    reason === 'not_configured' ||
    reason === 'provider_error' ||
    reason === 'empty_response' ||
    reason === 'no_public_context' ||
    reason === 'self_check_failed' ||
    reason === 'tool_error' ||
    reason === 'policy_blocked'
  ) {
    return reason
  }
  if (reason === 'invalid_response') return 'provider_error'
  return undefined
}

function inferIntent(flags: { writing: boolean; status: boolean; project: boolean; knowledge: boolean; planning: boolean }): AssistantAnswerIntent {
  if (flags.writing) return 'creative'
  if (flags.planning) return 'planning'
  if (flags.status || flags.project || flags.knowledge) return 'site_qa'
  return 'general'
}

function inferGrounding(flags: { writing: boolean; status: boolean; project: boolean; knowledge: boolean; planning: boolean }): AssistantGroundingMode {
  if (flags.status || flags.project || flags.knowledge) return flags.writing || flags.planning ? 'background' : 'strict'
  return 'none'
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

function dedupeToolIds(toolIds: AgentToolId[]) {
  return toolIds.filter((toolId, index, items) => items.indexOf(toolId) === index)
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}
