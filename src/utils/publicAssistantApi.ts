export type PublicAssistantMode = 'auto' | 'site' | 'web'
export type PublicAssistantStatus = 'answered' | 'partial' | 'uncertain' | 'degraded' | 'blocked'
export type PublicAssistantRoute = 'direct' | 'site' | 'web' | 'combined'
export type PublicAssistantProgressStage =
  | 'planning'
  | 'researching'
  | 'evaluating'
  | 'refining'
  | 'answering'
  | 'verifying'
  | 'saving'
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

export interface PublicAssistantSessionSummary {
  id: string
  title: string
  turnCount: number
  createdAt: string
  lastActiveAt: string
  expiresAt: string
}

export interface PublicAssistantSessionTurn extends PublicAssistantAnswer {
  id: string
  question: string
  mode: PublicAssistantMode
  route: PublicAssistantRoute
  createdAt: string
  feedback: 'up' | 'down' | null
}

export interface PublicAssistantSessionHistory {
  session: PublicAssistantSessionSummary
  turns: PublicAssistantSessionTurn[]
  truncated: boolean
}

export interface PublicAssistantHealth {
  ok: true
  database: boolean
  modelConfigured: boolean
  webSearchConfigured: boolean
}

export interface PublicAssistantHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export class PublicAssistantTransportError extends Error {
  readonly code: string
  readonly canFallbackToJson: boolean
  readonly status: number | null
  readonly retryAfterSeconds: number | null

  constructor(code: string, options: { canFallbackToJson?: boolean; status?: number; retryAfterSeconds?: number } = {}) {
    super(code)
    this.name = 'PublicAssistantTransportError'
    this.code = code
    this.canFallbackToJson = options.canFallbackToJson ?? false
    this.status = options.status ?? null
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
  }
}

interface PublicAssistantRequestInput {
  apiBase: string
  message: string
  mode: PublicAssistantMode
  sessionId: string
  history: PublicAssistantHistoryTurn[]
  pageContext: { path: string; title: string; description: string }
  signal?: AbortSignal
}

export async function requestPublicAssistant(input: PublicAssistantRequestInput) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPublicAssistantRequestBody(input)),
    signal: input.signal,
  })
  if (!response.ok) {
    throw await responseError(response)
  }
  const payload = await response.json().catch(() => null)
  const answer = normalizePublicAssistantAnswer(payload)
  if (!answer) throw new PublicAssistantTransportError('public-assistant-invalid-response')
  return answer
}

export async function requestPublicAssistantStream(
  input: PublicAssistantRequestInput & { onProgress?: (stage: PublicAssistantProgressStage) => void },
) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public/stream`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toPublicAssistantRequestBody(input)),
    signal: input.signal,
  })
  if (!response.ok) {
    throw await responseError(response, [404, 405, 501].includes(response.status))
  }
  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  if (!contentType.includes('text/event-stream') || !response.body) {
    throw new PublicAssistantTransportError('public-assistant-stream-unsupported', { canFallbackToJson: true })
  }
  return readPublicAssistantEventStream(response.body, input.onProgress)
}

const MAX_PUBLIC_ASSISTANT_STREAM_BYTES = 512_000

export async function readPublicAssistantEventStream(
  body: ReadableStream<Uint8Array>,
  onProgress?: (stage: PublicAssistantProgressStage) => void,
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let bytesRead = 0
  let result: PublicAssistantAnswer | null = null
  let terminalError = ''

  const consumeFrame = (frame: string) => {
    const lines = frame.split(/\r?\n/u)
    const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message'
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim()
    if (!data) return
    let payload: unknown
    try {
      payload = JSON.parse(data) as unknown
    } catch {
      if (event === 'result' || event === 'error') terminalError = 'public-assistant-stream-invalid-event'
      return
    }
    if (event === 'progress') {
      const stage = normalizeProgressStage(payload)
      if (stage) {
        try {
          onProgress?.(stage)
        } catch {
          // UI progress is observational and cannot invalidate a completed answer.
        }
      }
      return
    }
    if (event === 'result') {
      result = normalizePublicAssistantAnswer(payload)
      if (!result) terminalError = 'public-assistant-stream-invalid-result'
      return
    }
    if (event === 'error') {
      terminalError = isRecord(payload) ? readString(payload.code, 80) : ''
      terminalError ||= 'public-assistant-stream-failed'
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      if (bytesRead > MAX_PUBLIC_ASSISTANT_STREAM_BYTES) {
        await reader.cancel('public-assistant-stream-too-large').catch(() => undefined)
        throw new PublicAssistantTransportError('public-assistant-stream-too-large')
      }
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split(/\r?\n\r?\n/u)
      buffer = frames.pop() ?? ''
      frames.forEach(consumeFrame)
    }
    buffer += decoder.decode()
    if (buffer.trim()) consumeFrame(buffer)
  } finally {
    reader.releaseLock()
  }
  if (terminalError) throw new PublicAssistantTransportError(terminalError)
  if (!result) throw new PublicAssistantTransportError('public-assistant-stream-incomplete')
  return result
}

function toPublicAssistantRequestBody(input: PublicAssistantRequestInput) {
  return {
    message: input.message,
    mode: input.mode,
    sessionId: input.sessionId,
    history: input.history.slice(-6),
    pageContext: input.pageContext,
  }
}

async function responseError(response: Response, canFallbackToJson = false) {
  const payload = await response.clone().json().catch(() => null)
  const upstreamCode = isRecord(payload) ? readString(payload.error, 100) : ''
  const code = [429, 502, 503, 504].includes(response.status) ? statusErrorCode(response.status) : (upstreamCode || statusErrorCode(response.status))
  const retryAfterSeconds = readRetryAfter(response.headers.get('Retry-After'))
  return new PublicAssistantTransportError(
    code,
    {
      canFallbackToJson,
      status: response.status,
      ...(retryAfterSeconds === null ? {} : { retryAfterSeconds }),
    },
  )
}

function normalizeProgressStage(value: unknown): PublicAssistantProgressStage | null {
  if (!isRecord(value)) return null
  return value.stage === 'planning' ||
    value.stage === 'researching' ||
    value.stage === 'evaluating' ||
    value.stage === 'refining' ||
    value.stage === 'answering' ||
    value.stage === 'verifying' ||
    value.stage === 'saving'
    ? value.stage
    : null
}

export async function submitPublicAssistantFeedback(input: {
  apiBase: string
  sessionId: string
  turnId: string
  rating: 'up' | 'down'
  reason?: PublicAssistantFeedbackReason
  comment?: string
}) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public/feedback`, {
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
  if (!response.ok) throw await responseError(response)
}

export async function requestPublicAssistantHealth(apiBase: string, signal?: AbortSignal) {
  const response = await fetchPublicAssistant(`${apiBase}/health`, { method: 'GET', signal })
  if (!response.ok) throw await responseError(response)
  const payload = await response.json().catch(() => null)
  if (!isRecord(payload) || payload.ok !== true) throw new PublicAssistantTransportError('public-assistant-invalid-response')
  return {
    ok: true,
    database: payload.database === true,
    modelConfigured: payload.modelConfigured === true,
    webSearchConfigured: payload.webSearchConfigured === true,
  } satisfies PublicAssistantHealth
}

export async function requestPublicAssistantSessions(input: {
  apiBase: string
  sessionIds: string[]
  signal?: AbortSignal
}) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionIds: input.sessionIds.slice(0, 24) }),
    signal: input.signal,
  })
  if (!response.ok) throw await responseError(response)
  const payload = await response.json().catch(() => null)
  if (!isRecord(payload) || !Array.isArray(payload.sessions)) {
    throw new PublicAssistantTransportError('public-assistant-invalid-response')
  }
  return payload.sessions
    .map(normalizePublicAssistantSessionSummary)
    .filter((session): session is PublicAssistantSessionSummary => session !== null)
    .slice(0, 24)
}

export async function requestPublicAssistantSession(input: {
  apiBase: string
  sessionId: string
  signal?: AbortSignal
}) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: input.sessionId }),
    signal: input.signal,
  })
  if (!response.ok) throw await responseError(response)
  const payload = await response.json().catch(() => null)
  const history = normalizePublicAssistantSessionHistory(payload)
  if (!history) throw new PublicAssistantTransportError('public-assistant-invalid-response')
  return history
}

export async function deletePublicAssistantSession(input: {
  apiBase: string
  sessionId: string
  signal?: AbortSignal
}) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public/session`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: input.sessionId }),
    signal: input.signal,
  })
  if (!response.ok) throw await responseError(response)
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

export function normalizePublicAssistantSessionHistory(value: unknown): PublicAssistantSessionHistory | null {
  if (!isRecord(value)) return null
  const session = normalizePublicAssistantSessionSummary(value.session)
  if (!session || !Array.isArray(value.turns)) return null
  const turns = value.turns
    .map((turn) => normalizePublicAssistantSessionTurn(turn))
    .filter((turn): turn is PublicAssistantSessionTurn => turn !== null)
    .slice(0, 100)
  return { session, turns, truncated: value.truncated === true }
}

function normalizePublicAssistantSessionSummary(value: unknown): PublicAssistantSessionSummary | null {
  if (!isRecord(value)) return null
  const id = readIdentifier(value.id)
  const title = readString(value.title, 64)
  const createdAt = readIsoDate(value.createdAt)
  const lastActiveAt = readIsoDate(value.lastActiveAt)
  const expiresAt = readIsoDate(value.expiresAt)
  if (!id || !title || !createdAt || !lastActiveAt || !expiresAt) return null
  return {
    id,
    title,
    turnCount: readFiniteNumber(value.turnCount, 0),
    createdAt,
    lastActiveAt,
    expiresAt,
  }
}

function normalizePublicAssistantSessionTurn(value: unknown): PublicAssistantSessionTurn | null {
  if (!isRecord(value)) return null
  const id = readIdentifier(value.id)
  const question = readMultilineString(value.question, 500)
  const createdAt = readIsoDate(value.createdAt)
  const answer = normalizePublicAssistantAnswer(value)
  if (!id || !question || !createdAt || !answer) return null
  return {
    ...answer,
    id,
    question,
    mode: readMode(value.mode),
    route: readRoute(value.route) ?? answer.meta.research?.route ?? 'direct',
    createdAt,
    feedback: value.feedback === 'up' || value.feedback === 'down' ? value.feedback : null,
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

async function fetchPublicAssistant(input: RequestInfo | URL, init: RequestInit) {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    throw new PublicAssistantTransportError(offline ? 'public-assistant-offline' : 'public-assistant-endpoint-unreachable')
  }
}

function statusErrorCode(status: number) {
  if (status === 404) return 'session-not-found'
  if (status === 429) return 'public-assistant-rate-limited'
  if (status === 502) return 'public-assistant-upstream-unreachable'
  if (status === 503) return 'public-assistant-service-unavailable'
  if (status === 504) return 'public-assistant-upstream-timeout'
  return 'public-chat-request-failed'
}

function readRetryAfter(value: string | null) {
  if (!value) return null
  const seconds = Number.parseInt(value, 10)
  return Number.isFinite(seconds) ? Math.max(0, Math.min(3_600, seconds)) : null
}

function unique<T>(value: T, index: number, values: T[]) {
  return values.indexOf(value) === index
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
