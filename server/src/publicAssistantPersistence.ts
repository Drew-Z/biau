import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { sha256 } from './crypto.js'
import { env } from './env.js'
import { getPrisma } from './db.js'
import type { PublicAssistantRequest } from './publicAssistantRuntime.js'
import type { ChatResponse } from './types.js'
import {
  buildPublicAssistantDisplaySnapshot,
  readPublicAssistantDisplaySnapshot,
  readPublicAssistantHttpResponse,
  toPublicAssistantHttpResponse,
} from './publicAssistantProjection.js'

const FEEDBACK_REASONS = new Set(['helpful', 'clear', 'good-sources', 'incorrect', 'unclear', 'missing-sources', 'outdated', 'other'])
const MAX_SESSION_HISTORY_IDS = 24
const MAX_SESSION_TURNS = 100
const REQUEST_LEASE_BUFFER_MS = 5_000
let lastRetentionAt = 0

export interface PublicAssistantRequestLease {
  requestId: string
  leaseToken: string
}

export type PublicAssistantRequestClaim =
  | { status: 'database-not-configured' }
  | { status: 'acquired'; lease: PublicAssistantRequestLease }
  | { status: 'completed'; response: NonNullable<ReturnType<typeof readPublicAssistantHttpResponse>> }
  | { status: 'processing'; retryAfterSeconds: number }
  | { status: 'conflict' }
  | { status: 'terminal'; errorCode: string }

export async function persistPublicAssistantTurn(
  request: PublicAssistantRequest,
  response: ChatResponse,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return null
  const expiresAt = new Date(now.getTime() + env.publicAssistantRetentionDays * 86_400_000)
  const result = await prisma.$transaction((tx) => writePublicAssistantTurn(tx, request, response, now, expiresAt))

  await maybeRunPublicAssistantRetention(prisma, now).catch(() => undefined)
  return result
}

export function buildPublicAssistantRequestHash(request: PublicAssistantRequest) {
  return sha256(JSON.stringify({
    sessionId: request.sessionId,
    question: request.question,
    mode: request.mode,
    history: request.history.map((turn) => ({ role: turn.role, content: turn.content })),
    pageContext: request.pageContext
      ? {
          path: request.pageContext.path,
          title: request.pageContext.title ?? '',
          description: request.pageContext.description ?? '',
        }
      : null,
  }))
}

export async function claimPublicAssistantRequest(
  request: PublicAssistantRequest,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
): Promise<PublicAssistantRequestClaim> {
  if (!prisma) return { status: 'database-not-configured' }
  const requestHash = buildPublicAssistantRequestHash(request)
  const leaseToken = randomUUID()
  const leaseExpiresAt = new Date(now.getTime() + requestLeaseMs())
  const expiresAt = new Date(now.getTime() + env.publicAssistantRetentionDays * 86_400_000)

  try {
    await prisma.publicAssistantRequest.create({
      data: {
        requestId: request.requestId,
        sessionId: request.sessionId,
        requestHash,
        status: 'processing',
        leaseToken,
        leaseExpiresAt,
        expiresAt,
      },
      select: { requestId: true },
    })
    return { status: 'acquired', lease: { requestId: request.requestId, leaseToken } }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{
      requestId: string
      requestHash: string
      status: string
      leaseToken: string
      leaseExpiresAt: Date
      responseJson: Prisma.JsonValue | null
      errorCode: string | null
    }>>(Prisma.sql`
      SELECT "requestId", "requestHash", "status", "leaseToken", "leaseExpiresAt", "responseJson", "errorCode"
      FROM "PublicAssistantRequest"
      WHERE "requestId" = ${request.requestId}
      FOR UPDATE
    `)
    const existing = rows[0]
    if (!existing) return { status: 'processing', retryAfterSeconds: 1 } as const
    if (existing.requestHash !== requestHash) return { status: 'conflict' } as const
    if (existing.status === 'completed') {
      const response = readPublicAssistantHttpResponse(existing.responseJson)
      if (response) return { status: 'completed', response } as const
      await tx.publicAssistantRequest.update({
        where: { requestId: request.requestId },
        data: { status: 'failed', errorCode: 'public-assistant-invalid-cached-response' },
      })
      return { status: 'terminal', errorCode: 'public-assistant-invalid-cached-response' } as const
    }
    if (existing.status === 'processing' && existing.leaseExpiresAt.getTime() > now.getTime()) {
      return {
        status: 'processing',
        retryAfterSeconds: Math.max(1, Math.ceil((existing.leaseExpiresAt.getTime() - now.getTime()) / 1_000)),
      } as const
    }
    if (existing.status === 'failed' || existing.status === 'cancelled') {
      return {
        status: 'terminal',
        errorCode: existing.errorCode || (existing.status === 'cancelled'
          ? 'public-assistant-request-cancelled'
          : 'public-assistant-request-failed'),
      } as const
    }
    if (existing.status !== 'retryable_failed' && existing.status !== 'processing') {
      return { status: 'terminal', errorCode: 'public-assistant-invalid-request-state' } as const
    }

    await tx.publicAssistantRequest.update({
      where: { requestId: request.requestId },
      data: {
        status: 'processing',
        attempt: { increment: 1 },
        leaseToken,
        leaseExpiresAt,
        expiresAt,
        errorCode: null,
      },
    })
    return { status: 'acquired', lease: { requestId: request.requestId, leaseToken } } as const
  })
}

export async function completePublicAssistantRequest(
  request: PublicAssistantRequest,
  response: ChatResponse,
  lease: PublicAssistantRequestLease,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return { status: 'database-not-configured' as const }
  if (request.requestId !== lease.requestId) return { status: 'stale' as const }
  const expiresAt = new Date(now.getTime() + env.publicAssistantRetentionDays * 86_400_000)
  const requestHash = buildPublicAssistantRequestHash(request)
  const completed = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{
      requestId: string
      requestHash: string
      status: string
      leaseToken: string
      leaseExpiresAt: Date
    }>>(Prisma.sql`
      SELECT "requestId", "requestHash", "status", "leaseToken", "leaseExpiresAt"
      FROM "PublicAssistantRequest"
      WHERE "requestId" = ${lease.requestId}
      FOR UPDATE
    `)
    const locked = rows[0]
    if (
      !locked
      || locked.requestHash !== requestHash
      || locked.status !== 'processing'
      || locked.leaseToken !== lease.leaseToken
      || locked.leaseExpiresAt.getTime() <= now.getTime()
    ) {
      return { status: 'stale' as const }
    }

    const persisted = await writePublicAssistantTurn(tx, request, response, now, expiresAt)
    const publicResponse = toPublicAssistantHttpResponse({
      ...response,
      requestId: request.requestId,
      sessionId: persisted.sessionId,
      messageId: persisted.turnId,
    })
    await tx.publicAssistantRequest.update({
      where: { requestId: lease.requestId },
      data: {
        status: 'completed',
        turnId: persisted.turnId,
        responseJson: toPrismaJson(publicResponse),
        errorCode: null,
        leaseExpiresAt: now,
        expiresAt,
      },
    })
    return { status: 'completed' as const, response: publicResponse }
  })
  await maybeRunPublicAssistantRetention(prisma, now).catch(() => undefined)
  return completed
}

export async function markPublicAssistantRequestFailed(
  lease: PublicAssistantRequestLease,
  input: { status: 'retryable_failed' | 'failed' | 'cancelled'; errorCode: string },
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return false
  const updated = await prisma.publicAssistantRequest.updateMany({
    where: {
      requestId: lease.requestId,
      leaseToken: lease.leaseToken,
      status: 'processing',
      leaseExpiresAt: { gt: now },
    },
    data: {
      status: input.status,
      errorCode: input.errorCode.slice(0, 100),
      leaseExpiresAt: now,
    },
  })
  return updated.count > 0
}

export async function cancelPublicAssistantRequest(
  requestId: string,
  sessionId: string,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return { status: 'database-not-configured' as const }
  const updated = await prisma.publicAssistantRequest.updateMany({
    where: {
      requestId,
      sessionId,
      status: { in: ['processing', 'retryable_failed'] },
    },
    data: {
      status: 'cancelled',
      errorCode: 'public-assistant-request-cancelled',
      leaseExpiresAt: now,
    },
  })
  if (updated.count > 0) return { status: 'cancelled' as const }
  const existing = await prisma.publicAssistantRequest.findUnique({
    where: { requestId },
    select: { sessionId: true, status: true },
  })
  if (!existing || existing.sessionId !== sessionId) return { status: 'request-not-found' as const }
  return { status: existing.status as 'completed' | 'failed' | 'cancelled' }
}

async function writePublicAssistantTurn(
  tx: Prisma.TransactionClient,
  request: PublicAssistantRequest,
  response: ChatResponse,
  now: Date,
  expiresAt: Date,
) {
  const sessionId = request.sessionId
  const route = response.meta?.research?.route ?? 'direct'
  const status = response.status ?? 'degraded'
  const date = shanghaiDate(now)
  const siteEvidenceCount = response.meta?.research?.siteEvidenceCount ?? 0
  const webEvidenceCount = response.meta?.research?.webEvidenceCount ?? 0
  const durationMs = response.meta?.research?.durationMs ?? 0
  const blocked = status === 'blocked' || containsSecretShape(request.question) || containsSecretShape(response.answer)
  const topic = blocked ? buildBlockedTopic() : buildTopic(request.question)
  const question = blocked ? '[blocked]' : request.question.slice(0, 500)
  const answer = blocked ? '[blocked]' : response.answer.slice(0, 4_000)
  const citationIds = response.citations.map((citation) => citation.id).slice(0, 8)
  const displaySnapshot = blocked
    ? { version: 1, claims: [], citations: [], suggestions: [], meta: { mode: 'fallback', citationCount: 0 } }
    : buildPublicAssistantDisplaySnapshot(response)

  await tx.publicAssistantSession.upsert({
    where: { id: sessionId },
    create: { id: sessionId, lastActiveAt: now, expiresAt },
    update: { lastActiveAt: now, expiresAt },
  })
  const aggregate = await tx.publicAssistantDailyAggregate.upsert({
    where: {
      date_topicFingerprint_route_status: {
        date,
        topicFingerprint: topic.fingerprint,
        route,
        status,
      },
    },
    create: {
      date,
      topicFingerprint: topic.fingerprint,
      topicTerms: topic.terms,
      route,
      status,
      totalCount: 1,
      siteEvidenceTotal: siteEvidenceCount,
      webEvidenceTotal: webEvidenceCount,
      latencyTotalMs: BigInt(durationMs),
    },
    update: {
      totalCount: { increment: 1 },
      siteEvidenceTotal: { increment: siteEvidenceCount },
      webEvidenceTotal: { increment: webEvidenceCount },
      latencyTotalMs: { increment: BigInt(durationMs) },
    },
  })
  const turn = await tx.publicAssistantTurn.create({
    data: {
      sessionId,
      aggregateId: aggregate.id,
      question,
      answer,
      mode: request.mode,
      route,
      status,
      citationIdsJson: citationIds as Prisma.InputJsonValue,
      metricsJson: {
        evidenceCount: response.meta?.research?.evidenceCount ?? 0,
        siteEvidenceCount,
        webEvidenceCount,
        retryCount: response.meta?.research?.retryCount ?? 0,
        durationMs,
        searchAvailable: response.meta?.research?.searchAvailable ?? false,
      } satisfies Prisma.InputJsonValue,
      displaySnapshotJson: displaySnapshot as Prisma.InputJsonValue,
      questionFingerprint: sha256(blocked ? 'blocked' : request.question.trim().toLowerCase()),
      topicFingerprint: topic.fingerprint,
      topicTerms: topic.terms,
      expiresAt,
    },
    select: { id: true },
  })
  return { sessionId, turnId: turn.id }
}

export function normalizePublicAssistantSessionList(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.sessionIds)) return null
  const sessionIds = value.sessionIds
    .map((sessionId) => readIdentifier(sessionId, 80))
    .filter(Boolean)
    .filter(unique)
    .slice(0, MAX_SESSION_HISTORY_IDS)
  return { sessionIds }
}

export function normalizePublicAssistantSessionAccess(value: unknown) {
  if (!isRecord(value)) return null
  const sessionId = readIdentifier(value.sessionId, 80)
  return sessionId ? { sessionId } : null
}

export async function loadPublicAssistantSessions(
  sessionIds: string[],
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return null
  if (sessionIds.length === 0) return []
  const sessions = await prisma.publicAssistantSession.findMany({
    where: {
      id: { in: sessionIds.slice(0, MAX_SESSION_HISTORY_IDS) },
      expiresAt: { gt: now },
      turns: { some: { expiresAt: { gt: now } } },
    },
    orderBy: [{ lastActiveAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      createdAt: true,
      lastActiveAt: true,
      expiresAt: true,
      turns: {
        where: { expiresAt: { gt: now } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 1,
        select: { question: true },
      },
      _count: { select: { turns: { where: { expiresAt: { gt: now } } } } },
    },
  })
  return sessions.map((session) => ({
    id: session.id,
    title: buildSessionTitle(session.turns[0]?.question),
    turnCount: session._count.turns,
    createdAt: session.createdAt.toISOString(),
    lastActiveAt: session.lastActiveAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  }))
}

export async function loadPublicAssistantSession(
  sessionId: string,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return { status: 'database-not-configured' as const }
  const session = await prisma.publicAssistantSession.findFirst({
    where: { id: sessionId, expiresAt: { gt: now } },
    select: {
      id: true,
      createdAt: true,
      lastActiveAt: true,
      expiresAt: true,
      turns: {
        where: { expiresAt: { gt: now } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: MAX_SESSION_TURNS + 1,
        select: {
          id: true,
          question: true,
          answer: true,
          mode: true,
          route: true,
          status: true,
          citationIdsJson: true,
          metricsJson: true,
          displaySnapshotJson: true,
          createdAt: true,
          feedback: { select: { rating: true } },
        },
      },
    },
  })
  if (!session) return { status: 'session-not-found' as const }
  const truncated = session.turns.length > MAX_SESSION_TURNS
  const turns = session.turns.slice(0, MAX_SESSION_TURNS).reverse().map((turn) => {
    const snapshot = readPublicAssistantDisplaySnapshot(turn.displaySnapshotJson)
    return {
      id: turn.id,
      question: turn.question,
      answer: turn.answer,
      mode: readPublicAssistantMode(turn.mode),
      route: readPublicAssistantRoute(turn.route),
      status: readPublicAssistantStatus(turn.status),
      createdAt: turn.createdAt.toISOString(),
      feedback: turn.feedback?.rating === 'up' || turn.feedback?.rating === 'down' ? turn.feedback.rating : null,
      ...(snapshot ?? buildLegacyDisplaySnapshot(turn)),
    }
  })
  return {
    status: 'loaded' as const,
    session: {
      id: session.id,
      title: buildSessionTitle(turns[0]?.question),
      turnCount: turns.length,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    },
    turns,
    truncated,
  }
}

export async function deletePublicAssistantSession(
  sessionId: string,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return { status: 'database-not-configured' as const }
  const deleted = await prisma.$transaction(async (tx) => {
    const session = await tx.publicAssistantSession.deleteMany({
      where: { id: sessionId, expiresAt: { gt: now } },
    })
    if (session.count > 0) {
      await tx.publicAssistantRequest.deleteMany({ where: { sessionId } })
    }
    return session
  })
  return deleted.count > 0 ? { status: 'deleted' as const } : { status: 'session-not-found' as const }
}

export function normalizePublicAssistantFeedback(value: unknown) {
  if (!isRecord(value)) return null
  const sessionId = readIdentifier(value.sessionId, 80)
  const turnId = readIdentifier(value.turnId, 80)
  const rating = value.rating === 'up' || value.rating === 'down' ? value.rating : ''
  if (!sessionId || !turnId || !rating) return null
  const reason = typeof value.reason === 'string' && FEEDBACK_REASONS.has(value.reason) ? value.reason : null
  const rawComment = typeof value.comment === 'string' ? value.comment.replace(/\s+/gu, ' ').trim().slice(0, 240) : ''
  const comment = rawComment ? (containsSecretShape(rawComment) ? '[blocked]' : rawComment) : null
  return { sessionId, turnId, rating, reason, comment }
}

export async function savePublicAssistantFeedback(
  input: NonNullable<ReturnType<typeof normalizePublicAssistantFeedback>>,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return { status: 'database-not-configured' as const }
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "PublicAssistantTurn"
      WHERE "id" = ${input.turnId}
        AND "sessionId" = ${input.sessionId}
        AND "expiresAt" > ${now}
      FOR UPDATE
    `)
    if (locked.length === 0) return { status: 'turn-not-found' as const }
    const turn = await tx.publicAssistantTurn.findFirst({
      where: { id: input.turnId, sessionId: input.sessionId, expiresAt: { gt: now } },
      include: { feedback: true },
    })
    if (!turn) return { status: 'turn-not-found' as const }
    await tx.publicAssistantFeedback.upsert({
      where: { turnId: turn.id },
      create: { sessionId: input.sessionId, turnId: turn.id, rating: input.rating, reason: input.reason, comment: input.comment },
      update: { rating: input.rating, reason: input.reason, comment: input.comment },
    })
    if (turn.feedback?.rating !== input.rating) {
      await tx.publicAssistantDailyAggregate.update({
        where: { id: turn.aggregateId },
        data: {
          ...(turn.feedback?.rating === 'up' ? { positiveCount: { decrement: 1 } } : {}),
          ...(turn.feedback?.rating === 'down' ? { negativeCount: { decrement: 1 } } : {}),
          ...(input.rating === 'up' ? { positiveCount: { increment: 1 } } : { negativeCount: { increment: 1 } }),
        },
      })
    }
    return { status: 'saved' as const }
  })
}

export async function loadPublicAssistantInsights(prisma: PrismaClient | null = getPrisma()) {
  if (!prisma) return null
  const since = new Date(Date.now() - 30 * 86_400_000)
  const [turns, feedback, gaps] = await Promise.all([
    prisma.publicAssistantTurn.groupBy({
      by: ['status', 'route'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { status: 'desc' } },
    }),
    prisma.publicAssistantFeedback.groupBy({
      by: ['rating'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.publicAssistantDailyAggregate.findMany({
      where: {
        date: { gte: shanghaiDate(since) },
        OR: [{ status: { in: ['partial', 'uncertain', 'degraded'] } }, { negativeCount: { gt: 0 } }],
      },
      orderBy: [{ negativeCount: 'desc' }, { totalCount: 'desc' }, { date: 'desc' }],
      take: 20,
      select: {
        date: true,
        topicFingerprint: true,
        topicTerms: true,
        route: true,
        status: true,
        totalCount: true,
        positiveCount: true,
        negativeCount: true,
        siteEvidenceTotal: true,
        webEvidenceTotal: true,
        latencyTotalMs: true,
      },
    }),
  ])
  return {
    windowDays: 30,
    turns: turns.map((item) => ({ status: item.status, route: item.route, count: item._count._all })),
    feedback: feedback.map((item) => ({ rating: item.rating, count: item._count._all })),
    gaps: gaps.map((item) => ({
      date: item.date.toISOString().slice(0, 10),
      topicFingerprint: item.topicFingerprint,
      topicTerms: item.topicTerms,
      route: item.route,
      status: item.status,
      totalCount: item.totalCount,
      positiveCount: item.positiveCount,
      negativeCount: item.negativeCount,
      siteEvidenceTotal: item.siteEvidenceTotal,
      webEvidenceTotal: item.webEvidenceTotal,
      averageLatencyMs: item.totalCount > 0 ? Number(item.latencyTotalMs / BigInt(item.totalCount)) : 0,
    })),
  }
}

async function maybeRunPublicAssistantRetention(prisma: PrismaClient, now: Date) {
  if (now.getTime() - lastRetentionAt < 3_600_000) return
  await runPublicAssistantRetention(prisma, now)
  lastRetentionAt = now.getTime()
}

export async function runPublicAssistantRetention(prisma: PrismaClient, now = new Date()) {
  await prisma.$transaction([
    prisma.publicAssistantRequest.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.publicAssistantTurn.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.publicAssistantSession.deleteMany({ where: { expiresAt: { lte: now } } }),
  ])
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function requestLeaseMs() {
  return Math.max(15_000, env.publicAssistantRequestTimeoutMs + REQUEST_LEASE_BUFFER_MS)
}

function buildBlockedTopic() {
  return { fingerprint: sha256('blocked').slice(0, 24), terms: 'blocked' }
}

function buildSessionTitle(question: string | undefined) {
  const normalized = question?.replace(/\s+/gu, ' ').trim() ?? ''
  if (!normalized || normalized === '[blocked]') return '未命名会话'
  return normalized.slice(0, 64)
}

function buildLegacyDisplaySnapshot(turn: {
  mode: string
  route: string
  status: string
  citationIdsJson: Prisma.JsonValue
  metricsJson: Prisma.JsonValue | null
}) {
  const metrics = isRecord(turn.metricsJson) ? turn.metricsJson : {}
  const citationIds = Array.isArray(turn.citationIdsJson)
    ? turn.citationIdsJson.map((value) => readIdentifier(value, 100)).filter(Boolean).slice(0, 8)
    : []
  return {
    version: 1 as const,
    claims: [],
    citations: [],
    suggestions: [],
    meta: {
      mode: 'fallback' as const,
      citationCount: citationIds.length,
      research: {
        requestedMode: readPublicAssistantMode(turn.mode),
        route: readPublicAssistantRoute(turn.route),
        status: readPublicAssistantStatus(turn.status),
        evidenceCount: readCount(metrics.evidenceCount),
        siteEvidenceCount: readCount(metrics.siteEvidenceCount),
        webEvidenceCount: readCount(metrics.webEvidenceCount),
        retryCount: readCount(metrics.retryCount),
        searchAvailable: metrics.searchAvailable === true,
        durationMs: readCount(metrics.durationMs),
      },
    },
  }
}

function readPublicAssistantMode(value: string) {
  return value === 'site' || value === 'web' ? value : 'auto'
}

function readPublicAssistantRoute(value: string) {
  return value === 'site' || value === 'web' || value === 'combined' ? value : 'direct'
}

function readPublicAssistantStatus(value: string) {
  return value === 'answered' || value === 'partial' || value === 'uncertain' || value === 'blocked' ? value : 'degraded'
}

function readCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function buildTopic(question: string) {
  const terms = (question.normalize('NFKC').toLowerCase().match(/[a-z0-9][a-z0-9._+-]{1,30}|[\p{Script=Han}]{2,10}/gu) ?? [])
    .filter((term) => !['什么', '怎么', '为什么', '可以', '是否', '这个', '那个', 'please', 'what', 'how'].includes(term))
    .filter((term, index, values) => values.indexOf(term) === index)
    .slice(0, 6)
  const normalized = terms.join('|') || 'general'
  return { fingerprint: sha256(normalized).slice(0, 24), terms: terms.join(' · ') || 'general' }
}

function shanghaiDate(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value)
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return new Date(`${read('year')}-${read('month')}-${read('day')}T00:00:00.000Z`)
}

function containsSecretShape(value: string) {
  return /sk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]{12,}|postgres(?:ql)?:\/\/[^\s]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|(?:api[_-]?key|token|password|secret|cookie)\s*[:=]\s*[^\s]{12,}/iu.test(value)
}

function readIdentifier(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return /^[a-zA-Z0-9_-]+$/u.test(normalized) ? normalized.slice(0, maxLength) : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function unique<T>(value: T, index: number, values: T[]) {
  return values.indexOf(value) === index
}
