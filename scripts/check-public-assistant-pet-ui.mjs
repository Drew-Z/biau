import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { tsImport } from 'tsx/esm/api'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const base = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5198'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname))
const artifacts = process.env.UI_CHECK_ARTIFACT_DIR
if (artifacts) await mkdir(artifacts, { recursive: true })
const { normalizePublicAssistantAnswer, normalizePublicAssistantSessionHistory } = await tsImport('../src/utils/publicAssistantApi.ts', import.meta.url)
const { publicAssistantInterfaceCopy } = await tsImport('../src/data/publicAssistantInterfaceCopy.ts', import.meta.url)
const { publicAssistantPetCopy } = await tsImport('../src/data/publicAssistantPetCopy.ts', import.meta.url)
const registryKey = 'biau-public-assistant-sessions-v2'
const configurations = [
  { width: 1440, theme: 'morning', language: 'zh' },
  { width: 320, theme: 'stellar', language: 'en' },
  { width: 390, theme: 'nature', language: 'zh' },
  { width: 430, theme: 'morning', language: 'en' },
]
const fixtures = new Map()
let fixtureSequence = 0
let syntheticChatRequests = 0

// Only the intercepted chat endpoint reaches this loopback server. Real HTTP
// streaming lets each progress frame reach the production decoder separately.
const fixtureServer = createServer(async (request, response) => {
  const fixture = fixtures.get(request.headers['x-pet-fixture'])
  if (!fixture || request.method !== 'POST' || request.url !== '/api/chat/public/stream') {
    response.writeHead(404).end()
    return
  }
  try {
    const chunks = []
    let bytes = 0
    for await (const chunk of request) {
      bytes += chunk.length
      assert.ok(bytes <= 64_000, 'fixture request must stay bounded')
      chunks.push(chunk)
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    response.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': new URL(base).origin,
    })
    response.flushHeaders()
    const stream = {
      body, closed: false,
      progress(stage) {
        if (!this.closed) response.write(`event: progress\ndata: ${JSON.stringify({ stage })}\n\n`)
      },
      result(answer) {
        assert.ok(normalizePublicAssistantAnswer(answer), 'result must satisfy the production decoder')
        if (!this.closed) response.end(`event: result\ndata: ${JSON.stringify(answer)}\n\n`)
      },
      error(code) {
        if (!this.closed) response.end(`event: error\ndata: ${JSON.stringify({ code, requestId: body.requestId })}\n\n`)
      },
      dispose() { if (!this.closed) response.end() },
    }
    response.once('close', () => { stream.closed = true })
    fixture.streams.push(stream)
    syntheticChatRequests += 1
    fixture.streamWaiters.get(fixture.streams.length - 1)?.(stream)
  } catch (error) {
    fixture.errors.push('stream fixture: ' + error.message)
    response.destroy()
  }
})
await new Promise((done, reject) => {
  fixtureServer.once('error', reject)
  fixtureServer.listen(0, '127.0.0.1', done)
})
const fixtureOrigin = `http://127.0.0.1:${fixtureServer.address().port}`
const browser = await chromium.launch({ headless: true })
const results = []

function historyFixture(id, answers = ['已经保存的历史回答'], selected = 0) {
  const date = new Date(Date.now() - 60_000).toISOString()
  const revisions = answers.map((answer, index) => ({
    id: `${id}-revision-${index + 1}`, revisionNo: index + 1,
    basedOnRevisionId: index === 0 ? null : `${id}-revision-${index}`,
    answer, status: 'answered', claims: [], citations: [], suggestions: [], route: 'site',
    meta: { mode: 'model', citationCount: 0 }, createdAt: date, feedback: null,
  }))
  const history = {
    session: {
      id, activeBranchId: id + '-branch', title: id, turnCount: 1, hasEarlierTurns: false,
      createdAt: date, lastActiveAt: date, expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
    branches: [{
      id: id + '-branch', ordinal: 1, headRevisionId: revisions[selected].id, preview: '本地历史夹具',
      turnCount: 1, hasEarlierTurns: false, lastActiveAt: date,
    }],
    turns: [{
      id: id + '-turn', question: '历史问题', mode: 'site', parentRevisionId: null,
      selectedRevisionId: revisions[selected].id, createdAt: date, revisions,
    }],
    hasEarlierTurns: false, revisionsTruncated: false, branchesTruncated: false, truncated: false,
  }
  assert.ok(normalizePublicAssistantSessionHistory(history), 'history must satisfy the production decoder')
  return history
}

function answerFixture(stream, status = 'answered', overrides = {}) {
  const { requestId, sessionId } = stream.body
  return {
    contractVersion: 2, requestId, sessionId, answer: '本地测试回答', status,
    claims: [], citations: [], suggestions: [],
    conversation: {
      branchId: 'pet-test-branch', branchOrdinal: 1, turnId: 'pet-test-turn',
      revisionId: 'pet-test-revision', revisionNo: 1, basedOnRevisionId: null, activated: true,
    },
    meta: { mode: status === 'degraded' ? 'fallback' : 'model', citationCount: 0 },
    ...overrides,
  }
}

async function bounded(promise, label) {
  let timer
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label)), 15_000)
    })])
  } finally { clearTimeout(timer) }
}

async function setup(width, theme, language, reducedMotion = 'reduce', options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion, serviceWorkers: 'block' })
  page.setDefaultTimeout(15000)
  const fixture = {
    id: String(++fixtureSequence), page, language, errors: [], requests: [], streams: [], streamWaiters: new Map(),
    histories: new Map((options.histories ?? []).map(history => [history.session.id, history])),
    historyStatus: options.historyStatus ?? 200, releases: [], copy: publicAssistantInterfaceCopy[language],
  }
  const { errors, requests } = fixture
  fixtures.set(fixture.id, fixture)
  page.on('pageerror', e => errors.push(e.message))
  await installLocalNetworkGuard(page, base, () => errors.push('external-request'), { allowLoopback: false })
  await page.addInitScript(({ theme, language, registry, ids, snapshot }) => {
    localStorage.setItem('biau-port-theme', theme)
    localStorage.setItem('biau-port-language', language)
    if (ids.length) localStorage.setItem(registry, JSON.stringify({ version: 2, currentSessionId: ids[0], sessionIds: ids }))
    if (snapshot) sessionStorage.setItem('biau-public-assistant-history-v1:' + snapshot.session.id, JSON.stringify({
      version: 1, sessionId: snapshot.session.id, capturedAt: Date.now(), expiresAt: Date.now() + 600_000, history: snapshot,
    }))
  }, { theme, language, registry: registryKey, ids: [...fixture.histories.keys()], snapshot: options.snapshot ?? null })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin !== new URL(base).origin) { errors.push('external-api-request'); return route.abort('blockedbyclient') }
    const path = url.pathname
    requests.push(path)
    const reply = (json, status = 200) => route.fulfill({ status, json })
    if (path === '/api/health') return reply({ ok: true, database: true, modelConfigured: true, webSearchConfigured: true })
    if (path === '/api/chat/public/sessions') return reply({ sessions: [...fixture.histories.values()].map(history => history.session) })
    if (path === '/api/chat/public/session') {
      if (request.method() === 'DELETE') return reply({ ok: true })
      const history = fixture.histories.get(request.postDataJSON().sessionId)
      return fixture.historyStatus !== 200 ? reply({ error: 'public-assistant-service-unavailable' }, fixture.historyStatus)
        : history ? reply(history) : reply({ error: 'session-not-found' }, 404)
    }
    if (path === '/api/chat/public/cancel') return reply({ ok: true })
    if (path === '/api/chat/public/stream') return route.continue({
      url: fixtureOrigin + path, headers: { ...request.headers(), 'x-pet-fixture': fixture.id },
    })
    errors.push('unexpected fixture endpoint: ' + path)
    return reply({ error: 'local-fixture-only' }, 503)
  })
  fixture.close = async () => {
    if (!fixture.passed && artifacts && !page.isClosed()) {
      await page.screenshot({ path: resolve(artifacts, `blog-pet-failure-${fixture.id}.png`) }).catch(() => undefined)
      const surface = await page.locator('.public-assistant').evaluate(element => ({
        state: { ...element.dataset }, text: element.textContent,
      })).catch(() => null)
      await writeFile(resolve(artifacts, `blog-pet-failure-${fixture.id}.json`), JSON.stringify({ errors, requests, surface }, null, 2))
    }
    fixture.releases.forEach(release => release())
    fixture.streams.forEach(stream => stream.dispose())
    await page.close()
    fixtures.delete(fixture.id)
  }
  return fixture
}

async function ready(page) {
  await page.locator('.public-assistant-pet__canvas[data-pet-state="ready"]').waitFor()
  assert.equal(await page.locator('.public-assistant-pet').count(), 1)
  assert.equal(await page.locator('.public-assistant-pet canvas').count(), 1)
}
async function contained(page, selector) {
  assert.ok(await page.locator(selector).evaluate(element => {
    const r = element.getBoundingClientRect()
    return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 && element.scrollWidth <= element.clientWidth + 1
  }), selector + ' must fit')
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
}

async function afterPaint(page) {
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
}

async function state(page, expected) {
  await page.waitForFunction(value => {
    const root = document.querySelector('.public-assistant')
    return root && Object.entries(value).every(([key, item]) => root.dataset[key] === String(item))
  }, Object.fromEntries(Object.entries(expected).map(([key, value]) => ['pet' + key[0].toUpperCase() + key.slice(1), value])))
}

async function displayedAction(page, action) {
  await page.waitForFunction(value => document.querySelector('.public-assistant-pet__canvas')?.dataset.action === value, action)
}

async function open(fixture, waitForAssets = true) {
  const { page } = fixture
  await page.goto(base + '/blog')
  if (waitForAssets) await ready(page)
  await page.locator('.public-assistant__trigger').click()
  await page.locator('.public-assistant__panel').waitFor()
  await page.waitForFunction(() => document.querySelector('.public-assistant__composer .is-attach')?.disabled === false)
  if (waitForAssets) await ready(page)
}

async function streamAt(fixture, index) {
  return fixture.streams[index] ?? bounded(new Promise(done => fixture.streamWaiters.set(index, done)), 'chat stream did not start')
}

async function submit(fixture, question = '这是本地模拟测试') {
  const index = fixture.streams.length
  await fixture.page.locator('#public-assistant-input').fill(question)
  await fixture.page.locator('.public-assistant__composer button[type="submit"]').click()
  const stream = await streamAt(fixture, index)
  await state(fixture.page, { activity: 'thinking' })
  if (await fixture.page.locator('.public-assistant-pet__canvas[data-pet-state="ready"]').count()) {
    await displayedAction(fixture.page, 'thinking')
  }
  return stream
}

async function setVisibility(page, visibility) {
  await page.evaluate(value => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value })
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value === 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  }, visibility)
}

async function passed(fixture, name) {
  assert.deepEqual(fixture.errors, [])
  fixture.passed = true
  results.push({ name, pass: true, syntheticChatRequests: fixture.streams.length })
  console.log('[PASS]', name)
}

try {
  for (const width of [1440, 320, 390, 430]) for (const theme of ['morning', 'stellar', 'nature']) for (const language of ['zh', 'en']) {
    const name = `${width}-${theme}-${language}`
    const fixture = await setup(width, theme, language)
    const { page, requests } = fixture
    try {
      await page.goto(base + '/blog')
      await ready(page)
      await contained(page, '.public-assistant__trigger')
      const box = await page.locator('.public-assistant__trigger').boundingBox()
      assert.ok(box.width >= 44 && box.height >= 44)
      assert.equal(requests.filter(p => p.includes('/chat/')).length, 0)
      await page.locator('.public-assistant__trigger').focus()
      await page.keyboard.press('Enter')
      await page.locator('.public-assistant__panel').waitFor()
      await ready(page)
      await contained(page, '.public-assistant__panel')
      await contained(page, '.public-assistant__header')
      await page.waitForFunction(() => document.querySelector('.public-assistant-pet__canvas')?.dataset.activity === 'idle')
      const frame = await page.locator('.public-assistant-pet__canvas').getAttribute('data-entry')
      await page.waitForTimeout(120)
      assert.equal(await page.locator('.public-assistant-pet__canvas').getAttribute('data-entry'), frame)
      await page.keyboard.press('Escape')
      await page.locator('.public-assistant__panel').waitFor({ state: 'detached' })
      await ready(page)
      assert.ok(await page.locator('.public-assistant__trigger').evaluate(e => e === document.activeElement))
      if (artifacts && language === 'zh' && (theme === 'morning' || width === 390)) {
        await page.screenshot({ path: resolve(artifacts, `blog-pet-${name}.png`) })
      }
      assert.equal(requests.filter(p => p.includes('/chat/')).length, 0)
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 0 })
      assert.equal(await page.locator('.public-assistant__trigger').getAttribute('aria-description'), publicAssistantPetCopy[language].activities.idle)
      await passed(fixture, name)
    } finally { await fixture.close() }
  }

  for (const outcome of ['answered', 'partial', 'uncertain', 'degraded', 'blocked']) {
    const fixture = await setup(390, 'morning', 'zh', 'no-preference')
    const { page } = fixture
    try {
      await open(fixture)
      const stream = await submit(fixture)
      if (outcome === 'answered') {
        for (const [stage, activity] of [
          ['understanding_image', 'working'], ['planning', 'thinking'], ['researching', 'working'],
          ['evaluating', 'review'], ['refining', 'working'], ['answering', 'working'],
          ['recovering', 'working'], ['verifying', 'review'], ['saving', 'review'],
        ]) {
          stream.progress(stage)
          await state(page, { activity, unreadCount: 0, feedbackCount: 0 })
          await displayedAction(page, activity)
          assert.equal(await page.locator('.public-assistant__trigger').getAttribute('aria-description'), publicAssistantPetCopy.zh.activities[activity])
        }
      }
      stream.result(answerFixture(stream, outcome))
      await page.getByText('本地测试回答', { exact: true }).waitFor()
      await state(page, { activity: outcome === 'blocked' ? 'needsInput' : 'idle', unreadCount: 0, feedbackCount: outcome === 'answered' ? 1 : 0 })
      if (outcome === 'answered') {
        await page.waitForFunction(() => document.querySelector('.public-assistant-pet__canvas')?.dataset.action === 'happy')
        await page.waitForFunction(() => document.querySelector('.public-assistant-pet__canvas')?.dataset.action === 'idle')
      } else await displayedAction(page, outcome === 'blocked' ? 'waiting' : 'idle')
      await passed(fixture, outcome === 'answered' ? 'nine-progress-stages-and-one-success' : outcome + '-neutral')
    } finally { await fixture.close() }
  }

  for (const configuration of configurations) {
    const { width, theme, language } = configuration
    const fixture = await setup(width, theme, language, 'no-preference')
    const { page } = fixture
    try {
      await open(fixture)
      const stream = await submit(fixture)
      await page.getByRole('button', { name: fixture.copy.closeAssistant, exact: true }).click()
      await page.locator('.public-assistant__panel').waitFor({ state: 'detached' })
      stream.result(answerFixture(stream))
      await state(page, { activity: 'ready', unreadCount: 1, feedbackCount: 1 })
      await ready(page)
      assert.equal(await page.locator('.public-assistant-pet__unread').innerText(), '1')
      assert.match(await page.locator('.public-assistant__trigger').getAttribute('aria-description'), new RegExp(publicAssistantPetCopy[language].unread(1)))
      await contained(page, '.public-assistant-pet__unread')
      await contained(page, '.public-assistant__trigger')
      if (artifacts) await page.screenshot({ path: resolve(artifacts, `blog-pet-unread-${width}-${theme}-${language}.png`) })
      await page.waitForFunction(() => document.querySelector('.public-assistant-pet__canvas')?.dataset.action === 'idle')
      await page.locator('.public-assistant__trigger').click()
      await page.getByText('本地测试回答', { exact: true }).waitFor()
      await ready(page)
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 1 })
      await page.getByRole('button', { name: fixture.copy.closeAssistant, exact: true }).click()
      await ready(page)
      await page.locator('.public-assistant__trigger').click()
      await ready(page)
      await afterPaint(page)
      assert.equal(await page.locator('.public-assistant-pet__canvas').getAttribute('data-action'), 'idle', 'reopening must not celebrate again')
      await state(page, { feedbackCount: 1 })
      await passed(fixture, `background-unread-${width}-${theme}-${language}`)
    } finally { await fixture.close() }
  }

  {
    const fixture = await setup(390, 'nature', 'zh', 'no-preference')
    const { page } = fixture
    try {
      await open(fixture)
      const stream = await submit(fixture)
      await setVisibility(page, 'hidden')
      stream.result(answerFixture(stream))
      await state(page, { activity: 'ready', unreadCount: 1, feedbackCount: 1 })
      await afterPaint(page)
      await state(page, { unreadCount: 1 })
      await setVisibility(page, 'visible')
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 1 })
      await page.waitForFunction(() => document.querySelector('.public-assistant-pet__canvas')?.dataset.action === 'idle')
      await passed(fixture, 'hidden-document-keeps-unread')
    } finally { await fixture.close() }
  }

  {
    const fixture = await setup(430, 'morning', 'en')
    const { page } = fixture
    try {
      await open(fixture)
      const stream = await submit(fixture)
      await page.getByRole('button', { name: fixture.copy.history.open, exact: true }).click()
      await page.locator('.public-assistant__history').waitFor()
      stream.result(answerFixture(stream))
      await state(page, { activity: 'ready', unreadCount: 1, feedbackCount: 1 })
      await afterPaint(page)
      await state(page, { unreadCount: 1 })
      await page.locator('.public-assistant__history header button').click()
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 1 })
      await passed(fixture, 'history-overlay-keeps-unread')
    } finally { await fixture.close() }
  }

  for (const kind of ['cancel', 'failure']) {
    const fixture = await setup(390, 'morning', 'zh', 'no-preference')
    const { page } = fixture
    try {
      await open(fixture)
      const original = await submit(fixture)
      if (kind === 'cancel') await page.getByRole('button', { name: fixture.copy.composer.stopLabel, exact: true }).click()
      else original.error('public-assistant-service-unavailable')
      await page.locator('.public-assistant__notice').waitFor()
      await state(page, { activity: kind === 'cancel' ? 'idle' : 'blocked', unreadCount: 0, feedbackCount: 0 })
      await displayedAction(page, kind === 'cancel' ? 'idle' : 'failed')
      await page.locator('.public-assistant__notice button').first().click()
      const retry = await streamAt(fixture, 1)
      await state(page, { activity: 'thinking', unreadCount: 0, feedbackCount: 0 })
      if (kind === 'cancel') assert.notEqual(retry.body.requestId, original.body.requestId, 'cancel retry must keep the existing fresh transport identity')
      else assert.equal(retry.body.requestId, original.body.requestId, 'transport failure retry must preserve the existing requestId')
      original.result(answerFixture(original, 'answered', { answer: '不应显示的迟到回答' }))
      await afterPaint(page)
      assert.equal(await page.getByText('不应显示的迟到回答', { exact: true }).count(), 0)
      await state(page, { activity: 'thinking', unreadCount: 0, feedbackCount: 0 })
      retry.result(answerFixture(retry))
      await page.getByText('本地测试回答', { exact: true }).waitFor()
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 1 })
      assert.equal(await page.locator('.public-assistant__message.is-user').count(), 1, 'retry must not append another question')
      await passed(fixture, kind + '-retry-and-late-response')
    } finally { await fixture.close() }
  }

  {
    const fixture = await setup(320, 'stellar', 'en')
    const { page } = fixture
    try {
      await open(fixture)
      const original = await submit(fixture)
      await page.locator('.public-assistant__header-actions').getByRole('button', { name: fixture.copy.history.newSession, exact: true }).click()
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 0 })
      original.result(answerFixture(original, 'answered', { answer: '不应进入新会话的结果' }))
      const next = await submit(fixture, '新会话的问题')
      assert.notEqual(next.body.sessionId, original.body.sessionId)
      next.result(answerFixture(next, 'partial'))
      await page.getByText('本地测试回答', { exact: true }).waitFor()
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 0 })
      assert.equal(await page.getByText('不应进入新会话的结果', { exact: true }).count(), 0)
      await passed(fixture, 'new-session-isolates-old-run')
    } finally { await fixture.close() }
  }

  {
    const id = 'pet-revision-session'
    const fixture = await setup(1440, 'nature', 'zh', 'no-preference', { histories: [historyFixture(id)] })
    const { page } = fixture
    try {
      await open(fixture)
      await page.getByText('已经保存的历史回答', { exact: true }).waitFor()
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 0 })
      await page.getByRole('button', { name: fixture.copy.answer.regenerate, exact: true }).click()
      const stream = await streamAt(fixture, 0)
      fixture.histories.set(id, historyFixture(id, ['已经保存的历史回答', '应该确认阅读的新版本']))
      stream.result(answerFixture(stream, 'answered', {
        replayed: true, answer: '应该确认阅读的新版本',
        conversation: { branchId: id + '-branch', branchOrdinal: 1, turnId: id + '-turn', revisionId: id + '-revision-2', revisionNo: 2, basedOnRevisionId: id + '-revision-1', activated: false },
      }))
      await state(page, { activity: 'ready', unreadCount: 1, feedbackCount: 1 })
      await page.getByText('已经保存的历史回答', { exact: true }).waitFor()
      await afterPaint(page)
      await state(page, { unreadCount: 1 })
      await page.getByRole('button', { name: fixture.copy.revision.next, exact: true }).click()
      await page.getByText('应该确认阅读的新版本', { exact: true }).waitFor()
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 1 })
      await page.getByRole('button', { name: fixture.copy.revision.previous, exact: true }).click()
      await afterPaint(page)
      await state(page, { unreadCount: 0, feedbackCount: 1 })
      await passed(fixture, 'old-revision-does-not-read-new-result')
    } finally { await fixture.close() }
  }

  {
    const fixture = await setup(390, 'nature', 'zh')
    const { page } = fixture
    try {
      await open(fixture)
      const stream = await submit(fixture)
      fixture.historyStatus = 503
      stream.result(answerFixture(stream, 'answered', { replayed: true }))
      await page.locator('.public-assistant__notice--restore').waitFor()
      await state(page, { activity: 'needsInput', unreadCount: 0, feedbackCount: 0 })
      await displayedAction(page, 'waiting')
      assert.equal(await page.getByText('本地测试回答', { exact: true }).count(), 0)
      await passed(fixture, 'authoritative-history-failure-needs-input')
    } finally { await fixture.close() }
  }

  {
    const history = historyFixture('pet-snapshot-session')
    const fixture = await setup(430, 'stellar', 'en', 'reduce', { histories: [history], snapshot: history, historyStatus: 503 })
    const { page } = fixture
    try {
      await page.goto(base + '/blog')
      await ready(page)
      await page.locator('.public-assistant__trigger').click()
      await page.getByText('已经保存的历史回答', { exact: true }).waitFor()
      await page.locator('.public-assistant__notice--restore').waitFor()
      await state(page, { unreadCount: 0, feedbackCount: 0 })
      assert.equal(fixture.streams.length, 0)
      await passed(fixture, 'restored-snapshot-does-not-celebrate')
    } finally { await fixture.close() }
  }

  {
    const fixture = await setup(390, 'morning', 'zh', 'no-preference')
    const { page } = fixture
    let release
    const manifestGate = new Promise(done => { release = done })
    fixture.releases.push(release)
    await page.route('**/pets/qinglong/pet.json', async route => {
      await manifestGate
      await route.fulfill({ response: await route.fetch() }).catch(() => undefined)
    })
    try {
      await open(fixture, false)
      const stream = await submit(fixture)
      stream.result(answerFixture(stream))
      await page.getByText('本地测试回答', { exact: true }).waitFor()
      await state(page, { activity: 'idle', unreadCount: 0, feedbackCount: 0 })
      release()
      await ready(page)
      await state(page, { feedbackCount: 1 })
      await page.waitForFunction(() => document.querySelector('.public-assistant-pet__canvas')?.dataset.action === 'happy')
      await page.waitForFunction(() => document.querySelector('.public-assistant-pet__canvas')?.dataset.action === 'idle')
      await passed(fixture, 'read-before-assets-load-keeps-one-feedback')
    } finally { await fixture.close() }
  }

  {
    const fixture = await setup(320, 'stellar', 'en')
    const { page, requests } = fixture
    try {
      await page.route('**/pets/qinglong/pet.json', route => route.fulfill({ status: 404, body: 'unavailable' }))
      await page.goto(base + '/blog')
      await page.locator('.public-assistant-pet__canvas[data-pet-state="error"]').waitFor({ state: 'attached' })
      assert.equal(await page.locator('.public-assistant-pet canvas').count(), 0)
      assert.equal(await page.locator('.public-assistant-pet__fallback').evaluate(e => getComputedStyle(e).visibility), 'visible')
      assert.ok(await page.locator('.public-assistant-pet__fallback').evaluate(async element => {
        const css = getComputedStyle(element)
        const image = new Image()
        image.src = '/pets/qinglong/idle.png'
        await image.decode()
        return css.backgroundImage.includes('/pets/qinglong/idle.png') && css.backgroundSize === '400% 100%' && image.naturalWidth === 1024 && image.naturalHeight === 256
      }), 'fallback must load the accepted Qinglong idle atlas and show exactly its first frame')
      await page.locator('.public-assistant__trigger').click()
      await page.locator('.public-assistant__panel').waitFor()
      await contained(page, '.public-assistant__panel')
      assert.equal(requests.filter(p => p.includes('/chat/')).length, 0)
      await passed(fixture, 'asset-failure-fallback')
    } finally { await fixture.close() }
  }
  console.log(JSON.stringify({ cases: results.length, modelCalls: 0, syntheticChatRequests, results }))
} finally {
  if (artifacts) await writeFile(resolve(artifacts, 'blog-pet-results.json'), JSON.stringify({ cases: results.length, modelCalls: 0, syntheticChatRequests, results }, null, 2))
  for (const fixture of fixtures.values()) await fixture.close()
  await browser.close()
  fixtureServer.closeAllConnections()
  await new Promise(done => fixtureServer.close(done))
}
