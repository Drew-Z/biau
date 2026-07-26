export type PublicAssistantMode = 'auto' | 'site' | 'web'
export type PublicAssistantStatus = 'answered' | 'partial' | 'uncertain' | 'degraded' | 'blocked'
export type PublicAssistantRoute = 'direct' | 'site' | 'web' | 'combined'
export type PublicAssistantFeedbackReason =
  | 'helpful'
  | 'clear'
  | 'good-sources'
  | 'incorrect'
  | 'unclear'
  | 'missing-sources'
  | 'outdated'
  | 'other'

export interface PublicAssistantCitation {
  id: string
  title: string
  summary: string
  href: string
  source: 'site' | 'web'
  section: string
  excerpt: string
  publishedAt: string | null
  evidenceStatus: 'verified' | 'partial'
}

export interface PublicAssistantClaim {
  id: string
  text: string
  citationIds: string[]
}

export interface PublicAssistantAnswerMeta {
  mode: 'model' | 'fallback'
  reason?: string
  citationCount: number
  research?: {
    requestedMode: PublicAssistantMode
    route: PublicAssistantRoute
    status: PublicAssistantStatus
    evidenceCount: number
    siteEvidenceCount: number
    webEvidenceCount: number
    retryCount: number
    searchAvailable: boolean
    rerankerMode?: 'provider' | 'deterministic' | 'none'
    durationMs: number
  }
}

export interface PublicAssistantAnswer {
  answer: string
  status: PublicAssistantStatus
  claims: PublicAssistantClaim[]
  citations: PublicAssistantCitation[]
  suggestions: string[]
  sessionId?: string
  turnId?: string
  meta: PublicAssistantAnswerMeta
}

export interface PublicAssistantHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export async function requestPublicAssistant(input: {
  apiBase: string
  message: string
  mode: PublicAssistantMode
  sessionId: string
  history: PublicAssistantHistoryTurn[]
  pageContext: { path: string; title: string; description: string }
  signal?: AbortSignal
}) {
  const response = await fetch(`${input.apiBase}/chat/public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: input.message,
      mode: input.mode,
      sessionId: input.sessionId,
      history: input.history.slice(-6),
      pageContext: input.pageContext,
    }),
    signal: input.signal,
  })
  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'public-assistant-rate-limited' : 'public-chat-request-failed')
    error.name = 'PublicAssistantRequestError'
    throw error
  }
  const payload = await response.json().catch(() => null)
  const answer = normalizePublicAssistantAnswer(payload)
  if (!answer) throw new Error('public-chat-invalid-response')
  return answer
}

export async function submitPublicAssistantFeedback(input: {
  apiBase: string
  sessionId: string
  turnId: string
  rating: 'up' | 'down'
  reason?: PublicAssistantFeedbackReason
  comment?: string
}) {
  const response = await fetch(`${input.apiBase}/chat/public/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: input.sessionId,
      turnId: input.turnId,
      rating: input.rating,
      reason: input.reason,
      comment: input.comment?.replace(/\s+/gu, ' ').trim().slice(0, 240),
    }),
  })
  if (!response.ok) throw new Error('public-assistant-feedback-failed')
}

export function normalizePublicAssistantAnswer(value: unknown): PublicAssistantAnswer | null {
  if (!isRecord(value)) return null
  const answer = readMultilineString(value.answer, 4_000)
  const status = readStatus(value.status)
  if (!answer || !status) return null
  const citations = normalizeCitations(value.citations)
  const claims = normalizeClaims(value.claims, new Set(citations.map((citation) => citation.id)))
  const suggestions = Array.isArray(value.suggestions)
    ? value.suggestions.map((item) => readString(item, 100)).filter(Boolean).filter(unique).slice(0, 3)
    : []
  const rawMeta = isRecord(value.meta) ? value.meta : {}
  const research = normalizeResearchMeta(rawMeta.research)
  return {
    answer,
    status,
    claims,
    citations,
    suggestions,
    sessionId: readIdentifier(value.sessionId),
    turnId: readIdentifier(value.messageId),
    meta: {
      mode: rawMeta.mode === 'model' ? 'model' : 'fallback',
      reason: readString(rawMeta.reason, 80) || undefined,
      citationCount: readFiniteNumber(rawMeta.citationCount, citations.length),
      research,
    },
  }
}

function normalizeCitations(value: unknown): PublicAssistantCitation[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (!isRecord(item) || item.visibility === 'internal') return null
    const id = readIdentifier(item.id)
    const title = readString(item.title, 240)
    const summary = readString(item.summary, 900)
    const source = item.source === 'web' ? 'web' : 'site'
    const href = readCitationHref(item.href, source)
    if (!id || !title || !href) return null
    return {
      id,
      title,
      summary,
      href,
      source,
      section: readString(item.section, 160) || (source === 'site' ? '站内资料' : '网页正文'),
      excerpt: readString(item.excerpt, 900) || summary,
      publishedAt: readIsoDate(item.publishedAt),
      evidenceStatus: item.evidenceStatus === 'partial' ? 'partial' : 'verified',
    }
  }).filter((item): item is PublicAssistantCitation => item !== null).slice(0, 8)
}

function normalizeClaims(value: unknown, citationIds: Set<string>) {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (!isRecord(item)) return null
    const text = readString(item.text, 600)
    if (!text) return null
    return {
      id: readIdentifier(item.id) || `claim-${index + 1}`,
      text,
      citationIds: Array.isArray(item.citationIds)
        ? item.citationIds.filter((id): id is string => typeof id === 'string' && citationIds.has(id)).filter(unique).slice(0, 4)
        : [],
    }
  }).filter((item): item is PublicAssistantClaim => item !== null).slice(0, 12)
}

function normalizeResearchMeta(value: unknown): PublicAssistantAnswerMeta['research'] {
  if (!isRecord(value)) return undefined
  const route = readRoute(value.route)
  const status = readStatus(value.status)
  if (!route || !status) return undefined
  return {
    requestedMode: readMode(value.requestedMode),
    route,
    status,
    evidenceCount: readFiniteNumber(value.evidenceCount, 0),
    siteEvidenceCount: readFiniteNumber(value.siteEvidenceCount, 0),
    webEvidenceCount: readFiniteNumber(value.webEvidenceCount, 0),
    retryCount: readFiniteNumber(value.retryCount, 0),
    searchAvailable: value.searchAvailable === true,
    rerankerMode: value.rerankerMode === 'provider' || value.rerankerMode === 'deterministic' || value.rerankerMode === 'none'
      ? value.rerankerMode
      : undefined,
    durationMs: readFiniteNumber(value.durationMs, 0),
  }
}

function readCitationHref(value: unknown, source: 'site' | 'web') {
  if (typeof value !== 'string') return ''
  if (source === 'site') return value.startsWith('/') && !value.startsWith('//') ? value.slice(0, 500) : ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : ''
  } catch {
    return ''
  }
}

function readMode(value: unknown): PublicAssistantMode {
  return value === 'site' || value === 'web' ? value : 'auto'
}

function readRoute(value: unknown): PublicAssistantRoute | null {
  return value === 'direct' || value === 'site' || value === 'web' || value === 'combined' ? value : null
}

function readStatus(value: unknown): PublicAssistantStatus | null {
  return value === 'answered' || value === 'partial' || value === 'uncertain' || value === 'degraded' || value === 'blocked' ? value : null
}

function readIdentifier(value: unknown) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return /^[a-zA-Z0-9:_-]{1,100}$/u.test(normalized) ? normalized : undefined
}

function readIsoDate(value: unknown) {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function readString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, maxLength) : ''
}

function readMultilineString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\r\n?/gu, '\n')
    .replace(/[\t\f\v ]+/gu, ' ')
    .replace(/ *\n */gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
    .slice(0, maxLength)
}

function readFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback
}

function unique<T>(value: T, index: number, values: T[]) {
  return values.indexOf(value) === index
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
