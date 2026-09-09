import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'
import { assertSiteLanguage, selectSiteLanguage } from './lib/ui-language.mjs'
import { checkStatusInterfaceLanguage } from './check-status-language-ui.mjs'

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
    assert.ok(await page.locator('.project-title, .project-summary, .project-header, .project-stack').evaluateAll((nodes) => nodes.length > 0 && nodes.every((node) => node.matches(':lang(zh-CN)'))), 'authored project text retains Chinese semantics')
    await checkProjectLinkCopy(page, language)
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
  if (family === 'projects') {
    return page.locator('.projects-tools-page').evaluate((root) => ({
      content: [...root.querySelectorAll('.project-header, .project-title, .project-summary, .project-stack')].map((node) => node.textContent),
      actions: [...root.querySelectorAll('.project-links a, .project-links button')].map((node) => ({ tag: node.tagName, href: node.getAttribute('href') ?? node.getAttribute('data-project-href'), title: node.getAttribute('title'), target: node.getAttribute('target'), rel: node.getAttribute('rel') })),
    }))
  }
  return page.locator('.blog-header, .blog-title, .blog-detail, .blog-meta, .blog-tags').evaluateAll((nodes) => nodes.map((node) => ({
    text: node.textContent,
    actions: [...node.querySelectorAll('a, button')].map((action) => ({ tag: action.tagName, href: action.getAttribute('href'), title: action.getAttribute('title'), name: action.getAttribute('aria-label') })),
  })))
}

const readingPages = [
  { family: 'blog', path: '/blog/legal-rag-review?column=project-notes&q=RAG', root: '.blog-post-page', back: '/blog?column=project-notes&q=RAG' },
  { family: 'projects', path: '/projects/legal-rag?group=fullstack', root: '.project-detail-page', back: '/projects?group=fullstack' },
]

const fixedReadingLabels = {
  'blog-knowledge': ['知识点', 'Key concepts'],
  'blog-scenarios': ['应用场景', 'Use cases'],
  'blog-practice': ['实践清单', 'Practice checklist'],
  'blog-takeaways': ['关键收获', 'Key takeaways'],
  'blog-related-projects': ['关联项目', 'Related projects'],
  'blog-related-posts': ['延展阅读', 'Further reading'],
  'project-highlights': ['核心亮点', 'Highlights'],
  'project-stack': ['技术栈', 'Technology stack'],
  'project-links': ['相关链接', 'Links'],
  'project-overview': ['案例概览', 'Overview'],
  'project-workflow': ['工作台能力', 'Workspace capabilities'],
  'project-architecture': ['实现与架构', 'Implementation and architecture'],
  'project-quality': ['质量与验证', 'Quality and verification'],
  'project-limitations': ['当前边界', 'Current limitations'],
  'project-roadmap': ['后续优化', 'Next improvements'],
  'project-readings': ['延展阅读', 'Further reading'],
}

async function checkReadingGuideCopy(page, language, { status = false, authored = false } = {}) {
  const english = language === 'en'
  const tag = english ? 'en' : 'zh-CN'
  const guide = page.locator('.detail-reading-guide')
  const label = status ? (english ? 'Status navigation' : '状态导航') : (english ? 'Reading guide' : '阅读导航')
  assert.equal(await guide.getAttribute('aria-label'), label)
  assert.ok(await guide.evaluate((node, expected) => node.matches(`:lang(${expected})`), tag))
  assert.equal(await guide.locator('[role="progressbar"]').getAttribute('aria-label'), english ? 'Reading progress' : '全文阅读进度')
  assert.equal(await guide.locator('nav').getAttribute('aria-label'), english ? 'On this page' : '本文目录')
  assert.equal(await guide.locator('.detail-reading-guide__outline-head strong').textContent(), english ? 'On this page' : '本文目录')
  const anchors = guide.locator('nav a')
  const count = await anchors.count()
  assert.ok(count > 0)
  assert.equal(await guide.locator('.detail-reading-guide__outline-head > span').textContent(), english ? `${count} ${count === 1 ? 'section' : 'sections'}` : `${count} 个章节`)
  assert.equal(await guide.locator('a[aria-current="location"]').count(), 1)
  for (const anchor of await anchors.all()) {
    const id = (await anchor.getAttribute('href')).slice(1)
    assert.equal(await page.locator(`[id="${id}"]`).count(), 1, 'every outline target must still exist exactly once')
    const text = anchor.locator('span').nth(1)
    const itemTag = authored || id.startsWith('blog-section-') ? 'zh-CN' : tag
    assert.ok(await text.evaluate((node, expected) => node.matches(`:lang(${expected})`), itemTag), `outline language: ${id}`)
    if (id.startsWith('blog-section-')) assert.equal(await text.textContent(), await page.locator(`[id="${id}"] h2`).textContent())
    if (!authored && fixedReadingLabels[id]) {
      assert.equal(await text.textContent(), fixedReadingLabels[id][english ? 1 : 0])
      const heading = page.locator(`[id="${id}"] > .detail-block-title, [id="${id}"] > .project-case-study__eyebrow`)
      assert.equal(await heading.textContent(), fixedReadingLabels[id][english ? 1 : 0])
      assert.ok(await heading.evaluate((node, expected) => node.matches(`:lang(${expected})`), tag))
    }
    if (id === 'project-related') {
      assert.match(await text.textContent(), english ? /^(Related projects|Similar projects)$/u : /^(相关项目|同类项目)$/u)
      assert.equal(await text.textContent(), await page.locator('#project-related > h2').textContent())
    }
  }
  const activeId = await guide.getAttribute('data-active-section')
  const currentTag = authored || activeId.startsWith('blog-section-') ? 'zh-CN' : tag
  assert.ok(await guide.locator('.detail-reading-guide__current').evaluate((node, expected) => node.matches(`:lang(${expected})`), currentTag))
}

async function readingContentSnapshot(page, root) {
  return page.locator(root).evaluate((node) => ({
    content: [...node.querySelectorAll('.detail-title, .detail-summary, .detail-role, .blog-series, .detail-highlights, .blog-post-section, .detail-stack, .detail-related-card h3, .detail-related-card p, .project-case-study__section > h3, .project-case-study__section > .blog-post-body-text, .project-visual__text, .project-visual__caption-text, .detail-hero-caption')].map((item) => item.textContent),
    images: [...node.querySelectorAll('img')].map((item) => ({ src: item.getAttribute('src'), alt: item.getAttribute('alt') })),
    publication: [...node.querySelectorAll('.link-badge, .detail-entry-note, .project-visual__source-link')].map((item) => ({ tag: item.tagName, href: item.getAttribute('href'), type: item.getAttribute('data-link-type'), target: item.getAttribute('target'), rel: item.getAttribute('rel'), title: item.getAttribute('title'), authoredExplanation: item.matches('.detail-entry-note') ? item.textContent : null })),
  }))
}

async function checkReadingPageCopy(page, reading, language) {
  const english = language === 'en'
  const root = page.locator(reading.root)
  assert.equal(await root.locator('.detail-back').textContent(), reading.family === 'blog' ? (english ? 'Knowledge Base' : '知识库') : (english ? 'Projects' : '项目集'))
  assert.equal(await root.locator('.detail-back').getAttribute('href'), reading.back)
  assert.ok(await root.evaluate((node, expected) => node.matches(`:lang(${expected})`), english ? 'en' : 'zh-CN'))
  assert.ok(await root.locator('.detail-title, .detail-summary, .detail-highlights, .blog-post-section, .detail-stack, .detail-related-card h3, .detail-related-card p, .project-case-study__section > h3, .project-visual__text, img').evaluateAll((nodes) => nodes.length > 0 && nodes.every((node) => node.matches(':lang(zh-CN)'))), 'authored text and image alternatives must remain Chinese')
  if (reading.family === 'projects') {
    await checkProjectLinkCopy(page, language)
    assert.equal(await root.locator('.detail-hero-image-action').textContent(), english ? 'Open original' : '打开原图')
    assert.equal(await root.locator('.project-case-study').getAttribute('aria-label'), english ? 'Project case study' : '项目案例分析')
    const title = await root.locator('h1').textContent()
    assert.equal(await root.locator('.detail-quick-links').getAttribute('aria-label'), english ? `${title} quick links` : `${title} 快速链接`)
    assert.equal(await root.locator('.detail-hero-image').getAttribute('aria-label'), english ? `Open original screenshot for ${title}` : `打开 ${title} 项目截图原图`)
  }
  await checkReadingGuideCopy(page, language)
}

async function checkReadingLayout(page) {
  await page.evaluate(async () => { await document.fonts.ready })
  await page.waitForFunction(() => [...(document.querySelector('.detail-page')?.getAnimations({ subtree: true }) ?? [])].every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity))
  await page.waitForFunction(() => [...document.querySelectorAll('img[loading="eager"]')].every((node) => node.complete && node.naturalWidth > 0))
  const result = await page.evaluate(() => {
    const selectors = '.detail-back, .detail-block-title, .project-case-study__eyebrow, .detail-reading-guide__toggle, .detail-reading-guide__eyebrow, .detail-reading-guide__outline-head, .detail-reading-guide__outline a, .detail-missing h1, .detail-missing p, .detail-missing .btn'
    const nodes = [...document.querySelectorAll(selectors)].filter((node) => node.getClientRects().length > 0)
    const clipped = nodes.filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1
    }).map((node) => ({ className: node.className, text: node.textContent }))
    const small = innerWidth <= 430 ? nodes.filter((node) => node.matches('a, button') && (node.getBoundingClientRect().height < 43.5 || node.getBoundingClientRect().width < 43.5)).map((node) => ({ text: node.textContent, height: node.getBoundingClientRect().height })) : []
    return { clipped, small, overflow: document.documentElement.scrollWidth - innerWidth }
  })
  assert.deepEqual(result.clipped, [], 'reading labels and expanded outline must fit')
  assert.deepEqual(result.small, [], 'mobile reading actions must keep 44px targets')
  assert.ok(result.overflow <= 1)
}

export async function checkDetailReadingLanguage(browser, base) {
  let detailGroups = 0
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      const { page, errors, requests } = await createPage(browser, base, { width, theme })
      try {
        for (const reading of readingPages) {
          await page.goto(`${base}${reading.path}`, { waitUntil: 'load' })
          await page.locator(reading.root).waitFor({ state: 'visible' })
          await selectSiteLanguage(page, 'zh')
          await checkReadingPageCopy(page, reading, 'zh')
          const content = await readingContentSnapshot(page, reading.root)
          const rootNode = await page.locator(reading.root).elementHandle()
          const guideNode = await page.locator('.detail-reading-guide').elementHandle()
          const ids = await page.locator('.detail-reading-guide nav a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))
          const location = await page.evaluate(() => ({ href: window.location.href, history: history.length }))
          const toggle = page.locator('.detail-reading-guide__toggle')
          await toggle.focus()
          await page.keyboard.press('Enter')
          await page.locator('.detail-reading-guide nav').waitFor({ state: 'visible' })
          await checkReadingLayout(page)
          const firstAnchor = page.locator('.detail-reading-guide nav a').first()
          await firstAnchor.focus()
          // Isolate the language-state update from the existing outside-pointer dismissal.
          await page.locator('.nav-lang-toggle').evaluate((node) => node.click())
          await assertSiteLanguage(page, 'en')
          await checkReadingPageCopy(page, reading, 'en')
          assert.ok(await rootNode.evaluate((node) => node.isConnected), 'language must not remount the article')
          assert.ok(await guideNode.evaluate((node) => node.isConnected), 'language must not remount the reading guide')
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true', 'a language-state update must retain outline state')
          assert.ok(await firstAnchor.evaluate((node) => node === document.activeElement), 'a language-state update must retain outline focus')
          assert.deepEqual(await page.evaluate(() => ({ href: window.location.href, history: history.length })), location)
          assert.deepEqual(await page.locator('.detail-reading-guide nav a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))), ids)
          assert.deepEqual(await readingContentSnapshot(page, reading.root), content)
          await checkReadingLayout(page)
          if (process.env.UI_CHECK_ARTIFACT_DIR) await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `reading-${reading.family}-${width}-${theme}-en.png`) })
          await page.keyboard.press('Escape')
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
          assert.ok(await toggle.evaluate((node) => node === document.activeElement))
          await page.keyboard.press('Enter')
          const target = reading.family === 'blog' ? 'blog-section-1' : 'project-architecture'
          await page.locator(`.detail-reading-guide a[href="#${target}"]`).focus()
          await page.keyboard.press('Enter')
          await page.waitForFunction((id) => document.querySelector('.detail-reading-guide')?.getAttribute('data-active-section') === id && document.querySelector('.detail-reading-guide__toggle')?.getAttribute('aria-expanded') === 'false', target)
          await checkReadingGuideCopy(page, 'en')
          assert.ok(await page.evaluate(() => window.scrollY > 0), 'outline navigation must move into the article')
          await page.reload({ waitUntil: 'load' })
          await page.locator(reading.root).waitFor({ state: 'visible' })
          await assertSiteLanguage(page, 'en')
          await checkReadingPageCopy(page, reading, 'en')
          for (const language of ['en', 'zh']) {
            await page.goto(`${base}/${reading.family}/missing-reading-language${new URL(`${base}${reading.path}`).search}`, { waitUntil: 'load' })
            await selectSiteLanguage(page, language)
            await page.locator('.detail-missing').waitFor({ state: 'visible' })
            const english = language === 'en'
            assert.equal(await page.locator('.detail-missing h1').textContent(), reading.family === 'blog' ? (english ? 'Article not found' : '未找到该文章') : (english ? 'Project not found' : '未找到该项目'))
            const back = page.locator('.detail-missing .btn')
            assert.equal((await back.textContent()).trim(), reading.family === 'blog' ? (english ? 'Back to knowledge base' : '返回知识库') : (english ? 'Back to projects' : '返回项目集'))
            assert.equal(await back.getAttribute('href'), reading.back)
            assert.equal(await page.locator('.detail-reading-guide').count(), 0)
            await checkReadingLayout(page)
            await back.focus()
            await page.keyboard.press('Enter')
            await page.waitForURL(`${base}${reading.back}`)
            await assertSiteLanguage(page, language)
          }
          detailGroups += 1
        }
        assertLocalOnly(errors, requests)
      } catch (error) {
        throw new Error(`reading-language ${width}/${theme}: ${error.message}`, { cause: error })
      } finally {
        await page.context().close()
      }
    }
  }

  let legacyGuideGroups = 0
  for (const width of [320, 1440]) {
    const { page, errors, requests } = await createPage(browser, base, { width, stored: 'en' })
    let dailyRequests = 0
    const dailyTime = '2026-09-09T00:00:00.000Z'
    await page.route('**/public/ai-daily/events/reading-language-fixture*', (route) => {
      dailyRequests += 1
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        item: { publicId: 'reading-language-fixture', revision: 1, title: '阅读语言检查', factSummary: '公开事实摘要。', whyItMatters: '检查目录语言标记。', uncertainty: null, approvedAt: dailyTime, updatedAt: dailyTime, corrected: false, correctedAt: null, citations: [] },
        meta: { generatedAt: dailyTime, windowHours: 72, freshness: { status: 'fresh', stale: false, staleAfterMinutes: 180, latestApprovalAt: dailyTime, latestProjectionAt: dailyTime } },
      }) })
    })
    try {
      for (const path of ['/status/legal-rag', '/ai-daily/reading-language-fixture']) {
        await page.goto(`${base}${path}`, { waitUntil: 'load' })
        await page.locator('.detail-reading-guide').waitFor({ state: 'visible' }).catch((error) => {
          throw new Error(`reading-language legacy guide ${width}${path}: ${error.message}`, { cause: error })
        })
        for (const language of ['en', 'zh']) {
          await selectSiteLanguage(page, language)
          await checkReadingGuideCopy(page, language, { status: path.startsWith('/status'), authored: path.startsWith('/ai-daily') })
        }
        legacyGuideGroups += 1
      }
      assert.equal(dailyRequests, 1)
      assertLocalOnly(errors, requests)
    } finally {
      await page.context().close()
    }
  }

  for (const language of ['zh', 'en']) {
    const { page, errors, requests } = await createPage(browser, base, { stored: language })
    let releaseContent
    let heldContent = 0
    const contentReady = new Promise((release) => { releaseContent = release })
    await page.route('**/assets/legal-rag-review-*.js', async (route) => {
      heldContent += 1
      await contentReady
      await route.continue()
    })
    try {
      await page.goto(`${base}${readingPages[0].path}`, { waitUntil: 'domcontentloaded' })
      await page.locator('.detail-missing').waitFor({ state: 'visible' })
      assert.equal(await page.locator('.detail-missing h1').textContent(), language === 'en' ? 'Loading article' : '文章载入中')
      assert.ok(await page.locator('.detail-missing').evaluate((node, expected) => node.matches(`:lang(${expected})`), language === 'en' ? 'en' : 'zh-CN'))
      assert.equal(await page.locator('.detail-reading-guide').count(), 0)
      const nextLanguage = language === 'en' ? 'zh' : 'en'
      await selectSiteLanguage(page, nextLanguage)
      assert.equal(await page.locator('.detail-missing h1').textContent(), nextLanguage === 'en' ? 'Loading article' : '文章载入中')
      assert.equal(heldContent, 1, 'language changes must not reload authored content')
      releaseContent()
      await page.locator('.blog-post-page').waitFor({ state: 'visible' })
      await checkReadingPageCopy(page, readingPages[0], nextLanguage)
      assertLocalOnly(errors, requests)
    } finally {
      releaseContent()
      await page.context().close()
    }
  }
  return { detailGroups, legacyGuideGroups, detailLoadingGroups: 2 }
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
        assert.deepEqual(await catalogContentSnapshot(page, 'projects'), projectContent, 'authored content, access explanations and action targets must not change with interface language')
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
  const reading = await checkDetailReadingLanguage(browser, base)
  const projectInterface = await checkProjectInterfaceLanguage(browser, base)
  const statusInterface = await checkStatusInterfaceLanguage(browser, base)
  return { matrixGroups, catalogGroups: matrixGroups * 2, emptyGroups, storageGroups: storageCases.length, loadingGroups: 1, ...reading, ...projectInterface, ...statusInterface, modelCalls: 0 }
}

async function checkProjectInterfaceLayout(page) {
  await page.evaluate(async () => { await document.fonts.ready })
  await page.waitForFunction(() => [...document.getAnimations()].every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity))
  const layout = await page.evaluate(() => {
    const selectors = '.page-home .brand-title, .page-home .nav-brand-link, .carousel-wrapper .panel-head__copy, .carousel-wrapper .panel-head > strong, .carousel-action__label, .carousel-wrapper .panel-footer, .project-entry-label, .detail-badges .tag, .detail-status'
    const nodes = [...document.querySelectorAll(selectors)].filter((node) => node.getClientRects().length > 0)
    const clipped = nodes.filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1
    }).map((node) => ({ text: node.textContent, className: node.className }))
    const controls = [...document.querySelectorAll('.carousel-action, .carousel-wrapper .panel-footer, .project-links .link-badge, .detail-page .link-badge, .project-visual__source-link')].filter((node) => node.getClientRects().length > 0)
    const small = innerWidth <= 430 ? controls.filter((node) => node.getBoundingClientRect().height < 43.5 || node.getBoundingClientRect().width < 43.5).map((node) => ({ text: node.textContent, className: node.className, height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width })) : []
    const actionContentOverflow = [...document.querySelectorAll('.carousel-action')].filter((node) => node.getClientRects().length > 0).flatMap((node) => {
      const control = node.getBoundingClientRect()
      return [...node.querySelectorAll('.carousel-action__label, svg')].filter((child) => {
        if (child.getClientRects().length === 0) return false
        const rect = child.getBoundingClientRect()
        return rect.left < control.left - 1 || rect.right > control.right + 1 || rect.top < control.top - 1 || rect.bottom > control.bottom + 1
      }).map((child) => ({ label: node.getAttribute('aria-label'), child: child.getAttribute('class') ?? child.tagName, width: control.width }))
    })
    const brand = document.querySelector('.page-home .nav-brand-link')?.getBoundingClientRect()
    const language = document.querySelector('.page-home .nav-lang-toggle')?.getBoundingClientRect()
    const navigationOverlap = brand && language && brand.width > 0 ? Math.max(0, brand.right - language.left) : 0
    return { clipped, small, actionContentOverflow, navigationOverlap, overflow: document.documentElement.scrollWidth - innerWidth }
  })
  assert.deepEqual(layout.clipped, [], 'project interface labels must fit')
  assert.deepEqual(layout.small, [], 'mobile project actions must retain 44px targets')
  assert.deepEqual(layout.actionContentOverflow, [], 'project action text and icons must fit inside their button')
  assert.ok(layout.navigationOverlap <= 1, `home brand must not intercept language controls: overlap=${layout.navigationOverlap}px`)
  assert.ok(layout.overflow <= 1)
}

async function checkProjectLinkCopy(page, language, { empty = false } = {}) {
  const tag = language === 'en' ? 'en' : 'zh-CN'
  const labels = page.locator('.project-entry-label')
  if (empty) assert.equal(await labels.count(), 0, 'a project without link candidates must not gain an action')
  else assert.ok(await labels.count() > 0)
  for (const label of await labels.all()) {
    assert.ok(await label.evaluate((node, expected) => node.matches(`:lang(${expected})`), tag))
    if (language === 'en') assert.ok(!/[\p{Script=Han}]/u.test(await label.textContent()), 'known project interface labels translate')
  }
  for (const link of await page.locator('.link-badge[title], .project-visual__source-link[title]').all()) {
    const title = await link.getAttribute('title')
    if (/[\p{Script=Han}]/u.test(title)) assert.ok(await link.evaluate((node) => node.matches(':lang(zh-CN)')), 'authored tooltip language must remain Chinese')
  }
  for (const link of await page.locator('a.link-badge[target="_blank"], a.project-visual__source-link[target="_blank"]').all()) {
    assert.match(await link.getAttribute('rel'), /noopener/u)
    assert.match(await link.getAttribute('rel'), /noreferrer/u)
  }
}

export async function checkProjectInterfaceLanguage(browser, base) {
  let projectInterfaceGroups = 0
  const categoryEnglish = { 'AI 应用': 'AI applications', '业务系统': 'Business systems', '互动体验': 'Interactive experiences', '移动端': 'Mobile apps', '博客系统': 'Blog platform', '工具': 'Tools' }
  const statusEnglish = { '重点展示': 'Featured', '已有页面': 'Page exists', MVP: 'MVP', '建设中': 'In progress' }
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      const { page, errors, requests } = await createPage(browser, base, { width, theme })
      const capture = async (surface) => {
        if (process.env.UI_CHECK_ARTIFACT_DIR && ((width === 320 && theme === 'morning') || (width === 430 && theme === 'stellar') || (width === 1440 && theme === 'nature'))) {
          await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `project-interface-${surface}-${width}-${theme}-en.png`) })
        }
      }
      try {
        await page.goto(`${base}/`, { waitUntil: 'load' })
        const panel = page.locator('.carousel-wrapper')
        await panel.waitFor({ state: 'visible' })
        const panelNode = await panel.elementHandle()
        const trackNode = await panel.locator('.carousel-track').elementHandle()
        const authoredCards = await panel.locator('.carousel-card > div').allTextContents()
        const modes = await panel.locator('.carousel-action').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-entry-mode')))
        const historyBefore = await page.evaluate(() => history.length)
        await selectSiteLanguage(page, 'en')
        assert.equal(await panel.locator('.panel-head__copy > span').textContent(), 'Project status and access')
        assert.equal(await panel.locator('.panel-head__copy > p').textContent(), 'IN PORT')
        const count = await panel.locator('.carousel-card:not([data-loop-copy])').count()
        assert.equal(await panel.locator('.panel-head > strong').textContent(), `${String(count).padStart(2, '0')} projects`)
        assert.equal(await panel.locator('.carousel-viewport').getAttribute('aria-label'), 'Browse IN PORT projects')
        assert.equal(await panel.locator('.panel-footer').textContent(), 'View all projects')
        assert.ok(await panelNode.evaluate((node) => node.isConnected))
        assert.ok(await trackNode.evaluate((node) => node.isConnected))
        assert.equal(await page.evaluate(() => history.length), historyBefore)
        assert.deepEqual(await panel.locator('.carousel-card > div').allTextContents(), authoredCards)
        assert.deepEqual(await panel.locator('.carousel-action').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-entry-mode'))), modes)
        assert.ok(await panel.locator('.carousel-card > div').evaluateAll((nodes) => nodes.every((node) => node.matches(':lang(zh-CN)'))))
        for (const card of await panel.locator('.carousel-card:not([data-loop-copy])').all()) {
          const title = await card.locator('strong').textContent()
          assert.equal(await card.getAttribute('aria-label'), `View project details: ${title}`)
          const action = card.locator('.carousel-action')
          const direct = await action.getAttribute('data-entry-mode') === 'direct'
          assert.equal(await action.locator('.carousel-action__label--full').textContent(), direct ? 'Open project' : 'View current status')
          assert.equal(await action.locator('.carousel-action__label--compact').textContent(), direct ? 'Open' : 'Status')
          assert.equal(await action.getAttribute('aria-label'), `${direct ? 'Open project' : 'View current status'}: ${title}`)
        }
        await checkProjectInterfaceLayout(page)
        await capture('home')
        await selectSiteLanguage(page, 'zh')
        assert.equal(await panel.locator('.panel-head__copy > span').textContent(), '项目状态与访问边界')
        assert.equal(await panel.locator('.panel-footer').textContent(), '查看全部项目')
        await checkProjectInterfaceLayout(page)
        await selectSiteLanguage(page, 'en')
        await page.reload({ waitUntil: 'load' })
        await assertSiteLanguage(page, 'en')
        assert.equal(await panel.locator('.panel-head__copy > span').textContent(), 'Project status and access')
        await panel.locator('.carousel-card:not([data-loop-copy]) .carousel-action').first().focus()
        await page.keyboard.press('Enter')
        await page.waitForURL(`${base}/status/legal-rag`)
        await assertSiteLanguage(page, 'en')
        await page.goBack()
        await panel.locator('.panel-footer').focus()
        await page.keyboard.press('Enter')
        await page.waitForURL(`${base}/projects`)
        projectInterfaceGroups += 1

        await selectSiteLanguage(page, 'zh')
        const catalog = await catalogContentSnapshot(page, 'projects')
        await checkProjectLinkCopy(page, 'zh')
        await checkProjectInterfaceLayout(page)
        await selectSiteLanguage(page, 'en')
        await checkProjectLinkCopy(page, 'en')
        assert.deepEqual(await catalogContentSnapshot(page, 'projects'), catalog)
        await checkProjectInterfaceLayout(page)
        await capture('catalog')
        const legalCard = page.locator('.project-card').filter({ has: page.locator('[data-reading-entry="projects:legal-rag"]') })
        let status = legalCard.locator('.link-badge--status')
        assert.equal(await status.locator('.project-entry-label').textContent(), 'View current status')
        if (width > 720) {
          assert.equal(await status.isVisible(), false, 'desktop catalog retains its detail-only action layout')
          const detail = legalCard.locator('[data-reading-entry="projects:legal-rag"]')
          await detail.focus()
          assert.ok(await detail.evaluate((node) => document.activeElement === node))
          await page.keyboard.press('Enter')
          await page.waitForURL(`${base}/projects/legal-rag`)
          await page.locator('.project-detail-page').waitFor({ state: 'visible' })
          await page.waitForFunction(() => {
            const heading = document.querySelector('.project-detail-page [data-reading-heading]')
            return heading && document.activeElement === heading
          })
          await checkProjectInterfaceLayout(page)
          status = page.locator('.detail-quick-links a[href="/status/legal-rag"]')
        }
        assert.ok(await status.isVisible(), 'the current layout must expose its status action')
        await status.focus()
        assert.ok(await status.evaluate((node) => document.activeElement === node))
        await page.keyboard.press('Enter')
        await page.waitForURL(`${base}/status/legal-rag`)
        await assertSiteLanguage(page, 'en')
        projectInterfaceGroups += 1

        for (const id of ['legal-rag', 'pet-workspace', 'canvas']) {
          await page.goto(`${base}/projects/${id}?group=fullstack`, { waitUntil: 'load' })
          await page.locator('.project-detail-page').waitFor({ state: 'visible' })
          await selectSiteLanguage(page, 'zh')
          const category = await page.locator('.detail-header .tag').textContent()
          const state = await page.locator('.detail-status').textContent()
          const content = await readingContentSnapshot(page, '.project-detail-page')
          await checkProjectLinkCopy(page, 'zh', { empty: id === 'canvas' })
          await checkProjectInterfaceLayout(page)
          await selectSiteLanguage(page, 'en')
          assert.equal(await page.locator('.detail-header .tag').textContent(), categoryEnglish[category])
          assert.equal(await page.locator('.detail-status').textContent(), statusEnglish[state])
          assert.ok(await page.locator('.detail-header .tag, .detail-status').evaluateAll((nodes) => nodes.every((node) => node.matches(':lang(en)'))))
          await checkProjectLinkCopy(page, 'en', { empty: id === 'canvas' })
          assert.deepEqual(await readingContentSnapshot(page, '.project-detail-page'), content)
          const note = page.locator('.detail-entry-note')
          if (await note.count()) assert.ok(await note.evaluate((node) => node.matches(':lang(zh-CN)')), 'project-specific unavailability stays authored')
          await checkProjectInterfaceLayout(page)
          await capture(id)
          if (id === 'legal-rag') {
            const quickStatus = page.locator('.detail-quick-links a[href="/status/legal-rag"]')
            assert.equal(await quickStatus.locator('.project-entry-label').textContent(), 'View current status')
            await quickStatus.focus()
            await page.keyboard.press('Enter')
            await page.waitForURL(`${base}/status/legal-rag`)
          }
          if (id === 'canvas') assert.equal(await page.locator('.detail-back').getAttribute('href'), '/projects?group=fullstack')
          projectInterfaceGroups += 1
        }
        assertLocalOnly(errors, requests)
      } catch (error) {
        const state = await page.evaluate(() => ({ href: location.href, language: document.documentElement.lang, toggle: document.querySelector('.nav-lang-toggle')?.textContent, focused: document.activeElement?.className }))
        throw new Error(`project-interface ${width}/${theme}: ${error.message}; state=${JSON.stringify(state)}; pageErrors=${JSON.stringify(errors)}`, { cause: error })
      } finally {
        await page.context().close()
      }
    }
  }
  return { projectInterfaceGroups }
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
