import { type ChangeEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import '../styles/route-pages.css'
import {
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  GitBranch,
  History,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  Pencil,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
  getPublicAssistantSuggestions,
  buildPublicKnowledgeFallbackAnswer,
  searchPublicKnowledge,
  type AssistantKnowledgeItem,
} from '../data/assistant'
import { formatProductName } from '../data/productRegistry'
import { PUBLIC_ASSISTANT_API_BASE, SAME_ORIGIN_ASSISTANT_API_BASE } from '../utils/assistantApi'
import { trackAnalyticsEvent } from '../utils/analytics'
import {
  announceMobileSurfaceOpen,
  isMobileSurfaceViewport,
  MOBILE_SURFACE_OPEN_EVENT,
  type MobileSurfaceOpenDetail,
} from '../utils/mobileSurface'
import {
  cancelPublicAssistantGeneration,
  deletePublicAssistantSession,
  requestPublicAssistant,
  requestPublicAssistantBranch,
  requestPublicAssistantSession,
  requestPublicAssistantSessions,
  requestPublicAssistantStream,
  PublicAssistantTransportError,
  submitPublicAssistantFeedback,
  type PublicAssistantAnswer,
  type PublicAssistantCitation,
  type PublicAssistantClaim,
  type PublicAssistantFeedbackReason,
  type PublicAssistantGenerationIntent,
  type PublicAssistantHistoryTurn,
  type PublicAssistantImageAttachment,
  type PublicAssistantMode,
  type PublicAssistantProgressStage,
  type PublicAssistantSessionHistory,
  type PublicAssistantSessionSummary,
  type PublicAssistantStatus,
} from '../utils/publicAssistantApi'
import {
  activePublicAssistantGenerationIntent,
  appendPendingPublicAssistantTurn,
  buildPublicAssistantConversationHistory,
  createPublicAssistantQuestionEditRequest,
  createEmptyPublicAssistantConversation,
  hydratePublicAssistantConversation,
  mergePublicAssistantAnswer,
  removeLocalPublicAssistantAnswer,
  retargetPendingPublicAssistantTurn,
  selectedPublicAssistantRevision,
  selectViewedPublicAssistantRevision,
  updatePublicAssistantRevisionFeedback,
  type PublicAssistantConversationState,
} from '../utils/publicAssistantConversation'
import { formatPublicAssistantRecoveryLabel } from '../utils/publicAssistantPresentation'
import { usePublicAssistantCollision } from '../hooks/usePublicAssistantCollision'
import { PublicAssistantMessageContent } from './PublicAssistantMessageContent'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { publicAssistantInterfaceCopy } from '../data/publicAssistantInterfaceCopy'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'
import {
  createPublicAssistantRequestId,
  createPublicAssistantSessionId,
  forgetPublicAssistantSession,
  hasPersistedPublicAssistantSessionRegistry,
  persistPublicAssistantSessionRegistry,
  readPublicAssistantSessionRegistry,
  rememberPublicAssistantSession,
  type PublicAssistantSessionRegistry,
} from '../utils/publicAssistantSessionRegistry'
import {
  clearPublicAssistantDraft,
  clearPublicAssistantHistorySnapshot,
  clearPublicAssistantSessionBrowserState,
  readPublicAssistantDraft,
  readPublicAssistantHistorySnapshot,
  writePublicAssistantDraft,
  writePublicAssistantHistorySnapshot,
} from '../utils/publicAssistantBrowserState'
import {
  getPublicAssistantWarmupServerSnapshot,
  getPublicAssistantWarmupSnapshot,
  startPublicAssistantWarmup,
  subscribePublicAssistantWarmup,
} from '../utils/publicAssistantWarmup'
import { preparePublicAssistantImage, PublicAssistantImageError } from '../utils/publicAssistantImage'

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
  revisionId?: string
  revisionNo?: number
  revisionCount?: number
  isActiveRevision?: boolean
  prompt?: string
  requestMode?: PublicAssistantMode
  feedback?: 'up' | 'down'
  feedbackPending?: boolean
  feedbackError?: boolean
  requestId?: string
}

const PUBLIC_ASSISTANT_NAME = formatProductName('public-assistant')

type AssistantServiceState = 'ready' | 'online' | 'degraded' | 'error'
type PublicAssistantBranchAction =
  | { action: 'select'; branchId: string }
  | { action: 'continue-from-revision'; revisionId: string }

interface AssistantIssue {
  code: string
  scope: 'chat' | 'health' | 'history' | 'branch'
  prompt?: string
  mode?: PublicAssistantMode
  retryAfterSeconds?: number | null
  retryAvailableAt?: number | null
  requestId?: string
  sessionId?: string
  history?: PublicAssistantHistoryTurn[]
  pageContext?: PublicAssistantPageContext
  intent?: PublicAssistantGenerationIntent
  forceAuthoritativeHistory?: boolean
  branchAction?: PublicAssistantBranchAction
  attachment?: PublicAssistantImageAttachment
}

interface PublicAssistantPageContext {
  path: string
  title: string
  description: string
}

interface ActiveChatRequest {
  controller: AbortController
  prompt: string
  mode: PublicAssistantMode
  sessionId: string
  requestId: string
  history: PublicAssistantHistoryTurn[]
  pageContext: PublicAssistantPageContext
  intent: PublicAssistantGenerationIntent
  forceAuthoritativeHistory: boolean
  attachment?: PublicAssistantImageAttachment
}

type NegativeFeedbackReason = Extract<
  PublicAssistantFeedbackReason,
  'incorrect' | 'unclear' | 'missing-sources' | 'outdated' | 'other'
>

const CONFIGURED_API_BASE = PUBLIC_ASSISTANT_API_BASE
const MAX_MESSAGE_LENGTH = 500
const MAX_FALLBACK_ANSWER_LENGTH = 520

function normalizePublicAssistantQuestion(value: string) {
  return value.replace(/\s+/gu, ' ').trim().slice(0, MAX_MESSAGE_LENGTH)
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
    contractVersion: 1,
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

function buildLocalImageFallbackAnswer(reason: string): PublicAssistantAnswer {
  return {
    contractVersion: 1,
    answer: '图片理解服务暂时不可用。为了避免对图片内容进行猜测，我没有生成替代结论；图片和问题仍保留在当前输入中，可以稍后重试。',
    status: 'degraded',
    claims: [],
    citations: [],
    suggestions: [],
    meta: {
      mode: 'fallback',
      reason,
      citationCount: 0,
    },
  }
}

async function requestPublicAnswer(input: {
  requestId: string
  question: string
  mode: PublicAssistantMode
  sessionId: string
  history: PublicAssistantHistoryTurn[]
  intent: PublicAssistantGenerationIntent
  pageContext: PublicAssistantPageContext
  preferredApiBase: string | null
  signal: AbortSignal
  onProgress: (stage: PublicAssistantProgressStage) => void
  attachment?: PublicAssistantImageAttachment
}) {
  const apiBase = getAssistantApiBase(input.preferredApiBase)
  const request = {
    apiBase,
    requestId: input.requestId,
    message: input.question,
    mode: input.mode,
    sessionId: input.sessionId,
    intent: input.intent,
    history: input.history,
    pageContext: input.pageContext,
    signal: input.signal,
    ...(input.attachment ? { attachment: input.attachment } : {}),
  }
  let answer: PublicAssistantAnswer
  try {
    answer = await requestPublicAssistantStream({ ...request, onProgress: input.onProgress })
  } catch (error) {
    if (!(error instanceof PublicAssistantTransportError) || !error.canFallbackToJson) throw error
    answer = await requestPublicAssistant(request)
  }
  if (answer.requestId !== input.requestId) {
    throw new PublicAssistantTransportError('public-assistant-invalid-response', { requestId: input.requestId })
  }
  return { answer, apiBase }
}

function readPublicAssistantPageContext(): PublicAssistantPageContext {
  return {
    path: window.location.pathname,
    title: document.title,
    description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '',
  }
}

function getServiceStatus(state: AssistantServiceState, copy: typeof publicAssistantInterfaceCopy.zh) {
  if (state === 'online') return { className: 'is-model', label: copy.service.online }
  if (state === 'degraded') return { className: 'is-fallback', label: copy.service.degraded }
  if (state === 'error') return { className: 'is-error', label: copy.service.error }
  return { className: 'is-ready', label: copy.service.ready }
}

function formatAnswerMeta(message: WidgetMessage, copy: typeof publicAssistantInterfaceCopy.zh, language: 'zh' | 'en') {
  if (!message.status || !message.meta) return ''
  const labels = [copy.statuses[message.status]]
  const research = message.meta.research
  const recovery = message.meta.recovery
  if (research) {
    labels.push(copy.routes[research.route])
    if (research.evidenceCount > 0) labels.push(copy.evidenceCount(research.evidenceCount))
    if (research.durationMs > 0) labels.push(copy.seconds((research.durationMs / 1_000).toFixed(1)))
  } else if (message.meta.citationCount > 0) {
    labels.push(copy.siteSourceCount(message.meta.citationCount))
  }
  const recoveryLabel = formatPublicAssistantRecoveryLabel(recovery, language)
  if (recoveryLabel) labels.push(recoveryLabel)
  return labels.join(' · ')
}

function getLoadingLabel(mode: PublicAssistantMode, stage: PublicAssistantProgressStage | null, copy: typeof publicAssistantInterfaceCopy.zh) {
  if (stage === 'understanding_image') return copy.loading.image
  if (stage === 'planning') return copy.loading.planning
  if (stage === 'researching') return mode === 'site' ? copy.loading.site : copy.loading.researching
  if (stage === 'evaluating') return copy.loading.evaluating
  if (stage === 'refining') return copy.loading.refining
  if (stage === 'answering') return copy.loading.answering
  if (stage === 'recovering') return copy.loading.recovering
  if (stage === 'verifying') return copy.loading.verifying
  if (stage === 'saving') return copy.loading.saving
  if (mode === 'site') return copy.loading.site
  if (mode === 'web') return copy.loading.web
  return copy.loading.auto
}

function toAssistantIssue(
  error: unknown,
  scope: AssistantIssue['scope'],
  prompt?: string,
  mode?: PublicAssistantMode,
  requestContext?: {
    requestId: string
    sessionId: string
    history: PublicAssistantHistoryTurn[]
    pageContext: PublicAssistantPageContext
    intent: PublicAssistantGenerationIntent
    forceAuthoritativeHistory?: boolean
    attachment?: PublicAssistantImageAttachment
  },
): AssistantIssue {
  const transport = error instanceof PublicAssistantTransportError ? error : null
  const retryAfterSeconds = transport?.retryAfterSeconds ?? null
  return {
    code: transport?.code ?? 'public-chat-request-failed',
    scope,
    prompt,
    mode,
    retryAfterSeconds,
    retryAvailableAt: retryAfterSeconds && retryAfterSeconds > 0
      ? Date.now() + retryAfterSeconds * 1_000
      : null,
    ...(requestContext ?? {}),
  }
}

function refreshAssistantIssueCountdown(issue: AssistantIssue | null, now: number) {
  if (!issue?.retryAvailableAt) return issue
  const retryAfterSeconds = Math.max(0, Math.ceil((issue.retryAvailableAt - now) / 1_000))
  return retryAfterSeconds === issue.retryAfterSeconds ? issue : { ...issue, retryAfterSeconds }
}

function isAssistantIssueRetryBlocked(issue: AssistantIssue | null, isOnline: boolean) {
  return !isOnline || Boolean(issue?.retryAfterSeconds && issue.retryAfterSeconds > 0)
}

function getAssistantRetryLabel(issue: AssistantIssue | null, fallback: string, copy: typeof publicAssistantInterfaceCopy.zh) {
  return issue?.retryAfterSeconds && issue.retryAfterSeconds > 0
    ? copy.retryAfter(issue.retryAfterSeconds)
    : fallback
}

function getAssistantIssueCopy(issue: AssistantIssue, isOnline: boolean, copy: typeof publicAssistantInterfaceCopy.zh) {
  if (!isOnline) return copy.issues.offline
  if (issue.code === 'public-assistant-offline') return copy.issues.restored
  if (issue.code === 'public-assistant-rate-limited') {
    return { title: copy.rateLimited.title, detail: issue.retryAfterSeconds && issue.retryAfterSeconds > 0 ? copy.rateLimited.waiting(issue.retryAfterSeconds) : copy.rateLimited.ready }
  }
  if (issue.scope === 'branch') return copy.issues.branch
  if (issue.intent?.kind === 'answer-revision') return copy.issues.revision
  if (issue.scope === 'health' && (
    issue.code.includes('timeout') ||
    issue.code.includes('unreachable') ||
    issue.code === 'public-assistant-service-unavailable'
  )) return copy.issues.starting
  if (issue.code.includes('timeout')) return copy.issues.timeout
  if (issue.code.includes('unreachable') || issue.code === 'public-assistant-endpoint-unreachable') return copy.issues.unreachable
  if (issue.code === 'session-not-found') return copy.issues.expired
  if (issue.code === 'public-assistant-request-cancelled') return copy.issues.cancelled
  if (issue.code === 'invalid-public-assistant-image' || issue.code === 'public-assistant-request-too-large') {
    return copy.issues.image
  }
  if (issue.code === 'public-assistant-history-refresh-required') return copy.issues.refresh
  if (issue.code === 'database-not-configured' || issue.code === 'public-assistant-service-unavailable') return copy.issues.history
  if (issue.code.includes('invalid-response')) return copy.issues.invalid
  return copy.issues.failed
}

function formatSessionDate(value: string, language: 'zh' | 'en') {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

function formatCitationDate(value: string | null, language: 'zh' | 'en') {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(parsed)
}

function projectConversationMessages(
  conversation: PublicAssistantConversationState,
  sessionId: string,
): WidgetMessage[] {
  return conversation.turns.flatMap<WidgetMessage>((turn) => {
    const revision = selectedPublicAssistantRevision(turn)
    const user: WidgetMessage = {
      id: `${turn.id}-user`,
      role: 'user',
      content: turn.question,
      turnId: turn.persisted ? turn.id : undefined,
      requestMode: turn.mode,
      requestId: turn.requestId,
    }
    if (!revision) return [user]
    return [user, {
      id: `${turn.id}-${revision.id}`,
      role: 'assistant',
      content: revision.answer,
      citations: revision.citations,
      claims: revision.claims,
      status: revision.status,
      meta: revision.meta,
      suggestions: revision.suggestions,
      sessionId: revision.persisted ? sessionId : undefined,
      turnId: turn.persisted ? turn.id : undefined,
      revisionId: revision.persisted ? revision.id : undefined,
      revisionNo: revision.revisionNo,
      revisionCount: turn.revisions.length,
      isActiveRevision: revision.id === turn.activeRevisionId,
      prompt: turn.question,
      requestMode: turn.mode,
      feedback: revision.feedback ?? undefined,
      feedbackPending: revision.feedbackPending,
      feedbackError: revision.feedbackError,
      requestId: revision.requestId,
    }]
  })
}

function citationKey(messageId: string, citationId: string) {
  return `${messageId}:${citationId}`
}

function citationElementId(messageId: string, index: number) {
  return `public-assistant-citation-${messageId}-${index + 1}`
}

interface PublicAssistantWidgetProps {
  initiallyOpen?: boolean
  onInitialOpenHandled?: () => void
}

export function PublicAssistantWidget({ initiallyOpen = false, onInitialOpenHandled }: PublicAssistantWidgetProps) {
  const { pathname } = useLocation()
  const language = useSiteLanguage()
  const copy = publicAssistantInterfaceCopy[language]
  const [shouldRestoreInitialSession] = useState(hasPersistedPublicAssistantSessionRegistry)
  const [sessionRegistry, setSessionRegistry] = useState<PublicAssistantSessionRegistry>(readPublicAssistantSessionRegistry)
  const initialDraft = readPublicAssistantDraft(sessionRegistry.currentSessionId)
  const initialSnapshot = shouldRestoreInitialSession
    ? readPublicAssistantHistorySnapshot(sessionRegistry.currentSessionId)
    : null
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [waitingSeconds, setWaitingSeconds] = useState(0)
  const [historyState, setHistoryState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [historySessions, setHistorySessions] = useState<PublicAssistantSessionSummary[]>([])
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null)
  const [progressStage, setProgressStage] = useState<PublicAssistantProgressStage | null>(null)
  const [input, setInput] = useState(initialDraft?.input ?? '')
  const [imageAttachment, setImageAttachment] = useState<PublicAssistantImageAttachment | null>(null)
  const [imageIssue, setImageIssue] = useState<string | null>(null)
  const [isImageProcessing, setIsImageProcessing] = useState(false)
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState('')
  const [mode, setMode] = useState<PublicAssistantMode>(initialDraft?.mode ?? 'auto')
  const [conversation, setConversation] = useState<PublicAssistantConversationState>(
    initialSnapshot ? hydratePublicAssistantConversation(initialSnapshot.history) : createEmptyPublicAssistantConversation,
  )
  const [isSnapshotVisible, setIsSnapshotVisible] = useState(Boolean(initialSnapshot))
  const [branchActionPending, setBranchActionPending] = useState(false)
  const [apiBase, setApiBase] = useState<string | null>(CONFIGURED_API_BASE || SAME_ORIGIN_ASSISTANT_API_BASE)
  const [serviceState, setServiceState] = useState<AssistantServiceState>('ready')
  const warmup = useSyncExternalStore(
    subscribePublicAssistantWarmup,
    getPublicAssistantWarmupSnapshot,
    getPublicAssistantWarmupServerSnapshot,
  )
  const [issue, setIssue] = useState<AssistantIssue | null>(null)
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)
  const [hasNewContent, setHasNewContent] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [feedbackMenuMessageId, setFeedbackMenuMessageId] = useState<string | null>(null)
  const [feedbackFocusRequest, setFeedbackFocusRequest] = useState<{ messageId: string; sequence: number } | null>(null)
  const [initialRestoreState, setInitialRestoreState] = useState<'loading' | 'ready' | 'error'>(
    shouldRestoreInitialSession ? 'loading' : 'ready',
  )
  const [initialRestoreIssue, setInitialRestoreIssue] = useState<AssistantIssue | null>(null)
  const [restoreRetryNonce, setRestoreRetryNonce] = useState(0)
  const [historyTruncated, setHistoryTruncated] = useState(false)
  const [highlightedCitationKey, setHighlightedCitationKey] = useState<string | null>(null)
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Set<string>>(() => new Set())
  const sessionId = sessionRegistry.currentSessionId
  const messages = projectConversationMessages(conversation, sessionId)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const historyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const historyPanelRef = useRef<HTMLElement | null>(null)
  const historyCloseRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const imagePreparationRef = useRef<{ sessionId: string } | null>(null)
  const imageAttachButtonRef = useRef<HTMLButtonElement | null>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sessionIdRef = useRef(sessionId)
  const shouldFollowOutputRef = useRef(true)
  const activeRequestRef = useRef<ActiveChatRequest | null>(null)
  const branchActionPendingRef = useRef(false)
  const branchActionRequestRef = useRef<AbortController | null>(null)
  const historyRequestRef = useRef<AbortController | null>(null)
  const historyActionPendingRef = useRef(false)
  const initialRestoreRequestRef = useRef<AbortController | null>(null)
  const initialRestoreTargetRef = useRef<string | null>(shouldRestoreInitialSession ? sessionRegistry.currentSessionId : null)

  useEffect(() => {
    if (!isLoading) return
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      setWaitingSeconds(Math.floor((Date.now() - startedAt) / 1_000))
    }, 1_000)
    return () => window.clearInterval(interval)
  }, [isLoading])
  const copyTimerRef = useRef<number | null>(null)
  const citationHighlightTimerRef = useRef<number | null>(null)
  const citationRefs = useRef(new Map<string, HTMLAnchorElement>())
  const feedbackTriggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const editTriggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const clearAssistantCollision = usePublicAssistantCollision(rootRef, isOpen)
  const serviceStatus = warmup.state === 'warming'
    ? { className: 'is-warming', label: copy.service.warming }
    : warmup.state === 'error'
      ? { className: 'is-error', label: copy.service.warmupError }
      : getServiceStatus(serviceState, copy)
  const warmupIssue = warmup.issueCode ? { code: warmup.issueCode, scope: 'health' as const } : null
  const warmupIssueCopy = warmupIssue ? getAssistantIssueCopy(warmupIssue, isOnline, copy) : null
  const issueCopy = issue ? getAssistantIssueCopy(issue, isOnline, copy) : null
  const initialRestoreIssueCopy = initialRestoreIssue ? getAssistantIssueCopy(initialRestoreIssue, isOnline, copy) : null
  const issueRetryBlocked = isAssistantIssueRetryBlocked(issue, isOnline)
  const initialRestoreRetryBlocked = isAssistantIssueRetryBlocked(initialRestoreIssue, isOnline)
  const isRestoringSession = initialRestoreState === 'loading'
  const isConversationReady = initialRestoreState === 'ready'
  const isWarmupReady = warmup.state === 'ready'
  const isAssistantBusy = isLoading || isRestoringSession || branchActionPending || historyLoadingId !== null || isImageProcessing || !isWarmupReady
  const isQuestionEditing = editingTurnId !== null
  const launcherLabel = warmup.state === 'warming'
    ? copy.launcher.warming
    : warmup.state === 'ready'
      ? copy.launcher.ready
      : warmup.state === 'error'
        ? copy.launcher.error
        : copy.launcher.idle

  const resetImageAttachment = useCallback(() => {
    imagePreparationRef.current = null
    setIsImageProcessing(false)
    setImageAttachment(null)
    setImageIssue(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [setIsImageProcessing, setImageAttachment, setImageIssue])

  const loadSessionBrowserState = useCallback((targetSessionId: string, fallbackMode: PublicAssistantMode = 'auto') => {
    const draft = readPublicAssistantDraft(targetSessionId)
    setInput(draft?.input ?? '')
    setMode(draft?.mode ?? fallbackMode)
    resetImageAttachment()
  }, [resetImageAttachment, setInput, setMode])

  const acceptAuthoritativeHistory = (history: PublicAssistantSessionHistory) => {
    shouldFollowOutputRef.current = true
    setConversation(hydratePublicAssistantConversation(history))
    loadSessionBrowserState(history.session.id, history.turns.at(-1)?.mode ?? 'auto')
    setHistoryTruncated(history.hasEarlierTurns)
    setHasNewContent(false)
    setIsSnapshotVisible(false)
    writePublicAssistantHistorySnapshot(history)
  }

  const commitSessionRegistry = useCallback((next: PublicAssistantSessionRegistry) => {
    if (sessionIdRef.current !== next.currentSessionId) resetImageAttachment()
    sessionIdRef.current = next.currentSessionId
    persistPublicAssistantSessionRegistry(next)
    setSessionRegistry(next)
  }, [resetImageAttachment, setSessionRegistry])

  const scrollToLatest = () => {
    const container = scrollRef.current
    if (!container) return
    shouldFollowOutputRef.current = true
    container.scrollTop = container.scrollHeight
    setHasNewContent(false)
  }

  const focusComposer = () => {
    if (isMobileSurfaceViewport()) return
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
  }

  const closeFeedbackMenuAndRestoreFocus = (messageId: string) => {
    setFeedbackMenuMessageId(null)
    setFeedbackFocusRequest((current) => ({ messageId, sequence: (current?.sequence ?? 0) + 1 }))
  }

  const closeQuestionEditor = useCallback((restoreFocus = false) => {
    const turnId = editingTurnId
    setEditingTurnId(null)
    setEditingQuestion('')
    if (restoreFocus && turnId) {
      window.requestAnimationFrame(() => editTriggerRefs.current.get(turnId)?.focus({ preventScroll: true }))
    }
  }, [editingTurnId, setEditingQuestion, setEditingTurnId])

  const stopInitialRestore = () => {
    initialRestoreTargetRef.current = null
    initialRestoreRequestRef.current?.abort()
    initialRestoreRequestRef.current = null
  }

  const stopBranchAction = () => {
    branchActionRequestRef.current?.abort()
    branchActionRequestRef.current = null
    branchActionPendingRef.current = false
    setBranchActionPending(false)
  }

  const prepareInternalCitationNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    closeQuestionEditor()
    setFeedbackMenuMessageId(null)
    setIsHistoryOpen(false)
    setIsFullscreen(false)
    setIsOpen(false)
  }

  const focusCitation = (message: WidgetMessage, citationId: string) => {
    const key = citationKey(message.id, citationId)
    const citation = citationRefs.current.get(key)
    if (!citation) return
    const evidence = citation.closest<HTMLDetailsElement>('.public-assistant__evidence')
    if (evidence) evidence.open = true
    setExpandedEvidenceIds((current) => current.has(message.id) ? current : new Set(current).add(message.id))
    if (citationHighlightTimerRef.current !== null) window.clearTimeout(citationHighlightTimerRef.current)
    setHighlightedCitationKey(key)
    citation.focus({ preventScroll: true })
    citation.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
    })
    citationHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedCitationKey((current) => current === key ? null : current)
      citationHighlightTimerRef.current = null
    }, 1_600)
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
    imagePreparationRef.current = null
    activeRequestRef.current?.controller.abort()
    branchActionRequestRef.current?.abort()
    historyRequestRef.current?.abort()
    historyRequestRef.current = null
    historyActionPendingRef.current = false
    const initialRestoreRequest = initialRestoreRequestRef.current
    initialRestoreRequest?.abort()
    if (initialRestoreRequestRef.current === initialRestoreRequest) initialRestoreRequestRef.current = null
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    if (citationHighlightTimerRef.current !== null) window.clearTimeout(citationHighlightTimerRef.current)
  }, [])

  useEffect(() => {
    if (!initiallyOpen) return
    void startPublicAssistantWarmup()
    onInitialOpenHandled?.()
  }, [initiallyOpen, onInitialOpenHandled])

  useEffect(() => {
    writePublicAssistantDraft(sessionId, input, mode)
  }, [input, mode, sessionId])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const deadlines = [issue?.retryAvailableAt, initialRestoreIssue?.retryAvailableAt]
      .filter((deadline): deadline is number => typeof deadline === 'number')
    if (deadlines.length === 0) return

    let interval: number | null = null
    const refreshCountdowns = () => {
      const now = Date.now()
      setIssue((current) => refreshAssistantIssueCountdown(current, now))
      setInitialRestoreIssue((current) => refreshAssistantIssueCountdown(current, now))
      if (interval !== null && deadlines.every((deadline) => deadline <= now)) {
        window.clearInterval(interval)
        interval = null
      }
    }

    refreshCountdowns()
    if (deadlines.some((deadline) => deadline > Date.now())) {
      interval = window.setInterval(refreshCountdowns, 500)
    }
    return () => {
      if (interval !== null) window.clearInterval(interval)
    }
  }, [initialRestoreIssue?.retryAvailableAt, issue?.retryAvailableAt])

  useEffect(() => {
    if (!feedbackFocusRequest) return
    feedbackTriggerRefs.current.get(feedbackFocusRequest.messageId)?.focus({ preventScroll: true })
  }, [feedbackFocusRequest])

  useEffect(() => {
    if (!editingTurnId) return
    const frame = window.requestAnimationFrame(() => {
      const textarea = editTextareaRef.current
      textarea?.focus({ preventScroll: true })
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editingTurnId])

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
    if (!isOpen || !isConversationReady) return
    focusComposer()
  }, [isConversationReady, isOpen])

  useEffect(() => {
    if (!isOpen || !isFullscreen || !isMobileSurfaceViewport()) return
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [isFullscreen, isOpen])

  useEffect(() => {
    if (!isOpen || !isWarmupReady) return
    const targetSessionId = initialRestoreTargetRef.current
    if (!targetSessionId || initialRestoreRequestRef.current) return
    const restoreApiBase = getAssistantApiBase(apiBase)
    let controller: AbortController | null = null
    const startTimer = window.setTimeout(() => {
      if (
        initialRestoreTargetRef.current !== targetSessionId ||
        initialRestoreRequestRef.current
      ) return

      controller = new AbortController()
      initialRestoreRequestRef.current = controller

      void requestPublicAssistantSession({ apiBase: restoreApiBase, sessionId: targetSessionId, signal: controller.signal })
        .then((history) => {
          if (initialRestoreRequestRef.current !== controller || sessionIdRef.current !== targetSessionId) return
          initialRestoreTargetRef.current = null
          shouldFollowOutputRef.current = true
          setConversation(hydratePublicAssistantConversation(history))
          const draft = readPublicAssistantDraft(history.session.id)
          setInput(draft?.input ?? '')
          setMode(draft?.mode ?? history.turns.at(-1)?.mode ?? 'auto')
          setHistoryTruncated(history.hasEarlierTurns)
          setHasNewContent(false)
          setIsSnapshotVisible(false)
          writePublicAssistantHistorySnapshot(history)
          setInitialRestoreState('ready')
          setInitialRestoreIssue(null)
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          if (initialRestoreRequestRef.current !== controller || sessionIdRef.current !== targetSessionId) return
          initialRestoreTargetRef.current = null
          const nextIssue = toAssistantIssue(error, 'history')
          if (nextIssue.code === 'session-not-found') {
            clearPublicAssistantSessionBrowserState(targetSessionId)
            const withoutExpired = forgetPublicAssistantSession(sessionRegistry, targetSessionId)
            const nextRegistry = sessionRegistry.sessionIds.some((id) => id !== targetSessionId)
              ? rememberPublicAssistantSession(withoutExpired, createPublicAssistantSessionId())
              : withoutExpired
            commitSessionRegistry(nextRegistry)
            loadSessionBrowserState(nextRegistry.currentSessionId)
            setConversation(createEmptyPublicAssistantConversation())
            setIsSnapshotVisible(false)
            setHistoryTruncated(false)
            setInitialRestoreState('ready')
            setInitialRestoreIssue(null)
            return
          }
          setInitialRestoreState('error')
          setInitialRestoreIssue(nextIssue)
        })
        .finally(() => {
          if (initialRestoreRequestRef.current === controller) initialRestoreRequestRef.current = null
        })
    }, 0)

    return () => {
      window.clearTimeout(startTimer)
      if (controller && initialRestoreRequestRef.current === controller) {
        controller.abort()
        initialRestoreRequestRef.current = null
      }
    }
  }, [apiBase, commitSessionRegistry, isOpen, isWarmupReady, loadSessionBrowserState, restoreRetryNonce, sessionRegistry])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (editingTurnId) {
        closeQuestionEditor(true)
        return
      }
      if (feedbackMenuMessageId) {
        const messageId = feedbackMenuMessageId
        closeFeedbackMenuAndRestoreFocus(messageId)
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
  }, [closeQuestionEditor, editingTurnId, feedbackMenuMessageId, isHistoryOpen, isOpen])

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
    const handleSurfaceOpen = (event: Event) => {
      const detail = (event as CustomEvent<MobileSurfaceOpenDetail>).detail
      if (isMobileSurfaceViewport() && detail?.surface === 'detail-reading-guide') {
        setEditingTurnId(null)
        setEditingQuestion('')
        setIsHistoryOpen(false)
        setIsOpen(false)
      }
    }
    window.addEventListener(MOBILE_SURFACE_OPEN_EVENT, handleSurfaceOpen)
    return () => window.removeEventListener(MOBILE_SURFACE_OPEN_EVENT, handleSurfaceOpen)
  }, [])

  useEffect(() => {
    const footer = document.querySelector('.site-footer')
    if (!footer || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0.08 })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  const closeWidget = () => {
    closeQuestionEditor()
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
    clearAssistantCollision()
    setIsFullscreen(isMobileSurfaceViewport())
    void startPublicAssistantWarmup()
    setIsOpen(true)
    trackAnalyticsEvent('public_assistant_open', { source: 'floating-widget' })
  }

  const retryWarmup = () => {
    if (!isOnline) return
    void startPublicAssistantWarmup()
  }

  const stopActiveChat = () => {
    const active = activeRequestRef.current
    if (active && apiBase) {
      void cancelPublicAssistantGeneration({
        apiBase: getAssistantApiBase(apiBase),
        requestId: active.requestId,
        sessionId: active.sessionId,
      }).catch(() => undefined)
    }
    active?.controller.abort()
    activeRequestRef.current = null
    setIsLoading(false)
    setProgressStage(null)
  }

  const cancelActiveChat = () => {
    const active = activeRequestRef.current
    if (!active) return
    if (apiBase) {
      void cancelPublicAssistantGeneration({
        apiBase: getAssistantApiBase(apiBase),
        requestId: active.requestId,
        sessionId: active.sessionId,
      }).catch(() => undefined)
    }
    active.controller.abort()
    activeRequestRef.current = null
    setIsLoading(false)
    setProgressStage(null)
    setIssue({
      code: 'public-assistant-request-cancelled',
      scope: 'chat',
      prompt: active.prompt,
      mode: active.mode,
      requestId: active.requestId,
      sessionId: active.sessionId,
      history: active.history,
      pageContext: active.pageContext,
      intent: active.intent,
      forceAuthoritativeHistory: active.forceAuthoritativeHistory,
      ...(active.attachment ? { attachment: active.attachment } : {}),
    })
  }

  const startNewConversation = () => {
    stopActiveChat()
    stopBranchAction()
    stopInitialRestore()
    historyRequestRef.current?.abort()
    historyRequestRef.current = null
    historyActionPendingRef.current = false
    const previousSessionId = sessionIdRef.current
    clearPublicAssistantSessionBrowserState(previousSessionId)
    const nextSessionId = createPublicAssistantSessionId()
    commitSessionRegistry(rememberPublicAssistantSession(sessionRegistry, nextSessionId))
    shouldFollowOutputRef.current = true
    setConversation(createEmptyPublicAssistantConversation())
    closeQuestionEditor()
    setInput('')
    resetImageAttachment()
    setMode('auto')
    setIsSnapshotVisible(false)
    setIssue(null)
    setHasNewContent(false)
    setFeedbackMenuMessageId(null)
    setInitialRestoreState('ready')
    setInitialRestoreIssue(null)
    setHistoryTruncated(false)
    setIsHistoryOpen(false)
    setHistoryLoadingId(null)
    focusComposer()
  }

  const retryInitialRestore = () => {
    if (initialRestoreRetryBlocked || initialRestoreTargetRef.current || initialRestoreRequestRef.current) return
    stopInitialRestore()
    initialRestoreTargetRef.current = sessionIdRef.current
    setInitialRestoreState('loading')
    setInitialRestoreIssue(null)
    setRestoreRetryNonce((value) => value + 1)
  }

  const refreshHistory = async () => {
    if (historyRequestRef.current || !isWarmupReady) return
    if (!apiBase) {
      setHistoryState('error')
      setIssue({ code: 'public-assistant-service-unavailable', scope: 'history' })
      return
    }
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

  const retryHistory = () => {
    if (issueRetryBlocked || historyRequestRef.current) return
    void refreshHistory()
  }

  const openHistory = () => {
    closeQuestionEditor()
    setFeedbackMenuMessageId(null)
    setIsHistoryOpen(true)
    void refreshHistory()
  }

  const closeHistory = () => {
    setIsHistoryOpen(false)
    window.requestAnimationFrame(() => historyTriggerRef.current?.focus({ preventScroll: true }))
  }

  const openHistorySession = async (targetSessionId: string) => {
    if (!apiBase || historyActionPendingRef.current) return
    historyActionPendingRef.current = true
    stopActiveChat()
    stopBranchAction()
    stopInitialRestore()
    closeQuestionEditor()
    const controller = new AbortController()
    historyRequestRef.current?.abort()
    historyRequestRef.current = controller
    setHistoryLoadingId(targetSessionId)
    try {
      const history = await requestPublicAssistantSession({ apiBase, sessionId: targetSessionId, signal: controller.signal })
      if (historyRequestRef.current !== controller) return
      commitSessionRegistry(rememberPublicAssistantSession(sessionRegistry, targetSessionId))
      acceptAuthoritativeHistory(history)
      setInitialRestoreState('ready')
      setInitialRestoreIssue(null)
      setHistoryTruncated(history.truncated)
      setIssue(null)
      setHasNewContent(false)
      setIsHistoryOpen(false)
      focusComposer()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (historyRequestRef.current !== controller) return
      const nextIssue = toAssistantIssue(error, 'history')
      setIssue(nextIssue)
      if (nextIssue.code === 'session-not-found') {
        clearPublicAssistantSessionBrowserState(targetSessionId)
        const expiredCurrentSession = targetSessionId === sessionIdRef.current
        const withoutExpired = forgetPublicAssistantSession(sessionRegistry, targetSessionId)
        const nextRegistry = expiredCurrentSession && sessionRegistry.sessionIds.some((id) => id !== targetSessionId)
          ? rememberPublicAssistantSession(withoutExpired, createPublicAssistantSessionId())
          : withoutExpired
        if (expiredCurrentSession) {
          shouldFollowOutputRef.current = true
          setConversation(createEmptyPublicAssistantConversation())
          loadSessionBrowserState(nextRegistry.currentSessionId)
          setIsSnapshotVisible(false)
          setHasNewContent(false)
          setHistoryTruncated(false)
          setInitialRestoreState('ready')
          setInitialRestoreIssue(null)
          setIssue(null)
        }
        commitSessionRegistry(nextRegistry)
        setHistorySessions((current) => current.filter((session) => session.id !== targetSessionId))
      }
    } finally {
      if (historyRequestRef.current === controller) {
        historyRequestRef.current = null
        historyActionPendingRef.current = false
        setHistoryLoadingId(null)
      }
    }
  }

  const removeHistorySession = async (targetSessionId: string) => {
    if (!apiBase || historyActionPendingRef.current || !window.confirm(copy.history.deleteConfirm)) return
    historyActionPendingRef.current = true
    if (targetSessionId === sessionIdRef.current) {
      stopActiveChat()
      stopBranchAction()
    }
    const controller = new AbortController()
    historyRequestRef.current?.abort()
    historyRequestRef.current = controller
    setHistoryLoadingId(targetSessionId)
    try {
      await deletePublicAssistantSession({ apiBase, sessionId: targetSessionId, signal: controller.signal })
      if (historyRequestRef.current !== controller) return
      clearPublicAssistantSessionBrowserState(targetSessionId)
      let nextRegistry = forgetPublicAssistantSession(sessionRegistry, targetSessionId)
      if (targetSessionId === sessionIdRef.current) {
        stopInitialRestore()
        nextRegistry = rememberPublicAssistantSession(nextRegistry, createPublicAssistantSessionId())
        shouldFollowOutputRef.current = true
        setConversation(createEmptyPublicAssistantConversation())
        setInput('')
        resetImageAttachment()
        setMode('auto')
        setIsSnapshotVisible(false)
        setInitialRestoreState('ready')
        setInitialRestoreIssue(null)
        setHistoryTruncated(false)
      }
      commitSessionRegistry(nextRegistry)
      setHistorySessions((current) => current.filter((session) => session.id !== targetSessionId))
      setIssue(null)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (historyRequestRef.current !== controller) return
      setIssue(toAssistantIssue(error, 'history'))
    } finally {
      if (historyRequestRef.current === controller) {
        historyRequestRef.current = null
        historyActionPendingRef.current = false
        setHistoryLoadingId(null)
      }
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

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.currentTarget
    const file = fileInput.files?.[0]
    if (!file || isLoading) return
    const preparation = { sessionId: sessionIdRef.current }
    imagePreparationRef.current = preparation
    const isCurrentPreparation = () => (
      imagePreparationRef.current === preparation && sessionIdRef.current === preparation.sessionId
    )
    setIsImageProcessing(true)
    setImageIssue(null)
    try {
      const prepared = await preparePublicAssistantImage(file)
      if (!isCurrentPreparation()) return
      setImageAttachment(prepared)
      setIssue((current) => current?.scope === 'chat' ? null : current)
    } catch (error) {
      if (!isCurrentPreparation()) return
      const code = error instanceof PublicAssistantImageError ? error.code : 'decode-failed'
      setImageIssue(code === 'unsupported'
        ? copy.image.unsupported
        : code === 'source-too-large'
          ? copy.image.sourceTooLarge
          : code === 'output-too-large'
            ? copy.image.outputTooLarge
            : copy.image.unreadable)
    } finally {
      if (isCurrentPreparation()) {
        imagePreparationRef.current = null
        fileInput.value = ''
        setIsImageProcessing(false)
      }
    }
  }

  const removeImageAttachment = () => {
    resetImageAttachment()
    setIssue((current) => current?.scope === 'chat' && current.attachment ? null : current)
    window.requestAnimationFrame(() => imageAttachButtonRef.current?.focus({ preventScroll: true }))
  }

  const submitQuestion = async (
    question: string,
    requestedMode: PublicAssistantMode = mode,
    options: {
      reusePendingQuestion?: boolean
      requestId?: string
      sessionId?: string
      history?: PublicAssistantHistoryTurn[]
      pageContext?: PublicAssistantPageContext
      replaceFallbackRequestId?: string
      previousRequestId?: string
      intent?: PublicAssistantGenerationIntent
      forceAuthoritativeHistory?: boolean
      attachment?: PublicAssistantImageAttachment
    } = {},
  ) => {
    const trimmed = normalizePublicAssistantQuestion(question)
    if (!trimmed || isAssistantBusy || activeRequestRef.current || branchActionPendingRef.current || historyActionPendingRef.current || imagePreparationRef.current || !isConversationReady) return

    trackAnalyticsEvent('public_assistant_question', {
      source: 'floating-widget',
      mode: requestedMode,
      questionLength: trimmed.length,
    })

    const requestId = options.requestId ?? createPublicAssistantRequestId()
    const requestSessionId = options.sessionId ?? sessionIdRef.current
    if (requestSessionId !== sessionIdRef.current) return
    const reusablePendingQuestion = options.reusePendingQuestion === true
    const submittedDraft = input === question ? input : null
    const intent = options.intent ?? activePublicAssistantGenerationIntent(conversation)
    const forceAuthoritativeHistory = options.forceAuthoritativeHistory === true
    const historyState = intent.kind === 'answer-revision'
      ? { ...conversation, turns: conversation.turns.slice(0, conversation.turns.findIndex((turn) => turn.id === intent.turnId)) }
      : conversation
    const history = options.history ?? buildPublicAssistantConversationHistory(historyState)
    const pageContext = options.pageContext ?? readPublicAssistantPageContext()
    const attachment = options.attachment ?? imageAttachment ?? undefined
    shouldFollowOutputRef.current = true
    setHasNewContent(false)
    setIssue(null)
    setFeedbackMenuMessageId(null)
    if (options.replaceFallbackRequestId) {
      setConversation((current) => removeLocalPublicAssistantAnswer(current, options.replaceFallbackRequestId!))
    }
    if (!reusablePendingQuestion) {
      setConversation((current) => appendPendingPublicAssistantTurn(current, {
        requestId,
        question: trimmed,
        mode: requestedMode,
        ...(intent.kind === 'new-turn' ? { parentRevisionId: intent.parentRevisionId } : {}),
      }))
    } else if (options.previousRequestId) {
      setConversation((current) => retargetPendingPublicAssistantTurn(current, options.previousRequestId!, requestId))
    }
    setWaitingSeconds(0)
    setIsLoading(true)
    setProgressStage('planning')
    const controller = new AbortController()
    activeRequestRef.current = {
      controller,
      prompt: trimmed,
      mode: requestedMode,
      sessionId: requestSessionId,
      requestId,
      history,
      pageContext,
      intent,
      forceAuthoritativeHistory,
      ...(attachment ? { attachment } : {}),
    }

    let result: PublicAssistantAnswer
    let requestSucceeded = false
    let authoritativeHistory: PublicAssistantSessionHistory | null = null
    let authoritativeHistoryIssue: AssistantIssue | null = null
    let resolvedApiBase = apiBase
    try {
      const remote = await requestPublicAnswer({
        requestId,
        question: trimmed,
        mode: requestedMode,
        sessionId: requestSessionId,
        history,
        intent,
        pageContext,
        preferredApiBase: apiBase,
        signal: controller.signal,
        onProgress: (stage) => {
          if (activeRequestRef.current?.controller === controller) setProgressStage(stage)
        },
        ...(attachment ? { attachment } : {}),
      })
      if (activeRequestRef.current?.controller !== controller || sessionIdRef.current !== requestSessionId) return
      result = remote.answer
      requestSucceeded = true
      resolvedApiBase = remote.apiBase
      setApiBase(remote.apiBase)
      setServiceState(result.status === 'degraded' ? 'degraded' : 'online')
      setIssue(null)
      if (
        result.sessionId &&
        result.conversation &&
        (forceAuthoritativeHistory || result.replayed || result.conversation.activated === false)
      ) {
        try {
          authoritativeHistory = await requestPublicAssistantSession({
            apiBase: remote.apiBase,
            sessionId: result.sessionId,
            signal: controller.signal,
          })
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') throw error
          authoritativeHistoryIssue = {
            ...toAssistantIssue(error, 'history'),
            code: 'public-assistant-history-refresh-required',
          }
        }
        if (activeRequestRef.current?.controller !== controller || sessionIdRef.current !== requestSessionId) return
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (activeRequestRef.current?.controller !== controller || sessionIdRef.current !== requestSessionId) return
      const nextIssue = toAssistantIssue(error, 'chat', trimmed, requestedMode, {
        requestId,
        sessionId: requestSessionId,
        history,
        pageContext,
        intent,
        forceAuthoritativeHistory,
        ...(attachment ? { attachment } : {}),
      })
      result = {
        ...(attachment ? buildLocalImageFallbackAnswer(nextIssue.code) : buildLocalAnswer(trimmed, requestedMode, nextIssue.code)),
        requestId,
      }
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
    if (requestSucceeded && submittedDraft !== null) {
      clearPublicAssistantDraft(requestSessionId, submittedDraft)
      setInput((current) => current === submittedDraft ? '' : current)
      if (attachment && imageAttachment?.dataUrl === attachment.dataUrl) setImageAttachment(null)
    }
    if (result.sessionId) commitSessionRegistry(rememberPublicAssistantSession(sessionRegistry, result.sessionId))
    if (authoritativeHistory) {
      acceptAuthoritativeHistory(authoritativeHistory)
    } else if (!authoritativeHistoryIssue) {
      setConversation((current) => mergePublicAssistantAnswer(current, {
        answer: result,
        requestId,
        question: trimmed,
        mode: requestedMode,
        intent,
      }))
      clearPublicAssistantHistorySnapshot(requestSessionId)
    }
    if (authoritativeHistoryIssue) {
      setInitialRestoreState('error')
      setInitialRestoreIssue(authoritativeHistoryIssue)
    }
    if (resolvedApiBase) setApiBase(resolvedApiBase)
  }

  const retryIssue = () => {
    if (!issue || issueRetryBlocked || isQuestionEditing) return
    if (issue.scope === 'branch' && issue.branchAction) {
      const action = issue.branchAction
      if (issue.sessionId && issue.sessionId !== sessionIdRef.current) {
        setIssue(null)
        return
      }
      setIssue(null)
      void runBranchAction(action)
      return
    }
    if (issue.scope === 'chat' && issue.prompt) {
      const prompt = issue.prompt
      const requestedMode = issue.mode ?? mode
      const cancelled = issue.code === 'public-assistant-request-cancelled'
      const retryRequestId = cancelled ? createPublicAssistantRequestId() : issue.requestId
      setIssue(null)
      void submitQuestion(prompt, requestedMode, {
        reusePendingQuestion: true,
        ...(retryRequestId ? { requestId: retryRequestId } : {}),
        ...(cancelled && issue.requestId ? { previousRequestId: issue.requestId } : {}),
        ...(issue.sessionId ? { sessionId: issue.sessionId } : {}),
        ...(issue.history ? { history: issue.history } : {}),
        ...(issue.pageContext ? { pageContext: issue.pageContext } : {}),
        ...(issue.intent ? { intent: issue.intent } : {}),
        ...(issue.forceAuthoritativeHistory ? { forceAuthoritativeHistory: true } : {}),
        ...(issue.attachment ? { attachment: issue.attachment } : {}),
        ...(!cancelled && issue.requestId ? { replaceFallbackRequestId: issue.requestId } : {}),
      })
      return
    }
    if (issue.scope === 'history') {
      setIssue(null)
      setIsHistoryOpen(true)
      void refreshHistory()
      return
    }
    setIssue(null)
    retryWarmup()
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
    if (!apiBase || !isWarmupReady || !isConversationReady || isSnapshotVisible || !message.sessionId || !message.revisionId || message.feedbackPending) return
    setConversation((current) => updatePublicAssistantRevisionFeedback(current, message.revisionId!, {
      feedback: message.feedback ?? null,
      feedbackPending: true,
      feedbackError: false,
    }))
    try {
      await submitPublicAssistantFeedback({
        apiBase,
        sessionId: message.sessionId,
        revisionId: message.revisionId,
        rating,
        reason,
      })
      setConversation((current) => updatePublicAssistantRevisionFeedback(current, message.revisionId!, {
        feedback: rating,
        feedbackPending: false,
        feedbackError: false,
      }))
      if (rating === 'down') {
        closeFeedbackMenuAndRestoreFocus(message.id)
      } else {
        setFeedbackMenuMessageId((current) => current === message.id ? null : current)
      }
    } catch {
      setConversation((current) => updatePublicAssistantRevisionFeedback(current, message.revisionId!, {
        feedback: message.feedback ?? null,
        feedbackPending: false,
        feedbackError: true,
      }))
      if (rating === 'down') {
        setFeedbackFocusRequest((current) => ({ messageId: message.id, sequence: (current?.sequence ?? 0) + 1 }))
      }
    }
  }

  const navigateRevision = (message: WidgetMessage, direction: -1 | 1) => {
    if (!message.turnId || !message.revisionId) return
    const turn = conversation.turns.find((item) => item.id === message.turnId)
    if (!turn) return
    const currentIndex = turn.revisions.findIndex((revision) => revision.id === message.revisionId)
    const next = turn.revisions[currentIndex + direction]
    if (!next) return
    setFeedbackMenuMessageId(null)
    setConversation((current) => selectViewedPublicAssistantRevision(current, turn.id, next.id))
  }

  const regenerateAnswer = (message: WidgetMessage) => {
    if (!message.turnId || !message.revisionId || !message.prompt || !message.requestMode || !conversation.activeBranchId) return
    void submitQuestion(message.prompt, message.requestMode, {
      reusePendingQuestion: true,
      intent: {
        kind: 'answer-revision',
        branchId: conversation.activeBranchId,
        turnId: message.turnId,
        baseRevisionId: message.revisionId,
      },
    })
  }

  const startEditingQuestion = (message: WidgetMessage) => {
    if (!message.turnId || !isConversationReady || isAssistantBusy || isQuestionEditing) return
    const request = createPublicAssistantQuestionEditRequest(conversation, message.turnId)
    if (!request) return
    setFeedbackMenuMessageId(null)
    setMode(request.mode)
    setEditingTurnId(message.turnId)
    setEditingQuestion(request.question)
  }

  const resendEditedQuestion = () => {
    if (!editingTurnId || !isConversationReady || !isWarmupReady || isAssistantBusy || activeRequestRef.current) return
    const request = createPublicAssistantQuestionEditRequest(conversation, editingTurnId)
    if (!request) return
    const nextQuestion = normalizePublicAssistantQuestion(editingQuestion)
    if (!nextQuestion) return
    closeQuestionEditor()
    void submitQuestion(nextQuestion, mode, {
      history: request.history,
      intent: request.intent,
      forceAuthoritativeHistory: true,
    })
  }

  const runBranchAction = async (action: PublicAssistantBranchAction) => {
    if (!apiBase || !isWarmupReady || !isConversationReady || isSnapshotVisible || branchActionPendingRef.current || historyActionPendingRef.current || isLoading || isQuestionEditing) return
    const controller = new AbortController()
    const requestSessionId = sessionIdRef.current
    branchActionPendingRef.current = true
    branchActionRequestRef.current = controller
    setBranchActionPending(true)
    try {
      const history = await requestPublicAssistantBranch({
        apiBase,
        sessionId: requestSessionId,
        signal: controller.signal,
        ...action,
      })
      if (branchActionRequestRef.current !== controller || sessionIdRef.current !== requestSessionId) return
      acceptAuthoritativeHistory(history)
      setIssue((current) => current?.scope === 'branch' ? null : current)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (branchActionRequestRef.current !== controller || sessionIdRef.current !== requestSessionId) return
      setIssue({
        ...toAssistantIssue(error, 'branch'),
        sessionId: requestSessionId,
        branchAction: action,
      })
    } finally {
      if (branchActionRequestRef.current === controller) {
        branchActionRequestRef.current = null
        branchActionPendingRef.current = false
        setBranchActionPending(false)
      }
    }
  }

  const latestSuggestions = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.suggestions?.length)?.suggestions
  const routeSuggestions = getPublicAssistantSuggestions(pathname)

  return (
    <div
      ref={rootRef}
      lang={SITE_LANGUAGE_TAGS[language]}
      className={`public-assistant ${isOpen ? 'is-open' : ''} ${isOpen && isFullscreen ? 'is-fullscreen' : ''} ${footerVisible ? 'is-footer-visible' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`public-assistant__trigger is-${warmup.state}`}
        aria-expanded={isOpen}
        aria-controls="public-assistant-panel"
        aria-label={launcherLabel}
        onClick={toggleWidget}
      >
        <span className="public-assistant__trigger-mark" aria-hidden="true">
          {warmup.state === 'warming' ? <LoaderCircle className="is-spinning" size={15} /> : 'B'}
        </span>
        <span className="public-assistant__trigger-text">{launcherLabel}</span>
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
              <p className="public-assistant__eyebrow">{copy.eyebrow.publicResearch}</p>
              <h2 id="public-assistant-title" lang="">{PUBLIC_ASSISTANT_NAME}</h2>
              <span className={`public-assistant__status ${serviceStatus.className}`}>{serviceStatus.label}</span>
            </div>
            <div className="public-assistant__header-actions" aria-label={copy.history.actions}>
              <button
                ref={historyTriggerRef}
                type="button"
                onClick={openHistory}
                disabled={!isWarmupReady}
                aria-label={copy.history.open}
                title={copy.history.title}
              >
                <History size={18} aria-hidden />
              </button>
              <button type="button" onClick={startNewConversation} aria-label={copy.history.newSession} title={copy.history.newSession}>
                <MessageSquarePlus size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="public-assistant__fullscreen-toggle"
                onClick={() => setIsFullscreen((current) => !current)}
                aria-label={isFullscreen ? copy.fullscreen.exit : copy.fullscreen.enter}
                title={isFullscreen ? copy.fullscreen.exit : copy.fullscreen.enter}
              >
                {isFullscreen ? <Minimize2 size={18} aria-hidden /> : <Maximize2 size={18} aria-hidden />}
              </button>
              <button ref={closeButtonRef} type="button" onClick={closeWidget} aria-label={copy.closeAssistant} title={copy.close}>
                <X size={18} aria-hidden />
              </button>
            </div>
          </header>

          {isHistoryOpen && (
            <>
              <button
                type="button"
                className="public-assistant__history-backdrop"
                aria-label={copy.history.close}
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
                    <p className="public-assistant__eyebrow">{copy.eyebrow.recentSessions}</p>
                    <h3 id="public-assistant-history-title">{copy.history.title}</h3>
                  </div>
                  <button ref={historyCloseRef} type="button" onClick={closeHistory} aria-label={copy.history.back} title={copy.history.backTitle}>
                    <X size={18} aria-hidden />
                  </button>
                </header>
                <button type="button" className="public-assistant__history-new" onClick={startNewConversation}>
                  <MessageSquarePlus size={17} aria-hidden />
                  <span>{copy.history.newSession}</span>
                </button>
                <div className="public-assistant__history-list">
                  {historyState === 'loading' && (
                    <div className="public-assistant__history-state" role="status">
                      <LoaderCircle className="is-spinning" size={16} aria-hidden />
                      <span>{copy.history.loading}</span>
                    </div>
                  )}
                  {historyState === 'error' && (
                    <div className="public-assistant__history-state" role="status">
                      <strong>{issueCopy?.title ?? copy.history.unavailable}</strong>
                      <span>{issueCopy?.detail ?? copy.history.retryDetail}</span>
                      <button type="button" onClick={retryHistory} disabled={issueRetryBlocked}>
                        <RefreshCw size={15} aria-hidden />
                        <span>{getAssistantRetryLabel(issue, copy.retry, copy)}</span>
                      </button>
                    </div>
                  )}
                  {historyState === 'ready' && historySessions.length === 0 && (
                    <div className="public-assistant__history-state">
                      <strong>{copy.history.emptyTitle}</strong>
                      <span>{copy.history.emptyDetail}</span>
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
                        <strong lang="">{session.title}</strong>
                        <span lang="">{copy.history.turns(session.turnCount)} · {formatSessionDate(session.lastActiveAt, language)}</span>
                      </button>
                      <button
                        type="button"
                        className="public-assistant__history-delete"
                        disabled={historyLoadingId !== null}
                        onClick={() => void removeHistorySession(session.id)}
                        aria-label={copy.history.deleteLabel(session.title)}
                        title={copy.history.delete}
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

          <p className="public-assistant__hint">{copy.hint}</p>

          {conversation.branches.length > 0 && conversation.activeBranchId && (
            <label className="public-assistant__branch-picker">
              <GitBranch size={15} aria-hidden />
              <span className="sr-only">{copy.branch.current}</span>
              <select
                value={conversation.activeBranchId}
                disabled={!isConversationReady || isSnapshotVisible || isAssistantBusy || branchActionPending || isQuestionEditing}
                onChange={(event) => void runBranchAction({ action: 'select', branchId: event.target.value })}
              >
                {conversation.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {copy.branch.option(branch.ordinal, branch.turnCount, branch.hasEarlierTurns, branch.preview)}
                  </option>
                ))}
              </select>
              {(conversation.branchesTruncated || conversation.revisionsTruncated) && (
                <span className="public-assistant__branch-disclosure" role="note">
                  {conversation.branchesTruncated && <span>{copy.branch.earlier}</span>}
                  {conversation.revisionsTruncated && <span>{copy.branch.revisions}</span>}
                </span>
              )}
            </label>
          )}

          <details className="public-assistant__modes">
            <summary>
              <SlidersHorizontal size={15} aria-hidden />
              <span>{copy.advanced}</span>
              <small>{copy.modes[mode]}</small>
            </summary>
            <label>
              <span>{copy.scope}</span>
              <select
                aria-label={copy.scope}
                value={mode}
                disabled={isAssistantBusy}
                onChange={(event) => {
                  const nextMode = event.target.value
                  if (nextMode === 'auto' || nextMode === 'site' || nextMode === 'web') setMode(nextMode)
                }}
              >
                {Object.entries(copy.modes).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </details>

          <div
            className="public-assistant__messages"
            ref={scrollRef}
            role="log"
            aria-label={copy.transcript}
            aria-busy={isAssistantBusy}
            aria-live="off"
            onScroll={handleMessagesScroll}
          >
            {messages.length === 0 && isConversationReady && isWarmupReady && !isLoading && (
              <div className="public-assistant__empty">
                <strong>{copy.empty.title}</strong>
                <span>{copy.empty.detail}</span>
              </div>
            )}

            {warmup.state === 'warming' && (
              <div className="public-assistant__notice public-assistant__notice--warmup" data-assistant-warmup="warming">
                <LoaderCircle className="is-spinning" size={16} aria-hidden />
                <div>
                  <strong>{copy.warmup.title}</strong>
                  <span>{copy.warmup.detail}</span>
                </div>
              </div>
            )}

            {warmup.state === 'error' && warmupIssue && (
              <div className="public-assistant__notice public-assistant__notice--warmup" data-assistant-warmup="error">
                <div>
                  <strong>{warmupIssueCopy?.title ?? copy.warmup.unavailable}</strong>
                  <span>{warmupIssueCopy?.detail ?? copy.warmup.detail}</span>
                </div>
                <button
                  type="button"
                  onClick={retryWarmup}
                  disabled={!isOnline}
                >
                  <RefreshCw size={15} aria-hidden />
                  <span>{copy.warmup.retry}</span>
                </button>
              </div>
            )}

            {isRestoringSession && isWarmupReady && (
              <div className="public-assistant__loading" role="status">
                <LoaderCircle className="is-spinning" size={15} aria-hidden />
                <span>{copy.restoring}</span>
              </div>
            )}

            {isSnapshotVisible && (
              <div className="public-assistant__continuity-note public-assistant__continuity-note--snapshot" role="status">
                <History size={14} aria-hidden />
                <span>{copy.snapshot}</span>
              </div>
            )}

            {initialRestoreState === 'error' && (
              <div className="public-assistant__notice public-assistant__notice--restore" role="status">
                <div>
                    <strong>{initialRestoreIssueCopy?.title ?? copy.restore.title}</strong>
                    <span>{initialRestoreIssueCopy?.detail ?? copy.restore.detail}</span>
                </div>
                <div className="public-assistant__notice-actions">
                  <button type="button" onClick={retryInitialRestore} disabled={initialRestoreRetryBlocked}>
                    <RefreshCw size={15} aria-hidden />
                    <span>{getAssistantRetryLabel(initialRestoreIssue, copy.retryRestore, copy)}</span>
                  </button>
                  <button type="button" onClick={startNewConversation}>
                    <MessageSquarePlus size={15} aria-hidden />
                    <span>{copy.history.newSession}</span>
                  </button>
                </div>
              </div>
            )}

            {historyTruncated && (
              <div className="public-assistant__continuity-note" role="status">
                <History size={14} aria-hidden />
                <span>{copy.truncated}</span>
              </div>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`public-assistant__message is-${message.role} ${editingTurnId === message.turnId ? 'is-editing' : ''}`}
              >
                {message.role === 'assistant'
                  ? <PublicAssistantMessageContent content={message.content} />
                  : editingTurnId === message.turnId
                    ? (
                        <form
                          className="public-assistant__question-editor"
                          onSubmit={(event) => {
                            event.preventDefault()
                            resendEditedQuestion()
                          }}
                        >
                          <label className="sr-only" htmlFor={`public-assistant-edit-${message.turnId}`}>{copy.question.editContent}</label>
                          <textarea
                            ref={editTextareaRef}
                            id={`public-assistant-edit-${message.turnId}`}
                            rows={3}
                            maxLength={MAX_MESSAGE_LENGTH}
                            value={editingQuestion}
                            onChange={(event) => setEditingQuestion(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                event.preventDefault()
                                resendEditedQuestion()
                              }
                            }}
                          />
                          <div className="public-assistant__question-editor-actions">
                            <button type="button" onClick={() => closeQuestionEditor(true)}>
                              <X size={15} aria-hidden />
                              <span>{copy.question.cancel}</span>
                            </button>
                            <button
                              type="submit"
                              className="is-primary"
                              disabled={
                                isAssistantBusy ||
                                normalizePublicAssistantQuestion(editingQuestion).length === 0
                              }
                            >
                              <Send size={15} aria-hidden />
                              <span>
                                {normalizePublicAssistantQuestion(editingQuestion) === normalizePublicAssistantQuestion(message.content)
                                  ? copy.question.resend
                                  : copy.question.sendEdit}
                              </span>
                            </button>
                          </div>
                        </form>
                      )
                    : (
                        <>
                          <p lang="">{message.content}</p>
                          {message.turnId && (
                            <div className="public-assistant__user-message-actions" aria-label={copy.question.actions}>
                              <button
                                ref={(element) => {
                                  if (element) editTriggerRefs.current.set(message.turnId!, element)
                                  else editTriggerRefs.current.delete(message.turnId!)
                                }}
                                type="button"
                                onClick={() => startEditingQuestion(message)}
                                disabled={isAssistantBusy || isQuestionEditing}
                                aria-label={copy.question.edit}
                                title={copy.question.editTitle}
                              >
                                <Pencil size={15} aria-hidden />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                {message.role === 'assistant' && (
                  <>
                    {((message.meta && formatAnswerMeta(message, copy, language)) || (message.claims?.length ?? 0) > 0 || (message.citations?.length ?? 0) > 0) && (
                      <details
                        className="public-assistant__evidence"
                        open={!isMobileSurfaceViewport() || expandedEvidenceIds.has(message.id)}
                        onToggle={(event) => {
                          const open = event.currentTarget.open
                          setExpandedEvidenceIds((current) => {
                            const next = new Set(current)
                            if (open) next.add(message.id)
                            else next.delete(message.id)
                            return next
                          })
                        }}
                      >
                        <summary>{copy.evidence.summary(message.citations?.length ?? 0)}</summary>
                        {message.meta && <small className="public-assistant__meta">{formatAnswerMeta(message, copy, language)}</small>}

                    {message.claims && message.claims.length > 0 && (
                      <details className="public-assistant__claims">
                        <summary>{copy.evidence.claims(message.claims.length)}</summary>
                        <ol>
                          {message.claims.map((claim) => {
                            const linkedCitations = claim.citationIds
                              .map((citationId) => ({
                                citationId,
                                index: message.citations?.findIndex((citation) => citation.id === citationId) ?? -1,
                              }))
                              .filter((entry) => entry.index >= 0)
                            return (
                              <li key={claim.id}>
                                <span lang="">{claim.text}</span>
                                {linkedCitations.length > 0 && (
                                  <div className="public-assistant__claim-sources" aria-label={copy.evidence.claimSources}>
                                    {linkedCitations.map((entry) => (
                                      <button
                                        key={entry.citationId}
                                        type="button"
                                        aria-controls={citationElementId(message.id, entry.index)}
                                        aria-label={copy.evidence.locate(message.citations?.[entry.index]?.title ?? entry.citationId)}
                                        onClick={() => focusCitation(message, entry.citationId)}
                                      >
                                        {entry.citationId}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ol>
                      </details>
                    )}

                    {message.citations && message.citations.length > 0 && (
                      <div className="public-assistant__citations" aria-label={copy.evidence.sources}>
                        {message.citations.map((citation, index) => {
                          const key = citationKey(message.id, citation.id)
                          const elementId = citationElementId(message.id, index)
                          const className = `public-assistant__citation ${highlightedCitationKey === key ? 'is-highlighted' : ''}`
                          const registerCitation = (element: HTMLAnchorElement | null) => {
                            if (element) citationRefs.current.set(key, element)
                            else citationRefs.current.delete(key)
                          }
                          const publishedLabel = formatCitationDate(citation.publishedAt, language)
                          const content = (
                            <>
                              <span className="public-assistant__citation-kicker">
                                {citation.source === 'web' ? copy.evidence.web : copy.evidence.site} · <span lang="">{citation.id || copy.evidence.fallbackId(index + 1)}</span>
                              </span>
                              <strong lang="">{citation.title}</strong>
                              <span className="public-assistant__citation-meta">
                                <span lang="">{citation.section}</span>
                                {publishedLabel && <time dateTime={citation.publishedAt ?? undefined}>{publishedLabel}</time>}
                                <span className={`is-${citation.evidenceStatus}`}>
                                  {citation.evidenceStatus === 'verified' ? copy.evidence.verified : copy.evidence.partial}
                                </span>
                              </span>
                              <span lang="">{citation.excerpt || citation.summary}</span>
                              {citation.source === 'web' && <ExternalLink size={13} aria-hidden />}
                            </>
                          )
                          return citation.source === 'web' ? (
                            <a
                              key={citation.id}
                              id={elementId}
                              ref={registerCitation}
                              href={citation.href}
                              className={className}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={copy.evidence.openWeb(citation.title)}
                            >
                              {content}
                            </a>
                          ) : (
                            <Link
                              key={citation.id}
                              id={elementId}
                              ref={registerCitation}
                              to={citation.href}
                              className={className}
                              onClick={prepareInternalCitationNavigation}
                              aria-label={copy.evidence.openSite(citation.title)}
                            >
                              {content}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                      </details>
                    )}

                    {message.revisionId && message.revisionNo && message.revisionCount && (
                      <div className="public-assistant__revision-toolbar" aria-label={copy.revision.label}>
                        <div className="public-assistant__revision-nav">
                          <button
                            type="button"
                            onClick={() => navigateRevision(message, -1)}
                            disabled={message.revisionNo <= 1 || isAssistantBusy || isQuestionEditing}
                            aria-label={copy.revision.previous}
                            title={copy.revision.previousTitle}
                          >
                            <ChevronLeft size={15} aria-hidden />
                          </button>
                          <span>{message.revisionNo} / {message.revisionCount}</span>
                          <button
                            type="button"
                            onClick={() => navigateRevision(message, 1)}
                            disabled={message.revisionNo >= message.revisionCount || isAssistantBusy || isQuestionEditing}
                            aria-label={copy.revision.next}
                            title={copy.revision.nextTitle}
                          >
                            <ChevronRight size={15} aria-hidden />
                          </button>
                        </div>
                        {!message.isActiveRevision && (
                          <button
                            type="button"
                            className="public-assistant__continue-version"
                            onClick={() => void runBranchAction({
                              action: 'continue-from-revision',
                              revisionId: message.revisionId!,
                            })}
                            disabled={!isConversationReady || isSnapshotVisible || isAssistantBusy || branchActionPending || isQuestionEditing}
                          >
                            <GitBranch size={14} aria-hidden />
                            <span>{copy.revision.continue}</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="public-assistant__message-actions" aria-label={copy.answer.actions}>
                      <button
                        type="button"
                        onClick={() => void copyAnswer(message)}
                        aria-label={copiedMessageId === message.id ? copy.answer.copied : copy.answer.copy}
                        title={copiedMessageId === message.id ? copy.answer.copiedTitle : copy.answer.copy}
                      >
                        {copiedMessageId === message.id ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                      </button>
                      {message.prompt && message.requestMode && message.revisionId && (
                        <button
                          type="button"
                          onClick={() => regenerateAnswer(message)}
                          disabled={!isConversationReady || isSnapshotVisible || isAssistantBusy || isQuestionEditing}
                          aria-label={copy.answer.regenerate}
                          title={copy.answer.regenerateTitle}
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
                            disabled={message.feedbackPending || !isWarmupReady || !isConversationReady || isSnapshotVisible}
                            aria-label={copy.answer.helpful}
                            aria-pressed={message.feedback === 'up'}
                            title={copy.answer.helpfulTitle}
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
                            disabled={message.feedbackPending || !isWarmupReady || !isConversationReady || isSnapshotVisible}
                            aria-label={copy.answer.improve}
                            aria-pressed={message.feedback === 'down'}
                            aria-expanded={feedbackMenuMessageId === message.id}
                            aria-controls={`public-assistant-feedback-${message.id}`}
                            title={copy.answer.improveTitle}
                          >
                            <ThumbsDown size={15} aria-hidden />
                          </button>
                        </>
                      )}
                      {message.feedbackError && <span role="status">{copy.answer.feedbackFailed}</span>}
                    </div>
                    {feedbackMenuMessageId === message.id && (
                      <div
                        className="public-assistant__feedback-reasons"
                        id={`public-assistant-feedback-${message.id}`}
                        role="group"
                        aria-label={copy.answer.feedbackGroup}
                      >
                        <span>{copy.answer.feedbackPrompt}</span>
                        <div>
                          {(Object.entries(copy.feedbackReasons) as Array<[NegativeFeedbackReason, string]>).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={message.feedbackPending || !isWarmupReady || !isConversationReady || isSnapshotVisible}
                              onClick={() => void sendFeedback(message, 'down', value)}
                            >
                              {label}
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
                <span>{getLoadingLabel(mode, progressStage, copy)}</span>
                {waitingSeconds >= 8 && (
                  <span className="public-assistant__loading-elapsed" aria-hidden>{copy.seconds(waitingSeconds)}</span>
                )}
              </div>
            )}

            {issue && issue.scope !== 'history' && (
              <div className="public-assistant__notice" role="status">
                <div>
                  <strong>{issueCopy?.title}</strong>
                  <span>{issueCopy?.detail}</span>
                </div>
                <button type="button" onClick={retryIssue} disabled={isAssistantBusy || isQuestionEditing || issueRetryBlocked}>
                  <RefreshCw size={15} aria-hidden />
                  <span>{getAssistantRetryLabel(issue, issue.scope === 'branch' ? copy.retryAction : copy.retry, copy)}</span>
                </button>
              </div>
            )}

            {hasNewContent && (
              <button type="button" className="public-assistant__latest" onClick={scrollToLatest}>
                <ArrowDown size={15} aria-hidden />
                <span>{copy.latest}</span>
              </button>
            )}
          </div>

          <span className="sr-only" aria-live="polite">
            {warmup.state === 'warming'
              ? copy.live.warming
              : warmup.state === 'error'
                ? copy.live.error
                : isRestoringSession
                  ? copy.live.restoring
              : isLoading
              ? copy.live.loading
              : issue?.code === 'public-assistant-request-cancelled'
                ? copy.live.cancelled
                : messages.at(-1)?.role === 'assistant' ? copy.live.completed : ''}
          </span>

          <div className="public-assistant__suggestions" aria-label={copy.suggestions}>
            {(latestSuggestions?.map((suggestion) => ({ id: suggestion, label: suggestion, prompt: suggestion }))
              ?? routeSuggestions).slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="public-assistant__suggestion"
                disabled={isAssistantBusy || isQuestionEditing || !isConversationReady}
                onClick={() => void submitQuestion(suggestion.prompt)}
              >
                <span lang="">{suggestion.label}</span>
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
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={handleImageSelection}
            />
            {imageAttachment && (
              <div className="public-assistant__image-preview">
                <img src={imageAttachment.dataUrl} alt={copy.image.preview} />
                <div>
                  <strong>{imageAttachment.name}</strong>
                  <span>{copy.image.use}</span>
                </div>
                <button type="button" onClick={removeImageAttachment} aria-label={copy.image.remove} title={copy.image.remove}>
                  <X size={15} aria-hidden />
                </button>
              </div>
            )}
            {imageIssue && <p className="public-assistant__image-issue" role="alert">{imageIssue}</p>}
            <button
              ref={imageAttachButtonRef}
              type="button"
              className="is-attach"
              disabled={isAssistantBusy || isQuestionEditing || !isConversationReady}
              onClick={() => imageInputRef.current?.click()}
              aria-label={imageAttachment ? copy.image.replace : copy.image.add}
              title={imageAttachment ? copy.image.replace : copy.image.add}
            >
              {isImageProcessing ? <LoaderCircle className="spin" size={17} aria-hidden /> : <ImagePlus size={17} aria-hidden />}
            </button>
            <label className="sr-only" htmlFor="public-assistant-input">{copy.composer.label}</label>
            <textarea
              ref={inputRef}
              id="public-assistant-input"
              rows={2}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={isQuestionEditing || (isWarmupReady && !isConversationReady)}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  void submitQuestion(input)
                }
              }}
              placeholder={copy.composer.placeholder}
            />
            {isLoading ? (
              <button
                type="button"
                className="is-stop"
                onClick={(event) => {
                  event.preventDefault()
                  cancelActiveChat()
                }}
                aria-label={copy.composer.stopLabel}
              >
                <Square size={15} fill="currentColor" aria-hidden />
                <span>{copy.composer.stop}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isAssistantBusy || !isConversationReady || isQuestionEditing || input.trim().length === 0}
                aria-label={copy.composer.sendLabel}
              >
                <Send size={16} aria-hidden />
                <span>{copy.composer.send}</span>
              </button>
            )}
          </form>
        </section>
      )}
    </div>
  )
}
