import assert from 'node:assert/strict'
import {
  normalizePublicAssistantAnswer,
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
      id: 'internal-1',
      title: '内部资料',
      href: '/operator',
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

const originalFetch = globalThis.fetch
let feedbackBody: Record<string, unknown> | null = null
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
