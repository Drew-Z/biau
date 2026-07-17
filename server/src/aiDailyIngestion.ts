import { createHash } from 'node:crypto'
import {
  canonicalizeAiDailySourceUrl,
  createAiDailyCanonicalSourceIdentity,
  createAiDailyTitleFingerprint,
} from './aiDailyDomain.js'

export const aiDailySourceFeedKinds = [
  'RSS',
  'OFFICIAL_PAGE',
  'GITHUB_RELEASES',
  'HACKER_NEWS',
  'API',
  'SEARCH',
  'MANUAL',
] as const
export type AiDailySourceFeedKindName = (typeof aiDailySourceFeedKinds)[number]

export const aiDailySourceTiers = ['TIER_1', 'TIER_2', 'TIER_3'] as const
export type AiDailySourceTierName = (typeof aiDailySourceTiers)[number]

export const aiDailyIngestionErrorCategories = [
  'config_error',
  'auth_error',
  'rate_limited',
  'timeout',
  'network_error',
  'unsafe_url',
  'robots_disallowed',
  'render_required',
  'fetch_empty',
  'invalid_response',
  'evidence_rejected',
  'schema_invalid',
  'quality_rejected',
  'freshness_stale',
] as const
export type AiDailyIngestionErrorCategory = (typeof aiDailyIngestionErrorCategories)[number]

export interface AiDailyTierPolicy {
  intervalMinutes: number
  lookbackMinutes: number
  authorityScore: number
}

export const aiDailyTierPolicies: Record<AiDailySourceTierName, AiDailyTierPolicy> = {
  TIER_1: { intervalMinutes: 15, lookbackMinutes: 30, authorityScore: 25 },
  TIER_2: { intervalMinutes: 30, lookbackMinutes: 60, authorityScore: 16 },
  TIER_3: { intervalMinutes: 60, lookbackMinutes: 120, authorityScore: 8 },
}

export interface AiDailySourceFeedDefinition {
  id?: string
  name: string
  kind: AiDailySourceFeedKindName
  url: string
  canonicalKey: string
  canonicalUrl: string
  locale: string
  tier: AiDailySourceTierName
  topics: string[]
  enabled: boolean
  intervalMinutes: number
  lookbackMinutes: number
  officialDomain: string | null
  etag: string | null
  lastModified: string | null
  lastAttemptedAt: Date | null
  lastCollectedAt: Date | null
  lastSuccessfulAt: Date | null
  nextCollectAt: Date | null
  consecutiveFailures: number
  lastErrorCategory: AiDailyIngestionErrorCategory | null
}

export type AiDailySourceFeedDefinitionResult =
  | { ok: true; feed: AiDailySourceFeedDefinition }
  | { ok: false; error: 'invalid-ai-daily-source-feed'; issues: string[] }

export function normalizeAiDailySourceFeedDefinition(value: {
  id?: string
  name: string
  kind: AiDailySourceFeedKindName
  url: string
  locale?: string
  tier: AiDailySourceTierName
  topics?: string[]
  enabled?: boolean
  intervalMinutes?: number
  lookbackMinutes?: number
  officialDomain?: string | null
  etag?: string | null
  lastModified?: string | null
  lastAttemptedAt?: Date | null
  lastCollectedAt?: Date | null
  lastSuccessfulAt?: Date | null
  nextCollectAt?: Date | null
  consecutiveFailures?: number
  lastErrorCategory?: AiDailyIngestionErrorCategory | null
}): AiDailySourceFeedDefinitionResult {
  const issues: string[] = []
  const name = boundedText(value.name, 160)
  if (!name) issues.push('name-required')
  if (!aiDailySourceFeedKinds.includes(value.kind)) issues.push('kind-invalid')
  if (!aiDailySourceTiers.includes(value.tier)) issues.push('tier-invalid')

  let canonicalUrl = ''
  let canonicalKey = ''
  let publisherDomain = ''
  try {
    const identity = createAiDailyCanonicalSourceIdentity(value.url)
    canonicalUrl = identity.canonicalUrl
    canonicalKey = identity.canonicalKey
    publisherDomain = identity.publisherDomain
  } catch {
    issues.push('url-invalid')
  }

  const locale = normalizeLocale(value.locale ?? 'zh')
  if (!locale) issues.push('locale-invalid')
  const topics = normalizeStringList(value.topics ?? [], 12, 80)
  if (topics.length === 0) issues.push('topics-required')
  const policy = aiDailyTierPolicies[value.tier] ?? aiDailyTierPolicies.TIER_3
  const parsedIntervalMinutes = readBoundedInteger(value.intervalMinutes, 5, 1440)
  if (value.intervalMinutes !== undefined && parsedIntervalMinutes === null) issues.push('interval-minutes-invalid')
  const intervalMinutes = parsedIntervalMinutes ?? policy.intervalMinutes
  const parsedLookbackMinutes = readBoundedInteger(value.lookbackMinutes, intervalMinutes, 2880)
  if (value.lookbackMinutes !== undefined && parsedLookbackMinutes === null) issues.push('lookback-minutes-invalid')
  const lookbackMinutes = parsedLookbackMinutes ?? Math.max(policy.lookbackMinutes, intervalMinutes)
  const officialDomain = normalizeDomain(value.officialDomain ?? null)
  if (value.officialDomain && !officialDomain) issues.push('official-domain-invalid')
  if (value.lastErrorCategory && !aiDailyIngestionErrorCategories.includes(value.lastErrorCategory)) {
    issues.push('last-error-category-invalid')
  }
  if (
    officialDomain &&
    value.tier === 'TIER_1' &&
    publisherDomain !== officialDomain &&
    !publisherDomain.endsWith(`.${officialDomain}`)
  ) {
    issues.push('official-domain-mismatch')
  }
  if (issues.length > 0) return { ok: false, error: 'invalid-ai-daily-source-feed', issues }

  return {
    ok: true,
    feed: {
      ...(value.id ? { id: value.id } : {}),
      name,
      kind: value.kind,
      url: value.url.trim(),
      canonicalUrl,
      canonicalKey,
      locale,
      tier: value.tier,
      topics,
      enabled: value.enabled ?? true,
      intervalMinutes,
      lookbackMinutes,
      officialDomain,
      etag: boundedNullableText(value.etag, 240),
      lastModified: boundedNullableText(value.lastModified, 240),
      lastAttemptedAt: value.lastAttemptedAt ?? null,
      lastCollectedAt: value.lastCollectedAt ?? null,
      lastSuccessfulAt: value.lastSuccessfulAt ?? null,
      nextCollectAt: value.nextCollectAt ?? null,
      consecutiveFailures: readBoundedInteger(value.consecutiveFailures, 0, 1_000_000) ?? 0,
      lastErrorCategory: value.lastErrorCategory ?? null,
    },
  }
}

export interface AiDailyCollectionWindow {
  due: boolean
  scheduledAt: Date
  windowStart: Date
  windowEnd: Date
  nextCollectAt: Date
  conditionalHeaders: Record<string, string>
}

export function buildAiDailyCollectionWindow(
  feed: Pick<
    AiDailySourceFeedDefinition,
    'enabled' | 'intervalMinutes' | 'lookbackMinutes' | 'nextCollectAt' | 'lastSuccessfulAt' | 'etag' | 'lastModified'
  >,
  now: Date,
): AiDailyCollectionWindow {
  const due = feed.enabled && (!feed.nextCollectAt || feed.nextCollectAt.getTime() <= now.getTime())
  const overlapAnchor = feed.lastSuccessfulAt?.getTime() ?? now.getTime()
  const windowStart = new Date(Math.min(overlapAnchor, now.getTime()) - feed.lookbackMinutes * 60_000)
  return {
    due,
    scheduledAt: now,
    windowStart,
    windowEnd: now,
    nextCollectAt: new Date(now.getTime() + feed.intervalMinutes * 60_000),
    conditionalHeaders: {
      ...(feed.etag ? { 'If-None-Match': feed.etag } : {}),
      ...(feed.lastModified ? { 'If-Modified-Since': feed.lastModified } : {}),
    },
  }
}

export interface AiDailySourceCollectionOutcome {
  success: boolean
  attemptedAt: Date
  collectedAt?: Date | null
  newestPublishedAt?: Date | null
  etag?: string | null
  lastModified?: string | null
  errorCategory?: AiDailyIngestionErrorCategory | null
}

export function projectAiDailySourceHealth(
  feed: Pick<AiDailySourceFeedDefinition, 'intervalMinutes' | 'consecutiveFailures' | 'lastSuccessfulAt'>,
  outcome: AiDailySourceCollectionOutcome,
) {
  const success = outcome.success
  const lastSuccessfulAt = success ? outcome.attemptedAt : feed.lastSuccessfulAt
  const nextCollectAt = new Date(outcome.attemptedAt.getTime() + feed.intervalMinutes * 60_000)
  const lagMs = outcome.newestPublishedAt
    ? Math.max(0, outcome.attemptedAt.getTime() - outcome.newestPublishedAt.getTime())
    : null
  return {
    lastAttemptedAt: outcome.attemptedAt,
    lastCollectedAt: outcome.collectedAt ?? outcome.attemptedAt,
    lastSuccessfulAt,
    nextCollectAt,
    consecutiveFailures: success ? 0 : feed.consecutiveFailures + 1,
    healthStatus: success ? 'HEALTHY' : feed.consecutiveFailures + 1 >= 3 ? 'FAILING' : 'DEGRADED',
    lastErrorCategory: success ? null : outcome.errorCategory ?? 'invalid_response',
    lastLagMs: lagMs,
    etag: boundedNullableText(outcome.etag, 240),
    lastModified: boundedNullableText(outcome.lastModified, 240),
  } as const
}

export interface AiDailyCandidateLeadInput {
  id?: string
  providerKind: string
  providerRole?: 'stable' | 'primary' | 'fallback' | 'signal' | 'manual'
  sourceExternalId?: string | null
  observationKey?: string
  observedAt?: Date
  originalUrl: string
  title: string
  publisher?: string
  publishedAt?: Date | null
  locale?: string
  sourceTier: AiDailySourceTierName
  topics?: string[]
  leadOnly?: boolean
  snippet?: string | null
}

export interface AiDailyCandidateLead {
  id: string
  providerKind: string
  providerRole: 'stable' | 'primary' | 'fallback' | 'signal' | 'manual'
  sourceExternalId: string | null
  observationKey: string
  observedAt: Date
  originalUrl: string
  normalizedUrl: string
  canonicalUrl: string
  canonicalKey: string
  title: string
  titleFingerprint: string
  publisher: string
  publisherDomain: string
  publishedAt: Date | null
  locale: string
  sourceTier: AiDailySourceTierName
  topics: string[]
  leadOnly: boolean
  snippet: string | null
  fetchStatus: 'DISCOVERED' | 'FETCHED' | 'FAILED' | 'BLOCKED'
  evidenceStatus: 'UNCHECKED' | 'READY' | 'THIN' | 'CONFLICTING' | 'REJECTED'
  contentHash: string | null
  evidenceText: string | null
  evidenceHeadingCount: number
}

export type AiDailyCandidateLeadResult =
  | { ok: true; candidate: AiDailyCandidateLead }
  | { ok: false; error: 'invalid-ai-daily-candidate'; issues: string[] }

export function normalizeAiDailyCandidateLead(input: AiDailyCandidateLeadInput): AiDailyCandidateLeadResult {
  const issues: string[] = []
  const title = boundedText(input.title, 300)
  if (!title) issues.push('title-required')
  const providerKind = boundedText(input.providerKind, 80)
  if (!providerKind) issues.push('provider-kind-required')
  const locale = normalizeLocale(input.locale ?? 'zh')
  if (!locale) issues.push('locale-invalid')
  let canonicalUrl = ''
  let canonicalKey = ''
  let publisherDomain = ''
  try {
    const identity = createAiDailyCanonicalSourceIdentity(input.originalUrl)
    canonicalUrl = identity.canonicalUrl
    canonicalKey = identity.canonicalKey
    publisherDomain = identity.publisherDomain
  } catch {
    issues.push('url-invalid')
  }
  const topics = normalizeStringList(input.topics ?? [], 12, 80)
  if (issues.length > 0) return { ok: false, error: 'invalid-ai-daily-candidate', issues }

  const providerRole = input.providerRole ?? 'stable'
  const leadOnly = input.leadOnly ?? providerRole === 'signal'
  return {
    ok: true,
    candidate: {
      id: input.id ?? `candidate-${canonicalKey.slice(0, 20)}-${boundedText(input.observationKey ?? 'primary', 80)}`,
      providerKind,
      providerRole,
      sourceExternalId: boundedNullableText(input.sourceExternalId, 200),
      observationKey: boundedText(input.observationKey ?? 'primary', 120) || 'primary',
      observedAt: input.observedAt ?? new Date(),
      originalUrl: input.originalUrl.trim(),
      normalizedUrl: canonicalUrl,
      canonicalUrl,
      canonicalKey,
      title,
      titleFingerprint: createAiDailyTitleFingerprint(title),
      publisher: boundedText(input.publisher ?? publisherDomain, 200) || publisherDomain,
      publisherDomain,
      publishedAt: input.publishedAt ?? null,
      locale,
      sourceTier: input.sourceTier,
      topics,
      leadOnly,
      snippet: boundedNullableText(input.snippet, 1024),
      fetchStatus: 'DISCOVERED',
      evidenceStatus: 'UNCHECKED',
      contentHash: null,
      evidenceText: null,
      evidenceHeadingCount: 0,
    },
  }
}

export interface AiDailyProviderBudget {
  maxRequests: number
  maxResults: number
  timeoutMs: number
  maxRetries: number
  maxCostUnits: number
}

export interface AiDailyDiscoveryRequest {
  queryGroup: string
  queries: string[]
  windowStart: Date
  windowEnd: Date
  locale: string
  includeDomains: string[]
  excludeDomains: string[]
  budget: AiDailyProviderBudget
}

export interface AiDailyDiscoveryAdapter {
  id: string
  slot: 'primary' | 'fallback' | 'signal'
  discover(request: AiDailyDiscoveryRequest): Promise<AiDailyCandidateLeadInput[]>
}

export interface AiDailyDiscoveryAttempt {
  providerId: string
  slot: AiDailyDiscoveryAdapter['slot']
  outcome: 'succeeded' | 'failed' | 'skipped'
  candidateCount: number
  errorCategory: AiDailyIngestionErrorCategory | null
}

export interface AiDailyDiscoveryResult {
  ready: boolean
  redundancy: 'full' | 'reduced_redundancy' | 'primary_unavailable'
  candidates: AiDailyCandidateLead[]
  attempts: AiDailyDiscoveryAttempt[]
  gaps: string[]
}

export class AiDailyAdapterError extends Error {
  readonly category: AiDailyIngestionErrorCategory

  constructor(category: AiDailyIngestionErrorCategory) {
    super(category)
    this.name = 'AiDailyAdapterError'
    this.category = category
  }
}

export async function runAiDailyDiscovery(input: {
  request: AiDailyDiscoveryRequest
  primary?: AiDailyDiscoveryAdapter | null
  fallback?: AiDailyDiscoveryAdapter | null
  signal?: AiDailyDiscoveryAdapter | null
  minimumPrimaryResults?: number
  includeSignal?: boolean
}): Promise<AiDailyDiscoveryResult> {
  const attempts: AiDailyDiscoveryAttempt[] = []
  const gaps: string[] = []
  const minimumPrimaryResults = input.minimumPrimaryResults ?? 5
  if (!input.primary || input.primary.slot !== 'primary') {
    return {
      ready: false,
      redundancy: 'primary_unavailable',
      candidates: [],
      attempts,
      gaps: ['primary-discovery-not-configured'],
    }
  }

  const primary = await callDiscoveryAdapter(input.primary, input.request, attempts)
  let combined = primary.candidates
  let redundancy: AiDailyDiscoveryResult['redundancy'] = 'full'
  const shouldFallback = !primary.ok || primary.candidates.length < minimumPrimaryResults
  if (shouldFallback) {
    if (input.fallback?.slot === 'fallback') {
      const fallback = await callDiscoveryAdapter(input.fallback, input.request, attempts)
      combined = [...combined, ...fallback.candidates]
      if (!fallback.ok) {
        redundancy = 'reduced_redundancy'
        gaps.push(`fallback-${fallback.errorCategory ?? 'invalid_response'}`)
      }
    } else {
      redundancy = 'reduced_redundancy'
      gaps.push('fallback-not-configured')
    }
  }

  if (input.includeSignal && input.signal?.slot === 'signal') {
    const signal = await callDiscoveryAdapter(input.signal, input.request, attempts)
    combined = [...combined, ...signal.candidates.map((candidate) => ({ ...candidate, leadOnly: true }))]
    if (!signal.ok) gaps.push(`signal-${signal.errorCategory ?? 'invalid_response'}`)
  }

  const candidates = dedupeCandidateLeads(combined)
  const primarySucceeded = attempts.some((attempt) => attempt.slot === 'primary' && attempt.outcome === 'succeeded')
  return {
    ready: primarySucceeded,
    redundancy,
    candidates,
    attempts,
    gaps,
  }
}

async function callDiscoveryAdapter(
  adapter: AiDailyDiscoveryAdapter,
  request: AiDailyDiscoveryRequest,
  attempts: AiDailyDiscoveryAttempt[],
) {
  try {
    const raw = await adapter.discover(request)
    const candidates = raw
      .slice(0, request.budget.maxResults)
      .map((candidate) => normalizeAiDailyCandidateLead({ ...candidate, providerRole: adapter.slot }))
      .filter((result): result is Extract<AiDailyCandidateLeadResult, { ok: true }> => result.ok)
      .map((result) => result.candidate)
    attempts.push({
      providerId: boundedText(adapter.id, 80) || adapter.slot,
      slot: adapter.slot,
      outcome: 'succeeded',
      candidateCount: candidates.length,
      errorCategory: null,
    })
    return { ok: true as const, candidates, errorCategory: null }
  } catch (error) {
    const errorCategory = error instanceof AiDailyAdapterError ? error.category : 'invalid_response'
    attempts.push({
      providerId: boundedText(adapter.id, 80) || adapter.slot,
      slot: adapter.slot,
      outcome: 'failed',
      candidateCount: 0,
      errorCategory,
    })
    return { ok: false as const, candidates: [] as AiDailyCandidateLead[], errorCategory }
  }
}

function dedupeCandidateLeads(candidates: AiDailyCandidateLead[]) {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    if (seen.has(candidate.canonicalKey)) return false
    seen.add(candidate.canonicalKey)
    return true
  })
}

export interface AiDailyEvidenceCandidate extends AiDailyCandidateLead {
  fetchStatus: 'FETCHED'
  evidenceStatus: 'READY' | 'THIN' | 'CONFLICTING' | 'REJECTED'
  contentHash: string
  evidenceText: string
  evidenceHeadingCount: number
}

export type AiDailyDuplicateReason = 'canonical-url' | 'content-hash' | 'title-fingerprint' | 'lexical-similarity'

export interface AiDailyDedupedCandidate {
  candidate: AiDailyEvidenceCandidate
  representativeId: string
  duplicateOfCandidateId: string | null
  duplicateReason: AiDailyDuplicateReason | null
}

export function deduplicateAiDailyCandidates(
  candidates: AiDailyEvidenceCandidate[],
  lexicalThreshold = 0.82,
): AiDailyDedupedCandidate[] {
  const ordered = [...candidates].sort(compareRepresentativePriority)
  const representatives: AiDailyEvidenceCandidate[] = []
  const output: AiDailyDedupedCandidate[] = []
  for (const candidate of ordered) {
    const duplicate = representatives
      .map((representative) => ({ representative, reason: duplicateReason(representative, candidate, lexicalThreshold) }))
      .find((entry) => entry.reason !== null)
    if (duplicate?.reason) {
      output.push({
        candidate,
        representativeId: duplicate.representative.id,
        duplicateOfCandidateId: duplicate.representative.id,
        duplicateReason: duplicate.reason,
      })
      continue
    }
    representatives.push(candidate)
    output.push({ candidate, representativeId: candidate.id, duplicateOfCandidateId: null, duplicateReason: null })
  }
  return output.sort((left, right) => left.candidate.id.localeCompare(right.candidate.id))
}

function duplicateReason(
  left: AiDailyEvidenceCandidate,
  right: AiDailyEvidenceCandidate,
  lexicalThreshold: number,
): AiDailyDuplicateReason | null {
  if (left.canonicalKey === right.canonicalKey) return 'canonical-url'
  if (left.contentHash && left.contentHash === right.contentHash) return 'content-hash'
  if (left.titleFingerprint && left.titleFingerprint === right.titleFingerprint) return 'title-fingerprint'
  return lexicalSimilarity(left.title, right.title) >= lexicalThreshold ? 'lexical-similarity' : null
}

function compareRepresentativePriority(left: AiDailyEvidenceCandidate, right: AiDailyEvidenceCandidate) {
  const tier = tierRank(left.sourceTier) - tierRank(right.sourceTier)
  if (tier !== 0) return tier
  const evidence = evidenceRank(left.evidenceStatus) - evidenceRank(right.evidenceStatus)
  if (evidence !== 0) return evidence
  const published = compareOptionalDatesDesc(left.publishedAt, right.publishedAt)
  if (published !== 0) return published
  return left.canonicalUrl.localeCompare(right.canonicalUrl)
}

export interface AiDailyEventCluster {
  stableIdentityKey: string
  representative: AiDailyEvidenceCandidate
  members: AiDailyEvidenceCandidate[]
  groupingReason: 'representative' | 'lexical-event'
  topic: string
  corroboratingDomains: string[]
}

export function groupAiDailyCandidates(
  deduped: AiDailyDedupedCandidate[],
  lexicalThreshold = 0.7,
): AiDailyEventCluster[] {
  const representatives = deduped
    .filter((entry) => entry.duplicateOfCandidateId === null)
    .map((entry) => entry.candidate)
    .sort(compareRepresentativePriority)
  const clusters: AiDailyEventCluster[] = []
  for (const candidate of representatives) {
    const topic = candidate.topics[0] ?? 'general'
    const existing = clusters.find(
      (cluster) =>
        cluster.topic === topic && lexicalSimilarity(cluster.representative.title, candidate.title) >= lexicalThreshold,
    )
    if (existing) {
      existing.members.push(candidate)
      existing.groupingReason = 'lexical-event'
      existing.corroboratingDomains = uniqueStrings([
        ...existing.corroboratingDomains,
        candidate.publisherDomain,
      ])
      continue
    }
    clusters.push({
      stableIdentityKey: buildClusterIdentity(topic, candidate.title),
      representative: candidate,
      members: [candidate],
      groupingReason: 'representative',
      topic,
      corroboratingDomains: [candidate.publisherDomain],
    })
  }
  const clusterByRepresentative = new Map(clusters.map((cluster) => [cluster.representative.id, cluster]))
  for (const item of deduped) {
    if (!item.duplicateOfCandidateId) continue
    const cluster = clusterByRepresentative.get(item.duplicateOfCandidateId)
    if (!cluster) continue
    cluster.members.push(item.candidate)
    cluster.corroboratingDomains = uniqueStrings([
      ...cluster.corroboratingDomains,
      item.candidate.publisherDomain,
    ])
  }
  return clusters.sort((left, right) => left.stableIdentityKey.localeCompare(right.stableIdentityKey))
}

function buildClusterIdentity(topic: string, title: string) {
  const titleTokens = [...tokenize(title)].sort().join(' ')
  return `ai-daily-cluster-v1:${createHash('sha256').update(`${topic.toLowerCase()}\n${titleTokens}`).digest('hex')}`
}

export interface AiDailyScoreComponents {
  authority: number
  recency: number
  aiRelevance: number
  informationDensity: number
  corroboration: number
  novelty: number
  diversityAdjustment: number
}

export interface AiDailyRankedCluster extends AiDailyEventCluster {
  score: AiDailyScoreComponents
  scoreTotal: number
}

export function rankAiDailyClusters(
  clusters: AiDailyEventCluster[],
  input: {
    now: Date
    recentCanonicalKeys?: Set<string>
    recentTitleFingerprints?: Set<string>
    diversityAdjustment?: (cluster: AiDailyEventCluster) => number
  },
): AiDailyRankedCluster[] {
  const recentCanonicalKeys = input.recentCanonicalKeys ?? new Set<string>()
  const recentTitleFingerprints = input.recentTitleFingerprints ?? new Set<string>()
  return clusters
    .map((cluster) => {
      const representative = cluster.representative
      const score: AiDailyScoreComponents = {
        authority: aiDailyTierPolicies[representative.sourceTier].authorityScore,
        recency: recencyScore(representative.publishedAt, input.now),
        aiRelevance: aiRelevanceScore(representative),
        informationDensity: informationDensityScore(representative),
        corroboration: Math.min(10, Math.max(0, (cluster.corroboratingDomains.length - 1) * 4 + 2)),
        novelty:
          recentCanonicalKeys.has(representative.canonicalKey) ||
          recentTitleFingerprints.has(representative.titleFingerprint)
            ? 0
            : 10,
        diversityAdjustment: clamp(input.diversityAdjustment?.(cluster) ?? 0, -10, 5),
      }
      return { ...cluster, score, scoreTotal: clamp(roundScore(sumScores(score)), 0, 100) }
    })
    .sort(compareRankedClusters)
}

export interface AiDailySelectionPolicy {
  minScore: number
  targetEvents: number
  minEvents: number
  maxEvents: number
  maxEventsPerDomain: number
  maxEventsPerTopic: number
  minDistinctDomains: number
  minTier1Sources: number
}

export const defaultAiDailySelectionPolicy: AiDailySelectionPolicy = {
  minScore: 55,
  targetEvents: 8,
  minEvents: 5,
  maxEvents: 10,
  maxEventsPerDomain: 2,
  maxEventsPerTopic: 3,
  minDistinctDomains: 3,
  minTier1Sources: 2,
}

export interface AiDailySelectionResult {
  selected: AiDailyRankedCluster[]
  ready: boolean
  gaps: string[]
  counts: {
    events: number
    distinctDomains: number
    tier1Sources: number
  }
}

export function selectAiDailyClusters(
  ranked: AiDailyRankedCluster[],
  policy: AiDailySelectionPolicy = defaultAiDailySelectionPolicy,
): AiDailySelectionResult {
  const selected: AiDailyRankedCluster[] = []
  const domains = new Map<string, number>()
  const topics = new Map<string, number>()
  let tier1Sources = 0
  for (const cluster of ranked) {
    if (selected.length >= policy.maxEvents) break
    if (
      selected.length >= policy.targetEvents &&
      selected.length >= policy.minEvents &&
      domains.size >= policy.minDistinctDomains &&
      tier1Sources >= policy.minTier1Sources
    ) {
      break
    }
    if (cluster.scoreTotal < policy.minScore) continue
    if (cluster.representative.leadOnly || cluster.representative.evidenceStatus !== 'READY') continue
    const domain = cluster.representative.publisherDomain
    const domainCount = domains.get(domain) ?? 0
    const topicCount = topics.get(cluster.topic) ?? 0
    if (domainCount >= policy.maxEventsPerDomain || topicCount >= policy.maxEventsPerTopic) continue
    selected.push(cluster)
    domains.set(domain, domainCount + 1)
    topics.set(cluster.topic, topicCount + 1)
    if (cluster.representative.sourceTier === 'TIER_1') tier1Sources += 1
  }

  const gaps: string[] = []
  if (selected.length < policy.minEvents) gaps.push('minimum-events-not-met')
  if (domains.size < policy.minDistinctDomains) gaps.push('minimum-distinct-domains-not-met')
  if (tier1Sources < policy.minTier1Sources) gaps.push('minimum-tier1-sources-not-met')
  return {
    selected,
    ready: gaps.length === 0,
    gaps,
    counts: { events: selected.length, distinctDomains: domains.size, tier1Sources },
  }
}

function compareRankedClusters(left: AiDailyRankedCluster, right: AiDailyRankedCluster) {
  if (left.scoreTotal !== right.scoreTotal) return right.scoreTotal - left.scoreTotal
  if (left.score.authority !== right.score.authority) return right.score.authority - left.score.authority
  if (left.score.corroboration !== right.score.corroboration) return right.score.corroboration - left.score.corroboration
  const published = compareOptionalDatesDesc(left.representative.publishedAt, right.representative.publishedAt)
  if (published !== 0) return published
  return left.representative.canonicalUrl.localeCompare(right.representative.canonicalUrl)
}

export interface AiDailyFreshnessInput {
  now: Date
  lastTier1CollectedAt: Date | null
  lastDiscoveredAt: Date | null
  lastFetchedAt: Date | null
  newestPublishedAt: Date | null
  selectedEvidenceFetchedAt: Date[]
  tier1DiscoveryLagsMs?: number[]
}

export interface AiDailyFreshnessResult {
  ready: boolean
  gaps: string[]
  metrics: {
    tier1CollectionAgeMs: number | null
    discoveryAgeMs: number | null
    fetchAgeMs: number | null
    endToEndLagMs: number | null
    tier1DiscoveryP95Ms: number | null
  }
}

export function evaluateAiDailyFreshness(input: AiDailyFreshnessInput): AiDailyFreshnessResult {
  const tier1CollectionAgeMs = ageMs(input.lastTier1CollectedAt, input.now)
  const discoveryAgeMs = ageMs(input.lastDiscoveredAt, input.now)
  const fetchAgeMs = ageMs(input.lastFetchedAt, input.now)
  const endToEndLagMs = input.newestPublishedAt ? Math.max(0, input.now.getTime() - input.newestPublishedAt.getTime()) : null
  const tier1DiscoveryP95Ms = percentile95(input.tier1DiscoveryLagsMs ?? [])
  const gaps: string[] = []
  if (tier1CollectionAgeMs === null || tier1CollectionAgeMs > 30 * 60_000) gaps.push('tier1-collection-stale')
  if (discoveryAgeMs === null || discoveryAgeMs > 150 * 60_000) gaps.push('broad-discovery-stale')
  if (fetchAgeMs === null || input.selectedEvidenceFetchedAt.length === 0) gaps.push('selected-evidence-not-fetched')
  if (input.selectedEvidenceFetchedAt.some((value) => Number.isNaN(value.getTime()))) gaps.push('selected-evidence-checkpoint-invalid')
  if (tier1DiscoveryP95Ms !== null && tier1DiscoveryP95Ms > 30 * 60_000) gaps.push('tier1-discovery-p95-missed')
  return {
    ready: gaps.length === 0,
    gaps,
    metrics: { tier1CollectionAgeMs, discoveryAgeMs, fetchAgeMs, endToEndLagMs, tier1DiscoveryP95Ms },
  }
}

export function lexicalSimilarity(left: string, right: string) {
  const leftTokens = tokenize(left)
  const rightTokens = tokenize(right)
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0
  let intersection = 0
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1
  return intersection / (leftTokens.size + rightTokens.size - intersection)
}

export function createAiDailyContentHash(value: string) {
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
  return createHash('sha256').update(normalized).digest('hex')
}

function tokenize(value: string) {
  return new Set(
    value
      .normalize('NFKC')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/gu)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  )
}

function recencyScore(publishedAt: Date | null, now: Date) {
  if (!publishedAt || Number.isNaN(publishedAt.getTime())) return 2
  const ageHours = Math.max(0, now.getTime() - publishedAt.getTime()) / 3_600_000
  if (ageHours <= 6) return 20
  if (ageHours <= 24) return 16
  if (ageHours <= 48) return 10
  if (ageHours <= 72) return 6
  return 0
}

function aiRelevanceScore(candidate: AiDailyEvidenceCandidate) {
  const combined = `${candidate.title} ${candidate.topics.join(' ')} ${candidate.evidenceText.slice(0, 1000)}`.toLowerCase()
  const signals = ['ai', 'llm', 'model', 'agent', 'rag', 'inference', 'embedding', '人工智能', '模型', '智能体']
  return clamp(signals.filter((signal) => combined.includes(signal)).length * 4, 4, 20)
}

function informationDensityScore(candidate: AiDailyEvidenceCandidate) {
  const lengthScore = Math.min(10, Math.floor(candidate.evidenceText.length / 800))
  const headingScore = Math.min(5, candidate.evidenceHeadingCount)
  return clamp(lengthScore + headingScore, 2, 15)
}

function sumScores(score: AiDailyScoreComponents) {
  return (
    score.authority +
    score.recency +
    score.aiRelevance +
    score.informationDensity +
    score.corroboration +
    score.novelty +
    score.diversityAdjustment
  )
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100
}

function percentile95(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0).sort((left, right) => left - right)
  if (valid.length === 0) return null
  return valid[Math.max(0, Math.ceil(valid.length * 0.95) - 1)] ?? null
}

function ageMs(value: Date | null, now: Date) {
  if (!value || Number.isNaN(value.getTime())) return null
  return Math.max(0, now.getTime() - value.getTime())
}

function compareOptionalDatesDesc(left: Date | null, right: Date | null) {
  if (left && right) return right.getTime() - left.getTime()
  if (left) return -1
  if (right) return 1
  return 0
}

function tierRank(value: AiDailySourceTierName) {
  return value === 'TIER_1' ? 0 : value === 'TIER_2' ? 1 : 2
}

function evidenceRank(value: AiDailyEvidenceCandidate['evidenceStatus']) {
  return value === 'READY' ? 0 : value === 'THIN' ? 1 : value === 'CONFLICTING' ? 2 : 3
}

function normalizeLocale(value: string) {
  const locale = value.trim().replace(/_/gu, '-')
  return /^[a-z]{2,3}(?:-[A-Z]{2})?$/u.test(locale) ? locale : ''
}

function normalizeDomain(value: string | null) {
  if (!value) return null
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//u, '').replace(/\/.*$/u, '')
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u.test(domain) ? domain : null
}

function normalizeStringList(values: string[], maxItems: number, maxLength: number) {
  return uniqueStrings(values.map((value) => boundedText(value, maxLength)).filter(Boolean)).slice(0, maxItems)
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values))
}

function boundedText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length <= maxLength ? value.trim() : ''
}

function boundedNullableText(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return null
  return boundedText(value, maxLength) || null
}

function readBoundedInteger(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeAiDailyUrlForComparison(value: string) {
  return canonicalizeAiDailySourceUrl(value)
}
