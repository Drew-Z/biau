import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'
import { assertSiteLanguage } from './lib/ui-language.mjs'

const languageKey = 'biau-port-language'
const listPath = '/blog?column=project-notes&q=RAG'
const missingPath = '/missing-language-check'

async function guardPage(page, base, errors, requests) {
  page.setDefaultTimeout(8000)
  page.on('pageerror', (error) => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('external_request_blocked'), { allowLoopback: false })
  await page.route(`${base}/api/**`, (route) => {
    requests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local_verification_fixture"}' })
  })
}

async function createPage(browser, base, { width = 390, theme = 'morning', stored = null, storageFailure = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', hasTouch: width <= 430, isMobile: width <= 430 })
  const page = await context.newPage()
  const errors = []
  const requests = []
  await guardPage(page, base, errors, requests)
  await page.addInitScript(({ initialTheme, initialLanguage, failure }) => {
    if (localStorage.getItem('biau-port-theme') === null) localStorage.setItem('biau-port-theme', initialTheme)
    sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    if (initialLanguage !== null && localStorage.getItem('biau-port-language') === null) localStorage.setItem('biau-port-language', initialLanguage)
    if (failure === 'unavailable') {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage unavailable', 'SecurityError') } })
    } else if (failure) {
      const method = failure === 'read' ? 'getItem' : 'setItem'
      const original = Storage.prototype[method]
      Storage.prototype[method] = function (key, ...args) {
        if (key === 'biau-port-language') throw new DOMException('Language storage unavailable', 'SecurityError')
        return original.call(this, key, ...args)
      }
    }
  }, { initialTheme: theme, initialLanguage: stored, failure: storageFailure })
  return { page, errors, requests }
}

function assertLocalOnly(errors, requests) {
  assert.deepEqual(errors, [], 'language changes must not cause page errors or external requests')
  assert.ok(requests.every((request) => request === 'GET /api/health'), `unexpected API requests: ${requests.join(', ')}`)
}

async function checkShell(page, language) {
  const english = language === 'en'
  await assertSiteLanguage(page, language)
  assert.equal(await page.locator('.navigation-top').getAttribute('aria-label'), english ? 'Main navigation' : '主导航')
  assert.equal(await page.locator('.mobile-tabbar').getAttribute('aria-label'), english ? 'Mobile navigation' : '移动端主导航')
  assert.equal(await page.locator('.nav-lang-toggle').getAttribute('aria-label'), english ? 'Switch to Chinese' : '切换到英文')
  assert.equal(await page.locator('.nav-theme-selector').getAttribute('aria-label'), english ? 'Select theme' : '选择主题')
  assert.deepEqual(await page.locator('.site-footer__trust strong').allTextContents(), english
    ? ['About this site', 'Privacy', 'Disclaimer', 'Contact']
    : ['项目性质', '隐私说明', '免责声明', '联系方式'])
  assert.deepEqual(await page.locator('.site-footer__links a').allTextContents(), english
    ? ['Projects', 'Knowledge Base', 'AI Daily', 'Status']
    : ['项目集', '知识库', 'AI 日报', '状态页'])
  assert.equal(await page.locator('.site-footer__trust a').getAttribute('href'), 'https://github.com/Drew-Z/biau/issues')
  assert.equal(await page.locator('.site-footer__links').getAttribute('aria-label'), english ? 'Footer navigation' : '页脚导航')
  const semantics = await page.locator('.navigation-top, .mobile-tabbar, .site-footer').evaluateAll((nodes, expected) => nodes.every((node) => node.matches(`:lang(${expected})`)), english ? 'en' : 'zh-CN')
  assert.ok(semantics, 'localized shared surfaces must carry their actual language')
  const tabs = await page.locator('.mobile-tab').evaluateAll((nodes) => nodes.map((node) => ({ label: node.textContent.trim(), name: node.getAttribute('aria-label') })))
  assert.ok(tabs.every((tab) => tab.name.includes(tab.label)), 'mobile accessible names must include their visible labels')
  assert.equal(await page.locator('.nav-theme-option').count(), 3)
  const themeNames = await page.locator('.nav-theme-option').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))
  assert.deepEqual(themeNames, english ? ['MORNING theme', 'NATURE theme', 'STELLAR theme'] : ['晨曦主题', '自然主题', '星辰主题'])
}

async function checkShellLayout(page) {
  await page.evaluate(async () => { await document.fonts.ready })
  const layout = await page.evaluate(() => {
    const visible = (node) => node.getClientRects().length > 0
    const rect = (node) => node.getBoundingClientRect()
    const nodes = [...document.querySelectorAll('.navigation-top a, .nav-actions > :not(.sr-only), .site-footer h2, .site-footer__trust article, .site-footer__links a, .not-found-actions a')].filter(visible)
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      clipped: nodes.filter((node) => rect(node).left < -1 || rect(node).right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1).map((node) => node.className || node.tagName),
      controls: [...document.querySelectorAll('.nav-lang-toggle, .nav-theme-selector, .nav-all-tools')].filter(visible).map((node) => ({ left: rect(node).left, right: rect(node).right })),
    }
  })
  assert.ok(layout.overflow <= 1, `shared interface overflow: ${layout.overflow}px`)
  assert.deepEqual(layout.clipped, [], 'shared interface text and controls must fit')
  for (let index = 1; index < layout.controls.length; index += 1) assert.ok(layout.controls[index - 1].right <= layout.controls[index].left + 1, 'navigation controls must not overlap')
}

export async function checkSiteLanguage(browser, base) {
  let matrixGroups = 0
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      const { page, errors, requests } = await createPage(browser, base, { width, theme })
      try {
        await page.goto(`${base}${listPath}`, { waitUntil: 'load' })
        await assertSiteLanguage(page, 'zh')
        const toggle = page.locator('.nav-lang-toggle')
        await toggle.focus()
        await page.keyboard.press('Enter')
        await checkShell(page, 'en')
        assert.ok(await toggle.evaluate((node) => node === document.activeElement), 'language selection must preserve keyboard focus')
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), languageKey), 'en')
        assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, listPath)
        assert.ok(await page.locator('main').evaluate((node) => node.matches(':lang(zh-CN)')), 'untranslated page content must retain Chinese semantics')
        assert.equal(await page.locator('html').getAttribute('data-site-theme'), theme)
        const nextTheme = theme === 'nature' ? 'stellar' : 'nature'
        await page.locator(`[data-theme-option="${nextTheme}"]`).focus()
        await page.keyboard.press('Space')
        assert.equal(await page.locator('html').getAttribute('data-site-theme'), nextTheme)
        await assertSiteLanguage(page, 'en')

        const navigation = page.locator(width <= 430 ? '.mobile-tabbar' : '.nav-items-center')
        await navigation.locator('a[href="/projects"]').click()
        await page.waitForURL(`${base}/projects`)
        await assertSiteLanguage(page, 'en')
        await page.goBack()
        await page.waitForURL(`${base}${listPath}`)
        await assertSiteLanguage(page, 'en')
        await page.goForward()
        await page.waitForURL(`${base}/projects`)
        await page.reload({ waitUntil: 'load' })
        await assertSiteLanguage(page, 'en')
        assert.equal(await page.locator('html').getAttribute('data-site-theme'), nextTheme, 'refresh must preserve independent theme choice')

        const copied = await page.context().newPage()
        try {
          await guardPage(copied, base, errors, requests)
          await copied.goto(`${base}${listPath}`, { waitUntil: 'load' })
          await assertSiteLanguage(copied, 'en')
        } finally {
          await copied.close()
        }

        await page.goto(`${base}${missingPath}`, { waitUntil: 'load' })
        await page.locator('.not-found-page').waitFor({ state: 'visible' })
        await page.locator(`[data-theme-option="${theme}"]`).click()
        assert.equal(await page.locator('html').getAttribute('data-site-theme'), theme, 'layout and screenshots must use the named matrix theme')
        await checkShell(page, 'en')
        assert.equal(await page.locator('h1').innerText(), 'Page not found')
        assert.ok(await page.locator('main').evaluate((node) => node.matches(':lang(en)')))
        await checkShellLayout(page)
        for (const [path, label] of [['/', 'Home'], ['/projects', 'Projects'], ['/blog', 'Knowledge Base']]) {
          const link = page.locator('.not-found-actions').getByRole('link', { name: label, exact: true })
          assert.equal(await link.getAttribute('href'), path)
          await link.click()
          await page.waitForURL(`${base}${path}`)
          await assertSiteLanguage(page, 'en')
          await page.goBack()
          await page.locator('.not-found-page').waitFor({ state: 'visible' })
        }
        if (process.env.UI_CHECK_ARTIFACT_DIR) await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `language-shell-${width}-${theme}-en.png`), fullPage: true })
        await toggle.focus()
        await page.keyboard.press('Space')
        await checkShell(page, 'zh')
        assert.equal(await page.locator('h1').innerText(), '页面没有靠岸')
        await checkShellLayout(page)
        await page.reload({ waitUntil: 'load' })
        await assertSiteLanguage(page, 'zh')
        assertLocalOnly(errors, requests)
        matrixGroups += 1
      } catch (error) {
        throw new Error(`site-language ${width}/${theme}: ${error.message}`, { cause: error })
      } finally {
        await page.context().close()
      }
    }
  }

  const storageCases = [
    { stored: 'en', expected: 'en' },
    { stored: 'invalid-language', expected: 'zh' },
    { stored: 'en', storageFailure: 'read', expected: 'zh' },
    { stored: 'en', storageFailure: 'write', expected: 'en' },
    { storageFailure: 'unavailable', expected: 'zh' },
  ]
  for (const storageCase of storageCases) {
    const { page, errors, requests } = await createPage(browser, base, storageCase)
    try {
      await page.goto(`${base}/blog`, { waitUntil: 'load' })
      await assertSiteLanguage(page, storageCase.expected)
      await page.locator('.nav-lang-toggle').click()
      await assertSiteLanguage(page, storageCase.expected === 'en' ? 'zh' : 'en')
      await page.locator('.mobile-tabbar a[href="/projects"]').click()
      await page.waitForURL(`${base}/projects`)
      await assertSiteLanguage(page, storageCase.expected === 'en' ? 'zh' : 'en')
      assertLocalOnly(errors, requests)
    } finally {
      await page.context().close()
    }
  }

  const delayed = await createPage(browser, base, { stored: 'en' })
  let releaseChunk
  const chunkReady = new Promise((resolveChunk) => { releaseChunk = resolveChunk })
  let heldChunks = 0
  await delayed.page.route('**/assets/NotFoundPage-*.js', async (route) => {
    heldChunks += 1
    await chunkReady
    await route.continue()
  })
  try {
    await delayed.page.goto(`${base}${missingPath}`, { waitUntil: 'domcontentloaded' })
    const loading = delayed.page.locator('.route-loading')
    await loading.waitFor({ state: 'visible' })
    assert.equal(await loading.innerText(), 'Loading')
    assert.ok(await loading.evaluate((node) => node.matches(':lang(en)')))
    assert.equal(heldChunks, 1, 'the fixture must delay the actual lazy route chunk')
    releaseChunk()
    await delayed.page.locator('.not-found-page').waitFor({ state: 'visible' })
    assert.equal(await delayed.page.locator('h1').innerText(), 'Page not found')
    assertLocalOnly(delayed.errors, delayed.requests)
  } finally {
    releaseChunk()
    await delayed.page.context().close()
  }
  return { matrixGroups, storageGroups: storageCases.length, loadingGroups: 1, modelCalls: 0 }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log('Site language UI passed:', await checkSiteLanguage(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'))
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}
