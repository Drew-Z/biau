import { randomInt, randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { aiDailyGenerationSchemaVersion, createRejectedAiDailyGeneration } from '../src/aiDailyGeneration.js'
import { buildAiDailyGenerationProvidersFixture } from '../src/aiDailyGenerationFixtures.js'
import {
  AiDailyGenerationRunnerInterruptedError,
  executeAiDailyGenerationWork,
} from '../src/aiDailyGenerationRunner.js'
import { createAiDailyEvidenceDocument } from '../src/aiDailyIngestionRepository.js'
import {
  claimAiDailyWorkItem,
  createOrResumeAiDailyGenerationRun,
  listAiDailyGenerationCheckpoints,
  loadAiDailyGenerationEvidencePack,
  persistAiDailyGenerationOutcome,
  queueAiDailyGenerationWork,
  saveAiDailyGenerationCheckpoint,
} from '../src/aiDailyRepository.js'

const databaseUrl = process.env.STUDIO_DATABASE_URL ?? ''
const database = readDisposableDatabase(databaseUrl)
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

async function main() {
  const suffix = randomUUID().slice(0, 8)
  const editionDate = randomFixtureDate()
  const date = editionDate.toISOString().slice(0, 10)
  const issue = await prisma.aiDailyIssue.create({
    data: {
      date,
      editionDate,
      title: `AI Daily generation fixture ${suffix}`,
      sourceIdsJson: [],
      selectionVersion: 1,
      selectedEvidenceVersion: 1,
      workflowState: 'EVIDENCE_READY',
    },
  })

  const [firstRun, secondRun] = await Promise.all([
    createOrResumeAiDailyGenerationRun(prisma, {
      issueId: issue.id,
      trigger: 'MANUAL',
      profile: 'FIXTURE',
      configVersion: 'generation-repository-check-v1',
    }),
    createOrResumeAiDailyGenerationRun(prisma, {
      issueId: issue.id,
      trigger: 'SCHEDULED',
      profile: 'FIXTURE',
      configVersion: 'generation-repository-check-v1',
    }),
  ])
  if (firstRun.run.id !== secondRun.run.id) throw new Error('same-date concurrent generation must resolve to one active run')
  const run = firstRun.run

  for (let index = 0; index < 4; index += 1) {
    const position = index + 1
    const source = await prisma.sourceItem.create({
      data: {
        title: `Fixture source ${position}`,
        url: `https://official${position}.example.com/${suffix}`,
        canonicalUrl: `https://official${position}.example.com/${suffix}`,
        canonicalKey: `https://official${position}.example.com/${suffix}`,
        publisherDomain: `official${position}.example.com`,
        sourceName: `Official ${position}`,
        sourceTier: index < 2 ? 'TIER_1' : 'TIER_2',
        publishedAt: new Date(editionDate.getTime() - position * 60_000),
        capturedAt: editionDate,
        rawExcerpt: `Fixture evidence ${position}`,
        summary: `Fixture evidence ${position}`,
      },
    })
    const candidate = await prisma.aiDailyCandidate.create({
      data: {
        runId: run.id,
        providerKind: 'fixture',
        originalUrl: source.url,
        normalizedUrl: source.url,
        canonicalUrl: source.url,
        canonicalKey: `${source.canonicalKey}:candidate`,
        title: source.title,
        publisher: source.sourceName,
        publisherDomain: source.publisherDomain ?? `official${position}.example.com`,
        publishedAt: source.publishedAt,
        sourceTier: source.sourceTier,
        sourceItemId: source.id,
        selectionState: 'SELECTED',
        evidenceStatus: 'READY',
        fetchStatus: 'FETCHED',
        observationKey: suffix,
      },
    })
    await createAiDailyEvidenceDocument(prisma, {
      candidateId: candidate.id,
      evidence: {
        extractionMethod: 'DIRECT',
        originalUrl: source.url,
        canonicalUrl: source.url,
        title: source.title,
        publisher: source.sourceName,
        author: null,
        publishedAt: source.publishedAt,
        fetchedAt: editionDate,
        locale: 'zh-CN',
        contentType: 'text/html',
        contentHash: `hash-${suffix}-${position}`,
        headings: ['Release details'],
        normalizedText:
          index < 2
            ? `官方发布 ${position} 公布版本、API 能力和上线日期，原始页面提供完整上下文。`
            : `技术媒体 ${position} 报道评测观察和采用范围，保留报道性陈述所需上下文。`,
        excerpt:
          index < 2
            ? `官方发布 ${position} 公布版本、API 能力和上线日期，原始页面提供完整上下文。`
            : `技术媒体 ${position} 报道评测观察和采用范围，保留报道性陈述所需上下文。`,
        normalizedBytes: 160,
        status: 'READY',
        expiresAt: new Date(editionDate.getTime() + 30 * 86_400_000),
      },
    })
    await prisma.aiDailyIssueSource.create({
      data: {
        issueId: issue.id,
        sourceItemId: source.id,
        selectionVersion: 1,
        position: index,
        selectedBy: 'generation-repository-check',
      },
    })
  }

  const queued = await queueAiDailyGenerationWork(prisma, {
    issueId: issue.id,
    trigger: 'MANUAL',
    profile: 'FIXTURE',
    configVersion: 'generation-repository-check-v1',
    deadlineAt: new Date(Date.now() + 15 * 60_000),
  })
  if (queued.run.id !== run.id) throw new Error('queued generation must reuse the active advisory-locked run')
  const duplicateQueue = await queueAiDailyGenerationWork(prisma, {
    issueId: issue.id,
    trigger: 'SCHEDULED',
    profile: 'FIXTURE',
    configVersion: 'generation-repository-check-v1',
  })
  if (duplicateQueue.work.id !== queued.work.id) throw new Error('generation work identity must ignore trigger source')
  await expectFailure(
    () => queueAiDailyGenerationWork(prisma, {
      issueId: issue.id,
      trigger: 'MANUAL',
      profile: 'PRODUCTION',
      configVersion: 'generation-repository-check-v1',
    }),
    'ai-daily-generation-active-run-profile-mismatch',
  )
  await expectFailure(
    () => queueAiDailyGenerationWork(prisma, {
      issueId: issue.id,
      trigger: 'MANUAL',
      profile: 'FIXTURE',
      configVersion: 'generation-repository-check-drifted',
    }),
    'ai-daily-generation-active-run-config-mismatch',
  )

  const claimed = await claimAiDailyWorkItem(prisma, {
    leaseOwner: 'generation-repository-check',
    leaseDurationMs: 20 * 60_000,
    runId: run.id,
    kinds: ['EXTRACT_FACTS'],
  })
  if (!claimed) throw new Error('generation work should be claimable')
  await expectInterruption(() =>
    executeAiDailyGenerationWork({
      prisma,
      workItemId: claimed.workItem.id,
      leaseToken: claimed.leaseToken,
      providers: buildAiDailyGenerationProvidersFixture(),
      workerId: 'generation-repository-check-first-worker',
      modelIdentifier: 'fixture-provider-suite',
      stopAfterStage: 'COMPOSE',
    }),
  )
  const reclaimAt = new Date()
  await prisma.aiDailyWorkItem.update({
    where: { id: claimed.workItem.id },
    data: { leaseExpiresAt: new Date(reclaimAt.getTime() - 1) },
  })
  const reclaimed = await claimAiDailyWorkItem(prisma, {
    leaseOwner: 'generation-repository-check-second-worker',
    leaseDurationMs: 20 * 60_000,
    runId: run.id,
    kinds: ['EXTRACT_FACTS'],
    now: reclaimAt,
  })
  if (!reclaimed || reclaimed.attemptNumber !== 2) throw new Error('expired generation lease should be reclaimed as attempt 2')
  const staleGenerationKey = `stale-worker-${suffix}`
  await expectFailure(
    () => persistAiDailyGenerationOutcome(prisma, {
      generationKey: staleGenerationKey,
      runId: run.id,
      issueId: issue.id,
      result: createRejectedAiDailyGeneration({ code: 'stale-worker-must-not-project' }),
      evidence: [],
      modelIdentifier: 'fixture-provider-suite',
      createdBy: 'generation-repository-check-stale-worker',
      workItemId: claimed.workItem.id,
      leaseToken: claimed.leaseToken,
      now: reclaimAt,
    }),
    'lease-token-mismatch',
  )
  if (await prisma.aiDailyGeneratedRevision.count({ where: { generationKey: staleGenerationKey } })) {
    throw new Error('expired worker must not create a generated revision')
  }

  await checkProjectionLeaseLock(databaseUrl, suffix)

  const executed = await executeAiDailyGenerationWork({
    prisma,
    workItemId: reclaimed.workItem.id,
    leaseToken: reclaimed.leaseToken,
    providers: buildAiDailyGenerationProvidersFixture(),
    workerId: 'generation-repository-check-second-worker',
    modelIdentifier: 'fixture-provider-suite',
  })
  if (executed.outcome !== 'VALID') throw new Error(`expected VALID generation, received ${executed.outcome}`)
  if (!('resumedStages' in executed) || executed.resumedStages.join(',') !== 'EXTRACT_FACTS,COMPOSE') {
    throw new Error('reclaimed generation work must resume from persisted PostgreSQL checkpoints')
  }

  const checkpoints = await listAiDailyGenerationCheckpoints(prisma, run.id)
  if (checkpoints.map((item) => item.stage).join(',') !== 'EXTRACT_FACTS,COMPOSE,VERIFY,VALIDATE,DRAFT') {
    throw new Error('generation checkpoints must persist in deterministic stage order')
  }
  const checkpointEvents = await prisma.aiDailyRunEvent.findMany({
    where: { runId: run.id, kind: 'generation-checkpoint' },
    orderBy: { sequence: 'asc' },
  })
  if (checkpointEvents.map((item) => item.stage).join(',') !== 'EXTRACT_FACTS,COMPOSE,VERIFY,VALIDATE,DRAFT') {
    throw new Error('generation checkpoint events must be singular and preserve stage order')
  }
  const persistedIssue = await prisma.aiDailyIssue.findUnique({ where: { id: issue.id }, include: { draft: true } })
  if (
    persistedIssue?.workflowState !== 'REVIEW_NEEDED' ||
    persistedIssue.status !== 'REVIEW_NEEDED' ||
    persistedIssue.draft?.visibility !== 'HIDDEN' ||
    persistedIssue.draft.status !== 'REVIEW_NEEDED' ||
    persistedIssue.draft.aiAssistance !== aiDailyGenerationSchemaVersion
  ) {
    throw new Error('valid generation must create the first hidden review-needed draft with current generation provenance')
  }
  const reviewCount = persistedIssue.draftId
    ? await prisma.contentReview.count({ where: { draftId: persistedIssue.draftId, status: 'PENDING' } })
    : 0
  if (reviewCount !== 1) throw new Error('generated draft must enter one pending review cycle')

  const pack = await loadAiDailyGenerationEvidencePack(prisma, issue.id, editionDate)
  const originalDraftId = persistedIssue.draftId
  if (!originalDraftId) throw new Error('valid generation must retain its projected draft id')
  const originalRevision = await prisma.aiDailyGeneratedRevision.findUniqueOrThrow({
    where: { id: executed.projection.revisionId },
    select: { projectionDraftId: true },
  })
  if (originalRevision.projectionDraftId !== originalDraftId) {
    throw new Error('generated revision must retain the exact projected draft id')
  }
  await prisma.aiDailyIssue.update({ where: { id: issue.id }, data: { draftId: null } })
  const replayedProjection = await persistAiDailyGenerationOutcome(prisma, {
    generationKey: executed.generationKey,
    runId: run.id,
    issueId: issue.id,
    result: executed.result,
    evidence: pack.evidence,
    modelIdentifier: 'fixture-provider-suite',
    createdBy: 'generation-repository-check-replay',
  })
  if (!replayedProjection.reused || replayedProjection.draftId !== originalDraftId) {
    throw new Error('projection replay must return the original revision-bound draft id')
  }
  await prisma.aiDailyIssue.update({ where: { id: issue.id }, data: { draftId: originalDraftId } })
  const protectedProjection = await persistAiDailyGenerationOutcome(prisma, {
    generationKey: `protected-${suffix}`,
    runId: run.id,
    issueId: issue.id,
    result: executed.result,
    evidence: pack.evidence,
    modelIdentifier: 'fixture-provider-suite',
    createdBy: 'generation-repository-check',
  })
  if (protectedProjection.draftCreated || protectedProjection.revision.applyState !== 'BLOCKED') {
    throw new Error(`later valid revisions must not overwrite a protected draft: ${JSON.stringify({ draftCreated: protectedProjection.draftCreated, applyState: protectedProjection.revision.applyState, draftId: protectedProjection.draftId })}`)
  }
  const draftCount = await prisma.contentDraft.count({ where: { slug: `ai-daily-${date}` } })
  if (draftCount !== 1) throw new Error('protected draft projection must remain singular')

  const extractionCheckpoint = checkpoints.find((item) => item.stage === 'EXTRACT_FACTS')
  if (!extractionCheckpoint) throw new Error('missing extraction checkpoint')
  const runBeforeReplay = await prisma.aiDailyRun.findUniqueOrThrow({ where: { id: run.id }, select: { eventSequence: true } })
  await saveAiDailyGenerationCheckpoint(prisma, {
    runId: run.id,
    stage: 'EXTRACT_FACTS',
    payload: extractionCheckpoint.payloadJson as never,
    schemaVersion: extractionCheckpoint.schemaVersion,
  })
  const [runAfterReplay, checkpointEventCountAfterReplay] = await Promise.all([
    prisma.aiDailyRun.findUniqueOrThrow({ where: { id: run.id }, select: { eventSequence: true } }),
    prisma.aiDailyRunEvent.count({ where: { runId: run.id, kind: 'generation-checkpoint' } }),
  ])
  if (
    runAfterReplay.eventSequence !== runBeforeReplay.eventSequence ||
    checkpointEventCountAfterReplay !== checkpointEvents.length
  ) {
    throw new Error('idempotent checkpoint replay must not append another run event')
  }
  await expectFailure(
    () => saveAiDailyGenerationCheckpoint(prisma, { runId: run.id, stage: 'EXTRACT_FACTS', payload: { conflict: true } }),
    'ai-daily-checkpoint-conflict',
  )

  await verifyConcurrentCheckpointIdempotency(suffix)
  await verifyEvidenceGapDoesNotCreateDraft(suffix)

  console.log(`AI Daily generation repository check passed against disposable database ${database}`)
}

async function verifyConcurrentCheckpointIdempotency(suffix: string) {
  const editionDate = new Date(Date.UTC(2170, 0, 1) + randomInt(0, 3_000) * 86_400_000)
  const issue = await prisma.aiDailyIssue.create({
    data: {
      date: editionDate.toISOString().slice(0, 10),
      editionDate,
      title: `AI Daily concurrent checkpoint ${suffix}`,
      sourceIdsJson: [],
    },
  })
  const { run } = await createOrResumeAiDailyGenerationRun(prisma, {
    issueId: issue.id,
    trigger: 'MANUAL',
    profile: 'FIXTURE',
    configVersion: 'generation-repository-check-v1',
  })
  const payload = { fixture: `concurrent-${suffix}` }
  const [first, second] = await Promise.all([
    saveAiDailyGenerationCheckpoint(prisma, { runId: run.id, stage: 'EXTRACT_FACTS', payload }),
    saveAiDailyGenerationCheckpoint(prisma, { runId: run.id, stage: 'EXTRACT_FACTS', payload }),
  ])
  const [checkpointCount, events, persistedRun] = await Promise.all([
    prisma.aiDailyGenerationCheckpoint.count({ where: { runId: run.id, stage: 'EXTRACT_FACTS' } }),
    prisma.aiDailyRunEvent.findMany({ where: { runId: run.id, kind: 'generation-checkpoint' } }),
    prisma.aiDailyRun.findUniqueOrThrow({ where: { id: run.id }, select: { eventSequence: true, currentStage: true } }),
  ])
  if (
    first.id !== second.id ||
    checkpointCount !== 1 ||
    events.length !== 1 ||
    persistedRun.eventSequence !== 1 ||
    persistedRun.currentStage !== 'EXTRACT_FACTS'
  ) {
    throw new Error('concurrent checkpoint creation must persist one checkpoint and one run event')
  }
}

async function verifyEvidenceGapDoesNotCreateDraft(suffix: string) {
  const editionDate = new Date(Date.UTC(2150, 0, 1) + randomInt(0, 3_000) * 86_400_000)
  const issue = await prisma.aiDailyIssue.create({
    data: {
      date: editionDate.toISOString().slice(0, 10),
      editionDate,
      title: `AI Daily evidence gap ${suffix}`,
      sourceIdsJson: [],
    },
  })
  const queued = await queueAiDailyGenerationWork(prisma, {
    issueId: issue.id,
    trigger: 'MANUAL',
    profile: 'FIXTURE',
    configVersion: 'generation-repository-check-v1',
  })
  const claimed = await claimAiDailyWorkItem(prisma, {
    leaseOwner: 'generation-repository-check-gap-worker',
    leaseDurationMs: 20 * 60_000,
    runId: queued.run.id,
    kinds: ['EXTRACT_FACTS'],
  })
  if (!claimed) throw new Error('evidence gap work should be claimable')
  const result = await executeAiDailyGenerationWork({
    prisma,
    workItemId: claimed.workItem.id,
    leaseToken: claimed.leaseToken,
    providers: buildAiDailyGenerationProvidersFixture(),
    workerId: 'generation-repository-check-gap-worker',
    modelIdentifier: 'fixture-provider-suite',
  })
  if (result.outcome !== 'NEEDS_MORE_EVIDENCE') throw new Error('evidence minimum failure must complete with gaps')
  const [persistedIssue, revisionCount] = await Promise.all([
    prisma.aiDailyIssue.findUnique({ where: { id: issue.id } }),
    prisma.aiDailyGeneratedRevision.count({ where: { issueId: issue.id } }),
  ])
  if (
    persistedIssue?.status !== 'NEEDS_MORE_EVIDENCE' ||
    persistedIssue.workflowState !== 'NEEDS_MORE_EVIDENCE' ||
    persistedIssue.draftId ||
    revisionCount !== 0
  ) {
    throw new Error('hard evidence failure must not create a revision or draft')
  }
}

function randomFixtureDate() {
  const start = Date.UTC(2120, 0, 1)
  return new Date(start + randomInt(0, 3_000) * 86_400_000)
}

async function checkProjectionLeaseLock(connectionString: string, suffix: string) {
  const issueDate = randomFixtureDate()
  const issue = await prisma.aiDailyIssue.create({
    data: {
      date: issueDate.toISOString().slice(0, 10),
      editionDate: issueDate,
      title: `AI Daily lease fencing fixture ${suffix}`,
      sourceIdsJson: [],
      selectionVersion: 1,
      selectedEvidenceVersion: 1,
      workflowState: 'EVIDENCE_READY',
    },
  })
  const run = await createOrResumeAiDailyGenerationRun(prisma, {
    issueId: issue.id,
    trigger: 'MANUAL',
    profile: 'FIXTURE',
    configVersion: 'generation-lease-lock-check-v1',
  })
  const queued = await queueAiDailyGenerationWork(prisma, {
    issueId: issue.id,
    trigger: 'MANUAL',
    profile: 'FIXTURE',
    configVersion: 'generation-lease-lock-check-v1',
    deadlineAt: new Date(Date.now() + 60_000),
  })
  if (queued.run.id !== run.run.id) throw new Error('lease fencing fixture must reuse its generation run')
  const claimed = await claimAiDailyWorkItem(prisma, {
    leaseOwner: 'generation-lease-lock-stale-worker',
    leaseDurationMs: 60_000,
    runId: run.run.id,
    kinds: ['EXTRACT_FACTS'],
  })
  if (!claimed || !claimed.workItem.leaseExpiresAt) throw new Error('lease fencing fixture should be claimable')

  const blockerName = `biau_ai_daily_blocker_${suffix}`
  const staleName = `biau_ai_daily_stale_${suffix}`
  const reclaimerName = `biau_ai_daily_reclaimer_${suffix}`
  const blocker = createNamedPrisma(connectionString, blockerName)
  const stale = createNamedPrisma(connectionString, staleName)
  const reclaimer = createNamedPrisma(connectionString, reclaimerName)
  let releaseBlocker: (() => void) | undefined
  let blockerTransaction: Promise<unknown> | undefined
  let persistPromise: Promise<Awaited<ReturnType<typeof persistAiDailyGenerationOutcome>>> | undefined
  let reclaimPromise: Promise<Awaited<ReturnType<typeof claimAiDailyWorkItem>>> | undefined

  try {
    const blockerReady = new Promise<void>((resolve, reject) => {
      blockerTransaction = blocker.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "AiDailyIssue" WHERE "id" = ${issue.id} FOR UPDATE`
        resolve()
        await new Promise<void>((release) => {
          releaseBlocker = release
        })
      })
      void blockerTransaction.catch(reject)
    })
    await blockerReady

    persistPromise = persistAiDailyGenerationOutcome(stale, {
      generationKey: `lease-lock-${suffix}`,
      runId: run.run.id,
      issueId: issue.id,
      result: createRejectedAiDailyGeneration({ code: 'lease-lock-fixture' }),
      evidence: [],
      modelIdentifier: 'fixture-provider-suite',
      createdBy: 'generation-lease-lock-stale-worker',
      workItemId: claimed.workItem.id,
      leaseToken: claimed.leaseToken,
      now: new Date(),
    })
    await waitForPostgresLock(stale, staleName)

    const reclaimAt = new Date(claimed.workItem.leaseExpiresAt.getTime() + 1)
    reclaimPromise = claimAiDailyWorkItem(reclaimer, {
      leaseOwner: 'generation-lease-lock-reclaimer',
      leaseDurationMs: 60_000,
      runId: run.run.id,
      kinds: ['EXTRACT_FACTS'],
      now: reclaimAt,
    })
    const earlyOutcome = await Promise.race([
      reclaimPromise.then(() => 'settled', () => 'settled'),
      delay(250).then(() => 'pending'),
    ])
    if (earlyOutcome !== 'pending') {
      throw new Error('lease reclaim must wait for an in-flight projection transaction')
    }
    releaseBlocker?.()
    await blockerTransaction
    const [projection, reclaimed] = await Promise.all([persistPromise, reclaimPromise])
    if (projection.reused || projection.revision.validationStatus !== 'REJECTED') {
      throw new Error('lease fencing fixture should persist exactly one stale-worker rejection projection')
    }
    if (!reclaimed || reclaimed.attemptNumber !== 2) {
      throw new Error('lease reclaim should proceed only after the projection transaction releases its row lock')
    }
  } finally {
    releaseBlocker?.()
    await blockerTransaction?.catch(() => undefined)
    await persistPromise?.catch(() => undefined)
    await reclaimPromise?.catch(() => undefined)
    await Promise.all([blocker.$disconnect(), stale.$disconnect(), reclaimer.$disconnect()])
  }
}

function createNamedPrisma(connectionString: string, applicationName: string) {
  const url = new URL(connectionString)
  url.searchParams.set('application_name', applicationName)
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) })
}

async function waitForPostgresLock(client: PrismaClient, applicationName: string) {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    const [row] = await client.$queryRaw<Array<{ waiting: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE application_name = ${applicationName}
          AND wait_event_type = 'Lock'
      ) AS waiting
    `
    if (row?.waiting) return
    await delay(25)
  }
  throw new Error('stale projection did not reach the issue-row lock barrier')
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function readDisposableDatabase(value: string) {
  if (process.env.AI_DAILY_DATABASE_CHECK !== '1') throw new Error('ai-daily-database-check-not-enabled')
  if (!value) throw new Error('database-url-not-configured')
  const url = new URL(value)
  const databaseName = url.pathname.replace(/^\//u, '')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !databaseName.endsWith('_test')) {
    throw new Error('ai-daily-generation-repository-check-requires-local-test-database')
  }
  return databaseName
}

async function expectFailure(action: () => Promise<unknown>, expected: string) {
  try {
    await action()
  } catch (error) {
    if (error instanceof Error && error.message.includes(expected)) return
    throw error
  }
  throw new Error(`expected failure containing ${expected}`)
}

async function expectInterruption(action: () => Promise<unknown>) {
  try {
    await action()
  } catch (error) {
    if (error instanceof AiDailyGenerationRunnerInterruptedError && error.stage === 'COMPOSE') return
    throw error
  }
  throw new Error('expected generation interruption after COMPOSE')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
