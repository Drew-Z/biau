import type {
  ChatResponse,
  PublicAssistantClaim,
  PublicAssistantMode,
  PublicAssistantResearchMeta,
  PublicAssistantRoute,
  PublicAssistantStatus,
} from './types.js'

export interface PublicAssistantDisplaySnapshot {
  version: 1
  claims: PublicAssistantClaim[]
  citations: Array<{
    id: string
    title: string
    summary: string
    href: string
    source: 'site' | 'web'
    section: string
    excerpt: string
    publishedAt: string | null
    evidenceStatus: 'verified' | 'partial'
  }>
  suggestions: string[]
  meta: {
    mode: 'model' | 'fallback'
    reason?: string
    citationCount: number
    research?: PublicAssistantResearchMeta
  }
}

export function toPublicAssistantHttpResponse(response: ChatResponse) {
  const requestId = normalizeRequestId(response.requestId)
  const sessionId = normalizeIdentifier(response.sessionId)
  const messageId = normalizeIdentifier(response.messageId)
  const conversation = normalizeConversationIdentity(response.conversation)
  const answer = normalizeMultiline(response.answer, 4_000)
  if (containsSecretShape(answer)) return buildBlockedHttpResponse({ requestId, sessionId, messageId, conversation })
  const snapshot = buildPublicAssistantDisplaySnapshot(response)
  return {
    ...(requestId ? { requestId } : {}),
    answer,
    status: normalizeStatus(response.status) ?? 'degraded',
    claims: snapshot.claims,
    citations: snapshot.citations,
    suggestions: snapshot.suggestions,
    ...(sessionId ? { sessionId } : {}),
    ...(messageId ? { messageId } : {}),
    ...(conversation ? { contractVersion: 2 as const, conversation } : {}),
    meta: snapshot.meta,
  }
}

export function readPublicAssistantHttpResponse(value: unknown) {
  if (!isRecord(value)) return null
  const answer = normalizeMultiline(value.answer, 4_000)
  const status = normalizeStatus(value.status)
  const requestId = normalizeRequestId(value.requestId)
  if (!answer || !status || !requestId) return null
  const sessionId = normalizeIdentifier(value.sessionId)
  const messageId = normalizeIdentifier(value.messageId)
  const conversation = normalizeConversationIdentity(value.conversation)
  if (containsSecretShape(answer)) return buildBlockedHttpResponse({ requestId, sessionId, messageId, conversation })
  const snapshot = readPublicAssistantDisplaySnapshot({
    version: 1,
    claims: value.claims,
    citations: value.citations,
    suggestions: value.suggestions,
    meta: value.meta,
  })
  if (!snapshot) return null
  return {
    requestId,
    answer,
    status,
    claims: snapshot.claims,
    citations: snapshot.citations,
    suggestions: snapshot.suggestions,
    ...(sessionId ? { sessionId } : {}),
    ...(messageId ? { messageId } : {}),
    ...(conversation ? { contractVersion: 2 as const, conversation } : {}),
    meta: snapshot.meta,
  }
}

function buildBlockedHttpResponse(input: {
  requestId: string
  sessionId: string
  messageId: string
  conversation?: ChatResponse['conversation'] | null
}) {
  return {
    ...(input.requestId ? { requestId: input.requestId } : {}),
    answer: '检测到回答中可能包含敏感信息，本次内容已安全拦截。',
    status: 'blocked' as const,
    claims: [],
    citations: [],
    suggestions: [],
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.messageId ? { messageId: input.messageId } : {}),
    ...(input.conversation ? { contractVersion: 2 as const, conversation: input.conversation } : {}),
    meta: {
      mode: 'fallback' as const,
      reason: 'sensitive-content-blocked',
      citationCount: 0,
    },
  }
}

function normalizeConversationIdentity(value: unknown): ChatResponse['conversation'] | null {
  if (!isRecord(value)) return null
  const branchId = normalizeIdentifier(value.branchId)
  const turnId = normalizeIdentifier(value.turnId)
  const revisionId = normalizeIdentifier(value.revisionId)
  const basedOnRevisionId = value.basedOnRevisionId === null ? null : normalizeIdentifier(value.basedOnRevisionId)
  const branchOrdinal = normalizePositiveCount(value.branchOrdinal)
  const revisionNo = normalizePositiveCount(value.revisionNo)
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

export function buildPublicAssistantDisplaySnapshot(response: ChatResponse): PublicAssistantDisplaySnapshot {
  const citations = normalizeCitations(response.citations)
  const claims = normalizeClaims(response.claims, new Set(citations.map((citation) => citation.id)))
  const suggestions = normalizeSuggestions(response.suggestions)
  const research = normalizeResearch(response.meta?.research)
  const reason = normalizeText(response.meta?.reason, 80)
  return {
    version: 1,
    claims,
    citations,
    suggestions,
    meta: {
      mode: response.meta?.mode === 'model' ? 'model' : 'fallback',
      ...(reason ? { reason } : {}),
      citationCount: citations.length,
      ...(research ? { research } : {}),
    },
  }
}

export function readPublicAssistantDisplaySnapshot(value: unknown): PublicAssistantDisplaySnapshot | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.meta)) return null
  const citations = normalizeCitations(value.citations)
  const claims = normalizeClaims(value.claims, new Set(citations.map((citation) => citation.id)))
  const suggestions = normalizeSuggestions(value.suggestions)
  const research = normalizeResearch(value.meta.research)
  const reason = normalizeText(value.meta.reason, 80)
  return {
    version: 1,
    claims,
    citations,
    suggestions,
    meta: {
      mode: value.meta.mode === 'model' ? 'model' : 'fallback',
      ...(reason ? { reason } : {}),
      citationCount: citations.length,
      ...(research ? { research } : {}),
    },
  }
}

function normalizeCitations(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (!isRecord(item) || item.visibility === 'internal') return null
    const id = normalizeIdentifier(item.id)
    const title = normalizeText(item.title, 240)
    const summary = normalizeText(item.summary, 900)
    const source = item.source === 'web' ? 'web' as const : 'site' as const
    const href = normalizeCitationHref(item.href, source)
    const section = normalizeText(item.section, 160) || (source === 'site' ? '站内资料' : '网页正文')
    const excerpt = normalizeText(item.excerpt, 900) || summary
    if (!id || !title || !href || containsSecretShape([title, summary, section, excerpt].join(' '))) return null
    return {
      id,
      title,
      summary,
      href,
      source,
      section,
      excerpt,
      publishedAt: normalizeIsoDate(item.publishedAt),
      evidenceStatus: item.evidenceStatus === 'partial' ? 'partial' as const : 'verified' as const,
    }
  }).filter((item): item is NonNullable<typeof item> => item !== null).slice(0, 8)
}

function normalizeClaims(value: unknown, citationIds: Set<string>) {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (!isRecord(item)) return null
    const text = normalizeText(item.text, 600)
    if (!text || containsSecretShape(text)) return null
    const id = normalizeIdentifier(item.id) || `claim-${index + 1}`
    const claimCitationIds = Array.isArray(item.citationIds)
      ? item.citationIds
        .map(normalizeIdentifier)
        .filter((citationId): citationId is string => Boolean(citationId && citationIds.has(citationId)))
        .filter(unique)
        .slice(0, 4)
      : []
    return { id, text, citationIds: claimCitationIds }
  }).filter((item): item is PublicAssistantClaim => item !== null).slice(0, 12)
}

function normalizeSuggestions(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeText(item, 100))
    .filter((item) => Boolean(item) && !containsSecretShape(item))
    .filter(unique)
    .slice(0, 3)
}

function normalizeResearch(value: unknown): PublicAssistantResearchMeta | undefined {
  if (!isRecord(value)) return undefined
  const route = normalizeRoute(value.route)
  const status = normalizeStatus(value.status)
  if (!route || !status) return undefined
  const rerankerMode = value.rerankerMode === 'provider' || value.rerankerMode === 'deterministic' || value.rerankerMode === 'none'
    ? value.rerankerMode
    : undefined
  return {
    requestedMode: normalizeMode(value.requestedMode),
    route,
    status,
    evidenceCount: normalizeCount(value.evidenceCount),
    siteEvidenceCount: normalizeCount(value.siteEvidenceCount),
    webEvidenceCount: normalizeCount(value.webEvidenceCount),
    retryCount: normalizeCount(value.retryCount),
    searchAvailable: value.searchAvailable === true,
    ...(rerankerMode ? { rerankerMode } : {}),
    durationMs: normalizeCount(value.durationMs),
  }
}

function normalizeCitationHref(value: unknown, source: 'site' | 'web') {
  if (typeof value !== 'string') return ''
  if (source === 'site') return value.startsWith('/') && !value.startsWith('//') ? value.slice(0, 500) : ''
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : ''
  } catch {
    return ''
  }
}

function normalizeMode(value: unknown): PublicAssistantMode {
  return value === 'site' || value === 'web' ? value : 'auto'
}

function normalizeRoute(value: unknown): PublicAssistantRoute | null {
  return value === 'direct' || value === 'site' || value === 'web' || value === 'combined' ? value : null
}

function normalizeStatus(value: unknown): PublicAssistantStatus | null {
  return value === 'answered' || value === 'partial' || value === 'uncertain' || value === 'degraded' || value === 'blocked' ? value : null
}

function normalizeIdentifier(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return /^[a-zA-Z0-9:_-]{1,100}$/u.test(normalized) ? normalized : ''
}

function normalizeRequestId(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)
    ? normalized
    : ''
}

function normalizeIsoDate(value: unknown) {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, maxLength) : ''
}

function normalizeMultiline(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\r\n?/gu, '\n')
    .replace(/[\t\f\v ]+/gu, ' ')
    .replace(/ *\n */gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
    .slice(0, maxLength)
}

function normalizeCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function normalizePositiveCount(value: unknown) {
  const count = normalizeCount(value)
  return count > 0 ? count : 0
}

function containsSecretShape(value: string) {
  return /sk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]{12,}|postgres(?:ql)?:\/\/[^\s]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|(?:api[_-]?key|token|password|secret|cookie)\s*[:=]\s*[^\s]{12,}/iu.test(value)
}

function unique<T>(value: T, index: number, values: T[]) {
  return values.indexOf(value) === index
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
