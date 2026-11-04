import assert from 'node:assert/strict'
import { env } from '../src/env.js'
import { retrieveKnowledge } from '../src/knowledge.js'
import { normalizePublicAssistantPayload, runPublicAssistantAgent } from '../src/publicAssistantAgent.js'
import { generatePublicAssistantDraft, planPublicAssistantRequest } from '../src/publicAssistantModel.js'
import type { PublicAssistantEvidence } from '../src/publicAssistantRuntime.js'

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
env.publicAssistantModelMaxAttempts = 1

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
      const documents = retrieveKnowledge(queries[0] ?? question, 6).citations
      const evidence: PublicAssistantEvidence[] = documents.map(document => ({
        id: document.id, title: document.title, source: 'site', canonicalUrl: document.href,
        section: '摘要', excerpt: document.summary, text: document.summary, publishedAt: null, score: 1,
        citation: { ...document, source: 'site', canonicalUrl: document.href, evidenceStatus: 'verified' },
      }))
      return { evidence }
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
  console.log(JSON.stringify({ result: 'passed', siteCalls, webCalls, answerCalls, networkCalls, citations: response.citations.length }))
} finally {
  globalThis.fetch = originalFetch
  env.publicAssistantModelMaxAttempts = originalAttempts
}
