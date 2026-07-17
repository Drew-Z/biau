import {
  defaultAiDailySelectionPolicy,
  deduplicateAiDailyCandidates,
  groupAiDailyCandidates,
  rankAiDailyClusters,
  selectAiDailyClusters,
} from '../src/aiDailyIngestion.js'
import {
  aiDailyFixtureNow,
  buildAiDailyEvidenceCandidateFixture,
  buildAiDailySelectionFixtureCandidates,
} from '../src/aiDailyIngestionFixtures.js'
import { prepareAiDailyEvidenceSelection } from '../src/aiDailyIngestionService.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const candidates = buildAiDailySelectionFixtureCandidates()
const qualified = prepareAiDailyEvidenceSelection({
  candidates,
  freshness: {
    now: aiDailyFixtureNow,
    lastTier1CollectedAt: new Date('2026-07-17T23:45:00.000Z'),
    lastDiscoveredAt: new Date('2026-07-17T22:30:00.000Z'),
    lastFetchedAt: new Date('2026-07-17T23:58:00.000Z'),
    newestPublishedAt: new Date('2026-07-17T23:40:00.000Z'),
    selectedEvidenceFetchedAt: candidates.map(() => new Date('2026-07-17T23:58:00.000Z')),
    tier1DiscoveryLagsMs: [8, 12, 18].map((minutes) => minutes * 60_000),
  },
})
assert(qualified.ready, `qualified fixture should pass: ${qualified.gaps.join(',')}`)
assertEqual(qualified.selected.length, defaultAiDailySelectionPolicy.targetEvents, 'target event count')
assert(new Set(qualified.selected.map((cluster) => cluster.representative.publisherDomain)).size >= 3, 'domain diversity')
assert(qualified.selected.filter((cluster) => cluster.representative.sourceTier === 'TIER_1').length >= 2, 'tier 1 diversity')

const domainCounts = new Map<string, number>()
const topicCounts = new Map<string, number>()
for (const cluster of qualified.selected) {
  const domain = cluster.representative.publisherDomain
  domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1)
  topicCounts.set(cluster.topic, (topicCounts.get(cluster.topic) ?? 0) + 1)
}
assert([...domainCounts.values()].every((count) => count <= 2), 'per-domain quota')
assert([...topicCounts.values()].every((count) => count <= 3), 'per-topic quota')

const leadOnly = buildAiDailyEvidenceCandidateFixture({ index: 20, leadOnly: true, tier: 'TIER_1', title: 'Signal-only breaking AI claim' })
const rankedWithLead = rankAiDailyClusters(groupAiDailyCandidates(deduplicateAiDailyCandidates([...candidates, leadOnly])), {
  now: aiDailyFixtureNow,
})
const selectedWithLead = selectAiDailyClusters(rankedWithLead)
assert(!selectedWithLead.selected.some((cluster) => cluster.representative.id === leadOnly.id), 'lead-only signal exclusion')

const tieLeft = buildAiDailyEvidenceCandidateFixture({ index: 30, domain: 'a.example.com', title: 'Alpha agent runtime release', tier: 'TIER_1' })
const tieRight = {
  ...buildAiDailyEvidenceCandidateFixture({ index: 31, domain: 'b.example.com', title: 'Beta agent runtime release', tier: 'TIER_1' }),
  publishedAt: tieLeft.publishedAt,
  evidenceText: tieLeft.evidenceText,
  evidenceHeadingCount: tieLeft.evidenceHeadingCount,
}
const tied = rankAiDailyClusters(groupAiDailyCandidates(deduplicateAiDailyCandidates([tieRight, tieLeft])), {
  now: aiDailyFixtureNow,
})
assertEqual(tied[0]?.representative.canonicalUrl, tieLeft.canonicalUrl, 'stable canonical URL tie-break')

const insufficient = selectAiDailyClusters(qualified.ranked.slice(0, 2))
assert(!insufficient.ready && insufficient.gaps.includes('minimum-events-not-met'), 'insufficient evidence gap')

const diversityExtension = selectAiDailyClusters(qualified.ranked, {
  ...defaultAiDailySelectionPolicy,
  targetEvents: 2,
  minEvents: 2,
  maxEvents: 4,
  minDistinctDomains: 3,
  minTier1Sources: 2,
})
assertEqual(diversityExtension.selected.length, 3, 'selection may extend beyond target for minimum diversity')
assert(diversityExtension.ready, `diversity extension should satisfy the policy: ${diversityExtension.gaps.join(',')}`)

console.log('AI Daily ranking check passed')
