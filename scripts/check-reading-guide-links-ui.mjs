import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const configurations = [
  { width: 1440, theme: 'morning', language: 'zh', reducedMotion: 'no-preference' },
  { width: 320, theme: 'stellar', language: 'en', reducedMotion: 'reduce' },
  { width: 390, theme: 'nature', language: 'zh', reducedMotion: 'reduce' },
  { width: 430, theme: 'morning', language: 'en', reducedMotion: 'no-preference' },
]
const routes = ['/blog/legal-rag-review?column=project-notes', '/projects/legal-rag?group=fullstack', '/status/legal-rag']
const nativeActions = ['modified-click', 'modified-enter', 'shift-click', 'middle-click']

async function settleScroll(page) {
  await page.evaluate(() => new Promise((done, reject) => {
    let previous = window.scrollY
    let stableFrames = 0
    let frame = 0
    const timeout = setTimeout(() => {
      cancelAnimationFrame(frame)
      reject(new Error('reading scroll did not settle'))
    }, 5000)
    const measure = () => {
      const current = window.scrollY
      stableFrames = Math.abs(current - previous) < 0.5 ? stableFrames + 1 : 0
      previous = current
      if (stableFrames >= 4) {
        clearTimeout(timeout)
        done()
      } else frame = requestAnimationFrame(measure)
    }
    frame = requestAnimationFrame(measure)
  }))
}

async function snapshot(page, targetId) {
  return page.evaluate(id => ({
    stable: {
      url: window.location.href,
      historyLength: window.history.length,
      title: document.querySelector('h1')?.textContent,
      targetText: document.getElementById(id)?.textContent,
      language: document.documentElement.lang,
      theme: document.documentElement.dataset.siteTheme,
    },
    scrollY: window.scrollY,
    expanded: document.querySelector('.detail-reading-guide__toggle')?.getAttribute('aria-expanded'),
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    observed: window.readingLinkObservation ?? null,
  }), targetId)
}

async function activate(page, link, action) {
  if (action === 'modified-enter') await page.keyboard.press('ControlOrMeta+Enter')
  else if (action === 'plain-enter') await page.keyboard.press('Enter')
  else if (action === 'modified-click') await link.click({ modifiers: ['ControlOrMeta'] })
  else if (action === 'shift-click') await link.click({ modifiers: ['Shift'] })
  else if (action === 'middle-click') await link.click({ button: 'middle' })
  else if (action === 'meta-click') await link.click({ modifiers: ['Meta'] })
  else if (action === 'alt-click') await link.click({ modifiers: ['Alt'] })
  else await link.click()
}

async function checkCase(browser, base, configuration, path, action) {
  const name = `${configuration.width}-${configuration.theme}-${configuration.language}-${path.split('/')[1]}-${action}`
  const context = await browser.newContext({ viewport: { width: configuration.width, height: 900 }, reducedMotion: configuration.reducedMotion, serviceWorkers: 'block' })
  const errors = []
  const apiRequests = []
  let page
  let targetId = ''
  try {
    await installLocalNetworkGuard(context, base, () => errors.push('external-request'), { allowLoopback: false })
    context.on('page', opened => opened.on('pageerror', error => errors.push(error.message)))
    await context.route(`${base}/api/**`, route => {
      apiRequests.push(new URL(route.request().url()).pathname)
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local_verification_fixture"}' })
    })
    await context.addInitScript(({ value, origin }) => {
      if (window.location.origin !== origin) return
      localStorage.setItem('biau-port-theme', value.theme)
      localStorage.setItem('biau-port-language', value.language)
      sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    }, { value: configuration, origin: new URL(base).origin })
    page = await context.newPage()
    page.setDefaultTimeout(10_000)
    await page.goto(new URL(path, base).href, { waitUntil: 'load' })
    const guide = page.locator('.detail-reading-guide')
    await guide.waitFor({ state: 'visible' })
    await page.waitForFunction(() => [...document.querySelectorAll('img[loading="eager"]')].every(image => image.complete))
    await guide.locator('.detail-reading-guide__toggle').click()
    const link = guide.locator('.detail-reading-guide__outline a').last()
    await link.scrollIntoViewIfNeeded()
    if (action.endsWith('enter')) await link.focus()
    await settleScroll(page)
    const destination = await link.evaluate(element => ({ href: element.href, id: element.hash.slice(1) }))
    targetId = destination.id
    assert.ok(targetId && await page.locator(`[id="${targetId}"]`).count(), 'a genuine chapter target must exist')
    const before = await snapshot(page, targetId)
    assert.equal(before.expanded, 'true')

    const observedOnly = ['meta-click', 'alt-click', 'cancelled-click'].includes(action)
    if (observedOnly) {
      await page.evaluate(cancelBeforeReact => {
        const observe = event => {
          if (!(event.target instanceof Element) || !event.target.closest('.detail-reading-guide__outline a')) return
          window.readingLinkObservation = { preventedBeforeObserver: event.defaultPrevented, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey }
          // Isolate the owner's handling from OS-specific Meta/Alt default actions.
          event.preventDefault()
          document.removeEventListener('click', observe, cancelBeforeReact)
        }
        document.addEventListener('click', observe, cancelBeforeReact)
      }, action === 'cancelled-click')
    }

    let openedUrl = null
    if (nativeActions.includes(action)) {
      const [opened] = await Promise.all([
        context.waitForEvent('page', { timeout: 6000 }),
        activate(page, link, action),
      ])
      await opened.waitForURL(destination.href, { timeout: 10_000, waitUntil: 'domcontentloaded' })
      await opened.locator('.detail-reading-guide').waitFor({ state: 'visible' })
      await opened.locator(`[id="${targetId}"]`).waitFor({ state: 'visible' })
      openedUrl = opened.url()
      assert.equal(openedUrl, destination.href, 'the native document must preserve path, query and fragment')
      assert.equal(await opened.evaluate(() => document.documentElement.lang), before.stable.language)
      assert.equal(await opened.evaluate(() => document.documentElement.dataset.siteTheme), before.stable.theme)
      await opened.close()
    } else {
      await activate(page, link, action)
      if (!observedOnly) {
        await page.waitForFunction(id => document.querySelector('.detail-reading-guide')?.getAttribute('data-active-section') === id, targetId)
      }
    }

    await settleScroll(page)
    const after = await snapshot(page, targetId)
    assert.deepEqual(after.stable, before.stable, 'chapter activation must preserve source identity, content and preferences')
    assert.equal(after.overflow, false)
    if (nativeActions.includes(action) || observedOnly) {
      assert.equal(after.expanded, 'true', 'native or cancelled activation must leave the source outline open')
      assert.ok(Math.abs(after.scrollY - before.scrollY) <= 2, 'native or cancelled activation must not scroll the source')
      if (observedOnly) assert.equal(after.observed?.preventedBeforeObserver, false, 'the guide must not prevent Meta/Alt default handling')
    } else {
      assert.equal(after.expanded, 'false', 'ordinary activation must still close the outline')
      assert.ok(after.scrollY > before.scrollY + 100, 'ordinary activation must still move to the chosen chapter')
    }
    assert.equal(context.pages().length, 1, 'every opened document must be closed')
    assert.deepEqual(errors, [], 'reading links must not cause page errors or external requests')
    assert.equal(apiRequests.filter(value => /\/(?:chat|generate)(?:\/|$)/u.test(value)).length, 0, 'reading must not call a model')
    if (process.env.UI_CHECK_ARTIFACT_DIR) {
      await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, `reading-links-${name}.json`), JSON.stringify({ configuration, path, action, destination, before, after, openedUrl, apiRequests, errors, modelCalls: 0 }, null, 2) + '\n', { flag: 'wx' })
      if (action === 'modified-click' && path.startsWith('/blog/')) await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `reading-links-${configuration.width}-${configuration.language}.png`) })
    }
  } catch (error) {
    if (process.env.UI_CHECK_ARTIFACT_DIR && page) {
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `reading-links-failure-${name}.png`) }).catch(() => {})
      await writeFile(resolve(process.env.UI_CHECK_ARTIFACT_DIR, `reading-links-failure-${name}.json`), JSON.stringify({ name, error: error.message, current: await snapshot(page, targetId).catch(() => null), pages: context.pages().map(opened => opened.url()), apiRequests, errors }, null, 2) + '\n', { flag: 'wx' })
    }
    throw new Error(`${name}: ${error.message}`, { cause: error })
  } finally {
    await context.close()
  }
}

export async function checkReadingGuideLinks(browser, base) {
  let cases = 0
  for (const configuration of configurations) {
    for (const path of routes) {
      for (const action of [...nativeActions, 'plain-click', 'plain-enter']) {
        await checkCase(browser, base, configuration, path, action)
        cases += 1
      }
    }
  }
  for (const action of ['meta-click', 'alt-click', 'cancelled-click']) {
    await checkCase(browser, base, configurations[0], routes[0], action)
    cases += 1
  }
  return { cases, modelCalls: 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Reading guide native links passed:', await checkReadingGuideLinks(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } finally { await browser.close() }
}
