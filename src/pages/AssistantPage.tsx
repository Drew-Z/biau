import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Archive, RefreshCw, RotateCcw } from 'lucide-react'
import {
  ASSISTANT_STORAGE_KEYS,
  internalAssistantSuggestions,
  normalizeAssistantCitations,
  normalizeAssistantAnswerMeta,
  normalizeAssistantMember,
  normalizeAssistantMemories,
  normalizeAssistantMessages,
  normalizeAssistantSessionPreview,
  normalizeAssistantSessionPreviews,
  publicKnowledgeBase,
  searchPublicKnowledge,
  type AssistantKnowledgeItem,
  type AssistantAnswerMetaSummary,
  type AssistantAgentToolTrace,
  type AssistantMemberProfile,
  type AssistantMemory,
  type AssistantMessage,
  type AssistantSessionPreview,
} from '../data/assistant'
import { ASSISTANT_API_ENV_NAMES, INTERNAL_ASSISTANT_API_BASE } from '../utils/assistantApi'

const API_BASE = INTERNAL_ASSISTANT_API_BASE
const MAX_MESSAGE_LENGTH = 1000

interface AssistantResponse {
  content: string
  citations: AssistantKnowledgeItem[]
  sessionId?: string
  errorCode?: string
  meta?: AssistantAnswerMetaSummary | null
}

interface AssistantApiResult<T> {
  ok: boolean
  status: number
  errorCode: string
  data: T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readStoredMember() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(ASSISTANT_STORAGE_KEYS.member)
  if (!raw) return null

  try {
    return normalizeAssistantMember(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function readStoredValue(key: string) {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) ?? ''
}

function formatModelChannelState(channel?: AssistantMemberProfile['modelChannel'] | AssistantAnswerMetaSummary['modelChannel'] | null) {
  if (!channel) return '默认模型通道'
  if (!channel.isActive) return '已停用'
  if (!channel.configured) return '未配置'
  return channel.isDefault ? '默认可用' : '可用'
}

function formatRetrievalSufficiency(sufficiency?: string) {
  if (sufficiency === 'enough') return '证据充足'
  if (sufficiency === 'weak') return '证据偏弱'
  if (sufficiency === 'none') return '暂无证据'
  return '等待回答'
}

function formatAgentStatus(status?: string) {
  if (status === 'completed') return '已完成'
  if (status === 'guarded') return '已拦截'
  if (status === 'degraded') return '降级完成'
  if (status === 'failed') return '失败'
  return '等待运行'
}

function formatPlanner(planner?: string) {
  if (planner === 'model') return '模型规划'
  if (planner === 'mock') return '确定性规划'
  if (planner === 'fallback') return '回退规划'
  return '等待规划'
}

function formatPermission(permission: string) {
  if (permission === 'draft-write') return '草稿写入'
  if (permission === 'read') return '只读'
  if (permission === 'admin-write') return '管理写入'
  if (permission === 'external-live') return '外部 live'
  return permission
}

function formatToolStatus(status: string) {
  if (status === 'completed') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'blocked') return '已拦截'
  if (status === 'skipped') return '已跳过'
  if (status === 'selected') return '已选择'
  return status
}

function getToolTraceHint(tool: AssistantAgentToolTrace) {
  if (tool.id !== 'studio.draft') return ''
  if (tool.errorClass === 'not_configured') return 'Studio 数据库还没配置；本次只保留草稿计划，等服务变量和数据库就绪后再重试。'
  if (tool.errorClass === 'policy_blocked') return '请求里疑似包含密钥、密码、连接串或私有地址，已停止写入 Studio。'
  if (tool.errorClass === 'tool_error') return '写入 Studio 时失败，助手已降级为计划模式；可以稍后重试或去 Studio 手动创建。'
  if (tool.status === 'completed' && (!tool.artifacts || tool.artifacts.length === 0)) {
    return '这次只生成草稿计划，没有写入 Studio 数据库。'
  }
  return ''
}

function getWorkspaceNextAction({
  apiAvailable,
  memberToken,
  member,
  selectedSessionId,
  meta,
  tools,
}: {
  apiAvailable: boolean
  memberToken: string
  member: AssistantMemberProfile | null
  selectedSessionId: string
  meta: AssistantAnswerMetaSummary | null
  tools: AssistantAgentToolTrace[]
}) {
  if (!apiAvailable) return `配置 ${ASSISTANT_API_ENV_NAMES.internal} 后启用成员会话、模型渠道和 Studio 草稿。`
  if (!memberToken) return '先兑换邀请码，解锁成员会话、模型渠道和 Agent 工具轨迹。'
  if (!member) return '正在读取成员信息；也可以先发送消息触发当前 token。'
  if (meta?.guardrails?.status === 'blocked') return '请求触发安全边界，请去掉密钥、密码、连接串或私有地址后重试。'
  if (tools.some((tool) => tool.artifacts?.length)) return '已有 Studio 草稿待审核，可以从工具轨迹打开。'
  if (meta?.agent?.status === 'degraded') return '本次已降级完成；查看工具轨迹里的原因后再重试或转为手动草稿。'
  if (!selectedSessionId) return '直接发送消息会自动创建会话，也可以先点“新建”。'
  if (meta) return '可以继续追问，或让助手生成一个待审核的 Studio 草稿。'
  return '发送问题后，这里会展示规划、工具、引用和安全检查。'
}

function formatGuardrailStatus(status?: string) {
  if (status === 'passed') return '通过'
  if (status === 'warned') return '提醒'
  if (status === 'blocked') return '拦截'
  return '等待'
}

function formatAgentStep(step: string) {
  if (step === 'input_guard') return '输入守卫'
  if (step === 'plan') return '规划'
  if (step === 'validate_plan' || step === 'validate') return '计划校验'
  if (step === 'execute_tools' || step === 'execute') return '工具执行'
  if (step === 'compose_answer' || step === 'compose') return '答案生成'
  if (step === 'self_check' || step === 'critique' || step === 'sanitize') return '安全自检'
  if (step === 'persist_trace' || step === 'persist') return '轨迹投影'
  return step
}

function getErrorCode(payload: unknown) {
  return isRecord(payload) && typeof payload.error === 'string' ? payload.error : ''
}

function createOpeningMessage(): AssistantMessage {
  return {
    id: 'assistant-opening',
    role: 'assistant',
    content: '我是泊岸内部助手。给我项目、状态或写作目标，我会展示计划、工具、引用和草稿出口。',
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }
}

function buildLocalInternalAnswer(question: string, prefix = ''): AssistantResponse {
  const citations = searchPublicKnowledge(question)
  if (citations.length === 0) {
    return {
      content: `${prefix}当前没有命中足够的站点资料。我不会补造内部事实；可以换成项目名、博客主题或交付相关问题继续试。`,
      citations: publicKnowledgeBase.slice(0, 2),
    }
  }

  return {
    content: `${prefix}我先基于当前站点知识帮你整理一个方向：${citations
      .map((item) => `${item.title} 可以作为参考，重点是 ${item.summary}`)
      .join(' ')}`,
    citations,
  }
}

function explainInternalApiError(question: string, status: number, errorCode: string): AssistantResponse {
  const fallback = buildLocalInternalAnswer(question)
  if (status === 401 || errorCode === 'missing-or-invalid-token') {
    return {
      ...fallback,
      content: `成员 token 缺失或无效，内部 API 没有接受这次请求。本地回退继续：${fallback.content}`,
      errorCode: errorCode || 'missing-or-invalid-token',
    }
  }

  if (status === 403 || errorCode === 'member-disabled') {
    return {
      ...fallback,
      content: `当前成员已被禁用，无法继续写入内部会话。本地回退继续：${fallback.content}`,
      errorCode: errorCode || 'member-disabled',
    }
  }

  if (status === 404 || errorCode === 'session-not-found') {
    return {
      ...fallback,
      content: `当前会话不存在或不属于这个成员。本地回退继续：${fallback.content}`,
      errorCode: errorCode || 'session-not-found',
    }
  }

  if (status === 503 || errorCode === 'database-not-configured') {
    return {
      ...fallback,
      content: `内部 API 还没有可用数据库，邀请码和持久化会话暂时不可用。本地回退继续：${fallback.content}`,
      errorCode: errorCode || 'database-not-configured',
    }
  }

  return {
    ...fallback,
    content: `内部 API 返回 ${status}，当前先使用本地公开知识回退：${fallback.content}`,
    errorCode: errorCode || 'internal-chat-request-failed',
  }
}

async function requestInternalAnswer(
  question: string,
  memberToken: string,
  sessionId: string,
): Promise<AssistantResponse> {
  if (!API_BASE || !memberToken) return buildLocalInternalAnswer(question)

  const response = await fetch(`${API_BASE}/chat/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({
      message: question,
      ...(sessionId ? { sessionId } : {}),
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as unknown
  if (!response.ok) {
    return explainInternalApiError(question, response.status, getErrorCode(payload))
  }

  const answer = isRecord(payload) && typeof payload.answer === 'string' ? payload.answer.trim() : ''
  const nextSessionId = isRecord(payload) && typeof payload.sessionId === 'string' ? payload.sessionId : undefined
  const citations = isRecord(payload) ? normalizeAssistantCitations(payload.citations) : []
  const meta = isRecord(payload) ? normalizeAssistantAnswerMeta(payload.meta) : null

  return {
    content:
      answer ||
      '内部助手没有返回内容。你可以检查后端服务是否已部署，或先用本地回退模式继续整理页面。',
    citations,
    sessionId: nextSessionId,
    meta,
  }
}

async function requestMemberProfile(memberToken: string) {
  const emptyResult: AssistantApiResult<AssistantMemberProfile | null> = {
    ok: false,
    status: 0,
    errorCode: '',
    data: null,
  }
  if (!API_BASE || !memberToken) return emptyResult
  const response = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  })
  const payload = (await response.json().catch(() => ({}))) as unknown
  if (!response.ok || !isRecord(payload)) {
    return {
      ...emptyResult,
      status: response.status,
      errorCode: getErrorCode(payload),
    }
  }
  return {
    ok: true,
    status: response.status,
    errorCode: '',
    data: normalizeAssistantMember(payload.member),
  }
}

async function requestSessions(memberToken: string) {
  const emptyResult: AssistantApiResult<AssistantSessionPreview[]> = {
    ok: false,
    status: 0,
    errorCode: '',
    data: [],
  }
  if (!API_BASE || !memberToken) return emptyResult
  const response = await fetch(`${API_BASE}/chat/internal/sessions`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  })
  const payload = (await response.json().catch(() => ({}))) as unknown
  if (!response.ok || !isRecord(payload)) {
    return {
      ...emptyResult,
      status: response.status,
      errorCode: getErrorCode(payload),
    }
  }
  return {
    ok: true,
    status: response.status,
    errorCode: '',
    data: normalizeAssistantSessionPreviews(payload.sessions),
  }
}

async function requestMemories(memberToken: string, includeArchived: boolean) {
  const emptyResult: AssistantApiResult<AssistantMemory[]> = {
    ok: false,
    status: 0,
    errorCode: '',
    data: [],
  }
  if (!API_BASE || !memberToken) return emptyResult
  try {
    const query = includeArchived ? '?includeArchived=true' : ''
    const response = await fetch(`${API_BASE}/chat/internal/memories${query}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    const payload = (await response.json().catch(() => ({}))) as unknown
    if (!response.ok || !isRecord(payload)) {
      return {
        ...emptyResult,
        status: response.status,
        errorCode: getErrorCode(payload),
      }
    }
    return {
      ok: true,
      status: response.status,
      errorCode: '',
      data: normalizeAssistantMemories(payload.memories),
    }
  } catch {
    return emptyResult
  }
}

async function requestMemoryArchive(memberToken: string, memoryId: string, archived: boolean) {
  if (!API_BASE || !memberToken || !memoryId) return null
  try {
    const response = await fetch(`${API_BASE}/chat/internal/memories/${memoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ archived }),
    })
    const payload = (await response.json().catch(() => ({}))) as unknown
    if (!response.ok || !isRecord(payload)) return null
    return normalizeAssistantMemories([payload.memory])[0] ?? null
  } catch {
    return null
  }
}

async function requestSessionMessages(memberToken: string, sessionId: string) {
  if (!API_BASE || !memberToken || !sessionId) return null
  const response = await fetch(`${API_BASE}/chat/internal/sessions/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  })
  const payload = (await response.json().catch(() => ({}))) as unknown
  if (!response.ok || !isRecord(payload)) return null
  const session = normalizeAssistantSessionPreview(payload.session)
  const messages = normalizeAssistantMessages(payload.messages)
  if (!session) return null
  return { session, messages }
}

async function requestNewSession(memberToken: string) {
  if (!API_BASE || !memberToken) return null
  const response = await fetch(`${API_BASE}/chat/internal/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({ title: '新的内部会话' }),
  })
  const payload = (await response.json().catch(() => ({}))) as unknown
  if (!response.ok || !isRecord(payload)) return null
  return normalizeAssistantSessionPreview(payload.session)
}

async function requestArchiveSession(memberToken: string, sessionId: string) {
  if (!API_BASE || !memberToken || !sessionId) return null
  const response = await fetch(`${API_BASE}/chat/internal/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({ archived: true }),
  })
  const payload = (await response.json().catch(() => ({}))) as unknown
  if (!response.ok || !isRecord(payload)) return null
  return normalizeAssistantSessionPreview(payload.session)
}

function formatAssistantTimestamp(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatSessionUpdatedAt(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatMemoryKind(kind: AssistantMemory['kind']) {
  if (kind === 'PREFERENCE') return '偏好'
  if (kind === 'PROJECT') return '项目'
  if (kind === 'WORKFLOW') return '工作流'
  return '上下文'
}

function formatLoadedMessages(messages: AssistantMessage[]) {
  return messages.map((message) => ({
    ...message,
    timestamp: formatAssistantTimestamp(message.timestamp),
  }))
}

function readLatestAnswerMetaMessage(messages: AssistantMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'assistant' && message.meta) ?? null
}

export function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [createOpeningMessage()])
  const [sessions, setSessions] = useState<AssistantSessionPreview[]>([])
  const [memories, setMemories] = useState<AssistantMemory[]>([])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [isArchivingSession, setIsArchivingSession] = useState(false)
  const [isLoadingMemories, setIsLoadingMemories] = useState(false)
  const [updatingMemoryId, setUpdatingMemoryId] = useState('')
  const [showArchivedMemories, setShowArchivedMemories] = useState(false)
  const [memoryStatus, setMemoryStatus] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState(() => readStoredValue(ASSISTANT_STORAGE_KEYS.sessionId))
  const [memberToken, setMemberToken] = useState(() => readStoredValue(ASSISTANT_STORAGE_KEYS.memberToken))
  const [member, setMember] = useState<AssistantMemberProfile | null>(() => readStoredMember())
  const [inviteCode, setInviteCode] = useState('')
  const [memberName, setMemberName] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')
  const [workspaceStatus, setWorkspaceStatus] = useState('')
  const [lastAnswerMeta, setLastAnswerMeta] = useState<AssistantAnswerMetaSummary | null>(null)
  const [inspectedMessageId, setInspectedMessageId] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)
  const messageSeq = useRef(0)

  const createMessage = (
    role: AssistantMessage['role'],
    content: string,
    citations?: AssistantKnowledgeItem[],
    meta?: AssistantAnswerMetaSummary | null,
  ): AssistantMessage => {
    messageSeq.current += 1
    return {
      id: `assistant-${role}-${messageSeq.current}`,
      role,
      content,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      citations,
      meta,
    }
  }

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  )
  const latestCitations = useMemo(() => {
    const assistantMessage = [...messages].reverse().find((message) => message.role === 'assistant' && message.citations?.length)
    return assistantMessage?.citations ?? []
  }, [messages])

  useEffect(() => {
    let cancelled = false
    if (!API_BASE || !memberToken) return

    async function loadWorkspace() {
      setIsLoadingSessions(true)
      setWorkspaceStatus('')
      const [profileResult, sessionsResult, memoriesResult] = await Promise.all([
        requestMemberProfile(memberToken),
        requestSessions(memberToken),
        requestMemories(memberToken, false),
      ])
      if (cancelled) return

      if (profileResult.ok && profileResult.data) {
        setMember(profileResult.data)
        window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.member, JSON.stringify(profileResult.data))
      }
      const nextSessions = sessionsResult.data
      setMemories(memoriesResult.data)
      setSessions(nextSessions)
      setSelectedSessionId((currentSelectedSessionId) => {
        if (currentSelectedSessionId && nextSessions.some((session) => session.id === currentSelectedSessionId)) {
          return currentSelectedSessionId
        }
        const nextSessionId = nextSessions[0]?.id ?? ''
        if (nextSessionId) {
          window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.sessionId, nextSessionId)
        } else {
          window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.sessionId)
        }
        return nextSessionId
      })
      if (!profileResult.ok && (profileResult.status === 401 || profileResult.errorCode === 'missing-or-invalid-token')) {
        setWorkspaceStatus('成员 token 无效，请清除后重新兑换邀请码。')
      } else if (!sessionsResult.ok && (sessionsResult.status === 503 || sessionsResult.errorCode === 'database-not-configured')) {
        setWorkspaceStatus('内部 API 还没有可用数据库，历史会话暂时无法同步。')
      } else if (!sessionsResult.ok) {
        setWorkspaceStatus('无法同步内部会话列表，本页仍可继续当前对话。')
      } else {
        setWorkspaceStatus(nextSessions.length > 0 ? '历史会话已同步。' : '还没有历史会话，可以直接发送第一条消息。')
      }
      setMemoryStatus(
        memoriesResult.ok
          ? memoriesResult.data.length > 0
            ? `已同步 ${memoriesResult.data.length} 条长期记忆。`
            : '还没有长期记忆；明确说“请记住”后才会保存。'
          : memoriesResult.status === 404
            ? '当前 API 版本还未提供长期记忆接口。'
            : '长期记忆暂时无法同步，不影响当前聊天。',
      )
      setIsLoadingSessions(false)
    }

    void loadWorkspace().catch(() => {
      if (!cancelled) {
        setWorkspaceStatus('无法同步内部会话列表，本页仍可继续当前对话。')
        setIsLoadingSessions(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [memberToken])

  useEffect(() => {
    let cancelled = false
    if (!API_BASE || !memberToken || !selectedSessionId) return

    async function loadMessages() {
      setIsLoadingMessages(true)
      const result = await requestSessionMessages(memberToken, selectedSessionId)
      if (cancelled) return

      if (!result) {
        setWorkspaceStatus('当前会话不存在或无法读取，已经回到临时会话。')
        setSelectedSessionId('')
        window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.sessionId)
        setMessages([createOpeningMessage()])
        setLastAnswerMeta(null)
        setInspectedMessageId('')
        setIsLoadingMessages(false)
        return
      }

      setSessions((current) => {
        const exists = current.some((session) => session.id === result.session.id)
        return exists
          ? current.map((session) => (session.id === result.session.id ? result.session : session))
          : [result.session, ...current]
      })
      const nextMessages = result.messages.length > 0 ? formatLoadedMessages(result.messages) : []
      const latestMetaMessage = readLatestAnswerMetaMessage(nextMessages)
      setMessages(nextMessages)
      setLastAnswerMeta(latestMetaMessage?.meta ?? null)
      setInspectedMessageId(latestMetaMessage?.id ?? '')
      setIsLoadingMessages(false)
    }

    void loadMessages().catch(() => {
      if (!cancelled) {
        setWorkspaceStatus('无法读取当前会话消息。')
        setIsLoadingMessages(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [memberToken, selectedSessionId])

  const persistMember = (token: string, nextMember: AssistantMemberProfile) => {
    setMemberToken(token)
    setMember(nextMember)
    window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.memberToken, token)
    window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.member, JSON.stringify(nextMember))
  }

  const clearMember = () => {
    setMemberToken('')
    setMember(null)
    setSessions([])
    setMemories([])
    setSelectedSessionId('')
    setMessages([createOpeningMessage()])
    setLastAnswerMeta(null)
    setInspectedMessageId('')
    setMemoryStatus('')
    setShowArchivedMemories(false)
    window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.memberToken)
    window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.member)
    window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.sessionId)
    setInviteStatus('已清除本地成员 token。')
  }

  const redeemInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = inviteCode.trim()
    const name = memberName.trim() || '内部成员'

    if (!API_BASE) {
      setInviteStatus(`当前没有配置 ${ASSISTANT_API_ENV_NAMES.internal}，无法兑换邀请码；聊天会继续使用本地公开知识回退。`)
      return
    }

    if (!code) {
      setInviteStatus('请输入邀请码。')
      return
    }

    setIsRedeeming(true)
    setInviteStatus('')

    try {
      const response = await fetch(`${API_BASE}/auth/redeem-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name }),
      })
      const payload = (await response.json().catch(() => ({}))) as unknown

      if (!response.ok) {
        const errorCode = getErrorCode(payload)
        const message =
          errorCode === 'database-not-configured'
            ? '后端数据库尚未配置，暂时不能兑换邀请码。'
            : errorCode === 'invalid-invite'
              ? '邀请码无效、已用完或已过期。'
              : '邀请码兑换失败，请稍后再试。'
        setInviteStatus(message)
        return
      }

      const token = isRecord(payload) && typeof payload.token === 'string' ? payload.token : ''
      const nextMember = isRecord(payload) ? normalizeAssistantMember(payload.member) : null
      if (!token || !nextMember) {
        setInviteStatus('后端返回的成员信息不完整，请检查 API 版本。')
        return
      }

      persistMember(token, nextMember)
      setInviteCode('')
      setMemberName('')
      setSelectedSessionId('')
      setMessages([createOpeningMessage()])
      setMemories([])
      setMemoryStatus('还没有长期记忆；明确说“请记住”后才会保存。')
      setLastAnswerMeta(null)
      setInspectedMessageId('')
      window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.sessionId)
      setInviteStatus('邀请码已兑换，后续消息会优先调用内部助手 API。')
    } catch {
      setInviteStatus('无法连接内部助手 API，当前仍可使用本地公开知识回退。')
    } finally {
      setIsRedeeming(false)
    }
  }

  const refreshSessions = async () => {
    if (!memberToken || !API_BASE) {
      setWorkspaceStatus('需要先兑换邀请码并配置内部助手 API。')
      return
    }

    setIsLoadingSessions(true)
    const sessionsResult = await requestSessions(memberToken)
    const nextSessions = sessionsResult.data
    setSessions(nextSessions)
    setWorkspaceStatus(
      sessionsResult.ok
        ? nextSessions.length > 0
          ? '历史会话已刷新。'
          : '还没有历史会话。'
        : sessionsResult.status === 503 || sessionsResult.errorCode === 'database-not-configured'
          ? '内部 API 还没有可用数据库，历史会话暂时无法同步。'
          : '刷新历史会话失败，请稍后再试。',
    )
    setIsLoadingSessions(false)
  }

  const refreshMemories = async (includeArchived = showArchivedMemories) => {
    if (!memberToken || !API_BASE) {
      setMemoryStatus('需要先兑换邀请码并配置内部助手 API。')
      return
    }

    setIsLoadingMemories(true)
    const result = await requestMemories(memberToken, includeArchived)
    if (result.ok) {
      setMemories(result.data)
      setMemoryStatus(result.data.length > 0 ? `已刷新 ${result.data.length} 条长期记忆。` : '当前没有长期记忆。')
    } else {
      setMemoryStatus('刷新长期记忆失败，不影响当前聊天。')
    }
    setIsLoadingMemories(false)
  }

  const toggleArchivedMemories = (next: boolean) => {
    setShowArchivedMemories(next)
    void refreshMemories(next)
  }

  const updateMemoryStatus = async (memory: AssistantMemory) => {
    if (!memberToken) return
    setUpdatingMemoryId(memory.id)
    const archived = memory.status !== 'ARCHIVED'
    const updated = await requestMemoryArchive(memberToken, memory.id, archived)
    setUpdatingMemoryId('')
    if (!updated) {
      setMemoryStatus(archived ? '归档长期记忆失败。' : '恢复长期记忆失败。')
      return
    }
    setMemories((current) => {
      if (archived && !showArchivedMemories) return current.filter((item) => item.id !== memory.id)
      return current.map((item) => (item.id === updated.id ? updated : item))
    })
    setMemoryStatus(archived ? '长期记忆已归档。' : '长期记忆已恢复。')
  }

  const createSession = async () => {
    if (!memberToken || !API_BASE) {
      setWorkspaceStatus('需要先兑换邀请码并配置内部助手 API。')
      return
    }

    setIsCreatingSession(true)
    const session = await requestNewSession(memberToken)
    setIsCreatingSession(false)
    if (!session) {
      setWorkspaceStatus('创建会话失败，请检查内部助手 API。')
      return
    }

    setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)])
    setSelectedSessionId(session.id)
    setMessages([])
    setLastAnswerMeta(null)
    setInspectedMessageId('')
    window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.sessionId, session.id)
    setWorkspaceStatus('新的内部会话已创建。')
  }

  const archiveCurrentSession = async () => {
    if (!memberToken || !selectedSessionId) return
    setIsArchivingSession(true)
    const archived = await requestArchiveSession(memberToken, selectedSessionId)
    setIsArchivingSession(false)
    if (!archived) {
      setWorkspaceStatus('归档会话失败，请稍后再试。')
      return
    }

    setSessions((current) => current.filter((session) => session.id !== selectedSessionId))
    setSelectedSessionId('')
    setMessages([createOpeningMessage()])
    setLastAnswerMeta(null)
    setInspectedMessageId('')
    window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.sessionId)
    setWorkspaceStatus('会话已归档。')
  }

  const selectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setLastAnswerMeta(null)
    setInspectedMessageId('')
    window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.sessionId, sessionId)
  }

  const sendMessage = async (content: string) => {
    const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!trimmed || isLoading) return

    const userMessage = createMessage('user', trimmed)

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setIsLoading(true)

    try {
      const result = await requestInternalAnswer(trimmed, memberToken, selectedSessionId)
      if (result.sessionId) {
        setSelectedSessionId(result.sessionId)
        window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.sessionId, result.sessionId)
      }
      if (result.errorCode === 'session-not-found') {
        setSelectedSessionId('')
        window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.sessionId)
      }
      const assistantMessage = createMessage('assistant', result.content, result.citations, result.meta)
      setMessages((current) => [...current, assistantMessage])
      setLastAnswerMeta(result.meta ?? null)
      setInspectedMessageId(result.meta ? assistantMessage.id : '')
      if (memberToken && API_BASE) {
        const [sessionsResult, memoriesResult] = await Promise.all([
          requestSessions(memberToken),
          result.meta?.tools?.some((tool) => tool.id === 'memory.write' && tool.status === 'completed')
            ? requestMemories(memberToken, showArchivedMemories)
            : Promise.resolve(null),
        ])
        if (sessionsResult.ok) setSessions(sessionsResult.data)
        if (memoriesResult?.ok) {
          setMemories(memoriesResult.data)
          setMemoryStatus('长期记忆已更新。')
        }
      }
    } catch {
      const fallback = buildLocalInternalAnswer(trimmed, '内部助手 API 暂时不可用，本地回退继续：')
      setMessages((current) => [
        ...current,
        createMessage('assistant', fallback.content, fallback.citations),
      ])
      setLastAnswerMeta(null)
      setInspectedMessageId('')
    } finally {
      setIsLoading(false)
    }
  }

  const apiAvailable = Boolean(API_BASE)
  const chatMode = apiAvailable && memberToken ? 'Agent API 持久化' : apiAvailable ? 'API 已配置，待兑换' : '本地公开知识回退'
  const composerDisabled = isLoading || draft.trim().length === 0
  const retrieval = lastAnswerMeta?.retrieval
  const agent = lastAnswerMeta?.agent
  const tools = lastAnswerMeta?.tools ?? []
  const guardrails = lastAnswerMeta?.guardrails
  const answerMode = lastAnswerMeta
    ? lastAnswerMeta.mode === 'model'
      ? '模型回答'
      : `回退：${lastAnswerMeta.reason ?? 'local'}`
    : API_BASE && memberToken
      ? '等待下一次回答'
      : '本地回退'
  const answerChannel = lastAnswerMeta?.modelChannel ?? member?.modelChannel ?? null
  const inspectedMessage = inspectedMessageId ? messages.find((message) => message.id === inspectedMessageId) ?? null : null
  const workspaceNextAction = getWorkspaceNextAction({
    apiAvailable,
    memberToken,
    member,
    selectedSessionId,
    meta: lastAnswerMeta,
    tools,
  })

  return (
    <main className="assistant-page page-stack">
      <section className="assistant-shell">
        <aside className="assistant-sidebar">
          <div className="assistant-sidebar__header">
            <p className="section-subtitle">INTERNAL ASSISTANT</p>
            <h1 className="assistant-sidebar__title">内部助手</h1>
            <p className="assistant-sidebar__description">
              面向内部协作的会话工作台。登录后自动保存历史会话，并按成员分配的模型渠道回答。
            </p>
          </div>

          <div className="assistant-sidebar__status">
            <span className="assistant-chip">{API_BASE ? 'API 已配置' : '本地回退'}</span>
            <span className="assistant-chip">{member ? '已兑换 token' : '未兑换邀请码'}</span>
            <span className="assistant-chip">{sessions.length > 0 ? `${sessions.length} 个会话` : '暂无历史'}</span>
          </div>

          <section className="assistant-auth" aria-label="成员访问">
            {member ? (
              <div className="assistant-member-card">
                <p className="assistant-panel__eyebrow">MEMBER</p>
                <strong>{member.name}</strong>
                <span>{member.role} · {member.dailyQuota} / day</span>
                <span>模型渠道：{member.modelChannel?.label ?? '默认模型通道'} · {formatModelChannelState(member.modelChannel)}</span>
                <button type="button" onClick={clearMember}>
                  清除本地 token
                </button>
              </div>
            ) : (
              <form className="assistant-auth-form" onSubmit={redeemInvite}>
                <p className="assistant-panel__eyebrow">INVITE</p>
                <label className="assistant-field">
                  <span>邀请码</span>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="BIAU-PORT-ALPHA"
                    autoComplete="off"
                  />
                </label>
                <label className="assistant-field">
                  <span>显示名</span>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    placeholder="你的名字"
                    maxLength={80}
                  />
                </label>
                <button type="submit" disabled={isRedeeming || !API_BASE}>
                  {isRedeeming ? '兑换中…' : '兑换邀请码'}
                </button>
              </form>
            )}
            {inviteStatus && <p className="assistant-status-text">{inviteStatus}</p>}
          </section>

          <section className="assistant-session-list" aria-label="会话历史">
            <div className="assistant-session-list__header">
              <p className="assistant-panel__eyebrow">HISTORY</p>
              <div className="assistant-session-actions">
                <button type="button" onClick={() => void createSession()} disabled={!memberToken || isCreatingSession}>
                  {isCreatingSession ? '创建中' : '新建'}
                </button>
                <button type="button" onClick={() => void refreshSessions()} disabled={!memberToken || isLoadingSessions}>
                  {isLoadingSessions ? '同步中' : '刷新'}
                </button>
              </div>
            </div>

            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`assistant-session ${session.id === selectedSessionId ? 'is-active' : ''}`}
                onClick={() => selectSession(session.id)}
              >
                <strong>{session.title}</strong>
                <span>{session.preview}</span>
                <em>{formatSessionUpdatedAt(session.updatedAt)}</em>
              </button>
            ))}

            {sessions.length === 0 && (
              <p className="assistant-status-text">
                {member ? '还没有历史会话，发送消息后会自动创建。' : '兑换邀请码后会显示你的历史会话。'}
              </p>
            )}
          </section>

          <section className="assistant-memory-panel" aria-label="长期记忆">
            <div className="assistant-memory-panel__header">
              <div>
                <p className="assistant-panel__eyebrow">MEMORY</p>
                <strong>长期记忆</strong>
              </div>
              <button
                type="button"
                className="assistant-icon-button"
                onClick={() => void refreshMemories()}
                disabled={!memberToken || isLoadingMemories}
                title="刷新长期记忆"
                aria-label="刷新长期记忆"
              >
                <RefreshCw size={16} aria-hidden />
              </button>
            </div>

            <label className="assistant-memory-toggle">
              <input
                type="checkbox"
                checked={showArchivedMemories}
                onChange={(event) => toggleArchivedMemories(event.target.checked)}
                disabled={!memberToken || isLoadingMemories}
              />
              <span>显示已归档</span>
            </label>

            <div className="assistant-memory-list">
              {memories.map((memory) => (
                <article key={memory.id} className={`assistant-memory is-${memory.status.toLowerCase()}`}>
                  <div className="assistant-memory__meta">
                    <span>{formatMemoryKind(memory.kind)}</span>
                    <time dateTime={memory.updatedAt}>{formatSessionUpdatedAt(memory.updatedAt)}</time>
                  </div>
                  <strong>{memory.title}</strong>
                  <p>{memory.content}</p>
                  <button
                    type="button"
                    className="assistant-icon-button"
                    onClick={() => void updateMemoryStatus(memory)}
                    disabled={updatingMemoryId === memory.id}
                    title={memory.status === 'ARCHIVED' ? '恢复长期记忆' : '归档长期记忆'}
                    aria-label={memory.status === 'ARCHIVED' ? '恢复长期记忆' : '归档长期记忆'}
                  >
                    {memory.status === 'ARCHIVED' ? <RotateCcw size={15} aria-hidden /> : <Archive size={15} aria-hidden />}
                  </button>
                </article>
              ))}
              {memories.length === 0 && (
                <p className="assistant-status-text">
                  {member ? '明确说“请记住……”后，低敏内容会出现在这里。' : '兑换邀请码后可以使用成员长期记忆。'}
                </p>
              )}
            </div>
            {memoryStatus && <p className="assistant-status-text">{memoryStatus}</p>}
          </section>

          <div className="assistant-sidebar__footer">
            <Link to="/assistant/admin" className="assistant-link-card">
              <strong>管理员入口</strong>
              <span>管理邀请码、成员和模型渠道。</span>
            </Link>
          </div>
        </aside>

        <section className="assistant-main">
          <header className="assistant-main__header">
            <div>
              <p className="assistant-main__eyebrow">CURRENT SESSION</p>
              <h2>{selectedSession?.title ?? '临时会话'}</h2>
            </div>
            <div className="assistant-main__meta">
              <span>{member ? `成员：${member.name}` : '未兑换：本地回退'}</span>
              <span>{chatMode}</span>
              <span>{selectedSessionId ? '已选择历史会话' : '未选择历史会话'}</span>
              <button type="button" onClick={() => void archiveCurrentSession()} disabled={!selectedSessionId || isArchivingSession}>
                {isArchivingSession ? '归档中' : '归档'}
              </button>
            </div>
          </header>

          <section className="assistant-run-strip" aria-label="内部助手运行状态">
            <div className="assistant-run-card">
              <span>运行模式</span>
              <strong>{chatMode}</strong>
              <em>{selectedSessionId ? '会话已绑定' : '临时上下文'}</em>
            </div>
            <div className="assistant-run-card">
              <span>模型渠道</span>
              <strong>{answerChannel?.label ?? '默认模型通道'}</strong>
              <em>{formatModelChannelState(answerChannel)} · {answerChannel?.model ?? lastAnswerMeta?.model ?? '等待成员渠道'}</em>
            </div>
            <div className="assistant-run-card assistant-run-card--wide">
              <span>下一步</span>
              <strong>{formatAgentStatus(agent?.status)}</strong>
              <em>{workspaceNextAction}</em>
            </div>
          </section>

          <div className="assistant-thread" aria-live="polite">
            {messages.length === 0 && !isLoadingMessages && (
              <div className="assistant-empty-state">这个会话还没有消息，输入问题即可开始。</div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`assistant-bubble is-${message.role}`}>
                <div className="assistant-bubble__meta">
                  <strong>{message.role === 'assistant' ? '泊岸助手' : '你'}</strong>
                  <span>{message.timestamp}</span>
                </div>
                <p>{message.content}</p>
                {message.role === 'assistant' && message.meta && (
                  <button
                    type="button"
                    className={`assistant-bubble__trace ${inspectedMessageId === message.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setLastAnswerMeta(message.meta ?? null)
                      setInspectedMessageId(message.id)
                    }}
                  >
                    {inspectedMessageId === message.id ? '正在查看轨迹' : '查看运行轨迹'}
                  </button>
                )}
                {message.citations && message.citations.length > 0 && (
                  <div className="assistant-bubble__citations">
                    {message.citations.map((item) => (
                      <Link key={item.id} to={item.href} className="assistant-citation-card">
                        <strong>{item.title}</strong>
                        <span>{item.summary}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}

            {isLoadingMessages && <div className="assistant-loading">正在读取历史消息…</div>}
            {isLoading && <div className="assistant-loading">正在整理内部助手回复…</div>}
          </div>

          <div className="assistant-suggestions" aria-label="建议动作">
            {internalAssistantSuggestions.map((suggestion) => (
              <button key={suggestion.id} type="button" onClick={() => void sendMessage(suggestion.prompt)}>
                {suggestion.label}
              </button>
            ))}
          </div>

          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault()
              void sendMessage(draft)
            }}
          >
            <label className="sr-only" htmlFor="assistant-composer-input">
              向内部助手发送消息
            </label>
            <textarea
              id="assistant-composer-input"
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="描述你的问题、提纲需求或要整理的项目方向"
              rows={4}
            />
            <div className="assistant-composer__actions">
              <p>{workspaceStatus || '兑换邀请码后会写入你的内部历史会话；未连接 API 时仅使用本地公开知识回退。'}</p>
              <button type="submit" disabled={composerDisabled}>
                发送到内部助手
              </button>
            </div>
          </form>
        </section>

        <aside className="assistant-inspector">
          <section className="assistant-panel">
            <p className="assistant-panel__eyebrow">AGENT</p>
            <h3>LangGraph 运行状态</h3>
            <p className="assistant-panel__note">
              {inspectedMessage
                ? `正在查看 ${inspectedMessage.timestamp} 的回答轨迹。`
                : lastAnswerMeta
                  ? '正在查看最近一次回答轨迹。'
                  : '下一次 Agent 回答后会显示可回放轨迹。'}
            </p>
            <div className="assistant-diagnostic-grid">
              <div className="assistant-diagnostic-cell">
                <span>Graph</span>
                <strong>{agent ? 'LangGraph.js' : '等待运行'}</strong>
                <em>{formatAgentStatus(agent?.status)}</em>
              </div>
              <div className="assistant-diagnostic-cell">
                <span>Planner</span>
                <strong>{formatPlanner(agent?.planner)}</strong>
                <em>{answerMode}</em>
              </div>
              <div className="assistant-diagnostic-cell">
                <span>Evidence</span>
                <strong>{lastAnswerMeta?.citationCount ?? latestCitations.length}</strong>
                <em>{formatRetrievalSufficiency(retrieval?.sufficiency)}</em>
              </div>
              <div className="assistant-diagnostic-cell">
                <span>Latency</span>
                <strong>{agent ? `${agent.durationMs} ms` : '等待'}</strong>
                <em>{lastAnswerMeta?.model ?? '等待回答'}</em>
              </div>
            </div>
            {agent && agent.steps.length > 0 && (
              <div className="assistant-panel__facts" aria-label="LangGraph 节点">
                {agent.steps.map((step) => (
                  <span key={step}>{formatAgentStep(step)}</span>
                ))}
              </div>
            )}
            {retrieval && (
              <div className="assistant-panel__facts" aria-label="检索诊断">
                <span>{retrieval.source}</span>
                <span>{retrieval.store}</span>
                <span>{formatRetrievalSufficiency(retrieval.sufficiency)}</span>
                <span>{retrieval.candidateCount} candidates</span>
              </div>
            )}
          </section>

          <section className="assistant-panel">
            <p className="assistant-panel__eyebrow">TOOLS</p>
            <h3>工具轨迹</h3>
            <ul className="assistant-tool-list">
              {tools.map((tool) => (
                <li key={tool.id} className={`assistant-tool-trace is-${tool.status}`}>
                  <div className="assistant-tool-trace__header">
                    <strong>{tool.label}</strong>
                    <span>{formatPermission(tool.permission)} · {formatToolStatus(tool.status)}</span>
                  </div>
                  <p>{tool.summary}</p>
                  <div className="assistant-panel__facts">
                    <span>{tool.id}</span>
                    {tool.itemCount !== undefined && <span>{tool.itemCount} items</span>}
                    {tool.citationCount !== undefined && <span>{tool.citationCount} citations</span>}
                    {tool.errorClass && <span>{tool.errorClass}</span>}
                  </div>
                  {getToolTraceHint(tool) && <p className="assistant-tool-hint">{getToolTraceHint(tool)}</p>}
                  {tool.artifacts?.map((artifact) => (
                    <Link key={`${tool.id}-${artifact.id}`} to={artifact.href} className="assistant-tool-artifact">
                      草稿已创建：{artifact.title} · 待审核 · 暂不公开 · 打开 Studio
                    </Link>
                  ))}
                </li>
              ))}
              {tools.length === 0 && <li>下一次 Agent 回答后显示工具调用。</li>}
            </ul>
          </section>

          <section className="assistant-panel">
            <p className="assistant-panel__eyebrow">GUARDRAILS</p>
            <h3>安全检查</h3>
            <ul>
              <li>状态：{formatGuardrailStatus(guardrails?.status)}</li>
              <li>证据：{guardrails?.citationSufficiency ?? '等待回答'}</li>
              <li>权限：{guardrails?.allowedPermissions.map(formatPermission).join(' / ') || '只读 / 草稿写入'}</li>
              {guardrails?.issues.slice(0, 3).map((issue) => <li key={issue}>提示：{issue}</li>)}
            </ul>
          </section>

          <section className="assistant-panel">
            <p className="assistant-panel__eyebrow">SOURCES</p>
            <h3>最近引用</h3>
            <ul>
              {latestCitations.slice(0, 4).map((citation) => (
                <li key={citation.id}>{citation.title}</li>
              ))}
              {latestCitations.length === 0 && <li>下一次回答后会显示引用来源。</li>}
            </ul>
          </section>

          <section className="assistant-panel">
            <p className="assistant-panel__eyebrow">BOUNDARY</p>
            <h3>运行边界</h3>
            <ul>
              <li>会话历史按成员 token 隔离。</li>
              <li>模型渠道由管理员按成员分配。</li>
              <li>已审核内部知识可同步到 internal RAG collection。</li>
              <li>公开助手不能读取 internal scope。</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  )
}
