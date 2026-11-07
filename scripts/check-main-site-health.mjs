import assert from 'node:assert/strict'
import { probeAssistantHealth } from './check-main-site-synthetic.mjs'

const healthy = { ok: true, status: 200, durationMs: 1, contentType: 'application/json', json: { ok: true }, parseError: '', error: '' }
const unavailable = { ...healthy, ok: false, status: 503, json: null }
const timeout = { ...unavailable, status: 0, error: 'fixture network error containing private details' }

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
console.log('Assistant health bounded recovery contracts passed; real model calls: 0.')
