import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  Globe2,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  publicAssistantSuggestions,
  buildPublicKnowledgeFallbackAnswer,
  searchPublicKnowledge,
  type AssistantKnowledgeItem,
} from '../data/assistant'
import { PUBLIC_ASSISTANT_API_BASE, SAME_ORIGIN_ASSISTANT_API_BASE } from '../utils/assistantApi'
import { trackAnalyticsEvent } from '../utils/analytics'
import {
  announceMobileSurfaceOpen,
  isMobileSurfaceViewport,
  MOBILE_SURFACE_LAYOUT_EVENT,
  MOBILE_SURFACE_OPEN_EVENT,
  type MobileSurfaceOpenDetail,
} from '../utils/mobileSurface'
import {
  requestPublicAssistant,
  submitPublicAssistantFeedback,
  type PublicAssistantAnswer,
  type PublicAssistantCitation,
  type PublicAssistantClaim,
  type PublicAssistantHistoryTurn,
  type PublicAssistantMode,
  type PublicAssistantStatus,
} from '../utils/publicAssistantApi'

interface WidgetMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: PublicAssistantCitation[]
  claims?: PublicAssistantClaim[]
  status?: PublicAssistantStatus
  meta?: PublicAssistantAnswer['meta']
  suggestions?: string[]
  sessionId?: string
  turnId?: string
  prompt?: string
  requestMode?: PublicAssistantMode
  feedback?: 'up' | 'down'
  feedbackPending?: boolean
  feedbackError?: boolean
}

type AssistantServiceState = 'ready' | 'online' | 'degraded' | 'error'

const CONFIGURED_API_BASE = PUBLIC_ASSISTANT_API_BASE
const MAX_MESSAGE_LENGTH = 500
const MAX_FALLBACK_ANSWER_LENGTH = 520
const SESSION_STORAGE_KEY = 'biau-public-assistant-session-v1'

const MODE_OPTIONS: Array<{ value: PublicAssistantMode; label: string }> = [
  { value: 'auto', label: '自动' },
  { value: 'site', label: '本站' },
  { value: 'web', label: '全网' },
]

const STATUS_LABELS: Record<PublicAssistantStatus, string> = {
  answered: '已回答',
  partial: '部分证据',
  uncertain: '证据不足',
  degraded: '降级回答',
  blocked: '已安全拦截',
}

const ROUTE_LABELS = {
  direct: '直接回答',
  site: '本站检索',
  web: '网页研究',
  combined: '综合研究',
} as const

function createAnonymousSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `public-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function getAnonymousSessionId() {
  const fallback = createAnonymousSessionId()
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)?.trim()
    if (stored && /^[a-zA-Z0-9_-]{12,80}$/u.test(stored)) return stored
    window.localStorage.setItem(SESSION_STORAGE_KEY, fallback)
  } catch {
    // Storage may be disabled; the in-memory identifier still keeps this visit coherent.
  }
  return fallback
}

function persistAnonymousSessionId(sessionId: string) {
  if (typeof window === 'undefined' || !/^[a-zA-Z0-9_-]{12,80}$/u.test(sessionId)) return
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  } catch {
    // A storage failure must not block anonymous chat.
  }
}

function getAssistantApiBase(preferredApiBase?: string | null) {
  return preferredApiBase || CONFIGURED_API_BASE || SAME_ORIGIN_ASSISTANT_API_BASE
}

function toPublicCitation(item: AssistantKnowledgeItem): PublicAssistantCitation {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    href: item.href,
    source: 'site',
    section: '站内公开资料',
    excerpt: item.summary,
    publishedAt: null,
    evidenceStatus: 'partial',
  }
}

function buildLocalAnswer(question: string, mode: PublicAssistantMode, reason: string): PublicAssistantAnswer {
  const localCitations = searchPublicKnowledge(question)
  const citations = localCitations.map(toPublicCitation)
  const notice =
    mode === 'web'
      ? '全网研究服务暂时不可用。下面仅提供站内公开资料的降级结果。\n\n'
      : '研究服务暂时不可用。下面提供站内公开资料的降级结果。\n\n'
  return {
    answer: `${notice}${buildPublicKnowledgeFallbackAnswer(question, localCitations, {
      reason: 'request_error',
      maxLength: MAX_FALLBACK_ANSWER_LENGTH,
    })}`,
    status: 'degraded',
    claims: [],
    citations,
    suggestions: [],
    meta: {
      mode: 'fallback',
      reason,
      citationCount: citations.length,
    },
  }
}

async function requestPublicAnswer(input: {
  question: string
  mode: PublicAssistantMode
  sessionId: string
  history: PublicAssistantHistoryTurn[]
  preferredApiBase: string | null
  signal: AbortSignal
}) {
  const apiBase = getAssistantApiBase(input.preferredApiBase)
  const answer = await requestPublicAssistant({
    apiBase,
    message: input.question,
    mode: input.mode,
    sessionId: input.sessionId,
    history: input.history,
    pageContext: {
      path: window.location.pathname,
      title: document.title,
      description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '',
    },
    signal: input.signal,
  })
  return { answer, apiBase }
}

function getServiceStatus(state: AssistantServiceState) {
  if (state === 'online') return { className: 'is-model', label: '研究助手已响应' }
  if (state === 'degraded') return { className: 'is-fallback', label: '正在使用站内兜底' }
  if (state === 'error') return { className: 'is-error', label: '研究服务暂不可用' }
  return { className: 'is-ready', label: '可检索本站与公开网页' }
}

function formatAnswerMeta(message: WidgetMessage) {
  if (!message.status || !message.meta) return ''
  const labels = [STATUS_LABELS[message.status]]
  const research = message.meta.research
  if (research) {
    labels.push(ROUTE_LABELS[research.route])
    if (research.evidenceCount > 0) labels.push(`${research.evidenceCount} 条证据`)
    if (research.durationMs > 0) labels.push(`${(research.durationMs / 1_000).toFixed(1)} 秒`)
  } else if (message.meta.citationCount > 0) {
    labels.push(`${message.meta.citationCount} 条站内来源`)
  }
  return labels.join(' · ')
}

function getLoadingLabel(mode: PublicAssistantMode) {
  if (mode === 'site') return '正在检索本站公开资料…'
  if (mode === 'web') return '正在搜索并核验公开网页…'
  return '正在判断问题并组织研究…'
}

function buildHistory(messages: WidgetMessage[]): PublicAssistantHistoryTurn[] {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 800) }))
    .slice(-6)
}

export function PublicAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<PublicAssistantMode>('auto')
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [apiBase, setApiBase] = useState<string | null>(CONFIGURED_API_BASE || SAME_ORIGIN_ASSISTANT_API_BASE)
  const [sessionId, setSessionId] = useState(getAnonymousSessionId)
  const [serviceState, setServiceState] = useState<AssistantServiceState>('ready')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const collisionOffsetRef = useRef(0)
  const messageSeq = useRef(0)
  const activeRequestRef = useRef<AbortController | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const serviceStatus = getServiceStatus(serviceState)

  const createMessageId = (role: WidgetMessage['role']) => {
    messageSeq.current += 1
    return `public-${role}-${messageSeq.current}`
  }

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isOpen, isLoading])

  useEffect(() => () => {
    activeRequestRef.current?.abort()
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
  }, [])

  useEffect(() => {
    const handleSurfaceOpen = (event: Event) => {
      const detail = (event as CustomEvent<MobileSurfaceOpenDetail>).detail
      if (isMobileSurfaceViewport() && detail?.surface === 'detail-reading-guide') setIsOpen(false)
    }
    window.addEventListener(MOBILE_SURFACE_OPEN_EVENT, handleSurfaceOpen)
    return () => window.removeEventListener(MOBILE_SURFACE_OPEN_EVENT, handleSurfaceOpen)
  }, [])

  useEffect(() => {
    let frame = 0

    const applyOffset = (nextOffset: number) => {
      const normalizedOffset = Math.max(0, Math.ceil(nextOffset))
      collisionOffsetRef.current = normalizedOffset
      rootRef.current?.style.setProperty('--public-assistant-collision-offset', `${normalizedOffset}px`)
      if (rootRef.current) rootRef.current.dataset.collisionOffset = String(normalizedOffset)
    }

    const measureCollision = () => {
      frame = 0
      const root = rootRef.current
      const trigger = root?.querySelector<HTMLElement>('.public-assistant__trigger')
      const guide = document.querySelector<HTMLElement>('.detail-reading-guide__toggle')
      const isMobileDetail = window.matchMedia('(max-width: 720px)').matches && Boolean(document.querySelector('.app.page-detail'))
      if (!root || !trigger || !guide || !isMobileDetail || isOpen) {
        applyOffset(0)
        return
      }

      const triggerRect = trigger.getBoundingClientRect()
      const guideRect = guide.getBoundingClientRect()
      const transform = window.getComputedStyle(root).transform
      const translateY = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
      const baseTop = triggerRect.top - translateY
      const baseBottom = triggerRect.bottom - translateY
      const overlapsHorizontally = triggerRect.left < guideRect.right && triggerRect.right > guideRect.left
      const overlapsVertically = baseTop < guideRect.bottom && baseBottom > guideRect.top
      applyOffset(overlapsHorizontally && overlapsVertically ? baseBottom - guideRect.top + 8 : 0)
    }

    const scheduleMeasure = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(measureCollision)
    }

    scheduleMeasure()
    window.addEventListener('scroll', scheduleMeasure, { passive: true })
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('load', scheduleMeasure)
    window.addEventListener(MOBILE_SURFACE_LAYOUT_EVENT, scheduleMeasure)
    return () => {
      window.removeEventListener('scroll', scheduleMeasure)
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('load', scheduleMeasure)
      window.removeEventListener(MOBILE_SURFACE_LAYOUT_EVENT, scheduleMeasure)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [isOpen])

  useEffect(() => {
    const footer = document.querySelector('.site-footer')
    if (!footer || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0.08 })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  const toggleWidget = () => {
    if (!isOpen) {
      announceMobileSurfaceOpen('public-assistant')
      rootRef.current?.style.setProperty('--public-assistant-collision-offset', '0px')
      collisionOffsetRef.current = 0
      trackAnalyticsEvent('public_assistant_open', { source: 'floating-widget' })
    }
    setIsOpen(!isOpen)
  }

  const submitQuestion = async (question: string, requestedMode: PublicAssistantMode = mode) => {
    const trimmed = question.replace(/\s+/gu, ' ').trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!trimmed || isLoading) return

    trackAnalyticsEvent('public_assistant_question', {
      source: 'floating-widget',
      mode: requestedMode,
      questionLength: trimmed.length,
    })

    const history = buildHistory(messages)
    const userMessage: WidgetMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: trimmed,
      requestMode: requestedMode,
    }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setIsLoading(true)
    const controller = new AbortController()
    activeRequestRef.current = controller

    let result: PublicAssistantAnswer
    let resolvedApiBase = apiBase
    try {
      const remote = await requestPublicAnswer({
        question: trimmed,
        mode: requestedMode,
        sessionId,
        history,
        preferredApiBase: apiBase,
        signal: controller.signal,
      })
      result = remote.answer
      resolvedApiBase = remote.apiBase
      setApiBase(remote.apiBase)
      setServiceState(result.status === 'degraded' ? 'degraded' : 'online')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      result = buildLocalAnswer(trimmed, requestedMode, error instanceof Error ? error.message : 'request_error')
      setServiceState(getAssistantApiBase(apiBase) ? 'error' : 'degraded')
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null
        setIsLoading(false)
      }
    }

    const resolvedSessionId = result.sessionId ?? sessionId
    if (result.sessionId && result.sessionId !== sessionId) {
      setSessionId(result.sessionId)
      persistAnonymousSessionId(result.sessionId)
    }
    setMessages((current) => [
      ...current,
      {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: result.answer,
        citations: result.citations,
        claims: result.claims,
        status: result.status,
        meta: result.meta,
        suggestions: result.suggestions,
        sessionId: result.turnId ? resolvedSessionId : undefined,
        turnId: result.turnId,
        prompt: trimmed,
        requestMode: requestedMode,
      },
    ])
    if (resolvedApiBase) setApiBase(resolvedApiBase)
  }

  const copyAnswer = async (message: WidgetMessage) => {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedMessageId(message.id)
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedMessageId(null), 1_800)
    } catch {
      setCopiedMessageId(null)
    }
  }

  const sendFeedback = async (message: WidgetMessage, rating: 'up' | 'down') => {
    if (!apiBase || !message.sessionId || !message.turnId || message.feedbackPending) return
    setMessages((current) => current.map((item) => item.id === message.id
      ? { ...item, feedbackPending: true, feedbackError: false }
      : item))
    try {
      await submitPublicAssistantFeedback({
        apiBase,
        sessionId: message.sessionId,
        turnId: message.turnId,
        rating,
        reason: rating === 'up' ? 'helpful' : 'other',
      })
      setMessages((current) => current.map((item) => item.id === message.id
        ? { ...item, feedback: rating, feedbackPending: false, feedbackError: false }
        : item))
    } catch {
      setMessages((current) => current.map((item) => item.id === message.id
        ? { ...item, feedbackPending: false, feedbackError: true }
        : item))
    }
  }

  const latestSuggestions = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.suggestions?.length)?.suggestions

  return (
    <div ref={rootRef} className={`public-assistant ${isOpen ? 'is-open' : ''} ${footerVisible ? 'is-footer-visible' : ''}`}>
      <button
        type="button"
        className="public-assistant__trigger"
        aria-expanded={isOpen}
        aria-controls="public-assistant-panel"
        onClick={toggleWidget}
      >
        <span className="public-assistant__trigger-mark" aria-hidden="true">B</span>
        <span className="public-assistant__trigger-text">泊岸研究助手</span>
      </button>

      {isOpen && (
        <section className="public-assistant__panel" id="public-assistant-panel" aria-label="泊岸研究助手">
          <header className="public-assistant__header">
            <div>
              <p className="public-assistant__eyebrow">PUBLIC RESEARCH</p>
              <h2>泊岸研究助手</h2>
              <span className={`public-assistant__status ${serviceStatus.className}`}>{serviceStatus.label}</span>
            </div>
            <button type="button" className="public-assistant__close" onClick={() => setIsOpen(false)} aria-label="关闭研究助手">
              <X size={18} aria-hidden />
            </button>
          </header>

          <p className="public-assistant__hint">问本站内容，也可以研究公开网页。</p>

          <div className="public-assistant__modes" aria-label="检索范围">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={mode === option.value ? 'is-active' : ''}
                aria-pressed={mode === option.value}
                disabled={isLoading}
                onClick={() => setMode(option.value)}
              >
                {option.value === 'web' && <Globe2 size={14} aria-hidden />}
                {option.label}
              </button>
            ))}
          </div>

          <div className="public-assistant__messages" ref={scrollRef} aria-live="polite">
            {messages.length === 0 && !isLoading && (
              <div className="public-assistant__empty">
                <strong>从一个具体问题开始</strong>
                <span>助手会选择直接回答、本站检索或公开网页研究。</span>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`public-assistant__message is-${message.role}`}>
                <p>{message.content}</p>
                {message.role === 'assistant' && (
                  <>
                    {message.meta && <small className="public-assistant__meta">{formatAnswerMeta(message)}</small>}

                    {message.claims && message.claims.length > 0 && (
                      <details className="public-assistant__claims">
                        <summary>查看证据对应（{message.claims.length}）</summary>
                        <ol>
                          {message.claims.map((claim) => (
                            <li key={claim.id}>
                              <span>{claim.text}</span>
                              {claim.citationIds.length > 0 && <small>{claim.citationIds.join(' · ')}</small>}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}

                    {message.citations && message.citations.length > 0 && (
                      <div className="public-assistant__citations" aria-label="回答来源">
                        {message.citations.map((citation, index) => {
                          const content = (
                            <>
                              <span className="public-assistant__citation-kicker">
                                {citation.source === 'web' ? '外部网页' : '本站资料'} · {citation.id || `来源 ${index + 1}`}
                              </span>
                              <strong>{citation.title}</strong>
                              <span>{citation.excerpt || citation.summary}</span>
                              {citation.source === 'web' && <ExternalLink size={13} aria-hidden />}
                            </>
                          )
                          return citation.source === 'web' ? (
                            <a
                              key={citation.id}
                              href={citation.href}
                              className="public-assistant__citation"
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`在新窗口打开来源：${citation.title}`}
                            >
                              {content}
                            </a>
                          ) : (
                            <Link
                              key={citation.id}
                              to={citation.href}
                              className="public-assistant__citation"
                              aria-label={`查看站内来源：${citation.title}`}
                            >
                              {content}
                            </Link>
                          )
                        })}
                      </div>
                    )}

                    <div className="public-assistant__message-actions" aria-label="回答操作">
                      <button
                        type="button"
                        onClick={() => void copyAnswer(message)}
                        aria-label={copiedMessageId === message.id ? '已复制回答' : '复制回答'}
                        title={copiedMessageId === message.id ? '已复制' : '复制回答'}
                      >
                        {copiedMessageId === message.id ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                      </button>
                      {message.prompt && message.requestMode && (
                        <button
                          type="button"
                          onClick={() => void submitQuestion(message.prompt ?? '', message.requestMode)}
                          disabled={isLoading}
                          aria-label="重新生成回答"
                          title="重新生成"
                        >
                          <RefreshCw size={15} aria-hidden />
                        </button>
                      )}
                      {message.sessionId && message.turnId && (
                        <>
                          <button
                            type="button"
                            className={message.feedback === 'up' ? 'is-active' : ''}
                            onClick={() => void sendFeedback(message, 'up')}
                            disabled={message.feedbackPending}
                            aria-label="这个回答有帮助"
                            aria-pressed={message.feedback === 'up'}
                            title="有帮助"
                          >
                            <ThumbsUp size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={message.feedback === 'down' ? 'is-active' : ''}
                            onClick={() => void sendFeedback(message, 'down')}
                            disabled={message.feedbackPending}
                            aria-label="这个回答需要改进"
                            aria-pressed={message.feedback === 'down'}
                            title="需要改进"
                          >
                            <ThumbsDown size={15} aria-hidden />
                          </button>
                        </>
                      )}
                      {message.feedbackError && <span role="status">反馈未提交</span>}
                    </div>
                  </>
                )}
              </article>
            ))}

            {isLoading && <div className="public-assistant__loading">{getLoadingLabel(mode)}</div>}
          </div>

          <div className="public-assistant__suggestions" aria-label="建议提问">
            {(latestSuggestions?.map((suggestion) => ({ id: suggestion, label: suggestion, prompt: suggestion }))
              ?? publicAssistantSuggestions).slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="public-assistant__suggestion"
                disabled={isLoading}
                onClick={() => void submitQuestion(suggestion.prompt)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>

          <form
            className="public-assistant__composer"
            onSubmit={(event) => {
              event.preventDefault()
              void submitQuestion(input)
            }}
          >
            <label className="sr-only" htmlFor="public-assistant-input">向研究助手提问</label>
            <textarea
              id="public-assistant-input"
              rows={2}
              maxLength={MAX_MESSAGE_LENGTH}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  void submitQuestion(input)
                }
              }}
              placeholder="输入一个需要回答或研究的问题"
            />
            <button type="submit" disabled={isLoading || input.trim().length === 0} aria-label="发送问题">
              <Send size={16} aria-hidden />
              <span>发送</span>
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
