import {
  AiDailyFetchError,
  type AiDailyHttpResponse,
  fetchAiDailyEvidence,
  isPublicAddress,
  resolveAiDailyPublicHost,
  validateAiDailyTargetUrl,
} from '../src/aiDailySafeFetch.js'
import {
  aiDailyEvidenceHtmlFixture,
  aiDailyFixtureNow,
  buildAiDailyHttpFixture,
} from '../src/aiDailyIngestionFixtures.js'
import { assert, assertEqual, expectFailure } from './ai-daily-check-helpers.js'

assertEqual(validateAiDailyTargetUrl('https://example.com/news').hostname, 'example.com', 'public target URL')
assert(isPublicAddress('93.184.216.34'), 'public IPv4 should be accepted')
assert(!isPublicAddress('127.0.0.1'), 'loopback IPv4 should be rejected')
assert(!isPublicAddress('::1'), 'loopback IPv6 should be rejected')
await expectFailure(() => resolveAiDailyPublicHost('127.0.0.1'), 'unsafe_url', 'private literal resolution')
await expectFailure(() => validateAiDailyTargetUrl('http://user:pass@example.com/private'), 'unsafe_url', 'URL credentials')
await expectFailure(() => validateAiDailyTargetUrl('http://metadata.internal/latest'), 'unsafe_url', 'internal hostname')

const directFixture = buildAiDailyHttpFixture({
  responses: [{ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: aiDailyEvidenceHtmlFixture }],
})
const direct = await fetchAiDailyEvidence({
  url: 'https://openai.com/index/new-reasoning-model',
  now: aiDailyFixtureNow,
  locale: 'en-US',
  ...directFixture,
})
assertEqual(direct.extractionMethod, 'DIRECT', 'direct evidence method')
assertEqual(direct.status, 'READY', 'direct evidence readiness')
assert(direct.normalizedBytes <= 64 * 1024, 'evidence normalized body limit')
assert(Buffer.byteLength(direct.excerpt) <= 1024, 'citation excerpt limit')
assertEqual(direct.headings[1], 'API availability', 'structured heading extraction')

const redirectFixture = buildAiDailyHttpFixture({
  responses: [{ status: 302, headers: { location: 'http://127.0.0.1/private' }, body: '' }],
})
await expectFailure(
  () => fetchAiDailyEvidence({ url: 'https://example.com/start', now: aiDailyFixtureNow, ...redirectFixture }),
  'unsafe_url',
  'redirect target must be revalidated',
)

let redirectedRequestCount = 0
await expectFailure(
  () =>
    fetchAiDailyEvidence({
      url: 'https://example.com/start',
      now: aiDailyFixtureNow,
      resolveHost: async () => [{ address: '93.184.216.34', family: 4 }],
      transport: {
        async request(): Promise<AiDailyHttpResponse> {
          redirectedRequestCount += 1
          return redirectedRequestCount === 1
            ? { status: 302, headers: { location: 'https://blocked.example.net/article' }, body: Buffer.alloc(0) }
            : { status: 200, headers: { 'content-type': 'text/html' }, body: Buffer.from(aiDailyEvidenceHtmlFixture) }
        },
      },
      robots: {
        async allowed(url) {
          return url.hostname !== 'blocked.example.net'
        },
      },
    }),
  'robots_disallowed',
  'redirect destination robots policy',
)
assertEqual(redirectedRequestCount, 1, 'redirect destination is checked before its page fetch')

const renderedFixture = buildAiDailyHttpFixture({
  responses: [{ status: 200, headers: { 'content-type': 'application/pdf' }, body: 'not supported' }],
})
const rendered = await fetchAiDailyEvidence({
  url: 'https://example.com/rendered',
  now: aiDailyFixtureNow,
  ...renderedFixture,
  firecrawl: {
    id: 'firecrawl',
    async extract() {
      return {
        title: 'Rendered agent platform update',
        publisher: 'Example',
        publishedAt: '2026-07-17T23:00:00Z',
        text: 'Rendered evidence about an AI agent platform, its API, release scope, safety evaluation, and deployment guidance. '.repeat(8),
        headings: ['Release', 'API'],
      }
    },
  },
})
assertEqual(rendered.extractionMethod, 'FIRECRAWL', 'selected page extraction fallback')

let transportCalled = false
await expectFailure(
  () =>
    fetchAiDailyEvidence({
      url: 'https://example.com/disallowed',
      now: aiDailyFixtureNow,
      resolveHost: async () => [{ address: '93.184.216.34', family: 4 }],
      transport: { async request() { transportCalled = true; throw new AiDailyFetchError('network_error') } },
      robots: { async allowed() { return false } },
    }),
  'robots_disallowed',
  'robots opt-out',
)
assertEqual(transportCalled, false, 'robots denial happens before page fetch')

const oversizedFixture = buildAiDailyHttpFixture({
  responses: [{ status: 200, headers: { 'content-type': 'text/plain' }, body: 'x'.repeat(500) }],
})
await expectFailure(
  () =>
    fetchAiDailyEvidence({
      url: 'https://example.com/oversized',
      now: aiDailyFixtureNow,
      ...oversizedFixture,
      options: { maxDecodedBytes: 100 },
    }),
  'evidence_rejected',
  'decoded body limit',
)

const jsFixture = buildAiDailyHttpFixture({
  responses: [{ status: 200, headers: { 'content-type': 'text/html' }, body: '<html><body><div id="app"></div><script></script><script></script><script></script></body></html>' }],
})
const tavily = await fetchAiDailyEvidence({
  url: 'https://example.com/js-app',
  now: aiDailyFixtureNow,
  ...jsFixture,
  tavily: {
    id: 'tavily-extract',
    async extract() {
      return {
        title: 'JavaScript agent release',
        text: 'Authoritative extracted evidence for an AI agent release, including implementation, API behavior, evaluation results, and deployment notes. '.repeat(7),
      }
    },
  },
})
assertEqual(tavily.extractionMethod, 'TAVILY', 'render-required fallback')

console.log('AI Daily evidence check passed')
