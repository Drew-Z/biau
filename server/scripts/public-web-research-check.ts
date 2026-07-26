import assert from 'node:assert/strict'
import { AiDailyFetchError, type AiDailyEvidenceDocumentInput } from '../src/aiDailySafeFetch.js'
import {
  researchPublicWeb,
  type PublicWebResearchConfig,
} from '../src/publicWebResearch.js'

const now = new Date('2026-07-26T08:00:00.000Z')
const config: PublicWebResearchConfig = {
  provider: 'exa',
  baseUrl: 'https://exa.example.com',
  apiKey: 'fixture-key',
  timeoutMs: 100,
  maxResults: 8,
  maxPages: 4,
}

function makeEvidence(input: {
  originalUrl: string
  canonicalUrl: string
  title: string
  text: string
  status?: 'READY' | 'THIN'
}): AiDailyEvidenceDocumentInput {
  return {
    extractionMethod: 'DIRECT',
    originalUrl: input.originalUrl,
    canonicalUrl: input.canonicalUrl,
    title: input.title,
    publisher: 'Fixture publisher',
    author: null,
    publishedAt: now,
    fetchedAt: now,
    locale: 'en',
    contentType: 'text/html',
    contentHash: 'fixture-hash',
    headings: ['Evidence section'],
    normalizedText: input.text,
    excerpt: input.text.slice(0, 180),
    normalizedBytes: Buffer.byteLength(input.text),
    status: input.status ?? 'READY',
    expiresAt: new Date('2026-08-25T08:00:00.000Z'),
  }
}

let searchRequest: { url: string; init?: RequestInit } | null = null
const fetchedUrls: string[] = []
const result = await researchPublicWeb(['  current agentic rag '.repeat(40)], undefined, {
  config,
  now: () => now,
  searchFetch: async (input, init) => {
    searchRequest = { url: String(input), init }
    return new Response(JSON.stringify({
      results: [
        { title: '  Discovery title  ', url: 'https://example.com/article?utm_source=one', publishedDate: '2026-07-25' },
        { title: 'Duplicate', url: 'https://example.com/article?utm_source=two', publishedDate: 'invalid' },
        { url: 'https://second.example.com/news' },
        { title: 'Thin page', url: 'https://third.example.com/brief' },
        { title: 'Localhost', url: 'https://localhost/private' },
        { title: 'Private IP', url: 'https://127.0.0.1/private' },
        { title: 'Internal host', url: 'https://metadata.internal/latest' },
        { title: 'Credentials', url: 'https://user:pass@example.com/private' },
        { title: 'HTTP', url: 'http://example.com/plain' },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  },
  fetchEvidence: async (input) => {
    fetchedUrls.push(input.url)
    if (input.url.includes('second.example.com')) throw new AiDailyFetchError('fetch_empty')
    if (input.url.includes('third.example.com')) {
      return makeEvidence({
        originalUrl: input.url,
        canonicalUrl: 'https://third.example.com/brief',
        title: 'Fetched thin title',
        text: 'Thin original page marker '.repeat(20),
        status: 'THIN',
      })
    }
    return makeEvidence({
      originalUrl: input.url,
      canonicalUrl: 'https://example.com/article',
      title: 'Fetched original title',
      text: 'Original page marker '.repeat(40),
    })
  },
})

assert.equal(searchRequest?.url, 'https://exa.example.com/search')
assert.equal((searchRequest?.init?.headers as Record<string, string>)['x-api-key'], 'fixture-key')
const searchBody = JSON.parse(String(searchRequest?.init?.body)) as { query: string; numResults: number }
assert.equal(searchBody.query.length, 300)
assert.equal(searchBody.numResults, 8)
assert.deepEqual(fetchedUrls, [
  'https://example.com/article?utm_source=one',
  'https://second.example.com/news',
  'https://third.example.com/brief',
])
assert.equal(result.evidence.length, 2)
assert.equal(result.evidence[0]?.title, 'Fetched original title')
assert.match(result.evidence[0]?.text ?? '', /Original page marker/u)
assert.equal(result.evidence[0]?.citation.evidenceStatus, 'verified')
assert.equal(result.evidence[1]?.citation.evidenceStatus, 'partial')
assert.equal(result.diagnostic, undefined)

let unsafeFetchCount = 0
const unsafe = await researchPublicWeb(['unsafe'], undefined, {
  config,
  searchFetch: async () => new Response(JSON.stringify({ results: [
    { title: 'Localhost', url: 'https://localhost/private' },
    { title: 'Private IP', url: 'https://10.0.0.1/private' },
    { title: 'Internal host', url: 'https://metadata.internal/latest' },
    { title: 'HTTP', url: 'http://example.com/plain' },
  ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  fetchEvidence: async () => {
    unsafeFetchCount += 1
    throw new Error('unsafe URL reached fetchEvidence')
  },
})
assert.equal(unsafe.diagnostic, 'invalid_response')
assert.equal(unsafeFetchCount, 0)

for (const payload of [null, {}, { results: [] }, { results: [{ title: '', url: 'not-a-url' }] }]) {
  const invalid = await researchPublicWeb(['invalid'], undefined, {
    config,
    searchFetch: async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    fetchEvidence: async () => { throw new Error('invalid response must not fetch evidence') },
  })
  assert.equal(invalid.diagnostic, 'invalid_response')
  assert.equal(invalid.evidence.length, 0)
}

const httpFailure = await researchPublicWeb(['failure'], undefined, {
  config,
  searchFetch: async () => new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } }),
})
assert.equal(httpFailure.diagnostic, 'http_status')

const timeout = await researchPublicWeb(['timeout'], undefined, {
  config: { ...config, timeoutMs: 5 },
  searchFetch: (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
  }),
})
assert.equal(timeout.diagnostic, 'timeout')

let unconfiguredFetchCount = 0
const unconfigured = await researchPublicWeb(['no config'], undefined, {
  config: { ...config, apiKey: '' },
  searchFetch: async () => {
    unconfiguredFetchCount += 1
    return new Response('{}')
  },
})
assert.equal(unconfigured.available, false)
assert.equal(unconfigured.diagnostic, 'not_configured')
assert.equal(unconfiguredFetchCount, 0)

const abortedController = new AbortController()
abortedController.abort()
const aborted = await researchPublicWeb(['cancelled'], abortedController.signal, { config })
assert.equal(aborted.diagnostic, 'aborted')

console.log('Public web research discovery and evidence contracts passed.')
