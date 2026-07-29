import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { env } from '../src/env.js'
import {
  generatePublicAssistantDraft,
  planPublicAssistantRequest,
  shouldUseDirectPublicAssistantRoute,
} from '../src/publicAssistantModel.js'
import type { PublicAssistantEvidence, PublicAssistantRequest } from '../src/publicAssistantRuntime.js'
import { readResponsesContent, readResponsesStreamContent, requestResponsesText } from '../src/responsesApi.js'

const original = {
  assistantModelApiKey: env.assistantModelApiKey,
  assistantModelBaseUrl: env.assistantModelBaseUrl,
  assistantModelName: env.assistantModelName,
  assistantModelProvider: env.assistantModelProvider,
  assistantModelChannelsJson: env.assistantModelChannelsJson,
  assistantModelProtocol: env.assistantModelProtocol,
  assistantModelStructuredOutputsMode: env.assistantModelStructuredOutputsMode,
  publicAssistantRequestTimeoutMs: env.publicAssistantRequestTimeoutMs,
  publicAssistantAnswerTimeoutMs: env.publicAssistantAnswerTimeoutMs,
  publicAssistantDirectMaxOutputTokens: env.publicAssistantDirectMaxOutputTokens,
  openaiApiKey: env.openaiApiKey,
  openaiBaseUrl: env.openaiBaseUrl,
  openaiModel: env.openaiModel,
}

const observedPaths: string[] = []
const observedBodies: unknown[] = []

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
await assert.rejects(readResponsesStreamContent(new Response([
  'event: response.failed',
  'data: {"type":"response.failed"}',
  '',
].join('\n')).body), /responses-stream-provider-error/u)
const server = createServer((request, response) => {
  if (request.method !== 'POST' || request.headers.authorization !== 'Bearer fixture-key') {
    response.writeHead(404, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: 'not-found' }))
    return
  }

  const chunks: Buffer[] = []
  request.on('data', (chunk: Buffer) => chunks.push(chunk))
  request.on('end', () => {
    observedPaths.push(request.url ?? '')
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
  env.assistantModelChannelsJson = ''
  env.assistantModelProtocol = 'responses'
  env.assistantModelStructuredOutputsMode = 'off'
  env.publicAssistantRequestTimeoutMs = 5000
  env.publicAssistantAnswerTimeoutMs = 120
  env.publicAssistantDirectMaxOutputTokens = 800
  env.openaiApiKey = ''
  env.openaiBaseUrl = ''
  env.openaiModel = ''

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
  const draft = await generatePublicAssistantDraft({ request, plan, evidence: [evidence] })
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
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'auto', question: '请翻译以下内容' }), true)
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'auto', question: '你好' }), true)
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'auto', question: 'OpenAI 最近发布了什么？' }), false)
  assert.equal(shouldUseDirectPublicAssistantRoute({ mode: 'web', question: '请生成一首古诗' }), false)
  const directDraft = await generatePublicAssistantDraft({
    request: { ...request, question: '请生成一首乡愁的诗句' },
    plan: directPlan,
    evidence: [],
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
  })
  const schemaBody = observedBodies.at(-1) as {
    text?: { format?: { type?: string; name?: string; strict?: boolean; schema?: unknown } }
  }
  assert.equal(schemaBody.text?.format?.type, 'json_schema')
  assert.equal(schemaBody.text?.format?.name, 'public_assistant_answer')
  assert.equal(schemaBody.text?.format?.strict, true)
  assert.ok(schemaBody.text?.format?.schema)
  env.assistantModelStructuredOutputsMode = 'off'

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
  })
  setTimeout(() => cancelled.abort(), 30)
  await assert.rejects(
    cancelledDraft,
    (error) => error instanceof DOMException && error.name === 'AbortError',
  )

  env.assistantModelApiKey = ''
  env.assistantModelBaseUrl = ''
  env.assistantModelName = ''
  env.assistantModelChannelsJson = ''
  env.openaiApiKey = ''
  env.openaiBaseUrl = ''
  env.openaiModel = ''
  const unavailableDirectDraft = await generatePublicAssistantDraft({
    request: {
      question: '生成一首古诗词',
      mode: 'auto',
      history: [],
    },
    plan: directPlan,
    evidence: [],
  })
  assert.equal(unavailableDirectDraft.status, 'degraded')
  assert.equal(unavailableDirectDraft.failure, 'not_configured')
  assert.deepEqual(unavailableDirectDraft.claims, [])
  console.log('Public assistant Responses model adapter contract passed.')
} finally {
  Object.assign(env, original)
  await new Promise<void>((resolve) => server.close(() => resolve()))
}
