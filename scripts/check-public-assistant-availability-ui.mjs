import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const { normalizePublicAssistantAnswer, normalizePublicAssistantSessionHistory } = await tsImport('../src/utils/publicAssistantApi.ts', import.meta.url)

const configurations = [
  { width: 1440, theme: 'morning', language: 'zh' },
  { width: 320, theme: 'stellar', language: 'en' },
  { width: 390, theme: 'nature', language: 'zh' },
  { width: 430, theme: 'morning', language: 'en' },
]
const sessionId = 'availability-ui-original-session'
const draft = '现在站点里哪些项目有公开演示入口？每个项目适合看什么？'

async function setup(browser, base, configuration, options = {}) {
  const page = await browser.newPage({ viewport: { width: configuration.width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  page.setDefaultTimeout(8_000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('external-request'), { allowLoopback: false })
  // No unhandled API path may reach a real backend, even if the injected mock fails.
  await page.route('**/api/**', route => {
    errors.push('unexpected-network-api')
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
  })
  await page.clock.install()
  await page.addInitScript(({ configuration: config, options: settings, sessionId: id, draft: text }) => {
    localStorage.setItem('biau-port-language', config.language)
    localStorage.setItem('biau-port-theme', config.theme)
    if (settings.restore) {
      localStorage.setItem('biau-public-assistant-sessions-v2', JSON.stringify({ version: 2, currentSessionId: id, sessionIds: [id] }))
      sessionStorage.setItem('biau-public-assistant-draft-v1:' + id, JSON.stringify({ version: 1, sessionId: id, input: text, mode: 'auto', updatedAt: Date.now() }))
    }
    const fixture = window.__assistantFixture = {
      health: settings.health ?? 'ok', session: settings.session ?? 'missing', chat: settings.chat ?? 'ok',
      calls: [], aborts: 0, cancels: 0,
    }
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (url, init = {}) => {
      const path = new URL(String(url), location.origin).pathname
      if (!path.startsWith('/api/')) return originalFetch(url, init)
      const body = init.body ? JSON.parse(init.body) : null
      fixture.calls.push({ path, method: init.method ?? 'GET', body })
      const kind = path === '/api/health' ? fixture.health : path === '/api/chat/public/session' ? fixture.session : fixture.chat
      const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
      if (kind === 'stall-header') return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => { fixture.aborts += 1; reject(init.signal.reason) }, { once: true })
      })
      const isChat = path === '/api/chat/public/stream' || path === '/api/chat/public'
      const answer = { contractVersion: 1, requestId: body?.requestId, answer: '本站项目可从项目页查看体验入口。', status: 'answered', claims: [], citations: [{ id: 'site-projects', title: '项目集', summary: '公开项目与体验入口', href: '/projects', source: 'site', evidenceStatus: 'verified' }], suggestions: [], meta: { mode: 'model', citationCount: 1 } }
      if (kind === 'stall-body' || (isChat && kind.endsWith('-open'))) {
        const encoder = new TextEncoder()
        let onAbort
        return new Response(new ReadableStream({
          start(controller) {
            onAbort = () => { fixture.aborts += 1; controller.error(init.signal.reason) }
            init.signal?.addEventListener('abort', onAbort, { once: true })
            if (kind === 'result-open') controller.enqueue(encoder.encode('event: result\ndata: ' + JSON.stringify(answer) + '\n\n'))
            if (kind === 'error-open') controller.enqueue(encoder.encode('event: error\ndata: {"code":"public-assistant-service-unavailable"}\n\n'))
          },
          cancel() { fixture.cancels += 1; init.signal?.removeEventListener('abort', onAbort) },
        }), { headers: { 'Content-Type': isChat ? 'text/event-stream' : 'application/json' } })
      }
      if (path === '/api/health') return json({ ok: true, database: !settings.noDatabase, modelConfigured: true })
      if (path === '/api/chat/public/session') return json({ error: kind === 'missing' ? 'session-not-found' : 'database-not-configured' }, kind === 'missing' ? 404 : 503)
      if (path === '/api/chat/public/cancel') return json({ ok: true })
      if (path === '/api/chat/public/stream') {
        if (kind === 'unsupported') return json({}, 404)
        return new Response('event: result\ndata: ' + JSON.stringify(answer) + '\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
      }
      if (path === '/api/chat/public') return json(answer)
      throw new Error('Unexpected fixture path: ' + path)
    }
  }, { configuration, options, sessionId, draft })
  try {
    await page.goto(base + '/blog', { waitUntil: 'load' })
    await page.locator('.public-assistant__trigger').click()
    await page.locator('#public-assistant-input').waitFor()
    return { page, errors }
  } catch (error) {
    await page.close()
    throw error
  }
}

const composer = page => page.locator('#public-assistant-input')
const send = page => page.locator('.public-assistant__composer button[type=submit]')
const chatCount = page => page.evaluate(() => window.__assistantFixture.calls.filter(call => ['/api/chat/public/stream', '/api/chat/public'].includes(call.path)).length)
const ready = page => page.waitForFunction(() => document.querySelector('.public-assistant__composer button[type=submit]')?.disabled === false)

async function checkReceivedAnswerReload(browser, base, configuration) {
  const page = await browser.newPage({ viewport: { width: configuration.width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  page.setDefaultTimeout(10_000)
  const errors = []
  let submissions = 0
  let historyReads = 0
  let history = null
  let phase = 'initial-open'
  const revisionId = 'availability-reload-revision'
  const draft = '现在站点里哪些项目有公开演示入口？每个项目适合看什么？'
  const followup = '继续比较这些项目'
  page.on('pageerror', error => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('external-request'), { allowLoopback: false })
  // This runs on every document: never reset the session registry or draft here.
  await page.addInitScript(({ theme, language }) => {
    if (!localStorage.getItem('biau-port-theme')) localStorage.setItem('biau-port-theme', theme)
    if (!localStorage.getItem('biau-port-language')) localStorage.setItem('biau-port-language', language)
  }, configuration)
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/health') return json({ ok: true, database: true, modelConfigured: true })
    const body = route.request().postDataJSON()
    if (path === '/api/chat/public/session') {
      historyReads += 1
      assert.equal(body.sessionId, history?.session.id)
      return json(history)
    }
    if (path === '/api/chat/public/stream') {
      submissions += 1
      assert.equal(submissions, 1, 'Reload must never replay generation')
      const date = new Date().toISOString()
      const branchId = 'availability-reload-branch'
      const turnId = 'availability-reload-turn'
      const answer = {
        contractVersion: 2, requestId: body.requestId, sessionId: body.sessionId,
        answer: '公开项目可从项目页查看；实时可用性还需核验。', status: 'partial',
        claims: [{ id: 'claim-reload', text: '项目页包含公开项目资料。', citationIds: ['catalog-reload'] }],
        citations: [{ id: 'catalog-reload', title: '公开项目', summary: '项目与访问边界', href: '/projects', source: 'site', evidenceStatus: 'verified' }], suggestions: [],
        conversation: { branchId, branchOrdinal: 1, turnId, revisionId, revisionNo: 1, basedOnRevisionId: null, activated: true },
        meta: { mode: 'model', citationCount: 1, recovery: { state: 'none', attempts: 1 } },
      }
      history = {
        session: { id: body.sessionId, activeBranchId: branchId, title: draft, turnCount: 1, hasEarlierTurns: false, createdAt: date, lastActiveAt: date, expiresAt: new Date(Date.now() + 86400000).toISOString() },
        branches: [{ id: branchId, ordinal: 1, headRevisionId: revisionId, preview: draft, turnCount: 1, hasEarlierTurns: false, lastActiveAt: date }],
        turns: [{ id: turnId, question: draft, mode: 'auto', parentRevisionId: null, selectedRevisionId: revisionId, createdAt: date,
          revisions: [{ id: revisionId, revisionNo: 1, basedOnRevisionId: null, answer: answer.answer, status: answer.status, claims: answer.claims, citations: answer.citations, suggestions: [], route: 'site', meta: answer.meta, createdAt: date, feedback: null }],
        }],
        hasEarlierTurns: false, revisionsTruncated: false, branchesTruncated: false, truncated: false,
      }
      assert.ok(normalizePublicAssistantAnswer(answer))
      assert.ok(normalizePublicAssistantSessionHistory(history))
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: result\ndata: ' + JSON.stringify(answer) + '\n\n' })
    }
    errors.push('unexpected-api: ' + path)
    return json({}, 503)
  })
  const open = async () => {
    await page.locator('.public-assistant__trigger').click()
    await composer(page).waitFor()
    await page.waitForFunction(() => document.querySelector('#public-assistant-input')?.disabled === false)
  }
  try {
    await page.goto(base + '/blog', { waitUntil: 'domcontentloaded' })
    await open()
    await composer(page).fill(draft)
    await ready(page)
    await send(page).click()
    await page.locator('[data-assistant-revision-id="' + revisionId + '"]').waitFor()
    await composer(page).fill(followup)
    for (let reload = 1; reload <= 2; reload += 1) {
      phase = 'reload-' + reload
      await page.reload({ waitUntil: 'domcontentloaded' })
      await open()
      await page.locator('[data-assistant-revision-id="' + revisionId + '"]').waitFor()
      assert.equal(historyReads, reload)
      assert.equal(await page.locator('.public-assistant__message.is-assistant').count(), 1)
      assert.ok((await page.locator('.public-assistant__message.is-assistant').innerText()).includes(history.turns[0].revisions[0].answer))
      assert.equal(await composer(page).inputValue(), followup)
      assert.equal(await send(page).isEnabled(), true)
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('biau-public-assistant-sessions-v2')).currentSessionId), history.session.id)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.equal(submissions, 1)
    }
    assert.deepEqual(errors, [])
  } catch (error) {
    throw new Error(`${configuration.width}/${configuration.language}/${phase}: ${error.message}; submissions=${submissions}, historyReads=${historyReads}`, { cause: error })
  } finally {
    await page.close()
  }
}

export async function checkPublicAssistantAvailability(browser, base) {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Availability fixtures require a local preview')
  let cases = 0
  for (const configuration of configurations) {
    for (const scenario of ['expiry', 'health-header', 'health-body', 'restore', 'chat-header', 'chat-body', 'result-open', 'error-open', 'json', 'no-database']) {
      const options = scenario.startsWith('health-') ? { health: scenario === 'health-header' ? 'stall-header' : 'stall-body' }
        : scenario === 'restore' ? { restore: true, session: 'stall-header' }
          : scenario === 'no-database' ? { noDatabase: true }
            : { chat: { 'chat-header': 'stall-header', 'chat-body': 'stall-body', 'result-open': 'result-open', 'error-open': 'error-open', json: 'unsupported' }[scenario] ?? 'ok' }
      const { page, errors } = await setup(browser, base, configuration, options)
      try {
        if (scenario === 'restore') {
          await page.waitForFunction(() => window.__assistantFixture.calls.some(call => call.path === '/api/chat/public/session'))
          await page.clock.fastForward(20_001)
          await page.locator('.public-assistant__notice--restore').waitFor()
          assert.equal(await send(page).isDisabled(), true)
          assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('biau-public-assistant-sessions-v2')).currentSessionId), sessionId)
          assert.equal(await chatCount(page), 0)
          await page.evaluate(() => { window.__assistantFixture.session = 'missing' })
          await page.locator('.public-assistant__notice--restore button').first().click()
          await page.waitForFunction(() => JSON.parse(localStorage.getItem('biau-public-assistant-sessions-v2')).currentSessionId !== 'availability-ui-original-session')
        }
        await composer(page).fill(draft)
        if (scenario.startsWith('health-')) {
          assert.equal(await send(page).isDisabled(), true)
          await page.clock.fastForward(30_001)
          await page.clock.fastForward(801)
          await page.waitForFunction(() => window.__assistantFixture.calls.filter(call => call.path === '/api/health').length === 2)
          await page.clock.fastForward(30_001)
          await page.locator('[data-assistant-warmup=error]').waitFor()
          assert.equal(await composer(page).inputValue(), draft)
          assert.equal(await chatCount(page), 0)
          assert.equal(await page.evaluate(() => window.__assistantFixture.aborts), 2)
          await page.evaluate(() => { window.__assistantFixture.health = 'ok' })
          await page.locator('[data-assistant-warmup=error] button').click()
        }
        await ready(page)
        if (scenario === 'expiry') {
          const healthBeforeExpiry = await page.evaluate(() => window.__assistantFixture.calls.filter(call => call.path === '/api/health').length)
          await page.clock.fastForward(721_000)
          assert.equal(await send(page).isEnabled(), true, 'An open conversation must survive readiness-cache expiry')
          assert.equal(await page.evaluate(() => window.__assistantFixture.calls.filter(call => call.path === '/api/health').length), healthBeforeExpiry, 'No background keepalive')
          assert.equal(await composer(page).inputValue(), draft)
        }
        await send(page).click()
        if (scenario.startsWith('chat-')) {
          await page.waitForFunction(() => window.__assistantFixture.calls.some(call => call.path === '/api/chat/public/stream'))
          await page.clock.fastForward(65_001)
          await page.locator('.public-assistant__message.is-assistant').waitFor()
          await ready(page)
          assert.equal(await composer(page).inputValue(), draft)
          assert.equal(await chatCount(page), 1, 'Timeout cannot replay a model request')
          assert.equal(await page.evaluate(() => window.__assistantFixture.aborts), 1)
        } else {
          await page.locator('.public-assistant__message.is-assistant').waitFor()
          assert.equal(await chatCount(page), scenario === 'json' ? 2 : 1)
          if (scenario !== 'error-open') {
            assert.equal(await composer(page).inputValue(), '')
            assert.ok((await page.locator('.public-assistant__message.is-assistant').innerText()).includes('本站项目可从项目页查看体验入口。'))
            assert.equal(await page.locator('.public-assistant__message.is-assistant a[href="/projects"]').count() > 0, true)
          }
          if (scenario.endsWith('-open')) assert.equal(await page.evaluate(() => window.__assistantFixture.cancels), 1, 'Terminal SSE must finish without HTTP EOF')
        }
        await composer(page).fill('继续查看本站项目')
        await ready(page)
        if (scenario === 'expiry' || scenario === 'no-database') {
          await composer(page).press('Enter')
          await page.waitForFunction(() => document.querySelectorAll('.public-assistant__message.is-assistant').length === 2)
          assert.equal(await chatCount(page), 2, 'An explicit follow-up sends once')
          const history = await page.evaluate(() => window.__assistantFixture.calls.filter(call => call.path === '/api/chat/public/stream').at(-1).body.history)
          assert.equal(history[0].content, draft)
          assert.equal(history[1].role, 'assistant')
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        assert.deepEqual(errors, [])
        cases += 1
      } catch (error) {
        const state = await page.evaluate(() => ({
          paths: window.__assistantFixture.calls.map(call => call.path),
          health: window.__assistantFixture.health,
          aborts: window.__assistantFixture.aborts,
          notices: [...document.querySelectorAll('.public-assistant__notice')].map(node => node.textContent),
          inputDisabled: document.querySelector('#public-assistant-input')?.disabled,
        })).catch(() => null)
        throw new Error(`${configuration.width}/${configuration.language}/${scenario}: ${error.message}; ${JSON.stringify(state)}`, { cause: error })
      } finally {
        await page.close()
      }
    }
  }
  for (const configuration of configurations) await checkReceivedAnswerReload(browser, base, configuration)
  return { cases, reloadCases: configurations.length * 2, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch()
  try {
    console.log(JSON.stringify(await checkPublicAssistantAvailability(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174')))
  } finally {
    await browser.close()
  }
}
