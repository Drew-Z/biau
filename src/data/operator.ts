import {
  normalizeAssistantCitations,
  normalizeAssistantInternalKnowledgeDocuments,
  normalizeAssistantInternalKnowledgeSyncRun,
  normalizeAssistantMemories,
  normalizeAssistantMessages,
  normalizeAssistantModelChannel,
  normalizeAssistantModelChannels,
  normalizeAssistantRagAdminStatus,
  normalizeAssistantSessionPreviews,
  normalizeAssistantUsageSummaries,
  type AssistantInternalKnowledgeDocument,
  type AssistantInternalKnowledgeSyncRun,
  type AssistantKnowledgeItem,
  type AssistantMemory,
  type AssistantMessage,
  type AssistantModelChannelSummary,
  type AssistantRagAdminStatus,
  type AssistantSessionPreview,
  type AssistantUsageSummary,
} from './assistant'

export const OPERATOR_API_BASE = '/api/operator'

export interface OperatorProfile {
  id: string
  name: string
  role: 'OWNER'
  modelChannelId: string | null
  modelChannel?: AssistantModelChannelSummary
}

export interface OperatorSummary {
  sessions: number
  messages: number
  memories: number
  usage: number
  internalKnowledgeDocuments: number
  lastInternalKnowledgeSync: AssistantInternalKnowledgeSyncRun | null
  operator: OperatorProfile
  modelChannels: AssistantModelChannelSummary[]
}

export interface OperatorBootstrap {
  operator: OperatorProfile
  sessions: AssistantSessionPreview[]
  memories: AssistantMemory[]
}

export interface OperatorSettingsSnapshot {
  summary: OperatorSummary | null
  documents: AssistantInternalKnowledgeDocument[]
  lastSyncRun: AssistantInternalKnowledgeSyncRun | null
  rag: AssistantRagAdminStatus | null
  memories: AssistantMemory[]
  usage: AssistantUsageSummary[]
  modelChannels: AssistantModelChannelSummary[]
  selectedModelChannel: AssistantModelChannelSummary | null
}

export interface OperatorApiResult<T> {
  ok: boolean
  status: number
  errorCode: string
  data: T | null
}

export const operatorSuggestions = [
  {
    id: 'content-audit',
    label: '审查内容',
    prompt: '检查当前项目页与知识文章的内容缺口，按影响优先级给出下一轮站务任务。',
  },
  {
    id: 'status-review',
    label: '检查状态',
    prompt: '结合当前状态页和可靠性资料，整理哪些项目仍有人工 gate 或缺少可验证证据。',
  },
  {
    id: 'layout-review',
    label: '复核布局',
    prompt: '从访客体验、移动端、导航和信息层级角度，规划一个可验证的站点 UI 优化切片。',
  },
  {
    id: 'studio-draft',
    label: '创建草稿',
    prompt: '根据当前公开事实创建一个 hidden + review-needed 的 Studio 项目更新草稿，等待人工审核。',
  },
] as const

export async function requestOperatorApi<T>(path: string, init?: RequestInit): Promise<OperatorApiResult<T>> {
  try {
    const response = await fetch(`${OPERATOR_API_BASE}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    })
    const payload = (await response.json().catch(() => null)) as unknown
    return {
      ok: response.ok,
      status: response.status,
      errorCode: readErrorCode(payload),
      data: response.ok ? (payload as T) : null,
    }
  } catch {
    return { ok: false, status: 0, errorCode: 'operator-facade-unreachable', data: null }
  }
}

export function normalizeOperatorProfile(value: unknown): OperatorProfile | null {
  if (!isRecord(value)) return null
  const { id, name, role, modelChannelId, modelChannel } = value
  if (typeof id !== 'string' || typeof name !== 'string' || role !== 'OWNER') return null
  return {
    id,
    name,
    role,
    modelChannelId: typeof modelChannelId === 'string' || modelChannelId === null ? modelChannelId : null,
    modelChannel: normalizeAssistantModelChannel(modelChannel) ?? undefined,
  }
}

export function normalizeOperatorSummary(value: unknown): OperatorSummary | null {
  if (!isRecord(value)) return null
  const operator = normalizeOperatorProfile(value.operator)
  if (
    !operator ||
    typeof value.sessions !== 'number' ||
    typeof value.messages !== 'number' ||
    typeof value.memories !== 'number' ||
    typeof value.usage !== 'number' ||
    typeof value.internalKnowledgeDocuments !== 'number'
  ) {
    return null
  }
  return {
    sessions: value.sessions,
    messages: value.messages,
    memories: value.memories,
    usage: value.usage,
    internalKnowledgeDocuments: value.internalKnowledgeDocuments,
    lastInternalKnowledgeSync: normalizeAssistantInternalKnowledgeSyncRun(value.lastInternalKnowledgeSync),
    operator,
    modelChannels: normalizeAssistantModelChannels(value.modelChannels),
  }
}

export function readOperatorMe(value: unknown) {
  return isRecord(value) ? normalizeOperatorProfile(value.operator) : null
}

export function readOperatorSessions(value: unknown) {
  return isRecord(value) ? normalizeAssistantSessionPreviews(value.sessions) : []
}

export function readOperatorMessages(value: unknown) {
  return isRecord(value) ? normalizeAssistantMessages(value.messages) : []
}

export function readOperatorMemories(value: unknown) {
  return isRecord(value) ? normalizeAssistantMemories(value.memories) : []
}

export function readOperatorKnowledge(value: unknown) {
  if (!isRecord(value)) return { documents: [], lastSyncRun: null }
  return {
    documents: normalizeAssistantInternalKnowledgeDocuments(value.documents),
    lastSyncRun: normalizeAssistantInternalKnowledgeSyncRun(value.lastSyncRun),
  }
}

export function readOperatorRag(value: unknown) {
  return normalizeAssistantRagAdminStatus(value)
}

export function readOperatorUsage(value: unknown) {
  return isRecord(value) ? normalizeAssistantUsageSummaries(value.usage) : []
}

export function readOperatorModelChannels(value: unknown) {
  if (!isRecord(value)) return { modelChannels: [], selectedModelChannel: null }
  return {
    modelChannels: normalizeAssistantModelChannels(value.modelChannels),
    selectedModelChannel: normalizeAssistantModelChannel(value.selectedModelChannel),
  }
}

export function readOperatorChatResponse(value: unknown): {
  answer: string
  citations: AssistantKnowledgeItem[]
  sessionId: string
  messageId: string
  meta: AssistantMessage['meta']
} | null {
  if (!isRecord(value) || typeof value.answer !== 'string' || typeof value.sessionId !== 'string') return null
  const normalized = normalizeAssistantMessages([
    {
      id: typeof value.messageId === 'string' ? value.messageId : `operator-${Date.now()}`,
      role: 'assistant',
      content: value.answer,
      citations: normalizeAssistantCitations(value.citations),
      meta: value.meta,
      timestamp: new Date().toISOString(),
    },
  ])[0]
  if (!normalized) return null
  return {
    answer: normalized.content,
    citations: normalized.citations ?? [],
    sessionId: value.sessionId,
    messageId: normalized.id,
    meta: normalized.meta,
  }
}

export function explainOperatorError(status: number, errorCode: string) {
  if (status === 401 || errorCode === 'operator-access-required' || errorCode === 'operator-access-invalid') {
    return 'Cloudflare Access 身份缺失或已过期。请重新通过站务入口完成 Access 登录，然后刷新页面。'
  }
  if (status === 403 || errorCode === 'operator-owner-not-allowed' || errorCode === 'operator-identity-not-allowed') {
    return '当前 Access 账号不在站长白名单中。请检查 Cloudflare Access policy 与 OPERATOR_OWNER_EMAILS。'
  }
  if (status === 503 || errorCode === 'operator-facade-not-configured' || errorCode === 'operator-auth-not-configured') {
    return '站务服务尚未完成配置。请检查 Cloudflare facade、Render Operator 服务和数据库环境变量。'
  }
  if (status === 502 || errorCode === 'operator-upstream-unreachable') return 'Cloudflare 已接收请求，但 Render Operator 服务当前不可达。'
  if (status === 504 || errorCode === 'operator-upstream-timeout') return 'Render Operator 服务响应超时，请稍后重试并检查服务日志。'
  if (status === 404 || errorCode === 'session-not-found') return '当前站务会话不存在或已被归档，请刷新会话列表。'
  if (status === 0 || errorCode === 'operator-facade-unreachable') return '浏览器无法连接同源站务 API，请确认 Pages Functions 已部署。'
  return `站务 API 返回 ${status || '网络错误'}${errorCode ? `（${errorCode}）` : ''}。`
}

function readErrorCode(value: unknown) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
