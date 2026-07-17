import { evaluateAiDailyFreshness } from '../src/aiDailyIngestion.js'
import { aiDailyFixtureNow } from '../src/aiDailyIngestionFixtures.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const ready = evaluateAiDailyFreshness({
  now: aiDailyFixtureNow,
  lastTier1CollectedAt: new Date('2026-07-17T23:40:00.000Z'),
  lastDiscoveredAt: new Date('2026-07-17T22:00:00.000Z'),
  lastFetchedAt: new Date('2026-07-17T23:55:00.000Z'),
  newestPublishedAt: new Date('2026-07-17T23:30:00.000Z'),
  selectedEvidenceFetchedAt: [new Date('2026-07-17T23:55:00.000Z')],
  tier1DiscoveryLagsMs: [5, 10, 12, 20, 25].map((minutes) => minutes * 60_000),
})
assert(ready.ready, `fresh production checkpoints should pass: ${ready.gaps.join(',')}`)
assertEqual(ready.metrics.tier1DiscoveryP95Ms, 25 * 60_000, 'tier 1 discovery p95')

const stale = evaluateAiDailyFreshness({
  now: aiDailyFixtureNow,
  lastTier1CollectedAt: new Date('2026-07-17T22:00:00.000Z'),
  lastDiscoveredAt: new Date('2026-07-17T20:00:00.000Z'),
  lastFetchedAt: null,
  newestPublishedAt: new Date('2026-07-17T18:00:00.000Z'),
  selectedEvidenceFetchedAt: [],
  tier1DiscoveryLagsMs: [10, 20, 31].map((minutes) => minutes * 60_000),
})
for (const gap of [
  'tier1-collection-stale',
  'broad-discovery-stale',
  'selected-evidence-not-fetched',
  'tier1-discovery-p95-missed',
]) {
  assert(stale.gaps.includes(gap), `stale checkpoint should expose ${gap}`)
}
assert(!stale.ready, 'stale checkpoints must map to a gap outcome')

console.log('AI Daily freshness check passed')
