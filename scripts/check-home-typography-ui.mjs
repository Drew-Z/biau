import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'
import { heroContent } from '../src/data/hero.ts'

const themes = ['morning', 'nature', 'stellar']
const languages = ['zh', 'en']
const categories = { signal: 'green', preview: 'violet', commerce: 'amber', image: 'rose' }

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(animation => (
      Number.isFinite(animation.effect?.getComputedTiming().endTime)
    )).map(animation => animation.finished.catch(() => {})))
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
}

async function snapshot(page) {
  const handle = await page.waitForFunction(categoryTokens => {
    const title = document.querySelector('.hero-title-rotator')
    const titleChars = [...(title?.querySelectorAll('.char') ?? [])]
    // GSAP writes inline opacity outside document.getAnimations(). Read readiness
    // and the snapshot in one browser task so a rotation cannot split the two.
    if (!title || !titleChars.length || title.classList.contains('has-hero-title-ghost') ||
      [title, ...titleChars].some(node => Number(getComputedStyle(node).opacity) !== 1)) return false
    const root = document.documentElement
    const rect = node => node.getBoundingClientRect().toJSON()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const drawing = canvas.getContext('2d')
    const rgba = color => {
      drawing.clearRect(0, 0, 1, 1)
      drawing.fillStyle = color
      drawing.fillRect(0, 0, 1, 1)
      return [...drawing.getImageData(0, 0, 1, 1).data]
    }
    const text = (node, role, cardIndex = null, direct = false) => {
      if (!node || !node.getBoundingClientRect().height) return null
      const style = getComputedStyle(node)
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
      const ranges = []
      let child
      while ((child = walker.nextNode())) {
        if (!child.textContent.trim() || (direct && child.parentElement !== node)) continue
        if (!child.parentElement.getBoundingClientRect().height) continue
        const range = document.createRange()
        range.selectNodeContents(child)
        ranges.push(...[...range.getClientRects()].map(box => box.toJSON()))
      }
      let opacity = 1
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) opacity *= Number(getComputedStyle(ancestor).opacity)
      return {
        role, cardIndex, text: node.textContent, rect: rect(node), ranges,
        color: rgba(style.color), opacity, fontFamily: style.fontFamily,
        fontWeight: style.fontWeight, fontSize: style.fontSize,
      }
    }
    const originals = [...document.querySelectorAll('.carousel-card:not([data-loop-copy="true"])')]
    const viewport = rect(document.querySelector('.carousel-viewport'))
    const allCards = [...document.querySelectorAll('.carousel-card')]
    // Autoplay can expose a loop copy while its original is above the viewport.
    // Measure the actually painted instance without changing motion or DOM identity.
    const nodes = originals.map(original => allCards.find(candidate => {
      const box = rect(candidate)
      return candidate.dataset.portIndex === original.dataset.portIndex && box.height > 0 &&
        box.bottom > viewport.top + 6 && box.top < viewport.bottom - 6
    }) ?? original)
    const cards = nodes.map(node => {
      const style = getComputedStyle(node)
      const title = node.querySelector('strong')
      const action = node.querySelector('.carousel-action')
      return {
        category: Object.keys(categoryTokens).find(category => node.classList.contains(category)),
        title: title.textContent, description: node.querySelector('.desc').textContent,
        entryMode: action.dataset.entryMode, rect: rect(node), body: rect(node.querySelector('div')),
        action: rect(action), titleRect: rect(title), descriptionRect: rect(node.querySelector('.desc')),
        accent: rgba(style.getPropertyValue('--card-accent')),
        marker: rgba(getComputedStyle(node, '::before').color),
        border: rgba(style.borderTopColor), leftBorder: rgba(style.borderLeftColor),
        background: style.backgroundImage, surface: style.getPropertyValue('--home-card-surface').trim(),
        shadow: style.boxShadow, backdrop: style.backdropFilter,
        paddingTop: Number.parseFloat(style.paddingTop) + Number.parseFloat(style.borderTopWidth),
        paddingBottom: Number.parseFloat(style.paddingBottom) + Number.parseFloat(style.borderBottomWidth),
      }
    })
    const texts = []
    const collect = (selector, role) => {
      document.querySelectorAll(selector).forEach(node => texts.push(text(node, role)))
    }
    document.querySelectorAll('.hero-title-rotator .char').forEach(node => {
      if (!node.closest('.hero-subline')) texts.push(text(node, 'hero-title'))
    })
    collect('.hero-body', 'hero-copy')
    collect('.hero-intro .eyebrow', 'eyebrow')
    collect('.status-text span', 'status-label')
    collect('.status-text strong', 'status-value')
    collect('.panel-head p', 'panel-title')
    collect('.panel-head span', 'panel-copy')
    collect('.panel-head > strong', 'panel-count')
    collect('.hero-panel .panel-footer > span', 'panel-action')
    collect('.nav-link-en', 'navigation')
    nodes.forEach((node, index) => {
      texts.push(text(node.querySelector('strong'), 'card-title', index))
      texts.push(text(node.querySelector('.desc'), 'card-copy', index, true))
      texts.push(text(node.querySelector('.literary-title'), 'card-poem', index))
      node.querySelectorAll('.carousel-action__label').forEach(label => texts.push(text(label, 'card-action', index)))
    })
    return {
      theme: root.dataset.siteTheme, language: root.lang, width: innerWidth, height: innerHeight,
      url: location.href, historyLength: history.length, scrollX, scrollY,
      overflow: root.scrollWidth - root.clientWidth,
      viewport,
      occluders: [...document.querySelectorAll('.navigation-top, .mobile-tabbar, .public-assistant__trigger')]
        .map(node => ({ selector: node.className, ...rect(node) })).filter(box => box.height > 0),
      palette: Object.fromEntries(Object.entries(categoryTokens).map(([category, token]) => [category, rgba(getComputedStyle(root).getPropertyValue(`--home-${token}`))])),
      expectedBorder: rgba(getComputedStyle(root).getPropertyValue('--home-card-border')),
      sameNodes: !window.homeTypographyNodes || originals.every((node, index) => node === window.homeTypographyNodes[index]),
      cards, texts: texts.filter(Boolean),
    }
  }, categories, { timeout: 15_000 })
  try { return await handle.jsonValue() } finally { await handle.dispose() }
}

function checkCategories(state, normal = false) {
  assert.equal(state.cards.length, heroContent.projects.length, 'all registered projects must remain present')
  assert.equal(new Set(state.cards.map(card => JSON.stringify(card.accent))).size, 4, 'four distinct category accents must survive the cascade')
  for (const card of state.cards) {
    assert.ok(card.category, 'each card needs a known semantic category')
    assert.deepEqual(card.accent, state.palette[card.category], `${card.category}: accent must follow its semantic palette`)
    assert.deepEqual(card.marker, card.accent, `${card.category}: the visible index must retain the category color`)
    assert.deepEqual(card.leftBorder, card.accent, `${card.category}: border shorthand must not erase the category edge`)
    if (normal) assert.deepEqual(card.border, state.expectedBorder, `${card.category}: normal borders must share the theme material`)
  }
  if (state.theme === 'stellar') {
    assert.equal(new Set(state.cards.map(card => card.surface)).size, 1, 'Stellar variants must consume the same base material')
    assert.equal(new Set(state.cards.map(card => card.shadow)).size, 1, 'Stellar material treatment must apply to every variant')
    assert.equal(new Set(state.cards.map(card => card.backdrop)).size, 1)
  }
}

function checkLayoutAndRoles(state) {
  assert.ok(state.overflow <= 1, 'the document must not overflow horizontally')
  assert.ok(state.texts.some(text => text.role === 'hero-title'), 'the main title must remain visible')
  for (const [index, card] of state.cards.entries()) {
    assert.ok(card.rect.left >= -1 && card.rect.right <= state.width + 1, `${card.title}: card must fit the viewport`)
    assert.ok(card.body.top >= card.rect.top + card.paddingTop - 1 && card.body.bottom <= card.rect.bottom - card.paddingBottom + 1, `${card.title}: full content must fit inside the card padding`)
    assert.ok(card.body.right <= card.action.left - 3, `${card.title}: text and action must not overlap`)
    assert.ok(card.action.width >= 44 && card.action.height >= 44, `${card.title}: action must retain a 44px target`)
    assert.ok(card.titleRect.bottom <= card.descriptionRect.top + 1, `${card.title}: title and description must not overlap`)
    if (state.width > 768) assert.equal(card.rect.height, 124, 'desktop cards share a measured content height')
    for (const label of state.texts.filter(text => text.cardIndex === index)) {
      const bounds = label.role === 'card-action' ? card.action : card.body
      for (const range of label.ranges) {
        assert.ok(range.left >= bounds.left - 1 && range.right <= bounds.right + 1 && range.top >= bounds.top - 1 && range.bottom <= bounds.bottom + 1, `${card.title}: ${label.role} must display its complete text within its column`)
      }
    }
  }
  if (state.width <= 768) assert.ok(state.cards[0].rect.top < state.height - 72, 'the first project must appear in the initial mobile viewport')
  for (const text of state.texts) {
    if (text.role === 'hero-title') assert.equal(text.opacity, 1, 'the reading sample must wait for the title reveal to finish')
    const expectedWeight = ['status-value', 'panel-title', 'panel-count', 'card-action', 'panel-action', 'eyebrow', 'navigation'].includes(text.role) ? '500' : '400'
    assert.equal(text.fontWeight, expectedWeight, `${text.role}: use the reviewed text role instead of generic bold type`)
    if (text.role === 'card-title') assert.match(text.fontFamily, /serif/i, 'card titles use the existing display serif stack')
  }
  for (const index of state.cards.keys()) {
    const title = state.texts.find(text => text.cardIndex === index && text.role === 'card-title')
    const copy = state.texts.find(text => text.cardIndex === index && text.role === 'card-copy')
    assert.notDeepEqual(title.color, copy.color, 'card title and body must have distinct color roles')
  }
}

async function sampleContrast(page, state) {
  // Mask glyph paint only: surfaces, borders, geometry and opacity remain real.
  const mask = await page.addStyleTag({ content: `
    .hero-title-rotator, .hero-title-rotator::before,
    .hero-title-rotator .char { visibility: hidden !important; }
    .hero-body, .hero-intro .eyebrow, .status-text span, .status-text strong, .panel-head p,
    .panel-head span, .panel-head > strong, .carousel-card strong,
    .carousel-card .desc, .carousel-card .desc *, .carousel-action,
    .carousel-action *, .panel-footer > span, .nav-link-en {
      color: transparent !important; -webkit-text-fill-color: transparent !important;
      text-shadow: none !important;
    }` })
  let background
  try {
    await settle(page)
    background = await page.screenshot({ scale: 'css' })
  } finally {
    await mask.evaluate(node => node.remove())
    await settle(page)
  }
  const { data, info } = await sharp(background).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const luminance = rgb => {
    const linear = rgb.map(value => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4)
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  }
  const measurements = []
  for (const text of state.texts) {
    const ratios = []
    let occludedRanges = 0
    const alpha = text.color[3] / 255 * text.opacity
    assert.ok(alpha > 0 && alpha <= 1, `${text.role}: visible text needs a valid alpha`)
    for (const range of text.ranges) {
      // Measure complete, actually visible lines. Fixed navigation and the assistant
      // can cover a line during scrolling; later mobile samples expose it again.
      if (range.top < 0 || range.bottom > state.height || range.left < 0 || range.right > state.width) continue
      if (text.cardIndex !== null && state.width > 768 && (range.top < state.viewport.top + 6 || range.bottom > state.viewport.bottom - 6)) continue
      if (text.role !== 'navigation' && state.occluders.some(box => range.left < box.right && range.right > box.left && range.top < box.bottom && range.bottom > box.top)) {
        occludedRanges += 1
        continue
      }
      for (const dx of [0.2, 0.5, 0.8]) for (const dy of [0.25, 0.75]) {
        const x = Math.floor(range.x + range.width * dx)
        const y = Math.floor(range.y + range.height * dy)
        if (x < 0 || x >= info.width || y < 0 || y >= info.height) continue
        const offset = (y * info.width + x) * 4
        const backdrop = [...data.subarray(offset, offset + 3)]
        const foreground = text.color.slice(0, 3).map((value, channel) => value * alpha + backdrop[channel] * (1 - alpha))
        const a = luminance(foreground)
        const b = luminance(backdrop)
        ratios.push((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05))
      }
    }
    if (ratios.length) measurements.push({ role: text.role, cardIndex: text.cardIndex, text: text.text, minimum: Math.min(...ratios), samples: ratios.length, occludedRanges })
  }
  assert.ok(measurements.some(row => row.role === 'card-title'), 'contrast sampling must include actual visible card text')
  if (state.scrollY < 1) assert.ok(measurements.some(row => row.role === 'hero-title'), 'the initial sample must include the Hero title')
  return measurements
}

async function captureState(page, evidence, stage) {
  await settle(page)
  const state = await snapshot(page)
  const record = { stage, state }
  evidence.stages.push(record)
  checkCategories(state, stage === 'initial')
  checkLayoutAndRoles(state)
  record.contrast = await sampleContrast(page, state)
  for (const row of record.contrast) assert.ok(row.minimum >= 4.5, `${stage}: ${row.role} ${row.minimum.toFixed(2)}:1 is below 4.5:1 (${row.text})`)
  if (process.env.UI_CHECK_ARTIFACT_DIR) {
    await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, `home-typography-${evidence.name}-${stage}.png`), await page.screenshot({ fullPage: true, scale: 'css' }), { flag: 'wx' })
  }
  return state
}

async function platformFonts(context, page) {
  const cdp = await context.newCDPSession(page)
  try {
    await cdp.send('DOM.enable')
    await cdp.send('CSS.enable')
    const { root } = await cdp.send('DOM.getDocument')
    const fonts = {}
    for (const selector of ['.hero-title-rotator .char', '.carousel-card strong', '.carousel-card .desc', '.carousel-action__label--full', '.nav-link-en']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
      fonts[selector] = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts
    }
    return fonts
  } finally { await cdp.detach() }
}

async function checkCase(browser, base, theme, language, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const evidence = { name: `${theme}-${language}-${width}`, stages: [], errors: [], apiRequests: [], modelCalls: 0 }
  let page
  try {
    await installLocalNetworkGuard(context, base, () => evidence.errors.push('external-request'), { allowLoopback: false })
    await context.route(`${base}/api/**`, route => {
      const request = { path: new URL(route.request().url()).pathname, method: route.request().method() }
      evidence.apiRequests.push(request)
      // Moving across the floating assistant can trigger its existing health warmup.
      // Fulfill only this read locally; every other API attempt still fails the check.
      const health = request.path === '/api/health' && request.method === 'GET'
      return route.fulfill({ status: health ? 200 : 503, contentType: 'application/json', body: health ? '{"ok":true}' : '{"error":"local_verification_fixture"}' })
    })
    await context.addInitScript(({ origin, theme, language }) => {
      if (location.origin !== origin) return
      if (localStorage.getItem('biau-port-theme') === null) localStorage.setItem('biau-port-theme', theme)
      if (localStorage.getItem('biau-port-language') === null) localStorage.setItem('biau-port-language', language)
      sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    }, { origin: new URL(base).origin, theme, language })
    page = await context.newPage()
    page.setDefaultTimeout(15_000)
    page.on('pageerror', error => evidence.errors.push(error.message))
    await page.goto(base, { waitUntil: 'load' })
    await page.bringToFront()
    await page.waitForFunction(() => ['reduced-settled', 'paused', 'css-fallback'].includes(document.querySelector('.flow-background')?.getAttribute('data-flow-motion')))
    const initial = await captureState(page, evidence, 'initial')
    assert.equal(initial.theme, theme)
    assert.equal(initial.language, language === 'zh' ? 'zh-CN' : 'en')
    if (width <= 768) {
      for (const index of [...new Set([Math.floor(initial.cards.length / 3), Math.floor(initial.cards.length * 2 / 3), initial.cards.length - 1])]) {
        await page.locator('.carousel-card:not([data-loop-copy="true"])').nth(index).evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
        await captureState(page, evidence, 'mobile-reading-' + index)
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    }
    await page.evaluate(() => { window.homeTypographyNodes = [...document.querySelectorAll('.carousel-card:not([data-loop-copy="true"])')] })
    if (width === 1440) evidence.platformFonts = await platformFonts(context, page)
    for (const category of Object.keys(categories)) {
      const action = page.locator(`.carousel-card.${category}:not([data-loop-copy="true"]) .carousel-action`).first()
      await action.hover()
      await settle(page)
      checkCategories(await snapshot(page))
      await action.focus()
      await settle(page)
      checkCategories(await snapshot(page))
    }
    const alternateTheme = themes[(themes.indexOf(theme) + 1) % themes.length]
    await page.locator(`[data-theme-option="${alternateTheme}"]`).click()
    await page.locator('.nav-lang-toggle').click()
    await settle(page)
    const changed = await snapshot(page)
    checkCategories(changed)
    assert.equal(changed.theme, alternateTheme)
    assert.equal(changed.language, language === 'zh' ? 'en' : 'zh-CN')
    assert.equal(changed.sameNodes, true, 'theme/language switching must preserve project nodes')
    assert.deepEqual(changed.cards.map(card => [card.title, card.description, card.entryMode]), initial.cards.map(card => [card.title, card.description, card.entryMode]))
    assert.equal(changed.url, initial.url)
    assert.equal(changed.historyLength, initial.historyLength)
    await page.locator(`[data-theme-option="${theme}"]`).click()
    await page.locator('.nav-lang-toggle').click()
    await page.evaluate(() => {
      document.querySelector('.carousel-viewport').scrollTop = 0
      scrollTo({ top: 0, behavior: 'instant' })
    })
    await settle(page)
    const restored = await snapshot(page)
    assert.equal(restored.theme, initial.theme)
    assert.equal(restored.language, initial.language)
    assert.equal(restored.sameNodes, true)
    assert.equal(restored.url, initial.url)
    assert.equal(restored.historyLength, initial.historyLength)
    checkCategories(restored)
    checkLayoutAndRoles(restored)
    if (width === 1440) {
      // Pause the cards with a real focus owner while sampling an animated backdrop.
      await page.locator('.carousel-action').first().focus()
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.waitForFunction(() => ['running', 'css-fallback'].includes(document.querySelector('.flow-background')?.getAttribute('data-flow-motion')))
      // Deliberately enter a real title rotation; sampling must await the JS
      // character reveal as well as CSS transitions, with the backdrop running.
      await page.locator('.hero-title-rotator').press('Enter')
      await page.locator('.carousel-action').first().focus()
      await captureState(page, evidence, 'animated-background')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addInitScript(() => {
        Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', { configurable: true, value: undefined })
        const getContext = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return kind === 'webgl2' || kind === 'webgl' ? null : getContext.call(this, kind, ...args)
        }
      })
      await page.reload({ waitUntil: 'load' })
      await page.waitForFunction(() => document.querySelector('.flow-background')?.getAttribute('data-flow-motion') === 'css-fallback')
      await captureState(page, evidence, 'css-fallback')
    }
    assert.deepEqual(evidence.errors, [])
    assert.deepEqual(evidence.apiRequests.filter(request => request.path !== '/api/health' || request.method !== 'GET'), [], 'only the local health fixture may be requested; no business API or model calls')
    evidence.passed = true
    return evidence.stages.length
  } catch (error) {
    evidence.passed = false
    evidence.error = error.message
    if (page && process.env.UI_CHECK_ARTIFACT_DIR) {
      await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, `home-typography-${evidence.name}-failure.png`), await page.screenshot({ fullPage: true }), { flag: 'wx' }).catch(() => {})
    }
    throw new Error(`${evidence.name}: ${error.message}`, { cause: error })
  } finally {
    try {
      if (process.env.UI_CHECK_ARTIFACT_DIR) await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, `home-typography-${evidence.name}.json`), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' })
    } finally { await context.close() }
  }
}

export async function checkHomeTypography(browser, base) {
  let configurations = 0
  let backgroundSamples = 0
  for (const theme of themes) for (const language of languages) for (const width of [1440, 320, 390, 430]) {
    backgroundSamples += await checkCase(browser, base, theme, language, width)
    configurations += 1
  }
  return { configurations, backgroundSamples, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Home typography passed:', await checkHomeTypography(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } finally { await browser.close() }
}
