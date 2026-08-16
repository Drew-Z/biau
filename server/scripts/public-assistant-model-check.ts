import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { env, resolveAssistantModelBaseUrl } from '../src/env.js'
import {
  createPublicAssistantModel,
  generatePublicAssistantDraft,
  planPublicAssistantRequest,
  shouldUseDirectPublicAssistantRoute,
} from '../src/publicAssistantModel.js'
import {
  hasConfiguredModelChannel,
  nextModelChannelRelation,
  recordModelChannelOutcome,
  resetAdaptiveModelChannelRouting,
  resolveAdaptiveModelChannels,
  resolveModelChannelForAttempt,
  resolveModelChannels,
} from '../src/model.js'
import type { PublicAssistantEvidence, PublicAssistantRequest } from '../src/publicAssistantRuntime.js'
import {
  buildPublicAssistantRecoveryLogRecord,
  classifyOperationalFailure,
} from '../src/publicAssistantRecoveryLog.js'
import { readResponsesContent, readResponsesStreamContent, requestResponsesText } from '../src/responsesApi.js'

const original = {
  assistantModelApiKey: env.assistantModelApiKey,
  assistantModelBaseUrl: env.assistantModelBaseUrl,
  assistantModelName: env.assistantModelName,
  assistantModelProvider: env.assistantModelProvider,
  assistantModelFallbackBaseUrl: env.assistantModelFallbackBaseUrl,
  assistantModelFallbackApiKey: env.assistantModelFallbackApiKey,
  assistantModelFallbackModels: env.assistantModelFallbackModels,
  assistantModelFallbackProvider: env.assistantModelFallbackProvider,
  assistantModelProtocol: env.assistantModelProtocol,
  assistantModelStructuredOutputsMode: env.assistantModelStructuredOutputsMode,
  publicAssistantRequestTimeoutMs: env.publicAssistantRequestTimeoutMs,
  publicAssistantAnswerTimeoutMs: env.publicAssistantAnswerTimeoutMs,
  publicAssistantDirectMaxOutputTokens: env.publicAssistantDirectMaxOutputTokens,
  openaiApiKey: env.openaiApiKey,
  openaiBaseUrl: env.openaiBaseUrl,
  openaiModel: env.openaiModel,
}

assert.equal(resolveAssistantModelBaseUrl({ assistantApiKey: 'relay-key' }), '')
assert.equal(resolveAssistantModelBaseUrl({ openaiApiKey: 'legacy-openai-key' }), 'https://api.openai.com/v1')
assert.equal(resolveAssistantModelBaseUrl({
  assistantApiKey: 'relay-key',
  openaiBaseUrl: 'https://relay.example.invalid/v1/',
}), 'https://relay.example.invalid/v1')

const observedPaths: string[] = []
const observedBodies: unknown[] = []
const observedAuthorizations: string[] = []

assert.equal(readResponsesContent({ output_text: 'top-level' }), 'top-level')
assert.equal(readResponsesContent({
  output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: { value: 'responses-message' } }] }],
}), 'responses-message')
assert.equal(readResponsesContent({ choices: [{ message: { content: 'chat-shaped compatibility' } }] }), 'chat-shaped compatibility')
assert.equal(readResponsesContent({
  choices: [{ message: { content: [{ type: 'text', text: { value: 'chat-array compatibility' } }] } }],
}), 'chat-array compatibility')
assert.equal(await readResponsesStreamContent(new Response([
  'event: response.output_text.delta',
  'data: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"streamed "}',
  '',
  'event: response.output_text.done',
  'data: {"type":"response.output_text.done","output_index":0,"content_index":0,"text":"streamed response"}',
  '',
  'data: [DONE]',
  '',
].join('\n')).body), 'streamed response')
assert.equal(await readResponsesStreamContent(new Response([
  'data: {"choices":[{"delta":{"content":"relay "}}]}',
  '',
  'data: {"choices":[{"delta":{"content":"stream"}}]}',
  '',
  'data: [DONE]',
  '',
].join('\n')).body), 'relay stream')
assert.equal(classifyOperationalFailure({ kind: 'http_status', httpStatus: 401, attemptedEndpoints: 1, timeoutMs: 1_000 }), 'access_denied')
assert.equal(classifyOperationalFailure({ kind: 'http_status', httpStatus: 403, attemptedEndpoints: 1, timeoutMs: 1_000 }), 'access_denied')
assert.equal(classifyOperationalFailure({ kind: 'http_status', httpStatus: 429, attemptedEndpoints: 1, timeoutMs: 1_000 }), 'rate_limited')
assert.equal(classifyOperationalFailure({ kind: 'http_status', httpStatus: 404, attemptedEndpoints: 1, timeoutMs: 1_000 }), 'model_unavailable')
assert.equal(classifyOperationalFailure({ kind: 'http_status', httpStatus: 400, attemptedEndpoints: 1, timeoutMs: 1_000 }), 'request_rejected')
assert.equal(classifyOperationalFailure({ kind: 'http_status', httpStatus: 503, attemptedEndpoints: 1, timeoutMs: 1_000 }), 'provider_unavailable')
assert.equal(classifyOperationalFailure({ kind: 'http_status', httpStatus: 418, attemptedEndpoints: 1, timeoutMs: 1_000 }), 'upstream')
assert.equal(classifyOperationalFailure({
  kind: 'http_status',
  httpStatus: 502,
  relayFailure: 'upstream_unreachable',
  attemptedEndpoints: 1,
  timeoutMs: 1_000,
}), 'relay_unreachable')
assert.equal(classifyOperationalFailure({
  kind: 'http_status',
  httpStatus: 502,
  relayFailure: 'invalid_response',
  attemptedEndpoints: 1,
  timeoutMs: 1_000,
}), 'relay_invalid_response')
assert.equal(classifyOperationalFailure({
  kind: 'http_status',
  httpStatus: 502,
  relayFailure: 'response_too_large',
  attemptedEndpoints: 1,
  timeoutMs: 1_000,
}), 'relay_response_too_large')
const safeRecoveryRecord = buildPublicAssistantRecoveryLogRecord({
  recovery: { state: 'degraded', attempts: 1, failureClass: 'upstream' },
  diagnostic: { kind: 'http_status', httpStatus: 403, attemptedEndpoints: 1, timeoutMs: 1_000 },
  failureClass: 'upstream',
  durationMs: 2_700,
})
assert.deepEqual(safeRecoveryRecord, {
  event: 'public-assistant-recovery',
  state: 'degraded',
  failure_class: 'access_denied',
  failure_origin: 'public_api',
  http_status_class: '4xx',
  attempts: 1,
  duration_bucket: '1s_to_5s',
})
assert.doesNotMatch(JSON.stringify(safeRecoveryRecord), /httpStatus|model|provider|endpoint|question|request|session/iu)
assert.deepEqual(buildPublicAssistantRecoveryLogRecord({
  recovery: { state: 'degraded', attempts: 3, failureClass: 'upstream' },
  diagnostic: {
    kind: 'http_status',
    httpStatus: 503,
    relayFailure: 'provider_rejected',
    attemptedEndpoints: 1,
    timeoutMs: 1_000,
  },
  failureClass: 'upstream',
  durationMs: 2_700,
}), {
  event: 'public-assistant-recovery',
  state: 'degraded',
  failure_class: 'provider_unavailable',
  failure_origin: 'relay_upstream',
  http_status_class: '5xx',
  attempts: 3,
  duration_bucket: '1s_to_5s',
})
assert.deepEqual(buildPublicAssistantRecoveryLogRecord({
  recovery: { state: 'degraded', attempts: 3, failureClass: 'upstream' },
  diagnostic: {
    kind: 'http_status',
    httpStatus: 503,
    relayOrigin: 'pages_function',
    attemptedEndpoints: 1,
    timeoutMs: 1_000,
  },
  failureClass: 'upstream',
  durationMs: 2_700,
}), {
  event: 'public-assistant-recovery',
  state: 'degraded',
  failure_class: 'provider_unavailable',
  failure_origin: 'relay_function',
  http_status_class: '5xx',
  attempts: 3,
  duration_bucket: '1s_to_5s',
})
assert.deepEqual(buildPublicAssistantRecoveryLogRecord({
  recovery: { state: 'degraded', attempts: 3, failureClass: 'upstream' },
  diagnostic: {
    kind: 'http_status',
    httpStatus: 503,
    relayOrigin: 'edge',
    attemptedEndpoints: 1,
    timeoutMs: 1_000,
  },
  failureClass: 'upstream',
  durationMs: 2_700,
}), {
  event: 'public-assistant-recovery',
  state: 'degraded',
  failure_class: 'provider_unavailable',
  failure_origin: 'relay_edge',
  http_status_class: '5xx',
  attempts: 3,
  duration_bucket: '1s_to_5s',
})
assert.equal(buildPublicAssistantRecoveryLogRecord({
  recovery: { state: 'none', attempts: 1 },
  durationMs: 20,
}), null)
await assert.rejects(readResponsesStreamContent(new Response([
  'event: response.failed',
  'data: {"type":"response.failed"}',
  '',
].join('\n')).body), /responses-stream-provider-error/u)
const server = createServer((request, response) => {
  const authorization = request.headers.authorization ?? ''
  if (request.method !== 'POST' || (authorization !== 'Bearer fixture-key' && authorization !== 'Bearer fallback-key')) {
    response.writeHead(404, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: 'not-found' }))
    return
  }

  const chunks: Buffer[] = []
  request.on('data', (chunk: Buffer) => chunks.push(chunk))
  request.on('end', () => {
    observedPaths.push(request.url ?? '')
    observedAuthorizations.push(authorization)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { input?: Array<{ content?: Array<{ text?: string }> }> }
    observedBodies.push(body)
    if (request.url === '/responses') {
      response.writeHead(404, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'compat-miss' }))
      return
    }

    const system = body.input?.[0]?.content?.[0]?.text ?? ''
    const user = body.input?.[1]?.content?.[0]?.text ?? ''
    if (user.includes('fixture-schema-unsupported')) {
      response.writeHead(400, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'unsupported-schema' }))
      return
    }
    if (user.includes('fixture-empty')) {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ output_text: '' }))
      return
    }
    if (user.includes('fixture-oversized')) {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ output_text: 'x'.repeat(65_000) }))
      return
    }
    if (user.includes('fixture-relay-unreachable')) {
      response.writeHead(502, {
        'Content-Type': 'application/json',
        'X-BIAU-Relay-Failure': 'upstream_unreachable',
        'X-BIAU-Relay-Origin': 'pages_function',
      })
      response.end(JSON.stringify({ error: 'redacted-relay-error' }))
      return
    }
    const streaming = (body as { stream?: boolean }).stream === true
    response.writeHead(200, { 'Content-Type': streaming ? 'text/event-stream' : 'application/json' })
    if (system.includes('只读规划器')) {
      response.end(JSON.stringify({
        output_text: JSON.stringify({ route: 'site', queries: ['Legal RAG'], requiresFreshness: false }),
      }))
      return
    }
    const answer = system.includes('简洁公开助手')
      ? JSON.stringify({
        answer: '孤帆泊晚岸，灯火照归舟。',
        status: 'answered',
        claims: [],
        suggestions: ['再写一首七言绝句'],
      })
      : JSON.stringify({
        answer: 'Legal RAG 提供公开项目说明。',
        status: 'answered',
        claims: [{ id: 'c1', text: '该项目有公开说明。', citationIds: ['site-1', 'unknown'] }],
        suggestions: ['查看项目详情'],
      })
    const first = answer.slice(0, Math.ceil(answer.length / 2))
    const second = answer.slice(first.length)
    response.write(`event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', output_index: 0, content_index: 0, delta: first })}\n\n`)
    setTimeout(() => {
      response.write(`event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', output_index: 0, content_index: 0, delta: second })}\n\n`)
    }, 80)
    setTimeout(() => {
      response.end(`event: response.completed\ndata: ${JSON.stringify({ type: 'response.completed', response: { output_text: answer } })}\n\n`)
    }, 160)
  })
})

try {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('fixture server did not expose a port')

  env.assistantModelApiKey = 'fixture-key'
  env.assistantModelBaseUrl = `http://127.0.0.1:${address.port}`
  env.assistantModelName = 'fixture-responses-model'
  env.assistantModelProvider = 'fixture-provider'
  env.assistantModelFallbackBaseUrl = ''
  env.assistantModelFallbackApiKey = ''
  env.assistantModelFallbackModels = []
  env.assistantModelFallbackProvider = 'fallback-responses'
  env.assistantModelProtocol = 'responses'
  env.assistantModelStructuredOutputsMode = 'off'
  env.publicAssistantRequestTimeoutMs = 5000
  env.publicAssistantAnswerTimeoutMs = 120
  env.publicAssistantDirectMaxOutputTokens = 800
  env.openaiApiKey = ''
  env.openaiBaseUrl = ''
  env.openaiModel = ''

  env.assistantModelName = 'free5/DeepSeek-V4-Flash'
  assert.equal(
    resolveModelChannels()[0]?.model,
    'free5/DeepSeek-V4-Flash',
    'channel-qualified CPA model ids must remain exact',
  )
  env.assistantModelName = 'fixture-responses-model'

  const request: PublicAssistantRequest = {
    question: 'Legal RAG 有哪些公开能力？',
    mode: 'auto',
    history: [],
  }
  const plan = await planPublicAssistantRequest(request)
  assert.deepEqual(plan, {
    route: 'site',
    queries: ['Legal RAG'],
    requiresFreshness: false,
    planner: 'model',
  })

  const forcedWebPlan = await planPublicAssistantRequest({
    question: '截至目前，Agentic RAG 相比传统 RAG 有哪些关键改进？请引用公开网页。',
    mode: 'web',
    history: [],
  })
  assert.deepEqual(forcedWebPlan.queries, ['Agentic RAG 相比传统 RAG 有哪些关键改进'])

  const evidence: PublicAssistantEvidence = {
    id: 'site-1',
    source: 'site',
    title: 'Legal RAG',
    canonicalUrl: '/projects/legal-rag',
    section: 'overview',
    excerpt: '公开项目说明',
    text: '公开项目说明',
    publishedAt: null,
    score: 0.9,
    evidenceStatus: 'verified',
  }
  const draft = await generatePublicAssistantDraft({ request, plan, evidence: [evidence], attempt: 1 })
  assert.equal(draft.answer, 'Legal RAG 提供公开项目说明。')
  assert.equal(draft.status, 'answered')
  assert.deepEqual(draft.claims[0]?.citationIds, ['site-1'])
  assert.deepEqual(draft.suggestions, ['查看项目详情'])
  assert.equal(draft.model, 'fixture-responses-model')
  assert.equal(draft.provider, 'fixture-provider')
  assert.equal(draft.modelChannel?.configured, true)
  assert.equal(JSON.stringify(draft.modelChannel).includes('fixture-key'), false)
  assert.equal(JSON.stringify(draft.modelChannel).includes(`127.0.0.1:${address.port}`), false)

  assert.deepEqual(observedPaths, ['/responses', '/v1/responses', '/responses', '/v1/responses'])
  assert.equal(observedBodies.length, 4)
  assert.equal((observedBodies[1] as { model?: string }).model, 'fixture-responses-model')
  assert.deepEqual(observedBodies.map((body) => (body as { stream?: boolean }).stream), [false, false, true, true])

  const directPlan = await planPublicAssistantRequest({
    ...request,
    question: '请生成一首乡愁的诗句',
    mode: 'auto',
  })
  assert.deepEqual(directPlan, {
    route: 'direct',
    queries: [],
    requiresFreshness: false,
    planner: 'fallback',
  })
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'auto', question: '请帮我润色这段文字' }), true)
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'auto', question: '请生成一首乡愁的诗句' }), true)
  assert.equal(shouldUseDirectPublicAssistantRoute({
    mode: 'auto',
    question: '请以泊岸为主题写一首七言绝句。只输出诗题和四句诗，不要解释。',
  }), true)
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'auto', question: '请翻译以下内容' }), true)
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'auto', question: '你好' }), true)
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'auto', question: 'OpenAI 最近发布了什么？' }), false)
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'web', question: '请生成一首古诗' }), false)
  const directDraft = await generatePublicAssistantDraft({
    request: { ...request, question: '请生成一首乡愁的诗句' },
    plan: directPlan,
    evidence: [],
    attempt: 1,
  })
  assert.equal(directDraft.answer, '孤帆泊晚岸，灯火照归舟。')
  assert.deepEqual(directDraft.claims, [])
  const directBody = observedBodies.at(-1) as {
    max_output_tokens?: number
    text?: unknown
    input?: Array<{ content?: Array<{ text?: string }> }>
  }
  const directSystem = directBody.input?.[0]?.content?.[0]?.text ?? ''
  const directUser = directBody.input?.[1]?.content?.[0]?.text ?? ''
  assert.equal(directBody.max_output_tokens, 800)
  assert.equal(directBody.text, undefined, 'structured output mode remains disabled by default')
  assert.doesNotMatch(directSystem, /evidence|citation|WEB_EVIDENCE/iu)
  assert.equal('evidence' in (JSON.parse(directUser) as Record<string, unknown>), false)

  env.assistantModelStructuredOutputsMode = 'json-schema'
  await generatePublicAssistantDraft({
    request: { ...request, question: '请生成一首乡愁的诗句' },
    plan: directPlan,
    evidence: [],
    attempt: 1,
  })
  const schemaBody = observedBodies.at(-1) as {
    text?: { format?: { type?: string; name?: string; strict?: boolean; schema?: unknown } }
  }
  assert.equal(schemaBody.text?.format?.type, 'json_schema')
  assert.equal(schemaBody.text?.format?.name, 'public_assistant_answer')
  assert.equal(schemaBody.text?.format?.strict, true)
  assert.ok(schemaBody.text?.format?.schema)
  env.assistantModelStructuredOutputsMode = 'off'

  env.assistantModelFallbackBaseUrl = `http://127.0.0.1:${address.port}`
  env.assistantModelFallbackApiKey = 'fallback-key'
  env.assistantModelFallbackModels = ['fixture-fallback-a', 'fixture-fallback-b']
  env.assistantModelFallbackProvider = 'fixture-fallback-provider'
  assert.equal(resolveModelChannels().length, 3)
  assert.equal(resolveModelChannelForAttempt(1).model, 'fixture-responses-model')
  assert.equal(resolveModelChannelForAttempt(2).model, 'fixture-fallback-a')
  assert.equal(resolveModelChannelForAttempt(3).model, 'fixture-fallback-b')
  assert.equal(nextModelChannelRelation(1), 'independent')
  assert.equal(nextModelChannelRelation(2), 'same-failure-domain')
  assert.equal(nextModelChannelRelation(3), null)

  resetAdaptiveModelChannelRouting()
  const routingProbeCount = observedBodies.length
  const initialOrder = resolveAdaptiveModelChannels(1_000)
  assert.deepEqual(initialOrder.map((channel) => channel.model), [
    'fixture-responses-model',
    'fixture-fallback-a',
    'fixture-fallback-b',
  ])
  recordModelChannelOutcome(initialOrder[0], {
    ok: false,
    at: 1_000,
    failure: 'provider_error',
    diagnosticKind: 'http_status',
    httpStatus: 503,
  })
  assert.deepEqual(resolveAdaptiveModelChannels(2_000).map((channel) => channel.model), [
    'fixture-fallback-a',
    'fixture-fallback-b',
  ], 'an open primary circuit should be omitted while healthy fallbacks exist')
  recordModelChannelOutcome(initialOrder[1], { ok: true, at: 2_000, firstActivityMs: 80 })
  assert.equal(resolveAdaptiveModelChannels(2_100)[0]?.model, 'fixture-fallback-a')
  const halfOpenOrder = resolveAdaptiveModelChannels(100_000)
  assert.deepEqual(halfOpenOrder.map((channel) => channel.model), [
    'fixture-responses-model',
    'fixture-fallback-a',
    'fixture-fallback-b',
  ], 'cooldown expiry should grant one real request a half-open recovery attempt')
  assert.deepEqual(resolveAdaptiveModelChannels(100_001).map((channel) => channel.model), [
    'fixture-fallback-a',
    'fixture-fallback-b',
  ], 'concurrent requests should keep using known healthy channels during a half-open lease')
  recordModelChannelOutcome(halfOpenOrder[0], { ok: true, at: 100_002, firstActivityMs: 320 })
  assert.equal(
    resolveAdaptiveModelChannels(100_003)[0]?.model,
    'fixture-fallback-a',
    'one recovery success should not erase the stable fallback reputation',
  )
  assert.equal(
    resolveAdaptiveModelChannels(8 * 30 * 60_000 + 100_003)[0]?.model,
    'fixture-responses-model',
    'stale reputation should decay back to the configured quality order',
  )
  resetAdaptiveModelChannelRouting()
  const allChannels = resolveModelChannels()
  const allOpenAt = Date.now()
  allChannels.forEach((channel, index) => {
    recordModelChannelOutcome(channel, {
      ok: false,
      at: allOpenAt + index,
      failure: 'provider_error',
      diagnosticKind: 'http_status',
      httpStatus: 503,
    })
  })
  assert.deepEqual(
    resolveAdaptiveModelChannels(allOpenAt + 100),
    [],
    'all channels in cooldown should fail fast instead of retrying a known-bad provider',
  )
  const allOpenRequest = { ...request, question: '请生成一首关于海岸的短诗' }
  const allOpenModel = createPublicAssistantModel()
  const allOpenDraft = await allOpenModel.answer({
    request: allOpenRequest,
    plan: directPlan,
    evidence: [],
    attempt: 1,
  })
  assert.equal(allOpenDraft.failure, 'not_configured')
  assert.equal(allOpenDraft.status, 'degraded')
  assert.equal(allOpenDraft.attempts?.[0]?.durationMs, 0)
  assert.equal(observedBodies.length, routingProbeCount, 'adaptive ranking must not issue provider probes')
  resetAdaptiveModelChannelRouting()

  const fallbackDraft = await generatePublicAssistantDraft({
    request: { ...request, question: '请生成一首乡愁的诗句' },
    plan: directPlan,
    evidence: [],
    attempt: 2,
  })
  assert.equal(fallbackDraft.model, 'fixture-fallback-a')
  assert.equal(fallbackDraft.provider, 'fixture-fallback-provider')
  assert.equal(fallbackDraft.attempts?.[0]?.attempt, 2)
  assert.equal(observedAuthorizations.at(-1), 'Bearer fallback-key')
  assert.equal((observedBodies.at(-1) as { model?: string }).model, 'fixture-fallback-a')
  assert.equal(JSON.stringify(fallbackDraft.modelChannel).includes('fallback-key'), false)
  assert.equal(JSON.stringify(fallbackDraft.modelChannel).includes(`127.0.0.1:${address.port}`), false)

  const fixtureChannel = {
    apiKey: 'fixture-key',
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    model: 'fixture-responses-model',
  }
  const unsupportedSchema = await requestResponsesText({
    channel: fixtureChannel,
    system: 'fixture',
    user: 'fixture-schema-unsupported',
    timeoutMs: 1_000,
    jsonSchema: { name: 'fixture', schema: { type: 'object' } },
  })
  assert.equal(unsupportedSchema.failure, 'provider_error')
  assert.equal(unsupportedSchema.failureClass, 'upstream')
  assert.equal(unsupportedSchema.diagnostic?.attemptedEndpoints, 1, 'schema rejection must not switch protocols')
  const relayUnreachable = await requestResponsesText({
    channel: { ...fixtureChannel, provider: 'cloudflare-model-relay' },
    system: 'fixture',
    user: 'fixture-relay-unreachable',
    timeoutMs: 1_000,
  })
  assert.equal(relayUnreachable.diagnostic?.relayFailure, 'upstream_unreachable')
  assert.equal(relayUnreachable.diagnostic?.relayOrigin, 'pages_function')
  assert.equal(classifyOperationalFailure(relayUnreachable.diagnostic), 'relay_unreachable')
  const free3RelayUnreachable = await requestResponsesText({
    channel: {
      ...fixtureChannel,
      baseUrl: `http://127.0.0.1:${address.port}/api/model-relay/free3`,
    },
    system: 'fixture',
    user: 'fixture-relay-unreachable',
    timeoutMs: 1_000,
  })
  assert.equal(free3RelayUnreachable.diagnostic?.relayFailure, 'upstream_unreachable')
  assert.equal(free3RelayUnreachable.diagnostic?.relayOrigin, 'pages_function')
  const relayEdgeFailure = await requestResponsesText({
    channel: { ...fixtureChannel, provider: 'cloudflare-model-relay' },
    system: 'fixture',
    user: 'fixture-schema-unsupported',
    timeoutMs: 1_000,
  })
  assert.equal(relayEdgeFailure.diagnostic?.relayOrigin, 'edge')
  const emptyResult = await requestResponsesText({
    channel: fixtureChannel,
    system: 'fixture',
    user: 'fixture-empty',
    timeoutMs: 1_000,
  })
  assert.equal(emptyResult.failureClass, 'empty')
  const oversizedResult = await requestResponsesText({
    channel: fixtureChannel,
    system: 'fixture',
    user: 'fixture-oversized',
    timeoutMs: 1_000,
  })
  assert.equal(oversizedResult.failureClass, 'invalid')
  assert.ok(unsupportedSchema.durationMs >= 0)
  assert.ok(unsupportedSchema.firstActivityMs !== undefined)

  const cancelled = new AbortController()
  const cancelledDraft = generatePublicAssistantDraft({
    request: { ...request, signal: cancelled.signal },
    plan,
    evidence: [evidence],
    attempt: 1,
  })
  setTimeout(() => cancelled.abort(), 30)
  await assert.rejects(
    cancelledDraft,
    (error) => error instanceof DOMException && error.name === 'AbortError',
  )

  env.assistantModelApiKey = ''
  env.assistantModelBaseUrl = ''
  env.assistantModelName = ''
  env.openaiApiKey = ''
  env.openaiBaseUrl = ''
  env.openaiModel = ''
  assert.equal(hasConfiguredModelChannel(), true, 'a complete fallback keeps configuration readiness true')
  const fallbackOnlyDraft = await generatePublicAssistantDraft({
    request: { ...request, question: '请生成一首乡愁的诗句' },
    plan: directPlan,
    evidence: [],
    attempt: 2,
  })
  assert.equal(fallbackOnlyDraft.failure, undefined)
  assert.equal(fallbackOnlyDraft.model, 'fixture-fallback-a')

  env.assistantModelFallbackBaseUrl = ''
  assert.equal(resolveModelChannels().length, 1, 'incomplete fallback configuration is ignored')
  assert.equal(hasConfiguredModelChannel(), false)
  const unavailableDirectDraft = await generatePublicAssistantDraft({
    request: {
      question: '生成一首古诗词',
      mode: 'auto',
      history: [],
    },
    plan: directPlan,
    evidence: [],
    attempt: 1,
  })
  assert.equal(unavailableDirectDraft.status, 'degraded')
  assert.equal(unavailableDirectDraft.failure, 'not_configured')
  assert.deepEqual(unavailableDirectDraft.claims, [])
  console.log('Public assistant Responses model adapter contract passed.')
} finally {
  Object.assign(env, original)
  await new Promise<void>((resolve) => server.close(() => resolve()))
}
