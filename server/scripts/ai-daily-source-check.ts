import {
  buildAiDailyCollectionWindow,
  normalizeAiDailySourceFeedDefinition,
  projectAiDailySourceHealth,
} from '../src/aiDailyIngestion.js'
import {
  aiDailyAtomFixture,
  aiDailyFixtureNow,
  aiDailyOfficialPageFixture,
  aiDailyRssFixture,
  buildAiDailySourceFeedFixture,
} from '../src/aiDailyIngestionFixtures.js'
import { aiDailyIngestionDeadlineWindowMs, buildAiDailyIngestionWorkPlan } from '../src/aiDailyIngestionService.js'
import { collectAiDailySourcePayload } from '../src/aiDailySourceAdapters.js'
import { assert, assertDeepEqual, assertEqual } from './ai-daily-check-helpers.js'

const tier1 = buildAiDailySourceFeedFixture()
assertEqual(tier1.intervalMinutes, 15, 'tier 1 cadence')
assertEqual(tier1.lookbackMinutes, 2160, 'tier 1 editorial lookback')
const window = buildAiDailyCollectionWindow(tier1, aiDailyFixtureNow)
assert(window.due, 'due tier 1 feed should produce work')
assertEqual(window.windowStart.toISOString(), '2026-07-16T11:45:00.000Z', '36-hour overlap window start')
assertDeepEqual(
  window.conditionalHeaders,
  { 'If-None-Match': '"fixture-etag"', 'If-Modified-Since': 'Fri, 17 Jul 2026 23:45:00 GMT' },
  'conditional request headers',
)

const rss = collectAiDailySourcePayload({ feed: tier1, payload: aiDailyRssFixture, window })
assertEqual(rss.length, 1, 'RSS lookback filtering')
assertEqual(rss[0]?.sourceExternalId, 'release-1', 'RSS stable external id')

const githubFeed = buildAiDailySourceFeedFixture({
  id: 'feed-github',
  name: 'GitHub releases',
  kind: 'GITHUB_RELEASES',
  url: 'https://github.com/example/agent/releases.atom',
  officialDomain: 'github.com',
})
const github = collectAiDailySourcePayload({
  feed: githubFeed,
  payload: aiDailyAtomFixture,
  window: buildAiDailyCollectionWindow(githubFeed, aiDailyFixtureNow),
})
assertEqual(github[0]?.providerKind, 'github-release', 'GitHub release adapter')

const officialFeed = buildAiDailySourceFeedFixture({
  id: 'feed-anthropic',
  name: 'Anthropic news',
  kind: 'OFFICIAL_PAGE',
  url: 'https://www.anthropic.com/news',
  officialDomain: 'anthropic.com',
})
const official = collectAiDailySourcePayload({
  feed: officialFeed,
  payload: aiDailyOfficialPageFixture,
  window: buildAiDailyCollectionWindow(officialFeed, aiDailyFixtureNow),
})
assertEqual(official.length, 1, 'official page adapter')
assertEqual(official[0]?.originalUrl, 'https://www.anthropic.com/news/context-systems', 'official relative URL')

const officialCards = collectAiDailySourcePayload({
  feed: officialFeed,
  payload: `<!doctype html><main>
    <a href="/news">Blog</a>
    <a href="/page/2">2</a>
    <article><h2><a href="/news/visible-date">Visible date release</a></h2><p>July 17, 2026</p></article>
    <article><h2><a href="/news/too-old">Old dated release</a></h2><p>July 15, 2026</p></article>
  </main>`,
  window: buildAiDailyCollectionWindow(officialFeed, aiDailyFixtureNow),
})
assertEqual(officialCards.length, 1, 'official cards filter navigation, numeric pagination, and stale entries')
assert(officialCards[0]?.publishedAt instanceof Date, 'visible card date extraction')

const hackerNewsFeed = buildAiDailySourceFeedFixture({
  id: 'feed-hn',
  name: 'Hacker News',
  kind: 'HACKER_NEWS',
  url: 'https://hacker-news.firebaseio.com/v0/newstories.json',
  tier: 'TIER_3',
  officialDomain: null,
})
const hackerNews = collectAiDailySourcePayload({
  feed: hackerNewsFeed,
  payload: JSON.stringify([{ id: 42, title: 'Agent release discussion', url: 'https://example.com/agent', created_at: '2026-07-17T23:50:00Z' }]),
  window: buildAiDailyCollectionWindow(hackerNewsFeed, aiDailyFixtureNow),
})
assertEqual(hackerNews[0]?.leadOnly, true, 'Hacker News remains lead-only')

const apiFeed = buildAiDailySourceFeedFixture({
  id: 'feed-api',
  name: 'AI release API',
  kind: 'API',
  url: 'https://example.com/api/releases',
  tier: 'TIER_2',
  officialDomain: 'example.com',
})
const apiCandidates = collectAiDailySourcePayload({
  feed: apiFeed,
  payload: JSON.stringify({ items: [{ id: 'api-1', title: 'Structured API release', url: '/releases/api-1', published_at: '2026-07-17T23:45:00Z' }] }),
  window: buildAiDailyCollectionWindow(apiFeed, aiDailyFixtureNow),
})
assertEqual(apiCandidates.length, 1, 'JSON API payload parsing')
assertEqual(apiCandidates[0]?.originalUrl, 'https://example.com/releases/api-1', 'JSON API relative URL')

const undatedOfficial = collectAiDailySourcePayload({
  feed: officialFeed,
  payload: '<html><main><article><a href="/news/undated">Older item</a></article></main></html>',
  window: buildAiDailyCollectionWindow(officialFeed, aiDailyFixtureNow),
})
assertEqual(undatedOfficial[0]?.leadOnly, true, 'undated listing item must remain lead-only')

const manualFeed = buildAiDailySourceFeedFixture({
  id: 'feed-manual',
  name: 'Approved manual source',
  kind: 'MANUAL',
  url: 'https://example.com/manual-source',
  tier: 'TIER_1',
  officialDomain: 'example.com',
})
const workPlan = buildAiDailyIngestionWorkPlan({ feeds: [hackerNewsFeed, tier1, manualFeed], now: aiDailyFixtureNow })
assertDeepEqual(
  workPlan.map((item) => [item.sourceFeedId, item.priority]),
  [
    ['feed-manual', 100],
    ['feed-openai-releases', 90],
    ['feed-hn', 40],
  ],
  'source work priority order',
)
assert(
  workPlan.every((item) => item.deadlineAt.getTime() < item.freshnessTargetAt.getTime()),
  'work deadlines must remain shorter than schedule intervals',
)
assertEqual(aiDailyIngestionDeadlineWindowMs(15), 10 * 60_000, '15-minute deadline window')
assert(aiDailyIngestionDeadlineWindowMs(15) < 15 * 60_000, 'CLI deadline must remain shorter than a 15-minute interval')

const failedHealth = projectAiDailySourceHealth(
  { intervalMinutes: 15, consecutiveFailures: 2, lastSuccessfulAt: tier1.lastSuccessfulAt },
  { success: false, attemptedAt: aiDailyFixtureNow, errorCategory: 'timeout' },
)
assertEqual(failedHealth.healthStatus, 'FAILING', 'third consecutive failure health')
assertEqual(failedHealth.lastErrorCategory, 'timeout', 'sanitized source error category')

const invalid = normalizeAiDailySourceFeedDefinition({
  name: '',
  kind: 'RSS',
  url: 'file:///private/feed',
  tier: 'TIER_1',
  topics: [],
})
assert(!invalid.ok && invalid.issues.includes('url-invalid'), 'invalid source registry input should fail closed')

const invalidLookback = normalizeAiDailySourceFeedDefinition({
  name: 'Invalid cadence',
  kind: 'RSS',
  url: 'https://example.com/feed.xml',
  tier: 'TIER_1',
  topics: ['models'],
  intervalMinutes: 120,
  lookbackMinutes: 30,
})
assert(!invalidLookback.ok && invalidLookback.issues.includes('lookback-minutes-invalid'), 'lookback must cover cadence')

const derivedLookback = normalizeAiDailySourceFeedDefinition({
  name: 'Derived lookback',
  kind: 'RSS',
  url: 'https://example.com/derived.xml',
  tier: 'TIER_1',
  topics: ['models'],
  intervalMinutes: 120,
})
assert(derivedLookback.ok, 'omitted lookback should derive a valid overlap')
assertEqual(derivedLookback.feed.lookbackMinutes, 2160, 'derived lookback keeps the editorial window')

console.log('AI Daily source check passed')
