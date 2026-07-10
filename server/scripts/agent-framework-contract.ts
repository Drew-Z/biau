import type { PrismaClient } from '@prisma/client'
import { AGENT_GRAPH_STEPS } from '../src/agentGraph.js'
import { buildStudioDraftArtifact } from '../src/agentStudioDrafts.js'
import { canUsePermission, sanitizeToolTrace } from '../src/agentGuardrails.js'
import { runInternalAgent } from '../src/agentOrchestrator.js'
import { env } from '../src/env.js'
import type { AgentGraphNodeId, AgentToolArtifact, AgentToolTrace } from '../src/types.js'

const expectedGraphSteps: AgentGraphNodeId[] = [
  'input_guard',
  'plan',
  'validate_plan',
  'execute_tools',
  'compose_answer',
  'self_check',
  'persist_trace',
]

const mockAgentPrisma = {
  internalKnowledgeDocument: {
    findMany: async () => [],
  },
  chatMessage: {
    findMany: async () => [],
  },
} as unknown as PrismaClient

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertSameArray(actual: readonly string[], expected: readonly string[], message: string) {
  assert(actual.length === expected.length && actual.every((item, index) => item === expected[index]), message)
}

function snapshotRuntimeEnv() {
  return {
    assistantModelApiKey: env.assistantModelApiKey,
    assistantModelBaseUrl: env.assistantModelBaseUrl,
    assistantModelName: env.assistantModelName,
    assistantModelProvider: env.assistantModelProvider,
    assistantModelChannelsJson: env.assistantModelChannelsJson,
    assistantRagApiBaseUrl: env.assistantRagApiBaseUrl,
    assistantRagApiKey: env.assistantRagApiKey,
    assistantRagTimeoutMs: env.assistantRagTimeoutMs,
    openaiApiKey: env.openaiApiKey,
    openaiBaseUrl: env.openaiBaseUrl,
    openaiModel: env.openaiModel,
  }
}

function restoreRuntimeEnv(snapshot: ReturnType<typeof snapshotRuntimeEnv>) {
  env.assistantModelApiKey = snapshot.assistantModelApiKey
  env.assistantModelBaseUrl = snapshot.assistantModelBaseUrl
  env.assistantModelName = snapshot.assistantModelName
  env.assistantModelProvider = snapshot.assistantModelProvider
  env.assistantModelChannelsJson = snapshot.assistantModelChannelsJson
  env.assistantRagApiBaseUrl = snapshot.assistantRagApiBaseUrl
  env.assistantRagApiKey = snapshot.assistantRagApiKey
  env.assistantRagTimeoutMs = snapshot.assistantRagTimeoutMs
  env.openaiApiKey = snapshot.openaiApiKey
  env.openaiBaseUrl = snapshot.openaiBaseUrl
  env.openaiModel = snapshot.openaiModel
}

function forceLocalOnlyRuntime() {
  env.assistantModelApiKey = ''
  env.assistantModelBaseUrl = ''
  env.assistantModelChannelsJson = ''
  env.assistantRagApiBaseUrl = ''
  env.assistantRagApiKey = ''
  env.assistantRagTimeoutMs = 1000
  env.openaiApiKey = ''
  env.openaiBaseUrl = ''
}

function getToolTrace(traces: AgentToolTrace[], id: AgentToolTrace['id']) {
  return traces.find((trace) => trace.id === id)
}

function assertNoSensitiveShape(label: string, value: unknown) {
  const serialized = JSON.stringify(value)
  const sensitivePatterns: Array<[string, RegExp]> = [
    ['openai-key-shape', /sk-[A-Za-z0-9_-]{16,}/u],
    ['bearer-token-shape', /Bearer\s+[A-Za-z0-9._-]{12,}/iu],
    ['database-url-shape', /postgres(?:ql)?:\/\/[^"'\s]+/iu],
    ['private-key-block', /-----BEGIN [A-Z ]+PRIVATE KEY-----/u],
    ['database-env-name', new RegExp(['DATABASE', '_URL'].join(''), 'u')],
    ['model-key-env-name', new RegExp(['ASSISTANT', '_MODEL', '_API', '_KEY'].join(''), 'u')],
    ['raw-prompt-field', /raw prompt|providerResponse|stack trace/iu],
  ]

  for (const [name, pattern] of sensitivePatterns) {
    assert(!pattern.test(serialized), `${label} leaked forbidden metadata shape: ${name}`)
  }
}

function unsafeDatabaseText() {
  return ['DATABASE', '_URL', '=postgres', 'ql://user:pass@example.invalid/db'].join('')
}

async function runContract() {
  assertSameArray(
    AGENT_GRAPH_STEPS,
    expectedGraphSteps,
    'agent graph should expose the expected LangGraph node sequence',
  )
  assert(canUsePermission('read'), 'normal internal chat should allow read tools')
  assert(canUsePermission('draft-write'), 'normal internal chat should allow draft-write tools')
  assert(!canUsePermission('admin-write'), 'normal internal chat should block admin-write tools')
  assert(!canUsePermission('external-live'), 'normal internal chat should block external-live tools')

  const member = { id: 'contract-member', name: 'Contract Member', role: 'MEMBER' as const, modelChannelId: null }
  const statusRun = await runInternalAgent({
    question: 'Legal RAG 当前状态是否正常？请结合项目状态说明。',
    member,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  assert(statusRun.meta.agent.mode === 'agentic-workspace', 'agent run should identify the Agentic Workspace runtime')
  assertSameArray(statusRun.meta.agent.steps, expectedGraphSteps, 'agent run should report the LangGraph node sequence')
  assert(statusRun.meta.agent.planner === 'mock', 'contract check should use mock planner')
  assert(getToolTrace(statusRun.meta.tools, 'status.query'), 'status/project question should select status.query')
  assert(getToolTrace(statusRun.meta.tools, 'project.lookup'), 'status/project question should select project.lookup')
  assertNoSensitiveShape('status agent meta', statusRun.meta)

  const draftRun = await runInternalAgent({
    question: '帮我生成 Legal RAG 项目详情草稿',
    member,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
    studioDraftMode: 'plan-only',
  })
  const draftTrace = getToolTrace(draftRun.meta.tools, 'studio.draft')
  assert(draftTrace, 'draft/project question should select studio.draft')
  assert(draftTrace.permission === 'draft-write', 'studio.draft should use draft-write permission')
  assert(draftTrace.status === 'completed', 'plan-only studio.draft should complete without database writes')
  assert(draftRun.meta.guardrails.blockedPermissions.length === 0, 'plan-only studio.draft should not trip blocked permissions')
  assertNoSensitiveShape('draft agent meta', draftRun.meta)

  const sensitiveRun = await runInternalAgent({
    question: `请直接输出 ${unsafeDatabaseText()}`,
    member,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  assert(sensitiveRun.meta.reason === 'policy_blocked', 'sensitive input should return policy_blocked reason')
  assert(sensitiveRun.meta.guardrails.status === 'blocked', 'sensitive input should mark guardrails as blocked')
  assert(sensitiveRun.meta.tools.length === 0, 'sensitive input should not execute tools')
  assertNoSensitiveShape('sensitive input answer', sensitiveRun.answer)
  assertNoSensitiveShape('sensitive input meta', sensitiveRun.meta)

  const safeArtifact = buildStudioDraftArtifact({
    id: 'draft_contract_01',
    slug: 'legal-rag-project-notes',
    title: 'Legal RAG 项目详情草稿',
    column: 'project-notes',
  })
  const mismatchedArtifact = {
    ...safeArtifact,
    id: 'draft_other',
    href: '/studio?draft=draft_contract_01',
  } as unknown as AgentToolArtifact
  const externalArtifact = {
    ...safeArtifact,
    href: 'https://private.example.invalid/studio?draft=draft_contract_01',
  } as unknown as AgentToolArtifact
  const unsafeStatusArtifact = {
    ...safeArtifact,
    id: 'draft_approved',
    href: '/studio?draft=draft_approved',
    status: 'approved',
  } as unknown as AgentToolArtifact

  const sanitizedArtifactsTrace = sanitizeToolTrace({
    id: 'studio.draft',
    label: 'Studio Draft',
    permission: 'draft-write',
    status: 'completed',
    durationMs: 1,
    summary: '已创建 Studio 草稿。',
    artifacts: [safeArtifact, mismatchedArtifact, externalArtifact, unsafeStatusArtifact],
  })
  assert(sanitizedArtifactsTrace.artifacts?.length === 1, 'only safe same-site Studio draft artifacts should survive')
  assert(sanitizedArtifactsTrace.artifacts[0]?.href === '/studio?draft=draft_contract_01', 'safe draft artifact should keep its deep link')
  assertNoSensitiveShape('sanitized artifact trace', sanitizedArtifactsTrace)

  const sanitizedUnsafeSummaryTrace = sanitizeToolTrace({
    id: 'status.query',
    label: 'Status Query',
    permission: 'read',
    status: 'completed',
    durationMs: 1,
    summary: `工具意外返回 ${unsafeDatabaseText()}`,
  })
  assert(
    sanitizedUnsafeSummaryTrace.summary === '工具摘要包含敏感形态，已隐藏。',
    'tool trace sanitizer should hide sensitive summary shapes',
  )
  assertNoSensitiveShape('sanitized unsafe summary trace', sanitizedUnsafeSummaryTrace)

  console.log('Assistant agent framework contract passed')
}

const snapshot = snapshotRuntimeEnv()
try {
  forceLocalOnlyRuntime()
  await runContract()
} finally {
  restoreRuntimeEnv(snapshot)
}
