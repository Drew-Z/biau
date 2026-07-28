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

export type PublicAssistantGenerationIntent =
  | { kind: 'new-turn'; branchId: string | null; parentRevisionId: string | null }
  | { kind: 'answer-revision'; branchId: string; turnId: string; baseRevisionId: string }

export interface PublicAssistantConversationIdentity {
  branchId: string
  branchOrdinal: number
  turnId: string
  revisionId: string
  revisionNo: number
  basedOnRevisionId: string | null
  activated: boolean
}

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
  contractVersion: 1 | 2
  requestId?: string
  replayed?: boolean
  answer: string
  status: PublicAssistantStatus
  claims: PublicAssistantClaim[]
  citations: PublicAssistantCitation[]
  suggestions: string[]
  sessionId?: string
  turnId?: string
  conversation?: PublicAssistantConversationIdentity
  meta: PublicAssistantAnswerMeta
}

export interface PublicAssistantSessionSummary {
  id: string
  activeBranchId?: string
  title: string
  turnCount: number
  hasEarlierTurns?: boolean
  createdAt: string
  lastActiveAt: string
  expiresAt: string
}

export interface PublicAssistantAnswerRevision {
  id: string
  revisionNo: number
  basedOnRevisionId: string | null
  answer: string
  status: PublicAssistantStatus
  claims: PublicAssistantClaim[]
  citations: PublicAssistantCitation[]
  suggestions: string[]
  route: PublicAssistantRoute
  meta: PublicAssistantAnswerMeta
  createdAt: string
  feedback: 'up' | 'down' | null
}

export interface PublicAssistantSessionTurn {
  id: string
  question: string
  mode: PublicAssistantMode
  parentRevisionId: string | null
  selectedRevisionId: string
  revisions: PublicAssistantAnswerRevision[]
  createdAt: string
}

export interface PublicAssistantBranchSummary {
  id: string
  ordinal: number
  headRevisionId: string
  preview: string
  turnCount: number
  hasEarlierTurns: boolean
  lastActiveAt: string
}

export interface PublicAssistantSessionHistory {
  session: PublicAssistantSessionSummary & { activeBranchId: string }
  branches: PublicAssistantBranchSummary[]
  turns: PublicAssistantSessionTurn[]
  hasEarlierTurns: boolean
  revisionsTruncated: boolean
  branchesTruncated: boolean
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
  readonly requestId: string | null

  constructor(code: string, options: {
    canFallbackToJson?: boolean
    status?: number
    retryAfterSeconds?: number
    requestId?: string
  } = {}) {
    super(code)
    this.name = 'PublicAssistantTransportError'
    this.code = code
    this.canFallbackToJson = options.canFallbackToJson ?? false
    this.status = options.status ?? null
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
    this.requestId = options.requestId ?? null
  }
}

export interface PublicAssistantRequestInput {
  apiBase: string
  requestId: string
  message: string
  mode: PublicAssistantMode
  sessionId: string
  intent: PublicAssistantGenerationIntent
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
  const terminalState: {
    error: { code: string; requestId?: string; retryAfterSeconds?: number } | null
  } = { error: null }

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
      if (event === 'result' || event === 'error') terminalState.error = { code: 'public-assistant-stream-invalid-event' }
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
      if (!result) terminalState.error = { code: 'public-assistant-stream-invalid-result' }
      return
    }
    if (event === 'error') {
      const code = isRecord(payload) ? readString(payload.code, 80) : ''
      const requestId = isRecord(payload) ? readRequestId(payload.requestId) : ''
      const retryAfterSeconds = isRecord(payload) ? readBoundedRetryDelay(payload.retryAfterSeconds) : null
      terminalState.error = {
        code: code || 'public-assistant-stream-failed',
        ...(requestId ? { requestId } : {}),
        ...(retryAfterSeconds === null ? {} : { retryAfterSeconds }),
      }
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
  if (terminalState.error) {
    throw new PublicAssistantTransportError(terminalState.error.code, {
      ...(terminalState.error.requestId ? { requestId: terminalState.error.requestId } : {}),
      ...(terminalState.error.retryAfterSeconds === undefined ? {} : { retryAfterSeconds: terminalState.error.retryAfterSeconds }),
    })
  }
  if (!result) throw new PublicAssistantTransportError('public-assistant-stream-incomplete')
  return result
}

function toPublicAssistantRequestBody(input: PublicAssistantRequestInput) {
  return {
    contractVersion: 2,
    requestId: input.requestId,
    message: input.message,
    mode: input.mode,
    sessionId: input.sessionId,
    intent: input.intent,
    history: input.history.slice(-12),
    pageContext: input.pageContext,
  }
}

async function responseError(response: Response, canFallbackToJson = false) {
  const payload = await response.clone().json().catch(() => null)
  const upstreamCode = isRecord(payload) ? readString(payload.error, 100) : ''
  const code = [429, 502, 503, 504].includes(response.status) ? statusErrorCode(response.status) : (upstreamCode || statusErrorCode(response.status))
  const retryAfterSeconds = readRetryAfter(response.headers.get('Retry-After'))
  const requestId = isRecord(payload) ? readRequestId(payload.requestId) : ''
  return new PublicAssistantTransportError(
    code,
    {
      canFallbackToJson,
      status: response.status,
      ...(retryAfterSeconds === null ? {} : { retryAfterSeconds }),
      ...(requestId ? { requestId } : {}),
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
  revisionId: string
  rating: 'up' | 'down'
  reason?: PublicAssistantFeedbackReason
  comment?: string
}) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: input.sessionId,
      revisionId: input.revisionId,
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

export async function cancelPublicAssistantGeneration(input: {
  apiBase: string
  requestId: string
  sessionId: string
}) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: input.requestId, sessionId: input.sessionId }),
    keepalive: true,
  })
  if (!response.ok && response.status !== 404) throw await responseError(response)
}

function readRequestId(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)
    ? normalized
    : ''
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

export async function requestPublicAssistantBranch(input: {
  apiBase: string
  sessionId: string
  action: 'select'
  branchId: string
  signal?: AbortSignal
} | {
  apiBase: string
  sessionId: string
  action: 'continue-from-revision'
  revisionId: string
  signal?: AbortSignal
}) {
  const response = await fetchPublicAssistant(`${input.apiBase}/chat/public/branch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.action === 'select'
      ? { sessionId: input.sessionId, action: input.action, branchId: input.branchId }
      : { sessionId: input.sessionId, action: input.action, revisionId: input.revisionId }),
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
  const conversation = normalizeConversationIdentity(value.conversation)
  const contractVersion = value.contractVersion === 2 ? 2 : 1
  if (contractVersion === 2 && !conversation) return null
  return {
    contractVersion,
    requestId: readRequestId(value.requestId) || undefined,
    ...(value.replayed === true ? { replayed: true } : {}),
    answer,
    status,
    claims,
    citations,
    suggestions,
    sessionId: readIdentifier(value.sessionId),
    turnId: conversation?.turnId ?? readIdentifier(value.messageId),
    ...(conversation ? { conversation } : {}),
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
  if (!session?.activeBranchId || !Array.isArray(value.turns) || !Array.isArray(value.branches)) return null
  const turns = value.turns
    .map((turn) => normalizePublicAssistantSessionTurn(turn))
  if (turns.some((turn) => turn === null) || turns.length > 100) return null
  const normalizedTurns = turns as PublicAssistantSessionTurn[]
  if (new Set(normalizedTurns.map((turn) => turn.id)).size !== normalizedTurns.length) return null
  const branches = value.branches.map((branch) => normalizePublicAssistantBranchSummary(branch))
  if (branches.some((branch) => branch === null) || branches.length > 24) return null
  const normalizedBranches = branches as PublicAssistantBranchSummary[]
  if (new Set(normalizedBranches.map((branch) => branch.id)).size !== normalizedBranches.length) return null
  if (!normalizedBranches.some((branch) => branch.id === session.activeBranchId)) return null
  return {
    session: { ...session, activeBranchId: session.activeBranchId },
    branches: normalizedBranches,
    turns: normalizedTurns,
    hasEarlierTurns: value.hasEarlierTurns === true,
    revisionsTruncated: value.revisionsTruncated === true,
    branchesTruncated: value.branchesTruncated === true,
    truncated: value.truncated === true,
  }
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
    activeBranchId: readIdentifier(value.activeBranchId),
    title,
    turnCount: readFiniteNumber(value.turnCount, 0),
    hasEarlierTurns: value.hasEarlierTurns === true,
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
  const parentRevisionId = value.parentRevisionId === null ? null : (readIdentifier(value.parentRevisionId) ?? null)
  const selectedRevisionId = readIdentifier(value.selectedRevisionId)
  if (!id || !question || !createdAt || !selectedRevisionId || !Array.isArray(value.revisions)) return null
  if (value.parentRevisionId !== null && !parentRevisionId) return null
  const revisions = value.revisions.map((revision) => normalizePublicAssistantAnswerRevision(revision))
  if (revisions.some((revision) => revision === null) || revisions.length === 0 || revisions.length > 8) return null
  const normalizedRevisions = revisions as PublicAssistantAnswerRevision[]
  if (new Set(normalizedRevisions.map((revision) => revision.id)).size !== normalizedRevisions.length) return null
  if (new Set(normalizedRevisions.map((revision) => revision.revisionNo)).size !== normalizedRevisions.length) return null
  if (!normalizedRevisions.some((revision) => revision.id === selectedRevisionId)) return null
  return {
    id,
    question,
    mode: readMode(value.mode),
    parentRevisionId,
    selectedRevisionId,
    revisions: normalizedRevisions,
    createdAt,
  }
}

function normalizePublicAssistantAnswerRevision(value: unknown): PublicAssistantAnswerRevision | null {
  if (!isRecord(value)) return null
  const id = readIdentifier(value.id)
  const revisionNo = readPositiveCount(value.revisionNo)
  const basedOnRevisionId = value.basedOnRevisionId === null ? null : (readIdentifier(value.basedOnRevisionId) ?? null)
  const answer = normalizePublicAssistantAnswer(value)
  const route = readRoute(value.route) ?? answer?.meta.research?.route ?? null
  const createdAt = readIsoDate(value.createdAt)
  if (!id || !revisionNo || !answer || !route || !createdAt) return null
  if (value.basedOnRevisionId !== null && !basedOnRevisionId) return null
  return {
    id,
    revisionNo,
    basedOnRevisionId,
    answer: answer.answer,
    status: answer.status,
    claims: answer.claims,
    citations: answer.citations,
    suggestions: answer.suggestions,
    route,
    meta: answer.meta,
    createdAt,
    feedback: value.feedback === 'up' || value.feedback === 'down' ? value.feedback : null,
  }
}

function normalizePublicAssistantBranchSummary(value: unknown): PublicAssistantBranchSummary | null {
  if (!isRecord(value)) return null
  const id = readIdentifier(value.id)
  const ordinal = readPositiveCount(value.ordinal)
  const headRevisionId = readIdentifier(value.headRevisionId)
  const preview = readString(value.preview, 64)
  const lastActiveAt = readIsoDate(value.lastActiveAt)
  if (!id || !ordinal || !headRevisionId || !preview || !lastActiveAt) return null
  return {
    id,
    ordinal,
    headRevisionId,
    preview,
    turnCount: readFiniteNumber(value.turnCount, 0),
    hasEarlierTurns: value.hasEarlierTurns === true,
    lastActiveAt,
  }
}

function normalizeConversationIdentity(value: unknown): PublicAssistantConversationIdentity | null {
  if (!isRecord(value)) return null
  const branchId = readIdentifier(value.branchId)
  const turnId = readIdentifier(value.turnId)
  const revisionId = readIdentifier(value.revisionId)
  const branchOrdinal = readPositiveCount(value.branchOrdinal)
  const revisionNo = readPositiveCount(value.revisionNo)
  const basedOnRevisionId = value.basedOnRevisionId === null ? null : (readIdentifier(value.basedOnRevisionId) ?? null)
  if (!branchId || !turnId || !revisionId || !branchOrdinal || !revisionNo) return null
  if (value.basedOnRevisionId !== null && !basedOnRevisionId) return null
  return {
    branchId,
    branchOrdinal,
    turnId,
    revisionId,
    revisionNo,
    basedOnRevisionId,
    activated: value.activated !== false,
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

function readPositiveCount(value: unknown) {
  const count = readFiniteNumber(value, 0)
  return count > 0 ? count : null
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

function readBoundedRetryDelay(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(3_600, Math.trunc(value)))
    : null
}

function unique<T>(value: T, index: number, values: T[]) {
  return values.indexOf(value) === index
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
