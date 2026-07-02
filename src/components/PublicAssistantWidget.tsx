import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  publicAssistantSuggestions,
  publicKnowledgeBase,
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
}

const API_BASE = import.meta.env.VITE_CHAT_API_BASE_URL?.trim()
const MAX_MESSAGE_LENGTH = 500

const introMessage: WidgetMessage = {
  id: 'intro',
  role: 'assistant',
  content: '你好，我是泊岸公开助手。这里可以帮你快速查找本站公开项目、博客和能力方向。',
  citations: publicKnowledgeBase.slice(0, 2),
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function requestPublicAnswer(question: string) {
  if (!API_BASE) {
    const citations = searchPublicKnowledge(question)
    if (citations.length === 0) {
      return {
        content:
          '我目前只回答本站公开内容。这个问题暂时没有命中相关资料；项目页和博客页还在继续整理，可以先换一个项目名、技术词，或直接浏览公开页面。',
        citations: [] as AssistantKnowledgeItem[],
      }
    }

    const summary = citations
      .map((item) => `${item.title}：${item.summary}`)
      .join(' ')

    return {
      content: `根据当前公开内容，我优先找到了这些信息：${summary}`,
      citations,
    }
  }

  const response = await fetch(`${API_BASE}/chat/public`, {
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

  return {
    content:
      answer ||
      '公开助手暂时没有返回内容。你可以稍后重试，或者先去项目页和知识库查看详细资料。',
    citations,
  }
}

export function PublicAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<WidgetMessage[]>([introMessage])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messageSeq = useRef(0)

  const createMessageId = (role: WidgetMessage['role']) => {
    messageSeq.current += 1
    return `public-${role}-${messageSeq.current}`
  }

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isOpen])

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
      const result = await requestPublicAnswer(trimmed)
      setMessages((current) => [
        ...current,
        {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: result.content,
          citations: result.citations,
        },
      ])
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: '公开助手暂时不可用。可以先浏览项目页、博客页，或稍后再试。',
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
        <span className="public-assistant__trigger-text">公开助手</span>
      </button>

      {isOpen && (
        <section className="public-assistant__panel" id="public-assistant-panel" aria-label="公开助手">
          <header className="public-assistant__header">
            <div>
              <p className="public-assistant__eyebrow">PUBLIC ASSISTANT</p>
              <h2>本站公开内容问答</h2>
            </div>
            <button type="button" className="public-assistant__close" onClick={() => setIsOpen(false)} aria-label="关闭公开助手">
              关闭
            </button>
          </header>

          <p className="public-assistant__hint">
            仅回答站点公开内容，不提供通用中转聊天。
            <Link to="/assistant">内部成员入口</Link>
          </p>

          <div className="public-assistant__messages" ref={scrollRef}>
            {messages.map((message) => (
              <article key={message.id} className={`public-assistant__message is-${message.role}`}>
                <p>{message.content}</p>
                {message.citations && message.citations.length > 0 && (
                  <div className="public-assistant__citations">
                    {message.citations.map((item) => (
                      <Link key={item.id} to={item.href} className="public-assistant__citation">
                        <strong>{item.title}</strong>
                        <span>{item.summary}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}

            {isLoading && (
              <div className="public-assistant__loading" aria-live="polite">
                正在整理公开内容…
              </div>
            )}
          </div>

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
              placeholder="问项目、博客、技术方向"
            />
            <button type="submit" disabled={isLoading || input.trim().length === 0}>
              发送
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
