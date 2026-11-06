import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { load } from 'cheerio'
import { AiDailyMarkdown } from '../src/components/AiDailyMarkdown.tsx'
import { DAILY_INDEX_MAX_BYTES, decodeDailyDetail, decodeDailyIndex } from '../src/data/aiDailyEditions.ts'
import { readDailyEditions } from '../functions/_shared/aiDailyEditions.ts'
import { configurationHash, emptyIndex, packageEdition, planPublication, requirePublicationGate } from './horizon/editions.ts'
import { editionFixture } from './lib/ai-daily-edition-fixtures.ts'

const morning = await packageEdition(await editionFixture(), '2026-11-05T00:11:00.000Z')
const evening = await packageEdition(await editionFixture('evening'), '2026-11-05T12:11:00.000Z')
const first = planPublication(emptyIndex, morning)
const second = planPublication(first.index, evening)
assert.equal(second.index.editions.length, 2)
assert.equal(second.index.latestEditionId, evening.edition.editionId)
assert.equal(planPublication(second.index, morning).changed, false)
assert.equal(planPublication(planPublication(emptyIndex, evening).index, morning).index.latestEditionId, evening.edition.editionId)
const changed = await packageEdition({ ...await editionFixture(), markdown: '修正后的离线样例，事实以原文为准。', generatedAt: '2026-11-06T00:10:00Z' }, '2026-11-06T00:11:00Z')
assert.throws(() => planPublication(second.index, changed), /already-published/u)
const corrected = planPublication(second.index, changed, true)
assert.equal(corrected.edition.revision, 2)
assert.equal(corrected.edition.publishedAt, morning.edition.publishedAt)
assert.equal(corrected.index.latestEditionId, evening.edition.editionId)
assert.equal(decodeDailyIndex({ ...first.index, latestEditionId: 'missing' }), null)
assert.equal(decodeDailyIndex({ ...first.index, editions: [morning.edition, morning.edition] }), null)
assert.equal(await decodeDailyDetail({ ...morning, markdown: 'damaged' }), null)

for (const mutation of [
  { fetchStatus: 'partial_failure' }, { failedSources: 1 }, { raw: 0 }, { raw: 21, scored: 21 }, { scored: 1 },
  { enrichmentStatus: 'failure' }, { enrichmentStatus: 'partial' }, { failed: 1 }, { enriched: 0 }, { summaryStage: 'filtered' }, { itemsUsed: 2 },
]) {
  const raw = await editionFixture()
  await assert.rejects(packageEdition({ ...raw, checks: { ...raw.checks, ...mutation } }, '2026-11-05T01:00:00Z'))
  assert.equal(first.index.latestEditionId, morning.edition.editionId)
}
for (const markdown of ['', '<script>alert(1)</script>', '[link](javascript:alert(1))', 'API_KEY=fixture-private']) {
  await assert.rejects(packageEdition({ ...await editionFixture(), markdown }, '2026-11-05T01:00:00Z'))
}
await assert.rejects(requirePublicationGate(morning, emptyIndex, { enabled: false }))
const gate = { enabled: true, configurationHash: await configurationHash(), firstEditionId: morning.edition.editionId, firstContentSha256: morning.edition.contentSha256 }
await requirePublicationGate(morning, emptyIndex, gate)
await requirePublicationGate(evening, first.index, gate)
await assert.rejects(requirePublicationGate(evening, emptyIndex, gate))

const env = { AI_DAILY_EDITIONS_ENABLED: 'true', AI_DAILY_CONTENT_REPOSITORY: 'fixture/example' }
const req = new Request('https://site.example/api/ai-daily')
let networkRequests = 0
const fetcher: typeof fetch = async (input) => {
  networkRequests += 1
  const url = String(input)
  assert.ok(url.startsWith('https://raw.githubusercontent.com/fixture/example/refs/heads/codex/ai-daily-content/'))
  return url.endsWith('index.json') ? Response.json(second.index) : new Response(morning.markdown)
}
assert.equal((await readDailyEditions(req, {}, undefined, { fetcher })).status, 503)
assert.equal(networkRequests, 0)
assert.equal((await readDailyEditions(req, env, '../secrets', { fetcher })).status, 404)
assert.equal(networkRequests, 0)
const response = await readDailyEditions(req, env, undefined, { fetcher })
assert.equal(response.status, 200)
assert.equal((await readDailyEditions(new Request(req, { headers: { 'If-None-Match': response.headers.get('etag')! } }), env, undefined, { fetcher })).status, 304)
assert.equal((await readDailyEditions(req, env, morning.edition.editionId, { fetcher })).status, 200)
assert.equal((await readDailyEditions(req, env, '2026-11-04-morning', { fetcher })).status, 404)
for (const body of ['{', JSON.stringify({ ...second.index, latestEditionId: 'bad' }), 'x'.repeat(DAILY_INDEX_MAX_BYTES + 1)]) {
  assert.equal((await readDailyEditions(req, env, undefined, { fetcher: async () => new Response(body) })).status, 502)
}
assert.equal((await readDailyEditions(req, env, morning.edition.editionId, { fetcher: async (url) => String(url).endsWith('index.json') ? Response.json(first.index) : new Response('wrong hash') })).status, 502)
assert.equal((await readDailyEditions(req, env, undefined, { fetcher: async () => { throw new Error('private upstream error') } })).status, 502)

const html = renderToStaticMarkup(createElement(AiDailyMarkdown, { markdown: morning.markdown + '\n<script>alert(1)</script><iframe src="https://evil.example"></iframe><svg onload="alert(1)"></svg>\n<img src="x" onerror="alert(1)"/>\n<a href="javascript:alert(1)" onclick="bad()" style="position:fixed">bad</a>\n[private](http://127.0.0.1/admin)\n' }))
const $ = load(html)
assert.equal($('script,iframe,svg,img,[onclick],[onerror],[style]').length, 0)
assert.equal($('a[href^="javascript:"],a[href*="127.0.0.1"]').length, 0)
assert.equal($('details > summary').text(), '阅读背景')
assert.equal($('a[href="#daily-model-news"]').length, 1)
assert.equal($('#daily-model-news').length, 1)
assert.equal($('a[href="https://example.com/ai"]').attr('rel'), 'noopener noreferrer')
console.log(JSON.stringify({ ok: true, contracts: 'editions, publication, reader, safe Markdown', modelCalls: 0, externalRequests: 0 }))
