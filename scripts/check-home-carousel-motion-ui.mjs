import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const themes = ['morning', 'nature', 'stellar']
const languages = ['zh', 'en']

async function snapshot(page) {
  return page.evaluate(() => {
    const track = document.querySelector('.carousel-track')
    const wrapper = document.querySelector('.carousel-wrapper')
    const viewport = document.querySelector('.carousel-viewport')
    const rect = viewport?.getBoundingClientRect()
    return {
      identity: {
        url: location.href,
        historyLength: history.length,
        language: document.documentElement.lang,
        theme: document.documentElement.dataset.siteTheme,
        projects: [...document.querySelectorAll('.carousel-card:not([data-loop-copy="true"])')].map(node => ({
          title: node.querySelector('strong')?.textContent,
          description: node.querySelector('.desc')?.textContent,
          action: node.querySelector('.carousel-action')?.getAttribute('aria-label'),
          entryMode: node.querySelector('.carousel-action')?.getAttribute('data-entry-mode'),
        })),
        footerHref: wrapper?.querySelector('.panel-footer')?.href,
      },
      sameTrack: Boolean(track && track === window.carouselMotionProbe?.track),
      sameWrapper: Boolean(wrapper && wrapper === window.carouselMotionProbe?.wrapper),
      width: innerWidth,
      mobile: matchMedia('(max-width: 768px), (pointer: coarse)').matches,
      coarse: matchMedia('(pointer: coarse)').matches,
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      hidden: document.hidden,
      intro: document.documentElement.classList.contains('harbor-intro-active'),
      hover: wrapper?.matches(':hover'),
      focus: wrapper?.contains(document.activeElement),
      position: Number.parseFloat(track?.style.getPropertyValue('--carousel-scroll-y') || '0'),
      inlineTransform: track?.style.transform,
      transform: track ? getComputedStyle(track).transform : null,
      styleWrites: window.carouselMotionProbe?.writes,
      wheelEvents: window.carouselMotionProbe?.wheelEvents ?? [],
      visibleCards: rect ? [...track.children].filter(node => {
        const card = node.getBoundingClientRect()
        return card.height > 0 && card.bottom > rect.top && card.top < rect.bottom
      }).length : 0,
      viewportRect: rect?.toJSON(),
      scrollY,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  })
}

async function observe(page) {
  await page.evaluate(() => {
    const track = document.querySelector('.carousel-track')
    const probe = { track, wrapper: document.querySelector('.carousel-wrapper'), writes: 0, wheelEvents: [] }
    window.carouselMotionProbe = probe
    const observer = new MutationObserver(records => { probe.writes += records.length })
    observer.observe(track, { attributes: true, attributeFilter: ['style'] })
    const events = new WeakMap()
    const position = () => Number.parseFloat(track.style.getPropertyValue('--carousel-scroll-y') || '0')
    document.addEventListener('wheel', event => {
      events.set(event, { position: position(), trusted: event.isTrusted, cancelable: event.cancelable, ctrlKey: event.ctrlKey, inCarousel: Boolean(event.target.closest?.('.carousel-viewport')) })
    }, { capture: true, passive: true })
    document.addEventListener('wheel', event => {
      probe.wheelEvents.push({ before: events.get(event), after: { position: position(), prevented: event.defaultPrevented } })
    }, { passive: true })
  })
}

async function sampleFrames(page) {
  return page.evaluate(() => new Promise(done => {
    const track = document.querySelector('.carousel-track')
    const start = performance.now()
    const samples = []
    const frame = now => {
      samples.push({ at: now - start, position: Number.parseFloat(track.style.getPropertyValue('--carousel-scroll-y') || '0'), inlineTransform: track.style.transform, writes: window.carouselMotionProbe.writes })
      if (now - start >= 650) done(samples)
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }))
}

async function settle(page) {
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
}

async function checkStatic(page, evidence, stage) {
  await settle(page)
  const before = await snapshot(page)
  const samples = await sampleFrames(page)
  const after = await snapshot(page)
  evidence.stages.push({ stage, before, samples, after })
  assert.ok(before.mobile || before.reduced, `${stage}: the actual mode must require a static track`)
  assert.equal(before.inlineTransform, '', `${stage}: static mode must clear the inline translation`)
  assert.equal(before.position, 0, `${stage}: static mode must reset the position`)
  assert.equal(after.transform, 'none', `${stage}: the static track must not be transformed`)
  assert.equal(after.styleWrites, before.styleWrites, `${stage}: a static track must not keep receiving animation writes`)
  assert.ok(samples.every(sample => sample.position === 0 && sample.inlineTransform === ''))
}

async function checkRunning(page, evidence, stage) {
  await page.locator('.carousel-viewport').evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.locator('.nav-logo').hover()
  await settle(page)
  const before = await snapshot(page)
  const samples = await sampleFrames(page)
  const after = await snapshot(page)
  evidence.stages.push({ stage, before, samples, after })
  assert.equal(before.mobile || before.reduced || before.hidden || before.intro || before.hover || before.focus, false, `${stage}: autoplay must have no active pause reason`)
  assert.ok(samples.some(sample => Math.abs(sample.position - samples[0].position) > 0.2), `${stage}: autoplay must resume without refreshing the page`)
  assert.notEqual(after.transform, 'none')
  assert.ok(after.visibleCards > 0, `${stage}: the measured cycle must keep project cards visible`)
  assert.equal(after.overflow, false)
}

async function checkWheelInertia(page, evidence) {
  const viewport = page.locator('.carousel-viewport')
  await viewport.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await settle(page)
  const rect = await viewport.boundingBox()
  assert.ok(rect, 'the wheel target needs a real rectangle')
  const size = page.viewportSize()
  const left = Math.max(1, rect.x)
  const right = Math.min(size.width - 1, rect.x + rect.width)
  const top = Math.max(1, rect.y)
  const bottom = Math.min(size.height - 1, rect.y + rect.height)
  assert.ok(right > left && bottom > top)
  const point = { x: (left + right) / 2, y: (top + bottom) / 2 }
  await page.mouse.move(point.x, point.y)
  assert.equal(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.carousel-viewport')), point), true)
  await page.mouse.wheel(0, 240)
  await page.waitForFunction(() => window.carouselMotionProbe.wheelEvents.length > 0)
  const before = await snapshot(page)
  const samples = await sampleFrames(page)
  const after = await snapshot(page)
  evidence.stages.push({ stage: 'resized-wheel-inertia', point, before, samples, after })
  assert.ok(before.hover, 'pointer hover must pause autoplay so movement proves inertia')
  for (const event of after.wheelEvents) {
    assert.equal(event.before.trusted && event.before.inCarousel, true, 'real wheel input must reach the carousel')
    assert.equal(event.before.ctrlKey, false)
    assert.equal(event.after.prevented, true)
    assert.ok(Math.abs(event.after.position - event.before.position) > 1, 'ordinary wheel must move the track immediately')
  }
  assert.ok(samples.some(sample => Math.abs(sample.position - samples[0].position) > 1), 'wheel inertia must continue after the immediate input step')
}

async function checkCase(browser, base, configuration) {
  const { theme, language, width, kind } = configuration
  const name = `${kind}-${width}-${theme}-${language}`
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: kind === 'modes' ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
  const evidence = { configuration, stages: [], errors: [], apiRequests: [], modelCalls: 0 }
  let page
  let cdp
  try {
    await installLocalNetworkGuard(context, base, () => evidence.errors.push('external-request'), { allowLoopback: false })
    await context.route(`${base}/api/**`, route => {
      evidence.apiRequests.push(new URL(route.request().url()).pathname)
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local_verification_fixture"}' })
    })
    await context.addInitScript(({ theme, language, origin }) => {
      if (location.origin !== origin) return
      localStorage.setItem('biau-port-theme', theme)
      localStorage.setItem('biau-port-language', language)
      sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    }, { theme, language, origin: new URL(base).origin })
    page = await context.newPage()
    page.setDefaultTimeout(10_000)
    page.on('pageerror', error => evidence.errors.push(error.message))
    await page.goto(base, { waitUntil: 'load' })
    await page.bringToFront()
    await page.waitForFunction(() => {
      const wrapper = document.querySelector('.carousel-wrapper')
      return wrapper && !document.documentElement.classList.contains('harbor-intro-active') && Number.parseFloat(getComputedStyle(wrapper).opacity) >= 0.99
    })
    await page.evaluate(() => document.fonts.ready)
    await observe(page)
    const initial = await snapshot(page)
    assert.equal(initial.identity.theme, theme)
    assert.equal(initial.identity.language, language === 'zh' ? 'zh-CN' : 'en')
    assert.ok(initial.identity.projects.length > 0)
    assert.equal(initial.overflow, false)
    await checkStatic(page, evidence, 'initial-static')

    if (kind === 'resize') {
      await page.setViewportSize({ width: 1440, height: 900 })
      await checkRunning(page, evidence, 'narrow-to-desktop')
      await checkWheelInertia(page, evidence)
      for (const nextWidth of [768, 769, width, 1280]) {
        await page.setViewportSize({ width: nextWidth, height: 900 })
        if (nextWidth <= 768) await checkStatic(page, evidence, `resize-${nextWidth}`)
        else await checkRunning(page, evidence, `resize-${nextWidth}`)
      }
    } else {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await checkRunning(page, evidence, 'reduced-to-running')
      cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
      await page.waitForFunction(() => matchMedia('(pointer: coarse)').matches)
      await checkStatic(page, evidence, 'fine-to-coarse')
      await page.setViewportSize({ width: 390, height: 900 })
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await page.waitForFunction(() => !matchMedia('(pointer: coarse)').matches)
      await checkStatic(page, evidence, 'narrow-fine-pointer')
      await page.setViewportSize({ width: 1440, height: 900 })
      await checkRunning(page, evidence, 'coarse-to-desktop')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await checkStatic(page, evidence, 'running-to-reduced')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await checkRunning(page, evidence, 'reduced-to-running-again')
    }
    const final = await snapshot(page)
    for (const stage of evidence.stages) {
      for (const state of [stage.before, stage.after]) {
        assert.equal(state.sameTrack && state.sameWrapper, true, 'mode changes must preserve the existing carousel nodes')
        assert.deepEqual(state.identity, initial.identity, 'mode changes must preserve content, preferences, links, URL and history')
      }
    }
    assert.deepEqual(final.identity, initial.identity)
    assert.deepEqual(evidence.errors, [])
    assert.deepEqual(evidence.apiRequests, [], 'carousel mode changes must not invoke a service or model')
    if (process.env.UI_CHECK_ARTIFACT_DIR && (kind === 'modes' || width === 320)) {
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `carousel-motion-${name}.png`) })
    }
    evidence.passed = true
  } catch (error) {
    evidence.passed = false
    evidence.error = error.message
    evidence.current = page ? await snapshot(page).catch(() => null) : null
    if (process.env.UI_CHECK_ARTIFACT_DIR && page) {
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `carousel-motion-failure-${name}.png`) }).catch(() => {})
    }
    throw new Error(`${name}: ${error.message}`, { cause: error })
  } finally {
    try {
      if (process.env.UI_CHECK_ARTIFACT_DIR) {
        await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, `carousel-motion-${name}.json`), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' })
      }
    } finally {
      try {
        if (cdp) await cdp.detach()
      } finally { await context.close() }
    }
  }
}

export async function checkHomeCarouselMotion(browser, base) {
  let cases = 0
  for (const theme of themes) {
    for (const language of languages) {
      for (const width of [320, 390, 430]) {
        await checkCase(browser, base, { theme, language, width, kind: 'resize' })
        cases += 1
      }
      await checkCase(browser, base, { theme, language, width: 1440, kind: 'modes' })
      cases += 1
    }
  }
  return { cases, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Home carousel responsive motion passed:', await checkHomeCarouselMotion(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } finally { await browser.close() }
}
