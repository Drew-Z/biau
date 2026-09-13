import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const configurations = [
  { width: 1440, theme: 'morning', language: 'zh', reducedMotion: 'no-preference', mode: 'desktop' },
  { width: 1280, theme: 'stellar', language: 'en', reducedMotion: 'no-preference', mode: 'desktop' },
  { width: 1440, theme: 'nature', language: 'zh', reducedMotion: 'no-preference', mode: 'desktop' },
  { width: 320, theme: 'stellar', language: 'en', reducedMotion: 'no-preference', mode: 'narrow' },
  { width: 390, theme: 'nature', language: 'zh', reducedMotion: 'no-preference', mode: 'narrow' },
  { width: 430, theme: 'morning', language: 'en', reducedMotion: 'no-preference', mode: 'narrow' },
  { width: 1440, theme: 'morning', language: 'en', reducedMotion: 'reduce', mode: 'reduced' },
  { width: 1440, theme: 'stellar', language: 'zh', reducedMotion: 'reduce', mode: 'reduced' },
  { width: 1440, theme: 'nature', language: 'en', reducedMotion: 'reduce', mode: 'reduced' },
]

async function snapshot(page) {
  return page.evaluate(() => {
    const track = document.querySelector('.carousel-track')
    return {
      identity: {
        url: location.href,
        historyLength: history.length,
        title: document.title,
        language: document.documentElement.lang,
        theme: document.documentElement.dataset.siteTheme,
        projects: [...document.querySelectorAll('.carousel-card:not([data-loop-copy="true"]) strong')].map(node => node.textContent),
        footerHref: document.querySelector('.carousel-wrapper .panel-footer')?.href,
      },
      carousel: track ? Number.parseFloat(getComputedStyle(track).getPropertyValue('--carousel-scroll-y') || '0') : null,
      transform: track ? getComputedStyle(track).transform : null,
      scrollY,
      scale: visualViewport?.scale,
      visualWidth: visualViewport?.width,
      layoutWidth: innerWidth,
      viewportRect: document.querySelector('.carousel-viewport')?.getBoundingClientRect().toJSON(),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      events: window.carouselWheelEvents ?? [],
    }
  })
}

async function pointAtTarget(page, configuration, outside) {
  const target = page.locator(outside ? 'h1' : configuration.mode === 'narrow' ? '.carousel-card:not([data-loop-copy="true"])' : '.carousel-viewport').first()
  await target.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
  const box = await target.boundingBox()
  assert.ok(box, 'the wheel target must have a real rectangle')
  const viewport = page.viewportSize()
  const left = Math.max(1, box.x)
  const right = Math.min(viewport.width - 1, box.x + box.width)
  const top = Math.max(1, box.y)
  const bottom = Math.min(viewport.height - 1, box.y + box.height)
  assert.ok(right > left && bottom > top, 'the wheel target must intersect the viewport')
  const point = { x: (left + right) / 2, y: (top + bottom) / 2 }
  await page.mouse.move(point.x, point.y)
  const hit = await page.evaluate(({ x, y }) => {
    const node = document.elementFromPoint(x, y)
    return { carousel: Boolean(node?.closest('.carousel-viewport')), heading: Boolean(node?.closest('h1')) }
  }, point)
  assert.equal(outside ? hit.heading : hit.carousel, true, 'fresh coordinates must hit the intended wheel target')
  return point
}

async function observeWheel(page) {
  await page.evaluate(() => {
    window.carouselWheelEvents = []
    const position = () => Number.parseFloat(getComputedStyle(document.querySelector('.carousel-track')).getPropertyValue('--carousel-scroll-y') || '0')
    const beforeEvents = new WeakMap()
    document.addEventListener('wheel', event => {
      beforeEvents.set(event, {
        ctrlKey: event.ctrlKey, deltaX: event.deltaX, deltaY: event.deltaY,
        clientX: event.clientX, clientY: event.clientY, scrollY,
        targetTag: event.target.tagName, targetClass: event.target.getAttribute?.('class'),
        trusted: event.isTrusted, cancelable: event.cancelable,
        prevented: event.defaultPrevented, position: position(),
        inCarousel: Boolean(event.target.closest?.('.carousel-viewport')),
      })
    }, { capture: true, passive: true })
    document.addEventListener('wheel', event => {
      window.carouselWheelEvents.push({ before: beforeEvents.get(event), after: { prevented: event.defaultPrevented, position: position() } })
    }, { passive: true })
  })
}

async function checkCase(browser, base, configuration, action) {
  const name = `${configuration.width}-${configuration.theme}-${configuration.language}-${configuration.mode}-${action}`
  const context = await browser.newContext({ viewport: { width: configuration.width, height: 900 }, reducedMotion: configuration.reducedMotion, serviceWorkers: 'block' })
  const errors = []
  const apiRequests = []
  let page
  let point
  let before
  try {
    await installLocalNetworkGuard(context, base, () => errors.push('external-request'), { allowLoopback: false })
    await context.route(`${base}/api/**`, route => {
      apiRequests.push(new URL(route.request().url()).pathname)
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local_verification_fixture"}' })
    })
    await context.addInitScript(({ value, origin }) => {
      if (location.origin !== origin) return
      localStorage.setItem('biau-port-theme', value.theme)
      localStorage.setItem('biau-port-language', value.language)
      sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    }, { value: configuration, origin: new URL(base).origin })
    page = await context.newPage()
    page.setDefaultTimeout(10_000)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base, { waitUntil: 'load' })
    await page.bringToFront()
    await page.locator('.carousel-viewport').waitFor({ state: 'visible' })
    await page.waitForFunction(() => !document.documentElement.classList.contains('harbor-intro-active') && Number.parseFloat(getComputedStyle(document.querySelector('.carousel-wrapper')).opacity) >= 0.99)
    const outside = action === 'pinch-page'
    point = await pointAtTarget(page, configuration, outside)
    await observeWheel(page)
    before = await snapshot(page)
    assert.equal(before.overflow, false)
    assert.equal(before.scale, 1)
    assert.ok(before.identity.projects.length > 0, 'the real project projection must be present')

    if (action.startsWith('pinch-')) {
      const cdp = await context.newCDPSession(page)
      try {
        await cdp.send('Input.synthesizePinchGesture', { ...point, scaleFactor: 1.4, relativeSpeed: 800, gestureSourceType: 'mouse' })
      } finally { await cdp.detach() }
      await page.waitForFunction(() => visualViewport.scale > 1.3, undefined, { timeout: 4000 })
    } else {
      const modified = action.startsWith('ctrl-')
      if (modified) await page.keyboard.down('Control')
      try {
        await page.mouse.move(point.x, point.y)
        await page.mouse.wheel(0, action === 'ctrl-up' ? -240 : 240)
        await page.waitForFunction(() => window.carouselWheelEvents.length > 0)
      } finally {
        if (modified) await page.keyboard.up('Control')
      }
    }
    const after = await snapshot(page)
    assert.deepEqual(after.identity, before.identity, 'wheel input must preserve the page identity, preferences and projects')
    assert.ok(after.events.length > 0, 'trusted wheel events must reach the page')
    for (const event of after.events) {
      assert.equal(event.before.trusted, true)
      assert.equal(event.before.inCarousel, !outside, 'the actual wheel target must match the intended region')
      assert.equal(event.before.ctrlKey, action !== 'plain')
      const consumed = action === 'plain' && configuration.mode === 'desktop'
      assert.equal(event.after.prevented, consumed, 'only ordinary animated-desktop wheel input belongs to the carousel')
      const movement = Math.abs(event.after.position - event.before.position)
      if (consumed) assert.ok(movement > 1, 'ordinary desktop wheel must still move the carousel immediately')
      else assert.ok(movement < 0.01, 'native wheel input must not be added to the carousel position or inertia')
    }
    if (action.startsWith('pinch-')) {
      assert.ok(after.scale > 1.3 && after.scale < 1.5, 'native pinch must actually zoom the visual viewport')
      assert.ok(after.visualWidth < before.visualWidth * 0.8, 'native zoom must reduce the visible CSS width')
    } else assert.equal(after.scale, before.scale)
    if (configuration.mode !== 'desktop') assert.equal(after.transform, 'none')
    assert.deepEqual(errors, [])
    assert.deepEqual(apiRequests, [], 'homepage wheel input must not invoke a service or model')
    if (process.env.UI_CHECK_ARTIFACT_DIR) {
      await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, `carousel-wheel-${name}.json`), JSON.stringify({ configuration, action, point, before, after, errors, apiRequests, modelCalls: 0 }, null, 2) + '\n', { flag: 'wx' })
      if (action === 'pinch-carousel') await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `carousel-wheel-${configuration.width}-${configuration.theme}-${configuration.language}-${configuration.mode}.png`) })
    }
  } catch (error) {
    if (process.env.UI_CHECK_ARTIFACT_DIR && page) {
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `carousel-wheel-failure-${name}.png`) }).catch(() => {})
      await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, `carousel-wheel-failure-${name}.json`), JSON.stringify({ name, point, before, error: error.message, current: await snapshot(page).catch(() => null), errors, apiRequests }, null, 2) + '\n', { flag: 'wx' })
    }
    throw new Error(`${name}: ${error.message}`, { cause: error })
  } finally { await context.close() }
}

export async function checkHomeCarouselWheel(browser, base) {
  let cases = 0
  for (const configuration of configurations) {
    const actions = configuration.mode === 'desktop'
      ? ['ctrl-up', 'ctrl-down', 'pinch-carousel', 'pinch-page', 'plain']
      : ['ctrl-up', 'pinch-carousel', 'plain']
    for (const action of actions) {
      await checkCase(browser, base, configuration, action)
      cases += 1
    }
  }
  return { cases, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Home carousel wheel zoom passed:', await checkHomeCarouselWheel(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } finally { await browser.close() }
}
