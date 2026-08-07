import { onRequestPost as relayResponses } from '../functions/api/model-relay/responses.ts'
import { onRequestPost as fallbackRelayResponses } from '../functions/api/model-relay/fallback/responses.ts'
import { relayResponsesRequest } from '../functions/_shared/modelRelay.ts'

const relayEnv = {
  MODEL_RELAY_SHARED_TOKEN: 'fixture-relay-token-with-32-characters',
  MODEL_RELAY_UPSTREAM_BASE_URL: 'https://provider.example/v1',
  MODEL_RELAY_UPSTREAM_API_KEY: 'fixture-upstream-key',
  MODEL_RELAY_FALLBACK_UPSTREAM_BASE_URL: 'https://fallback.example/v1',
  MODEL_RELAY_FALLBACK_UPSTREAM_API_KEY: 'fixture-fallback-key',
  MODEL_RELAY_ALLOWED_MODELS: 'fixture-primary,fixture-fallback-a,fixture-fallback-b',
  MODEL_RELAY_TIMEOUT_MS: '50',
}

function request(body, token = 'fixture-relay-token-with-32-characters', contentType = 'application/json') {
  return new Request('https://biau.example/api/model-relay/responses', {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      Authorization: `Bearer ${token}`,
      Cookie: 'browser-cookie-must-not-forward',
      'X-Forwarded-For': 'browser-address-must-not-forward',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function payload(overrides = {}) {
  return {
    model: 'fixture-primary',
    stream: false,
    max_output_tokens: 800,
    input: [{ role: 'user', content: [{ type: 'input_text', text: 'fixture business request' }] }],
    ...overrides,
  }
}

const missingConfig = await relayResponses({ request: request(payload()), env: {} })
assertStatus(missingConfig, 503, 'missing relay configuration must fail closed')
const weakTokenConfig = await relayResponses({
  request: request(payload()),
  env: { ...relayEnv, MODEL_RELAY_SHARED_TOKEN: 'short-token' },
})
assertStatus(weakTokenConfig, 503, 'weak relay token configuration must fail closed')

let fetchCalls = 0
const noFetch = async () => {
  fetchCalls += 1
  return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
}
assertStatus(await relayResponsesRequest(request(payload(), 'wrong-token'), relayEnv, { fetch: noFetch }), 401, 'invalid relay token')
assertStatus(await relayResponsesRequest(request(payload(), 'fixture-relay-token-with-32-characters', 'text/plain'), relayEnv, { fetch: noFetch }), 415, 'non-JSON relay request')
assertStatus(await relayResponsesRequest(request(payload({ model: 'unknown-model' })), relayEnv, { fetch: noFetch }), 400, 'unknown relay model')
assertStatus(await relayResponsesRequest(request(payload({ endpoint: 'https://attacker.example' })), relayEnv, { fetch: noFetch }), 400, 'caller-controlled endpoint')
assertStatus(await relayResponsesRequest(request('{"model":"fixture-primary","stream":false,"input":[' + '"x",'.repeat(520_000) + ']}'), relayEnv, { fetch: noFetch }), 413, 'oversized relay request')
if (fetchCalls !== 0) throw new Error('invalid relay requests must not reach upstream fetch')

let observed
const jsonResponse = await relayResponsesRequest(request(payload()), relayEnv, {
  async fetch(url, init) {
    observed = { url: String(url), init }
    return new Response(JSON.stringify({ output_text: 'fixture answer' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
assertStatus(jsonResponse, 200, 'JSON relay success')
if ((await jsonResponse.json()).output_text !== 'fixture answer') throw new Error('relay must preserve bounded JSON success')
if (observed?.url !== 'https://provider.example/v1/responses') throw new Error('relay must use the fixed configured Responses endpoint')
const observedHeaders = new Headers(observed?.init?.headers)
if (observedHeaders.get('Authorization') !== 'Bearer fixture-upstream-key') throw new Error('relay must generate upstream authorization')
if (observedHeaders.get('Cookie') || observedHeaders.get('X-Forwarded-For')) throw new Error('relay must strip caller credentials and forwarding headers')
if (JSON.parse(String(observed?.init?.body)).model !== 'fixture-primary') throw new Error('relay must preserve the approved model request')

let multimodalObserved
const multimodalPayload = payload({
  model: 'fixture-fallback-b',
  input: [{
    role: 'user',
    content: [
      { type: 'input_text', text: 'describe the fixture image' },
      { type: 'input_image', image_url: `data:image/webp;base64,${'A'.repeat(340_000)}`, detail: 'auto' },
    ],
  }],
})
const multimodalResponse = await relayResponsesRequest(request(multimodalPayload), relayEnv, {
  async fetch(url, init) {
    multimodalObserved = { url: String(url), init }
    return new Response(JSON.stringify({ output_text: 'bounded image observation' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}, 'fallback')
assertStatus(multimodalResponse, 200, 'bounded multimodal relay request')
const forwardedMultimodal = JSON.parse(String(multimodalObserved?.init?.body))
if (forwardedMultimodal.input?.[0]?.content?.[1]?.image_url !== multimodalPayload.input[0].content[1].image_url) {
  throw new Error('relay must preserve one bounded approved image input')
}

let fallbackObserved
const fallbackResponse = await fallbackRelayResponses({
  request: request(payload()),
  env: { ...relayEnv, MODEL_RELAY_FALLBACK_UPSTREAM_BASE_URL: undefined, MODEL_RELAY_FALLBACK_UPSTREAM_API_KEY: undefined },
})
assertStatus(fallbackResponse, 503, 'fallback relay must fail closed when its upstream is unavailable')
const fallbackJson = await relayResponsesRequest(request(payload()), relayEnv, {
  async fetch(url, init) {
    fallbackObserved = { url: String(url), init }
    return new Response(JSON.stringify({ output_text: 'fallback fixture answer' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}, 'fallback')
assertStatus(fallbackJson, 200, 'fallback relay JSON success')
if (fallbackObserved?.url !== 'https://fallback.example/v1/responses') throw new Error('fallback relay must use its own fixed Responses endpoint')
const fallbackHeaders = new Headers(fallbackObserved?.init?.headers)
if (fallbackHeaders.get('Authorization') !== 'Bearer fixture-fallback-key') throw new Error('fallback relay must use its own upstream authorization')

const upstreamRejected = await relayResponsesRequest(request(payload()), relayEnv, {
  async fetch() {
    return new Response(JSON.stringify({ error: 'private provider body' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
assertStatus(upstreamRejected, 403, 'upstream status must reach the trusted Render caller')
assertHeader(upstreamRejected, 'provider_rejected', 'upstream rejection classification')
const rejectedText = await upstreamRejected.text()
if (rejectedText.includes('private provider body') || !rejectedText.includes('model-relay-upstream-rejected')) {
  throw new Error('relay must redact upstream error bodies')
}

const invalidContent = await relayResponsesRequest(request(payload()), relayEnv, {
  async fetch() {
    return new Response('<html>unexpected</html>', { status: 200, headers: { 'Content-Type': 'text/html' } })
  },
})
assertStatus(invalidContent, 502, 'invalid upstream content type')
assertHeader(invalidContent, 'invalid_response', 'invalid upstream content classification')

const tooLarge = await relayResponsesRequest(request(payload()), relayEnv, {
  async fetch() {
    return new Response(JSON.stringify({ output_text: 'x'.repeat(513_000) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
assertStatus(tooLarge, 502, 'oversized upstream JSON response')
assertHeader(tooLarge, 'response_too_large', 'oversized upstream response classification')

const unreachable = await relayResponsesRequest(request(payload()), relayEnv, {
  async fetch() {
    throw new TypeError('fixture-network-error')
  },
})
assertStatus(unreachable, 502, 'unreachable upstream')
assertHeader(unreachable, 'upstream_unreachable', 'unreachable upstream classification')

let upstreamCancelled = false
const sseResponse = await relayResponsesRequest(request(payload({ stream: true })), relayEnv, {
  async fetch() {
    const encoder = new TextEncoder()
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"fixture"}\n\n'))
      },
      cancel() {
        upstreamCancelled = true
      },
    }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  },
})
assertStatus(sseResponse, 200, 'SSE relay success')
if (!sseResponse.headers.get('Content-Type')?.includes('text/event-stream')) throw new Error('relay must preserve SSE content type')
const reader = sseResponse.body?.getReader()
if (!reader || (await reader.read()).done) throw new Error('relay must stream the first SSE frame')
await reader.cancel('fixture-client-cancel')
if (!upstreamCancelled) throw new Error('relay cancellation must propagate to the upstream stream')

const timeoutResponse = await relayResponsesRequest(request(payload()), { ...relayEnv, MODEL_RELAY_TIMEOUT_MS: '5000' }, {
  async fetch(_url, init) {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })
  },
  scheduleTimeout(callback) {
    return setTimeout(callback, 0)
  },
})
assertStatus(timeoutResponse, 504, 'relay timeout')
assertHeader(timeoutResponse, 'timeout', 'relay timeout classification')

console.log('Cloudflare fixed-upstream model relay contracts passed.')

function assertStatus(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label}: expected ${expected}, received ${response.status}`)
}

function assertHeader(response, expected, label) {
  const observed = response.headers.get('X-BIAU-Relay-Failure')
  if (observed !== expected) throw new Error(`${label}: expected ${expected}, received ${observed}`)
}
