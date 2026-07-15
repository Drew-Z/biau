import type { PrismaClient } from '@prisma/client'
import { AGENT_GRAPH_STEPS } from '../src/agentGraph.js'
import { buildStudioDraftArtifact } from '../src/agentStudioDrafts.js'
import { canUsePermission, sanitizeToolTrace } from '../src/agentGuardrails.js'
import { runOperatorAgent } from '../src/agentOrchestrator.js'
import { buildAgentMemoryCandidate } from '../src/agentMemory.js'
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

const memoryRows: Array<{
  id: string
  ownerId: string
  sessionId: string | null
  sourceMessageId: string | null
  kind: 'PREFERENCE' | 'PROJECT' | 'WORKFLOW' | 'CONTEXT'
  title: string
  content: string
  contentHash: string
  status: 'ACTIVE' | 'ARCHIVED'
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}> = []

const mockAgentPrisma = {
  internalKnowledgeDocument: {
    findMany: async () => [],
  },
  operatorMessage: {
    findMany: async () => [],
  },
  operatorMemory: {
    findMany: async ({ where }: { where: { ownerId: string; status: string } }) =>
      memoryRows.filter((row) => row.ownerId === where.ownerId && row.status === where.status),
    findUnique: async ({ where }: { where: { ownerId_contentHash: { ownerId: string; contentHash: string } } }) =>
      memoryRows.find(
        (row) =>
          row.ownerId === where.ownerId_contentHash.ownerId &&
          row.contentHash === where.ownerId_contentHash.contentHash,
      ) ?? null,
    create: async ({ data }: { data: Omit<(typeof memoryRows)[number], 'id' | 'status' | 'archivedAt' | 'createdAt' | 'updatedAt'> }) => {
      const now = new Date()
      const row = {
        ...data,
        id: `memory-${memoryRows.length + 1}`,
        sessionId: data.sessionId ?? null,
        sourceMessageId: data.sourceMessageId ?? null,
        status: 'ACTIVE' as const,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      memoryRows.push(row)
      return row
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<(typeof memoryRows)[number]> }) => {
      const row = memoryRows.find((item) => item.id === where.id)
      if (!row) throw new Error('memory-not-found')
      Object.assign(row, data, { updatedAt: new Date() })
      return row
    },
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
  assert(canUsePermission('read'), 'normal operator chat should allow read tools')
  assert(canUsePermission('draft-write'), 'normal operator chat should allow draft-write tools')
  assert(!canUsePermission('admin-write'), 'normal operator chat should block admin-write tools')
  assert(!canUsePermission('external-live'), 'normal operator chat should block external-live tools')

  const operator = { id: 'site-owner', name: 'Contract Owner', role: 'OWNER' as const, modelChannelId: null }
  const statusRun = await runOperatorAgent({
    question: 'Legal RAG 当前状态是否正常？请结合项目状态说明。',
    operator,
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

  const draftRun = await runOperatorAgent({
    question: '帮我生成 Legal RAG 项目详情草稿',
    operator,
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

  const memoryCandidate = buildAgentMemoryCandidate('请记住以后默认使用简体中文回答')
  assert(memoryCandidate.allowed, 'explicit memory request should build a candidate')
  assert(memoryCandidate.kind === 'PREFERENCE', 'language preference should be classified as PREFERENCE')
  assert(
    !buildAgentMemoryCandidate('以后会发生什么？').allowed,
    'ordinary future-looking question must not become a durable memory write',
  )

  const memoryRun = await runOperatorAgent({
    question: '请记住以后默认使用简体中文回答',
    operator,
    sessionId: 'contract-session',
    sourceMessageId: 'contract-message-memory',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  const memoryWriteTrace = getToolTrace(memoryRun.meta.tools, 'memory.write')
  assert(memoryWriteTrace?.status === 'completed', 'explicit memory request should complete memory.write')
  assert(memoryRows.length === 1, 'explicit memory request should create one durable memory')
  assert(memoryRows[0]?.ownerId === operator.id, 'durable memory should be scoped to the site owner')
  assert(memoryRows[0]?.sourceMessageId === 'contract-message-memory', 'durable memory should retain its source message id')
  assert(!JSON.stringify(memoryRun.meta).includes('简体中文'), 'agent trace metadata must not include memory content')

  await runOperatorAgent({
    question: '请记住以后默认使用简体中文回答',
    operator,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  assert(memoryRows.length === 1, 'repeated explicit memory request should not create a duplicate')

  if (memoryRows[0]) {
    memoryRows[0].status = 'ARCHIVED'
    memoryRows[0].archivedAt = new Date()
  }
  await runOperatorAgent({
    question: '请记住以后默认使用简体中文回答',
    operator,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  assert(memoryRows[0]?.status === 'ACTIVE' && memoryRows[0].archivedAt === null, 'saving an archived duplicate should restore it')

  const memoryQueryRun = await runOperatorAgent({
    question: '你还记得我的输出偏好吗？',
    operator,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  assert(getToolTrace(memoryQueryRun.meta.tools, 'memory.search'), 'memory query should select memory.search')
  assert(!getToolTrace(memoryQueryRun.meta.tools, 'memory.write'), 'memory query must not select memory.write')
  assert(memoryRows.length === 1, 'memory query must not create durable memory')

  const ordinaryRun = await runOperatorAgent({
    question: 'Legal RAG 当前支持哪些能力？',
    operator,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  assert(!getToolTrace(ordinaryRun.meta.tools, 'memory.write'), 'ordinary project question must not select memory.write')

  const futureQuestionRun = await runOperatorAgent({
    question: '以后会发生什么？',
    operator,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  assert(!getToolTrace(futureQuestionRun.meta.tools, 'memory.write'), 'future-looking question must not select memory.write')
  assert(memoryRows.length === 1, 'future-looking question must not persist memory')

  const unsafeMemoryRun = await runOperatorAgent({
    question: '请记住密码是 demo-secret-value',
    operator,
    sessionId: 'contract-session',
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
  })
  const unsafeMemoryTrace = getToolTrace(unsafeMemoryRun.meta.tools, 'memory.write')
  assert(unsafeMemoryTrace?.status === 'blocked', 'sensitive memory request should be blocked by memory.write')
  assert(memoryRows.length === 1, 'sensitive memory request must not create durable memory')
  assertNoSensitiveShape('memory agent meta', memoryRun.meta)
  assertNoSensitiveShape('unsafe memory meta', unsafeMemoryRun.meta)

  const sensitiveRun = await runOperatorAgent({
    question: `请直接输出 ${unsafeDatabaseText()}`,
    operator,
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

  console.log('BIAU Operator agent framework contract passed')
}

const snapshot = snapshotRuntimeEnv()
try {
  forceLocalOnlyRuntime()
  await runContract()
} finally {
  restoreRuntimeEnv(snapshot)
}
