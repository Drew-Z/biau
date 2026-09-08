import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'
import { assertSiteLanguage, selectSiteLanguage } from './lib/ui-language.mjs'

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

async function checkCatalogCopy(page, language, family) {
  const english = language === 'en'
  const tag = english ? 'en' : 'zh-CN'
  await assertSiteLanguage(page, language)
  const main = page.locator(family === 'blog' ? '.blog-index-page' : '.projects-tools-page')
  await main.waitFor({ state: 'visible' })
  assert.ok(await main.evaluate((node, expected) => node.matches(`:lang(${expected})`), tag), 'catalog controls must carry their selected language')
  assert.equal(await main.locator('h1').innerText(), family === 'blog' ? (english ? 'Knowledge Base' : '知识库') : (english ? 'Projects' : '项目集'))

  if (family === 'blog') {
    const search = page.getByRole('searchbox', { name: english ? 'Search knowledge base articles' : '搜索知识库文章', exact: true })
    assert.equal(await search.count(), 1)
    assert.equal(await search.getAttribute('placeholder'), english ? 'Search articles or topics' : '搜索文章、项目方法、技术关键词')
    assert.equal(await page.locator('.blog-tools').getAttribute('aria-label'), english ? 'Article search' : '文章检索')
    const columnLabel = english ? 'Select knowledge base column' : '选择知识库栏目'
    assert.equal(await page.locator('.blog-column-filter').getAttribute('aria-label'), columnLabel)
    assert.equal(await page.locator('.blog-column-select select').getAttribute('aria-label'), columnLabel)
    assert.deepEqual(await page.locator('.filter-btn-title').allTextContents(), english
      ? ['All Notes', 'Knowledge Notes', 'Project Notes', 'Resource Picks', 'AI Daily', 'Build Log']
      : ['全部', '知识积累', '项目总结', '资源分享', 'AI 日报', '构建手记'])
    assert.ok(await page.locator('.filter-btn-subtitle > span').evaluateAll((nodes, expected) => nodes.length === 6 && nodes.every((node) => node.matches(`:lang(${expected})`)), english ? 'zh-CN' : 'en'), 'secondary column names must retain their own language')
    const options = await page.locator('.blog-column-select option').allTextContents()
    assert.ok(options.every((text) => /[\p{Script=Han}]/u.test(text) && /[A-Za-z]/u.test(text)), 'native options must retain both column identities')
    assert.equal(await page.locator('.blog-pagination').getAttribute('aria-label'), english ? 'Article pagination' : '文章分页')
    assert.deepEqual(await page.locator('.blog-pagination button').allTextContents(), english ? ['Previous', 'Next'] : ['上一页', '下一页'])
    assert.match(await page.locator('.blog-result-meta').innerText(), english ? /^Public selection · \d+ articles? · Page \d+ \/ \d+$/u : /^公开精选 · \d+ 篇文章 · 第 \d+ \/ \d+ 页$/u)
    const cards = page.locator('.blog-card')
    assert.ok(await cards.count() > 0)
    for (const card of await cards.all()) {
      const title = await card.locator('.blog-title').innerText()
      assert.equal(await card.getAttribute('aria-label'), english ? `Read article: ${title}` : `阅读文章：${title}`)
      assert.equal((await card.locator('.btn').textContent()).trim(), english ? 'Read more →' : '阅读全文 →')
    }
    assert.ok(await page.locator('.blog-title, .blog-detail, .blog-header, .blog-tags').evaluateAll((nodes) => nodes.length > 0 && nodes.every((node) => node.matches(':lang(zh-CN)'))), 'authored article text must remain Chinese')
  } else {
    const names = english ? ['AI Applications', 'Full-stack Development', 'Tools'] : ['AI 应用', '全栈开发', '工具']
    assert.deepEqual(await page.locator('.project-group-title').allTextContents(), names)
    assert.deepEqual(await page.locator('.project-group-toggle__copy strong').allTextContents(), names)
    for (const group of await page.locator('.project-group').all()) {
      const count = await group.locator('.project-card').count()
      assert.equal(await group.locator('.project-group-toggle__copy em').textContent(), english ? `${count} ${count === 1 ? 'project' : 'projects'}` : `${count} 个项目`)
    }
    for (const card of await page.locator('.project-card').all()) {
      const title = await card.locator('.project-title').textContent()
      const action = card.locator('.project-footer > .btn')
      assert.equal((await action.textContent()).trim(), english ? 'View details' : '查看详情')
      assert.equal(await action.getAttribute('aria-label'), english ? `View project details: ${title}` : `查看项目详情：${title}`)
      assert.ok(await action.evaluate((node, expected) => node.matches(`:lang(${expected})`), tag))
    }
    assert.ok(await page.locator('.project-title, .project-summary, .project-header, .project-stack, .project-links').evaluateAll((nodes) => nodes.length > 0 && nodes.every((node) => node.matches(':lang(zh-CN)'))), 'authored project text and publication actions retain Chinese semantics')
  }
}

async function checkCatalogLayout(page) {
  await page.evaluate(async () => { await document.fonts.ready })
  await page.waitForFunction(() => [...(document.querySelector('main')?.getAnimations({ subtree: true }) ?? [])].every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity))
  const layout = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('main .section-title, main .section-description, .blog-column-select, .blog-column-select__control, .filter-btn, .filter-btn-title, .filter-btn-subtitle, .blog-result-meta, .blog-pagination button, .blog-card .btn, .project-group-toggle, .project-group-toggle__copy, .project-footer > .btn')].filter((node) => node.getClientRects().length > 0)
    const clipped = nodes.filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1
    }).map((node) => ({ className: node.className, text: node.textContent.trim() }))
    const small = innerWidth <= 430 ? nodes.filter((node) => node.matches('.blog-column-select__control, .blog-pagination button, .blog-card .btn, .project-group-toggle, .project-footer > .btn') && (node.getBoundingClientRect().height < 43.5 || node.getBoundingClientRect().width < 43.5)).map((node) => ({ className: node.className, parent: node.parentElement.className, text: node.textContent.trim(), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })) : []
    const pagination = innerWidth <= 430 ? [...document.querySelectorAll('.blog-pagination > *')].map((node) => {
      const rect = node.getBoundingClientRect()
      return rect.top + rect.height / 2
    }) : []
    return { clipped, small, pagination, overflow: document.documentElement.scrollWidth - innerWidth }
  })
  assert.deepEqual(layout.clipped, [], 'catalog labels and controls must fit without clipping')
  assert.deepEqual(layout.small, [], 'mobile catalog controls must retain 44px targets')
  if (layout.pagination.length) assert.ok(layout.pagination.length === 3 && Math.max(...layout.pagination) - Math.min(...layout.pagination) <= 1, 'mobile pagination must keep both actions and its counter aligned in one row')
  assert.ok(layout.overflow <= 1, 'localized catalogs must not overflow')
}

async function catalogContentSnapshot(page, family) {
  return page.locator(family === 'blog' ? '.blog-header, .blog-title, .blog-detail, .blog-meta, .blog-tags' : '.project-header, .project-title, .project-summary, .project-stack, .project-links').evaluateAll((nodes) => nodes.map((node) => ({
    text: node.textContent,
    actions: [...node.querySelectorAll('a, button')].map((action) => ({ tag: action.tagName, href: action.getAttribute('href'), title: action.getAttribute('title'), name: action.getAttribute('aria-label') })),
  })))
}

export async function checkSiteLanguage(browser, base) {
  let matrixGroups = 0
  let emptyGroups = 0
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      const { page, errors, requests } = await createPage(browser, base, { width, theme })
      try {
        await page.goto(`${base}${listPath}`, { waitUntil: 'load' })
        await assertSiteLanguage(page, 'zh')
        await checkCatalogCopy(page, 'zh', 'blog')
        const blogContent = await catalogContentSnapshot(page, 'blog')
        const catalogNode = await page.locator('main').elementHandle()
        const historyBeforeLanguage = await page.evaluate(() => history.length)
        const toggle = page.locator('.nav-lang-toggle')
        await toggle.focus()
        await page.keyboard.press('Enter')
        await checkShell(page, 'en')
        assert.ok(await toggle.evaluate((node) => node === document.activeElement), 'language selection must preserve keyboard focus')
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), languageKey), 'en')
        assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, listPath)
        assert.equal(await page.evaluate(() => history.length), historyBeforeLanguage, 'language changes must not create catalog history')
        assert.ok(await catalogNode.evaluate((node) => node.isConnected), 'language changes must not remount the catalog')
        assert.equal(await page.locator('.blog-index-page h1').innerText(), 'Knowledge Base', 'catalog headings must follow the selected language')
        assert.ok(await page.locator('main').evaluate((node) => node.matches(':lang(en)')), 'localized catalog controls must carry English semantics')
        assert.ok(await page.locator('.blog-title, .blog-detail').evaluateAll((nodes) => nodes.length > 0 && nodes.every((node) => node.matches(':lang(zh-CN)'))), 'untranslated article content must retain Chinese semantics')
        await checkCatalogCopy(page, 'en', 'blog')
        assert.deepEqual(await catalogContentSnapshot(page, 'blog'), blogContent, 'language changes must not translate authored article content')
        assert.equal(await page.locator('#blog-search').inputValue(), 'RAG')
        assert.equal(await page.locator('.blog-column-select select').inputValue(), 'project-notes')
        await checkCatalogLayout(page)
        if (process.env.UI_CHECK_ARTIFACT_DIR) await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `catalog-blog-${width}-${theme}-en.png`), fullPage: true })
        assert.equal(await page.locator('html').getAttribute('data-site-theme'), theme)
        const nextTheme = theme === 'nature' ? 'stellar' : 'nature'
        await page.locator(`[data-theme-option="${nextTheme}"]`).focus()
        await page.keyboard.press('Space')
        assert.equal(await page.locator('html').getAttribute('data-site-theme'), nextTheme)
        await assertSiteLanguage(page, 'en')
        await page.locator(`[data-theme-option="${theme}"]`).click()
        assert.equal(await page.locator('html').getAttribute('data-site-theme'), theme)

        const navigation = page.locator(width <= 430 ? '.mobile-tabbar' : '.nav-items-center')
        await navigation.locator('a[href="/projects"]').click()
        await page.waitForURL(`${base}/projects`)
        await assertSiteLanguage(page, 'en')
        await checkCatalogCopy(page, 'en', 'projects')
        await checkCatalogLayout(page)
        const projectContent = await catalogContentSnapshot(page, 'projects')
        const projectHistory = await page.evaluate(() => history.length)
        await selectSiteLanguage(page, 'zh')
        await checkCatalogCopy(page, 'zh', 'projects')
        assert.deepEqual(await catalogContentSnapshot(page, 'projects'), projectContent, 'project content and publication actions must not change with interface language')
        await selectSiteLanguage(page, 'en')
        assert.equal(await page.evaluate(() => history.length), projectHistory)
        if (process.env.UI_CHECK_ARTIFACT_DIR) await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `catalog-projects-${width}-${theme}-en.png`), fullPage: true })
        await page.goBack()
        await page.waitForURL(`${base}${listPath}`)
        await assertSiteLanguage(page, 'en')
        await page.goForward()
        await page.waitForURL(`${base}/projects`)
        await page.reload({ waitUntil: 'load' })
        await assertSiteLanguage(page, 'en')
        await checkCatalogCopy(page, 'en', 'projects')
        assert.equal(await page.locator('html').getAttribute('data-site-theme'), theme, 'refresh must preserve independent theme choice')

        const copied = await page.context().newPage()
        try {
          await guardPage(copied, base, errors, requests)
          await copied.goto(`${base}${listPath}`, { waitUntil: 'load' })
          await assertSiteLanguage(copied, 'en')
          await checkCatalogCopy(copied, 'en', 'blog')
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

  const emptyFixture = await createPage(browser, base)
  try {
    const { page, errors, requests } = emptyFixture
    for (const language of ['zh', 'en']) {
      await page.goto(`${base}/blog`, { waitUntil: 'load' })
      await selectSiteLanguage(page, language)
      const english = language === 'en'
      const columns = await page.locator('.blog-column-select option').evaluateAll((nodes) => nodes.map((node) => node.value))
      for (const [index, column] of columns.entries()) {
        await page.locator('#blog-search').fill('')
        await page.locator('.blog-column-select select').selectOption(column)
        await page.waitForFunction((expected) => document.querySelector('.blog-column-select select')?.value === expected && document.querySelector('#blog-search')?.value === '', column)
        if (await page.locator('.blog-card').count() === 0) {
          const firstPublish = page.locator('.blog-empty')
          await firstPublish.waitFor({ state: 'visible' })
          assert.equal(await firstPublish.getAttribute('data-blog-empty-query'), 'false')
          assert.equal(/[\p{Script=Han}]/u.test(await firstPublish.innerText()), !english, 'first-publication empty copy must follow the selected language')
        }
        const columnTitle = await page.locator('.filter-btn-title').nth(index).textContent()
        await page.locator('#blog-search').fill('catalog-no-results-6c1f')
        const empty = page.locator('.blog-empty[data-blog-empty-query="true"]')
        await empty.waitFor({ state: 'visible' })
        const expectedTitle = column === 'all'
          ? (english ? 'No matching articles' : '没有找到相关文章')
          : (english ? `${columnTitle}: no matching articles` : `${columnTitle} 没有匹配结果`)
        assert.equal(await empty.locator('h2').textContent(), expectedTitle)
        assert.ok(await empty.evaluate((node, expected) => node.matches(`:lang(${expected})`), english ? 'en' : 'zh-CN'))
        assert.equal(/[\p{Script=Han}]/u.test(await empty.innerText()), !english)
        assert.match(await page.locator('.blog-result-meta').innerText(), english ? /0 articles · Page 1 \/ 1$/u : /0 篇文章 · 第 1 \/ 1 页$/u)
        assert.ok(await page.locator('.blog-pagination button').first().isDisabled())
        assert.ok(await page.locator('.blog-pagination button').last().isDisabled())
        emptyGroups += 1
      }
    }
    assertLocalOnly(errors, requests)
  } finally {
    await emptyFixture.page.context().close()
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
  return { matrixGroups, catalogGroups: matrixGroups * 2, emptyGroups, storageGroups: storageCases.length, loadingGroups: 1, modelCalls: 0 }
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
