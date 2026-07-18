import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { buildAiDailyCitationSnapshotFixture } from '../src/aiDailyFixtures.js'
import {
  approveAiDailyFlashRevision,
  claimAiDailyWorkItem,
  completeAiDailyWorkItem,
  createAiDailyFlashCorrection,
  createAiDailyFlashRevision,
  createAiDailyGeneratedRevision,
  getOrCreateAiDailyEdition,
  loadAiDailyIssueSources,
  rejectAiDailyFlashRevision,
  replaceAiDailyIssueSelection,
  transitionAiDailyFlashLifecycle,
  upsertAiDailyCanonicalSource,
  upsertAiDailyWorkItem,
} from '../src/aiDailyRepository.js'
import {
  applyAiDailyGeneratedRevision,
  createAiDailyGeneratedCorrection,
  discardAiDailyGeneratedRevision,
  revalidateAiDailyGeneratedRevision,
  type AiDailyEditableContent,
} from '../src/aiDailyEditionRepository.js'

const databaseUrl = process.env.STUDIO_DATABASE_URL ?? ''
const database = readDisposableDatabase(databaseUrl)
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

async function main() {
  const suffix = randomUUID().slice(0, 8)
  const legacySource = await prisma.sourceItem.create({
    data: {
      title: 'Human edited source title',
      url: `https://example.com/releases/${suffix}?utm_source=legacy`,
      sourceName: 'Human publisher',
      sourceTier: 'official-primary',
      summary: 'Human summary must survive canonical promotion.',
    },
  })
  const canonicalSource = await upsertAiDailyCanonicalSource(prisma, {
    title: 'Machine candidate title',
    url: `https://example.com/releases/${suffix}`,
    sourceName: 'Machine publisher',
    sourceTier: 'trusted-aggregator',
    summary: 'Machine summary',
  })
  if (canonicalSource.id !== legacySource.id || canonicalSource.title !== legacySource.title) {
    throw new Error('canonical promotion must adopt the legacy source without overwriting human fields')
  }

  const issue = await getOrCreateAiDailyEdition(prisma, {
    date: '2030-01-01',
    title: `AI Daily repository fixture ${suffix}`,
  })
  const initialSelection = await replaceAiDailyIssueSelection(prisma, {
    issueId: issue.id,
    sourceIds: [canonicalSource.id],
    selectedBy: 'repository-check',
  })
  if (!initialSelection.changed || initialSelection.selectionVersion !== 1) {
    throw new Error('initial source selection should create version 1')
  }
  const repeatedSelection = await replaceAiDailyIssueSelection(prisma, {
    issueId: issue.id,
    sourceIds: [canonicalSource.id],
    selectedBy: 'repository-check',
  })
  if (repeatedSelection.changed || repeatedSelection.selectionVersion !== 1) {
    throw new Error('identical source selection must be idempotent')
  }
  const loadedSelection = await loadAiDailyIssueSources(prisma, issue.id)
  if (loadedSelection.authority !== 'relation' || loadedSelection.sources[0]?.id !== canonicalSource.id) {
    throw new Error('current relational source selection should be authoritative')
  }

  const citation = buildAiDailyCitationSnapshotFixture({
    sourceItemId: canonicalSource.id,
    originalUrl: canonicalSource.url,
    canonicalUrl: canonicalSource.canonicalUrl ?? canonicalSource.url,
  })
  const claimId = `claim-${suffix}`
  const editableContent: AiDailyEditableContent = {
    title: 'Generated fixture',
    subtitle: 'Repository edition lifecycle fixture',
    introduction: { text: 'A bounded introduction backed by one fixture claim.', claimIds: [claimId] },
    events: [
      {
        eventId: `event-${suffix}`,
        title: 'Repository fixture event',
        factSummary: { text: 'The fixture stores one source-backed fact.', claimIds: [claimId] },
        whyItMatters: { text: 'The editor can correct and explicitly apply it.', claimIds: [claimId] },
        uncertainty: 'low',
        claimIds: [claimId],
      },
    ],
    trends: [{ text: 'Immutable revisions preserve editorial history.', claimIds: [claimId] }],
  }
  const generated = await createAiDailyGeneratedRevision(prisma, {
    issueId: issue.id,
    contentJson: { title: editableContent.title, composition: editableContent, claims: [{ claimId }] },
    sourceBindingsJson: { sourceIds: [canonicalSource.id] },
    citationSnapshots: [citation],
    promptVersion: 'fixture-v1',
    schemaVersion: 'fixture-v1',
    modelRole: 'fixture',
    modelIdentifier: 'fixture-model',
    validationStatus: 'VALID',
    createdBy: 'repository-check',
  })
  const generatedOwner = await prisma.aiDailyIssue.findUniqueOrThrow({ where: { id: issue.id } })
  if (generated.revisionNumber !== 1 || generatedOwner.latestGeneratedRevisionId !== generated.id) {
    throw new Error('generated revision ownership should advance atomically')
  }

  await expectFailure(
    () =>
      createAiDailyGeneratedCorrection(prisma, {
        issueId: issue.id,
        sourceRevisionId: generated.id,
        expectedRevisionNumber: generated.revisionNumber,
        expectedIssueUpdatedAt: new Date(0),
        content: { ...editableContent, title: 'Stale correction fixture' },
        actor: 'repository-check',
        idempotencyKey: `stale-${suffix}`,
      }),
    'ai-daily-generated-issue-conflict',
  )

  const correctionKey = `edition-${suffix}`
  const correctionInput = {
    issueId: issue.id,
    sourceRevisionId: generated.id,
    expectedRevisionNumber: generated.revisionNumber,
    expectedIssueUpdatedAt: generatedOwner.updatedAt,
    content: { ...editableContent, title: 'Editor correction fixture' },
    actor: 'repository-check',
    reason: 'verify immutable correction and explicit apply',
    idempotencyKey: correctionKey,
  }
  const correctionResult = await createAiDailyGeneratedCorrection(prisma, correctionInput)
  const correctionRetry = await createAiDailyGeneratedCorrection(prisma, correctionInput)
  if (
    correctionResult.reused ||
    !correctionRetry.reused ||
    correctionRetry.revision.id !== correctionResult.revision.id ||
    correctionResult.revision.sourceRevisionId !== generated.id
  ) {
    throw new Error('edition correction should append once and reuse the same revision after a lost response')
  }
  const sourceAfterCorrection = await prisma.aiDailyGeneratedRevision.findUnique({ where: { id: generated.id } })
  if (!sourceAfterCorrection) throw new Error('edition correction must retain its source revision')

  const issueBeforeRevalidation = await prisma.aiDailyIssue.findUniqueOrThrow({ where: { id: issue.id } })
  const revalidated = await revalidateAiDailyGeneratedRevision(prisma, {
    issueId: issue.id,
    revisionId: correctionResult.revision.id,
    expectedRevisionNumber: correctionResult.revision.revisionNumber,
    expectedIssueUpdatedAt: issueBeforeRevalidation.updatedAt,
    actor: 'repository-check',
  })
  if (revalidated.revision.validationStatus !== 'VALID' || revalidated.revision.applyState !== 'PENDING') {
    throw new Error('deterministic edition revalidation should make the correction explicitly applicable')
  }

  const issueBeforeApply = await prisma.aiDailyIssue.findUniqueOrThrow({ where: { id: issue.id } })
  const applied = await applyAiDailyGeneratedRevision(prisma, {
    issueId: issue.id,
    revisionId: correctionResult.revision.id,
    expectedRevisionNumber: correctionResult.revision.revisionNumber,
    expectedIssueUpdatedAt: issueBeforeApply.updatedAt,
    actor: 'repository-check',
  })
  const pendingReview = await prisma.contentReview.findFirst({
    where: { draftId: applied.draft.id },
    orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
  })
  if (
    applied.blocked ||
    applied.revision.applyState !== 'APPLIED' ||
    applied.draft.status !== 'REVIEW_NEEDED' ||
    applied.draft.visibility !== 'HIDDEN' ||
    pendingReview?.status !== 'PENDING'
  ) {
    throw new Error('applying a valid edition revision should create a hidden draft and restart review')
  }
  const issueAfterApply = await prisma.aiDailyIssue.findUniqueOrThrow({ where: { id: issue.id } })
  if (!issueAfterApply.newEvidenceAvailable) {
    throw new Error('applying a correction must not clear its still-pending source revision')
  }
  await discardAiDailyGeneratedRevision(prisma, {
    issueId: issue.id,
    revisionId: generated.id,
    expectedRevisionNumber: generated.revisionNumber,
    expectedIssueUpdatedAt: issueAfterApply.updatedAt,
    actor: 'repository-check',
    reason: 'source revision superseded by applied correction',
  })
  const issueAfterDiscard = await prisma.aiDailyIssue.findUniqueOrThrow({ where: { id: issue.id } })
  if (issueAfterDiscard.newEvidenceAvailable) {
    throw new Error('new evidence signal should clear only after no pending or blocked revisions remain')
  }
  await expectFailure(
    () =>
      createAiDailyGeneratedCorrection(prisma, {
        issueId: issue.id,
        sourceRevisionId: generated.id,
        expectedRevisionNumber: generated.revisionNumber,
        expectedIssueUpdatedAt: issueAfterDiscard.updatedAt,
        content: { ...editableContent, title: 'Terminal source correction fixture' },
        actor: 'repository-check',
        idempotencyKey: `terminal-${suffix}`,
      }),
    'invalid-ai-daily-generated-apply-transition',
  )

  const archivedDraft = await prisma.contentDraft.update({
    where: { id: applied.draft.id },
    data: { status: 'ARCHIVED', visibility: 'ARCHIVE' },
  })
  const protectedRevision = await createAiDailyGeneratedRevision(prisma, {
    issueId: issue.id,
    contentJson: { title: editableContent.title, composition: editableContent, claims: [{ claimId }] },
    sourceBindingsJson: { sourceIds: [canonicalSource.id] },
    citationSnapshots: [citation],
    promptVersion: 'fixture-v2',
    schemaVersion: 'fixture-v1',
    modelRole: 'fixture',
    modelIdentifier: 'fixture-model',
    validationStatus: 'VALID',
    createdBy: 'repository-check',
    observedDraftUpdatedAt: archivedDraft.updatedAt,
  })
  const issueBeforeProtectedApply = await prisma.aiDailyIssue.findUniqueOrThrow({ where: { id: issue.id } })
  await expectFailure(
    () =>
      applyAiDailyGeneratedRevision(prisma, {
        issueId: issue.id,
        revisionId: protectedRevision.id,
        expectedRevisionNumber: protectedRevision.revisionNumber,
        expectedIssueUpdatedAt: issueBeforeProtectedApply.updatedAt,
        expectedDraftUpdatedAt: archivedDraft.updatedAt,
        actor: 'repository-check',
      }),
    'ai-daily-generated-revision-draft-protected',
  )

  const work = await upsertAiDailyWorkItem(prisma, {
    editionDate: '2030-01-01',
    kind: 'COLLECT_FEED',
    scope: `feed:${suffix}`,
    priority: 10_000,
  })
  const duplicateWork = await upsertAiDailyWorkItem(prisma, {
    editionDate: '2030-01-01',
    kind: 'COLLECT_FEED',
    scope: `feed:${suffix}`,
  })
  if (work.id !== duplicateWork.id) throw new Error('work idempotency should return the existing item')

  const firstClaim = await claimAiDailyWorkItem(prisma, {
    leaseOwner: 'worker-a',
    leaseDurationMs: 60_000,
    now: new Date('2030-01-01T00:00:00.000Z'),
    kinds: ['COLLECT_FEED'],
  })
  if (!firstClaim) throw new Error('pending work should be claimable')
  const reclaimed = await claimAiDailyWorkItem(prisma, {
    leaseOwner: 'worker-b',
    leaseDurationMs: 60_000,
    now: new Date('2030-01-01T00:02:00.000Z'),
    kinds: ['COLLECT_FEED'],
  })
  if (!reclaimed || reclaimed.leaseToken === firstClaim.leaseToken || reclaimed.attemptNumber !== 2) {
    throw new Error('expired work should be reclaimed with a new lease and attempt')
  }
  await expectFailure(
    () =>
      completeAiDailyWorkItem(prisma, {
        workItemId: work.id,
        leaseToken: firstClaim.leaseToken,
        result: 'succeeded',
        now: new Date('2030-01-01T00:02:10.000Z'),
      }),
    'lease-token-mismatch',
  )
  await completeAiDailyWorkItem(prisma, {
    workItemId: work.id,
    leaseToken: reclaimed.leaseToken,
    result: 'succeeded',
    now: new Date('2030-01-01T00:02:30.000Z'),
  })
  const attempts = await prisma.aiDailyWorkAttempt.findMany({
    where: { workItemId: work.id },
    orderBy: { attemptNumber: 'asc' },
  })
  if (attempts[0]?.outcome !== 'RETRYABLE_FAILED' || attempts[1]?.outcome !== 'SUCCEEDED') {
    throw new Error(`work attempt history is incomplete: ${JSON.stringify(attempts)}`)
  }

  const flashItem = await prisma.aiDailyFlashItem.create({
    data: {
      publicId: `flash-${suffix}`,
      stableEventKey: `event-${suffix}`,
      sourceClusterIdentity: `cluster-${suffix}`,
    },
  })
  const firstFlash = await createAiDailyFlashRevision(prisma, {
    flashItemId: flashItem.id,
    generatedRevisionId: generated.id,
    selectionVersion: 1,
    evidenceVersion: 0,
    title: 'First flash revision',
    factSummary: 'First fact summary',
    whyItMatters: 'First impact explanation',
    citationSnapshots: [citation],
    actor: 'repository-check',
  })
  await approveAiDailyFlashRevision(prisma, {
    flashRevisionId: firstFlash.id,
    actor: 'repository-check',
    observedRevisionNumber: firstFlash.revisionNumber,
    expectedPublicRevision: 0,
  })
  const secondFlash = await createAiDailyFlashRevision(prisma, {
    flashItemId: flashItem.id,
    generatedRevisionId: generated.id,
    selectionVersion: 1,
    evidenceVersion: 0,
    title: 'Second flash revision',
    factSummary: 'Corrected fact summary',
    whyItMatters: 'Corrected impact explanation',
    citationSnapshots: [citation],
    actor: 'repository-check',
  })
  await approveAiDailyFlashRevision(prisma, {
    flashRevisionId: secondFlash.id,
    actor: 'repository-check',
    observedRevisionNumber: secondFlash.revisionNumber,
    expectedPublicRevision: 1,
  })
  const [firstFlashAfter, secondFlashAfter, flashAfter] = await Promise.all([
    prisma.aiDailyFlashRevision.findUniqueOrThrow({ where: { id: firstFlash.id } }),
    prisma.aiDailyFlashRevision.findUniqueOrThrow({ where: { id: secondFlash.id } }),
    prisma.aiDailyFlashItem.findUniqueOrThrow({ where: { id: flashItem.id } }),
  ])
  if (
    firstFlashAfter.status !== 'SUPERSEDED' ||
    secondFlashAfter.status !== 'APPROVED' ||
    flashAfter.currentApprovedRevisionId !== secondFlash.id ||
    flashAfter.publicRevision !== 2
  ) {
    throw new Error('flash approval should supersede and project in one transaction')
  }

  const correction = await createAiDailyFlashCorrection(prisma, {
    flashItemId: flashItem.id,
    sourceRevisionId: secondFlash.id,
    expectedPublicRevision: 2,
    expectedRevisionSequence: 2,
    title: 'Correction draft',
    factSummary: 'Corrected fact summary without mutating the approved revision',
    whyItMatters: 'The correction remains reviewable before publication',
    actor: 'repository-check',
  })
  const correctionOwner = await prisma.aiDailyFlashItem.findUniqueOrThrow({ where: { id: flashItem.id } })
  if (
    correction.status !== 'DRAFT' ||
    correction.revisionNumber !== 3 ||
    correctionOwner.revisionSequence !== 3 ||
    correctionOwner.currentApprovedRevisionId !== secondFlash.id
  ) {
    throw new Error('flash correction should create a new draft without replacing the approved revision')
  }
  await rejectAiDailyFlashRevision(prisma, {
    flashRevisionId: correction.id,
    actor: 'repository-check',
    observedRevisionNumber: correction.revisionNumber,
    expectedPublicRevision: 2,
  })
  await transitionAiDailyFlashLifecycle(prisma, {
    flashItemId: flashItem.id,
    next: 'HELD',
    actor: 'repository-check',
    expectedPublicRevision: 2,
  })
  await transitionAiDailyFlashLifecycle(prisma, {
    flashItemId: flashItem.id,
    next: 'ACTIVE',
    actor: 'repository-check',
    expectedPublicRevision: 3,
  })
  const withdrawn = await transitionAiDailyFlashLifecycle(prisma, {
    flashItemId: flashItem.id,
    next: 'WITHDRAWN',
    actor: 'repository-check',
    reason: 'repository lifecycle fixture complete',
    expectedPublicRevision: 4,
  })
  if (withdrawn.lifecycleState !== 'WITHDRAWN' || withdrawn.publicRevision !== 5 || !withdrawn.withdrawnAt) {
    throw new Error('flash withdrawal should advance public revision and record the withdrawal timestamp')
  }
  await expectFailure(
    () =>
      createAiDailyFlashRevision(prisma, {
        flashItemId: flashItem.id,
        selectionVersion: 1,
        evidenceVersion: 0,
        title: 'Invalid post-withdrawal draft',
        factSummary: 'This draft must not be created',
        whyItMatters: 'Withdrawn items are terminal',
        citationSnapshots: [citation],
        actor: 'repository-check',
      }),
    'ai-daily-flash-item-withdrawn',
  )
  await expectFailure(
    () =>
      transitionAiDailyFlashLifecycle(prisma, {
        flashItemId: flashItem.id,
        next: 'ACTIVE',
        actor: 'repository-check',
        expectedPublicRevision: 5,
      }),
    'invalid-ai-daily-transition',
  )

  await expectFailure(
    () => prisma.aiDailyFlashRevision.update({ where: { id: secondFlash.id }, data: { title: 'Mutated title' } }),
    'ai-daily-flash-revision-content-is-immutable',
  )
  const approvalAction = await prisma.aiDailyApprovalAction.findFirstOrThrow({
    where: { flashItemId: flashItem.id },
  })
  await expectFailure(
    () => prisma.aiDailyApprovalAction.delete({ where: { id: approvalAction.id } }),
    'ai-daily-approval-history-is-append-only',
  )

  console.log(`AI Daily repository check passed against disposable database ${database}`)
}

function readDisposableDatabase(value: string) {
  if (process.env.AI_DAILY_DATABASE_CHECK !== '1') throw new Error('ai-daily-database-check-not-enabled')
  if (!value) throw new Error('database-url-not-configured')
  const url = new URL(value)
  const databaseName = url.pathname.replace(/^\//u, '')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !databaseName.endsWith('_test')) {
    throw new Error('ai-daily-repository-check-requires-local-test-database')
  }
  return databaseName
}

async function expectFailure(action: () => Promise<unknown>, message: string) {
  try {
    await action()
  } catch (error) {
    if (error instanceof Error && error.message.includes(message)) return
    throw error
  }
  throw new Error(`expected failure containing ${message}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
