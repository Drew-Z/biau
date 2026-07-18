import { randomUUID } from 'node:crypto'
import {
  Prisma,
  type AiDailyGeneratedValidationStatus,
  type AiDailyProfile,
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
  evaluateAiDailyFlashLifecycleTransition,
  evaluateAiDailyFlashRevisionTransition,
  evaluateAiDailyLease,
  evaluateAiDailyRunStageTransition,
  evaluateAiDailyRunTransition,
  evaluateAiDailyWorkTransition,
  normalizeAiDailyCitationSnapshotV2,
  parseAiDailyEditionDate,
  type AiDailyCitationSnapshotV2,
  type AiDailyEditorialStateName,
  type AiDailyFlashLifecycleStateName,
} from './aiDailyDomain.js'
import {
  aiDailyGenerationSchemaVersion,
  createAiDailyGenerationPayloadHash,
  type AiDailyGenerationEvidence,
  type AiDailyGenerationResult,
} from './aiDailyGeneration.js'

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
  generationKey?: string | null
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

export interface AiDailyGenerationCheckpointRecord {
  stage: Prisma.AiDailyGenerationCheckpointCreateInput['stage']
  payload: Prisma.JsonValue
  payloadHash: string
  schemaVersion: string
  createdAt: Date
}

export interface PersistAiDailyGenerationOutcomeInput {
  generationKey: string
  runId: string
  issueId: string
  result: AiDailyGenerationResult
  evidence: AiDailyGenerationEvidence[]
  modelIdentifier: string
  createdBy: string
  workItemId?: string
  leaseToken?: string
  now?: Date
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

export interface ApproveAiDailyFlashRevisionInput {
  flashRevisionId: string
  actor: string
  reason?: string
  observedRevisionNumber: number
  expectedPublicRevision: number
  now?: Date
}

export type RejectAiDailyFlashRevisionInput = ApproveAiDailyFlashRevisionInput

export interface TransitionAiDailyFlashLifecycleInput {
  flashItemId: string
  next: 'HELD' | 'ACTIVE' | 'WITHDRAWN'
  actor: string
  reason?: string
  expectedPublicRevision: number
  now?: Date
}

export interface CreateAiDailyFlashCorrectionInput {
  flashItemId: string
  sourceRevisionId: string
  expectedPublicRevision: number
  expectedRevisionSequence: number
  title: string
  factSummary: string
  whyItMatters: string
  uncertainty?: string | null
  editor?: string | null
  actor: string
  reason?: string
  now?: Date
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

export async function createOrResumeAiDailyGenerationRun(
  prisma: PrismaClient,
  input: {
    issueId: string
    trigger: Prisma.AiDailyRunCreateInput['trigger']
    profile: Prisma.AiDailyRunCreateInput['profile']
    configVersion: string
    now?: Date
  },
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const issue = await tx.aiDailyIssue.findUnique({
      where: { id: input.issueId },
      select: { id: true, date: true, editionDate: true },
    })
    if (!issue?.editionDate) throw new Error('ai-daily-issue-edition-date-required')
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`biau-ai-daily-generation:${issue.date}`}, 0))`

    const active = await tx.aiDailyRun.findFirst({
      where: {
        editionDate: issue.editionDate,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
      orderBy: [{ attemptNumber: 'desc' }, { createdAt: 'desc' }],
    })
    if (active) {
      if (active.issueId && active.issueId !== issue.id) throw new Error('ai-daily-generation-active-run-issue-mismatch')
      if (active.issueId === null) {
        const linked = await tx.aiDailyRun.update({ where: { id: active.id }, data: { issueId: issue.id } })
        return { run: linked, created: false }
      }
      return { run: active, created: false }
    }

    const latest = await tx.aiDailyRun.aggregate({
      where: { editionDate: issue.editionDate },
      _max: { attemptNumber: true },
    })
    const run = await tx.aiDailyRun.create({
      data: {
        issueId: issue.id,
        editionDate: issue.editionDate,
        profile: input.profile,
        trigger: input.trigger,
        attemptNumber: (latest._max.attemptNumber ?? 0) + 1,
        status: 'QUEUED',
        configVersion: input.configVersion,
        createdAt: now,
      },
    })
    return { run, created: true }
  })
}

export async function queueAiDailyGenerationWork(
  prisma: PrismaClient,
  input: {
    issueId: string
    trigger: Prisma.AiDailyRunCreateInput['trigger']
    profile: Prisma.AiDailyRunCreateInput['profile']
    configVersion: string
    priority?: number
    deadlineAt?: Date | null
    now?: Date
  },
) {
  const issue = await prisma.aiDailyIssue.findUnique({
    where: { id: input.issueId },
    select: { id: true, date: true, selectionVersion: true },
  })
  if (!issue) throw new Error('ai-daily-issue-not-found')
  const resumed = await createOrResumeAiDailyGenerationRun(prisma, input)
  const now = input.now ?? new Date()
  const freshnessOrigin = resumed.run.lastFetchedAt ?? resumed.run.pipelineFreshnessAt ?? now
  const freshnessTargetAt = new Date(freshnessOrigin.getTime() + 15 * 60_000)
  const deadlineAt = input.deadlineAt && input.deadlineAt.getTime() < freshnessTargetAt.getTime()
    ? input.deadlineAt
    : freshnessTargetAt
  const work = await upsertAiDailyWorkItem(prisma, {
    editionDate: issue.date,
    kind: 'EXTRACT_FACTS',
    scope: `generation:${issue.id}:selection:${issue.selectionVersion}:run:${resumed.run.attemptNumber}`,
    runId: resumed.run.id,
    priority: input.priority ?? 100,
    deadlineAt,
    freshnessTargetAt,
  })
  return { ...resumed, work }
}

export async function saveAiDailyGenerationCheckpoint(
  prisma: PrismaClient,
  input: {
    runId: string
    stage: Prisma.AiDailyGenerationCheckpointCreateInput['stage']
    payload: Prisma.InputJsonValue
    schemaVersion?: string
    workItemId?: string
    leaseToken?: string
    now?: Date
  },
) {
  const payloadHash = createAiDailyGenerationPayloadHash(input.payload)
  const schemaVersion = input.schemaVersion ?? aiDailyGenerationSchemaVersion
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`biau-ai-daily-generation-checkpoint:${input.runId}:${input.stage}`}, 0))`
    await assertAiDailyGenerationLeaseInTransaction(tx, {
      runId: input.runId,
      workItemId: input.workItemId,
      leaseToken: input.leaseToken,
      now,
    })
    const existing = await tx.aiDailyGenerationCheckpoint.findUnique({
      where: { runId_stage: { runId: input.runId, stage: input.stage } },
    })
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw new Error('ai-daily-checkpoint-conflict')
      if (existing.schemaVersion !== schemaVersion) throw new Error('ai-daily-checkpoint-schema-version-conflict')
      return existing
    }
    const checkpoint = await tx.aiDailyGenerationCheckpoint.create({
      data: {
        runId: input.runId,
        stage: input.stage,
        payloadJson: input.payload,
        payloadHash,
        schemaVersion,
        createdAt: now,
      },
    })

    const run = await tx.aiDailyRun.findUnique({ where: { id: input.runId }, select: { status: true, currentStage: true, startedAt: true } })
    if (!run) throw new Error('ai-daily-run-not-found')
    if (run.status === 'QUEUED') {
      const transition = evaluateAiDailyRunTransition('QUEUED', 'RUNNING')
      if (!transition.ok) throw new Error('invalid-ai-daily-run-transition')
    } else if (run.status !== 'RUNNING') {
      throw new Error('ai-daily-run-not-active')
    }
    const stageTransition = evaluateAiDailyRunStageTransition(run.currentStage, input.stage)
    if (!stageTransition.ok) throw new Error(stageTransition.error)
    const advanced = await tx.aiDailyRun.update({
      where: { id: input.runId },
      data: {
        status: 'RUNNING',
        startedAt: run.startedAt ?? now,
        currentStage: input.stage,
        eventSequence: { increment: 1 },
      },
      select: { eventSequence: true },
    })
    await tx.aiDailyRunEvent.create({
      data: {
        runId: input.runId,
        sequence: advanced.eventSequence,
        stage: input.stage,
        kind: 'generation-checkpoint',
        outcome: 'persisted',
        metadataJson: { payloadHash, schemaVersion },
        createdAt: now,
      },
    })
    return checkpoint
  })
}

export async function listAiDailyGenerationCheckpoints(prisma: PrismaClient, runId: string) {
  return prisma.aiDailyGenerationCheckpoint.findMany({
    where: { runId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function loadAiDailyGenerationEvidencePack(
  prisma: AiDailyReadClient,
  issueId: string,
  now = new Date(),
) {
  const issue = await prisma.aiDailyIssue.findUnique({
    where: { id: issueId },
    select: { id: true, date: true, selectionVersion: true, selectedEvidenceVersion: true },
  })
  if (!issue) throw new Error('ai-daily-issue-not-found')
  const relations = await prisma.aiDailyIssueSource.findMany({
    where: { issueId, selectionVersion: issue.selectionVersion },
    include: { sourceItem: true },
    orderBy: { position: 'asc' },
  })
  const sourceIds = relations.map((relation) => relation.sourceItemId)
  const candidates = sourceIds.length
    ? await prisma.aiDailyCandidate.findMany({
        where: { sourceItemId: { in: sourceIds }, selectionState: 'SELECTED' },
        include: { currentEvidence: true },
        orderBy: { updatedAt: 'desc' },
      })
    : []
  const candidateBySource = new Map<string, (typeof candidates)[number]>()
  for (const candidate of candidates) {
    if (candidate.sourceItemId && !candidateBySource.has(candidate.sourceItemId)) candidateBySource.set(candidate.sourceItemId, candidate)
  }
  const evidence: AiDailyGenerationEvidence[] = []
  const gaps: string[] = []
  let evidenceVersion = issue.selectedEvidenceVersion
  for (const relation of relations) {
    const candidate = candidateBySource.get(relation.sourceItemId)
    const currentEvidence = candidate?.currentEvidence
    if (!candidate || !currentEvidence) {
      gaps.push(`missing-evidence:${relation.sourceItemId}`)
      continue
    }
    evidenceVersion = Math.max(evidenceVersion, currentEvidence.version)
    if (currentEvidence.status !== 'READY') {
      gaps.push(`evidence-not-ready:${currentEvidence.id}`)
      continue
    }
    if (currentEvidence.expiresAt.getTime() <= now.getTime()) {
      gaps.push(`evidence-expired:${currentEvidence.id}`)
      continue
    }
    const sourceTier = normalizeSourceTier(candidate.sourceTier)
    evidence.push({
      evidenceId: currentEvidence.id,
      candidateId: candidate.id,
      sourceItemId: relation.sourceItemId,
      title: currentEvidence.title || relation.sourceItem.title,
      publisher: currentEvidence.publisher || relation.sourceItem.sourceName,
      url: currentEvidence.originalUrl,
      canonicalUrl: currentEvidence.canonicalUrl,
      sourceKind: sourceTier === 'TIER_1' ? 'official' : sourceTier === 'TIER_2' ? 'primary_media' : 'secondary_media',
      sourceTier,
      publishedAt: currentEvidence.publishedAt?.toISOString() ?? relation.sourceItem.publishedAt?.toISOString() ?? null,
      retrievedAt: currentEvidence.fetchedAt.toISOString(),
      quote: currentEvidence.excerpt.slice(0, 1024),
      locator: { heading: readFirstJsonString(currentEvidence.headingsJson), startChar: 0, endChar: currentEvidence.excerpt.length },
      ...(currentEvidence.contentHash ? { contentHash: currentEvidence.contentHash } : {}),
    })
  }
  if (evidence.length === 0 && relations.length > 0) gaps.push('evidence-pack-empty')
  return { issueId: issue.id, date: issue.date, selectionVersion: issue.selectionVersion, evidenceVersion, evidence, gaps }
}

export async function persistAiDailyGenerationOutcome(
  prisma: PrismaClient,
  input: PersistAiDailyGenerationOutcomeInput,
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    await assertAiDailyGenerationLeaseInTransaction(tx, {
      runId: input.runId,
      workItemId: input.workItemId,
      leaseToken: input.leaseToken,
      now,
    })
    const run = await tx.aiDailyRun.findUnique({ where: { id: input.runId }, select: { issueId: true } })
    if (!run || run.issueId !== input.issueId) throw new Error('ai-daily-generation-run-issue-mismatch')
    const existing = await tx.aiDailyGeneratedRevision.findUnique({ where: { generationKey: input.generationKey } })
    if (existing) {
      return { revision: existing, reused: true, draftCreated: false, draftId: existing.projectionDraftId }
    }

    const issue = await tx.aiDailyIssue.findUnique({
      where: { id: input.issueId },
      include: { draft: true },
    })
    if (!issue) throw new Error('ai-daily-issue-not-found')
    const snapshots = input.evidence.map(toGenerationCitationSnapshot)
    const sourceBindings = {
      claims: input.result.claims.map((claim) => ({ claimId: claim.claimId, evidenceIds: claim.evidenceIds })),
    } as Prisma.InputJsonObject
    const contentJson = {
      title: input.result.composition?.title ?? issue.title,
      subtitle: input.result.composition?.subtitle ?? '',
      composition: input.result.composition,
      claims: input.result.claims,
      reviews: input.result.reviews,
      blockReviews: input.result.blockReviews,
    } as unknown as Prisma.InputJsonValue
    const sequence = await tx.aiDailyIssue.update({
      where: { id: input.issueId },
      data: { generatedRevisionSequence: { increment: 1 } },
      select: { generatedRevisionSequence: true },
    })
    const revision = await tx.aiDailyGeneratedRevision.create({
      data: {
        generationKey: input.generationKey,
        issueId: input.issueId,
        revisionNumber: sequence.generatedRevisionSequence,
        selectionVersion: issue.selectionVersion,
        evidenceVersion: issue.selectedEvidenceVersion,
        contentJson,
        sourceBindingsJson: sourceBindings,
        citationSnapshotsJson: toAiDailyCitationSnapshotsJson(snapshots),
        citationSchemaVersion: 2,
        promptVersion: input.result.promptVersion,
        schemaVersion: input.result.schemaVersion,
        modelRole: 'extractor+composer+verifier',
        modelIdentifier: input.modelIdentifier,
        observedDraftUpdatedAt: issue.draft?.updatedAt ?? null,
        projectionDraftId: issue.draftId,
        applyState: input.result.status === 'REJECTED' ? 'DISCARDED' : 'PENDING',
        validationStatus: input.result.status,
        validationFindingsJson: input.result.findings as unknown as Prisma.InputJsonValue,
        createdBy: input.createdBy,
      },
    })
    await tx.aiDailyIssue.update({
      where: { id: input.issueId },
      data: { latestGeneratedRevisionId: revision.id },
    })

    if (input.result.status === 'REJECTED') {
      await tx.aiDailyIssue.update({
        where: { id: input.issueId },
        data: { status: 'REJECTED', workflowState: 'REJECTED', newEvidenceAvailable: Boolean(issue.draftId) },
      })
      return { revision, reused: false, draftCreated: false, draftId: issue.draftId }
    }

    const targetEditorialState = input.result.status === 'VALID' || issue.draftId ? 'REVIEW_NEEDED' : 'EVIDENCE_READY'
    await advanceAiDailyEditorialStateInTransaction(tx, input.issueId, issue.workflowState, targetEditorialState)
    if (input.result.status === 'NEEDS_EDITOR_REVIEW') {
      await tx.aiDailyGeneratedRevision.update({ where: { id: revision.id }, data: { applyState: 'PENDING' } })
      await tx.aiDailyIssue.update({ where: { id: input.issueId }, data: { status: 'REVIEW_NEEDED', newEvidenceAvailable: Boolean(issue.draftId) } })
      return { revision, reused: false, draftCreated: false, draftId: issue.draftId }
    }

    const slug = `ai-daily-${issue.date}`
    const protectedDraft = issue.draft ?? (await tx.contentDraft.findUnique({ where: { slug } }))
    if (protectedDraft) {
      const blocked = await tx.aiDailyGeneratedRevision.update({
        where: { id: revision.id },
        data: { applyState: 'BLOCKED', projectionDraftId: protectedDraft.id },
      })
      await tx.aiDailyIssue.update({
        where: { id: input.issueId },
        data: { status: 'REVIEW_NEEDED', workflowState: 'REVIEW_NEEDED', draftId: protectedDraft.id, newEvidenceAvailable: true },
      })
      return { revision: blocked, reused: false, draftCreated: false, draftId: protectedDraft.id }
    }

    const draft = await tx.contentDraft.create({
      data: buildGeneratedAiDailyDraftInput(issue, input.result, snapshots, input.createdBy),
    })
    await tx.contentReview.create({
      data: {
        draftId: draft.id,
        status: 'PENDING',
        checklistJson: { sourceChecked: false, safetyChecked: false, publicReady: false },
        notes: 'Generated by evidence-bound AI Daily runner; editor review is required before export.',
      },
    })
    const applied = await tx.aiDailyGeneratedRevision.update({
      where: { id: revision.id },
      data: { applyState: 'APPLIED', appliedAt: now, projectionDraftId: draft.id },
    })
    await tx.aiDailyIssue.update({
      where: { id: input.issueId },
      data: { status: 'REVIEW_NEEDED', workflowState: 'REVIEW_NEEDED', draftId: draft.id, newEvidenceAvailable: false },
    })
    return { revision: applied, reused: false, draftCreated: true, draftId: draft.id }
  })
}

export async function completeAiDailyGenerationRun(
  prisma: PrismaClient,
  input: { runId: string; status: 'COMPLETED' | 'COMPLETED_WITH_GAPS' | 'FAILED'; errorCategory?: string; now?: Date },
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const run = await tx.aiDailyRun.findUnique({
      where: { id: input.runId },
      select: { status: true, lastFetchedAt: true, pipelineFreshnessAt: true, startedAt: true, createdAt: true },
    })
    if (!run) throw new Error('ai-daily-run-not-found')
    if (run.status !== input.status) {
      const transition = evaluateAiDailyRunTransition(run.status, input.status)
      if (!transition.ok) throw new Error(transition.error)
    }
    return tx.aiDailyRun.update({
      where: { id: input.runId },
      data: {
        status: input.status,
        finishedAt: now,
        finalErrorCategory: input.errorCategory ?? null,
        endToEndLagMs: boundedDurationMs(run.lastFetchedAt ?? run.pipelineFreshnessAt ?? run.startedAt ?? run.createdAt, now),
      },
    })
  })
}

export async function recordAiDailyEvidenceGap(
  prisma: PrismaClient,
  input: {
    issueId: string
    gaps: string[]
    runId?: string
    workItemId?: string
    leaseToken?: string
    now?: Date
  },
) {
  return prisma.$transaction(async (tx) => {
    if (input.workItemId || input.leaseToken) {
      if (!input.runId) throw new Error('ai-daily-generation-run-required')
      await assertAiDailyGenerationLeaseInTransaction(tx, {
        runId: input.runId,
        workItemId: input.workItemId,
        leaseToken: input.leaseToken,
        now: input.now ?? new Date(),
      })
    }
    const issue = await tx.aiDailyIssue.findUnique({ where: { id: input.issueId }, select: { workflowState: true } })
    if (!issue) throw new Error('ai-daily-issue-not-found')
    if (issue.workflowState !== 'NEEDS_MORE_EVIDENCE') {
      await advanceAiDailyEditorialStateInTransaction(tx, input.issueId, issue.workflowState, 'NEEDS_MORE_EVIDENCE')
    }
    return tx.aiDailyIssue.update({
      where: { id: input.issueId },
      data: {
        status: 'NEEDS_MORE_EVIDENCE',
        newEvidenceAvailable: false,
      },
    })
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
        generationKey: input.generationKey,
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
  input: {
    leaseOwner: string
    leaseDurationMs: number
    now?: Date
    runId?: string
    kinds?: AiDailyWorkKind[]
    profiles?: AiDailyProfile[]
  },
) {
  const now = input.now ?? new Date()
  const leaseExpiresAt = new Date(now.getTime() + input.leaseDurationMs)
  if (input.leaseDurationMs <= 0) throw new Error('invalid-ai-daily-lease-duration')

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.aiDailyWorkItem.findFirst({
      where: {
        ...(input.runId ? { runId: input.runId } : {}),
        ...(input.kinds && input.kinds.length > 0 ? { kind: { in: input.kinds } } : {}),
        ...(input.profiles && input.profiles.length > 0 ? { run: { profile: { in: input.profiles } } } : {}),
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
    const lockedItem = await lockAiDailyFlashItem(tx, input.flashItemId)
    if (lockedItem.lifecycleState === 'WITHDRAWN') throw new Error('ai-daily-flash-item-withdrawn')
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

interface LockedAiDailyFlashItem {
  id: string
  lifecycleState: AiDailyFlashLifecycleStateName
  currentApprovedRevisionId: string | null
  revisionSequence: number
  publicRevision: number
}

async function lockAiDailyFlashItem(tx: Prisma.TransactionClient, flashItemId: string) {
  const [item] = await tx.$queryRaw<LockedAiDailyFlashItem[]>`
    SELECT "id", "lifecycleState", "currentApprovedRevisionId", "revisionSequence", "publicRevision"
    FROM "AiDailyFlashItem"
    WHERE "id" = ${flashItemId}
    FOR UPDATE
  `
  if (!item) throw new Error('ai-daily-flash-item-not-found')
  return item
}

function assertAiDailyFlashPublicVersion(item: LockedAiDailyFlashItem, expectedPublicRevision: number) {
  if (
    !Number.isInteger(expectedPublicRevision) ||
    expectedPublicRevision < 0 ||
    item.publicRevision !== expectedPublicRevision
  ) {
    throw new Error('ai-daily-flash-item-conflict')
  }
}

async function readAiDailyFlashRevisionNumber(tx: Prisma.TransactionClient, revisionId: string | null) {
  if (!revisionId) return null
  const revision = await tx.aiDailyFlashRevision.findUnique({
    where: { id: revisionId },
    select: { revisionNumber: true },
  })
  if (!revision) throw new Error('ai-daily-flash-item-conflict')
  return revision.revisionNumber
}

export async function approveAiDailyFlashRevision(
  prisma: PrismaClient,
  input: ApproveAiDailyFlashRevisionInput,
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const binding = await tx.aiDailyFlashRevision.findUnique({
      where: { id: input.flashRevisionId },
      select: { flashItemId: true },
    })
    if (!binding) throw new Error('ai-daily-flash-revision-not-found')
    const item = await lockAiDailyFlashItem(tx, binding.flashItemId)
    assertAiDailyFlashPublicVersion(item, input.expectedPublicRevision)
    if (item.lifecycleState === 'WITHDRAWN') throw new Error('ai-daily-flash-item-withdrawn')

    const revision = await tx.aiDailyFlashRevision.findUnique({
      where: { id: input.flashRevisionId },
    })
    if (!revision) throw new Error('ai-daily-flash-revision-not-found')
    if (revision.flashItemId !== item.id) throw new Error('ai-daily-flash-revision-item-mismatch')
    if (input.observedRevisionNumber !== revision.revisionNumber) {
      throw new Error('ai-daily-flash-revision-conflict')
    }
    const transition = evaluateAiDailyFlashRevisionTransition(revision.status, 'APPROVED')
    if (!transition.ok) throw new Error(transition.error)

    const previousRevisionId = item.currentApprovedRevisionId
    if (previousRevisionId) {
      const previousRevision = await tx.aiDailyFlashRevision.findUnique({
        where: { id: previousRevisionId },
        select: { flashItemId: true, revisionNumber: true, status: true },
      })
      if (!previousRevision || previousRevision.flashItemId !== item.id) {
        throw new Error('ai-daily-flash-item-conflict')
      }
      const previousTransition = evaluateAiDailyFlashRevisionTransition(previousRevision.status, 'SUPERSEDED')
      if (!previousTransition.ok) throw new Error(previousTransition.error)
      const superseded = await tx.aiDailyFlashRevision.updateMany({
        where: { id: previousRevisionId, flashItemId: item.id, status: 'APPROVED' },
        data: { status: 'SUPERSEDED' },
      })
      if (superseded.count !== 1) throw new Error('ai-daily-flash-item-conflict')
      await tx.aiDailyApprovalAction.create({
        data: {
          flashItemId: item.id,
          flashRevisionId: previousRevisionId,
          action: 'SUPERSEDED',
          actor: input.actor,
          reason: input.reason,
          observedRevisionNumber: previousRevision.revisionNumber,
        },
      })
    }

    const approvedUpdate = await tx.aiDailyFlashRevision.updateMany({
      where: {
        id: revision.id,
        flashItemId: item.id,
        revisionNumber: input.observedRevisionNumber,
        status: 'DRAFT',
      },
      data: {
        status: 'APPROVED',
        approvedAt: now,
        supersededRevisionId: previousRevisionId,
      },
    })
    if (approvedUpdate.count !== 1) throw new Error('ai-daily-flash-revision-conflict')
    const approved = await tx.aiDailyFlashRevision.findUniqueOrThrow({ where: { id: revision.id } })
    await tx.aiDailyFlashItem.update({
      where: { id: item.id },
      data: {
        currentApprovedRevisionId: approved.id,
        publicRevision: { increment: 1 },
        lastApprovedAt: now,
        withdrawnAt: null,
        projectionUpdatedAt: now,
      },
    })
    await tx.aiDailyApprovalAction.create({
      data: {
        flashItemId: item.id,
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

export async function rejectAiDailyFlashRevision(
  prisma: PrismaClient,
  input: RejectAiDailyFlashRevisionInput,
) {
  return prisma.$transaction(async (tx) => {
    const binding = await tx.aiDailyFlashRevision.findUnique({
      where: { id: input.flashRevisionId },
      select: { flashItemId: true },
    })
    if (!binding) throw new Error('ai-daily-flash-revision-not-found')
    const item = await lockAiDailyFlashItem(tx, binding.flashItemId)
    assertAiDailyFlashPublicVersion(item, input.expectedPublicRevision)
    const revision = await tx.aiDailyFlashRevision.findUnique({ where: { id: input.flashRevisionId } })
    if (!revision) throw new Error('ai-daily-flash-revision-not-found')
    if (revision.flashItemId !== item.id) throw new Error('ai-daily-flash-revision-item-mismatch')
    if (revision.revisionNumber !== input.observedRevisionNumber) {
      throw new Error('ai-daily-flash-revision-conflict')
    }
    const transition = evaluateAiDailyFlashRevisionTransition(revision.status, 'REJECTED')
    if (!transition.ok) throw new Error(transition.error)
    const rejectedUpdate = await tx.aiDailyFlashRevision.updateMany({
      where: {
        id: revision.id,
        flashItemId: item.id,
        revisionNumber: input.observedRevisionNumber,
        status: 'DRAFT',
      },
      data: { status: 'REJECTED' },
    })
    if (rejectedUpdate.count !== 1) throw new Error('ai-daily-flash-revision-conflict')
    const rejected = await tx.aiDailyFlashRevision.findUniqueOrThrow({ where: { id: revision.id } })
    await tx.aiDailyApprovalAction.create({
      data: {
        flashItemId: item.id,
        flashRevisionId: rejected.id,
        action: 'REJECTED',
        actor: input.actor,
        reason: input.reason,
        observedRevisionNumber: rejected.revisionNumber,
      },
    })
    return rejected
  })
}

export async function transitionAiDailyFlashLifecycle(
  prisma: PrismaClient,
  input: TransitionAiDailyFlashLifecycleInput,
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const item = await lockAiDailyFlashItem(tx, input.flashItemId)
    assertAiDailyFlashPublicVersion(item, input.expectedPublicRevision)
    const transition = evaluateAiDailyFlashLifecycleTransition(item.lifecycleState, input.next)
    if (!transition.ok) throw new Error(transition.error)
    const observedRevisionNumber = await readAiDailyFlashRevisionNumber(tx, item.currentApprovedRevisionId)
    const updated = await tx.aiDailyFlashItem.update({
      where: { id: item.id },
      data: {
        lifecycleState: input.next,
        publicRevision: { increment: 1 },
        withdrawnAt: input.next === 'WITHDRAWN' ? now : null,
        projectionUpdatedAt: now,
      },
    })
    await tx.aiDailyApprovalAction.create({
      data: {
        flashItemId: item.id,
        flashRevisionId: item.currentApprovedRevisionId,
        action: input.next === 'HELD' ? 'HELD' : input.next === 'ACTIVE' ? 'RELEASED' : 'WITHDRAWN',
        actor: input.actor,
        reason: input.reason,
        observedRevisionNumber,
      },
    })
    return updated
  })
}

export async function createAiDailyFlashCorrection(
  prisma: PrismaClient,
  input: CreateAiDailyFlashCorrectionInput,
) {
  const now = input.now ?? new Date()
  return prisma.$transaction(async (tx) => {
    const item = await lockAiDailyFlashItem(tx, input.flashItemId)
    assertAiDailyFlashPublicVersion(item, input.expectedPublicRevision)
    if (item.revisionSequence !== input.expectedRevisionSequence) {
      throw new Error('ai-daily-flash-item-conflict')
    }
    if (item.lifecycleState === 'WITHDRAWN') throw new Error('ai-daily-flash-item-withdrawn')
    const sourceRevision = await tx.aiDailyFlashRevision.findUnique({ where: { id: input.sourceRevisionId } })
    if (!sourceRevision) throw new Error('ai-daily-flash-revision-not-found')
    if (sourceRevision.flashItemId !== item.id) throw new Error('ai-daily-flash-revision-item-mismatch')
    if (sourceRevision.id !== item.currentApprovedRevisionId || sourceRevision.status !== 'APPROVED') {
      throw new Error('ai-daily-flash-correction-source-not-current')
    }

    const revisionNumber = item.revisionSequence + 1
    await tx.aiDailyFlashItem.update({
      where: { id: item.id },
      data: { revisionSequence: revisionNumber },
    })
    const revision = await tx.aiDailyFlashRevision.create({
      data: {
        flashItemId: item.id,
        revisionNumber,
        generatedRevisionId: sourceRevision.generatedRevisionId,
        selectionVersion: sourceRevision.selectionVersion,
        evidenceVersion: sourceRevision.evidenceVersion,
        title: input.title,
        factSummary: input.factSummary,
        whyItMatters: input.whyItMatters,
        uncertainty: input.uncertainty,
        correctionState: 'correction-draft',
        correctedAt: now,
        citationSnapshotsJson:
          sourceRevision.citationSnapshotsJson === null
            ? Prisma.JsonNull
            : (sourceRevision.citationSnapshotsJson as Prisma.InputJsonValue),
        citationSchemaVersion: sourceRevision.citationSchemaVersion,
        editor: input.editor,
      },
    })
    await tx.aiDailyApprovalAction.create({
      data: {
        flashItemId: item.id,
        flashRevisionId: revision.id,
        action: 'SUBMITTED',
        actor: input.actor,
        reason: input.reason,
        observedRevisionNumber: revision.revisionNumber,
        metadataJson: { correction: true, sourceRevisionId: sourceRevision.id },
      },
    })
    return revision
  })
}

async function assertAiDailyGenerationLeaseInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    runId: string
    workItemId?: string
    leaseToken?: string
    now: Date
  },
) {
  if (!input.workItemId && !input.leaseToken) return
  if (!input.workItemId || !input.leaseToken) throw new Error('ai-daily-generation-lease-binding-incomplete')
  const [workItem] = await tx.$queryRaw<Array<{
    runId: string | null
    status: string
    leaseToken: string | null
    leaseExpiresAt: Date | null
  }>>`
    SELECT "runId", "status", "leaseToken", "leaseExpiresAt"
    FROM "AiDailyWorkItem"
    WHERE "id" = ${input.workItemId}
    FOR UPDATE
  `
  if (!workItem || workItem.runId !== input.runId || workItem.status !== 'LEASED') {
    throw new Error('ai-daily-generation-work-item-invalid')
  }
  const lease = evaluateAiDailyLease({
    currentLeaseToken: workItem.leaseToken,
    currentLeaseExpiresAt: workItem.leaseExpiresAt,
    providedLeaseToken: input.leaseToken,
    now: input.now,
  })
  if (!lease.ok) throw new Error(lease.error)
}

function normalizeSourceTier(value: string): AiDailyGenerationEvidence['sourceTier'] {
  const normalized = value.trim().toUpperCase()
  return normalized === 'TIER_1' ? 'TIER_1' : normalized === 'TIER_2' ? 'TIER_2' : 'TIER_3'
}

function readFirstJsonString(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return undefined
  const first = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return first?.slice(0, 240)
}

function toGenerationCitationSnapshot(evidence: AiDailyGenerationEvidence): AiDailyCitationSnapshotV2 {
  const result = normalizeAiDailyCitationSnapshotV2({
    version: 2,
    sourceItemId: evidence.sourceItemId,
    evidenceId: evidence.evidenceId,
    title: evidence.title,
    publisher: evidence.publisher,
    originalUrl: evidence.url,
    canonicalUrl: evidence.canonicalUrl || evidence.url,
    publishedAt: evidence.publishedAt,
    retrievedAt: evidence.retrievedAt,
    excerpt: evidence.quote.slice(0, 1024),
    locator: evidence.locator,
    contentHash: evidence.contentHash,
  })
  if (!result.ok) throw new Error('invalid-citation-snapshot-v2')
  return result.snapshot
}

async function advanceAiDailyEditorialStateInTransaction(
  tx: Prisma.TransactionClient,
  issueId: string,
  current: AiDailyEditorialStateName,
  target: AiDailyEditorialStateName,
) {
  if (current === target) return
  const paths: Record<AiDailyEditorialStateName, Partial<Record<AiDailyEditorialStateName, AiDailyEditorialStateName[]>>> = {
    COLLECTING: { EVIDENCE_READY: ['EVIDENCE_READY'], NEEDS_MORE_EVIDENCE: ['NEEDS_MORE_EVIDENCE'], REVIEW_NEEDED: ['EVIDENCE_READY', 'REVIEW_NEEDED'], REJECTED: ['REJECTED'] },
    EVIDENCE_READY: { REVIEW_NEEDED: ['REVIEW_NEEDED'], NEEDS_MORE_EVIDENCE: ['NEEDS_MORE_EVIDENCE'], REJECTED: ['REJECTED'] },
    NEEDS_MORE_EVIDENCE: { EVIDENCE_READY: ['EVIDENCE_READY'], REVIEW_NEEDED: ['EVIDENCE_READY', 'REVIEW_NEEDED'], REJECTED: ['REJECTED'] },
    REVIEW_NEEDED: { NEEDS_MORE_EVIDENCE: ['NEEDS_MORE_EVIDENCE'], REVIEW_NEEDED: [] },
    EXPORTED: { NEEDS_MORE_EVIDENCE: ['REVIEW_NEEDED', 'NEEDS_MORE_EVIDENCE'], REVIEW_NEEDED: ['REVIEW_NEEDED'], REJECTED: ['REJECTED'] },
    REJECTED: { COLLECTING: ['COLLECTING'], EVIDENCE_READY: ['COLLECTING', 'EVIDENCE_READY'], NEEDS_MORE_EVIDENCE: ['COLLECTING', 'NEEDS_MORE_EVIDENCE'], REVIEW_NEEDED: ['COLLECTING', 'EVIDENCE_READY', 'REVIEW_NEEDED'] },
  }
  const path = paths[current]?.[target]
  if (!path) throw new Error('invalid-ai-daily-editorial-transition')
  let state = current
  for (const next of path) {
    const transition = evaluateAiDailyEditorialTransition(state, next)
    if (!transition.ok) throw new Error(transition.error)
    await tx.aiDailyIssue.update({ where: { id: issueId }, data: { workflowState: next } })
    state = next
  }
}

function buildGeneratedAiDailyDraftInput(
  issue: { id: string; date: string; title: string },
  result: AiDailyGenerationResult,
  snapshots: AiDailyCitationSnapshotV2[],
  createdBy: string,
): Prisma.ContentDraftCreateInput {
  const composition = result.composition
  const blocks: Prisma.InputJsonValue[] = [
    { type: 'heading', level: 2, text: '今日摘要 / Daily Brief' },
    { type: 'paragraph', text: composition?.introduction.text ?? '本期生成未形成可公开摘要。' },
  ]
  for (const event of composition?.events ?? []) {
    blocks.push({ type: 'heading', level: 3, text: event.title })
    blocks.push({ type: 'paragraph', text: event.factSummary.text, claimIds: event.factSummary.claimIds })
    blocks.push({ type: 'paragraph', text: event.whyItMatters.text, claimIds: event.whyItMatters.claimIds })
  }
  if ((composition?.trends.length ?? 0) > 0) {
    blocks.push({ type: 'heading', level: 2, text: '趋势观察 / Trends' })
    blocks.push({ type: 'list', items: composition?.trends.map((trend) => trend.text) ?? [] })
  }
  blocks.push({ type: 'heading', level: 2, text: '来源 / Sources' })
  for (const snapshot of snapshots) {
    blocks.push({
      type: 'source-card',
      sourceItemId: snapshot.sourceItemId,
      citationSnapshot: toAiDailyCitationSnapshotJson(snapshot),
      caption: `${snapshot.title} · ${snapshot.publisher}`,
    })
  }
  blocks.push({
    type: 'heading',
    level: 2,
    text: '审核 Gate',
  })
  blocks.push({
    type: 'list',
    items: ['逐条复核 citation snapshot 与原文语境。', '完成 sourceChecked、safetyChecked、publicReady 后再导出。', `本期 issue id：${issue.id}`],
  })
  const title = composition?.title || issue.title
  const subtitle = composition?.subtitle || '基于已抓取证据生成，等待编辑审核。'
  return {
    slug: `ai-daily-${issue.date}`,
    title,
    column: 'ai-daily',
    tag: 'AI 日报',
    detail: subtitle.slice(0, 600),
    readTime: '6 min',
    bodyJson: { blocks },
    knowledgePoints: ['AI Daily', 'evidence-bound generation'],
    projectIds: [],
    status: 'REVIEW_NEEDED',
    visibility: 'HIDDEN',
    aiAssistance: 'ai-daily-generation-v1',
    createdBy,
    updatedBy: createdBy,
  }
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
