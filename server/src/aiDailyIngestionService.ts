import {
  type AiDailyDedupedCandidate,
  type AiDailyEvidenceCandidate,
  type AiDailyFreshnessInput,
  type AiDailyRankedCluster,
  type AiDailySelectionPolicy,
  type AiDailySourceFeedDefinition,
  buildAiDailyCollectionWindow,
  deduplicateAiDailyCandidates,
  defaultAiDailySelectionPolicy,
  evaluateAiDailyFreshness,
  groupAiDailyCandidates,
  rankAiDailyClusters,
  selectAiDailyClusters,
} from './aiDailyIngestion.js'

export const aiDailyIngestionPriorities = {
  approvedManualRerun: 100,
  tier1Collection: 90,
  evidenceFetchRetry: 80,
  dueComposition: 70,
  broadDiscovery: 60,
  tier2Collection: 50,
  tier3Collection: 40,
} as const

export interface AiDailyIngestionWorkPlanItem {
  kind: 'COLLECT_FEED'
  sourceFeedId: string
  priority: number
  availableAt: Date
  deadlineAt: Date
  freshnessTargetAt: Date
  continuationCursor: {
    windowStart: string
    windowEnd: string
    conditionalHeaders: Record<string, string>
  }
}

export function aiDailyIngestionDeadlineWindowMs(intervalMinutes: number) {
  return Math.max(60_000, Math.min(10 * 60_000, (intervalMinutes - 2) * 60_000))
}

export function buildAiDailyIngestionWorkPlan(input: {
  feeds: AiDailySourceFeedDefinition[]
  now: Date
}): AiDailyIngestionWorkPlanItem[] {
  return input.feeds
    .map((feed) => ({ feed, window: buildAiDailyCollectionWindow(feed, input.now) }))
    .filter(({ feed, window }) => Boolean(feed.id && window.due))
    .map(({ feed, window }) => {
      const deadlineWindowMs = aiDailyIngestionDeadlineWindowMs(feed.intervalMinutes)
      return {
        kind: 'COLLECT_FEED' as const,
        sourceFeedId: feed.id as string,
        priority: sourceFeedPriority(feed),
        availableAt: input.now,
        deadlineAt: new Date(input.now.getTime() + deadlineWindowMs),
        freshnessTargetAt: new Date(input.now.getTime() + feed.intervalMinutes * 60_000),
        continuationCursor: {
          windowStart: window.windowStart.toISOString(),
          windowEnd: window.windowEnd.toISOString(),
          conditionalHeaders: window.conditionalHeaders,
        },
      }
    })
    .sort((left, right) => right.priority - left.priority || left.sourceFeedId.localeCompare(right.sourceFeedId))
}

export interface AiDailyQualifiedSelection {
  deduped: AiDailyDedupedCandidate[]
  ranked: AiDailyRankedCluster[]
  selected: AiDailyRankedCluster[]
  ready: boolean
  gaps: string[]
  freshness: ReturnType<typeof evaluateAiDailyFreshness>
}

export function prepareAiDailyEvidenceSelection(input: {
  candidates: AiDailyEvidenceCandidate[]
  freshness: AiDailyFreshnessInput
  selectionPolicy?: AiDailySelectionPolicy
  recentCanonicalKeys?: Set<string>
  recentTitleFingerprints?: Set<string>
}): AiDailyQualifiedSelection {
  const deduped = deduplicateAiDailyCandidates(input.candidates)
  const clusters = groupAiDailyCandidates(deduped)
  const ranked = rankAiDailyClusters(clusters, {
    now: input.freshness.now,
    recentCanonicalKeys: input.recentCanonicalKeys,
    recentTitleFingerprints: input.recentTitleFingerprints,
  })
  const selection = selectAiDailyClusters(ranked, input.selectionPolicy ?? defaultAiDailySelectionPolicy)
  const freshness = evaluateAiDailyFreshness(input.freshness)
  const gaps = [...selection.gaps, ...freshness.gaps]
  return {
    deduped,
    ranked,
    selected: selection.selected,
    ready: selection.ready && freshness.ready,
    gaps,
    freshness,
  }
}

function sourceFeedPriority(feed: AiDailySourceFeedDefinition) {
  if (feed.kind === 'MANUAL') return aiDailyIngestionPriorities.approvedManualRerun
  if (feed.tier === 'TIER_1') return aiDailyIngestionPriorities.tier1Collection
  if (feed.tier === 'TIER_2') return aiDailyIngestionPriorities.tier2Collection
  return aiDailyIngestionPriorities.tier3Collection
}
