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
assertEqual(qualified.selected[0]?.representative.sourceTier, 'TIER_1', 'official evidence remains preferred by authority score')

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

const topicTaggedNoise = {
  ...buildAiDailyEvidenceCandidateFixture({
    index: 21,
    tier: 'TIER_1',
    topic: 'ai-infrastructure',
    title: 'OpenTelemetry has graduated now what',
  }),
  evidenceText: 'The observability project describes its governance, contributor community, and graduation milestones.'.repeat(12),
}
const kimiRaceNoise = {
  ...buildAiDailyEvidenceCandidateFixture({
    index: 22,
    tier: 'TIER_1',
    topic: 'china-ai-releases',
    title: 'Kimi Antonelli risks grid drop after qualifying investigation',
  }),
  evidenceText: 'The Formula One driver faces a possible grid penalty after the stewards opened an investigation.'.repeat(12),
}
const mentalHealthNoise = {
  ...buildAiDailyEvidenceCandidateFixture({
    index: 23,
    tier: 'TIER_1',
    topic: 'ai-infrastructure',
    title: 'AI for mental health relies on careful human support',
  }),
  evidenceText: 'The opinion column discusses therapy, wellbeing, clinical care, and responsible human support.'.repeat(12),
}
const dailySubstringNoise = {
  ...buildAiDailyEvidenceCandidateFixture({
    index: 24,
    tier: 'TIER_1',
    topic: 'frontier-model-releases',
    title: 'Daily release calendar for technology conferences',
  }),
  evidenceText: 'The calendar lists conference dates, venues, speakers, and registration deadlines.'.repeat(12),
}
const rankedNoise = rankAiDailyClusters(
  groupAiDailyCandidates(deduplicateAiDailyCandidates([topicTaggedNoise, kimiRaceNoise, mentalHealthNoise, dailySubstringNoise])),
  { now: aiDailyFixtureNow },
)
assert(rankedNoise.every((cluster) => cluster.score.aiRelevance === 0), 'topic labels and substring collisions cannot manufacture AI relevance')
assertEqual(selectAiDailyClusters(rankedNoise).selected.length, 0, 'irrelevant high-authority candidates fail the explicit AI relevance floor')

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

const editorialOnlyTitles = [
  'AI reasoning API adds bounded tool controls',
  'Open source language model publishes new weights',
  'Agent workflow tracing benchmark compares runtimes',
  'GPU inference platform reports lower serving latency',
  'Multimodal evaluation dataset expands safety coverage',
  'Vector database update improves hybrid retrieval',
]
const editorialOnlyCandidates = editorialOnlyTitles.map((title, offset) => buildAiDailyEvidenceCandidateFixture({
  index: 40 + offset,
  domain: `editorial${offset + 1}.example.com`,
  tier: 'TIER_2',
  title,
}))
const editorialOnly = selectAiDailyClusters(rankAiDailyClusters(
  groupAiDailyCandidates(deduplicateAiDailyCandidates(editorialOnlyCandidates)),
  { now: aiDailyFixtureNow },
))
assert(editorialOnly.ready, `ready original-page editorial evidence should not depend on a fixed official-source quota: ${editorialOnly.gaps.join(',')}`)
assertEqual(editorialOnly.counts.tier1Sources, 0, 'editorial-only fixture has no official source')
assert(editorialOnly.selected.length >= defaultAiDailySelectionPolicy.minEvents, 'editorial-only fixture satisfies the event floor')

const diversityExtension = selectAiDailyClusters(qualified.ranked, {
  ...defaultAiDailySelectionPolicy,
  targetEvents: 2,
  minEvents: 2,
  maxEvents: 4,
  minDistinctDomains: 3,
})
assertEqual(diversityExtension.selected.length, 3, 'selection may extend beyond target for minimum diversity')
assert(diversityExtension.ready, `diversity extension should satisfy the policy: ${diversityExtension.gaps.join(',')}`)

console.log('AI Daily ranking check passed')
