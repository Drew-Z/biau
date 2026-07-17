import { randomUUID } from 'node:crypto'
import {
  Prisma,
  type AiDailyGeneratedValidationStatus,
  type AiDailyWorkAttemptOutcome,
  type AiDailyWorkKind,
  type AiDailyWorkStatus,
  type PrismaClient,
} from '@prisma/client'
import {
  buildAiDailyWorkIdempotencyKey,
  createAiDailyCanonicalSourceIdentity,
  createAiDailyTitleFingerprint,
  evaluateAiDailyEditorialTransition,
  evaluateAiDailyFlashRevisionTransition,
  evaluateAiDailyLease,
  evaluateAiDailyWorkTransition,
  parseAiDailyEditionDate,
  type AiDailyCitationSnapshotV2,
  type AiDailyEditorialStateName,
} from './aiDailyDomain.js'

type AiDailyReadClient = PrismaClient | Prisma.TransactionClient

export interface UpsertAiDailyCanonicalSourceInput {
  title: string
  url: string
  sourceName: string
  sourceTier: string
  language?: string
  publishedAt?: Date | null
  capturedAt?: Date
  rawExcerpt?: string | null
  summary?: string
  tagsJson?: Prisma.InputJsonValue
  riskFlagsJson?: Prisma.InputJsonValue
  contentHash?: string | null
  titleFingerprint?: string | null
}

export interface ReplaceAiDailyIssueSelectionInput {
  issueId: string
  sourceIds: string[]
  selectedBy: string
  selectionReason?: string
}

export interface CreateAiDailyGeneratedRevisionInput {
  issueId: string
  contentJson: Prisma.InputJsonValue
  sourceBindingsJson: Prisma.InputJsonValue
  citationSnapshots: AiDailyCitationSnapshotV2[]
  promptVersion: string
  schemaVersion: string
  modelRole: string
  modelIdentifier: string
  observedDraftUpdatedAt?: Date | null
  validationStatus: AiDailyGeneratedValidationStatus
  validationFindingsJson?: Prisma.InputJsonValue
  createdBy: string
}

export interface UpsertAiDailyWorkItemInput {
  editionDate: string
  kind: AiDailyWorkKind
  scope: string
  runId?: string | null
  sourceFeedId?: string | null
  priority?: number
  availableAt?: Date
  maxAttempts?: number
  deadlineAt?: Date | null
  freshnessTargetAt?: Date | null
  continuationCursorJson?: Prisma.InputJsonValue
}

export interface CompleteAiDailyWorkItemInput {
  workItemId: string
  leaseToken: string
  result: 'succeeded' | 'retryable-failed' | 'failed' | 'cancelled'
  now?: Date
  retryAt?: Date
  errorCategory?: string
  metadataJson?: Prisma.InputJsonValue
}

export interface CreateAiDailyFlashRevisionInput {
  flashItemId: string
  generatedRevisionId?: string | null
  selectionVersion: number
  evidenceVersion: number
  title: string
  factSummary: string
  whyItMatters: string
  uncertainty?: string | null
  citationSnapshots: AiDailyCitationSnapshotV2[]
  editor?: string | null
  actor: string
}

export async function upsertAiDailyCanonicalSource(
  prisma: AiDailyReadClient,
  input: UpsertAiDailyCanonicalSourceInput,
) {
  const identity = createAiDailyCanonicalSourceIdentity(input.url)
  const observedAt = input.publishedAt ?? input.capturedAt ?? new Date()
  const machineFields = {
    canonicalUrl: identity.canonicalUrl,
    canonicalizationVersion: identity.canonicalizationVersion,
    publisherDomain: identity.publisherDomain,
    lastObservedAt: observedAt,
    contentHash: input.contentHash ?? undefined,
    titleFingerprint: input.titleFingerprint ?? createAiDailyTitleFingerprint(input.title),
  }
  const existing = await prisma.sourceItem.findUnique({ where: { canonicalKey: identity.canonicalKey } })
  if (existing) return prisma.sourceItem.update({ where: { id: existing.id }, data: machineFields })

  const legacyCandidates = await prisma.sourceItem.findMany({
    where: {
      canonicalKey: null,
      OR: [{ publisherDomain: identity.publisherDomain }, { publisherDomain: null }],
    },
    select: { id: true, url: true },
    take: 100,
  })
  const legacyMatch = legacyCandidates.find((candidate) => {
    try {
      return createAiDailyCanonicalSourceIdentity(candidate.url).canonicalKey === identity.canonicalKey
    } catch {
      return false
    }
  })
  if (legacyMatch) {
    try {
      return await prisma.sourceItem.update({
        where: { id: legacyMatch.id },
        data: { ...machineFields, canonicalKey: identity.canonicalKey },
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const raced = await prisma.sourceItem.findUnique({ where: { canonicalKey: identity.canonicalKey } })
      if (raced) return prisma.sourceItem.update({ where: { id: raced.id }, data: machineFields })
    }
  }

  return prisma.sourceItem.upsert({
    where: { canonicalKey: identity.canonicalKey },
    update: machineFields,
    create: {
      title: input.title,
      url: input.url,
      canonicalUrl: identity.canonicalUrl,
      canonicalKey: identity.canonicalKey,
      canonicalizationVersion: identity.canonicalizationVersion,
      contentHash: input.contentHash,
      titleFingerprint: input.titleFingerprint ?? createAiDailyTitleFingerprint(input.title),
      publisherDomain: identity.publisherDomain,
      sourceName: input.sourceName,
      sourceTier: input.sourceTier,
      language: input.language ?? 'zh',
      publishedAt: input.publishedAt,
      capturedAt: input.capturedAt,
      lastObservedAt: observedAt,
      rawExcerpt: input.rawExcerpt,
      summary: input.summary ?? '',
      tagsJson: input.tagsJson,
      riskFlagsJson: input.riskFlagsJson,
    },
  })
}

export async function getOrCreateAiDailyEdition(
  prisma: PrismaClient,
  input: { date: string; title: string },
) {
  const edition = parseAiDailyEditionDate(input.date)
  if (!edition) throw new Error('invalid-ai-daily-edition-date')
  return prisma.aiDailyIssue.upsert({
    where: { date: edition.date },
    update: { editionDate: edition.value },
    create: {
      date: edition.date,
      editionDate: edition.value,
      title: input.title,
      sourceIdsJson: [],
    },
  })
}

export async function replaceAiDailyIssueSelection(
  prisma: PrismaClient,
  input: ReplaceAiDailyIssueSelectionInput,
) {
  return prisma.$transaction((tx) => replaceAiDailyIssueSelectionInTransaction(tx, input))
}

export async function replaceAiDailyIssueSelectionInTransaction(
  tx: Prisma.TransactionClient,
  input: ReplaceAiDailyIssueSelectionInput,
) {
  const sourceIds = dedupeStrings(input.sourceIds).slice(0, 80)
  const issue = await tx.aiDailyIssue.findUnique({
    where: { id: input.issueId },
    select: { id: true, selectionVersion: true, sourceIdsJson: true },
  })
  if (!issue) throw new Error('ai-daily-issue-not-found')

  if (sourceIds.length > 0) {
    const matchedSources = await tx.sourceItem.count({ where: { id: { in: sourceIds } } })
    if (matchedSources !== sourceIds.length) throw new Error('invalid-source-ids')
  }

  const currentRelations = await tx.aiDailyIssueSource.findMany({
    where: { issueId: issue.id, selectionVersion: issue.selectionVersion },
    select: { sourceItemId: true },
    orderBy: { position: 'asc' },
  })
  const currentSourceIds =
    currentRelations.length > 0
      ? currentRelations.map((relation) => relation.sourceItemId)
      : readJsonStringArray(issue.sourceIdsJson)
  if (arraysEqual(currentSourceIds, sourceIds)) {
    return { issueId: issue.id, selectionVersion: issue.selectionVersion, sourceIds, changed: false }
  }

  const nextSelectionVersion = issue.selectionVersion + 1
  const updated = await tx.aiDailyIssue.updateMany({
    where: { id: issue.id, selectionVersion: issue.selectionVersion },
    data: {
      selectionVersion: nextSelectionVersion,
      sourceIdsJson: sourceIds,
      newEvidenceAvailable: false,
    },
  })
  if (updated.count !== 1) throw new Error('ai-daily-selection-version-conflict')

  if (sourceIds.length > 0) {
    await tx.aiDailyIssueSource.createMany({
      data: sourceIds.map((sourceItemId, position) => ({
        issueId: issue.id,
        sourceItemId,
        selectionVersion: nextSelectionVersion,
        position,
        selectedBy: input.selectedBy,
        selectionReason: input.selectionReason,
      })),
    })
  }
  return { issueId: issue.id, selectionVersion: nextSelectionVersion, sourceIds, changed: true }
}

export async function loadAiDailyIssueSources(prisma: AiDailyReadClient, issueId: string) {
  const issue = await prisma.aiDailyIssue.findUnique({
    where: { id: issueId },
    select: { sourceIdsJson: true, selectionVersion: true },
  })
  if (!issue) throw new Error('ai-daily-issue-not-found')

  const relations = await prisma.aiDailyIssueSource.findMany({
    where: { issueId, selectionVersion: issue.selectionVersion },
    include: { sourceItem: true },
    orderBy: { position: 'asc' },
  })
  if (relations.length > 0) {
    return {
      authority: 'relation' as const,
      selectionVersion: issue.selectionVersion,
      sourceIds: relations.map((relation) => relation.sourceItemId),
      sources: relations.map((relation) => relation.sourceItem),
    }
  }

  const sourceIds = readJsonStringArray(issue.sourceIdsJson)
  const sources = sourceIds.length > 0 ? await prisma.sourceItem.findMany({ where: { id: { in: sourceIds } } }) : []
  const byId = new Map(sources.map((source) => [source.id, source]))
  return {
    authority: 'legacy-json' as const,
    selectionVersion: issue.selectionVersion,
    sourceIds,
    sources: sourceIds.map((sourceId) => byId.get(sourceId)).filter((source): source is (typeof sources)[number] => Boolean(source)),
  }
}

export async function transitionAiDailyEditorialState(
  prisma: PrismaClient,
  input: { issueId: string; next: AiDailyEditorialStateName },
) {
  return prisma.$transaction(async (tx) => {
    const issue = await tx.aiDailyIssue.findUnique({ where: { id: input.issueId }, select: { workflowState: true } })
    if (!issue) throw new Error('ai-daily-issue-not-found')
    const transition = evaluateAiDailyEditorialTransition(issue.workflowState, input.next)
    if (!transition.ok) throw new Error(transition.error)
    const updated = await tx.aiDailyIssue.updateMany({
      where: { id: input.issueId, workflowState: issue.workflowState },
      data: { workflowState: input.next },
    })
    if (updated.count !== 1) throw new Error('ai-daily-editorial-state-conflict')
    return input.next
  })
}

export async function createAiDailyGeneratedRevision(
  prisma: PrismaClient,
  input: CreateAiDailyGeneratedRevisionInput,
) {
  return prisma.$transaction(async (tx) => {
    const issue = await tx.aiDailyIssue.update({
      where: { id: input.issueId },
      data: { generatedRevisionSequence: { increment: 1 } },
      select: {
        generatedRevisionSequence: true,
        selectionVersion: true,
        selectedEvidenceVersion: true,
      },
    })
    const revision = await tx.aiDailyGeneratedRevision.create({
      data: {
        issueId: input.issueId,
        revisionNumber: issue.generatedRevisionSequence,
        selectionVersion: issue.selectionVersion,
        evidenceVersion: issue.selectedEvidenceVersion,
        contentJson: input.contentJson,
        sourceBindingsJson: input.sourceBindingsJson,
        citationSnapshotsJson: toAiDailyCitationSnapshotsJson(input.citationSnapshots),
        citationSchemaVersion: 2,
        promptVersion: input.promptVersion,
        schemaVersion: input.schemaVersion,
        modelRole: input.modelRole,
        modelIdentifier: input.modelIdentifier,
        observedDraftUpdatedAt: input.observedDraftUpdatedAt,
        validationStatus: input.validationStatus,
        validationFindingsJson: input.validationFindingsJson,
        createdBy: input.createdBy,
      },
    })
    await tx.aiDailyIssue.update({
      where: { id: input.issueId },
      data: { latestGeneratedRevisionId: revision.id },
    })
    return revision
  })
}

export async function upsertAiDailyWorkItem(prisma: PrismaClient, input: UpsertAiDailyWorkItemInput) {
  const edition = parseAiDailyEditionDate(input.editionDate)
  if (!edition) throw new Error('invalid-ai-daily-edition-date')
  const idempotencyKey = buildAiDailyWorkIdempotencyKey({
    editionDate: edition.date,
    kind: input.kind,
    scope: input.scope,
  })
  return prisma.aiDailyWorkItem.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      kind: input.kind,
      editionDate: edition.value,
      runId: input.runId,
      sourceFeedId: input.sourceFeedId,
      idempotencyKey,
      priority: input.priority ?? 0,
      availableAt: input.availableAt,
      maxAttempts: input.maxAttempts ?? 3,
      deadlineAt: input.deadlineAt,
      freshnessTargetAt: input.freshnessTargetAt,
      continuationCursorJson: input.continuationCursorJson,
    },
  })
}

export async function claimAiDailyWorkItem(
  prisma: PrismaClient,
  input: { leaseOwner: string; leaseDurationMs: number; now?: Date },
) {
  const now = input.now ?? new Date()
  const leaseExpiresAt = new Date(now.getTime() + input.leaseDurationMs)
  if (input.leaseDurationMs <= 0) throw new Error('invalid-ai-daily-lease-duration')

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.aiDailyWorkItem.findFirst({
      where: {
        OR: [
          { status: { in: ['PENDING', 'RETRY_WAIT'] }, availableAt: { lte: now } },
          { status: 'LEASED', leaseExpiresAt: { lte: now } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { availableAt: 'asc' }, { createdAt: 'asc' }],
    })
    if (!candidate) return null
    const reclaimingExpiredLease = candidate.status === 'LEASED'
    if (candidate.attemptCount >= candidate.maxAttempts) {
      const failed = await tx.aiDailyWorkItem.updateMany({
        where: buildWorkClaimCondition(candidate, now),
        data: {
          status: 'FAILED',
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
          completedAt: now,
          lastErrorCategory: 'max-attempts-exhausted',
        },
      })
      if (failed.count !== 1) return null
      if (reclaimingExpiredLease && candidate.attemptCount > 0) {
        await tx.aiDailyWorkAttempt.updateMany({
          where: { workItemId: candidate.id, attemptNumber: candidate.attemptCount, outcome: 'RUNNING' },
          data: { outcome: 'FAILED', finishedAt: now, errorCategory: 'lease-expired' },
        })
      }
      return null
    }

    if (!reclaimingExpiredLease) {
      const transition = evaluateAiDailyWorkTransition(candidate.status, 'LEASED')
      if (!transition.ok) return null
    }
    const leaseToken = randomUUID()
    const claimed = await tx.aiDailyWorkItem.updateMany({
      where: buildWorkClaimCondition(candidate, now),
      data: {
        status: 'LEASED',
        leaseOwner: input.leaseOwner,
        leaseToken,
        leaseExpiresAt,
        attemptCount: { increment: 1 },
      },
    })
    if (claimed.count !== 1) return null
    const attemptNumber = candidate.attemptCount + 1
    if (reclaimingExpiredLease && candidate.attemptCount > 0) {
      await tx.aiDailyWorkAttempt.updateMany({
        where: { workItemId: candidate.id, attemptNumber: candidate.attemptCount, outcome: 'RUNNING' },
        data: { outcome: 'RETRYABLE_FAILED', finishedAt: now, errorCategory: 'lease-expired' },
      })
    }
    await tx.aiDailyWorkAttempt.create({
      data: {
        workItemId: candidate.id,
        attemptNumber,
        runId: candidate.runId,
        leaseToken,
        startedAt: now,
      },
    })
    const workItem = await tx.aiDailyWorkItem.findUnique({ where: { id: candidate.id } })
    return workItem ? { workItem, leaseToken, attemptNumber } : null
  })
}

export async function completeAiDailyWorkItem(prisma: PrismaClient, input: CompleteAiDailyWorkItemInput) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const workItem = await tx.aiDailyWorkItem.findUnique({ where: { id: input.workItemId } })
    if (!workItem) throw new Error('ai-daily-work-item-not-found')
    const lease = evaluateAiDailyLease({
      currentLeaseToken: workItem.leaseToken,
      currentLeaseExpiresAt: workItem.leaseExpiresAt,
      providedLeaseToken: input.leaseToken,
      now,
    })
    if (!lease.ok) throw new Error(lease.error)

    const nextStatus = workResultStatus(input.result)
    const transition = evaluateAiDailyWorkTransition(workItem.status, nextStatus)
    if (!transition.ok) throw new Error(transition.error)
    const retryAt = input.result === 'retryable-failed' ? input.retryAt ?? now : now
    const terminal = nextStatus === 'SUCCEEDED' || nextStatus === 'FAILED' || nextStatus === 'CANCELLED'
    const updated = await tx.aiDailyWorkItem.updateMany({
      where: {
        id: workItem.id,
        status: 'LEASED',
        leaseToken: input.leaseToken,
        leaseExpiresAt: { gt: now },
      },
      data: {
        status: nextStatus,
        availableAt: retryAt,
        leaseOwner: null,
        leaseToken: null,
        leaseExpiresAt: null,
        completedAt: terminal ? now : null,
        lastErrorCategory: input.errorCategory,
      },
    })
    if (updated.count !== 1) throw new Error('ai-daily-work-lease-conflict')

    const attempt = await tx.aiDailyWorkAttempt.findUnique({
      where: {
        workItemId_attemptNumber: {
          workItemId: workItem.id,
          attemptNumber: workItem.attemptCount,
        },
      },
      select: { startedAt: true },
    })
    if (!attempt) throw new Error('ai-daily-work-attempt-not-found')
    await tx.aiDailyWorkAttempt.update({
      where: {
        workItemId_attemptNumber: {
          workItemId: workItem.id,
          attemptNumber: workItem.attemptCount,
        },
      },
      data: {
        outcome: workResultAttemptOutcome(input.result),
        finishedAt: now,
        durationMs: boundedDurationMs(attempt.startedAt, now),
        errorCategory: input.errorCategory,
        metadataJson: input.metadataJson,
      },
    })
    return tx.aiDailyWorkItem.findUnique({ where: { id: workItem.id } })
  })
}

export async function appendAiDailyRunEvent(
  prisma: PrismaClient,
  input: {
    runId: string
    stage?: Prisma.AiDailyRunEventCreateInput['stage']
    kind: string
    outcome: string
    providerRole?: string
    attemptNumber?: number
    errorCategory?: string
    durationMs?: number
    metadataJson?: Prisma.InputJsonValue
  },
) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.aiDailyRun.update({
      where: { id: input.runId },
      data: { eventSequence: { increment: 1 } },
      select: { eventSequence: true },
    })
    return tx.aiDailyRunEvent.create({
      data: {
        runId: input.runId,
        sequence: run.eventSequence,
        stage: input.stage,
        kind: input.kind,
        outcome: input.outcome,
        providerRole: input.providerRole,
        attemptNumber: input.attemptNumber,
        errorCategory: input.errorCategory,
        durationMs: input.durationMs,
        metadataJson: input.metadataJson,
      },
    })
  })
}

export async function createAiDailyFlashRevision(
  prisma: PrismaClient,
  input: CreateAiDailyFlashRevisionInput,
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.aiDailyFlashItem.update({
      where: { id: input.flashItemId },
      data: { revisionSequence: { increment: 1 } },
      select: { revisionSequence: true },
    })
    const revision = await tx.aiDailyFlashRevision.create({
      data: {
        flashItemId: input.flashItemId,
        revisionNumber: item.revisionSequence,
        generatedRevisionId: input.generatedRevisionId,
        selectionVersion: input.selectionVersion,
        evidenceVersion: input.evidenceVersion,
        title: input.title,
        factSummary: input.factSummary,
        whyItMatters: input.whyItMatters,
        uncertainty: input.uncertainty,
        citationSnapshotsJson: toAiDailyCitationSnapshotsJson(input.citationSnapshots),
        citationSchemaVersion: 2,
        editor: input.editor,
      },
    })
    await tx.aiDailyApprovalAction.create({
      data: {
        flashItemId: input.flashItemId,
        flashRevisionId: revision.id,
        action: 'SUBMITTED',
        actor: input.actor,
        observedRevisionNumber: revision.revisionNumber,
      },
    })
    return revision
  })
}

export async function approveAiDailyFlashRevision(
  prisma: PrismaClient,
  input: { flashRevisionId: string; actor: string; reason?: string; observedRevisionNumber?: number; now?: Date },
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const revision = await tx.aiDailyFlashRevision.findUnique({
      where: { id: input.flashRevisionId },
      include: { flashItem: true },
    })
    if (!revision) throw new Error('ai-daily-flash-revision-not-found')
    if (input.observedRevisionNumber !== undefined && input.observedRevisionNumber !== revision.revisionNumber) {
      throw new Error('ai-daily-flash-revision-conflict')
    }
    const transition = evaluateAiDailyFlashRevisionTransition(revision.status, 'APPROVED')
    if (!transition.ok) throw new Error(transition.error)

    const previousRevisionId = revision.flashItem.currentApprovedRevisionId
    if (previousRevisionId) {
      await tx.aiDailyFlashRevision.update({
        where: { id: previousRevisionId },
        data: { status: 'SUPERSEDED' },
      })
      await tx.aiDailyApprovalAction.create({
        data: {
          flashItemId: revision.flashItemId,
          flashRevisionId: previousRevisionId,
          action: 'SUPERSEDED',
          actor: input.actor,
          reason: input.reason,
        },
      })
    }

    const approved = await tx.aiDailyFlashRevision.update({
      where: { id: revision.id },
      data: {
        status: 'APPROVED',
        approvedAt: now,
        supersededRevisionId: previousRevisionId,
      },
    })
    await tx.aiDailyFlashItem.update({
      where: { id: revision.flashItemId },
      data: {
        lifecycleState: 'ACTIVE',
        currentApprovedRevisionId: approved.id,
        publicRevision: { increment: 1 },
        lastApprovedAt: now,
        withdrawnAt: null,
        projectionUpdatedAt: now,
      },
    })
    await tx.aiDailyApprovalAction.create({
      data: {
        flashItemId: revision.flashItemId,
        flashRevisionId: approved.id,
        action: 'APPROVED',
        actor: input.actor,
        reason: input.reason,
        observedRevisionNumber: approved.revisionNumber,
      },
    })
    return approved
  })
}

function workResultStatus(result: CompleteAiDailyWorkItemInput['result']): AiDailyWorkStatus {
  if (result === 'succeeded') return 'SUCCEEDED'
  if (result === 'retryable-failed') return 'RETRY_WAIT'
  if (result === 'cancelled') return 'CANCELLED'
  return 'FAILED'
}

function workResultAttemptOutcome(result: CompleteAiDailyWorkItemInput['result']): AiDailyWorkAttemptOutcome {
  if (result === 'succeeded') return 'SUCCEEDED'
  if (result === 'retryable-failed') return 'RETRYABLE_FAILED'
  if (result === 'cancelled') return 'CANCELLED'
  return 'FAILED'
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function readJsonStringArray(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function boundedDurationMs(startedAt: Date, finishedAt: Date) {
  return Math.min(2_147_483_647, Math.max(0, finishedAt.getTime() - startedAt.getTime()))
}

function buildWorkClaimCondition(
  candidate: {
    id: string
    status: AiDailyWorkStatus
    updatedAt: Date
    leaseToken: string | null
  },
  now: Date,
): Prisma.AiDailyWorkItemWhereInput {
  if (candidate.status === 'LEASED') {
    return {
      id: candidate.id,
      status: 'LEASED',
      leaseToken: candidate.leaseToken,
      leaseExpiresAt: { lte: now },
    }
  }
  return { id: candidate.id, status: candidate.status, updatedAt: candidate.updatedAt }
}

export function toAiDailyCitationSnapshotJson(snapshot: AiDailyCitationSnapshotV2): Prisma.InputJsonObject {
  const locator: Prisma.InputJsonObject | undefined = snapshot.locator
    ? {
        ...(snapshot.locator.heading ? { heading: snapshot.locator.heading } : {}),
        ...(snapshot.locator.startChar !== undefined ? { startChar: snapshot.locator.startChar } : {}),
        ...(snapshot.locator.endChar !== undefined ? { endChar: snapshot.locator.endChar } : {}),
      }
    : undefined
  return {
    version: 2,
    sourceItemId: snapshot.sourceItemId,
    evidenceId: snapshot.evidenceId,
    title: snapshot.title,
    publisher: snapshot.publisher,
    originalUrl: snapshot.originalUrl,
    canonicalUrl: snapshot.canonicalUrl,
    publishedAt: snapshot.publishedAt,
    retrievedAt: snapshot.retrievedAt,
    excerpt: snapshot.excerpt,
    ...(locator ? { locator } : {}),
    ...(snapshot.contentHash ? { contentHash: snapshot.contentHash } : {}),
  }
}

function toAiDailyCitationSnapshotsJson(snapshots: AiDailyCitationSnapshotV2[]): Prisma.InputJsonArray {
  return snapshots.map(toAiDailyCitationSnapshotJson)
}
