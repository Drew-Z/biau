import { useEffect, useRef, useState } from 'react'
import { IconClose, IconSend } from '@douyinfe/semi-icons'
import { Link } from 'react-router-dom'
import {
  publicAssistantSuggestions,
  normalizeAssistantCitations,
  searchPublicKnowledge,
  type AssistantKnowledgeItem,
} from '../data/assistant'
import { trackAnalyticsEvent } from '../utils/analytics'

interface WidgetMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AssistantKnowledgeItem[]
  meta?: AssistantAnswerMeta
}

interface AssistantAnswerMeta {
  mode: 'model' | 'fallback'
  model: string
  provider?: string
  reason?: AssistantFallbackReason
  diagnostic?: ProviderDiagnostic
  citationCount: number
}

type AssistantFallbackReason = 'not_configured' | 'provider_error' | 'empty_response' | 'no_public_context' | 'request_error'
type ProviderDiagnosticKind = 'timeout' | 'network_error' | 'http_status' | 'empty_response'
type AssistantServiceState = 'api-ready' | 'local' | 'model' | 'fallback' | 'error'

interface ProviderDiagnostic {
  kind: ProviderDiagnosticKind
  httpStatus?: number
  attemptedEndpoints: number
  timeoutMs: number
}

const CONFIGURED_API_BASE = import.meta.env.VITE_CHAT_API_BASE_URL?.trim().replace(/\/+$/, '')
const SAME_ORIGIN_API_BASE = '/api'
const MAX_MESSAGE_LENGTH = 500
const MAX_MODEL_ANSWER_LENGTH = 620
const MAX_FALLBACK_ANSWER_LENGTH = 360

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

interface PublicAnswerResult {
  content: string
  citations: AssistantKnowledgeItem[]
  meta: AssistantAnswerMeta
}

function isAssistantFallbackReason(value: unknown): value is AssistantFallbackReason {
  return value === 'not_configured' || value === 'provider_error' || value === 'empty_response' || value === 'no_public_context'
}

function isProviderDiagnosticKind(value: unknown): value is ProviderDiagnosticKind {
  return value === 'timeout' || value === 'network_error' || value === 'http_status' || value === 'empty_response'
}

function readProviderDiagnostic(value: unknown): ProviderDiagnostic | undefined {
  if (!isRecord(value) || !isProviderDiagnosticKind(value.kind)) return undefined
  const attemptedEndpoints =
    typeof value.attemptedEndpoints === 'number' && Number.isFinite(value.attemptedEndpoints)
      ? Math.max(0, Math.floor(value.attemptedEndpoints))
      : 0
  const timeoutMs =
    typeof value.timeoutMs === 'number' && Number.isFinite(value.timeoutMs) ? Math.max(0, Math.floor(value.timeoutMs)) : 0
  const httpStatus =
    typeof value.httpStatus === 'number' && Number.isFinite(value.httpStatus) ? Math.floor(value.httpStatus) : undefined
  return {
    kind: value.kind,
    httpStatus,
    attemptedEndpoints,
    timeoutMs,
  }
}

function formatProviderDiagnostic(diagnostic?: ProviderDiagnostic) {
  if (!diagnostic) return ''
  if (diagnostic.kind === 'timeout') return `模型超时 ${Math.round(diagnostic.timeoutMs / 1000)}s`
  if (diagnostic.kind === 'network_error') return '模型端点不可达'
  if (diagnostic.kind === 'empty_response') return '模型空响应'
  if (diagnostic.kind === 'http_status') return diagnostic.httpStatus ? `模型 HTTP ${diagnostic.httpStatus}` : '模型 HTTP 异常'
  return ''
}

function compactSummary(summary: string, maxLength = 104) {
  const normalized = summary.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function compactAnswerContent(content: string, maxLength: number) {
  const normalized = content
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trim()}…`
}

function getFallbackIntro(reason?: AssistantFallbackReason) {
  if (reason === 'provider_error') return '模型通道暂时失败，我先用站内公开资料给你一个方向：'
  if (reason === 'empty_response') return '模型没有返回有效内容，我先用站内公开资料给你一个方向：'
  if (reason === 'request_error') return '公开助手 API 暂时不可用，我先用本地公开知识给你一个方向：'
  if (reason === 'no_public_context') return '这个问题暂时没有命中公开资料。'
  return '模型还没有接入当前公开助手，我先用站内公开资料给你一个方向：'
}

function buildLocalKnowledgeAnswer(citations: AssistantKnowledgeItem[], reason?: AssistantFallbackReason) {
  if (citations.length === 0) {
    return `${getFallbackIntro(reason)}我不会补造结论；可以换成项目名、技术词，或先看项目页与状态页。`
  }

  const lines = citations.slice(0, 3).map((item) => `- ${item.title}：${compactSummary(item.summary)}`)
  return compactAnswerContent(`${getFallbackIntro(reason)}\n${lines.join('\n')}\n可以点下面来源继续看。`, MAX_FALLBACK_ANSWER_LENGTH)
}

async function requestPublicAnswer(question: string, apiBase: string | null): Promise<PublicAnswerResult> {
  if (!apiBase) {
    const citations = searchPublicKnowledge(question)
    return {
      content: buildLocalKnowledgeAnswer(citations),
      citations,
      meta: {
        mode: 'fallback' as const,
        model: 'local-public-knowledge',
        provider: 'browser-local',
        reason: 'not_configured',
        citationCount: citations.length,
      },
    }
  }

  const response = await fetch(`${apiBase}/chat/public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question }),
  })

  if (!response.ok) {
    throw new Error('public-chat-request-failed')
  }

  const payload = (await response.json()) as unknown
  const answer = isRecord(payload) && typeof payload.answer === 'string' ? payload.answer.trim() : ''
  const citations = isRecord(payload) ? normalizeAssistantCitations(payload.citations) : []
  const rawMeta = isRecord(payload) && isRecord(payload.meta) ? payload.meta : undefined
  const mode: AssistantAnswerMeta['mode'] = rawMeta?.mode === 'model' ? 'model' : 'fallback'
  const model = typeof rawMeta?.model === 'string' && rawMeta.model.trim() ? rawMeta.model.trim() : mode
  const provider = typeof rawMeta?.provider === 'string' && rawMeta.provider.trim() ? rawMeta.provider.trim() : undefined
  const reason = isAssistantFallbackReason(rawMeta?.reason) ? rawMeta.reason : undefined
  const diagnostic = readProviderDiagnostic(rawMeta?.diagnostic)
  const citationCount = typeof rawMeta?.citationCount === 'number' ? rawMeta.citationCount : citations.length

  const fallbackContent = buildLocalKnowledgeAnswer(citations, reason)
  const displayContent =
    mode === 'model'
      ? compactAnswerContent(
          answer || '公开助手暂时没有返回内容。你可以稍后重试，或者先去项目页和知识库查看详细资料。',
          MAX_MODEL_ANSWER_LENGTH,
        )
      : fallbackContent

  return {
    content: displayContent,
    citations,
    meta: {
      mode,
      model,
      provider,
      reason,
      diagnostic,
      citationCount,
    },
  }
}

function getFallbackLabel(reason?: AssistantFallbackReason) {
  if (reason === 'provider_error') return '模型通道失败，已回退'
  if (reason === 'empty_response') return '模型无内容，已回退'
  if (reason === 'no_public_context') return '未命中公开资料'
  if (reason === 'request_error') return '站内 API 暂不可用'
  return '站点知识兜底'
}

function formatAnswerMeta(meta?: AssistantAnswerMeta) {
  if (!meta) return ''
  const modeLabel = meta.mode === 'model' ? '模型增强' : getFallbackLabel(meta.reason)
  const diagnosticLabel = formatProviderDiagnostic(meta.diagnostic)
  const citationLabel = meta.citationCount > 0 ? `${meta.citationCount} 条来源` : '暂无来源'
  return [modeLabel, diagnosticLabel, citationLabel].filter(Boolean).join(' · ')
}

function getServiceStatus(state: AssistantServiceState) {
  if (state === 'model') return { className: 'is-model', label: '模型增强在线' }
  if (state === 'error') return { className: 'is-error', label: 'API 未接入，未连接模型' }
  if (state === 'fallback') return { className: 'is-fallback', label: 'API 在线，未接模型' }
  if (state === 'api-ready') return { className: 'is-ready', label: '检查模型状态' }
  return { className: 'is-local', label: '未连接模型，本地知识' }
}

export function PublicAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [apiBase, setApiBase] = useState<string | null>(CONFIGURED_API_BASE || null)
  const [serviceState, setServiceState] = useState<AssistantServiceState>(CONFIGURED_API_BASE ? 'api-ready' : 'local')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messageSeq = useRef(0)
  const serviceStatus = getServiceStatus(serviceState)

  const createMessageId = (role: WidgetMessage['role']) => {
    messageSeq.current += 1
    return `public-${role}-${messageSeq.current}`
  }

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isOpen])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const candidateApiBase = CONFIGURED_API_BASE || SAME_ORIGIN_API_BASE

    async function refreshServiceHealth() {
      try {
        const response = await fetch(`${candidateApiBase}/health`)
        if (!response.ok) throw new Error('assistant-health-failed')
        const payload = (await response.json()) as unknown
        const model = isRecord(payload) && typeof payload.model === 'string' ? payload.model.trim() : ''
        const mode = isRecord(payload) && typeof payload.mode === 'string' ? payload.mode.trim() : ''
        const modelConfigured = isRecord(payload) && payload.modelConfigured === true
        if (!cancelled) {
          setApiBase(candidateApiBase)
          setServiceState(mode === 'model' || modelConfigured || (model && model !== 'fallback') ? 'model' : 'fallback')
        }
      } catch {
        if (!cancelled) {
          setApiBase(CONFIGURED_API_BASE || null)
          setServiceState(CONFIGURED_API_BASE ? 'error' : 'local')
        }
      }
    }

    void refreshServiceHealth()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const toggleWidget = () => {
    if (!isOpen) {
      trackAnalyticsEvent('public_assistant_open', {
        source: 'floating-widget',
      })
    }
    setIsOpen((value) => !value)
  }

  const submitQuestion = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || isLoading) return

    trackAnalyticsEvent('public_assistant_question', {
      source: 'floating-widget',
      questionLength: Math.min(trimmed.length, MAX_MESSAGE_LENGTH),
    })

    const userMessage: WidgetMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: trimmed.slice(0, MAX_MESSAGE_LENGTH),
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const result = await requestPublicAnswer(trimmed, apiBase)
      setServiceState(result.meta.mode === 'model' ? 'model' : apiBase ? 'fallback' : 'local')
      setMessages((current) => [
        ...current,
        {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: result.content,
          citations: result.citations,
          meta: result.meta,
        },
      ])
    } catch {
      const citations = searchPublicKnowledge(trimmed)
      setServiceState('error')
      setMessages((current) => [
        ...current,
        {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: buildLocalKnowledgeAnswer(citations, 'request_error'),
          citations,
          meta: {
            mode: 'fallback',
            model: 'local-public-knowledge',
            provider: 'browser-local',
            reason: 'request_error',
            citationCount: citations.length,
          },
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`public-assistant ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="public-assistant__trigger"
        aria-expanded={isOpen}
        aria-controls="public-assistant-panel"
        onClick={toggleWidget}
      >
        <span className="public-assistant__trigger-mark" aria-hidden="true">
          B
        </span>
        <span className="public-assistant__trigger-text">泊岸公开助手</span>
      </button>

      {isOpen && (
        <section className="public-assistant__panel" id="public-assistant-panel" aria-label="公开助手">
          <header className="public-assistant__header">
            <div>
              <p className="public-assistant__eyebrow">PUBLIC KNOWLEDGE</p>
              <h2>泊岸公开助手</h2>
              <span className={`public-assistant__status ${serviceStatus.className}`}>
                {serviceStatus.label}
              </span>
            </div>
            <button type="button" className="public-assistant__close" onClick={() => setIsOpen(false)} aria-label="关闭公开助手">
              <IconClose aria-hidden />
            </button>
          </header>

          <p className="public-assistant__hint">
            只回答公开项目、文章与状态页。
            <Link to="/assistant">内部入口</Link>
          </p>

          {(messages.length > 0 || isLoading) && (
            <div className="public-assistant__messages" ref={scrollRef}>
              {messages.map((message) => (
                <article key={message.id} className={`public-assistant__message is-${message.role}`}>
                  <p>{message.content}</p>
                  {message.role === 'assistant' && message.meta && (
                    <small className="public-assistant__meta">{formatAnswerMeta(message.meta)}</small>
                  )}
                  {message.citations && message.citations.length > 0 && (
                    <div className="public-assistant__citations">
                      {message.citations.slice(0, 3).map((item) => (
                        <Link key={item.id} to={item.href} className="public-assistant__citation" aria-label={`查看来源：${item.title}`}>
                          <strong>{item.title}</strong>
                          <span>打开来源</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              ))}

              {isLoading && (
                <div className="public-assistant__loading" aria-live="polite">
                  正在检索公开资料…
                </div>
              )}
            </div>
          )}

          <div className="public-assistant__suggestions" aria-label="建议提问">
            {publicAssistantSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="public-assistant__suggestion"
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
            <label className="sr-only" htmlFor="public-assistant-input">
              向公开助手提问
            </label>
            <input
              id="public-assistant-input"
              type="text"
              maxLength={MAX_MESSAGE_LENGTH}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="问项目、演示入口或技术方向"
            />
            <button type="submit" disabled={isLoading || input.trim().length === 0}>
              <IconSend aria-hidden />
              <span>发送</span>
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
