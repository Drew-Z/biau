import assert from 'node:assert/strict'
import { chromium, type BrowserContextOptions, type Page } from 'playwright'
import { resolvePerformanceProfile } from '../src/utils/performanceProfile'

const base = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'

const baseline = {
  reducedMotion: false,
  saveData: false,
  mobileLike: false,
}

assert.equal(resolvePerformanceProfile(baseline), 'balanced', 'unknown signals should preserve balanced mode')
assert.equal(resolvePerformanceProfile({ ...baseline, reducedMotion: true }), 'static', 'reduced motion should be static')
assert.equal(resolvePerformanceProfile({ ...baseline, saveData: true }), 'static', 'Save-Data should be static')
assert.equal(resolvePerformanceProfile({ ...baseline, effectiveType: '2g' }), 'static', '2G should be static')
assert.equal(
  resolvePerformanceProfile({
    ...baseline,
    mobileLike: true,
    deviceMemory: 4,
    hardwareConcurrency: 4,
  }),
  'static',
  'low-memory and low-CPU mobile should be static',
)
assert.equal(
  resolvePerformanceProfile({
    ...baseline,
    mobileLike: true,
    deviceMemory: 4,
    hardwareConcurrency: 8,
  }),
  'balanced',
  'a single weak hardware signal should not downgrade the experience',
)

async function installSignals(
  page: Page,
  signals: {
    deviceMemory?: number
    hardwareConcurrency?: number
    saveData?: boolean
    effectiveType?: string
    introSeen?: boolean
  },
) {
  await page.addInitScript((values) => {
    if (values.deviceMemory !== undefined) {
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: values.deviceMemory })
    }
    if (values.hardwareConcurrency !== undefined) {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: values.hardwareConcurrency,
      })
    }
    if (values.saveData !== undefined || values.effectiveType !== undefined) {
      const connection = new EventTarget()
      Object.assign(connection, {
        saveData: values.saveData ?? false,
        effectiveType: values.effectiveType ?? '4g',
      })
      Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
    }
    if (values.introSeen) window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    else window.sessionStorage.removeItem('biau-port-harbor-intro:v3')
  }, signals)
}

async function readVisualState(page: Page) {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.locator('#root').waitFor({ state: 'attached' })
  return page.evaluate(() => {
    const gradient = document.querySelector('.gradient-bg')
    const grain = document.querySelector('.muxing-flow-grain')
    return {
      profile: document.documentElement.dataset.performance,
      gradientAnimation: gradient ? getComputedStyle(gradient).animationName : null,
      grainDisplay: grain ? getComputedStyle(grain).display : null,
      introMounted: Boolean(document.querySelector('.harbor-intro')),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  })
}

async function newPage(options: BrowserContextOptions, signals = {}) {
  const context = await browser.newContext(options)
  const page = await context.newPage()
  await installSignals(page, signals)
  return { context, page }
}

const browser = await chromium.launch({ headless: true })
try {
  const balanced = await newPage(
    { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
    { introSeen: true },
  )
  const balancedState = await readVisualState(balanced.page)
  assert.equal(balancedState.profile, 'balanced')
  assert.notEqual(balancedState.gradientAnimation, 'none')
  await balanced.context.close()

  for (const width of [320, 390, 430]) {
    const lowPower = await newPage(
      {
        viewport: { width, height: 844 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: 'no-preference',
      },
      { deviceMemory: 4, hardwareConcurrency: 4, saveData: false, effectiveType: '4g' },
    )
    const lowPowerState = await readVisualState(lowPower.page)
    assert.equal(lowPowerState.profile, 'static', `${width}px low-power mobile should be static`)
    assert.equal(lowPowerState.gradientAnimation, 'none', `${width}px static gradient should stop`)
    assert.equal(lowPowerState.grainDisplay, 'none', `${width}px static grain should be hidden`)
    assert.equal(lowPowerState.introMounted, true, `${width}px low-power mobile should retain the one-shot intro`)
    assert.equal(lowPowerState.horizontalOverflow, false, `${width}px should not overflow horizontally`)
    await lowPower.context.close()
  }

  const runtimeChange = await newPage(
    { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
    { saveData: false, effectiveType: '4g', introSeen: true },
  )
  assert.equal((await readVisualState(runtimeChange.page)).profile, 'balanced')
  await runtimeChange.page.evaluate(() => {
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection
    if (!connection) throw new Error('Expected mocked connection')
    connection.saveData = true
    connection.dispatchEvent(new Event('change'))
  })
  await runtimeChange.page.waitForFunction(() => document.documentElement.dataset.performance === 'static')
  await runtimeChange.context.close()

  const saveData = await newPage(
    { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
    { saveData: true, effectiveType: '4g' },
  )
  assert.equal((await readVisualState(saveData.page)).profile, 'static')
  await saveData.context.close()

  const reduced = await newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const reducedState = await readVisualState(reduced.page)
  assert.equal(reducedState.profile, 'static')
  assert.equal(reducedState.introMounted, false, 'reduced-motion should keep the existing intro opt-out')
  await reduced.context.close()
} finally {
  await browser.close()
}

console.log('Performance profile check passed for pure rules and browser rendering')