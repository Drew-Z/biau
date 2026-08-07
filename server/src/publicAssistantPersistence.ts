import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { sha256 } from './crypto.js'
import { env } from './env.js'
import { getPrisma } from './db.js'
import type { PublicAssistantRequest } from './publicAssistantRuntime.js'
import type {
  ChatResponse,
  PublicAssistantConversationIdentity,
  PublicAssistantGenerationIntent,
  PublicAssistantHistoryTurn,
} from './types.js'
import {
  buildPublicAssistantDisplaySnapshot,
  readPublicAssistantDisplaySnapshot,
  readPublicAssistantHttpResponse,
  toPublicAssistantHttpResponse,
} from './publicAssistantProjection.js'

const FEEDBACK_REASONS = new Set(['helpful', 'clear', 'good-sources', 'incorrect', 'unclear', 'missing-sources', 'outdated', 'other'])
const MAX_SESSION_HISTORY_IDS = 24
const MAX_SESSION_TURNS = 100
const MAX_REVISIONS_PER_TURN = 8
const MAX_SESSION_BRANCHES = 24
const MAX_AGENT_HISTORY_TURNS = 6
const REQUEST_LEASE_BUFFER_MS = 5_000
let lastRetentionAt = 0

export interface PublicAssistantRequestLease {
  requestId: string
  leaseToken: string
  requestHash: string
}

export type PublicAssistantRequestClaim =
  | { status: 'database-not-configured' }
  | { status: 'acquired'; lease: PublicAssistantRequestLease; request: PublicAssistantRequest }
  | { status: 'completed'; response: NonNullable<ReturnType<typeof readPublicAssistantHttpResponse>> }
  | { status: 'processing'; retryAfterSeconds: number }
  | { status: 'conflict' }
  | { status: 'terminal'; errorCode: string }
  | { status: 'rejected'; errorCode: string; httpStatus: number }

interface StoredRequestTarget {
  intent: string
  claimedBranchSelectionVersion: number
  turnId: string | null
  revisionId: string | null
  branchId: string | null
  parentRevisionId: string | null
  baseRevisionId: string | null
}

interface PublicAssistantTurnWriteTarget {
  id: string
  question: string
  mode: string
  questionFingerprint: string
  topicFingerprint: string
  topicTerms: string
  parentRevisionId: string | null
}

type ResolvedPublicAssistantRequest =
  | {
      status: 'resolved'
      request: PublicAssistantRequest
      claimedBranchSelectionVersion: number
    }
  | Extract<PublicAssistantRequestClaim, { status: 'rejected' }>

export async function persistPublicAssistantTurn(
  request: PublicAssistantRequest,
  response: ChatResponse,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return null
  const expiresAt = new Date(now.getTime() + env.publicAssistantRetentionDays * 86_400_000)
  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolvePublicAssistantRequest(tx, request, now)
    if (resolved.status === 'rejected') return null
    const persisted = await writePublicAssistantGeneration(
      tx,
      resolved.request,
      response,
      resolved.claimedBranchSelectionVersion,
      now,
      expiresAt,
    )
    return 'status' in persisted ? null : persisted
  })

  await maybeRunPublicAssistantRetention(prisma, now).catch(() => undefined)
  return result
}

export function buildPublicAssistantRequestHash(request: PublicAssistantRequest) {
  return sha256(JSON.stringify({
    contractVersion: request.contractVersion,
    sessionId: request.sessionId,
    question: request.question,
    ...(request.attachment ? {
      attachment: { kind: request.attachment.kind, mimeType: request.attachment.mimeType, digest: request.attachment.digest },
    } : {}),
    mode: request.mode,
    history: request.history.map((turn) => ({ role: turn.role, content: turn.content })),
    pageContext: request.pageContext
      ? {
          path: request.pageContext.path,
          title: request.pageContext.title ?? '',
          description: request.pageContext.description ?? '',
        }
      : null,
    intent: request.intent,
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
    return await prisma.$transaction(async (tx) => {
      const resolved = await resolvePublicAssistantRequest(tx, request, now)
      if (resolved.status === 'rejected') return resolved
      const target = generationTargetFields(resolved.request.intent)
      await tx.publicAssistantRequest.create({
        data: {
          requestId: request.requestId,
          sessionId: request.sessionId,
          requestHash,
          intent: resolved.request.intent.kind === 'answer-revision' ? 'answer_revision' : 'new_turn',
          status: 'processing',
          leaseToken,
          leaseExpiresAt,
          claimedBranchSelectionVersion: resolved.claimedBranchSelectionVersion,
          ...target,
          expiresAt,
        },
        select: { requestId: true },
      })
      return {
        status: 'acquired' as const,
        lease: { requestId: request.requestId, leaseToken, requestHash },
        request: resolved.request,
      }
    })
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
      claimedBranchSelectionVersion: number
      intent: string
      turnId: string | null
      revisionId: string | null
      branchId: string | null
      parentRevisionId: string | null
      baseRevisionId: string | null
      responseJson: Prisma.JsonValue | null
      errorCode: string | null
    }>>(Prisma.sql`
      SELECT
        "requestId",
        "requestHash",
        "status",
        "leaseToken",
        "leaseExpiresAt",
        "intent"::text,
        "claimedBranchSelectionVersion",
        "turnId",
        "revisionId",
        "branchId",
        "parentRevisionId",
        "baseRevisionId",
        "responseJson",
        "errorCode"
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

    const resolved = await resolveStoredPublicAssistantRequest(tx, request, existing, now)
    if (resolved.status === 'rejected') return resolved

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
    return {
      status: 'acquired',
      lease: { requestId: request.requestId, leaseToken, requestHash },
      request: resolved.request,
    } as const
  })
}

async function resolvePublicAssistantRequest(
  tx: Prisma.TransactionClient,
  request: PublicAssistantRequest,
  now: Date,
): Promise<ResolvedPublicAssistantRequest> {
  const session = await tx.publicAssistantSession.findFirst({
    where: { id: request.sessionId, expiresAt: { gt: now } },
    select: {
      branchSelectionVersion: true,
      activeBranch: { select: { id: true, headRevisionId: true } },
    },
  })
  let intent = request.intent
  if (request.contractVersion === 1 && intent.kind === 'new-turn' && session?.activeBranch?.headRevisionId) {
    intent = {
      kind: 'new-turn',
      branchId: session.activeBranch.id,
      parentRevisionId: session.activeBranch.headRevisionId,
    }
  }
  return resolveGenerationContext(tx, request, intent, session?.branchSelectionVersion ?? 0, now)
}

async function resolveStoredPublicAssistantRequest(
  tx: Prisma.TransactionClient,
  request: PublicAssistantRequest,
  stored: StoredRequestTarget,
  now: Date,
): Promise<ResolvedPublicAssistantRequest> {
  const intent = stored.intent === 'answer_revision'
    && stored.branchId
    && stored.turnId
    && stored.baseRevisionId
    ? {
        kind: 'answer-revision' as const,
        branchId: stored.branchId,
        turnId: stored.turnId,
        baseRevisionId: stored.baseRevisionId,
      }
    : {
        kind: 'new-turn' as const,
        branchId: stored.branchId,
        parentRevisionId: stored.parentRevisionId,
      }
  return resolveGenerationContext(tx, request, intent, stored.claimedBranchSelectionVersion, now)
}

async function resolveGenerationContext(
  tx: Prisma.TransactionClient,
  request: PublicAssistantRequest,
  intent: PublicAssistantGenerationIntent,
  claimedBranchSelectionVersion: number,
  now: Date,
): Promise<ResolvedPublicAssistantRequest> {
  if (intent.kind === 'new-turn') {
    if (Boolean(intent.branchId) !== Boolean(intent.parentRevisionId)) {
      return rejectedRequest('invalid-public-assistant-generation-intent', 400)
    }
    if (!intent.branchId || !intent.parentRevisionId) {
      return {
        status: 'resolved',
        request: { ...request, intent, history: request.contractVersion === 1 ? request.history : [] },
        claimedBranchSelectionVersion,
      }
    }
    const branch = await tx.publicAssistantBranch.findFirst({
      where: { id: intent.branchId, sessionId: request.sessionId, expiresAt: { gt: now } },
      select: { id: true },
    })
    const parent = await loadRevisionTarget(tx, request.sessionId, intent.parentRevisionId, now)
    if (!branch || !parent) return rejectedRequest('public-assistant-revision-not-found', 404)
    const history = await loadPublicAssistantAgentHistory(tx, request.sessionId, intent.parentRevisionId)
    if (!history) return rejectedRequest('public-assistant-history-invalid', 409)
    return {
      status: 'resolved',
      request: { ...request, intent, history },
      claimedBranchSelectionVersion,
    }
  }

  const branch = await tx.publicAssistantBranch.findFirst({
    where: { id: intent.branchId, sessionId: request.sessionId, expiresAt: { gt: now } },
    select: { id: true },
  })
  const base = await loadRevisionTarget(tx, request.sessionId, intent.baseRevisionId, now)
  if (!branch || !base || base.turnId !== intent.turnId) {
    return rejectedRequest('public-assistant-revision-not-found', 404)
  }
  const revisionCount = await tx.publicAssistantAnswerRevision.count({
    where: { turnId: intent.turnId, expiresAt: { gt: now } },
  })
  if (revisionCount >= MAX_REVISIONS_PER_TURN) {
    return rejectedRequest('public-assistant-revision-limit', 409)
  }
  const history = base.parentRevisionId
    ? await loadPublicAssistantAgentHistory(tx, request.sessionId, base.parentRevisionId)
    : []
  if (history === null) return rejectedRequest('public-assistant-history-invalid', 409)
  return {
    status: 'resolved',
    request: { ...request, question: base.question, mode: readPublicAssistantMode(base.mode), intent, history },
    claimedBranchSelectionVersion,
  }
}

async function loadRevisionTarget(
  tx: Prisma.TransactionClient,
  sessionId: string,
  revisionId: string,
  now: Date,
) {
  return tx.publicAssistantAnswerRevision.findFirst({
    where: {
      id: revisionId,
      expiresAt: { gt: now },
      turn: { is: { sessionId, expiresAt: { gt: now } } },
    },
    select: {
      id: true,
      turnId: true,
      turn: { select: { parentRevisionId: true, question: true, mode: true } },
    },
  }).then((revision) => revision
    ? {
        id: revision.id,
        turnId: revision.turnId,
        parentRevisionId: revision.turn.parentRevisionId,
        question: revision.turn.question,
        mode: revision.turn.mode,
      }
    : null)
}

async function loadPublicAssistantAgentHistory(
  tx: Prisma.TransactionClient,
  sessionId: string,
  headRevisionId: string,
): Promise<PublicAssistantHistoryTurn[] | null> {
  const rows = await tx.$queryRaw<Array<{
    question: string
    answer: string
    depth: number
  }>>(Prisma.sql`
    WITH RECURSIVE selected_path AS (
      SELECT
        turn."question",
        revision."answer",
        turn."parentRevisionId",
        1 AS depth
      FROM "PublicAssistantAnswerRevision" AS revision
      JOIN "PublicAssistantTurn" AS turn ON turn."id" = revision."turnId"
      WHERE revision."id" = ${headRevisionId}
        AND turn."sessionId" = ${sessionId}

      UNION ALL

      SELECT
        parent_turn."question",
        parent_revision."answer",
        parent_turn."parentRevisionId",
        selected_path.depth + 1
      FROM selected_path
      JOIN "PublicAssistantAnswerRevision" AS parent_revision
        ON parent_revision."id" = selected_path."parentRevisionId"
      JOIN "PublicAssistantTurn" AS parent_turn
        ON parent_turn."id" = parent_revision."turnId"
       AND parent_turn."sessionId" = ${sessionId}
      WHERE selected_path.depth < ${MAX_AGENT_HISTORY_TURNS}
    )
    SELECT "question", "answer", depth
    FROM selected_path
    ORDER BY depth DESC
  `)
  if (rows.length === 0) return null
  return rows.flatMap((row) => [
    { role: 'user' as const, content: row.question.slice(0, 800) },
    { role: 'assistant' as const, content: row.answer.slice(0, 800) },
  ])
}

function generationTargetFields(intent: PublicAssistantGenerationIntent) {
  return intent.kind === 'answer-revision'
    ? {
        branchId: intent.branchId,
        turnId: intent.turnId,
        baseRevisionId: intent.baseRevisionId,
        parentRevisionId: null,
      }
    : {
        branchId: intent.branchId,
        turnId: null,
        baseRevisionId: null,
        parentRevisionId: intent.parentRevisionId,
      }
}

function rejectedRequest(errorCode: string, httpStatus: number) {
  return { status: 'rejected' as const, errorCode, httpStatus }
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
  const completed = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{
      requestId: string
      requestHash: string
      status: string
      leaseToken: string
      leaseExpiresAt: Date
      claimedBranchSelectionVersion: number
    }>>(Prisma.sql`
      SELECT "requestId", "requestHash", "status", "leaseToken", "leaseExpiresAt", "claimedBranchSelectionVersion"
      FROM "PublicAssistantRequest"
      WHERE "requestId" = ${lease.requestId}
      FOR UPDATE
    `)
    const locked = rows[0]
    if (
      !locked
      || locked.requestHash !== lease.requestHash
      || locked.status !== 'processing'
      || locked.leaseToken !== lease.leaseToken
      || locked.leaseExpiresAt.getTime() <= now.getTime()
    ) {
      return { status: 'stale' as const }
    }

    const persisted = await writePublicAssistantGeneration(
      tx,
      request,
      response,
      locked.claimedBranchSelectionVersion,
      now,
      expiresAt,
    )
    if ('status' in persisted) return persisted
    const conversation: PublicAssistantConversationIdentity = {
      branchId: persisted.branchId,
      branchOrdinal: persisted.branchOrdinal,
      turnId: persisted.turnId,
      revisionId: persisted.revisionId,
      revisionNo: persisted.revisionNo,
      basedOnRevisionId: persisted.basedOnRevisionId,
      activated: persisted.activated,
    }
    const publicResponse = toPublicAssistantHttpResponse({
      ...response,
      requestId: request.requestId,
      sessionId: persisted.sessionId,
      messageId: persisted.turnId,
      conversation,
    })
    await tx.publicAssistantRequest.update({
      where: { requestId: lease.requestId },
      data: {
        status: 'completed',
        turnId: persisted.turnId,
        revisionId: persisted.revisionId,
        branchId: persisted.branchId,
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

async function writePublicAssistantGeneration(
  tx: Prisma.TransactionClient,
  request: PublicAssistantRequest,
  response: ChatResponse,
  claimedBranchSelectionVersion: number,
  now: Date,
  expiresAt: Date,
) {
  const sessionId = request.sessionId
  await tx.publicAssistantSession.upsert({
    where: { id: sessionId },
    create: { id: sessionId, lastActiveAt: now, expiresAt },
    update: { lastActiveAt: now, expiresAt },
  })
  const sessionRows = await tx.$queryRaw<Array<{
    id: string
    branchSelectionVersion: number
  }>>(Prisma.sql`
    SELECT "id", "branchSelectionVersion"
    FROM "PublicAssistantSession"
    WHERE "id" = ${sessionId}
    FOR UPDATE
  `)
  const lockedSession = sessionRows[0]
  if (!lockedSession) return rejectedRequest('public-assistant-session-not-found', 404)

  const intent = request.intent
  const existingBranch = intent.branchId
    ? await tx.publicAssistantBranch.findFirst({
        where: { id: intent.branchId, sessionId, expiresAt: { gt: now } },
        select: { id: true, ordinal: true, headRevisionId: true },
      })
    : null
  if (intent.branchId && !existingBranch) return rejectedRequest('public-assistant-revision-not-found', 404)

  let existingTurn: PublicAssistantTurnWriteTarget | null = null
  let baseRevisionId: string | null = null
  let revisionNo = 1
  let createsBranch = !existingBranch

  if (intent.kind === 'answer-revision') {
    const turnRows = await tx.$queryRaw<PublicAssistantTurnWriteTarget[]>(Prisma.sql`
      SELECT
        "id",
        "question",
        "mode",
        "questionFingerprint",
        "topicFingerprint",
        "topicTerms",
        "parentRevisionId"
      FROM "PublicAssistantTurn"
      WHERE "id" = ${intent.turnId}
        AND "sessionId" = ${sessionId}
        AND "expiresAt" > ${now}
      FOR UPDATE
    `)
    existingTurn = turnRows[0] ?? null
    if (!existingTurn) return rejectedRequest('public-assistant-revision-not-found', 404)
    const baseRevision = await tx.publicAssistantAnswerRevision.findFirst({
      where: { id: intent.baseRevisionId, turnId: existingTurn.id, expiresAt: { gt: now } },
      select: { id: true },
    })
    if (!baseRevision) return rejectedRequest('public-assistant-revision-not-found', 404)
    const latestRevision = await tx.publicAssistantAnswerRevision.aggregate({
      where: { turnId: existingTurn.id },
      _max: { revisionNo: true },
      _count: { _all: true },
    })
    if (latestRevision._count._all >= MAX_REVISIONS_PER_TURN) {
      return rejectedRequest('public-assistant-revision-limit', 409)
    }
    revisionNo = (latestRevision._max.revisionNo ?? 0) + 1
    baseRevisionId = baseRevision.id
    createsBranch = true
  } else if (intent.parentRevisionId) {
    const parentRevision = await loadRevisionTarget(tx, sessionId, intent.parentRevisionId, now)
    if (!parentRevision) return rejectedRequest('public-assistant-revision-not-found', 404)
    createsBranch = existingBranch?.headRevisionId !== intent.parentRevisionId
  }

  const branchCount = await tx.publicAssistantBranch.count({ where: { sessionId } })
  if (createsBranch && branchCount >= MAX_SESSION_BRANCHES) {
    return rejectedRequest('public-assistant-branch-limit', 409)
  }

  const route = response.meta?.research?.route ?? 'direct'
  const status = response.status ?? 'degraded'
  const siteEvidenceCount = response.meta?.research?.siteEvidenceCount ?? 0
  const webEvidenceCount = response.meta?.research?.webEvidenceCount ?? 0
  const durationMs = response.meta?.research?.durationMs ?? 0
  const sourceQuestion = existingTurn?.question ?? request.question
  const blocked = status === 'blocked' || containsSecretShape(sourceQuestion) || containsSecretShape(response.answer)
  const topic = existingTurn
    ? { fingerprint: existingTurn.topicFingerprint, terms: existingTurn.topicTerms }
    : blocked
      ? buildBlockedTopic()
      : buildTopic(sourceQuestion)
  const aggregate = await tx.publicAssistantDailyAggregate.upsert({
    where: {
      date_topicFingerprint_route_status: {
        date: shanghaiDate(now),
        topicFingerprint: topic.fingerprint,
        route,
        status,
      },
    },
    create: {
      date: shanghaiDate(now),
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

  const turn = existingTurn ?? await tx.publicAssistantTurn.create({
    data: {
      sessionId,
      parentRevisionId: intent.kind === 'new-turn' ? intent.parentRevisionId : null,
      question: blocked ? '[blocked]' : request.question.slice(0, 500),
      mode: request.mode,
      questionFingerprint: sha256(blocked ? 'blocked' : request.question.trim().toLowerCase()),
      topicFingerprint: topic.fingerprint,
      topicTerms: topic.terms,
      expiresAt,
    },
    select: {
      id: true,
      question: true,
      mode: true,
      questionFingerprint: true,
      topicFingerprint: true,
      topicTerms: true,
      parentRevisionId: true,
    },
  })
  const citationIds = response.citations.map((citation) => citation.id).slice(0, 8)
  const displaySnapshot = blocked
    ? { version: 1, claims: [], citations: [], suggestions: [], meta: { mode: 'fallback', citationCount: 0 } }
    : buildPublicAssistantDisplaySnapshot(response)
  const revision = await tx.publicAssistantAnswerRevision.create({
    data: {
      turnId: turn.id,
      aggregateId: aggregate.id,
      revisionNo,
      basedOnRevisionId: baseRevisionId,
      answer: blocked ? '[blocked]' : response.answer.slice(0, 4_000),
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
      expiresAt,
    },
    select: { id: true, revisionNo: true, basedOnRevisionId: true },
  })

  const branch = createsBranch
    ? await createPublicAssistantBranch(
        tx,
        sessionId,
        revision.id,
        intent.kind === 'answer-revision' ? intent.baseRevisionId : intent.parentRevisionId,
        now,
        expiresAt,
      )
    : await tx.publicAssistantBranch.update({
        where: { id: existingBranch!.id },
        data: { headRevisionId: revision.id, lastActiveAt: now, expiresAt },
        select: { id: true, ordinal: true },
      })

  const activated = lockedSession.branchSelectionVersion === claimedBranchSelectionVersion
  await tx.publicAssistantSession.update({
    where: { id: sessionId },
    data: {
      lastActiveAt: now,
      expiresAt,
      ...(activated ? { activeBranchId: branch.id } : {}),
    },
  })
  return {
    sessionId,
    turnId: turn.id,
    revisionId: revision.id,
    revisionNo: revision.revisionNo,
    basedOnRevisionId: revision.basedOnRevisionId,
    branchId: branch.id,
    branchOrdinal: branch.ordinal,
    activated,
  }
}

async function createPublicAssistantBranch(
  tx: Prisma.TransactionClient,
  sessionId: string,
  headRevisionId: string,
  forkedFromRevisionId: string | null,
  now: Date,
  expiresAt: Date,
) {
  const latest = await tx.publicAssistantBranch.aggregate({
    where: { sessionId },
    _max: { ordinal: true },
  })
  return tx.publicAssistantBranch.create({
    data: {
      sessionId,
      ordinal: (latest._max.ordinal ?? 0) + 1,
      headRevisionId,
      forkedFromRevisionId,
      lastActiveAt: now,
      expiresAt,
    },
    select: { id: true, ordinal: true },
  })
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

export function normalizePublicAssistantBranchAction(value: unknown) {
  if (!isRecord(value)) return null
  const sessionId = readIdentifier(value.sessionId, 80)
  if (!sessionId) return null
  if (value.action === 'select') {
    const branchId = readIdentifier(value.branchId, 100)
    return branchId ? { sessionId, action: 'select' as const, branchId } : null
  }
  if (value.action === 'continue-from-revision') {
    const revisionId = readIdentifier(value.revisionId, 100)
    return revisionId ? { sessionId, action: 'continue-from-revision' as const, revisionId } : null
  }
  return null
}

export async function selectPublicAssistantBranch(
  input: NonNullable<ReturnType<typeof normalizePublicAssistantBranchAction>>,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return { status: 'database-not-configured' as const }
  const expiresAt = new Date(now.getTime() + env.publicAssistantRetentionDays * 86_400_000)
  return prisma.$transaction(async (tx) => {
    const sessions = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "PublicAssistantSession"
      WHERE "id" = ${input.sessionId}
        AND "expiresAt" > ${now}
      FOR UPDATE
    `)
    if (sessions.length === 0) return { status: 'session-not-found' as const }

    let branch: { id: string; ordinal: number } | null
    if (input.action === 'select') {
      branch = await tx.publicAssistantBranch.findFirst({
        where: {
          id: input.branchId,
          sessionId: input.sessionId,
          headRevisionId: { not: null },
          expiresAt: { gt: now },
        },
        select: { id: true, ordinal: true },
      })
    } else {
      const revision = await loadRevisionTarget(tx, input.sessionId, input.revisionId, now)
      if (!revision) return { status: 'revision-not-found' as const }
      branch = await tx.publicAssistantBranch.findFirst({
        where: {
          sessionId: input.sessionId,
          headRevisionId: input.revisionId,
          expiresAt: { gt: now },
        },
        orderBy: [{ lastActiveAt: 'desc' }, { id: 'asc' }],
        select: { id: true, ordinal: true },
      })
      if (!branch) {
        const branchCount = await tx.publicAssistantBranch.count({ where: { sessionId: input.sessionId } })
        if (branchCount >= MAX_SESSION_BRANCHES) return { status: 'branch-limit' as const }
        branch = await createPublicAssistantBranch(
          tx,
          input.sessionId,
          input.revisionId,
          input.revisionId,
          now,
          expiresAt,
        )
      }
    }
    if (!branch) return { status: 'branch-not-found' as const }
    await tx.publicAssistantBranch.update({
      where: { id: branch.id },
      data: { lastActiveAt: now, expiresAt },
    })
    await tx.publicAssistantSession.update({
      where: { id: input.sessionId },
      data: {
        activeBranchId: branch.id,
        branchSelectionVersion: { increment: 1 },
        lastActiveAt: now,
        expiresAt,
      },
    })
    return { status: 'selected' as const, branchId: branch.id }
  })
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
      activeBranchId: { not: null },
    },
    orderBy: [{ lastActiveAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      createdAt: true,
      lastActiveAt: true,
      expiresAt: true,
      activeBranchId: true,
    },
  })
  if (sessions.length === 0) return []
  const summaries = await prisma.$queryRaw<Array<{
    sessionId: string
    title: string
    turnCount: bigint
  }>>(Prisma.sql`
    WITH RECURSIVE active_paths AS (
      SELECT
        session."id" AS "sessionId",
        turn."question",
        turn."parentRevisionId",
        1 AS depth
      FROM "PublicAssistantSession" AS session
      JOIN "PublicAssistantBranch" AS branch ON branch."id" = session."activeBranchId"
      JOIN "PublicAssistantAnswerRevision" AS revision ON revision."id" = branch."headRevisionId"
      JOIN "PublicAssistantTurn" AS turn
        ON turn."id" = revision."turnId"
       AND turn."sessionId" = session."id"
      WHERE session."id" IN (${Prisma.join(sessions.map((session) => session.id))})

      UNION ALL

      SELECT
        active_paths."sessionId",
        parent_turn."question",
        parent_turn."parentRevisionId",
        active_paths.depth + 1
      FROM active_paths
      JOIN "PublicAssistantAnswerRevision" AS parent_revision
        ON parent_revision."id" = active_paths."parentRevisionId"
      JOIN "PublicAssistantTurn" AS parent_turn
        ON parent_turn."id" = parent_revision."turnId"
       AND parent_turn."sessionId" = active_paths."sessionId"
      WHERE active_paths.depth < ${MAX_SESSION_TURNS + 1}
    )
    SELECT
      "sessionId",
      (ARRAY_AGG("question" ORDER BY depth DESC))[1] AS title,
      COUNT(*) AS "turnCount"
    FROM active_paths
    GROUP BY "sessionId"
  `)
  const summaryBySession = new Map(summaries.map((summary) => [summary.sessionId, summary]))
  return sessions.flatMap((session) => {
    const summary = summaryBySession.get(session.id)
    if (!summary || !session.activeBranchId) return []
    return [{
      id: session.id,
      activeBranchId: session.activeBranchId,
      title: buildSessionTitle(summary.title),
      turnCount: Math.min(MAX_SESSION_TURNS, Number(summary.turnCount)),
      hasEarlierTurns: Number(summary.turnCount) > MAX_SESSION_TURNS,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    }]
  })
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
      activeBranchId: true,
      createdAt: true,
      lastActiveAt: true,
      expiresAt: true,
    },
  })
  if (!session?.activeBranchId) return { status: 'session-not-found' as const }
  const pathRows = await loadPublicAssistantBranchPath(prisma, sessionId, session.activeBranchId, MAX_SESSION_TURNS + 1)
  if (!pathRows || pathRows.length === 0) return { status: 'history-invalid' as const }
  const hasEarlierTurns = pathRows.length > MAX_SESSION_TURNS
  const visiblePath = pathRows.slice(0, MAX_SESSION_TURNS)
  const selectedRevisionByTurn = new Map(visiblePath.map((row) => [row.turnId, row.revisionId]))
  const pathTurnIds = visiblePath.map((row) => row.turnId)
  const loadedTurns = await prisma.publicAssistantTurn.findMany({
    where: { id: { in: pathTurnIds }, sessionId, expiresAt: { gt: now } },
    select: {
      id: true,
      question: true,
      mode: true,
      parentRevisionId: true,
      createdAt: true,
      revisions: {
        where: { expiresAt: { gt: now } },
        orderBy: [{ revisionNo: 'asc' }, { id: 'asc' }],
        take: MAX_REVISIONS_PER_TURN + 1,
        select: {
          id: true,
          revisionNo: true,
          basedOnRevisionId: true,
          answer: true,
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
  const turnById = new Map(loadedTurns.map((turn) => [turn.id, turn]))
  let revisionsTruncated = false
  const turns = [...visiblePath].reverse().map((path) => {
    const turn = turnById.get(path.turnId)
    if (!turn) return null
    if (turn.revisions.length > MAX_REVISIONS_PER_TURN) revisionsTruncated = true
    const revisions = turn.revisions.slice(0, MAX_REVISIONS_PER_TURN).map((revision) => {
      const snapshot = readPublicAssistantDisplaySnapshot(revision.displaySnapshotJson)
      return {
        id: revision.id,
        revisionNo: revision.revisionNo,
        basedOnRevisionId: revision.basedOnRevisionId,
        answer: revision.answer,
        route: readPublicAssistantRoute(revision.route),
        status: readPublicAssistantStatus(revision.status),
        createdAt: revision.createdAt.toISOString(),
        feedback: revision.feedback?.rating === 'up' || revision.feedback?.rating === 'down'
          ? revision.feedback.rating
          : null,
        ...(snapshot ?? buildLegacyDisplaySnapshot({ mode: turn.mode, ...revision })),
      }
    })
    const selectedRevisionId = selectedRevisionByTurn.get(turn.id)
    if (!selectedRevisionId || !revisions.some((revision) => revision.id === selectedRevisionId)) return null
    return {
      id: turn.id,
      question: turn.question,
      mode: readPublicAssistantMode(turn.mode),
      parentRevisionId: turn.parentRevisionId,
      selectedRevisionId,
      revisions,
      createdAt: turn.createdAt.toISOString(),
    }
  }).filter((turn): turn is NonNullable<typeof turn> => turn !== null)
  if (turns.length !== visiblePath.length) return { status: 'history-invalid' as const }

  const branchRows = await prisma.publicAssistantBranch.findMany({
    where: { sessionId, expiresAt: { gt: now }, headRevisionId: { not: null } },
    orderBy: [{ ordinal: 'asc' }, { id: 'asc' }],
    take: MAX_SESSION_BRANCHES + 1,
    select: {
      id: true,
      ordinal: true,
      headRevisionId: true,
      lastActiveAt: true,
      headRevision: { select: { turn: { select: { question: true } } } },
    },
  })
  const branchesTruncated = branchRows.length > MAX_SESSION_BRANCHES
  const visibleBranches = branchRows.slice(0, MAX_SESSION_BRANCHES)
  const branchCounts = await loadPublicAssistantBranchCounts(prisma, sessionId, visibleBranches.map((branch) => branch.id))
  const branches = visibleBranches.flatMap((branch) => {
    if (!branch.headRevisionId || !branch.headRevision) return []
    const count = branchCounts.get(branch.id) ?? 0
    return [{
      id: branch.id,
      ordinal: branch.ordinal,
      headRevisionId: branch.headRevisionId,
      preview: buildSessionTitle(branch.headRevision.turn.question),
      turnCount: Math.min(MAX_SESSION_TURNS, count),
      hasEarlierTurns: count > MAX_SESSION_TURNS,
      lastActiveAt: branch.lastActiveAt.toISOString(),
    }]
  })
  return {
    status: 'loaded' as const,
    session: {
      id: session.id,
      activeBranchId: session.activeBranchId,
      title: buildSessionTitle(turns[0]?.question),
      turnCount: turns.length,
      hasEarlierTurns,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    },
    branches,
    turns,
    hasEarlierTurns,
    revisionsTruncated,
    branchesTruncated,
    truncated: hasEarlierTurns,
  }
}

async function loadPublicAssistantBranchPath(
  prisma: PrismaClient | Prisma.TransactionClient,
  sessionId: string,
  branchId: string,
  limit: number,
) {
  const rows = await prisma.$queryRaw<Array<{
    revisionId: string
    turnId: string
    parentRevisionId: string | null
    depth: number
  }>>(Prisma.sql`
    WITH RECURSIVE selected_path AS (
      SELECT
        revision."id" AS "revisionId",
        turn."id" AS "turnId",
        turn."parentRevisionId",
        1 AS depth
      FROM "PublicAssistantBranch" AS branch
      JOIN "PublicAssistantAnswerRevision" AS revision ON revision."id" = branch."headRevisionId"
      JOIN "PublicAssistantTurn" AS turn
        ON turn."id" = revision."turnId"
       AND turn."sessionId" = branch."sessionId"
      WHERE branch."id" = ${branchId}
        AND branch."sessionId" = ${sessionId}

      UNION ALL

      SELECT
        parent_revision."id",
        parent_turn."id",
        parent_turn."parentRevisionId",
        selected_path.depth + 1
      FROM selected_path
      JOIN "PublicAssistantAnswerRevision" AS parent_revision
        ON parent_revision."id" = selected_path."parentRevisionId"
      JOIN "PublicAssistantTurn" AS parent_turn
        ON parent_turn."id" = parent_revision."turnId"
       AND parent_turn."sessionId" = ${sessionId}
      WHERE selected_path.depth < ${limit}
    )
    SELECT "revisionId", "turnId", "parentRevisionId", depth
    FROM selected_path
    ORDER BY depth ASC
  `)
  return rows.length > 0 ? rows : null
}

async function loadPublicAssistantBranchCounts(
  prisma: PrismaClient | Prisma.TransactionClient,
  sessionId: string,
  branchIds: string[],
) {
  if (branchIds.length === 0) return new Map<string, number>()
  const rows = await prisma.$queryRaw<Array<{ branchId: string; turnCount: bigint }>>(Prisma.sql`
    WITH RECURSIVE branch_paths AS (
      SELECT
        branch."id" AS "branchId",
        turn."parentRevisionId",
        1 AS depth
      FROM "PublicAssistantBranch" AS branch
      JOIN "PublicAssistantAnswerRevision" AS revision ON revision."id" = branch."headRevisionId"
      JOIN "PublicAssistantTurn" AS turn
        ON turn."id" = revision."turnId"
       AND turn."sessionId" = branch."sessionId"
      WHERE branch."sessionId" = ${sessionId}
        AND branch."id" IN (${Prisma.join(branchIds)})

      UNION ALL

      SELECT
        branch_paths."branchId",
        parent_turn."parentRevisionId",
        branch_paths.depth + 1
      FROM branch_paths
      JOIN "PublicAssistantAnswerRevision" AS parent_revision
        ON parent_revision."id" = branch_paths."parentRevisionId"
      JOIN "PublicAssistantTurn" AS parent_turn
        ON parent_turn."id" = parent_revision."turnId"
       AND parent_turn."sessionId" = ${sessionId}
      WHERE branch_paths.depth < ${MAX_SESSION_TURNS + 1}
    )
    SELECT "branchId", COUNT(*) AS "turnCount"
    FROM branch_paths
    GROUP BY "branchId"
  `)
  return new Map(rows.map((row) => [row.branchId, Number(row.turnCount)]))
}

export async function deletePublicAssistantSession(
  sessionId: string,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return { status: 'database-not-configured' as const }
  const deleted = await prisma.$transaction(async (tx) => {
    const exists = await tx.publicAssistantSession.findFirst({
      where: { id: sessionId, expiresAt: { gt: now } },
      select: { id: true },
    })
    if (!exists) return { count: 0 }
    await tx.publicAssistantRequest.deleteMany({ where: { sessionId } })
    const session = await tx.publicAssistantSession.deleteMany({
      where: { id: sessionId, expiresAt: { gt: now } },
    })
    return session
  })
  return deleted.count > 0 ? { status: 'deleted' as const } : { status: 'session-not-found' as const }
}

export function normalizePublicAssistantFeedback(value: unknown) {
  if (!isRecord(value)) return null
  const sessionId = readIdentifier(value.sessionId, 80)
  const revisionId = readIdentifier(value.revisionId, 100)
  const rating = value.rating === 'up' || value.rating === 'down' ? value.rating : ''
  if (!sessionId || !revisionId || !rating) return null
  const reason = typeof value.reason === 'string' && FEEDBACK_REASONS.has(value.reason) ? value.reason : null
  const rawComment = typeof value.comment === 'string' ? value.comment.replace(/\s+/gu, ' ').trim().slice(0, 240) : ''
  const comment = rawComment ? (containsSecretShape(rawComment) ? '[blocked]' : rawComment) : null
  return { sessionId, revisionId, rating, reason, comment }
}

export async function savePublicAssistantFeedback(
  input: NonNullable<ReturnType<typeof normalizePublicAssistantFeedback>>,
  prisma: PrismaClient | null = getPrisma(),
  now = new Date(),
) {
  if (!prisma) return { status: 'database-not-configured' as const }
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT revision."id"
      FROM "PublicAssistantAnswerRevision" AS revision
      JOIN "PublicAssistantTurn" AS turn ON turn."id" = revision."turnId"
      WHERE revision."id" = ${input.revisionId}
        AND turn."sessionId" = ${input.sessionId}
        AND revision."expiresAt" > ${now}
        AND turn."expiresAt" > ${now}
      FOR UPDATE OF revision
    `)
    if (locked.length === 0) return { status: 'revision-not-found' as const }
    const revision = await tx.publicAssistantAnswerRevision.findFirst({
      where: {
        id: input.revisionId,
        expiresAt: { gt: now },
        turn: { is: { sessionId: input.sessionId, expiresAt: { gt: now } } },
      },
      include: { feedback: true },
    })
    if (!revision) return { status: 'revision-not-found' as const }
    await tx.publicAssistantFeedback.upsert({
      where: { revisionId: revision.id },
      create: {
        sessionId: input.sessionId,
        revisionId: revision.id,
        rating: input.rating,
        reason: input.reason,
        comment: input.comment,
      },
      update: { rating: input.rating, reason: input.reason, comment: input.comment },
    })
    if (revision.feedback?.rating !== input.rating) {
      await tx.publicAssistantDailyAggregate.update({
        where: { id: revision.aggregateId },
        data: {
          ...(revision.feedback?.rating === 'up' ? { positiveCount: { decrement: 1 } } : {}),
          ...(revision.feedback?.rating === 'down' ? { negativeCount: { decrement: 1 } } : {}),
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
  const [generations, feedback, gaps] = await Promise.all([
    prisma.publicAssistantAnswerRevision.groupBy({
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
    turns: generations.map((item) => ({ status: item.status, route: item.route, count: item._count._all })),
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
  await prisma.$transaction(async (tx) => {
    const expiredSessions = await tx.publicAssistantSession.findMany({
      where: { expiresAt: { lte: now } },
      select: { id: true },
    })
    const expiredSessionIds = expiredSessions.map((session) => session.id)
    await tx.publicAssistantRequest.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          ...(expiredSessionIds.length > 0 ? [{ sessionId: { in: expiredSessionIds } }] : []),
        ],
      },
    })
    if (expiredSessionIds.length > 0) {
      await tx.publicAssistantSession.deleteMany({ where: { id: { in: expiredSessionIds } } })
    }
  })
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
