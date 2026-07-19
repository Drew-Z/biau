import type { PrismaClient } from '@prisma/client'

export const aiDailyRetentionKinds = ['evidence', 'flash-item'] as const
const lifecycleStates = ['ACTIVE', 'HELD', 'WITHDRAWN'] as const
const revisionStatuses = ['DRAFT', 'APPROVED', 'REJECTED', 'SUPERSEDED'] as const
const retentionReasons = [
  'expired-and-unreferenced',
  'expired-and-unbound-flash',
  'current-evidence',
  'current-approved-revision',
  'approval-audit-history',
  'publication-lifecycle',
  'revision-history',
  'not-expired',
  'invalid-boundary',
] as const

export const AI_DAILY_RETENTION_DRY_RUN_POLICY = 'retention-dry-run-v1' as const
export const AI_DAILY_RETENTION_DRY_RUN_DEFAULT_LIMIT = 100
export const AI_DAILY_RETENTION_DRY_RUN_MAX_LIMIT = 200

export type AiDailyRetentionKind = (typeof aiDailyRetentionKinds)[number]
export type AiDailyRetentionReason = (typeof retentionReasons)[number]
export type AiDailyRetentionDecision = 'eligible' | 'blocked'
export type AiDailyRetentionLifecycleState = (typeof lifecycleStates)[number]
export type AiDailyRetentionRevisionStatus = (typeof revisionStatuses)[number]

export interface AiDailyRetentionRecord {
  kind: AiDailyRetentionKind
  id: string
  boundaryAt: Date | string | null | undefined
  currentForCandidate?: boolean
  lifecycleState?: string | null
  currentApprovedRevisionId?: string | null
  currentApprovedRevisionStatus?: string | null
  revisionCount?: number | null
  approvalActionCount?: number | null
}

export interface AiDailyRetentionPlanItem {
  kind: AiDailyRetentionKind
  id: string
  decision: AiDailyRetentionDecision
  reason: AiDailyRetentionReason
  boundaryAt: string | null
  lifecycleState: AiDailyRetentionLifecycleState | null
  references: {
    currentEvidence: boolean
    currentApprovedRevision: boolean
    revisions: number
    approvalActions: number
  }
}

interface RetentionKindCounts {
  observed: number
  eligible: number
  blocked: number
}

export interface AiDailyRetentionDryRunPlan {
  policyVersion: typeof AI_DAILY_RETENTION_DRY_RUN_POLICY
  mode: 'dry-run'
  capturedAt: string
  mutationsApplied: false
  limit: number
  truncated: boolean
  observedCount: number
  eligibleCount: number
  blockedCount: number
  byKind: Record<AiDailyRetentionKind, RetentionKindCounts>
  byReason: Record<AiDailyRetentionReason, number>
  candidates: AiDailyRetentionPlanItem[]
}

function emptyKindCounts(): Record<AiDailyRetentionKind, RetentionKindCounts> {
  return {
    evidence: { observed: 0, eligible: 0, blocked: 0 },
    'flash-item': { observed: 0, eligible: 0, blocked: 0 },
  }
}

function emptyReasonCounts(): Record<AiDailyRetentionReason, number> {
  return Object.fromEntries(retentionReasons.map((reason) => [reason, 0])) as Record<AiDailyRetentionReason, number>
}

function boundedCount(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(Math.trunc(value as number), 2_147_483_647))
}

function parseDate(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) ? date : null
}

function normalizeLifecycleState(value: string | null | undefined): AiDailyRetentionLifecycleState | null {
  return value && (lifecycleStates as readonly string[]).includes(value)
    ? (value as AiDailyRetentionLifecycleState)
    : null
}

function normalizeRevisionStatus(value: string | null | undefined): AiDailyRetentionRevisionStatus | null {
  return value && (revisionStatuses as readonly string[]).includes(value)
    ? (value as AiDailyRetentionRevisionStatus)
    : null
}

function normalizeOpaqueId(value: string) {
  const normalized = value.trim().slice(0, 120)
  return normalized || 'unknown'
}

function comparePlanItems(
  left: { item: AiDailyRetentionPlanItem; inputIndex: number },
  right: { item: AiDailyRetentionPlanItem; inputIndex: number },
) {
  const leftTime = left.item.boundaryAt ? Date.parse(left.item.boundaryAt) : Number.POSITIVE_INFINITY
  const rightTime = right.item.boundaryAt ? Date.parse(right.item.boundaryAt) : Number.POSITIVE_INFINITY
  if (leftTime !== rightTime) return leftTime - rightTime
  if (left.item.kind !== right.item.kind) return left.item.kind === 'evidence' ? -1 : 1
  return left.inputIndex - right.inputIndex
}

function classifyRecord(record: AiDailyRetentionRecord, now: Date): AiDailyRetentionPlanItem {
  const boundary = parseDate(record.boundaryAt)
  const boundaryAt = boundary?.toISOString() ?? null
  const currentEvidence = Boolean(record.currentForCandidate)
  const currentApprovedRevision = Boolean(record.currentApprovedRevisionId) || normalizeRevisionStatus(record.currentApprovedRevisionStatus) === 'APPROVED'
  const revisions = boundedCount(record.revisionCount)
  const approvalActions = boundedCount(record.approvalActionCount)
  const lifecycleState = normalizeLifecycleState(record.lifecycleState)
  let decision: AiDailyRetentionDecision = 'blocked'
  let reason: AiDailyRetentionReason = 'invalid-boundary'

  if (boundary) {
    if (boundary.getTime() > now.getTime()) {
      reason = 'not-expired'
    } else if (record.kind === 'evidence') {
      if (currentEvidence) reason = 'current-evidence'
      else {
        decision = 'eligible'
        reason = 'expired-and-unreferenced'
      }
    } else if (currentApprovedRevision) {
      reason = 'current-approved-revision'
    } else if (approvalActions > 0) {
      reason = 'approval-audit-history'
    } else if (lifecycleState !== 'WITHDRAWN') {
      reason = 'publication-lifecycle'
    } else if (revisions > 0) {
      reason = 'revision-history'
    } else {
      decision = 'eligible'
      reason = 'expired-and-unbound-flash'
    }
  }

  return {
    kind: record.kind,
    id: normalizeOpaqueId(record.id),
    decision,
    reason,
    boundaryAt,
    lifecycleState,
    references: {
      currentEvidence,
      currentApprovedRevision,
      revisions,
      approvalActions,
    },
  }
}

export function normalizeAiDailyRetentionDryRunLimit(value: number | null | undefined) {
  if (!Number.isFinite(value)) return AI_DAILY_RETENTION_DRY_RUN_DEFAULT_LIMIT
  return Math.max(1, Math.min(Math.trunc(value as number), AI_DAILY_RETENTION_DRY_RUN_MAX_LIMIT))
}

export function parseAiDailyRetentionDryRunLimit(value: unknown) {
  if (value === undefined || value === '') return AI_DAILY_RETENTION_DRY_RUN_DEFAULT_LIMIT
  if (typeof value !== 'string' || !/^\d+$/u.test(value)) throw new Error('invalid-ai-daily-retention-limit')
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > AI_DAILY_RETENTION_DRY_RUN_MAX_LIMIT) {
    throw new Error('invalid-ai-daily-retention-limit')
  }
  return parsed
}

export function buildAiDailyRetentionDryRunPlan(
  records: AiDailyRetentionRecord[],
  now = new Date(),
  limit = AI_DAILY_RETENTION_DRY_RUN_DEFAULT_LIMIT,
): AiDailyRetentionDryRunPlan {
  const capturedAt = parseDate(now)
  if (!capturedAt) throw new Error('invalid-ai-daily-retention-now')

  const normalizedLimit = normalizeAiDailyRetentionDryRunLimit(limit)
  const classified = records
    .map((record, inputIndex) => ({ item: classifyRecord(record, capturedAt), inputIndex }))
    .sort(comparePlanItems)
    .map(({ item }) => item)
  const candidates = classified.slice(0, normalizedLimit)
  const byKind = emptyKindCounts()
  const byReason = emptyReasonCounts()
  let eligibleCount = 0
  let blockedCount = 0

  for (const candidate of candidates) {
    const kindCounts = byKind[candidate.kind]
    kindCounts.observed += 1
    byReason[candidate.reason] += 1
    if (candidate.decision === 'eligible') {
      kindCounts.eligible += 1
      eligibleCount += 1
    } else {
      kindCounts.blocked += 1
      blockedCount += 1
    }
  }

  return {
    policyVersion: AI_DAILY_RETENTION_DRY_RUN_POLICY,
    mode: 'dry-run',
    capturedAt: capturedAt.toISOString(),
    mutationsApplied: false,
    limit: normalizedLimit,
    truncated: classified.length > normalizedLimit,
    observedCount: candidates.length,
    eligibleCount,
    blockedCount,
    byKind,
    byReason,
    candidates,
  }
}

export async function loadAiDailyRetentionDryRun(
  prisma: PrismaClient,
  now = new Date(),
  limit = AI_DAILY_RETENTION_DRY_RUN_DEFAULT_LIMIT,
) {
  const normalizedLimit = normalizeAiDailyRetentionDryRunLimit(limit)
  const queryLimit = normalizedLimit + 1
  const [evidenceRows, flashRows] = await Promise.all([
    prisma.aiDailyEvidenceDocument.findMany({
      where: { expiresAt: { lte: now } },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: queryLimit,
      select: {
        id: true,
        expiresAt: true,
        currentForCandidate: { select: { id: true } },
      },
    }),
    prisma.aiDailyFlashItem.findMany({
      where: { retentionUntil: { lte: now } },
      orderBy: [{ retentionUntil: 'asc' }, { id: 'asc' }],
      take: queryLimit,
      select: {
        id: true,
        retentionUntil: true,
        lifecycleState: true,
        currentApprovedRevisionId: true,
        currentApprovedRevision: { select: { status: true } },
        _count: { select: { revisions: true, approvalActions: true } },
      },
    }),
  ])

  const records: AiDailyRetentionRecord[] = [
    ...evidenceRows.map((row) => ({
      kind: 'evidence' as const,
      id: row.id,
      boundaryAt: row.expiresAt,
      currentForCandidate: Boolean(row.currentForCandidate),
    })),
    ...flashRows.map((row) => ({
      kind: 'flash-item' as const,
      id: row.id,
      boundaryAt: row.retentionUntil,
      lifecycleState: row.lifecycleState,
      currentApprovedRevisionId: row.currentApprovedRevisionId,
      currentApprovedRevisionStatus: row.currentApprovedRevision?.status ?? null,
      revisionCount: row._count.revisions,
      approvalActionCount: row._count.approvalActions,
    })),
  ]

  return buildAiDailyRetentionDryRunPlan(records, now, normalizedLimit)
}
