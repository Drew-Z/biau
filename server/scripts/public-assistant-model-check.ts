import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { env } from '../src/env.js'
import { generatePublicAssistantDraft, planPublicAssistantRequest } from '../src/publicAssistantModel.js'
import type { PublicAssistantEvidence, PublicAssistantRequest } from '../src/publicAssistantRuntime.js'
import { readResponsesContent, readResponsesStreamContent } from '../src/responsesApi.js'

const original = {
  assistantModelApiKey: env.assistantModelApiKey,
  assistantModelBaseUrl: env.assistantModelBaseUrl,
  assistantModelName: env.assistantModelName,
  assistantModelProvider: env.assistantModelProvider,
  assistantModelChannelsJson: env.assistantModelChannelsJson,
  assistantModelProtocol: env.assistantModelProtocol,
  publicAssistantRequestTimeoutMs: env.publicAssistantRequestTimeoutMs,
  publicAssistantAnswerTimeoutMs: env.publicAssistantAnswerTimeoutMs,
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
    const streaming = (body as { stream?: boolean }).stream === true
    response.writeHead(200, { 'Content-Type': streaming ? 'text/event-stream' : 'application/json' })
    if (system.includes('只读规划器')) {
      response.end(JSON.stringify({
        output_text: user.includes('生成一首古诗词')
          ? JSON.stringify({ route: 'web', queries: ['古诗词'], requiresFreshness: true })
          : JSON.stringify({ route: 'site', queries: ['Legal RAG'], requiresFreshness: false }),
      }))
      return
    }
    const answer = JSON.stringify({
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
  env.publicAssistantRequestTimeoutMs = 5000
  env.publicAssistantAnswerTimeoutMs = 120
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

  const creativePlan = await planPublicAssistantRequest({
    question: '生成一首古诗词',
    mode: 'auto',
    history: [],
  })
  assert.deepEqual(creativePlan, {
    route: 'direct',
    queries: [],
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

  assert.deepEqual(observedPaths, ['/responses', '/v1/responses', '/responses', '/v1/responses', '/responses', '/v1/responses'])
  assert.equal(observedBodies.length, 6)
  assert.equal((observedBodies[1] as { model?: string }).model, 'fixture-responses-model')
  assert.deepEqual(observedBodies.map((body) => (body as { stream?: boolean }).stream), [false, false, false, false, true, true])
  console.log('Public assistant Responses model adapter contract passed.')
} finally {
  Object.assign(env, original)
  await new Promise<void>((resolve) => server.close(() => resolve()))
}
