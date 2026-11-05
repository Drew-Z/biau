import assert from 'node:assert/strict'
import { env } from '../src/env.js'
import { publicKnowledge, retrieveKnowledge, retrieveProjectCatalog } from '../src/knowledge.js'
import { normalizePublicAssistantPayload, retrieveSiteEvidence, runPublicAssistantAgent } from '../src/publicAssistantAgent.js'
import { retrievePublicAssistantContext } from '../src/ragClient.js'
import { generatePublicAssistantDraft, planPublicAssistantRequest } from '../src/publicAssistantModel.js'
import { toPublicAssistantHttpResponse } from '../src/publicAssistantProjection.js'

const question = '现在站点里哪些项目有公开演示入口？每个项目适合看什么？'
const channel = {
  id: 'unavailable', label: 'Local fixture', provider: 'local', model: '', baseUrl: '', apiKey: '',
  configured: false, isDefault: false, isActive: false,
}
const input = normalizePublicAssistantPayload({
  contractVersion: 2, requestId: '11111111-1111-4111-8111-111111111111',
  message: question, mode: 'auto', history: [], sessionId: 'consultation-fixture-session',
  intent: { kind: 'new-turn', branchId: null, parentRevisionId: null },
})
assert.ok(input)
let networkCalls = 0
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { networkCalls += 1; throw new Error('Live network forbidden') }
const originalAttempts = env.publicAssistantModelMaxAttempts
const originalRagBase = env.assistantRagApiBaseUrl
env.publicAssistantModelMaxAttempts = 1
env.assistantRagApiBaseUrl = 'http://127.0.0.1:1'

try {
  for (const text of [question, '本站现在有哪些可试玩的游戏？', '这个网站的项目怎么体验？', 'What demos are on this site now?']) {
    const plan = await planPublicAssistantRequest({ ...input, question: text }, channel)
    assert.equal(plan.route, 'site', 'Explicit site consultation must stay within site evidence: ' + text)
    assert.equal(plan.requiresFreshness, false)
    const configuredPlan = await planPublicAssistantRequest({ ...input, question: text }, {
      ...channel, model: 'fixture', apiKey: 'fixture-key', baseUrl: 'http://127.0.0.1:1', configured: true,
    })
    assert.equal(configuredPlan.route, 'site', 'Site scope must not depend on planner availability')
  }
  assert.equal((await planPublicAssistantRequest({ ...input, mode: 'web' }, channel)).route, 'web')
  assert.equal((await planPublicAssistantRequest({ ...input, question: '比较本站与外部同类产品的最新能力' }, channel)).route, 'combined')
  assert.equal((await planPublicAssistantRequest({ ...input, question: 'Google Antigravity 最新版本有什么变化？' }, channel)).route, 'web')
  assert.equal((await planPublicAssistantRequest({ ...input, question: '你好' }, channel)).route, 'direct')

  const catalog = retrieveKnowledge(question, 6)
  assert.equal(catalog.citations.length, 6)
  assert.ok(catalog.citations.every(citation => citation.id.startsWith('project:')), 'Catalog queries should return projects before related blog posts')
  assert.equal(new Set(catalog.chunks.map(chunk => chunk.documentId)).size, catalog.chunks.length)
  assert.equal(catalog.chunks.length, catalog.citations.length, 'Each selected project must reach the evidence layer')

  const context = await retrievePublicAssistantContext(question)
  assert.equal(context.retrieval.retrievalMode, 'public-project-catalog')
  const catalogText = context.chunks.map(chunk => chunk.text).join('\n')
  const projects = publicKnowledge.filter(item => item.id.startsWith('project:'))
  for (const project of projects) assert.ok(catalogText.includes(project.href), 'Missing catalog entry: ' + project.id)
  assert.ok(context.chunks.every(chunk => chunk.text.length <= 900), 'No catalog entry may be truncated by the model evidence window')
  assert.ok(context.citations.length <= 8, 'All catalog citations must survive the public projection')
  assert.equal(networkCalls, 0, 'Catalog lookup must not spend an embedding/reranker request')
  assert.equal(retrieveProjectCatalog('Legal RAG 的演示入口是什么？'), null, 'Specific questions keep ordinary retrieval')
  assert.equal(retrieveProjectCatalog('哪些项目的后台密码能公开？'), null, 'Catalog lookup cannot bypass credential guards')
  assert.equal(retrieveProjectCatalog('哪些项目用了 React 技术栈？'), null, 'Architecture questions keep semantic retrieval')

  let siteCalls = 0
  let webCalls = 0
  let answerCalls = 0
  const response = await runPublicAssistantAgent(input, {
    model: {
      plan: request => planPublicAssistantRequest(request, channel),
      answer: request => { answerCalls += 1; return generatePublicAssistantDraft(request, channel) },
    },
    async retrieveSite(queries) {
      siteCalls += 1
      const result = await retrieveSiteEvidence(queries)
      const text = result.evidence.map(item => item.excerpt).join('\n')
      for (const project of projects) assert.ok(text.includes(project.href), 'Agent dropped catalog evidence: ' + project.id)
      return result
    },
    async researchWeb() { webCalls += 1; return { evidence: [], available: true } },
  })
  assert.ok(siteCalls > 0)
  assert.equal(webCalls, 0)
  assert.equal(answerCalls, 1)
  assert.equal(networkCalls, 0)
  assert.equal(response.status, 'degraded')
  assert.equal(response.meta?.research?.route, 'site')
  assert.ok(response.citations.length >= 2)
  assert.ok(response.citations.every(citation => citation.source === 'site' && citation.href.startsWith('/')))
  assert.ok(response.answer.includes('\n\n- '), 'Fallback should be a readable list, not a wall of excerpts')
  assert.ok(response.answer.includes(response.citations[0]!.title))
  assert.equal(response.answer.includes('Google Antigravity'), false)

  const modelInputs: Array<{ question: string; evidence: Array<{ id: string; excerpt: string }> }> = []
  const fixtureChannel = {
    ...channel, model: 'fixture', apiKey: 'fixture-key', baseUrl: 'http://127.0.0.1:1/v1', configured: true,
  }
  globalThis.fetch = async (url, options) => {
    if (String(url) !== `${fixtureChannel.baseUrl}/responses`) {
      networkCalls += 1
      throw new Error('Live network forbidden')
    }
    const body = JSON.parse(String(options?.body)) as { input: Array<{ role: string; content: Array<{ text: string }> }> }
    const user = body.input.find(message => message.role === 'user')
    assert.ok(user?.content[0]?.text)
    const payload: (typeof modelInputs)[number] = JSON.parse(user.content[0].text)
    modelInputs.push(payload)
    const answer = JSON.stringify({
      answer: '以下目录资料列出了项目用途和访问边界；入口实时可用性仍以项目页与状态页为准。',
      status: 'answered',
      claims: payload.evidence.map((item, index) => ({
        id: `catalog-${index + 1}`, text: '目录条目记录了项目用途和访问边界。', citationIds: [item.id],
      })),
      suggestions: [],
    })
    return new Response(`event: response.completed\ndata: ${JSON.stringify({ type: 'response.completed', response: { output_text: answer } })}\n\n`, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
  const modeled = toPublicAssistantHttpResponse(await runPublicAssistantAgent(input, {
    model: {
      plan: request => planPublicAssistantRequest(request, fixtureChannel),
      answer: request => generatePublicAssistantDraft(request, fixtureChannel),
    },
    retrieveSite: retrieveSiteEvidence,
    async researchWeb() { webCalls += 1; return { evidence: [], available: true } },
  }))
  assert.equal(modelInputs.length, 1, 'One in-memory Responses fixture must complete the default agent path')
  assert.equal(modelInputs[0]!.question, question)
  const modelText = modelInputs[0]!.evidence.map(item => item.excerpt).join('\n')
  for (const project of projects) assert.ok(modelText.includes(project.href), 'Model input lost project: ' + project.id)
  assert.ok(modelText.includes('需登录或邀请') && modelText.includes('仅案例/规划') && modelText.includes('未开放直达'))
  assert.equal(modeled.status, 'answered')
  assert.equal(modeled.meta.mode, 'model')
  assert.deepEqual(modeled.citations.map(item => item.id).sort(), modelInputs[0]!.evidence.map(item => item.id).sort())
  assert.equal(modeled.claims.length, modelInputs[0]!.evidence.length)
  assert.equal(webCalls, 0)
  assert.equal(networkCalls, 0)
  console.log(JSON.stringify({ result: 'passed', siteCalls, webCalls, answerCalls, networkCalls, fixtureModelCalls: modelInputs.length, catalogProjects: projects.length, citations: modeled.citations.length }))
} finally {
  globalThis.fetch = originalFetch
  env.publicAssistantModelMaxAttempts = originalAttempts
  env.assistantRagApiBaseUrl = originalRagBase
}
