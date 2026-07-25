import { randomUUID } from 'node:crypto'
import { Prisma, type AiDailyProfile, type AiDailyRunTrigger, type PrismaClient } from '@prisma/client'
import { formatAiDailyApplicationDate } from './aiDailyScheduling.js'
import {
  AiDailyAdapterError,
  buildAiDailyCollectionWindow,
  calculateAiDailyTier1DiscoveryLags,
  isAiDailyPublicationInsideWindow,
  normalizeAiDailyCandidateLead,
  runAiDailyDiscovery,
  type AiDailyCandidateLead,
  type AiDailyEvidenceCandidate,
  type AiDailyIngestionErrorCategory,
  type AiDailySourceFeedDefinition,
} from './aiDailyIngestion.js'
import { createAiDailyDiscoveryRuntime, type AiDailyDiscoveryRuntime } from './aiDailyDiscoveryProviders.js'
import {
  applyAiDailyEvidenceSelection,
  createAiDailyEvidenceDocument,
  listDueAiDailySourceFeeds,
  persistAiDailyClusters,
  persistAiDailyDedupe,
  recordAiDailyCandidateFetchFailure,
  recordAiDailySourceCollectionOutcome,
  toAiDailySourceFeedDefinition,
  updateAiDailyRunFreshness,
  upsertAiDailyCandidate,
} from './aiDailyIngestionRepository.js'
import {
  aiDailyIngestionDeadlineWindowMs,
  prepareAiDailyEvidenceSelection,
} from './aiDailyIngestionService.js'
import { collectAiDailySourcePayload } from './aiDailySourceAdapters.js'
import {
  AiDailyFetchError,
  fetchAiDailyEvidence,
  fetchAiDailySourcePayload,
} from './aiDailySafeFetch.js'
import {
  appendAiDailyRunEvent,
  claimAiDailyWorkItem,
  completeAiDailyGenerationRun,
  completeAiDailyWorkItem,
  getOrCreateAiDailyEdition,
  recordAiDailyEvidenceGap,
  transitionAiDailyEditorialState,
  upsertAiDailyWorkItem,
} from './aiDailyRepository.js'
import { syncAiDailySourceManifest } from './aiDailySourceManifestRepository.js'
import { loadAiDailySourceManifest, type AiDailyCuratedQueryGroup } from './aiDailySourceManifest.js'
import { env } from './env.js'

export const aiDailyIngestionConfigVersion = 'ai-daily-ingestion-runner-v3'

const ingestionLeaseMs = 12 * 60_000
const ingestionRetryDelayMs = 5 * 60_000
// Keep evidence fetch work bounded while retaining enough breadth for the
// deterministic selection floor. Date-bearing entries are prioritized below;
// undated leads remain available for inspection but must not consume the whole
// per-feed request budget.
const maxCandidatesPerFeed = 4
const maxCandidatesPerDiscovery = 12
const discoveryWindowMs = 36 * 60 * 60_000
const discoveryScheduleBucketMs = 6 * 60 * 60_000
export const aiDailyDiscoveryDeadlineMs = 45 * 60_000

class AiDailyIngestionDeadlineError extends AiDailyAdapterError {
  constructor() {
    super('timeout')
    this.name = 'AiDailyIngestionDeadlineError'
  }
}

export async function queueAiDailyIngestionRefresh(
  prisma: PrismaClient,
  input: {
    now?: Date
    timeZone?: string
    trigger?: AiDailyRunTrigger
  } = {},
) {
  const now = input.now ?? new Date()
  const editionDate = formatAiDailyApplicationDate(now, input.timeZone)
  const manifest = await syncAiDailySourceManifest(prisma)
  const issue = await getOrCreateAiDailyEdition(prisma, {
    date: editionDate,
    title: `AI Daily · ${editionDate}`,
  })
  const run = await createOrResumeAiDailyIngestionRun(prisma, {
    issueId: issue.id,
    editionDate,
    trigger: input.trigger ?? 'MANUAL',
    now,
  })
  const discoveryRuntime = createAiDailyDiscoveryRuntime({
    theNewsApiEnabled: env.aiDailyTheNewsApiEnabled,
    theNewsApiToken: env.aiDailyTheNewsApiToken,
    hotDailyEnabled: env.aiDailyHotDailyEnabled,
  })
  const dueFeeds = await listDueAiDailySourceFeeds(prisma, now, 50)
  for (const row of dueFeeds) {
    const feed = toAiDailySourceFeedDefinition(row)
    const window = buildAiDailyCollectionWindow(feed, now)
    await upsertAiDailyWorkItem(prisma, {
      editionDate,
      kind: 'COLLECT_FEED',
      scope: `source-feed:${row.id}:run:${run.attemptNumber}`,
      runId: run.id,
      sourceFeedId: row.id,
      priority: row.tier === 'TIER_1' ? 100 : row.tier === 'TIER_2' ? 70 : 50,
      availableAt: now,
      deadlineAt: new Date(now.getTime() + aiDailyIngestionDeadlineWindowMs(row.intervalMinutes)),
      freshnessTargetAt: window.nextCollectAt,
      continuationCursorJson: {
        windowStart: window.windowStart.toISOString(),
        windowEnd: window.windowEnd.toISOString(),
      },
    })
  }
  let queuedDiscoveries = 0
  const discoveryBucket = Math.floor(now.getTime() / discoveryScheduleBucketMs)
  for (const group of manifest.queryGroups) {
    const item = await upsertAiDailyWorkItem(prisma, {
      editionDate,
      kind: 'DISCOVER',
      scope: `query-group:${group.id}:window:${discoveryBucket}:config:${aiDailyIngestionConfigVersion}`,
      runId: run.id,
      priority: 60,
      availableAt: now,
      deadlineAt: new Date(now.getTime() + aiDailyDiscoveryDeadlineMs),
      freshnessTargetAt: new Date(now.getTime() + discoveryScheduleBucketMs),
      continuationCursorJson: {
        queryGroupId: group.id,
        windowStart: new Date(now.getTime() - discoveryWindowMs).toISOString(),
        windowEnd: now.toISOString(),
      },
    })
    if (item.runId === run.id && item.status === 'PENDING') queuedDiscoveries += 1
  }
  await appendAiDailyRunEvent(prisma, {
    runId: run.id,
    stage: 'COLLECT',
    kind: 'ingestion-refresh-queued',
    outcome: 'accepted',
    metadataJson: {
      dueFeeds: dueFeeds.length,
      queuedDiscoveries,
      manifestSources: manifest.sourceCount,
      enabledSources: manifest.enabledSourceCount,
      discoveryDiagnostics: discoveryRuntime.diagnostics,
    },
  })
  return {
    issueId: issue.id,
    editionDate,
    runId: run.id,
    queuedFeeds: dueFeeds.length,
    queuedDiscoveries,
    manifest: {
      schemaVersion: manifest.schemaVersion,
      sources: manifest.sourceCount,
      enabledSources: manifest.enabledSourceCount,
      created: manifest.created,
      updated: manifest.updated,
    },
  }
}

export async function drainAiDailyIngestionWork(
  prisma: PrismaClient,
  input: { runId?: string; limit?: number; workerId?: string } = {},
) {
  const workerId = input.workerId ?? `ai-daily-ingestion-${randomUUID().slice(0, 8)}`
  const limit = Math.max(1, Math.min(input.limit ?? 16, 50))
  let processed = 0
  let succeeded = 0
  let failed = 0
  const runIds = new Set<string>()
  const discoveryRuntime = createAiDailyDiscoveryRuntime({
    theNewsApiEnabled: env.aiDailyTheNewsApiEnabled,
    theNewsApiToken: env.aiDailyTheNewsApiToken,
    hotDailyEnabled: env.aiDailyHotDailyEnabled,
  })

  for (; processed < limit; processed += 1) {
    const claimed = await claimAiDailyWorkItem(prisma, {
      leaseOwner: workerId,
      leaseDurationMs: ingestionLeaseMs,
      runId: input.runId,
      kinds: ['COLLECT_FEED', 'DISCOVER'],
      profiles: ['DEGRADED'],
    })
    if (!claimed) break
    if (claimed.workItem.runId) runIds.add(claimed.workItem.runId)
    const result = claimed.workItem.kind === 'DISCOVER'
      ? await executeAiDailyDiscoveryWork(prisma, {
          workItemId: claimed.workItem.id,
          leaseToken: claimed.leaseToken,
          workerId,
          runtime: discoveryRuntime,
        })
      : await executeAiDailyCollectionWork(prisma, {
          workItemId: claimed.workItem.id,
          leaseToken: claimed.leaseToken,
          workerId,
        })
    if (result === 'succeeded') succeeded += 1
    else failed += 1
  }

  const finalizations = []
  for (const runId of runIds) {
    finalizations.push({ runId, result: await finalizeAiDailyIngestionRunIfIdle(prisma, runId) })
  }
  return {
    processed,
    succeeded,
    failed,
    runId: input.runId ?? finalizations.at(-1)?.runId ?? null,
    finalization: finalizations.at(-1)?.result ?? null,
    finalizations,
  }
}

async function executeAiDailyCollectionWork(
  prisma: PrismaClient,
  input: { workItemId: string; leaseToken: string; workerId: string },
) {
  const workItem = await prisma.aiDailyWorkItem.findUnique({
    where: { id: input.workItemId },
    include: { sourceFeed: true },
  })
  if (!workItem?.runId || !workItem.sourceFeedId || !workItem.sourceFeed) {
    await completeAiDailyWorkItem(prisma, {
      workItemId: input.workItemId,
      leaseToken: input.leaseToken,
      result: 'failed',
      errorCategory: 'schema_invalid',
    })
    return 'failed' as const
  }

  const now = new Date()
  const feed = toAiDailySourceFeedDefinition(workItem.sourceFeed)
  const window = buildAiDailyCollectionWindow(feed, now)
  try {
    assertIngestionDeadline(workItem.deadlineAt, now)
    const payload = await fetchAiDailySourcePayload({
      url: feed.url,
      conditionalHeaders: window.conditionalHeaders,
    })
    const normalizedCandidates = payload.notModified
      ? []
      : collectAiDailySourcePayload({ feed, payload: payload.text, window })
          .map(normalizeAiDailyCandidateLead)
          .filter((result) => result.ok)
          .map((result) => result.candidate)
          .sort(compareCandidateFetchPriority)
          .slice(0, maxCandidatesPerFeed)

    const { readyEvidence, thinEvidence, fetchFailures } = await fetchAndPersistAiDailyCandidates(prisma, {
      runId: workItem.runId,
      sourceFeedId: workItem.sourceFeedId,
      discoveryQueryGroup: null,
      candidates: normalizedCandidates,
      now,
      deadlineAt: workItem.deadlineAt,
      publicationWindow: { windowStart: window.windowStart, windowEnd: window.windowEnd },
    })

    assertIngestionDeadline(workItem.deadlineAt, new Date())

    const newestPublishedAt = newestDate(normalizedCandidates.map((candidate) => candidate.publishedAt))
    await recordAiDailySourceCollectionOutcome(prisma, {
      sourceFeedId: feed.id as string,
      outcome: {
        success: true,
        attemptedAt: now,
        collectedAt: now,
        newestPublishedAt,
        etag: payload.etag,
        lastModified: payload.lastModified,
      },
    })
    await updateAiDailyIngestionRunCheckpoint(prisma, {
      runId: workItem.runId,
      feed,
      now,
      newestPublishedAt,
      candidateCount: normalizedCandidates.length,
      evidenceCount: readyEvidence + thinEvidence,
    })
    await appendAiDailyRunEvent(prisma, {
      runId: workItem.runId,
      stage: readyEvidence + thinEvidence > 0 ? 'FETCH' : 'COLLECT',
      kind: 'source-feed-collected',
      outcome: fetchFailures > 0 ? 'completed-with-gaps' : 'succeeded',
      metadataJson: {
        sourceFeedId: feed.id,
        candidates: normalizedCandidates.length,
        readyEvidence,
        thinEvidence,
        fetchFailures,
        notModified: payload.notModified,
      },
    })
    await completeAiDailyWorkItem(prisma, {
      workItemId: workItem.id,
      leaseToken: input.leaseToken,
      result: 'succeeded',
      metadataJson: {
        worker: 'studio-ingestion',
        candidates: normalizedCandidates.length,
        readyEvidence,
        thinEvidence,
        fetchFailures,
      },
    })
    return 'succeeded' as const
  } catch (error) {
    const category = classifyAiDailyIngestionError(error)
    await recordAiDailySourceCollectionOutcome(prisma, {
      sourceFeedId: feed.id as string,
      outcome: { success: false, attemptedAt: now, errorCategory: category },
    })
    await appendAiDailyRunEvent(prisma, {
      runId: workItem.runId,
      stage: 'COLLECT',
      kind: 'source-feed-collected',
      outcome: 'failed',
      errorCategory: category,
      metadataJson: { sourceFeedId: feed.id },
    })
    const retryable = !(error instanceof AiDailyIngestionDeadlineError) && isRetryableIngestionCategory(category)
    await completeAiDailyWorkItem(prisma, {
      workItemId: workItem.id,
      leaseToken: input.leaseToken,
      result: retryable ? 'retryable-failed' : 'failed',
      retryAt: retryable ? new Date(now.getTime() + ingestionRetryDelayMs) : undefined,
      errorCategory: category,
      metadataJson: { worker: 'studio-ingestion' },
    })
    return 'failed' as const
  }
}

async function executeAiDailyDiscoveryWork(
  prisma: PrismaClient,
  input: {
    workItemId: string
    leaseToken: string
    workerId: string
    runtime: AiDailyDiscoveryRuntime
  },
) {
  const workItem = await prisma.aiDailyWorkItem.findUnique({ where: { id: input.workItemId } })
  if (!workItem?.runId) {
    await completeAiDailyWorkItem(prisma, {
      workItemId: input.workItemId,
      leaseToken: input.leaseToken,
      result: 'failed',
      errorCategory: 'schema_invalid',
    })
    return 'failed' as const
  }

  const now = new Date()
  try {
    assertIngestionDeadline(workItem.deadlineAt, now)
    const manifest = await loadAiDailySourceManifest()
    const cursor = readDiscoveryCursor(workItem.continuationCursorJson)
    const group = manifest.queryGroups.find((entry) => entry.enabled && entry.id === cursor.queryGroupId)
    if (!group) throw new AiDailyAdapterError('schema_invalid')
    const request = buildDiscoveryRequest(group, cursor)
    const discovery = await runAiDailyDiscovery({
      request,
      primary: input.runtime.primary,
      fallback: input.runtime.fallback,
      signals: input.runtime.signals,
      minimumPrimaryResults: group.minimumPrimaryResults,
      includeSignal: group.includeSignal,
    })
    if (
      discovery.candidates.length === 0 &&
      discovery.attempts.length > 0 &&
      discovery.attempts.every((attempt) => attempt.outcome === 'failed')
    ) {
      throw new AiDailyAdapterError(discovery.attempts[0]?.errorCategory ?? 'invalid_response')
    }

    const candidates = selectAiDailyDiscoveryCandidates(discovery.candidates, maxCandidatesPerDiscovery)
    const { readyEvidence, thinEvidence, fetchFailures } = await fetchAndPersistAiDailyCandidates(prisma, {
      runId: workItem.runId,
      sourceFeedId: null,
      discoveryQueryGroup: group.id,
      candidates,
      now,
      deadlineAt: workItem.deadlineAt,
      publicationWindow: { windowStart: request.windowStart, windowEnd: request.windowEnd },
    })
    await prisma.aiDailyRun.update({
      where: { id: workItem.runId },
      data: {
        lastDiscoveredAt: now,
        ...(readyEvidence + thinEvidence > 0 ? { lastFetchedAt: now } : {}),
      },
    })
    const hasGaps = discovery.gaps.length > 0 || fetchFailures > 0 || input.runtime.diagnostics.length > 0
    await appendAiDailyRunEvent(prisma, {
      runId: workItem.runId,
      stage: readyEvidence + thinEvidence > 0 ? 'FETCH' : 'DISCOVER',
      kind: 'discovery-completed',
      outcome: hasGaps ? 'completed-with-gaps' : 'succeeded',
      metadataJson: {
        queryGroupId: group.id,
        candidates: candidates.length,
        readyEvidence,
        thinEvidence,
        fetchFailures,
        redundancy: discovery.redundancy,
        gaps: [...discovery.gaps, ...input.runtime.diagnostics].slice(0, 12),
        attempts: discovery.attempts.map((attempt) => ({
          providerId: attempt.providerId,
          slot: attempt.slot,
          outcome: attempt.outcome,
          candidateCount: attempt.candidateCount,
          errorCategory: attempt.errorCategory,
        })),
      },
    })
    await completeAiDailyWorkItem(prisma, {
      workItemId: workItem.id,
      leaseToken: input.leaseToken,
      result: 'succeeded',
      metadataJson: {
        worker: 'studio-ingestion',
        queryGroupId: group.id,
        candidates: candidates.length,
        readyEvidence,
        thinEvidence,
        fetchFailures,
      },
    })
    return 'succeeded' as const
  } catch (error) {
    const category = classifyAiDailyIngestionError(error)
    await appendAiDailyRunEvent(prisma, {
      runId: workItem.runId,
      stage: 'DISCOVER',
      kind: 'discovery-completed',
      outcome: 'failed',
      errorCategory: category,
      metadataJson: {},
    })
    const retryable = !(error instanceof AiDailyIngestionDeadlineError) && isRetryableIngestionCategory(category)
    await completeAiDailyWorkItem(prisma, {
      workItemId: workItem.id,
      leaseToken: input.leaseToken,
      result: retryable ? 'retryable-failed' : 'failed',
      retryAt: retryable ? new Date(now.getTime() + ingestionRetryDelayMs) : undefined,
      errorCategory: category,
      metadataJson: { worker: 'studio-ingestion' },
    })
    return 'failed' as const
  }
}

async function fetchAndPersistAiDailyCandidates(
  prisma: PrismaClient,
  input: {
    runId: string
    sourceFeedId: string | null
    discoveryQueryGroup: string | null
    candidates: AiDailyCandidateLead[]
    now: Date
    deadlineAt: Date | null
    publicationWindow: { windowStart: Date; windowEnd: Date }
  },
) {
  let readyEvidence = 0
  let thinEvidence = 0
  let fetchFailures = 0
  for (const candidate of input.candidates) {
    assertIngestionDeadline(input.deadlineAt, new Date())
    const row = await upsertAiDailyCandidate(prisma, {
      runId: input.runId,
      sourceFeedId: input.sourceFeedId,
      discoveryQueryGroup: input.discoveryQueryGroup,
      candidate,
    })
    try {
      const evidence = await fetchAiDailyEvidence({
        url: candidate.originalUrl,
        now: input.now,
        locale: candidate.locale,
      })
      await createAiDailyEvidenceDocument(prisma, {
        candidateId: row.id,
        evidence,
        promoteLead: isAiDailyPublicationInsideWindow(evidence.publishedAt, input.publicationWindow),
      })
      if (evidence.status === 'READY') readyEvidence += 1
      else thinEvidence += 1
    } catch (error) {
      fetchFailures += 1
      const category = classifyAiDailyIngestionError(error)
      await recordAiDailyCandidateFetchFailure(prisma, {
        candidateId: row.id,
        category,
        blocked: category === 'unsafe_url' || category === 'robots_disallowed',
      })
    }
  }
  return { readyEvidence, thinEvidence, fetchFailures }
}

function readDiscoveryCursor(value: Prisma.JsonValue | null) {
  const record = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Prisma.JsonObject
    : {}
  const queryGroupId = typeof record.queryGroupId === 'string' ? record.queryGroupId : ''
  const windowStart = typeof record.windowStart === 'string' ? new Date(record.windowStart) : new Date(Number.NaN)
  const windowEnd = typeof record.windowEnd === 'string' ? new Date(record.windowEnd) : new Date(Number.NaN)
  if (!queryGroupId || Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime()) || windowStart >= windowEnd) {
    throw new AiDailyAdapterError('schema_invalid')
  }
  return { queryGroupId, windowStart, windowEnd }
}

function buildDiscoveryRequest(group: AiDailyCuratedQueryGroup, cursor: ReturnType<typeof readDiscoveryCursor>) {
  return {
    queryGroup: group.id,
    queries: group.queries,
    windowStart: cursor.windowStart,
    windowEnd: cursor.windowEnd,
    locale: group.locale,
    includeDomains: group.includeDomains,
    excludeDomains: group.excludeDomains,
    budget: group.budget,
  }
}

function assertIngestionDeadline(deadlineAt: Date | null, now: Date) {
  if (deadlineAt && deadlineAt.getTime() <= now.getTime()) throw new AiDailyIngestionDeadlineError()
}

async function finalizeAiDailyIngestionRunIfIdle(prisma: PrismaClient, runId: string) {
  const remaining = await prisma.aiDailyWorkItem.count({
    where: { runId, kind: { in: ['COLLECT_FEED', 'DISCOVER'] }, status: { in: ['PENDING', 'LEASED', 'RETRY_WAIT'] } },
  })
  if (remaining > 0) return { status: 'waiting' as const, remaining }

  const run = await prisma.aiDailyRun.findUnique({
    where: { id: runId },
    include: {
      issue: { select: { id: true, workflowState: true, selectionVersion: true, draftId: true } },
      candidates: { include: { currentEvidence: true, sourceFeed: true } },
    },
  })
  if (!run || !run.issueId || !run.issue) return { status: 'missing-run' as const, remaining: 0 }
  if (!['QUEUED', 'RUNNING'].includes(run.status)) return { status: 'already-terminal' as const, remaining: 0 }

  const candidates = run.candidates
    .map(toAiDailyEvidenceCandidate)
    .filter((candidate): candidate is AiDailyEvidenceCandidate => candidate !== null)
  const fetchedAt = run.candidates
    .map((candidate) => candidate.currentEvidence?.fetchedAt ?? null)
    .filter((value): value is Date => value !== null)
  const newestPublishedAt = newestDate(candidates.map((candidate) => candidate.publishedAt))
  const freshness = {
    now: new Date(),
    lastTier1CollectedAt: run.lastTier1CollectedAt,
    lastDiscoveredAt: run.lastDiscoveredAt,
    lastFetchedAt: run.lastFetchedAt,
    newestPublishedAt,
    selectedEvidenceFetchedAt: fetchedAt,
    tier1DiscoveryLagsMs: calculateAiDailyTier1DiscoveryLags(candidates, run.startedAt),
  }
  const qualified = prepareAiDailyEvidenceSelection({ candidates, freshness })
  await persistAiDailyDedupe(prisma, { runId, candidates: qualified.deduped })
  await persistAiDailyClusters(prisma, { runId, clusters: qualified.ranked })
  await updateAiDailyRunFreshness(prisma, {
    runId,
    checkpoints: {
      newestPublishedAt,
      lastTier1CollectedAt: run.lastTier1CollectedAt,
      lastCollectedAt: run.lastCollectedAt,
      lastDiscoveredAt: run.lastDiscoveredAt,
      lastFetchedAt: run.lastFetchedAt,
    },
    freshness: qualified.freshness,
  })

  if (qualified.ready) {
    const selection = await applyAiDailyEvidenceSelection(prisma, {
      runId,
      issueId: run.issueId,
      selected: qualified.selected,
      selectedBy: 'ai-daily-ingestion-runner',
      selectionReason: 'deterministic source authority, freshness, diversity, and evidence readiness gate',
    })
    if (run.issue.workflowState === 'COLLECTING' || run.issue.workflowState === 'NEEDS_MORE_EVIDENCE') {
      await transitionAiDailyEditorialState(prisma, { issueId: run.issueId, next: 'EVIDENCE_READY' })
    } else if (run.issue.draftId || run.issue.workflowState === 'REVIEW_NEEDED' || run.issue.workflowState === 'EXPORTED') {
      await prisma.aiDailyIssue.update({ where: { id: run.issueId }, data: { newEvidenceAvailable: true } })
    }
    await prisma.aiDailyRun.update({ where: { id: runId }, data: { currentStage: 'PROMOTE' } })
    await appendAiDailyRunEvent(prisma, {
      runId,
      stage: 'PROMOTE',
      kind: 'evidence-selection-completed',
      outcome: 'succeeded',
      metadataJson: { selected: qualified.selected.length, selectionVersion: selection.selectionVersion },
    })
    await completeAiDailyGenerationRun(prisma, { runId, status: 'COMPLETED' })
    return { status: 'completed' as const, selected: qualified.selected.length, gaps: [] as string[] }
  }

  if (run.issue.selectionVersion === 0) {
    await recordAiDailyEvidenceGap(prisma, { issueId: run.issueId, gaps: qualified.gaps, runId })
  }
  await prisma.aiDailyRun.update({ where: { id: runId }, data: { currentStage: 'RANK' } })
  await appendAiDailyRunEvent(prisma, {
    runId,
    stage: 'RANK',
    kind: 'evidence-selection-completed',
    outcome: 'completed-with-gaps',
    errorCategory: 'evidence_not_ready',
    metadataJson: { selected: qualified.selected.length, gaps: qualified.gaps.slice(0, 12) },
  })
  await completeAiDailyGenerationRun(prisma, {
    runId,
    status: 'COMPLETED_WITH_GAPS',
    errorCategory: 'evidence_not_ready',
  })
  return { status: 'completed-with-gaps' as const, selected: qualified.selected.length, gaps: qualified.gaps }
}

async function createOrResumeAiDailyIngestionRun(
  prisma: PrismaClient,
  input: { issueId: string; editionDate: string; trigger: AiDailyRunTrigger; now: Date },
) {
  const editionDate = new Date(`${input.editionDate}T00:00:00.000Z`)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`biau-ai-daily-ingestion:${input.editionDate}`}, 0))`
    const active = await tx.aiDailyRun.findFirst({
      where: {
        editionDate,
        profile: 'DEGRADED',
        configVersion: aiDailyIngestionConfigVersion,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
      orderBy: [{ attemptNumber: 'desc' }, { createdAt: 'desc' }],
    })
    if (active) {
      return active.issueId
        ? active
        : tx.aiDailyRun.update({ where: { id: active.id }, data: { issueId: input.issueId, status: 'RUNNING', startedAt: active.startedAt ?? input.now } })
    }
    const latest = await tx.aiDailyRun.aggregate({
      where: { editionDate },
      _max: { attemptNumber: true },
    })
    return tx.aiDailyRun.create({
      data: {
        issueId: input.issueId,
        editionDate,
        profile: 'DEGRADED' satisfies AiDailyProfile,
        trigger: input.trigger,
        attemptNumber: (latest._max.attemptNumber ?? 0) + 1,
        status: 'RUNNING',
        currentStage: 'COLLECT',
        configVersion: aiDailyIngestionConfigVersion,
        startedAt: input.now,
      },
    })
  })
}

async function updateAiDailyIngestionRunCheckpoint(
  prisma: PrismaClient,
  input: {
    runId: string
    feed: AiDailySourceFeedDefinition
    now: Date
    newestPublishedAt: Date | null
    candidateCount: number
    evidenceCount: number
  },
) {
  const run = await prisma.aiDailyRun.findUnique({
    where: { id: input.runId },
    select: { newestPublishedAt: true, lastTier1CollectedAt: true, lastDiscoveredAt: true, lastFetchedAt: true },
  })
  if (!run) throw new Error('ai-daily-run-not-found')
  await prisma.aiDailyRun.update({
    where: { id: input.runId },
    data: {
      currentStage: input.evidenceCount > 0 ? 'FETCH' : 'COLLECT',
      lastCollectedAt: input.now,
      lastTier1CollectedAt: input.feed.tier === 'TIER_1' ? input.now : run.lastTier1CollectedAt,
      lastDiscoveredAt: input.candidateCount > 0 ? input.now : run.lastDiscoveredAt,
      lastFetchedAt: input.evidenceCount > 0 ? input.now : run.lastFetchedAt,
      newestPublishedAt: newestDate([run.newestPublishedAt, input.newestPublishedAt]),
    },
  })
}

function toAiDailyEvidenceCandidate(
  row: Prisma.AiDailyCandidateGetPayload<{ include: { currentEvidence: true; sourceFeed: true } }>,
): AiDailyEvidenceCandidate | null {
  const evidence = row.currentEvidence
  if (!evidence || row.fetchStatus !== 'FETCHED' || !['READY', 'THIN', 'CONFLICTING', 'REJECTED'].includes(row.evidenceStatus)) {
    return null
  }
  const sourceTier = normalizeSourceTier(row.sourceTier)
  const providerRole = normalizeProviderRole(row.providerRole)
  return {
    id: row.id,
    providerKind: row.providerKind,
    providerRole,
    sourceExternalId: row.sourceExternalId,
    observationKey: row.observationKey,
    observedAt: row.observedAt,
    originalUrl: row.originalUrl,
    normalizedUrl: row.normalizedUrl,
    canonicalUrl: row.canonicalUrl,
    canonicalKey: row.canonicalKey,
    title: row.title,
    titleFingerprint: row.titleFingerprint ?? '',
    publisher: row.publisher,
    publisherDomain: row.publisherDomain,
    publishedAt: row.publishedAt,
    locale: row.locale,
    sourceTier,
    topics: row.sourceFeed
      ? readJsonStrings(row.sourceFeed.topicsJson)
      : row.discoveryQueryGroup
        ? [row.discoveryQueryGroup]
        : [],
    leadOnly: row.leadOnly,
    snippet: row.evidenceExcerpt,
    fetchStatus: 'FETCHED',
    evidenceStatus: row.evidenceStatus as AiDailyEvidenceCandidate['evidenceStatus'],
    contentHash: evidence.contentHash,
    evidenceText: evidence.normalizedText,
    evidenceHeadingCount: readJsonStrings(evidence.headingsJson).length,
  }
}

function normalizeProviderRole(value: string): AiDailyEvidenceCandidate['providerRole'] {
  return value === 'primary' || value === 'fallback' || value === 'signal' || value === 'manual' ? value : 'stable'
}

function normalizeSourceTier(value: string): AiDailyEvidenceCandidate['sourceTier'] {
  return value === 'TIER_1' || value === 'TIER_2' ? value : 'TIER_3'
}

function readJsonStrings(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 12) : []
}

function newestDate(values: Array<Date | null | undefined>) {
  return values.reduce<Date | null>((latest, value) => {
    if (!value || Number.isNaN(value.getTime())) return latest
    return !latest || value.getTime() > latest.getTime() ? value : latest
  }, null)
}

function classifyAiDailyIngestionError(error: unknown): AiDailyIngestionErrorCategory {
  if (error instanceof AiDailyFetchError || error instanceof AiDailyAdapterError) return error.category
  const message = error instanceof Error ? error.message : ''
  if (message.includes('schema') || message.includes('source-feed')) return 'schema_invalid'
  return 'invalid_response'
}

function isRetryableIngestionCategory(category: AiDailyIngestionErrorCategory) {
  return ['rate_limited', 'timeout', 'network_error', 'render_required', 'fetch_empty', 'invalid_response'].includes(category)
}

function compareCandidateFetchPriority(
  left: { leadOnly: boolean; publishedAt: Date | null; canonicalKey: string },
  right: { leadOnly: boolean; publishedAt: Date | null; canonicalKey: string },
) {
  if (left.leadOnly !== right.leadOnly) return left.leadOnly ? 1 : -1
  const leftPublishedAt = left.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY
  const rightPublishedAt = right.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY
  if (leftPublishedAt !== rightPublishedAt) return rightPublishedAt - leftPublishedAt
  return left.canonicalKey < right.canonicalKey ? -1 : left.canonicalKey > right.canonicalKey ? 1 : 0
}

export function selectAiDailyDiscoveryCandidates(candidates: AiDailyCandidateLead[], limit: number) {
  const boundedLimit = Math.max(0, Math.floor(limit))
  if (boundedLimit === 0) return []
  const ordered = [...candidates].sort(compareCandidateFetchPriority)
  const selected: AiDailyCandidateLead[] = []
  const selectedIds = new Set<string>()
  const representedProviders = new Set<string>()

  for (const candidate of ordered) {
    if (representedProviders.has(candidate.providerKind)) continue
    selected.push(candidate)
    selectedIds.add(candidate.id)
    representedProviders.add(candidate.providerKind)
    if (selected.length >= boundedLimit) return selected
  }
  for (const candidate of ordered) {
    if (selectedIds.has(candidate.id)) continue
    selected.push(candidate)
    if (selected.length >= boundedLimit) break
  }
  return selected
}
