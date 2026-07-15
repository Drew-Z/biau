import { planInternalAgentTools } from './model.js'
import { canUsePermission } from './agentGuardrails.js'
import { hasExplicitMemoryWriteIntent, isMemoryQueryOnly } from './agentMemory.js'
import { agentToolRegistry, listAgentToolMenu } from './agentTools.js'
import type { OperatorAgentPlan, OperatorAgentRunInput } from './agentTypes.js'
import type {
  AgentToolId,
  AssistantAnswerIntent,
  AssistantGroundingMode,
  ChatFallbackReason,
} from './types.js'

export const MAX_AGENT_TOOL_CALLS = 4

export async function buildAgentPlan(input: OperatorAgentRunInput): Promise<OperatorAgentPlan> {
  const mockPlan = buildDeterministicAgentPlan(input.question)
  if (input.plannerMode === 'mock') return mockPlan

  const modelPlan = await planInternalAgentTools(input.question, listAgentToolMenu(), {
    modelChannelId: input.operator.modelChannelId,
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

export function buildDeterministicAgentPlan(question: string): OperatorAgentPlan {
  const normalized = question.trim().toLowerCase()
  const toolIds: AgentToolId[] = []
  const writing = includesAny(normalized, ['写', '生成', '草稿', '文章', '日报', '文案', '提纲', '总结', '改写', '润色'])
  const status = includesAny(normalized, ['状态', '可靠性', '监控', '是否正常', '可用性', 'health', 'synthetic'])
  const project = includesAny(normalized, ['项目', '案例', '技术栈', '架构', '实现', '入口', '演示', 'legal', 'rag', 'erp', 'pet', 'xunqiu', '寻球', 'playlab', 'game'])
  const knowledge = includesAny(normalized, ['知识', '博客', '文档', '资料', '之前', '历史', '上下文'])
  const planning = includesAny(normalized, ['计划', '规划', '方案', '下一步', '怎么做', 'roadmap'])
  const memoryWrite = hasExplicitMemoryWriteIntent(question)
  const memoryQuery = isMemoryQueryOnly(question) || includesAny(normalized, ['记忆', '偏好', '记得', '历史习惯'])

  if (memoryWrite) toolIds.push('memory.write')
  if (memoryQuery || planning) toolIds.push('memory.search')
  if (status) toolIds.push('status.query')
  if (project) toolIds.push('project.lookup', 'rag.retrieve')
  if (knowledge || planning) toolIds.push('knowledge.search')
  if (writing && (project || status || knowledge)) toolIds.push('studio.draft')
  if (toolIds.length === 0) toolIds.push(writing ? 'answer.direct' : 'knowledge.search')

  return {
    toolIds: dedupeToolIds(toolIds).slice(0, MAX_AGENT_TOOL_CALLS),
    intent: inferIntent({ writing, status, project, knowledge, planning, memoryQuery }),
    grounding: inferGrounding({ writing, status, project, knowledge, planning, memoryQuery }),
    planner: 'mock',
  }
}

export function validateAgentToolIds(toolIds: AgentToolId[]) {
  const validToolIds = toolIds.filter((toolId) => {
    const definition = agentToolRegistry.get(toolId)
    return Boolean(definition && canUsePermission(definition.permission))
  })
  return validToolIds.length > 0 ? validToolIds.slice(0, MAX_AGENT_TOOL_CALLS) : (['answer.direct'] satisfies AgentToolId[])
}

export function normalizePlannerFallbackReason(reason: string | undefined): ChatFallbackReason | undefined {
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

function inferIntent(flags: {
  writing: boolean
  status: boolean
  project: boolean
  knowledge: boolean
  planning: boolean
  memoryQuery: boolean
}): AssistantAnswerIntent {
  if (flags.writing) return 'creative'
  if (flags.planning) return 'planning'
  if (flags.status || flags.project || flags.knowledge || flags.memoryQuery) return 'site_qa'
  return 'general'
}

function inferGrounding(flags: {
  writing: boolean
  status: boolean
  project: boolean
  knowledge: boolean
  planning: boolean
  memoryQuery: boolean
}): AssistantGroundingMode {
  if (flags.status || flags.project || flags.knowledge || flags.memoryQuery) {
    return flags.writing || flags.planning ? 'background' : 'strict'
  }
  return 'none'
}

function dedupeToolIds(toolIds: AgentToolId[]) {
  return toolIds.filter((toolId, index, items) => items.indexOf(toolId) === index)
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}
