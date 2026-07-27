import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  History,
  LoaderCircle,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  RefreshCw,
  Send,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
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
  deletePublicAssistantSession,
  requestPublicAssistant,
  requestPublicAssistantHealth,
  requestPublicAssistantSession,
  requestPublicAssistantSessions,
  requestPublicAssistantStream,
  PublicAssistantTransportError,
  submitPublicAssistantFeedback,
  type PublicAssistantAnswer,
  type PublicAssistantCitation,
  type PublicAssistantClaim,
  type PublicAssistantFeedbackReason,
  type PublicAssistantHistoryTurn,
  type PublicAssistantMode,
  type PublicAssistantProgressStage,
  type PublicAssistantSessionSummary,
  type PublicAssistantStatus,
} from '../utils/publicAssistantApi'
import { PublicAssistantMessageContent } from './PublicAssistantMessageContent'
import {
  createPublicAssistantSessionId,
  forgetPublicAssistantSession,
  persistPublicAssistantSessionRegistry,
  readPublicAssistantSessionRegistry,
  rememberPublicAssistantSession,
  type PublicAssistantSessionRegistry,
} from '../utils/publicAssistantSessionRegistry'

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

interface AssistantIssue {
  code: string
  scope: 'chat' | 'health' | 'history'
  prompt?: string
  mode?: PublicAssistantMode
  retryAfterSeconds?: number | null
}

interface ActiveChatRequest {
  controller: AbortController
  prompt: string
  mode: PublicAssistantMode
  sessionId: string
}

type NegativeFeedbackReason = Extract<
  PublicAssistantFeedbackReason,
  'incorrect' | 'unclear' | 'missing-sources' | 'outdated' | 'other'
>

const CONFIGURED_API_BASE = PUBLIC_ASSISTANT_API_BASE
const MAX_MESSAGE_LENGTH = 500
const MAX_FALLBACK_ANSWER_LENGTH = 520

const MODE_OPTIONS: Array<{ value: PublicAssistantMode; label: string }> = [
  { value: 'auto', label: '自动' },
  { value: 'site', label: '本站' },
  { value: 'web', label: '全网' },
]

const NEGATIVE_FEEDBACK_REASONS: Array<{ value: NegativeFeedbackReason; label: string }> = [
  { value: 'incorrect', label: '内容不准确' },
  { value: 'unclear', label: '表达不清楚' },
  { value: 'missing-sources', label: '缺少来源' },
  { value: 'outdated', label: '信息已过时' },
  { value: 'other', label: '其他问题' },
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
  onProgress: (stage: PublicAssistantProgressStage) => void
}) {
  const apiBase = getAssistantApiBase(input.preferredApiBase)
  const request = {
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
  }
  let answer: PublicAssistantAnswer
  try {
    answer = await requestPublicAssistantStream({ ...request, onProgress: input.onProgress })
  } catch (error) {
    if (!(error instanceof PublicAssistantTransportError) || !error.canFallbackToJson) throw error
    answer = await requestPublicAssistant(request)
  }
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

function getLoadingLabel(mode: PublicAssistantMode, stage: PublicAssistantProgressStage | null) {
  if (stage === 'planning') return '正在判断问题需要哪些公开资料…'
  if (stage === 'researching') return mode === 'site' ? '正在检索本站公开资料…' : '正在搜索并读取公开来源…'
  if (stage === 'evaluating') return '正在筛选可引用的证据…'
  if (stage === 'refining') return '证据还不够，正在调整检索…'
  if (stage === 'answering') return '正在基于证据组织回答…'
  if (stage === 'verifying') return '正在核对结论与引用…'
  if (stage === 'saving') return '正在保存本次匿名记录…'
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

function toAssistantIssue(error: unknown, scope: AssistantIssue['scope'], prompt?: string, mode?: PublicAssistantMode): AssistantIssue {
  const transport = error instanceof PublicAssistantTransportError ? error : null
  return {
    code: transport?.code ?? 'public-chat-request-failed',
    scope,
    prompt,
    mode,
    retryAfterSeconds: transport?.retryAfterSeconds,
  }
}

function getAssistantIssueCopy(issue: AssistantIssue) {
  if (issue.code === 'public-assistant-rate-limited') {
    const wait = issue.retryAfterSeconds && issue.retryAfterSeconds > 0 ? `约 ${issue.retryAfterSeconds} 秒后` : '稍后'
    return { title: '请求较多', detail: `请${wait}重试。` }
  }
  if (issue.code.includes('timeout')) return { title: '本次研究超时', detail: '服务没有在限定时间内完成，可以直接重试。' }
  if (issue.code === 'public-assistant-offline') return { title: '设备当前离线', detail: '网络恢复后可以继续本次问题。' }
  if (issue.code.includes('unreachable') || issue.code === 'public-assistant-endpoint-unreachable') {
    return { title: '暂时无法连接研究服务', detail: '可能正在冷启动或网络不可达，可以稍后重试。' }
  }
  if (issue.code === 'session-not-found') return { title: '会话已过期', detail: '这条匿名历史已被清理，可以新建会话继续。' }
  if (issue.code === 'public-assistant-request-cancelled') return { title: '已停止生成', detail: '问题仍保留在当前会话中，可以重新发起。' }
  if (issue.code === 'database-not-configured' || issue.code === 'public-assistant-service-unavailable') {
    return { title: '历史服务暂不可用', detail: '当前仍可提问，但暂时无法读取或保存历史。' }
  }
  if (issue.code.includes('invalid-response')) return { title: '响应格式异常', detail: '服务返回了无法安全展示的内容，请重试。' }
  return { title: '本次请求未完成', detail: '已保留站内兜底结果，可以重新发起研究。' }
}

function formatSessionDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

export function PublicAssistantWidget() {
  const [sessionRegistry, setSessionRegistry] = useState<PublicAssistantSessionRegistry>(readPublicAssistantSessionRegistry)
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [historyState, setHistoryState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [historySessions, setHistorySessions] = useState<PublicAssistantSessionSummary[]>([])
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null)
  const [progressStage, setProgressStage] = useState<PublicAssistantProgressStage | null>(null)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<PublicAssistantMode>('auto')
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [apiBase, setApiBase] = useState<string | null>(CONFIGURED_API_BASE || SAME_ORIGIN_ASSISTANT_API_BASE)
  const [serviceState, setServiceState] = useState<AssistantServiceState>('ready')
  const [issue, setIssue] = useState<AssistantIssue | null>(null)
  const [hasNewContent, setHasNewContent] = useState(false)
  const [healthRetryNonce, setHealthRetryNonce] = useState(0)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [feedbackMenuMessageId, setFeedbackMenuMessageId] = useState<string | null>(null)
  const sessionId = sessionRegistry.currentSessionId
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const historyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const historyPanelRef = useRef<HTMLElement | null>(null)
  const historyCloseRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const collisionOffsetRef = useRef(0)
  const messageSeq = useRef(0)
  const sessionIdRef = useRef(sessionId)
  const shouldFollowOutputRef = useRef(true)
  const activeRequestRef = useRef<ActiveChatRequest | null>(null)
  const historyRequestRef = useRef<AbortController | null>(null)
  const healthRequestRef = useRef<AbortController | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const feedbackTriggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const serviceStatus = getServiceStatus(serviceState)
  const issueCopy = issue ? getAssistantIssueCopy(issue) : null

  const createMessageId = (role: WidgetMessage['role']) => {
    messageSeq.current += 1
    return `public-${role}-${messageSeq.current}`
  }

  const commitSessionRegistry = (next: PublicAssistantSessionRegistry) => {
    sessionIdRef.current = next.currentSessionId
    persistPublicAssistantSessionRegistry(next)
    setSessionRegistry(next)
  }

  const scrollToLatest = () => {
    const container = scrollRef.current
    if (!container) return
    shouldFollowOutputRef.current = true
    container.scrollTop = container.scrollHeight
    setHasNewContent(false)
  }

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const frame = window.requestAnimationFrame(() => {
      if (!shouldFollowOutputRef.current) {
        if (messages.length > 0 || isLoading) setHasNewContent(true)
        return
      }
      container.scrollTop = container.scrollHeight
      setHasNewContent(false)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages, isOpen, isLoading])

  useEffect(() => () => {
    activeRequestRef.current?.controller.abort()
    historyRequestRef.current?.abort()
    healthRequestRef.current?.abort()
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const media = window.matchMedia('(max-width: 768px)')
    const syncFullscreen = () => {
      if (media.matches) setIsFullscreen(true)
    }
    syncFullscreen()
    media.addEventListener('change', syncFullscreen)
    return () => media.removeEventListener('change', syncFullscreen)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (feedbackMenuMessageId) {
        const messageId = feedbackMenuMessageId
        setFeedbackMenuMessageId(null)
        window.requestAnimationFrame(() => feedbackTriggerRefs.current.get(messageId)?.focus({ preventScroll: true }))
        return
      }
      if (isHistoryOpen) {
        setIsHistoryOpen(false)
        window.requestAnimationFrame(() => historyTriggerRef.current?.focus({ preventScroll: true }))
        return
      }
      setIsOpen(false)
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [feedbackMenuMessageId, isHistoryOpen, isOpen])

  useEffect(() => {
    if (!isOpen || !isHistoryOpen) return
    const frame = window.requestAnimationFrame(() => historyCloseRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [isHistoryOpen, isOpen])

  useEffect(() => {
    if (!isOpen || !isFullscreen) return
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [isFullscreen, isOpen])

  useEffect(() => {
    if (!isOpen || !isFullscreen) return
    const viewport = window.visualViewport
    const root = rootRef.current
    const syncViewport = () => {
      const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight))
      const offsetTop = Math.max(0, Math.round(viewport?.offsetTop ?? 0))
      root?.style.setProperty('--public-assistant-viewport-height', `${height}px`)
      root?.style.setProperty('--public-assistant-viewport-offset-top', `${offsetTop}px`)
    }
    syncViewport()
    viewport?.addEventListener('resize', syncViewport)
    viewport?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)
    return () => {
      viewport?.removeEventListener('resize', syncViewport)
      viewport?.removeEventListener('scroll', syncViewport)
      window.removeEventListener('resize', syncViewport)
      root?.style.removeProperty('--public-assistant-viewport-height')
      root?.style.removeProperty('--public-assistant-viewport-offset-top')
    }
  }, [isFullscreen, isOpen])

  useEffect(() => {
    if (!isOpen || !apiBase) return
    healthRequestRef.current?.abort()
    const controller = new AbortController()
    healthRequestRef.current = controller
    void requestPublicAssistantHealth(apiBase, controller.signal)
      .then(() => {
        if (healthRequestRef.current !== controller) return
        setServiceState((current) => current === 'online' ? current : 'ready')
        setIssue((current) => current?.scope === 'health' ? null : current)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (healthRequestRef.current !== controller) return
        setServiceState('error')
        setIssue(toAssistantIssue(error, 'health'))
      })
      .finally(() => {
        if (healthRequestRef.current === controller) healthRequestRef.current = null
      })
    return () => controller.abort()
  }, [apiBase, healthRetryNonce, isOpen])

  useEffect(() => {
    const handleSurfaceOpen = (event: Event) => {
      const detail = (event as CustomEvent<MobileSurfaceOpenDetail>).detail
      if (isMobileSurfaceViewport() && detail?.surface === 'detail-reading-guide') {
        setIsHistoryOpen(false)
        setIsOpen(false)
      }
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

  const closeWidget = () => {
    setFeedbackMenuMessageId(null)
    setIsHistoryOpen(false)
    setIsOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
  }

  const toggleWidget = () => {
    if (isOpen) {
      closeWidget()
      return
    }
    announceMobileSurfaceOpen('public-assistant')
    rootRef.current?.style.setProperty('--public-assistant-collision-offset', '0px')
    collisionOffsetRef.current = 0
    setIsFullscreen(isMobileSurfaceViewport())
    setIsOpen(true)
    trackAnalyticsEvent('public_assistant_open', { source: 'floating-widget' })
  }

  const stopActiveChat = () => {
    activeRequestRef.current?.controller.abort()
    activeRequestRef.current = null
    setIsLoading(false)
    setProgressStage(null)
  }

  const cancelActiveChat = () => {
    const active = activeRequestRef.current
    if (!active) return
    active.controller.abort()
    activeRequestRef.current = null
    setIsLoading(false)
    setProgressStage(null)
    setIssue({
      code: 'public-assistant-request-cancelled',
      scope: 'chat',
      prompt: active.prompt,
      mode: active.mode,
    })
  }

  const startNewConversation = () => {
    stopActiveChat()
    historyRequestRef.current?.abort()
    historyRequestRef.current = null
    const nextSessionId = createPublicAssistantSessionId()
    commitSessionRegistry(rememberPublicAssistantSession(sessionRegistry, nextSessionId))
    shouldFollowOutputRef.current = true
    setMessages([])
    setInput('')
    setIssue(null)
    setHasNewContent(false)
    setFeedbackMenuMessageId(null)
    setIsHistoryOpen(false)
    setHistoryLoadingId(null)
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
  }

  const refreshHistory = async () => {
    if (!apiBase) {
      setHistoryState('error')
      setIssue({ code: 'public-assistant-service-unavailable', scope: 'history' })
      return
    }
    historyRequestRef.current?.abort()
    const controller = new AbortController()
    historyRequestRef.current = controller
    setHistoryState('loading')
    try {
      const sessions = await requestPublicAssistantSessions({
        apiBase,
        sessionIds: sessionRegistry.sessionIds,
        signal: controller.signal,
      })
      if (historyRequestRef.current !== controller) return
      setHistorySessions(sessions)
      setHistoryState('ready')
      setIssue((current) => current?.scope === 'history' ? null : current)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (historyRequestRef.current !== controller) return
      setHistoryState('error')
      setIssue(toAssistantIssue(error, 'history'))
    } finally {
      if (historyRequestRef.current === controller) historyRequestRef.current = null
    }
  }

  const openHistory = () => {
    setFeedbackMenuMessageId(null)
    setIsHistoryOpen(true)
    void refreshHistory()
  }

  const closeHistory = () => {
    setIsHistoryOpen(false)
    window.requestAnimationFrame(() => historyTriggerRef.current?.focus({ preventScroll: true }))
  }

  const openHistorySession = async (targetSessionId: string) => {
    if (!apiBase || historyLoadingId) return
    stopActiveChat()
    const controller = new AbortController()
    historyRequestRef.current?.abort()
    historyRequestRef.current = controller
    setHistoryLoadingId(targetSessionId)
    try {
      const history = await requestPublicAssistantSession({ apiBase, sessionId: targetSessionId, signal: controller.signal })
      if (historyRequestRef.current !== controller) return
      const restored = history.turns.flatMap<WidgetMessage>((turn) => [
        {
          id: `history-${turn.id}-user`,
          role: 'user',
          content: turn.question,
          requestMode: turn.mode,
        },
        {
          id: `history-${turn.id}-assistant`,
          role: 'assistant',
          content: turn.answer,
          citations: turn.citations,
          claims: turn.claims,
          status: turn.status,
          meta: turn.meta,
          suggestions: turn.suggestions,
          sessionId: targetSessionId,
          turnId: turn.id,
          prompt: turn.question,
          requestMode: turn.mode,
          feedback: turn.feedback ?? undefined,
        },
      ])
      commitSessionRegistry(rememberPublicAssistantSession(sessionRegistry, targetSessionId))
      shouldFollowOutputRef.current = true
      setMessages(restored)
      setMode(history.turns.at(-1)?.mode ?? 'auto')
      setIssue(null)
      setHasNewContent(false)
      setIsHistoryOpen(false)
      window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const nextIssue = toAssistantIssue(error, 'history')
      setIssue(nextIssue)
      if (nextIssue.code === 'session-not-found') {
        const nextRegistry = forgetPublicAssistantSession(sessionRegistry, targetSessionId)
        commitSessionRegistry(nextRegistry)
        setHistorySessions((current) => current.filter((session) => session.id !== targetSessionId))
      }
    } finally {
      if (historyRequestRef.current === controller) historyRequestRef.current = null
      setHistoryLoadingId(null)
    }
  }

  const removeHistorySession = async (targetSessionId: string) => {
    if (!apiBase || !window.confirm('删除这条匿名会话及其原始记录？')) return
    const controller = new AbortController()
    historyRequestRef.current?.abort()
    historyRequestRef.current = controller
    setHistoryLoadingId(targetSessionId)
    try {
      await deletePublicAssistantSession({ apiBase, sessionId: targetSessionId, signal: controller.signal })
      if (historyRequestRef.current !== controller) return
      let nextRegistry = forgetPublicAssistantSession(sessionRegistry, targetSessionId)
      if (targetSessionId === sessionIdRef.current) {
        nextRegistry = rememberPublicAssistantSession(nextRegistry, createPublicAssistantSessionId())
        shouldFollowOutputRef.current = true
        setMessages([])
        setInput('')
      }
      commitSessionRegistry(nextRegistry)
      setHistorySessions((current) => current.filter((session) => session.id !== targetSessionId))
      setIssue(null)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setIssue(toAssistantIssue(error, 'history'))
    } finally {
      if (historyRequestRef.current === controller) historyRequestRef.current = null
      setHistoryLoadingId(null)
    }
  }

  const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const focusScope = isHistoryOpen ? historyPanelRef.current : panelRef.current
    if (event.key !== 'Tab' || (!isFullscreen && !isHistoryOpen) || !focusScope) return
    const focusable = Array.from(focusScope.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null)
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable.at(-1) ?? first
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleMessagesScroll = () => {
    const container = scrollRef.current
    if (!container) return
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 56
    shouldFollowOutputRef.current = nearBottom
    if (nearBottom) setHasNewContent(false)
  }

  const submitQuestion = async (
    question: string,
    requestedMode: PublicAssistantMode = mode,
    options: { reusePendingQuestion?: boolean } = {},
  ) => {
    const trimmed = question.replace(/\s+/gu, ' ').trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!trimmed || isLoading) return

    trackAnalyticsEvent('public_assistant_question', {
      source: 'floating-widget',
      mode: requestedMode,
      questionLength: trimmed.length,
    })

    const requestSessionId = sessionIdRef.current
    const reusablePendingQuestion = options.reusePendingQuestion === true &&
      messages.at(-1)?.role === 'user' &&
      messages.at(-1)?.content === trimmed
    const history = buildHistory(reusablePendingQuestion ? messages.slice(0, -1) : messages)
    const userMessage: WidgetMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: trimmed,
      requestMode: requestedMode,
    }
    shouldFollowOutputRef.current = true
    setHasNewContent(false)
    setIssue(null)
    setFeedbackMenuMessageId(null)
    if (!reusablePendingQuestion) setMessages((current) => [...current, userMessage])
    setInput('')
    setIsLoading(true)
    setProgressStage('planning')
    const controller = new AbortController()
    activeRequestRef.current = { controller, prompt: trimmed, mode: requestedMode, sessionId: requestSessionId }

    let result: PublicAssistantAnswer
    let resolvedApiBase = apiBase
    try {
      const remote = await requestPublicAnswer({
        question: trimmed,
        mode: requestedMode,
        sessionId: requestSessionId,
        history,
        preferredApiBase: apiBase,
        signal: controller.signal,
        onProgress: (stage) => {
          if (activeRequestRef.current?.controller === controller) setProgressStage(stage)
        },
      })
      if (activeRequestRef.current?.controller !== controller || sessionIdRef.current !== requestSessionId) return
      result = remote.answer
      resolvedApiBase = remote.apiBase
      setApiBase(remote.apiBase)
      setServiceState(result.status === 'degraded' ? 'degraded' : 'online')
      setIssue(null)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (activeRequestRef.current?.controller !== controller || sessionIdRef.current !== requestSessionId) return
      const nextIssue = toAssistantIssue(error, 'chat', trimmed, requestedMode)
      result = buildLocalAnswer(trimmed, requestedMode, nextIssue.code)
      setIssue(nextIssue)
      setServiceState(getAssistantApiBase(apiBase) ? 'error' : 'degraded')
    } finally {
      if (activeRequestRef.current?.controller === controller) {
        activeRequestRef.current = null
        setProgressStage(null)
        setIsLoading(false)
      }
    }

    if (sessionIdRef.current !== requestSessionId) return
    const resolvedSessionId = result.sessionId ?? requestSessionId
    if (result.sessionId) commitSessionRegistry(rememberPublicAssistantSession(sessionRegistry, result.sessionId))
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

  const retryIssue = () => {
    if (!issue) return
    if (issue.scope === 'chat' && issue.prompt) {
      const prompt = issue.prompt
      const requestedMode = issue.mode ?? mode
      const reusePendingQuestion = issue.code === 'public-assistant-request-cancelled'
      setIssue(null)
      void submitQuestion(prompt, requestedMode, { reusePendingQuestion })
      return
    }
    if (issue.scope === 'history') {
      setIssue(null)
      setIsHistoryOpen(true)
      void refreshHistory()
      return
    }
    setIssue(null)
    setHealthRetryNonce((value) => value + 1)
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

  const sendFeedback = async (
    message: WidgetMessage,
    rating: 'up' | 'down',
    reason: PublicAssistantFeedbackReason,
  ) => {
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
        reason,
      })
      setMessages((current) => current.map((item) => item.id === message.id
        ? { ...item, feedback: rating, feedbackPending: false, feedbackError: false }
        : item))
      setFeedbackMenuMessageId((current) => current === message.id ? null : current)
      if (rating === 'down') {
        window.requestAnimationFrame(() => feedbackTriggerRefs.current.get(message.id)?.focus({ preventScroll: true }))
      }
    } catch {
      setMessages((current) => current.map((item) => item.id === message.id
        ? { ...item, feedbackPending: false, feedbackError: true }
        : item))
      if (rating === 'down') {
        window.requestAnimationFrame(() => feedbackTriggerRefs.current.get(message.id)?.focus({ preventScroll: true }))
      }
    }
  }

  const latestSuggestions = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.suggestions?.length)?.suggestions

  return (
    <div
      ref={rootRef}
      className={`public-assistant ${isOpen ? 'is-open' : ''} ${isOpen && isFullscreen ? 'is-fullscreen' : ''} ${footerVisible ? 'is-footer-visible' : ''}`}
    >
      <button
        ref={triggerRef}
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
        <section
          ref={panelRef}
          className="public-assistant__panel"
          id="public-assistant-panel"
          role="dialog"
          aria-modal={isFullscreen || undefined}
          aria-labelledby="public-assistant-title"
          onKeyDown={handlePanelKeyDown}
        >
          <header className="public-assistant__header">
            <div className="public-assistant__title">
              <p className="public-assistant__eyebrow">PUBLIC RESEARCH</p>
              <h2 id="public-assistant-title">泊岸研究助手</h2>
              <span className={`public-assistant__status ${serviceStatus.className}`}>{serviceStatus.label}</span>
            </div>
            <div className="public-assistant__header-actions" aria-label="会话操作">
              <button ref={historyTriggerRef} type="button" onClick={openHistory} aria-label="查看历史会话" title="历史会话">
                <History size={18} aria-hidden />
              </button>
              <button type="button" onClick={startNewConversation} aria-label="新建会话" title="新建会话">
                <MessageSquarePlus size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="public-assistant__fullscreen-toggle"
                onClick={() => setIsFullscreen((current) => !current)}
                aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
                title={isFullscreen ? '退出全屏' : '进入全屏'}
              >
                {isFullscreen ? <Minimize2 size={18} aria-hidden /> : <Maximize2 size={18} aria-hidden />}
              </button>
              <button type="button" onClick={closeWidget} aria-label="关闭研究助手" title="关闭">
                <X size={18} aria-hidden />
              </button>
            </div>
          </header>

          {isHistoryOpen && (
            <>
              <button
                type="button"
                className="public-assistant__history-backdrop"
                aria-label="关闭历史会话"
                tabIndex={-1}
                onClick={closeHistory}
              />
              <aside
                ref={historyPanelRef}
                className="public-assistant__history"
                role="dialog"
                aria-modal="true"
                aria-labelledby="public-assistant-history-title"
              >
                <header>
                  <div>
                    <p className="public-assistant__eyebrow">RECENT SESSIONS</p>
                    <h3 id="public-assistant-history-title">历史会话</h3>
                  </div>
                  <button ref={historyCloseRef} type="button" onClick={closeHistory} aria-label="返回当前会话" title="返回">
                    <X size={18} aria-hidden />
                  </button>
                </header>
                <button type="button" className="public-assistant__history-new" onClick={startNewConversation}>
                  <MessageSquarePlus size={17} aria-hidden />
                  <span>新建会话</span>
                </button>
                <div className="public-assistant__history-list">
                  {historyState === 'loading' && (
                    <div className="public-assistant__history-state" role="status">
                      <LoaderCircle className="is-spinning" size={16} aria-hidden />
                      <span>正在读取匿名历史…</span>
                    </div>
                  )}
                  {historyState === 'error' && (
                    <div className="public-assistant__history-state" role="status">
                      <strong>{issueCopy?.title ?? '历史暂不可用'}</strong>
                      <span>{issueCopy?.detail ?? '稍后可以重试。'}</span>
                      <button type="button" onClick={() => void refreshHistory()}>
                        <RefreshCw size={15} aria-hidden />
                        <span>重试</span>
                      </button>
                    </div>
                  )}
                  {historyState === 'ready' && historySessions.length === 0 && (
                    <div className="public-assistant__history-state">
                      <strong>还没有可恢复的会话</strong>
                      <span>完成一次提问后，会话会在这个浏览器中保留。</span>
                    </div>
                  )}
                  {historySessions.map((session) => (
                    <article key={session.id} className={session.id === sessionId ? 'is-current' : ''}>
                      <button
                        type="button"
                        className="public-assistant__history-open"
                        disabled={historyLoadingId !== null}
                        onClick={() => void openHistorySession(session.id)}
                      >
                        <strong>{session.title}</strong>
                        <span>{session.turnCount} 轮 · {formatSessionDate(session.lastActiveAt)}</span>
                      </button>
                      <button
                        type="button"
                        className="public-assistant__history-delete"
                        disabled={historyLoadingId !== null}
                        onClick={() => void removeHistorySession(session.id)}
                        aria-label={`删除会话：${session.title}`}
                        title="删除会话"
                      >
                        {historyLoadingId === session.id
                          ? <LoaderCircle className="is-spinning" size={15} aria-hidden />
                          : <Trash2 size={15} aria-hidden />}
                      </button>
                    </article>
                  ))}
                </div>
              </aside>
            </>
          )}

          <p className="public-assistant__hint">问本站内容，也可以研究公开网页。</p>

          <div className="public-assistant__modes" role="group" aria-label="检索范围">
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

          <div
            className="public-assistant__messages"
            ref={scrollRef}
            role="log"
            aria-label="对话记录"
            aria-busy={isLoading}
            aria-live="off"
            onScroll={handleMessagesScroll}
          >
            {messages.length === 0 && !isLoading && (
              <div className="public-assistant__empty">
                <strong>从一个具体问题开始</strong>
                <span>助手会选择直接回答、本站检索或公开网页研究。</span>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`public-assistant__message is-${message.role}`}>
                {message.role === 'assistant'
                  ? <PublicAssistantMessageContent content={message.content} />
                  : <p>{message.content}</p>}
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
                            onClick={() => {
                              setFeedbackMenuMessageId(null)
                              void sendFeedback(message, 'up', 'helpful')
                            }}
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
                            ref={(element) => {
                              if (element) feedbackTriggerRefs.current.set(message.id, element)
                              else feedbackTriggerRefs.current.delete(message.id)
                            }}
                            onClick={() => setFeedbackMenuMessageId((current) => current === message.id ? null : message.id)}
                            disabled={message.feedbackPending}
                            aria-label="这个回答需要改进"
                            aria-pressed={message.feedback === 'down'}
                            aria-expanded={feedbackMenuMessageId === message.id}
                            aria-controls={`public-assistant-feedback-${message.id}`}
                            title="需要改进"
                          >
                            <ThumbsDown size={15} aria-hidden />
                          </button>
                        </>
                      )}
                      {message.feedbackError && <span role="status">反馈未提交</span>}
                    </div>
                    {feedbackMenuMessageId === message.id && (
                      <div
                        className="public-assistant__feedback-reasons"
                        id={`public-assistant-feedback-${message.id}`}
                        role="group"
                        aria-label="选择需要改进的原因"
                      >
                        <span>哪里需要改进？</span>
                        <div>
                          {NEGATIVE_FEEDBACK_REASONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              disabled={message.feedbackPending}
                              onClick={() => void sendFeedback(message, 'down', option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}

            {isLoading && (
              <div className="public-assistant__loading">
                <LoaderCircle className="is-spinning" size={15} aria-hidden />
                <span>{getLoadingLabel(mode, progressStage)}</span>
              </div>
            )}

            {issue && issue.scope !== 'history' && (
              <div className="public-assistant__notice" role="status">
                <div>
                  <strong>{issueCopy?.title}</strong>
                  <span>{issueCopy?.detail}</span>
                </div>
                <button type="button" onClick={retryIssue} disabled={isLoading}>
                  <RefreshCw size={15} aria-hidden />
                  <span>重试</span>
                </button>
              </div>
            )}

            {hasNewContent && (
              <button type="button" className="public-assistant__latest" onClick={scrollToLatest}>
                <ArrowDown size={15} aria-hidden />
                <span>回到最新</span>
              </button>
            )}
          </div>

          <span className="sr-only" aria-live="polite">
            {isLoading
              ? '正在生成回答'
              : issue?.code === 'public-assistant-request-cancelled'
                ? '已停止生成'
                : messages.at(-1)?.role === 'assistant' ? '回答已完成' : ''}
          </span>

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
              ref={inputRef}
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
            {isLoading ? (
              <button type="button" className="is-stop" onClick={cancelActiveChat} aria-label="停止生成">
                <Square size={15} fill="currentColor" aria-hidden />
                <span>停止</span>
              </button>
            ) : (
              <button type="submit" disabled={input.trim().length === 0} aria-label="发送问题">
                <Send size={16} aria-hidden />
                <span>发送</span>
              </button>
            )}
          </form>
        </section>
      )}
    </div>
  )
}
