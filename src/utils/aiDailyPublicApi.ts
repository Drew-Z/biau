function normalizeApiBase(value: string | undefined) {
  return value?.trim().replace(/\/+$/u, '') ?? ''
}

export const AI_DAILY_PUBLIC_API_BASE =
  normalizeApiBase(import.meta.env?.VITE_AI_DAILY_API_BASE_URL) || normalizeApiBase(import.meta.env?.VITE_STUDIO_API_BASE_URL)

export const AI_DAILY_PUBLIC_API_ENV_NAMES = {
  public: 'VITE_AI_DAILY_API_BASE_URL',
  studioFallback: 'VITE_STUDIO_API_BASE_URL',
} as const

export interface AiDailyPublicCitation {
  title: string
  publisher: string
  url: string
  originalUrl?: string
  publishedAt: string | null
  excerpt: string
  locator?: {
    heading?: string
    startChar?: number
    endChar?: number
  }
}

export interface AiDailyPublicItem {
  publicId: string
  revision: number
  title: string
  factSummary: string
  whyItMatters: string
  uncertainty: string | null
  approvedAt: string
  updatedAt: string
  corrected: boolean
  correctedAt: string | null
  citations: AiDailyPublicCitation[]
}

export interface AiDailyPublicFeedPayload {
  items: AiDailyPublicItem[]
  nextCursor: string | null
  meta: {
    generatedAt: string | null
    windowHours: number
    freshness: {
      status: 'fresh' | 'stale' | 'empty'
      stale: boolean
      staleAfterMinutes: number
      latestApprovalAt: string | null
      latestProjectionAt: string | null
    }
    editorialCoverage: {
      scope: 'page'
      itemCount: number
      citedItemCount: number
      citationCoverage: number
    }
  }
}

export interface AiDailyPublicDetailPayload {
  item: AiDailyPublicItem
  meta: {
    generatedAt: string
    windowHours: number
    freshness: AiDailyPublicFeedPayload['meta']['freshness']
  }
}

export interface AiDailyPublicApiResult<T> {
  ok: boolean
  status: number
  payload: T | null
  etag: string | null
  notModified: boolean
  error: string | null
  aborted: boolean
}

export async function requestAiDailyPublicFeed(options: {
  cursor?: string | null
  limit?: number
  etag?: string | null
  signal?: AbortSignal
} = {}): Promise<AiDailyPublicApiResult<AiDailyPublicFeedPayload>> {
  const query = new URLSearchParams()
  if (options.cursor) query.set('cursor', options.cursor)
  if (options.limit) query.set('limit', String(options.limit))
  const path = `/public/ai-daily/feed${query.size ? `?${query.toString()}` : ''}`
  return requestAiDailyPublic<AiDailyPublicFeedPayload>(path, options)
}

export async function requestAiDailyPublicDetail(
  publicId: string,
  options: { etag?: string | null; signal?: AbortSignal } = {},
): Promise<AiDailyPublicApiResult<AiDailyPublicDetailPayload>> {
  return requestAiDailyPublic<AiDailyPublicDetailPayload>(
    `/public/ai-daily/events/${encodeURIComponent(publicId)}`,
    options,
  )
}

async function requestAiDailyPublic<T>(
  path: string,
  options: { etag?: string | null; signal?: AbortSignal },
): Promise<AiDailyPublicApiResult<T>> {
  const url = `${AI_DAILY_PUBLIC_API_BASE}${path}`
  try {
    const response = await fetch(url, {
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        ...(options.etag ? { 'If-None-Match': options.etag } : {}),
      },
    })
    const etag = response.headers.get('etag')
    if (response.status === 304) {
      return { ok: true, status: response.status, payload: null, etag, notModified: true, error: null, aborted: false }
    }
    const raw = (await response.json().catch(() => null)) as unknown
    if (!response.ok) {
      return { ok: false, status: response.status, payload: null, etag, notModified: false, error: readErrorCode(raw), aborted: false }
    }
    const payload = decodeAiDailyPublicPayload(raw)
    if (!payload) {
      return {
        ok: false,
        status: response.status,
        payload: null,
        etag,
        notModified: false,
        error: 'invalid-public-ai-daily-response',
        aborted: false,
      }
    }
    return { ok: true, status: response.status, payload: payload as T, etag, notModified: false, error: null, aborted: false }
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, status: 0, payload: null, etag: null, notModified: false, error: null, aborted: true }
    }
    return { ok: false, status: 0, payload: null, etag: null, notModified: false, error: 'public-ai-daily-network-error', aborted: false }
  }
}

export function decodeAiDailyPublicPayload(value: unknown): AiDailyPublicFeedPayload | AiDailyPublicDetailPayload | null {
  if (!isRecord(value)) return null
  if (isRecord(value.item)) {
    const item = decodeItem(value.item)
    const meta = decodeDetailMeta(value.meta)
    return item && meta ? { item, meta } : null
  }
  if (!Array.isArray(value.items) || !isRecord(value.meta)) return null
  const items = value.items.map(decodeItem)
  if (items.some((item) => item === null)) return null
  const meta = decodeFeedMeta(value.meta)
  if (!meta || (value.nextCursor !== null && typeof value.nextCursor !== 'string')) return null
  return { items: items as AiDailyPublicItem[], nextCursor: value.nextCursor as string | null, meta }
}

function decodeItem(value: unknown): AiDailyPublicItem | null {
  if (!isRecord(value)) return null
  const strings = ['publicId', 'title', 'factSummary', 'whyItMatters', 'approvedAt', 'updatedAt']
  if (strings.some((key) => typeof value[key] !== 'string' || !String(value[key]).trim())) return null
  const revision = readPositiveInteger(value.revision)
  if (revision === null) return null
  if (typeof value.corrected !== 'boolean' || (value.correctedAt !== null && typeof value.correctedAt !== 'string')) return null
  if (value.uncertainty !== null && typeof value.uncertainty !== 'string') return null
  if (!Array.isArray(value.citations)) return null
  const citations = value.citations.map(decodeCitation)
  if (citations.some((citation) => citation === null)) return null
  return {
    publicId: String(value.publicId),
    revision,
    title: String(value.title),
    factSummary: String(value.factSummary),
    whyItMatters: String(value.whyItMatters),
    uncertainty: value.uncertainty as string | null,
    approvedAt: String(value.approvedAt),
    updatedAt: String(value.updatedAt),
    corrected: value.corrected,
    correctedAt: value.correctedAt as string | null,
    citations: citations as AiDailyPublicCitation[],
  }
}

function decodeCitation(value: unknown): AiDailyPublicCitation | null {
  if (!isRecord(value)) return null
  if (typeof value.title !== 'string' || !value.title.trim() || typeof value.publisher !== 'string' || !value.publisher.trim()) return null
  if (typeof value.excerpt !== 'string' || (value.publishedAt !== null && typeof value.publishedAt !== 'string')) return null
  const url = decodeSafePublicUrl(value.url)
  if (!url) return null
  const originalUrl = value.originalUrl === undefined ? undefined : decodeSafePublicUrl(value.originalUrl)
  if (value.originalUrl !== undefined && !originalUrl) return null
  const locator = decodeCitationLocator(value.locator)
  if (value.locator !== undefined && locator === null) return null
  return {
    title: value.title.trim(),
    publisher: value.publisher.trim(),
    url,
    ...(originalUrl ? { originalUrl } : {}),
    publishedAt: value.publishedAt as string | null,
    excerpt: value.excerpt,
    ...(locator ? { locator } : {}),
  }
}

function decodeCitationLocator(value: unknown): AiDailyPublicCitation['locator'] | null | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) return null
  if (value.heading !== undefined && typeof value.heading !== 'string') return null
  const startChar = readOptionalNonNegativeInteger(value.startChar)
  const endChar = readOptionalNonNegativeInteger(value.endChar)
  if (startChar === null || endChar === null) return null
  if (startChar !== undefined && endChar !== undefined && endChar < startChar) return null
  const heading = typeof value.heading === 'string' ? value.heading.trim() : ''
  return {
    ...(heading ? { heading } : {}),
    ...(startChar !== undefined ? { startChar } : {}),
    ...(endChar !== undefined ? { endChar } : {}),
  }
}

function decodeSafePublicUrl(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || hasControlCharacter(trimmed)) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })
}

function decodeFeedMeta(value: Record<string, unknown>) {
  const freshness = decodeFreshness(value.freshness)
  const coverage = isRecord(value.editorialCoverage) ? value.editorialCoverage : null
  if (!freshness || !coverage || coverage.scope !== 'page') return null
  const itemCount = readNonNegativeInteger(coverage.itemCount)
  const citedItemCount = readNonNegativeInteger(coverage.citedItemCount)
  const citationCoverage = readUnitInterval(coverage.citationCoverage)
  if (itemCount === null || citedItemCount === null || citationCoverage === null || citedItemCount > itemCount) return null
  if (value.generatedAt !== null && typeof value.generatedAt !== 'string') return null
  const windowHours = readPositiveInteger(value.windowHours)
  if (windowHours === null) return null
  return {
    generatedAt: value.generatedAt as string | null,
    windowHours,
    freshness,
    editorialCoverage: {
      scope: 'page' as const,
      itemCount,
      citedItemCount,
      citationCoverage,
    },
  }
}

function decodeDetailMeta(value: unknown) {
  if (!isRecord(value) || typeof value.generatedAt !== 'string') return null
  const windowHours = readPositiveInteger(value.windowHours)
  if (windowHours === null) return null
  const freshness = decodeFreshness(value.freshness)
  return freshness ? { generatedAt: value.generatedAt, windowHours, freshness } : null
}

function decodeFreshness(value: unknown) {
  if (!isRecord(value) || !['fresh', 'stale', 'empty'].includes(String(value.status))) return null
  if (typeof value.stale !== 'boolean') return null
  const staleAfterMinutes = readPositiveInteger(value.staleAfterMinutes)
  if (staleAfterMinutes === null) return null
  if (value.latestApprovalAt !== null && typeof value.latestApprovalAt !== 'string') return null
  if (value.latestProjectionAt !== null && typeof value.latestProjectionAt !== 'string') return null
  return {
    status: value.status as 'fresh' | 'stale' | 'empty',
    stale: value.stale,
    staleAfterMinutes,
    latestApprovalAt: value.latestApprovalAt as string | null,
    latestProjectionAt: value.latestProjectionAt as string | null,
  }
}

function readErrorCode(value: unknown) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : 'public-ai-daily-request-failed'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAbortError(value: unknown): value is Error {
  return value instanceof Error && value.name === 'AbortError'
}

function readPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : null
}

function readNonNegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function readOptionalNonNegativeInteger(value: unknown) {
  if (value === undefined) return undefined
  return readNonNegativeInteger(value)
}

function readUnitInterval(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null
}
