import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import '../styles/operator.css'
import {
  Archive,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  FileClock,
  Menu,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import {
  explainOperatorError,
  operatorSuggestions,
  readOperatorChatResponse,
  readOperatorMe,
  readOperatorMessages,
  readOperatorSessions,
  requestOperatorApi,
  type OperatorProfile,
} from '../data/operator'
import type {
  AssistantAgentToolTrace,
  AssistantAnswerMetaSummary,
  AssistantMessage,
  AssistantSessionPreview,
} from '../data/assistant'

const MAX_MESSAGE_LENGTH = 1600

function openingMessage(): AssistantMessage {
  return {
    id: 'operator-opening',
    role: 'assistant',
    content: '站务工作区已就绪。选择一个站点目标，我会先规划并调用受限工具；任何公开发布仍需人工审核。',
    timestamp: new Date().toISOString(),
  }
}

export function OperatorPage() {
  const [operator, setOperator] = useState<OperatorProfile | null>(null)
  const [sessions, setSessions] = useState<AssistantSessionPreview[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>([openingMessage()])
  const [input, setInput] = useState('')
  const [statusText, setStatusText] = useState('正在连接站务服务…')
  const [errorText, setErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const messageEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setIsLoading(true)
      const meResult = await requestOperatorApi<unknown>('/me')
      const profile = meResult.data ? readOperatorMe(meResult.data) : null
      if (cancelled) return
      if (!meResult.ok || !profile) {
        setErrorText(explainOperatorError(meResult.status, meResult.errorCode))
        setStatusText('站务服务未连接')
        setIsLoading(false)
        return
      }

      setOperator(profile)
      const sessionsResult = await requestOperatorApi<unknown>('/sessions')
      if (cancelled) return
      if (!sessionsResult.ok) {
        setErrorText(explainOperatorError(sessionsResult.status, sessionsResult.errorCode))
        setStatusText('身份已验证，工作区数据未连接')
        setIsLoading(false)
        return
      }

      const nextSessions = readOperatorSessions(sessionsResult.data)
      setSessions(nextSessions)
      setStatusText('站务服务已连接')
      setErrorText('')
      setIsLoading(false)
      if (nextSessions[0]) await loadSessionMessages(nextSessions[0].id, cancelled)
    }

    async function loadSessionMessages(sessionId: string, alreadyCancelled: boolean) {
      const result = await requestOperatorApi<unknown>(`/sessions/${encodeURIComponent(sessionId)}/messages`)
      if (alreadyCancelled || cancelled) return
      if (!result.ok) {
        setErrorText(explainOperatorError(result.status, result.errorCode))
        return
      }
      setSelectedSessionId(sessionId)
      const nextMessages = readOperatorMessages(result.data)
      setMessages(nextMessages.length > 0 ? nextMessages : [openingMessage()])
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages, isSending])

  const latestMeta = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant' && message.meta)?.meta ?? null,
    [messages],
  )

  async function refreshSessions(preferredSessionId = selectedSessionId) {
    const result = await requestOperatorApi<unknown>('/sessions')
    if (!result.ok) {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      return
    }
    const nextSessions = readOperatorSessions(result.data)
    setSessions(nextSessions)
    const targetId = nextSessions.some((session) => session.id === preferredSessionId)
      ? preferredSessionId
      : nextSessions[0]?.id ?? ''
    if (targetId && targetId !== selectedSessionId) await selectSession(targetId)
  }

  async function selectSession(sessionId: string) {
    setIsSidebarOpen(false)
    setSelectedSessionId(sessionId)
    setIsLoading(true)
    const result = await requestOperatorApi<unknown>(`/sessions/${encodeURIComponent(sessionId)}/messages`)
    setIsLoading(false)
    if (!result.ok) {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      return
    }
    const nextMessages = readOperatorMessages(result.data)
    setMessages(nextMessages.length > 0 ? nextMessages : [openingMessage()])
    setErrorText('')
  }

  async function createSession() {
    const result = await requestOperatorApi<unknown>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: '新的站务会话' }),
    })
    if (!result.ok || !isRecord(result.data) || !isRecord(result.data.session) || typeof result.data.session.id !== 'string') {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      return
    }
    const sessionId = result.data.session.id
    setSelectedSessionId(sessionId)
    setMessages([openingMessage()])
    setIsSidebarOpen(false)
    await refreshSessions(sessionId)
  }

  async function archiveSession() {
    if (!selectedSessionId) return
    const result = await requestOperatorApi<unknown>(`/sessions/${encodeURIComponent(selectedSessionId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
    })
    if (!result.ok) {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      return
    }
    setSelectedSessionId('')
    setMessages([openingMessage()])
    await refreshSessions('')
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault()
    const question = input.trim()
    if (!question || isSending || !operator) return

    const userMessage: AssistantMessage = {
      id: `operator-user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    }
    setMessages((current) => [...current.filter((message) => message.id !== 'operator-opening'), userMessage])
    setInput('')
    setIsSending(true)
    setErrorText('')

    const result = await requestOperatorApi<unknown>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message: question, ...(selectedSessionId ? { sessionId: selectedSessionId } : {}) }),
    })
    setIsSending(false)
    const response = result.data ? readOperatorChatResponse(result.data) : null
    if (!result.ok || !response) {
      setErrorText(explainOperatorError(result.status, result.errorCode))
      setMessages((current) => [
        ...current,
        {
          id: `operator-error-${Date.now()}`,
          role: 'assistant',
          content: '这次站务运行没有完成，未执行发布、部署或其他外部写操作。',
          timestamp: new Date().toISOString(),
        },
      ])
      return
    }

    setSelectedSessionId(response.sessionId)
    setMessages((current) => [
      ...current,
      {
        id: response.messageId,
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        meta: response.meta,
        timestamp: new Date().toISOString(),
      },
    ])
    await refreshSessions(response.sessionId)
  }

  return (
    <main className="operator-page">
      <header className="operator-topbar">
        <div className="operator-topbar__identity">
          <button
            type="button"
            className="operator-icon-button operator-mobile-only"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="打开站务会话"
          >
            <Menu size={19} aria-hidden />
          </button>
          <span className="operator-brand-mark" aria-hidden>
            <Bot size={19} />
          </span>
          <div>
            <p>泊岸站务</p>
            <span>BIAU OPERATOR</span>
          </div>
        </div>
        <div className="operator-topbar__actions">
          <span className={`operator-connection ${errorText ? 'is-error' : 'is-ready'}`}>
            {errorText ? <CircleAlert size={15} aria-hidden /> : <ShieldCheck size={15} aria-hidden />}
            {statusText}
          </span>
          <Link className="operator-icon-button" to="/operator/settings" aria-label="打开站务设置">
            <Settings size={18} aria-hidden />
          </Link>
        </div>
      </header>

      {errorText && (
        <section className="operator-alert" role="status">
          <CircleAlert size={18} aria-hidden />
          <p>{errorText}</p>
          <button type="button" onClick={() => window.location.reload()}>
            重新连接
          </button>
        </section>
      )}

      <div className="operator-workspace">
        <div
          className={`operator-drawer-backdrop ${isSidebarOpen ? 'is-open' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
        <aside className={`operator-sidebar ${isSidebarOpen ? 'is-open' : ''}`} aria-label="站务会话">
          <div className="operator-sidebar__header">
            <div>
              <strong>工作会话</strong>
              <span>{sessions.length} 条</span>
            </div>
            <button type="button" className="operator-icon-button operator-mobile-only" onClick={() => setIsSidebarOpen(false)} aria-label="关闭站务会话">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="operator-sidebar__commands">
            <button type="button" className="operator-command-button" onClick={() => void createSession()} disabled={!operator}>
              <Plus size={17} aria-hidden />
              新建会话
            </button>
            <button type="button" className="operator-icon-button" onClick={() => void refreshSessions()} aria-label="刷新会话">
              <RefreshCw size={17} aria-hidden />
            </button>
          </div>
          <div className="operator-session-list">
            {sessions.map((session) => (
              <button
                type="button"
                key={session.id}
                className={`operator-session ${session.id === selectedSessionId ? 'is-active' : ''}`}
                onClick={() => void selectSession(session.id)}
              >
                <span>{session.title}</span>
                <small>{session.preview}</small>
                <time>{formatDate(session.updatedAt)}</time>
              </button>
            ))}
            {!isLoading && sessions.length === 0 && <p className="operator-empty-copy">还没有持久会话。</p>}
          </div>
          <div className="operator-sidebar__footer">
            <div>
              <span>{operator?.name ?? '等待身份'}</span>
              <small>{operator?.modelChannel?.configured ? operator.modelChannel.model : '模型通道待配置'}</small>
            </div>
            <Link to="/operator/settings" aria-label="站务设置">
              <ChevronRight size={18} aria-hidden />
            </Link>
          </div>
        </aside>

        <section className="operator-conversation" aria-label="站务对话">
          <div className="operator-conversation__header">
            <div>
              <p>当前任务</p>
              <h1>{sessions.find((session) => session.id === selectedSessionId)?.title ?? '新的站务任务'}</h1>
            </div>
            <button type="button" className="operator-icon-button" onClick={() => void archiveSession()} disabled={!selectedSessionId} aria-label="归档当前会话">
              <Archive size={18} aria-hidden />
            </button>
          </div>

          <div className="operator-messages" aria-live="polite">
            {messages.map((message) => (
              <OperatorMessage key={message.id} message={message} />
            ))}
            {isSending && (
              <article className="operator-message is-assistant is-running">
                <span className="operator-avatar"><Sparkles size={16} aria-hidden /></span>
                <div>
                  <p>正在规划并执行受限站务工具…</p>
                </div>
              </article>
            )}
            <div ref={messageEndRef} />
          </div>

          {!selectedSessionId && messages.length <= 1 && (
            <div className="operator-suggestions" aria-label="站务任务建议">
              {operatorSuggestions.map((suggestion) => (
                <button type="button" key={suggestion.id} onClick={() => setInput(suggestion.prompt)}>
                  <span>{suggestion.label}</span>
                  <ChevronRight size={16} aria-hidden />
                </button>
              ))}
            </div>
          )}

          <form className="operator-composer" onSubmit={(event) => void sendMessage(event)}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              placeholder="输入内容审查、项目维护、状态检查或 Studio 草稿任务"
              rows={3}
              disabled={!operator || isSending}
              aria-label="站务任务"
            />
            <div>
              <span>{input.length}/{MAX_MESSAGE_LENGTH}</span>
              <button type="submit" disabled={!input.trim() || !operator || isSending} aria-label="发送站务任务">
                <Send size={18} aria-hidden />
              </button>
            </div>
          </form>
        </section>

        <OperatorInspector meta={latestMeta} />
      </div>
    </main>
  )
}

function OperatorMessage({ message }: { message: AssistantMessage }) {
  return (
    <article className={`operator-message is-${message.role}`}>
      <span className="operator-avatar" aria-hidden>
        {message.role === 'assistant' ? <Bot size={16} /> : 'Z'}
      </span>
      <div>
        <header>
          <strong>{message.role === 'assistant' ? '泊岸站务' : '站长'}</strong>
          <time>{formatDate(message.timestamp)}</time>
        </header>
        <p>{message.content}</p>
        {message.citations && message.citations.length > 0 && (
          <div className="operator-citations">
            {message.citations.slice(0, 5).map((citation) => (
              <Link key={citation.id} to={citation.href}>
                <Database size={14} aria-hidden />
                <span>{citation.title}</span>
              </Link>
            ))}
          </div>
        )}
        {message.meta?.tools?.some((tool) => tool.artifacts?.length) && (
          <div className="operator-artifacts">
            {message.meta.tools.flatMap((tool) => tool.artifacts ?? []).map((artifact) => (
              <Link key={artifact.id} to={artifact.href}>
                <FileClock size={15} aria-hidden />
                <span>{artifact.title}</span>
                <small>等待审核</small>
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function OperatorInspector({ meta }: { meta: AssistantAnswerMetaSummary | null }) {
  const tools = meta?.tools ?? []
  return (
    <aside className="operator-inspector" aria-label="站务运行检查器">
      <div className="operator-inspector__header">
        <div>
          <p>运行检查器</p>
          <h2>{meta?.agent ? formatAgentStatus(meta.agent.status) : '等待任务'}</h2>
        </div>
        {meta?.guardrails?.status === 'passed' ? <CheckCircle2 size={20} aria-label="安全检查通过" /> : <ShieldCheck size={20} aria-hidden />}
      </div>

      <dl className="operator-runtime-grid">
        <div><dt>Planner</dt><dd>{meta?.agent?.planner ?? '—'}</dd></div>
        <div><dt>Grounding</dt><dd>{meta?.grounding ?? '—'}</dd></div>
        <div><dt>Evidence</dt><dd>{meta?.retrieval?.sufficiency ?? '—'}</dd></div>
        <div><dt>Duration</dt><dd>{meta?.agent ? `${meta.agent.durationMs} ms` : '—'}</dd></div>
      </dl>

      <section className="operator-inspector__section">
        <header><span>工具轨迹</span><small>{tools.length}</small></header>
        <div className="operator-tool-list">
          {tools.map((tool) => <ToolTrace key={`${tool.id}-${tool.durationMs}`} tool={tool} />)}
          {tools.length === 0 && <p className="operator-empty-copy">发送任务后显示规划与工具结果。</p>}
        </div>
      </section>

      <section className="operator-inspector__section">
        <header><span>权限边界</span></header>
        <ul className="operator-boundary-list">
          <li><CheckCircle2 size={14} aria-hidden />读取站点与低敏状态</li>
          <li><CheckCircle2 size={14} aria-hidden />创建待审核 Studio 草稿</li>
          <li className="is-blocked"><X size={14} aria-hidden />公开发布与部署</li>
          <li className="is-blocked"><X size={14} aria-hidden />Git 与云平台写入</li>
        </ul>
      </section>
    </aside>
  )
}

function ToolTrace({ tool }: { tool: AssistantAgentToolTrace }) {
  return (
    <article className={`operator-tool is-${tool.status}`}>
      <div>
        <span>{tool.label}</span>
        <small>{tool.permission}</small>
      </div>
      <p>{tool.summary}</p>
      <time>{tool.durationMs} ms</time>
    </article>
  )
}

function formatAgentStatus(status: string) {
  if (status === 'completed') return '执行完成'
  if (status === 'guarded') return '安全拦截'
  if (status === 'degraded') return '降级完成'
  if (status === 'failed') return '执行失败'
  return status
}

function formatDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return '刚刚'
  return new Date(parsed).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
