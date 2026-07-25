import type { AiDailyDiscoveryRequest } from '../src/aiDailyIngestion.js'
import {
  createAiDailyDiscoveryRuntime,
  createGdeltDiscoveryAdapter,
  createHackerNewsAlgoliaDiscoveryAdapter,
  createHotDailyDiscoveryAdapter,
  createTheNewsApiDiscoveryAdapter,
} from '../src/aiDailyDiscoveryProviders.js'
import { assert, assertDeepEqual, assertEqual } from './ai-daily-check-helpers.js'

const request = (queryGroup: string): AiDailyDiscoveryRequest => ({
  queryGroup,
  queries: ['AI model release official API'],
  windowStart: new Date('2026-07-24T00:00:00.000Z'),
  windowEnd: new Date('2026-07-25T12:00:00.000Z'),
  locale: queryGroup === 'china-ai-releases' ? 'zh' : 'en',
  includeDomains: [],
  excludeDomains: ['blocked.example.com'],
  budget: { maxRequests: 2, maxResults: 10, timeoutMs: 8_000, maxRetries: 1, maxCostUnits: 10 },
})

const secretToken = 'fixture-token-that-must-not-leak'
let theNewsUrl = ''
const theNews = createTheNewsApiDiscoveryAdapter({
  token: secretToken,
  fetchPayload: async ({ url }) => {
    theNewsUrl = url
    return {
      data: [{
        uuid: 'news-1',
        title: 'A new AI model API launches',
        url: 'https://publisher.example.com/model-launch',
        source: 'Publisher',
        language: 'en',
        published_at: '2026-07-25T08:00:00Z',
        description: 'Aggregator description used only as lead metadata.',
      }],
    }
  },
})
const theNewsCandidates = await theNews.discover(request('frontier-model-releases'))
assert(new URL(theNewsUrl).searchParams.get('api_token') === secretToken, 'The News API request injects its token server-side')
assertEqual(theNewsCandidates.length, 1, 'The News API candidate projection')
assertEqual(theNewsCandidates[0]?.leadOnly, false, 'dated The News API result can advance after original-page evidence')
assert(!JSON.stringify(theNewsCandidates).includes(secretToken), 'The News API token must not enter candidate data')

const gdelt = createGdeltDiscoveryAdapter({
  fetchPayload: async () => ({
    articles: [{
      title: 'AI infrastructure release',
      url: 'https://research.example.com/infrastructure',
      domain: 'research.example.com',
      seendate: '20260725T070000Z',
    }],
  }),
})
const gdeltCandidates = await gdelt.discover(request('ai-infrastructure'))
assertEqual(gdeltCandidates[0]?.leadOnly, true, 'GDELT remains a lead until the original page is fetched')
assertEqual(gdeltCandidates[0]?.snippet, null, 'GDELT snippets are not imported as evidence')

const hackerNews = createHackerNewsAlgoliaDiscoveryAdapter({
  fetchPayload: async () => ({
    hits: [{ objectID: 'hn-1', title: 'Agent runtime launch', url: 'https://engineering.example.com/agent-runtime' }],
  }),
})
const hackerNewsCandidates = await hackerNews.discover(request('frontier-model-releases'))
assertEqual(hackerNewsCandidates[0]?.leadOnly, true, 'Hacker News remains a signal lead')
assertEqual(hackerNewsCandidates[0]?.snippet, null, 'Hacker News text is not imported as evidence')

let hotDailyFetches = 0
const hotDaily = createHotDailyDiscoveryAdapter({
  fetchPayload: async () => {
    hotDailyFetches += 1
    return {
      items: [
        {
          id: 'hot-frontier',
          source: 'hacker-news',
          externalId: 'frontier-1',
          title: 'OpenAI announces a new agent model',
          url: 'https://openai.example.com/agent-model',
          reason: 'Generated value judgment that BIAU must discard.',
          summaryZh: 'Generated summary that BIAU must discard.',
          valueLight: 'green',
        },
        {
          id: 'hot-open-source',
          source: 'lobsters',
          externalId: 'open-1',
          title: 'Open-source Llama inference runtime released',
          url: 'https://opensource.example.com/llama-runtime',
        },
        {
          id: 'hot-china',
          source: 'hacker-news',
          externalId: 'china-1',
          title: 'Kimi K3 model update ships today',
          url: 'https://china-ai.example.com/kimi-k3',
        },
        {
          id: 'hot-unrelated',
          source: 'lobsters',
          externalId: 'rust-1',
          title: 'Delightful integration tests in Rust',
          url: 'https://rust.example.com/integration-tests',
        },
      ],
    }
  },
})
const frontierHotDaily = await hotDaily.discover(request('frontier-model-releases'))
const openSourceHotDaily = await hotDaily.discover(request('open-source-ai'))
const chinaHotDaily = await hotDaily.discover(request('china-ai-releases'))
assertEqual(hotDailyFetches, 1, 'HotDaily response is cached across query groups for ten minutes')
assertDeepEqual(
  [frontierHotDaily[0]?.title, openSourceHotDaily[0]?.title, chinaHotDaily[0]?.title],
  ['OpenAI announces a new agent model', 'Open-source Llama inference runtime released', 'Kimi K3 model update ships today'],
  'HotDaily title-only AI routing avoids cross-group duplicates',
)
assertEqual(frontierHotDaily[0]?.sourceExternalId, 'hacker-news:frontier-1', 'HotDaily preserves the community source')
assertEqual(frontierHotDaily[0]?.leadOnly, true, 'HotDaily remains a signal lead')
assertEqual(frontierHotDaily[0]?.snippet, null, 'HotDaily generated summaries and judgments are discarded')
assert(!JSON.stringify(frontierHotDaily).includes('Generated'), 'HotDaily generated fields must not enter candidate data')

const enabledRuntime = createAiDailyDiscoveryRuntime({
  theNewsApiEnabled: true,
  theNewsApiToken: secretToken,
  hotDailyEnabled: true,
  fetchPayload: async () => ({}),
})
assertEqual(enabledRuntime.primary.id, 'the-news-api', 'The News API is the optional primary')
assertEqual(enabledRuntime.fallback?.id, 'gdelt-doc', 'GDELT is the no-key fallback')
assertDeepEqual(enabledRuntime.signals.map((adapter) => adapter.id), ['hacker-news-algolia', 'hotdaily-public-api'], 'signal adapter order')
assert(!JSON.stringify(enabledRuntime.diagnostics).includes(secretToken), 'runtime diagnostics must not expose provider tokens')

const noKeyRuntime = createAiDailyDiscoveryRuntime({
  theNewsApiEnabled: true,
  theNewsApiToken: '',
  hotDailyEnabled: false,
  fetchPayload: async () => ({}),
})
assertEqual(noKeyRuntime.primary.id, 'gdelt-doc', 'GDELT becomes primary when The News API has no usable token')
assertEqual(noKeyRuntime.fallback, null, 'no synthetic fallback is invented')
assertDeepEqual(noKeyRuntime.signals.map((adapter) => adapter.id), ['hacker-news-algolia'], 'HotDaily can be disabled explicitly')
assert(noKeyRuntime.diagnostics.includes('the-news-api-token-missing'), 'missing optional token is visible without leaking its value')

console.log('AI Daily discovery provider check passed (networkCalls=0)')
