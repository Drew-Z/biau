import {
  Prisma,
  type AiDailyCandidateFetchStatus,
  type AiDailyCandidateEvidenceStatus,
  type PrismaClient,
} from '@prisma/client'
import {
  replaceAiDailyIssueSelectionInTransaction,
  upsertAiDailyCanonicalSource,
} from './aiDailyRepository.js'
import { canonicalizeAiDailySourceUrl } from './aiDailyDomain.js'
import {
  type AiDailyCandidateLead,
  type AiDailyDedupedCandidate,
  type AiDailyFreshnessResult,
  type AiDailyIngestionErrorCategory,
  type AiDailyRankedCluster,
  type AiDailySourceCollectionOutcome,
  type AiDailySourceFeedDefinition,
  normalizeAiDailySourceFeedDefinition,
  projectAiDailySourceHealth,
} from './aiDailyIngestion.js'
import type { AiDailyEvidenceDocumentInput } from './aiDailySafeFetch.js'

type AiDailyIngestionClient = PrismaClient | Prisma.TransactionClient

export async function upsertAiDailySourceFeed(
  prisma: AiDailyIngestionClient,
  input: Parameters<typeof normalizeAiDailySourceFeedDefinition>[0],
) {
  const normalized = normalizeAiDailySourceFeedDefinition(input)
  if (!normalized.ok) throw new Error(`${normalized.error}:${normalized.issues.join(',')}`)
  const feed = normalized.feed
  return prisma.aiDailySourceFeed.upsert({
    where: { kind_canonicalKey: { kind: feed.kind, canonicalKey: feed.canonicalKey } },
    update: {
      name: feed.name,
      url: feed.url,
      locale: feed.locale,
      tier: feed.tier,
      topicsJson: feed.topics as Prisma.InputJsonValue,
      enabled: feed.enabled,
      intervalMinutes: feed.intervalMinutes,
      lookbackMinutes: feed.lookbackMinutes,
      officialDomain: feed.officialDomain,
      etag: feed.etag,
      lastModified: feed.lastModified,
    },
    create: {
      name: feed.name,
      kind: feed.kind,
      url: feed.url,
      canonicalKey: feed.canonicalKey,
      locale: feed.locale,
      tier: feed.tier,
      topicsJson: feed.topics as Prisma.InputJsonValue,
      enabled: feed.enabled,
      intervalMinutes: feed.intervalMinutes,
      lookbackMinutes: feed.lookbackMinutes,
      officialDomain: feed.officialDomain,
      etag: feed.etag,
      lastModified: feed.lastModified,
      nextCollectAt: feed.nextCollectAt,
    },
  })
}

export async function listDueAiDailySourceFeeds(prisma: AiDailyIngestionClient, now: Date, limit = 50) {
  return prisma.aiDailySourceFeed.findMany({
    where: {
      enabled: true,
      OR: [{ nextCollectAt: null }, { nextCollectAt: { lte: now } }],
    },
    orderBy: [{ tier: 'asc' }, { nextCollectAt: 'asc' }, { id: 'asc' }],
    take: Math.max(1, Math.min(limit, 200)),
  })
}

export async function listAiDailySourceFeeds(
  prisma: AiDailyIngestionClient,
  input: { enabled?: boolean; limit?: number } = {},
) {
  return prisma.aiDailySourceFeed.findMany({
    where: input.enabled === undefined ? undefined : { enabled: input.enabled },
    orderBy: [{ tier: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    take: Math.max(1, Math.min(input.limit ?? 200, 500)),
  })
}

export async function updateAiDailySourceFeed(
  prisma: AiDailyIngestionClient,
  input: {
    id: string
    patch: Partial<Parameters<typeof normalizeAiDailySourceFeedDefinition>[0]>
  },
) {
  const existing = await prisma.aiDailySourceFeed.findUnique({ where: { id: input.id } })
  if (!existing) throw new Error('ai-daily-source-feed-not-found')
  const nextIntervalMinutes = input.patch.intervalMinutes ?? existing.intervalMinutes
  const nextLookbackMinutes =
    input.patch.lookbackMinutes ?? (existing.lookbackMinutes >= nextIntervalMinutes ? existing.lookbackMinutes : undefined)
  const normalized = normalizeAiDailySourceFeedDefinition({
    id: existing.id,
    name: input.patch.name ?? existing.name,
    kind: input.patch.kind ?? existing.kind,
    url: input.patch.url ?? existing.url,
    locale: input.patch.locale ?? existing.locale,
    tier: input.patch.tier ?? (existing.tier as AiDailySourceFeedDefinition['tier']),
    topics: input.patch.topics ?? jsonStringArray(existing.topicsJson),
    enabled: input.patch.enabled ?? existing.enabled,
    intervalMinutes: nextIntervalMinutes,
    lookbackMinutes: nextLookbackMinutes,
    officialDomain: input.patch.officialDomain === undefined ? existing.officialDomain : input.patch.officialDomain,
    etag: existing.etag,
    lastModified: existing.lastModified,
    lastAttemptedAt: existing.lastAttemptedAt,
    lastCollectedAt: existing.lastCollectedAt,
    lastSuccessfulAt: existing.lastSuccessfulAt,
    nextCollectAt: existing.nextCollectAt,
    consecutiveFailures: existing.consecutiveFailures,
    lastErrorCategory: existing.lastErrorCategory as AiDailyIngestionErrorCategory | null,
  })
  if (!normalized.ok) throw new Error(`${normalized.error}:${normalized.issues.join(',')}`)
  const feed = normalized.feed
  return prisma.aiDailySourceFeed.update({
    where: { id: existing.id },
    data: {
      name: feed.name,
      kind: feed.kind,
      url: feed.url,
      canonicalKey: feed.canonicalKey,
      locale: feed.locale,
      tier: feed.tier,
      topicsJson: feed.topics as Prisma.InputJsonValue,
      enabled: feed.enabled,
      intervalMinutes: feed.intervalMinutes,
      lookbackMinutes: feed.lookbackMinutes,
      officialDomain: feed.officialDomain,
    },
  })
}

export async function recordAiDailySourceCollectionOutcome(
  prisma: AiDailyIngestionClient,
  input: { sourceFeedId: string; outcome: AiDailySourceCollectionOutcome },
) {
  const feed = await prisma.aiDailySourceFeed.findUnique({ where: { id: input.sourceFeedId } })
  if (!feed) throw new Error('ai-daily-source-feed-not-found')
  const projection = projectAiDailySourceHealth(
    {
      intervalMinutes: feed.intervalMinutes,
      consecutiveFailures: feed.consecutiveFailures,
      lastSuccessfulAt: feed.lastSuccessfulAt,
    },
    input.outcome,
  )
  return prisma.aiDailySourceFeed.update({
    where: { id: feed.id },
    data: {
      lastAttemptedAt: projection.lastAttemptedAt,
      lastCollectedAt: projection.lastCollectedAt,
      lastSuccessfulAt: projection.lastSuccessfulAt,
      nextCollectAt: projection.nextCollectAt,
      consecutiveFailures: projection.consecutiveFailures,
      healthStatus: projection.healthStatus,
      lastErrorCategory: projection.lastErrorCategory,
      lastErrorJson: projection.lastErrorCategory
        ? ({ category: projection.lastErrorCategory } satisfies Prisma.InputJsonObject)
        : Prisma.JsonNull,
      lastLagMs: projection.lastLagMs,
      etag: projection.etag ?? undefined,
      lastModified: projection.lastModified ?? undefined,
    },
  })
}

export async function upsertAiDailyCandidate(
  prisma: AiDailyIngestionClient,
  input: {
    runId: string
    sourceFeedId?: string | null
    discoveryQueryGroup?: string | null
    candidate: AiDailyCandidateLead
  },
) {
  const candidate = input.candidate
  const identity = {
    runId: input.runId,
    canonicalKey: candidate.canonicalKey,
    observationKey: candidate.observationKey,
  }
  const update = {
    sourceFeedId: input.sourceFeedId,
    providerKind: candidate.providerKind,
    providerRole: candidate.providerRole,
    discoveryQueryGroup: input.discoveryQueryGroup,
    leadOnly: candidate.leadOnly,
    sourceExternalId: candidate.sourceExternalId,
    observedAt: candidate.observedAt,
    originalUrl: candidate.originalUrl,
    normalizedUrl: candidate.normalizedUrl,
    canonicalUrl: candidate.canonicalUrl,
    title: candidate.title,
    publisher: candidate.publisher,
    publisherDomain: candidate.publisherDomain,
    publishedAt: candidate.publishedAt,
    locale: candidate.locale,
    sourceTier: candidate.sourceTier,
    titleFingerprint: candidate.titleFingerprint,
  }
  return prisma.aiDailyCandidate.upsert({
    where: { runId_canonicalKey_observationKey: identity },
    update,
    create: {
      ...identity,
      ...update,
    },
  })
}

export async function createAiDailyEvidenceDocument(
  prisma: PrismaClient,
  input: { candidateId: string; evidence: AiDailyEvidenceDocumentInput },
) {
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.aiDailyCandidate.update({
      where: { id: input.candidateId },
      data: { evidenceVersion: { increment: 1 }, fetchAttemptCount: { increment: 1 } },
      select: { evidenceVersion: true },
    })
    const evidence = await tx.aiDailyEvidenceDocument.create({
      data: {
        candidateId: input.candidateId,
        version: candidate.evidenceVersion,
        extractionMethod: input.evidence.extractionMethod,
        originalUrl: input.evidence.originalUrl,
        canonicalUrl: input.evidence.canonicalUrl,
        title: input.evidence.title,
        publisher: input.evidence.publisher,
        author: input.evidence.author,
        publishedAt: input.evidence.publishedAt,
        fetchedAt: input.evidence.fetchedAt,
        locale: input.evidence.locale,
        contentType: input.evidence.contentType,
        contentHash: input.evidence.contentHash,
        headingsJson: input.evidence.headings as Prisma.InputJsonValue,
        normalizedText: input.evidence.normalizedText,
        excerpt: input.evidence.excerpt,
        normalizedBytes: input.evidence.normalizedBytes,
        status: input.evidence.status,
        expiresAt: input.evidence.expiresAt,
      },
    })
    await tx.aiDailyCandidate.update({
      where: { id: input.candidateId },
      data: {
        currentEvidenceId: evidence.id,
        fetchStatus: 'FETCHED',
        evidenceStatus: input.evidence.status,
        fetchedAt: input.evidence.fetchedAt,
        contentHash: input.evidence.contentHash,
        evidenceExcerpt: input.evidence.excerpt,
        evidenceExpiresAt: input.evidence.expiresAt,
        lastErrorCategory: null,
      },
    })
    return evidence
  })
}

export async function recordAiDailyCandidateFetchFailure(
  prisma: AiDailyIngestionClient,
  input: {
    candidateId: string
    category: AiDailyIngestionErrorCategory
    blocked?: boolean
  },
) {
  const fetchStatus: AiDailyCandidateFetchStatus = input.blocked ? 'BLOCKED' : 'FAILED'
  const evidenceStatus: AiDailyCandidateEvidenceStatus = input.blocked ? 'REJECTED' : 'UNCHECKED'
  return prisma.aiDailyCandidate.update({
    where: { id: input.candidateId },
    data: {
      fetchStatus,
      evidenceStatus,
      fetchAttemptCount: { increment: 1 },
      lastErrorCategory: input.category,
    },
  })
}

export async function persistAiDailyDedupe(
  prisma: PrismaClient,
  input: { runId: string; candidates: AiDailyDedupedCandidate[] },
) {
  return prisma.$transaction(async (tx) => {
    for (const item of input.candidates) {
      await tx.aiDailyCandidate.updateMany({
        where: { id: item.candidate.id, runId: input.runId },
        data: {
          duplicateOfCandidateId: item.duplicateOfCandidateId,
          selectionState: item.duplicateOfCandidateId ? 'DUPLICATE' : 'CANDIDATE',
        },
      })
    }
  })
}

export async function persistAiDailyClusters(
  prisma: PrismaClient,
  input: { runId: string; clusters: AiDailyRankedCluster[] },
) {
  return prisma.$transaction(async (tx) => {
    await tx.aiDailyCandidate.updateMany({ where: { runId: input.runId }, data: { clusterId: null } })
    const persisted = []
    for (let index = 0; index < input.clusters.length; index += 1) {
      const cluster = input.clusters[index]
      if (!cluster) continue
      const row = await tx.aiDailyCluster.upsert({
        where: { runId_stableIdentityKey: { runId: input.runId, stableIdentityKey: cluster.stableIdentityKey } },
        update: {
          representativeCandidateId: cluster.representative.id,
          groupingReason: cluster.groupingReason,
          topic: cluster.topic,
          corroborationCount: cluster.corroboratingDomains.length,
          scoreTotal: cluster.scoreTotal,
          scoreJson: cluster.score as unknown as Prisma.InputJsonValue,
          rank: index + 1,
        },
        create: {
          runId: input.runId,
          stableIdentityKey: cluster.stableIdentityKey,
          representativeCandidateId: cluster.representative.id,
          groupingReason: cluster.groupingReason,
          topic: cluster.topic,
          corroborationCount: cluster.corroboratingDomains.length,
          scoreTotal: cluster.scoreTotal,
          scoreJson: cluster.score as unknown as Prisma.InputJsonValue,
          rank: index + 1,
        },
      })
      await tx.aiDailyCandidate.updateMany({
        where: { runId: input.runId, id: { in: cluster.members.map((member) => member.id) } },
        data: { clusterId: row.id },
      })
      await tx.aiDailyCandidate.update({
        where: { id: cluster.representative.id },
        data: { scoreTotal: cluster.scoreTotal, scoreJson: cluster.score as unknown as Prisma.InputJsonValue },
      })
      persisted.push(row)
    }
    return persisted
  })
}

export async function applyAiDailyEvidenceSelection(
  prisma: PrismaClient,
  input: {
    runId: string
    issueId: string
    selected: AiDailyRankedCluster[]
    selectedBy: string
    selectionReason: string
    selectedAt?: Date
  },
) {
  const selectedAt = input.selectedAt ?? new Date()
  return prisma.$transaction(async (tx) => {
    const representativeIds = input.selected.map((cluster) => cluster.representative.id)
    const eligibleRepresentatives = await tx.aiDailyCandidate.count({
      where: {
        id: { in: representativeIds },
        runId: input.runId,
        leadOnly: false,
        evidenceStatus: 'READY',
      },
    })
    if (eligibleRepresentatives !== representativeIds.length) {
      throw new Error('ai-daily-selection-run-boundary-mismatch')
    }
    const sourceIds: string[] = []
    for (let index = 0; index < input.selected.length; index += 1) {
      const cluster = input.selected[index]
      if (!cluster || cluster.representative.leadOnly || cluster.representative.evidenceStatus !== 'READY') {
        throw new Error('ai-daily-selection-requires-ready-evidence')
      }
      const representative = cluster.representative
      const source = await upsertAiDailyCanonicalSource(tx, {
        title: representative.title,
        url: representative.originalUrl,
        sourceName: representative.publisher,
        sourceTier: representative.sourceTier,
        language: representative.locale,
        publishedAt: representative.publishedAt,
        capturedAt: representative.observedAt,
        rawExcerpt: representative.evidenceText.slice(0, 1024),
        summary: representative.evidenceText.slice(0, 600),
        tagsJson: representative.topics as Prisma.InputJsonValue,
        contentHash: representative.contentHash,
        titleFingerprint: representative.titleFingerprint,
      })
      sourceIds.push(source.id)
      const candidateUpdate = await tx.aiDailyCandidate.updateMany({
        where: { id: representative.id, runId: input.runId },
        data: { sourceItemId: source.id, selectionState: 'SELECTED' },
      })
      if (candidateUpdate.count !== 1) throw new Error('ai-daily-selection-run-boundary-mismatch')
      await tx.aiDailyCluster.updateMany({
        where: {
          runId: input.runId,
          stableIdentityKey: cluster.stableIdentityKey,
          representativeCandidateId: representative.id,
        },
        data: { selectedAt, rank: index + 1 },
      })
    }
    const selection = await replaceAiDailyIssueSelectionInTransaction(tx, {
      issueId: input.issueId,
      sourceIds,
      selectedBy: input.selectedBy,
      selectionReason: input.selectionReason,
    })
    const selectedEvidence = await tx.aiDailyCandidate.aggregate({
      where: { id: { in: representativeIds }, runId: input.runId },
      _max: { evidenceVersion: true },
    })
    const evidenceVersion = selectedEvidence._max.evidenceVersion ?? 0
    await tx.aiDailyIssue.update({
      where: { id: input.issueId },
      data: { selectedEvidenceVersion: evidenceVersion },
    })
    return { ...selection, evidenceVersion }
  })
}

export async function updateAiDailyRunFreshness(
  prisma: AiDailyIngestionClient,
  input: {
    runId: string
    checkpoints: {
      newestPublishedAt: Date | null
      lastTier1CollectedAt: Date | null
      lastCollectedAt: Date | null
      lastDiscoveredAt: Date | null
      lastFetchedAt: Date | null
    }
    freshness: AiDailyFreshnessResult
    at?: Date
  },
) {
  return prisma.aiDailyRun.update({
    where: { id: input.runId },
    data: {
      ...input.checkpoints,
      pipelineFreshnessAt: input.at ?? new Date(),
      endToEndLagMs: boundedDatabaseDuration(input.freshness.metrics.endToEndLagMs),
      countersJson: {
        freshnessReady: input.freshness.ready,
        freshnessGaps: input.freshness.gaps,
        tier1CollectionAgeMs: input.freshness.metrics.tier1CollectionAgeMs,
        discoveryAgeMs: input.freshness.metrics.discoveryAgeMs,
        fetchAgeMs: input.freshness.metrics.fetchAgeMs,
        tier1DiscoveryP95Ms: input.freshness.metrics.tier1DiscoveryP95Ms,
      } satisfies Prisma.InputJsonObject,
    },
  })
}

export async function loadAiDailyIngestionSnapshot(prisma: AiDailyIngestionClient, runId: string) {
  return prisma.aiDailyRun.findUnique({
    where: { id: runId },
    include: {
      candidates: {
        include: { currentEvidence: true },
        orderBy: [{ scoreTotal: 'desc' }, { canonicalUrl: 'asc' }],
      },
      clusters: { orderBy: [{ rank: 'asc' }, { stableIdentityKey: 'asc' }] },
    },
  })
}

export async function listExpiredAiDailyEvidence(prisma: AiDailyIngestionClient, now: Date, limit = 500) {
  return prisma.aiDailyEvidenceDocument.findMany({
    where: { expiresAt: { lte: now }, currentForCandidate: null },
    orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
    take: Math.max(1, Math.min(limit, 2_000)),
  })
}

function boundedDatabaseDuration(value: number | null) {
  return value === null ? null : Math.min(2_147_483_647, Math.max(0, Math.round(value)))
}

export function toAiDailySourceFeedDefinition(
  feed: Awaited<ReturnType<typeof upsertAiDailySourceFeed>>,
): AiDailySourceFeedDefinition {
  return {
    id: feed.id,
    name: feed.name,
    kind: feed.kind,
    url: feed.url,
    canonicalKey: feed.canonicalKey,
    canonicalUrl: canonicalizeAiDailySourceUrl(feed.url),
    locale: feed.locale,
    tier: feed.tier as AiDailySourceFeedDefinition['tier'],
    topics: Array.isArray(feed.topicsJson)
      ? feed.topicsJson.filter((value): value is string => typeof value === 'string')
      : [],
    enabled: feed.enabled,
    intervalMinutes: feed.intervalMinutes,
    lookbackMinutes: feed.lookbackMinutes,
    officialDomain: feed.officialDomain,
    etag: feed.etag,
    lastModified: feed.lastModified,
    lastAttemptedAt: feed.lastAttemptedAt,
    lastCollectedAt: feed.lastCollectedAt,
    lastSuccessfulAt: feed.lastSuccessfulAt,
    nextCollectAt: feed.nextCollectAt,
    consecutiveFailures: feed.consecutiveFailures,
    lastErrorCategory: feed.lastErrorCategory as AiDailyIngestionErrorCategory | null,
  }
}

function jsonStringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
