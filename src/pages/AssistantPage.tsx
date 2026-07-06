import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ASSISTANT_STORAGE_KEYS,
  internalAssistantSuggestions,
  normalizeAssistantCitations,
  normalizeAssistantAnswerMeta,
  normalizeAssistantMember,
  normalizeAssistantMessages,
  normalizeAssistantSessionPreview,
  normalizeAssistantSessionPreviews,
  publicKnowledgeBase,
  searchPublicKnowledge,
  type AssistantKnowledgeItem,
  type AssistantAnswerMetaSummary,
  type AssistantMemberProfile,
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

function getErrorCode(payload: unknown) {
  return isRecord(payload) && typeof payload.error === 'string' ? payload.error : ''
}

function createOpeningMessage(): AssistantMessage {
  return {
    id: 'assistant-opening',
    role: 'assistant',
    content:
      '这里是内部助手工作台。兑换邀请码后，我会把对话保存到你的内部会话列表；未连接 API 时仍可用公开站点知识做临时整理。',
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    citations: publicKnowledgeBase.filter((item) => ['site:intro', 'site:status'].includes(item.id)),
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

function formatLoadedMessages(messages: AssistantMessage[]) {
  return messages.map((message) => ({
    ...message,
    timestamp: formatAssistantTimestamp(message.timestamp),
  }))
}

export function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [createOpeningMessage()])
  const [sessions, setSessions] = useState<AssistantSessionPreview[]>([])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [isArchivingSession, setIsArchivingSession] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState(() => readStoredValue(ASSISTANT_STORAGE_KEYS.sessionId))
  const [memberToken, setMemberToken] = useState(() => readStoredValue(ASSISTANT_STORAGE_KEYS.memberToken))
  const [member, setMember] = useState<AssistantMemberProfile | null>(() => readStoredMember())
  const [inviteCode, setInviteCode] = useState('')
  const [memberName, setMemberName] = useState('')
  const [inviteStatus, setInviteStatus] = useState('')
  const [workspaceStatus, setWorkspaceStatus] = useState('')
  const [lastAnswerMeta, setLastAnswerMeta] = useState<AssistantAnswerMetaSummary | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const messageSeq = useRef(0)

  const createMessage = (
    role: AssistantMessage['role'],
    content: string,
    citations?: AssistantKnowledgeItem[],
  ): AssistantMessage => {
    messageSeq.current += 1
    return {
      id: `assistant-${role}-${messageSeq.current}`,
      role,
      content,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      citations,
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
      const [profileResult, sessionsResult] = await Promise.all([
        requestMemberProfile(memberToken),
        requestSessions(memberToken),
      ])
      if (cancelled) return

      if (profileResult.ok && profileResult.data) {
        setMember(profileResult.data)
        window.localStorage.setItem(ASSISTANT_STORAGE_KEYS.member, JSON.stringify(profileResult.data))
      }
      const nextSessions = sessionsResult.data
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
        setIsLoadingMessages(false)
        return
      }

      setSessions((current) => {
        const exists = current.some((session) => session.id === result.session.id)
        return exists
          ? current.map((session) => (session.id === result.session.id ? result.session : session))
          : [result.session, ...current]
      })
      setMessages(result.messages.length > 0 ? formatLoadedMessages(result.messages) : [])
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
    setSelectedSessionId('')
    setMessages([createOpeningMessage()])
    setLastAnswerMeta(null)
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
      setLastAnswerMeta(null)
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
    window.localStorage.removeItem(ASSISTANT_STORAGE_KEYS.sessionId)
    setWorkspaceStatus('会话已归档。')
  }

  const selectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
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
      setMessages((current) => [
        ...current,
        createMessage('assistant', result.content, result.citations),
      ])
      setLastAnswerMeta(result.meta ?? null)
      if (memberToken && API_BASE) {
        const sessionsResult = await requestSessions(memberToken)
        if (sessionsResult.ok) setSessions(sessionsResult.data)
      }
    } catch {
      const fallback = buildLocalInternalAnswer(trimmed, '内部助手 API 暂时不可用，本地回退继续：')
      setMessages((current) => [
        ...current,
        createMessage('assistant', fallback.content, fallback.citations),
      ])
      setLastAnswerMeta(null)
    } finally {
      setIsLoading(false)
    }
  }

  const chatMode = API_BASE && memberToken ? 'API 持久化会话' : '本地公开知识回退'
  const composerDisabled = isLoading || draft.trim().length === 0
  const retrieval = lastAnswerMeta?.retrieval
  const answerMode = lastAnswerMeta
    ? lastAnswerMeta.mode === 'model'
      ? '模型回答'
      : `回退：${lastAnswerMeta.reason ?? 'local'}`
    : API_BASE && memberToken
      ? '等待下一次回答'
      : '本地回退'

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
                <span>模型渠道：{member.modelChannel?.label ?? '默认模型通道'}</span>
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
            <p className="assistant-panel__eyebrow">ANSWER</p>
            <h3>回答状态</h3>
            <ul>
              <li>模式：{answerMode}</li>
              <li>模型：{lastAnswerMeta?.model ?? '等待回答'}</li>
              <li>渠道：{lastAnswerMeta?.modelChannel?.label ?? member?.modelChannel?.label ?? '默认模型通道'}</li>
              <li>引用：{lastAnswerMeta?.citationCount ?? latestCitations.length}</li>
            </ul>
            {retrieval && (
              <div className="assistant-panel__facts" aria-label="检索诊断">
                <span>{retrieval.source}</span>
                <span>{retrieval.store}</span>
                <span>{retrieval.sufficiency}</span>
                <span>{retrieval.candidateCount} candidates</span>
              </div>
            )}
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
