import {
  AiDailyAdapterError,
  type AiDailyCandidateLeadInput,
  type AiDailyDiscoveryRequest,
  runAiDailyDiscovery,
} from '../src/aiDailyIngestion.js'
import { aiDailyFixtureNow, buildAiDailyDiscoveryAdapterFixture } from '../src/aiDailyIngestionFixtures.js'
import { assert, assertDeepEqual, assertEqual } from './ai-daily-check-helpers.js'

const request: AiDailyDiscoveryRequest = {
  queryGroup: 'frontier-models',
  queries: ['AI model releases', 'agent platform updates'],
  windowStart: new Date('2026-07-17T22:00:00.000Z'),
  windowEnd: aiDailyFixtureNow,
  locale: 'en-US',
  includeDomains: [],
  excludeDomains: [],
  budget: { maxRequests: 2, maxResults: 10, timeoutMs: 8_000, maxRetries: 1, maxCostUnits: 10 },
}

const lead = (id: string, url: string): AiDailyCandidateLeadInput => ({
  id,
  providerKind: 'fixture-search',
  originalUrl: url,
  title: `AI model release ${id}`,
  publisher: new URL(url).hostname,
  publishedAt: new Date('2026-07-17T23:30:00.000Z'),
  locale: 'en-US',
  sourceTier: 'TIER_2',
  topics: ['models'],
})

const result = await runAiDailyDiscovery({
  request,
  minimumPrimaryResults: 3,
  includeSignal: true,
  primary: buildAiDailyDiscoveryAdapterFixture({
    id: 'brave',
    slot: 'primary',
    candidates: [lead('a', 'https://example.com/a'), lead('b', 'https://example.com/b')],
  }),
  fallback: buildAiDailyDiscoveryAdapterFixture({
    id: 'tavily',
    slot: 'fallback',
    candidates: [lead('duplicate', 'https://example.com/a?utm_source=tavily'), lead('c', 'https://example.net/c')],
  }),
  signal: buildAiDailyDiscoveryAdapterFixture({
    id: 'x-search',
    slot: 'signal',
    candidates: [lead('signal', 'https://example.org/signal')],
  }),
})
assert(result.ready, 'primary discovery success should be production-capable')
assertEqual(result.redundancy, 'full', 'configured fallback redundancy')
assertEqual(result.candidates.length, 4, 'canonical discovery dedupe')
assert(result.candidates.find((candidate) => candidate.providerRole === 'signal')?.leadOnly, 'signal must remain lead-only')
assertDeepEqual(
  result.attempts.map((attempt) => attempt.providerId),
  ['brave', 'tavily', 'x-search'],
  'providers execute primary then bounded fallback then optional signal',
)

const reduced = await runAiDailyDiscovery({
  request,
  minimumPrimaryResults: 3,
  primary: buildAiDailyDiscoveryAdapterFixture({ id: 'brave', slot: 'primary', candidates: [lead('a', 'https://example.com/a')] }),
})
assertEqual(reduced.redundancy, 'reduced_redundancy', 'missing fallback status')
assert(reduced.gaps.includes('fallback-not-configured'), 'missing Tavily should be visible')

const failedFallback = await runAiDailyDiscovery({
  request,
  minimumPrimaryResults: 3,
  primary: buildAiDailyDiscoveryAdapterFixture({
    id: 'brave',
    slot: 'primary',
    candidates: [lead('a', 'https://example.com/a')],
  }),
  fallback: buildAiDailyDiscoveryAdapterFixture({
    id: 'tavily',
    slot: 'fallback',
    error: new AiDailyAdapterError('rate_limited'),
  }),
})
assertEqual(failedFallback.redundancy, 'reduced_redundancy', 'failed fallback redundancy')
assert(failedFallback.gaps.includes('fallback-rate_limited'), 'failed fallback category should be visible')

const failedPrimary = await runAiDailyDiscovery({
  request,
  primary: buildAiDailyDiscoveryAdapterFixture({
    id: 'brave',
    slot: 'primary',
    error: new AiDailyAdapterError('timeout'),
  }),
  fallback: buildAiDailyDiscoveryAdapterFixture({
    id: 'tavily',
    slot: 'fallback',
    candidates: [lead('fallback', 'https://fallback.example.com/item')],
  }),
})
assert(!failedPrimary.ready, 'fallback results cannot hide primary production failure')
assertEqual(failedPrimary.attempts[0]?.errorCategory, 'timeout', 'provider failure category is sanitized')

let called = false
const missingPrimary = await runAiDailyDiscovery({
  request,
  fallback: {
    id: 'unused-fallback',
    slot: 'fallback',
    async discover() {
      called = true
      return []
    },
  },
})
assertEqual(missingPrimary.redundancy, 'primary_unavailable', 'missing primary readiness')
assertEqual(called, false, 'configuration readiness must not ping fallback providers')

console.log('AI Daily discovery check passed')
