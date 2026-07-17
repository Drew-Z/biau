import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { buildAiDailyCitationSnapshotFixture } from '../src/aiDailyFixtures.js'
import {
  approveAiDailyFlashRevision,
  claimAiDailyWorkItem,
  completeAiDailyWorkItem,
  createAiDailyFlashRevision,
  createAiDailyGeneratedRevision,
  getOrCreateAiDailyEdition,
  loadAiDailyIssueSources,
  replaceAiDailyIssueSelection,
  upsertAiDailyCanonicalSource,
  upsertAiDailyWorkItem,
} from '../src/aiDailyRepository.js'

const databaseUrl = process.env.DATABASE_URL ?? ''
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
  const generated = await createAiDailyGeneratedRevision(prisma, {
    issueId: issue.id,
    contentJson: { title: 'Generated fixture' },
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

  const work = await upsertAiDailyWorkItem(prisma, {
    editionDate: '2030-01-01',
    kind: 'COLLECT_FEED',
    scope: `feed:${suffix}`,
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
  })
  if (!firstClaim) throw new Error('pending work should be claimable')
  const reclaimed = await claimAiDailyWorkItem(prisma, {
    leaseOwner: 'worker-b',
    leaseDurationMs: 60_000,
    now: new Date('2030-01-01T00:02:00.000Z'),
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
