import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const configurations = [
  { width: 1440, theme: 'morning', language: 'zh' },
  { width: 320, theme: 'stellar', language: 'en' },
  { width: 390, theme: 'nature', language: 'zh' },
  { width: 430, theme: 'morning', language: 'en' },
]

async function setup(browser, base, configuration, scenario) {
  const page = await browser.newPage({ viewport: { width: configuration.width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  page.setDefaultTimeout(8_000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('external-request'), { allowLoopback: false })
  await page.route('**/api/**', route => {
    errors.push('unhandled-api-request')
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
  })
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'))
  await page.addInitScript(({ configuration: config, scenario: mode }) => {
    localStorage.setItem('biau-port-theme', config.theme)
    localStorage.setItem('biau-port-language', config.language)
    const fixture = window.__readingWarmupFixture = {
      calls: [], visible: mode !== 'hidden', online: mode !== 'offline', fail: mode === 'failure', hold: mode === 'intent',
    }
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => fixture.visible ? 'visible' : 'hidden' })
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => fixture.online })
    if (mode === 'cached') sessionStorage.setItem('biau-public-assistant-warmup-v1', JSON.stringify({ version: 1, readyUntil: Date.now() + 720_000 }))
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (url, init = {}) => {
      const path = new URL(String(url), location.origin).pathname
      if (!path.startsWith('/api/')) return originalFetch(url, init)
      fixture.calls.push({ path, method: init.method ?? 'GET' })
      if (path !== '/api/health') throw new Error('Unexpected business request: ' + path)
      if (fixture.hold) await new Promise(resolve => { fixture.release = resolve })
      return new Response(JSON.stringify(fixture.fail ? { error: 'cold' } : { ok: true }), {
        status: fixture.fail ? 503 : 200, headers: { 'Content-Type': 'application/json' },
      })
    }
  }, { configuration, scenario })
  try {
    await page.goto(base + (scenario === 'failure' ? '/blog' : scenario === 'project' ? '/projects/legal-rag' : '/blog/legal-rag-review'), { waitUntil: 'load' })
    await page.locator('.public-assistant__trigger').waitFor({ state: 'attached' })
    return { page, errors }
  } catch (error) {
    await page.close()
    throw error
  }
}

const calls = page => page.evaluate(() => window.__readingWarmupFixture.calls.length)
const intent = page => page.locator('.public-assistant__trigger').focus()
const navigate = async (page, path) => {
  await page.evaluate(next => {
    history.pushState({}, '', next)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  const pageClass = path.startsWith('/projects/') ? 'page-project-detail'
    : path.startsWith('/blog/') ? 'page-blog-post'
      : { '/blog': 'page-blog', '/projects': 'page-tools', '/status': 'page-status', '/studio': 'page-studio' }[path]
  await page.locator(`.app.${pageClass}`).waitFor({ state: 'attached' })
  // A location change precedes the committed Router effect, especially after lazy routes.
  await page.evaluate(() => new Promise(resolve => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => { channel.port1.close(); channel.port2.close(); resolve() }
    channel.port2.postMessage(null)
  }))
}

export async function checkPublicAssistantReadingWarmup(browser, base) {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Warmup fixtures require a local preview')
  let cases = 0
  for (const configuration of configurations) {
    for (const scenario of ['detail', 'project', 'hidden', 'offline', 'navigation', 'intent', 'failure', 'cached']) {
      if (process.env.UI_CHECK_DIAGNOSTICS === '1') console.error(`reading-warmup ${configuration.width}/${scenario}`)
      const { page, errors } = await setup(browser, base, configuration, scenario)
      try {
        if (scenario === 'hidden' || scenario === 'offline') {
          await page.clock.fastForward(10_000)
          assert.equal(await calls(page), 0, 'Hidden/offline documents must not warm the service')
          await page.evaluate(mode => {
            const fixture = window.__readingWarmupFixture
            if (mode === 'hidden') { fixture.visible = true; document.dispatchEvent(new Event('visibilitychange')) }
            else { fixture.online = true; dispatchEvent(new Event('online')) }
          }, scenario)
          await page.clock.fastForward(3_000)
          await page.evaluate(() => { window.__readingWarmupFixture.visible = false; document.dispatchEvent(new Event('visibilitychange')) })
          await page.clock.fastForward(10_000)
          assert.equal(await calls(page), 0, 'Interrupted reading must restart the dwell window')
          await page.evaluate(() => { window.__readingWarmupFixture.visible = true; document.dispatchEvent(new Event('visibilitychange')) })
        } else if (scenario === 'navigation') {
          await page.clock.fastForward(3_000)
          for (const path of ['/blog', '/projects', '/status', '/studio']) {
            await navigate(page, path)
            await page.clock.fastForward(10_000)
            assert.equal(await calls(page), 0, 'Leaving the detail cancels pending work; excluded routes do not schedule it')
          }
          await navigate(page, '/projects/legal-rag')
        } else if (scenario === 'intent' || scenario === 'failure') {
          await intent(page)
          assert.equal(await calls(page), 1)
          if (scenario === 'failure') {
            await page.clock.fastForward(801)
            await page.waitForFunction(() => window.__readingWarmupFixture.calls.length === 2)
            await page.locator('[data-assistant-warmup="error"]').waitFor({ state: 'attached' })
            await navigate(page, '/blog/legal-rag-review')
          }
        }

        const before = await calls(page)
        await page.clock.fastForward(4_999)
        assert.equal(await calls(page), before, 'No timer-triggered request before five visible seconds')
        await page.clock.fastForward(1)
        const expected = scenario === 'failure' ? 2 : scenario === 'cached' ? 0 : 1
        await page.waitForFunction(count => window.__readingWarmupFixture.calls.length === count, expected)
        if (scenario === 'intent') await page.evaluate(() => { window.__readingWarmupFixture.hold = false; window.__readingWarmupFixture.release() })
        if (!['failure', 'cached'].includes(scenario)) await page.locator('[data-assistant-warmup="ready"]').waitFor({ state: 'attached' })

        await page.clock.fastForward(721_000)
        await navigate(page, '/projects/legal-rag')
        await page.clock.fastForward(10_000)
        assert.equal(await calls(page), expected, 'Cache expiry/navigation cannot turn reading preparation into keepalive')
        assert.equal(await page.locator('#public-assistant-input').count(), 0, 'Passive health must not mount or open the workspace')
        assert.deepEqual(await page.evaluate(() => [...new Set(window.__readingWarmupFixture.calls.map(call => `${call.method} ${call.path}`))]), expected ? ['GET /api/health'] : [])
        assert.deepEqual(errors, [])
        cases += 1
      } catch (error) {
        const state = await page.evaluate(() => ({ path: location.pathname, pageClass: document.querySelector('.app')?.className, calls: window.__readingWarmupFixture.calls, warmup: document.querySelector('[data-assistant-warmup]')?.getAttribute('data-assistant-warmup') })).catch(() => null)
        throw new Error(`${configuration.width}/${scenario}: ${error.message}; ${JSON.stringify(state)}`, { cause: error })
      } finally {
        await page.close()
      }
    }
  }
  return { cases, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch()
  try {
    console.log(JSON.stringify(await checkPublicAssistantReadingWarmup(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174')))
  } finally {
    await browser.close()
  }
}
