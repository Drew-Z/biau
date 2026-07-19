import { Prisma, type PrismaClient } from '@prisma/client'
import { sha256 } from './crypto.js'
import { normalizeAiDailyCitationSnapshotV2 } from './aiDailyDomain.js'
import { env } from './env.js'
import { isPublicAddress, validateAiDailyTargetUrl } from './aiDailySafeFetch.js'

const PUBLIC_FEED_MAX_LIMIT = 40
const PUBLIC_FEED_DEFAULT_LIMIT = 20
const PUBLIC_WINDOW_HOURS_DEFAULT = 72
const PUBLIC_STALE_MINUTES_DEFAULT = 180
const RATE_LIMIT_DEFAULT = 60
const RATE_WINDOW_MS_DEFAULT = 60_000
const RATE_LIMIT_MAX_KEYS = 5_000

const publicFlashSelect = {
  publicId: true,
  lifecycleState: true,
  currentApprovedRevisionId: true,
  publicRevision: true,
  lastApprovedAt: true,
  withdrawnAt: true,
  retentionUntil: true,
  projectionUpdatedAt: true,
  currentApprovedRevision: {
    select: {
      status: true,
      title: true,
      factSummary: true,
      whyItMatters: true,
      uncertainty: true,
      correctionState: true,
      correctedAt: true,
      approvedAt: true,
      createdAt: true,
      citationSnapshotsJson: true,
    },
  },
} satisfies Prisma.AiDailyFlashItemSelect

export type AiDailyPublicFlashRow = Prisma.AiDailyFlashItemGetPayload<{ select: typeof publicFlashSelect }>

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

export interface AiDailyPublicFreshness {
  status: 'fresh' | 'stale' | 'empty'
  stale: boolean
  staleAfterMinutes: number
  latestApprovalAt: string | null
  latestProjectionAt: string | null
}

export interface AiDailyPublicCoverage {
  scope: 'page'
  itemCount: number
  citedItemCount: number
  citationCoverage: number
}

export interface AiDailyPublicFeedPayload {
  items: AiDailyPublicItem[]
  nextCursor: string | null
  meta: {
    generatedAt: string | null
    windowHours: number
    freshness: AiDailyPublicFreshness
    editorialCoverage: AiDailyPublicCoverage
  }
}

export interface AiDailyPublicDetailPayload {
  item: AiDailyPublicItem
  meta: {
    generatedAt: string
    windowHours: number
    freshness: AiDailyPublicFreshness
  }
}

export interface AiDailyPublicCursor {
  lastApprovedAt: string
  publicId: string
}

export interface AiDailyPublicRepository {
  list(options: {
    limit: number
    cursor: AiDailyPublicCursor | null
    now: Date
    windowHours: number
  }): Promise<{ rows: AiDailyPublicFlashRow[]; hasMore: boolean }>
  findByPublicId(publicId: string): Promise<AiDailyPublicFlashRow | null>
}

export function createAiDailyPublicRepository(prisma: PrismaClient): AiDailyPublicRepository {
  return {
    async list({ limit, cursor, now, windowHours }) {
      const cutoff = new Date(now.getTime() - windowHours * 60 * 60 * 1000)
      const rows = await prisma.aiDailyFlashItem.findMany({
        where: {
          lifecycleState: 'ACTIVE',
          currentApprovedRevisionId: { not: null },
          lastApprovedAt: { not: null, gte: cutoff },
          OR: [{ retentionUntil: null }, { retentionUntil: { gt: now } }],
          currentApprovedRevision: { is: { status: 'APPROVED' } },
          ...(cursor
            ? {
                AND: [
                  {
                    OR: [
                      { lastApprovedAt: { lt: new Date(cursor.lastApprovedAt) } },
                      { lastApprovedAt: new Date(cursor.lastApprovedAt), publicId: { lt: cursor.publicId } },
                    ],
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ lastApprovedAt: 'desc' }, { publicId: 'desc' }],
        take: limit + 1,
        select: publicFlashSelect,
      })
      return { rows: rows.slice(0, limit), hasMore: rows.length > limit }
    },
    findByPublicId(publicId) {
      return prisma.aiDailyFlashItem.findUnique({
        where: { publicId },
        select: publicFlashSelect,
      })
    },
  }
}

export function parsePublicFeedLimit(value: unknown) {
  if (value === undefined || value === '') return PUBLIC_FEED_DEFAULT_LIMIT
  if (typeof value !== 'string' || !/^\d+$/u.test(value)) throw new Error('invalid-ai-daily-public-limit')
  const limit = Number(value)
  if (!Number.isInteger(limit) || limit < 1 || limit > PUBLIC_FEED_MAX_LIMIT) {
    throw new Error('invalid-ai-daily-public-limit')
  }
  return limit
}

export function encodeAiDailyPublicCursor(cursor: AiDailyPublicCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeAiDailyPublicCursor(value: unknown): AiDailyPublicCursor | null {
  if (value === undefined || value === '') return null
  if (typeof value !== 'string' || value.length > 300) throw new Error('invalid-ai-daily-public-cursor')
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>
    const lastApprovedAt = typeof decoded.lastApprovedAt === 'string' ? decoded.lastApprovedAt : ''
    const publicId = typeof decoded.publicId === 'string' ? decoded.publicId : ''
    if (!lastApprovedAt || !publicId || publicId.length > 120 || Number.isNaN(Date.parse(lastApprovedAt))) {
      throw new Error('invalid-ai-daily-public-cursor')
    }
    return { lastApprovedAt: new Date(lastApprovedAt).toISOString(), publicId }
  } catch {
    throw new Error('invalid-ai-daily-public-cursor')
  }
}

export function serializeAiDailyPublicItem(row: AiDailyPublicFlashRow): AiDailyPublicItem | null {
  const revision = row.currentApprovedRevision
  if (
    row.lifecycleState !== 'ACTIVE' ||
    !row.currentApprovedRevisionId ||
    !revision ||
    revision.status !== 'APPROVED' ||
    !row.lastApprovedAt ||
    !revision.title.trim() ||
    !revision.factSummary.trim() ||
    !revision.whyItMatters.trim() ||
    !revision.approvedAt
  ) {
    return null
  }

  const citations = Array.isArray(revision.citationSnapshotsJson)
    ? revision.citationSnapshotsJson.map(serializeAiDailyPublicCitation).filter((item): item is AiDailyPublicCitation => item !== null)
    : []
  const correctedAt = revision.correctedAt?.toISOString() ?? null
  return {
    publicId: row.publicId,
    revision: row.publicRevision,
    title: revision.title.trim().slice(0, 240),
    factSummary: revision.factSummary.trim().slice(0, 1_200),
    whyItMatters: revision.whyItMatters.trim().slice(0, 1_200),
    uncertainty: revision.uncertainty?.trim().slice(0, 600) || null,
    approvedAt: revision.approvedAt.toISOString(),
    updatedAt: (row.projectionUpdatedAt ?? revision.approvedAt ?? revision.createdAt).toISOString(),
    corrected: revision.correctionState !== 'none' || correctedAt !== null,
    correctedAt,
    citations,
  }
}

function serializeAiDailyPublicCitation(value: Prisma.JsonValue): AiDailyPublicCitation | null {
  const normalized = normalizeAiDailyCitationSnapshotV2(value)
  if (!normalized.ok) return null
  const snapshot = normalized.snapshot
  if (!isSafePublicCitationUrl(snapshot.canonicalUrl) || !isSafePublicCitationUrl(snapshot.originalUrl)) return null
  return {
    title: snapshot.title,
    publisher: snapshot.publisher,
    url: snapshot.canonicalUrl,
    ...(snapshot.originalUrl !== snapshot.canonicalUrl ? { originalUrl: snapshot.originalUrl } : {}),
    publishedAt: snapshot.publishedAt,
    excerpt: snapshot.excerpt,
    ...(snapshot.locator ? { locator: snapshot.locator } : {}),
  }
}

export function isSafePublicCitationUrl(value: string) {
  try {
    const url = validateAiDailyTargetUrl(value)
    if (url.protocol !== 'https:') return false
    const hostname = url.hostname.toLowerCase().replace(/\.$/u, '')
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname.endsWith('.home') ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data.ec2.internal'
    ) {
      return false
    }
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname) && !isPublicAddress(hostname)) return false
    return true
  } catch {
    return false
  }
}

export function buildAiDailyPublicFreshness(rows: AiDailyPublicFlashRow[], now: Date, staleAfterMinutes = readPublicStaleMinutes()) {
  const latestApproval = latestDate(rows.map((row) => row.lastApprovedAt))
  const latestProjection = latestDate(rows.map((row) => row.projectionUpdatedAt))
  if (!rows.length) {
    return {
      status: 'empty' as const,
      stale: false,
      staleAfterMinutes,
      latestApprovalAt: latestApproval,
      latestProjectionAt: latestProjection,
    }
  }
  const freshnessDate = latestProjection ?? latestApproval
  const stale = !freshnessDate || now.getTime() - Date.parse(freshnessDate) > staleAfterMinutes * 60 * 1000
  return {
    status: stale ? ('stale' as const) : ('fresh' as const),
    stale,
    staleAfterMinutes,
    latestApprovalAt: latestApproval,
    latestProjectionAt: latestProjection,
  }
}

export function buildAiDailyPublicFeedPayload(
  rows: AiDailyPublicFlashRow[],
  nextCursor: string | null,
  now: Date,
  windowHours = readPublicWindowHours(),
): AiDailyPublicFeedPayload {
  const items = rows.map(serializeAiDailyPublicItem).filter((item): item is AiDailyPublicItem => item !== null)
  const freshness = buildAiDailyPublicFreshness(rows, now)
  const citedItemCount = items.filter((item) => item.citations.length > 0).length
  return {
    items,
    nextCursor,
    meta: {
      generatedAt: freshness.latestProjectionAt ?? freshness.latestApprovalAt,
      windowHours,
      freshness,
      editorialCoverage: {
        scope: 'page',
        itemCount: items.length,
        citedItemCount,
        citationCoverage: items.length ? Number((citedItemCount / items.length).toFixed(4)) : 0,
      },
    },
  }
}

export function buildAiDailyPublicDetailPayload(row: AiDailyPublicFlashRow, now: Date, windowHours = readPublicWindowHours()) {
  const item = serializeAiDailyPublicItem(row)
  if (!item) return null
  return {
    item,
    meta: {
      generatedAt: item.updatedAt,
      windowHours,
      freshness: buildAiDailyPublicFreshness([row], now),
    },
  } satisfies AiDailyPublicDetailPayload
}

export function createPublicEtag(payload: unknown) {
  return `"${sha256(JSON.stringify(payload))}"`
}

export function readPublicWindowHours() {
  return env.aiDailyPublicWindowHours || PUBLIC_WINDOW_HOURS_DEFAULT
}

export function readPublicStaleMinutes() {
  return env.aiDailyPublicStaleMinutes || PUBLIC_STALE_MINUTES_DEFAULT
}

export function readPublicRateLimit() {
  return env.aiDailyPublicRateLimit || RATE_LIMIT_DEFAULT
}

export function readPublicRateWindowMs() {
  return env.aiDailyPublicRateWindowMs || RATE_WINDOW_MS_DEFAULT
}

function latestDate(values: Array<Date | null>) {
  const dates = values.filter((value): value is Date => value instanceof Date)
  if (!dates.length) return null
  return new Date(Math.max(...dates.map((value) => value.getTime()))).toISOString()
}

export interface AiDailyPublicRateLimiter {
  check(key: string, now: number): { allowed: boolean; limit: number; remaining: number; resetAt: number }
}

export function createAiDailyPublicRateLimiter(options: { limit?: number; windowMs?: number; maxKeys?: number } = {}): AiDailyPublicRateLimiter {
  const limit = options.limit ?? readPublicRateLimit()
  const windowMs = options.windowMs ?? readPublicRateWindowMs()
  const maxKeys = options.maxKeys ?? RATE_LIMIT_MAX_KEYS
  const buckets = new Map<string, { startedAt: number; count: number }>()

  return {
    check(key, now) {
      const current = buckets.get(key)
      if (!current || now - current.startedAt >= windowMs) {
        if (buckets.size >= maxKeys) {
          const oldestKey = buckets.keys().next().value
          if (oldestKey) buckets.delete(oldestKey)
        }
        buckets.set(key, { startedAt: now, count: 1 })
        return { allowed: true, limit, remaining: Math.max(0, limit - 1), resetAt: now + windowMs }
      }
      current.count += 1
      const remaining = Math.max(0, limit - current.count)
      return { allowed: current.count <= limit, limit, remaining, resetAt: current.startedAt + windowMs }
    },
  }
}
