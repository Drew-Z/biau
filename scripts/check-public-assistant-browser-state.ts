import assert from 'node:assert/strict'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const sessionStorage = new MemoryStorage()
const windowEvents = new EventTarget()
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    sessionStorage,
    setTimeout,
    clearTimeout,
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
  },
})
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { onLine: true },
})

const browserState = await import('../src/utils/publicAssistantBrowserState')
const { getPublicAssistantSuggestions } = await import('../src/data/assistant')
const warmup = await import('../src/utils/publicAssistantWarmup')

const sessionOne = 'public-session-check-0001'
const sessionTwo = 'public-session-check-0002'
const now = Date.now()

browserState.writePublicAssistantDraft(sessionOne, '未发送的浏览器草稿', 'web', now)
browserState.writePublicAssistantDraft(sessionTwo, '另一个会话', 'site', now)
assert.equal(browserState.readPublicAssistantDraft(sessionOne, now + 1)?.input, '未发送的浏览器草稿')
assert.equal(browserState.readPublicAssistantDraft(sessionOne, now + 1)?.mode, 'web')
assert.equal(browserState.readPublicAssistantDraft(sessionTwo, now + 1)?.input, '另一个会话')
assert.equal(browserState.readPublicAssistantDraft(sessionOne, now + 2 * 60 * 60 * 1_000), null)

const history = {
  session: {
    id: sessionOne,
    activeBranchId: 'branch-check-0001',
    title: '浏览器快照检查',
    turnCount: 1,
    createdAt: new Date(now - 1_000).toISOString(),
    lastActiveAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 60 * 1_000).toISOString(),
  },
  branches: [{
    id: 'branch-check-0001',
    ordinal: 1,
    headRevisionId: 'revision-check-0001',
    preview: '检查快照',
    turnCount: 1,
    hasEarlierTurns: false,
    lastActiveAt: new Date(now).toISOString(),
  }],
  turns: [{
    id: 'turn-check-0001',
    question: '检查快照是否只读',
    mode: 'auto' as const,
    parentRevisionId: null,
    selectedRevisionId: 'revision-check-0001',
    revisions: [{
      id: 'revision-check-0001',
      revisionNo: 1,
      basedOnRevisionId: null,
      answer: '服务端规范化历史可以写入短期快照。',
      status: 'answered' as const,
      claims: [],
      citations: [],
      suggestions: [],
      route: 'direct' as const,
      meta: { mode: 'model' as const, citationCount: 0 },
      createdAt: new Date(now).toISOString(),
      feedback: null,
    }],
    createdAt: new Date(now).toISOString(),
  }],
  hasEarlierTurns: false,
  revisionsTruncated: false,
  branchesTruncated: false,
  truncated: false,
}

browserState.writePublicAssistantHistorySnapshot(history, now)
assert.equal(browserState.readPublicAssistantHistorySnapshot(sessionOne, now + 14 * 60 * 1_000)?.history.session.id, sessionOne)
assert.equal(browserState.readPublicAssistantHistorySnapshot(sessionOne, now + 15 * 60 * 1_000), null)

assert.deepEqual(
  getPublicAssistantSuggestions('/projects/legal-rag').map((item) => item.label),
  ['这个项目解决什么问题', '解释技术栈与取舍', '从哪里开始体验'],
)
assert.deepEqual(
  getPublicAssistantSuggestions('/blog/legal-rag-review').map((item) => item.label),
  ['总结核心结论', '解释相关概念', '整理实践步骤'],
)
assert.equal(getPublicAssistantSuggestions('/status').length, 3)
assert.equal(getPublicAssistantSuggestions('/unknown').length, 3)

let healthRequests = 0
globalThis.fetch = (async () => {
  healthRequests += 1
  if (healthRequests === 1) return new Response(JSON.stringify({ error: 'cold' }), { status: 504 })
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}) as typeof fetch

const first = warmup.startPublicAssistantWarmup()
const concurrent = warmup.startPublicAssistantWarmup()
assert.equal(first, concurrent)
const ready = await first
assert.equal(ready.state, 'ready')
assert.equal(healthRequests, 2)
await warmup.startPublicAssistantWarmup()
assert.equal(healthRequests, 2)
warmup.abortPublicAssistantWarmup()

console.log('Public assistant browser-state checks passed.')
process.exit(0)
