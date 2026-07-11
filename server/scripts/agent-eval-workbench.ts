import type { PrismaClient } from '@prisma/client'
import { AGENT_GRAPH_STEPS } from '../src/agentGraph.js'
import { runInternalAgent } from '../src/agentOrchestrator.js'
import { env } from '../src/env.js'
import type { AgentGraphNodeId, AgentToolId, AgentToolTrace } from '../src/types.js'

interface AgentEvalCase {
  id: string
  question: string
  expectedTools: AgentToolId[]
  expectedIntent: string
  expectedGrounding: string
  requireInternalCitation?: boolean
  requirePlanOnlyDraft?: boolean
  requireMemoryWrite?: boolean
}

const expectedGraphSteps: AgentGraphNodeId[] = [
  'input_guard',
  'plan',
  'validate_plan',
  'execute_tools',
  'compose_answer',
  'self_check',
  'persist_trace',
]

const evalCases: AgentEvalCase[] = [
  {
    id: 'status-project',
    question: 'Legal RAG 当前状态是否正常？演示入口和项目能力分别是什么？',
    expectedTools: ['status.query', 'project.lookup', 'rag.retrieve'],
    expectedIntent: 'site_qa',
    expectedGrounding: 'strict',
  },
  {
    id: 'internal-knowledge',
    question: '查找内部知识里关于 RAG 同步验收的资料。',
    expectedTools: ['knowledge.search'],
    expectedIntent: 'site_qa',
    expectedGrounding: 'strict',
    requireInternalCitation: true,
  },
  {
    id: 'studio-draft',
    question: '帮我生成 Legal RAG 项目详情草稿，重点写架构、检索和后续优化。',
    expectedTools: ['project.lookup', 'rag.retrieve', 'studio.draft'],
    expectedIntent: 'creative',
    expectedGrounding: 'background',
    requirePlanOnlyDraft: true,
  },
  {
    id: 'planning-memory',
    question: '内部助手下一步怎么做？请结合当前会话历史给我一个推进计划。',
    expectedTools: ['knowledge.search', 'memory.search'],
    expectedIntent: 'planning',
    expectedGrounding: 'background',
  },
  {
    id: 'explicit-memory-write',
    question: '请记住以后默认使用简体中文回答',
    expectedTools: ['memory.write'],
    expectedIntent: 'general',
    expectedGrounding: 'none',
    requireMemoryWrite: true,
  },
  {
    id: 'memory-query-only',
    question: '你还记得我的输出偏好吗？',
    expectedTools: ['memory.search'],
    expectedIntent: 'site_qa',
    expectedGrounding: 'strict',
  },
]

const memoryRows: Array<{
  id: string
  memberId: string
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
    findMany: async () => [
      {
        id: 'knowledge-rag-sync',
        slug: 'rag-sync-acceptance',
        title: 'RAG 同步验收说明',
        summary: '内部知识同步需要先准备 reviewed/active 文档，再通过管理员控制台触发同步并查看低敏诊断。',
        body: '验收重点包括 chunk 数量、collection scope、低敏 issueCount、最后同步时间，以及失败时的 next action。',
        tags: ['RAG', '同步', '验收'],
        status: 'ACTIVE',
        sourceType: 'runbook',
        safetyNotes: '不包含密钥、数据库 URL、模型渠道地址或 token。',
        contentHash: 'mock-rag-sync',
        updatedAt: new Date(0),
      },
    ],
  },
  chatMessage: {
    findMany: async () => [
      {
        id: 'message-1',
        role: 'USER',
        content: '昨天已经确认普通成员只能 read 和 draft-write。',
        createdAt: new Date(0),
      },
      {
        id: 'message-2',
        role: 'ASSISTANT',
        content: '下一步优先补本地 eval、运行态 UI 和安全投影。',
        createdAt: new Date(1),
      },
    ],
  },
  agentMemory: {
    findMany: async ({ where }: { where: { memberId: string; status: string } }) =>
      memoryRows.filter((row) => row.memberId === where.memberId && row.status === where.status),
    findUnique: async ({ where }: { where: { memberId_contentHash: { memberId: string; contentHash: string } } }) =>
      memoryRows.find(
        (row) => row.memberId === where.memberId_contentHash.memberId && row.contentHash === where.memberId_contentHash.contentHash,
      ) ?? null,
    create: async ({ data }: { data: Omit<(typeof memoryRows)[number], 'id' | 'status' | 'archivedAt' | 'createdAt' | 'updatedAt'> }) => {
      const now = new Date()
      const row = {
        ...data,
        id: `eval-memory-${memoryRows.length + 1}`,
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

function getToolTrace(traces: AgentToolTrace[], id: AgentToolId) {
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

async function runEvalCase(testCase: AgentEvalCase) {
  const memoryCountBefore = memoryRows.length
  const member = { id: 'eval-member', name: 'Eval Member', role: 'MEMBER' as const, modelChannelId: null }
  const result = await runInternalAgent({
    question: testCase.question,
    member,
    sessionId: `eval-${testCase.id}`,
    prisma: mockAgentPrisma,
    plannerMode: 'mock',
    studioDraftMode: 'plan-only',
  })

  assert(result.meta.agent.mode === 'agentic-workspace', `${testCase.id}: should run Agentic Workspace runtime`)
  assert(result.meta.agent.planner === 'mock', `${testCase.id}: eval must not call a live planner`)
  assertSameArray(result.meta.agent.steps, expectedGraphSteps, `${testCase.id}: should report LangGraph node sequence`)
  assert(result.meta.intent === testCase.expectedIntent, `${testCase.id}: unexpected intent ${result.meta.intent}`)
  assert(result.meta.grounding === testCase.expectedGrounding, `${testCase.id}: unexpected grounding ${result.meta.grounding}`)
  assert(result.meta.agent.status !== 'failed', `${testCase.id}: agent run should not fail`)

  for (const toolId of testCase.expectedTools) {
    assert(getToolTrace(result.meta.tools, toolId), `${testCase.id}: expected tool ${toolId}`)
  }
  assert(
    result.meta.tools.every((tool) => tool.permission === 'read' || tool.permission === 'draft-write'),
    `${testCase.id}: normal member chat must not use admin/live permissions`,
  )

  if (testCase.requireInternalCitation) {
    assert(
      result.citations.some((citation) => citation.id === 'internal-knowledge:rag-sync-acceptance'),
      `${testCase.id}: expected reviewed internal knowledge citation`,
    )
  }

  if (testCase.requirePlanOnlyDraft) {
    const draftTrace = getToolTrace(result.meta.tools, 'studio.draft')
    assert(draftTrace?.permission === 'draft-write', `${testCase.id}: studio draft should be draft-write`)
    assert(draftTrace.status === 'completed', `${testCase.id}: plan-only draft should complete`)
    assert(!draftTrace.artifacts?.length, `${testCase.id}: plan-only draft must not create Studio artifacts`)
  }

  if (testCase.requireMemoryWrite) {
    const memoryTrace = getToolTrace(result.meta.tools, 'memory.write')
    assert(memoryTrace?.permission === 'draft-write', `${testCase.id}: memory.write should use draft-write permission`)
    assert(memoryTrace.status === 'completed', `${testCase.id}: explicit memory write should complete`)
    assert(memoryRows.length === memoryCountBefore + 1, `${testCase.id}: explicit memory write should persist one row`)
  } else {
    assert(memoryRows.length === memoryCountBefore, `${testCase.id}: non-write case must not persist memory`)
  }

  assertNoSensitiveShape(`${testCase.id} answer`, result.answer)
  assertNoSensitiveShape(`${testCase.id} meta`, result.meta)
}

async function runEvalWorkbench() {
  assertSameArray(AGENT_GRAPH_STEPS, expectedGraphSteps, 'agent graph exported steps should match eval contract')
  for (const testCase of evalCases) {
    await runEvalCase(testCase)
  }
  console.log(`Internal assistant agent eval passed: ${evalCases.length} cases`)
}

const snapshot = snapshotRuntimeEnv()
try {
  forceLocalOnlyRuntime()
  await runEvalWorkbench()
} finally {
  restoreRuntimeEnv(snapshot)
}
