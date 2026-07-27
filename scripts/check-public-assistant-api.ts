import assert from 'node:assert/strict'
import {
  deletePublicAssistantSession,
  normalizePublicAssistantAnswer,
  normalizePublicAssistantSessionHistory,
  PublicAssistantTransportError,
  readPublicAssistantEventStream,
  requestPublicAssistantHealth,
  requestPublicAssistantSession,
  requestPublicAssistantSessions,
  requestPublicAssistantStream,
  submitPublicAssistantFeedback,
} from '../src/utils/publicAssistantApi'

const validPayload = {
  answer: '第一段。\n\n第二段。',
  status: 'answered',
  claims: [
    { id: 'claim-1', text: '本站已经公开该项目。', citationIds: ['site-1', 'missing'] },
  ],
  citations: [
    {
      id: 'site-1',
      title: '站内资料',
      summary: '摘要',
      href: '/projects/demo',
      source: 'site',
      section: '项目说明',
      excerpt: '本站已经公开该项目。',
      evidenceStatus: 'verified',
    },
    {
      id: 'web-1',
      title: '外部资料',
      summary: '外部摘要',
      href: 'https://example.com/research',
      source: 'web',
      section: 'Research',
      excerpt: 'Public evidence.',
      evidenceStatus: 'partial',
    },
    {
      id: 'private-1',
      title: '内部资料',
      href: '/private',
      visibility: 'internal',
    },
    {
      id: 'unsafe-web',
      title: '不安全外链',
      href: 'http://example.com',
      source: 'web',
    },
    {
      id: 'credential-web',
      title: '带凭据外链',
      href: 'https://user:pass@example.com',
      source: 'web',
    },
  ],
  suggestions: ['继续了解', '继续了解', '比较一下', '给出步骤'],
  sessionId: 'public-session-1234',
  messageId: 'turn-1234',
  meta: {
    mode: 'model',
    citationCount: 2,
    research: {
      requestedMode: 'web',
      route: 'combined',
      status: 'answered',
      evidenceCount: 2,
      siteEvidenceCount: 1,
      webEvidenceCount: 1,
      retryCount: 0,
      searchAvailable: true,
      rerankerMode: 'deterministic',
      durationMs: 1250,
    },
  },
}

const normalized = normalizePublicAssistantAnswer(validPayload)
assert.ok(normalized)
assert.equal(normalized.answer, '第一段。\n\n第二段。', 'answer paragraphs must survive runtime decoding')
assert.deepEqual(normalized.citations.map((citation) => citation.id), ['site-1', 'web-1'])
assert.deepEqual(normalized.claims[0]?.citationIds, ['site-1'], 'claims may only retain public citation ids')
assert.deepEqual(normalized.suggestions, ['继续了解', '比较一下', '给出步骤'])
assert.equal(normalized.turnId, 'turn-1234')
assert.equal(normalized.meta.research?.route, 'combined')

assert.equal(normalizePublicAssistantAnswer({ ...validPayload, status: 'unknown' }), null)
assert.equal(normalizePublicAssistantAnswer({ ...validPayload, answer: '   ' }), null)

const bounded = normalizePublicAssistantAnswer({
  ...validPayload,
  citations: Array.from({ length: 10 }, (_, index) => ({
    id: `site-${index}`,
    title: `Source ${index}`,
    href: `/source/${index}`,
    source: 'site',
  })),
  claims: Array.from({ length: 15 }, (_, index) => ({
    id: `claim-${index}`,
    text: `Claim ${index}`,
    citationIds: Array.from({ length: 6 }, (_value, citationIndex) => `site-${citationIndex}`),
  })),
})
assert.ok(bounded)
assert.equal(bounded.citations.length, 8)
assert.equal(bounded.claims.length, 12)
assert.equal(bounded.claims[0]?.citationIds.length, 4)

const progress: string[] = []
const streamed = await readPublicAssistantEventStream(new Response([
  'event: ready',
  'data: {"version":1}',
  '',
  'event: progress',
  'data: {"stage":"researching"}',
  '',
  ': heartbeat',
  '',
  'event: progress',
  'data: {"stage":"verifying"}',
  '',
  'event: result',
  `data: ${JSON.stringify(validPayload)}`,
  '',
  'event: done',
  'data: {"ok":true}',
  '',
].join('\n')).body!, (stage) => progress.push(stage))
assert.equal(streamed.answer, '第一段。\n\n第二段。')
assert.deepEqual(progress, ['researching', 'verifying'])

await assert.rejects(
  readPublicAssistantEventStream(new Response([
    'event: error',
    'data: {"code":"public-assistant-stream-timeout"}',
    '',
  ].join('\n')).body!),
  /public-assistant-stream-timeout/u,
)

const originalFetch = globalThis.fetch
let feedbackBody: Record<string, unknown> | null = null
const requestInput = {
  apiBase: 'https://assistant.example.com',
  message: '研究公开资料',
  mode: 'web' as const,
  sessionId: 'public-session-1234',
  history: [],
  pageContext: { path: '/blog', title: '博客', description: '公开文章' },
}
globalThis.fetch = (async () => new Response('{"error":"not-found"}', {
  status: 404,
  headers: { 'Content-Type': 'application/json' },
})) as typeof fetch
await assert.rejects(requestPublicAssistantStream(requestInput), (error: unknown) => (
  error instanceof PublicAssistantTransportError && error.canFallbackToJson
))

globalThis.fetch = (async () => new Response('{"error":"rate-limited"}', {
  status: 429,
  headers: { 'Content-Type': 'application/json', 'Retry-After': '17' },
})) as typeof fetch
await assert.rejects(requestPublicAssistantStream(requestInput), (error: unknown) => (
  error instanceof PublicAssistantTransportError &&
  error.message === 'public-assistant-rate-limited' &&
  error.retryAfterSeconds === 17 &&
  !error.canFallbackToJson
))

const historyPayload = {
  session: {
    id: 'public-session-1234',
    title: '研究公开资料',
    turnCount: 1,
    createdAt: '2026-07-27T08:00:00.000Z',
    lastActiveAt: '2026-07-27T08:01:00.000Z',
    expiresAt: '2026-08-26T08:00:00.000Z',
  },
  turns: [{
    ...validPayload,
    id: 'turn-1234',
    question: '研究公开资料',
    mode: 'web',
    route: 'combined',
    createdAt: '2026-07-27T08:01:00.000Z',
    feedback: 'up',
  }],
  truncated: false,
}
const normalizedHistory = normalizePublicAssistantSessionHistory(historyPayload)
assert.ok(normalizedHistory)
assert.equal(normalizedHistory.turns[0]?.question, '研究公开资料')
assert.equal(normalizedHistory.turns[0]?.citations.length, 2)
assert.equal(normalizedHistory.turns[0]?.feedback, 'up')

globalThis.fetch = (async (input: URL | RequestInfo) => {
  const url = String(input)
  if (url.endsWith('/health')) {
    return new Response(JSON.stringify({ ok: true, database: true, modelConfigured: true, webSearchConfigured: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (url.endsWith('/chat/public/sessions')) {
    return new Response(JSON.stringify({ sessions: [historyPayload.session] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify(historyPayload), { headers: { 'Content-Type': 'application/json' } })
}) as typeof fetch
const health = await requestPublicAssistantHealth('https://assistant.example.com')
assert.equal(health.modelConfigured, true)
const sessions = await requestPublicAssistantSessions({
  apiBase: 'https://assistant.example.com',
  sessionIds: ['public-session-1234'],
})
assert.equal(sessions[0]?.title, '研究公开资料')
const restored = await requestPublicAssistantSession({
  apiBase: 'https://assistant.example.com',
  sessionId: 'public-session-1234',
})
assert.equal(restored.turns[0]?.answer, '第一段。\n\n第二段。')

let deleteMethod = ''
let deleteBody: Record<string, unknown> | null = null
globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
  deleteMethod = init?.method ?? ''
  deleteBody = JSON.parse(String(init?.body)) as Record<string, unknown>
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
}) as typeof fetch
await deletePublicAssistantSession({ apiBase: 'https://assistant.example.com', sessionId: 'public-session-1234' })
assert.equal(deleteMethod, 'DELETE')
assert.equal(deleteBody.sessionId, 'public-session-1234')

globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
  feedbackBody = JSON.parse(String(init?.body)) as Record<string, unknown>
  return new Response('{}', { status: 200 })
}) as typeof fetch

try {
  await submitPublicAssistantFeedback({
    apiBase: 'https://assistant.example.com',
    sessionId: 'public-session-1234',
    turnId: 'turn-1234',
    rating: 'down',
    reason: 'missing-sources',
    comment: `  ${'需要 更多 来源 '.repeat(40)}  `,
  })
} finally {
  globalThis.fetch = originalFetch
}

assert.ok(feedbackBody)
assert.equal('apiBase' in feedbackBody, false, 'transport-only API base must not enter the feedback payload')
assert.equal(feedbackBody.rating, 'down')
assert.equal(feedbackBody.reason, 'missing-sources')
assert.equal(typeof feedbackBody.comment, 'string')
assert.ok(String(feedbackBody.comment).length <= 240)

console.log('Public assistant browser API contracts passed.')
