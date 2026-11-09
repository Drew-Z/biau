import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mock } from 'node:test'
import { probeAssistantHealth } from './check-main-site-synthetic.mjs'

const healthy = { ok: true, status: 200, durationMs: 1, contentType: 'application/json', json: { ok: true }, parseError: '', error: '' }
const unavailable = { ...healthy, ok: false, status: 503, json: null }
const timeout = { ...unavailable, status: 0, contentType: '', failureKind: 'timeout', error: 'fixture network error containing private details' }

async function probe(responses) {
  let requests = 0
  let waits = 0
  const result = await probeAssistantHealth('https://fixture.invalid/api/health', 12_000, {
    request: async () => responses[Math.min(requests++, responses.length - 1)],
    sleep: async (delayMs) => { assert.equal(delayMs, 15_000); waits += 1 },
  })
  return { result, requests, waits }
}

const ready = await probe([healthy])
assert.equal(ready.requests, 1)
assert.equal(ready.waits, 0)
assert.deepEqual(ready.result.issues, [])

const recovered = await probe([timeout, unavailable, healthy])
assert.equal(recovered.requests, 3)
assert.equal(recovered.waits, 2)
assert.deepEqual(recovered.result.issues, [])
assert.deepEqual(recovered.result.observations.map((item) => item.httpStatus), [0, 503, 200])
assert.match(recovered.result.observations[0].issues.join(), /request failed/)
assert.doesNotMatch(JSON.stringify(recovered.result.observations), /private details/)
assert.deepEqual(recovered.result.observations.map((item) => item.failureKind), ['timeout', 'http_status', 'none'])

const failed = await probe([unavailable])
assert.equal(failed.requests, 5)
assert.equal(failed.waits, 4)
assert.ok(failed.result.issues.length > 0)

for (const status of [401, 403, 404]) {
  const rejected = await probe([{ ...unavailable, status }])
  assert.equal(rejected.requests, 1)
  assert.equal(rejected.waits, 0)
  assert.ok(rejected.result.issues.length > 0)
}

const invalid = await probe([{ ...healthy, json: null, parseError: 'invalid-json', contentType: 'text/html' }, healthy])
assert.equal(invalid.requests, 2)
assert.match(invalid.result.observations[0].issues.join(), /HTML/)
const proxyFailure = await probe([{ ...unavailable, status: 502, json: { error: 'public-assistant-upstream-unreachable' } }])
assert.equal(proxyFailure.result.observations[0].proxyError, 'public-assistant-upstream-unreachable')
assert.equal(proxyFailure.result.observations[0].failureKind, 'http_status')
assert.equal(proxyFailure.result.observations[0].responseType, 'json')

const privateMarker = 'fixture-private-response-detail'
let fixture = {}
let nonGetRequests = 0
let requests = 0
let closedResponses = 0
const responseClosures = []
const server = createServer((request, response) => {
  requests += 1
  if (request.method !== 'GET' || request.url !== '/api/health') nonGetRequests += 1
  const active = fixture
  const timers = []
  responseClosures.push(new Promise((resolve) => response.once('close', resolve)))
  response.on('close', () => {
    closedResponses += 1
    timers.forEach(clearTimeout)
  })
  const send = () => {
    response.writeHead(active.status ?? 200, active.headers ?? { 'Content-Type': 'application/json' })
    response.flushHeaders()
    if (active.destroy) {
      response.write('{')
      timers.push(setTimeout(() => response.destroy(), 20))
    } else if (active.slowBody) {
      response.write('{')
      timers.push(setTimeout(() => response.end('"ok":true}'), active.slowBody))
    } else if (active.holdBody) {
      response.write(active.body)
    } else response.end(active.body ?? JSON.stringify({ ok: true }))
  }
  if (active.slowHeaders) timers.push(setTimeout(send, active.slowHeaders))
  else send()
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
try {
  const url = `http://127.0.0.1:${server.address().port}/api/health`
  const once = async (options = {}, timeoutMs = 2_000) => {
    fixture = options
    const result = await probeAssistantHealth(url, timeoutMs, { maxAttempts: 1 })
    assert.equal(result.observations.length, 1)
    assert.doesNotMatch(JSON.stringify(result.observations), /fixture-private-response-detail|127\.0\.0\.1|rawHeader/)
    return result.observations[0]
  }
  for (const [code, status] of [
    ['public-assistant-upstream-not-configured', 503],
    ['public-assistant-upstream-invalid-response', 502],
    ['public-assistant-upstream-response-too-large', 502],
    ['public-assistant-upstream-timeout', 504],
    ['public-assistant-upstream-unreachable', 502],
  ]) {
    const observation = await once({ status, body: JSON.stringify({ error: code, detail: privateMarker }) })
    assert.equal(observation.proxyError, code)
    assert.equal(observation.failureKind, 'http_status', 'the proxy code describes its report, not the probe transport')
    assert.equal(observation.responseType, 'json')
    assert.ok(observation.issues.some((issue) => issue.includes(code)))
  }
  for (const error of [privateMarker, `public-assistant-upstream-unreachable ${privateMarker}`, { code: 'public-assistant-upstream-unreachable' }, ['public-assistant-upstream-unreachable']]) {
    const observation = await once({ status: 502, body: JSON.stringify({ error }) })
    assert.equal(observation.proxyError, null)
    assert.equal(observation.failureKind, 'http_status')
  }
  for (const [options, failureKind, responseType] of [
    [{}, 'none', 'json'],
    [{ headers: {} }, 'none', 'json'],
    [{ headers: { 'Content-Type': 'Application/Health+JSON; charset=utf-8' } }, 'none', 'json'],
    [{ body: 'null' }, 'invalid_health', 'json'],
    [{ body: '[]' }, 'invalid_health', 'json'],
    [{ body: '{"ok":false}' }, 'invalid_health', 'json'],
    [{ body: '{"ok":true,"error":"public-assistant-upstream-unreachable"}' }, 'invalid_health', 'json'],
    [{ body: '{broken' }, 'invalid_json', 'json'],
    [{ headers: {}, body: '{broken' }, 'invalid_json', 'other'],
    [{ body: '' }, 'empty_response', 'none'],
    [{ status: 502, body: '' }, 'http_status', 'none'],
    [{ headers: { 'Content-Type': 'text/html' }, body: `<html>${privateMarker}</html>` }, 'invalid_json', 'html'],
    [{ status: 502, headers: { 'Content-Type': 'text/html' }, body: `<html>${privateMarker}</html>` }, 'http_status', 'html'],
    [{ headers: { 'Content-Type': `text/plain; rawHeader=${privateMarker}` }, body: privateMarker }, 'invalid_json', 'other'],
  ]) {
    const observation = await once(options)
    assert.equal(observation.failureKind, failureKind)
    assert.equal(observation.responseType, responseType)
    assert.equal(observation.issues.length === 0, failureKind === 'none')
  }
  const atLimit = '{"ok":true}'.padEnd(16 * 1024, ' ')
  assert.equal((await once({ body: atLimit })).failureKind, 'none')
  for (const options of [
    { headers: { 'Content-Type': 'application/json', 'Content-Length': String(16 * 1024 + 1) }, body: '{', holdBody: true },
    { body: atLimit + ' ', holdBody: true },
    { body: JSON.stringify({ ok: true, padding: '测'.repeat(6_000) }), holdBody: true },
  ]) {
    const observation = await once(options)
    assert.equal(observation.httpStatus, 200)
    assert.equal(observation.failureKind, 'response_too_large')
  }
  const slowHeaders = await once({ slowHeaders: 2_000 }, 300)
  assert.equal(slowHeaders.httpStatus, 0)
  assert.equal(slowHeaders.failureKind, 'timeout')
  const slowBody = await once({ slowHeaders: 150, slowBody: 350 }, 400)
  assert.equal(slowBody.httpStatus, 200, 'preserve headers when the body times out')
  assert.equal(slowBody.failureKind, 'timeout', 'headers and body must share one deadline')
  const brokenBody = await once({ destroy: true })
  assert.equal(brokenBody.httpStatus, 200)
  assert.equal(brokenBody.failureKind, 'connection_error')
  for (const [code, failureKind] of [['ETIMEDOUT', 'timeout'], ['ENOTFOUND', 'dns_error'], ['CERT_HAS_EXPIRED', 'tls_error'], ['ECONNRESET', 'connection_error'], ['UNKNOWN', 'network_error']]) {
    const mockedFetch = mock.method(globalThis, 'fetch', async () => {
      throw new Error(privateMarker, { cause: Object.assign(new Error(privateMarker), { code }) })
    })
    try {
      const observation = await once()
      assert.equal(observation.failureKind, failureKind)
      assert.equal(observation.httpStatus, 0)
      assert.equal(observation.responseType, 'none')
    } finally { mockedFetch.mock.restore() }
  }
  assert.ok(requests > 0)
  assert.equal(nonGetRequests, 0)
  let closeDeadline
  try {
    await Promise.race([
      Promise.all(responseClosures),
      new Promise((_, reject) => { closeDeadline = setTimeout(() => reject(new Error('health response stream was not cancelled')), 2_000) }),
    ])
  } finally { clearTimeout(closeDeadline) }
  assert.equal(closedResponses, requests, 'rejected and timed-out response streams must close')
} finally {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
}
console.log('Assistant health contracts passed: bounded recovery/body/deadline, proxy codes, transport failures, safe evidence; real model calls: 0.')
