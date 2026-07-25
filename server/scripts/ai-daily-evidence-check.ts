import {
  AiDailyFetchError,
  type AiDailyHttpResponse,
  createAiDailyPinnedLookup,
  fetchAiDailyEvidence,
  fetchAiDailySourcePayload,
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

const pinnedLookup = createAiDailyPinnedLookup({ address: '93.184.216.34', family: 4 })
await new Promise<void>((resolve, reject) => {
  pinnedLookup('example.com', { all: true }, (error, addresses) => {
    if (error) return reject(error)
    assert(Array.isArray(addresses), 'Node all-address lookup must receive an address array')
    assertEqual(addresses[0]?.address, '93.184.216.34', 'pinned all-address lookup value')
    assertEqual(addresses[0]?.family, 4, 'pinned all-address lookup family')
    resolve()
  })
})
await new Promise<void>((resolve, reject) => {
  pinnedLookup('example.com', { all: false }, (error, address, family) => {
    if (error) return reject(error)
    assertEqual(address, '93.184.216.34', 'pinned single-address lookup value')
    assertEqual(family, 4, 'pinned single-address lookup family')
    resolve()
  })
})

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

const jsonLdPublishedAt = '2026-07-17T22:45:00.000Z'
const jsonLdEvidence = await fetchAiDailyEvidence({
  url: 'https://example.com/json-ld-release',
  now: aiDailyFixtureNow,
  locale: 'en-US',
  ...buildAiDailyHttpFixture({
    responses: [{
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: `<html><head><title>JSON-LD AI release</title><script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        datePublished: jsonLdPublishedAt,
      })}</script></head><body><article><h1>JSON-LD AI release</h1><p>${'Evidence-backed AI model release details. '.repeat(12)}</p></article></body></html>`,
    }],
  }),
})
assertEqual(jsonLdEvidence.publishedAt?.toISOString(), jsonLdPublishedAt, 'JSON-LD publication date extraction')

let sourceRequestHeaders: Record<string, string> = {}
const sourcePayload = await fetchAiDailySourcePayload({
  url: 'https://example.com/news',
  conditionalHeaders: { 'If-None-Match': '"source-v1"', 'If-Modified-Since': 'Fri, 24 Jul 2026 00:00:00 GMT' },
  resolveHost: async () => [{ address: '93.184.216.34', family: 4 }],
  robots: { async allowed() { return true } },
  transport: {
    async request(input) {
      sourceRequestHeaders = input.headers
      return {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', etag: '"source-v2"' },
        body: Buffer.from('<html><main><article><a href="/release">AI release</a></article></main></html>'),
      }
    },
  },
})
assertEqual(sourceRequestHeaders['If-None-Match'], '"source-v1"', 'source conditional ETag header')
assertEqual(sourceRequestHeaders['If-Modified-Since'], 'Fri, 24 Jul 2026 00:00:00 GMT', 'source conditional modified header')
assertEqual(sourcePayload.etag, '"source-v2"', 'source response ETag')
assertEqual(sourcePayload.notModified, false, 'source payload response state')
assert(sourcePayload.text.includes('AI release'), 'source payload body')

const notModifiedPayload = await fetchAiDailySourcePayload({
  url: 'https://example.com/news',
  ...buildAiDailyHttpFixture({ responses: [{ status: 304, headers: { etag: '"source-v2"' }, body: '' }] }),
  robots: { async allowed() { return true } },
})
assertEqual(notModifiedPayload.notModified, true, 'source 304 response state')
assertEqual(notModifiedPayload.text, '', 'source 304 response body')

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
