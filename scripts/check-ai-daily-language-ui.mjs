import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { createAiDailyPublicFixtureItem, createAiDailyPublicPayloads } from './lib/ai-daily-ui-fixtures.mjs'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'
import { assertSiteLanguage, selectSiteLanguage } from './lib/ui-language.mjs'

const sectionIds = ['ai-daily-fact', 'ai-daily-impact', 'ai-daily-uncertainty', 'ai-daily-citations']
const sectionLabels = {
  zh: ['事实摘要', '为什么重要', '不确定性', '公开来源'],
  en: ['Facts', 'Why it matters', 'Uncertainty', 'Public sources'],
}
const item = createAiDailyPublicFixtureItem()
const ready = createAiDailyPublicPayloads(item)

function deferred() {
  let release
  const promise = new Promise((resolveReady) => { release = resolveReady })
  return { promise, release }
}

async function createDailyPage(browser, base, { width = 390, theme = 'morning', respond } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width <= 430, isMobile: width <= 430, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const errors = []
  const requests = []
  const apiRequests = []
  const firstRequest = deferred()
  page.on('pageerror', (error) => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('external_request_blocked'), { allowLoopback: false })
  await page.route(`${base}/api/**`, (route) => {
    apiRequests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local_verification_fixture"}' })
  })
  // Restrict even explicit fixtures to the current preview origin.
  await page.route(`${base}/public/ai-daily/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const family = url.pathname.endsWith('/feed') ? 'feed' : 'detail'
    const snapshot = { family, path: url.pathname, cursor: url.searchParams.get('cursor'), limit: url.searchParams.get('limit'), etag: request.headers()['if-none-match'] ?? null, method: request.method() }
    requests.push(snapshot)
    firstRequest.release()
    if (respond) return respond(route, snapshot, requests.filter((entry) => entry.family === family).length)
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: `"language-${family}"` }, body: JSON.stringify(ready[family]) })
  })
  await page.addInitScript((initialTheme) => {
    if (localStorage.getItem('biau-port-theme') === null) localStorage.setItem('biau-port-theme', initialTheme)
    sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    const originalInterval = window.setInterval
    window.__dailyPollStarts = 0
    window.setInterval = function (callback, delay, ...args) {
      if (delay === 60000) window.__dailyPollStarts += 1
      return originalInterval.call(this, callback, delay, ...args)
    }
  }, theme)
  return { page, requests, firstRequest: firstRequest.promise, verify() {
    assert.deepEqual(errors, [], 'AI Daily language must not cause page errors or external requests')
    assert.ok(apiRequests.every((request) => request === 'GET /api/health'), 'AI Daily language checks must never call a model')
    assert.ok(requests.every((request) => request.method === 'GET'), 'public fixtures must remain read-only')
  } }
}

async function waitForDaily(page, family) {
  await page.locator(family === 'feed' ? '.ai-daily-public-card' : '.ai-daily-public-detail-page').first().waitFor({ state: 'visible' })
}

async function dailySnapshot(page, family) {
  const root = page.locator(family === 'feed' ? '.ai-daily-public-page' : '.ai-daily-public-detail-page')
  return root.evaluate((node, currentFamily) => {
    const authored = currentFamily === 'feed' ? '.ai-daily-public-card h2, .ai-daily-public-card__summary, .ai-daily-public-card__impact' : '.detail-title, .blog-post-body-text'
    return {
      authored: [...node.querySelectorAll(authored)].map((element) => ({ text: element.textContent, chinese: element.matches(':lang(zh-CN)') })),
      sources: [...node.querySelectorAll('.ai-daily-public-citation__publisher, .ai-daily-public-citation strong, .ai-daily-public-citation p')].map((element) => ({ text: element.textContent, language: element.closest('[lang]')?.getAttribute('lang') })),
      links: [...node.querySelectorAll('a')].map((element) => ({ href: element.getAttribute('href'), target: element.getAttribute('target'), rel: element.getAttribute('rel') })),
      ids: [...node.querySelectorAll('section[id]')].map((element) => element.id),
      coverage: node.querySelector('.ai-daily-public-coverage strong')?.textContent ?? null,
      freshness: node.querySelector('.ai-daily-public-freshness')?.getAttribute('data-state') ?? null,
      correctionCount: node.querySelectorAll('.ai-daily-public-correction').length,
      seo: [document.title, document.querySelector('meta[name="description"]')?.content, document.querySelector('link[rel="canonical"]')?.getAttribute('href')],
    }
  }, family)
}

async function assertDailyCopy(page, language, family) {
  const en = language === 'en'
  const tag = en ? 'en' : 'zh-CN'
  await assertSiteLanguage(page, language)
  const root = page.locator(family === 'feed' ? '.ai-daily-public-page' : '.ai-daily-public-detail-page')
  assert.ok(await root.evaluate((node, expected) => node.matches(`:lang(${expected})`), tag), 'AI Daily interface root must follow selected language')
  const snapshot = await dailySnapshot(page, family)
  assert.ok(snapshot.authored.length > 0 && snapshot.authored.every((entry) => entry.chinese), 'approved authored content must remain Chinese')
  assert.ok(snapshot.sources.every((entry) => entry.language === ''), 'source text must retain its original, unspecified language')
  assert.equal(await root.locator('.ai-daily-public-correction').first().textContent(), en ? 'Corrected' : '已修正')
  const date = await page.evaluate(({ value, locale, detail }) => new Intl.DateTimeFormat(locale, { ...(detail ? { year: 'numeric' } : {}), month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)), { value: item.approvedAt, locale: en ? 'en' : 'zh-CN', detail: family === 'detail' })
  if (family === 'feed') {
    assert.equal(await root.locator('h1').textContent(), '潮讯 TideBrief')
    assert.equal(await root.locator('.section-subtitle').textContent(), en ? 'AI DAILY / Daily briefs' : 'AI DAILY / 每日快讯')
    assert.equal(await root.locator('.section-description').textContent(), en
      ? 'Recent AI updates reviewed against evidence and approved by an editor. Each brief keeps its public sources and a stable URL for corrections.'
      : '只展示经过证据整理与人工批准的近期 AI 动态。每条快讯保留公开引用，修正会沿用同一个事件地址。')
    assert.equal(await root.locator('.ai-daily-public-overview').getAttribute('aria-label'), en ? 'TideBrief AI Daily status' : '潮讯 AI 日报状态')
    assert.equal(await root.locator('.ai-daily-public-freshness strong').textContent(), en ? 'Public feed up to date' : '公开投影正常')
    assert.equal(await root.locator('.ai-daily-public-freshness div > span').textContent(), en ? `Latest approval ${date}` : `最近批准 ${date}`)
    assert.equal(await root.locator('.ai-daily-public-coverage > span').textContent(), en ? 'Source coverage on this page' : '本页证据覆盖')
    assert.equal(await root.locator('.ai-daily-public-refresh button').getAttribute('aria-label'), en ? 'Refresh AI Daily' : '刷新 AI 日报')
    assert.match(await root.locator('.ai-daily-public-refresh > span').textContent(), en ? /^Updated at /u : /^更新于 /u)
    assert.equal(await root.locator('.ai-daily-public-feed').getAttribute('aria-label'), en ? 'Recent AI briefs' : '近期 AI 快讯')
    assert.equal(await root.locator('.ai-daily-public-card__meta > span').first().textContent(), date)
    assert.equal(await root.locator('.ai-daily-public-card__footer > span').first().textContent(), en ? '1 public source' : '1 个公开来源')
    assert.equal(await root.locator('.ai-daily-public-card__footer a').first().getAttribute('aria-label'), en ? `Read ${item.title}` : `阅读 ${item.title}`)
    assert.equal((await root.locator('.ai-daily-public-card__footer a').first().textContent()).trim(), en ? 'Read details' : '阅读详情')
    assert.deepEqual(snapshot.authored.map((entry) => entry.text), [item.title, item.factSummary, item.whyItMatters])
  } else {
    assert.equal(await root.locator('.detail-back').textContent(), en ? '潮讯 TideBrief｜AI Daily' : '潮讯 TideBrief｜AI 日报')
    assert.equal(await root.locator('.detail-summary').textContent(), en ? `Publicly approved ${date} · Revision ${item.revision}` : `公开批准于 ${date} · 版本 ${item.revision}`)
    assert.deepEqual(await root.locator('.detail-block-title').allTextContents(), sectionLabels[language])
    assert.deepEqual(await root.locator('.detail-reading-guide nav a > span:nth-child(2)').allTextContents(), sectionLabels[language])
    assert.ok(await root.locator('.detail-reading-guide nav a > span:nth-child(2)').evaluateAll((nodes, expected) => nodes.every((node) => node.matches(`:lang(${expected})`)), tag))
    assert.deepEqual(snapshot.ids, sectionIds)
    assert.deepEqual(snapshot.authored.map((entry) => entry.text), [item.title, item.factSummary, item.whyItMatters, item.uncertainty])
    assert.deepEqual(snapshot.sources.map((entry) => entry.text), [item.citations[0].publisher, item.citations[0].title, item.citations[0].excerpt])
    assert.deepEqual(snapshot.links.at(-1), { href: item.citations[0].url, target: '_blank', rel: 'noreferrer' })
    assert.equal((await root.locator('.ai-daily-public-citation__link').textContent()).trim(), en ? 'Open source' : '打开来源')
    assert.ok(await root.locator('.ai-daily-public-citation__link').evaluate((node, expected) => node.matches(`:lang(${expected})`), tag))
    assert.equal(snapshot.seo[0], `${item.title} | 潮讯 TideBrief AI 日报`)
    assert.equal(snapshot.seo[1], item.factSummary)
    assert.ok(snapshot.seo[2].endsWith(`/ai-daily/${item.publicId}`))
  }
}

async function assertDailyLayout(page) {
  await page.evaluate(async () => { await document.fonts.ready })
  await page.waitForFunction(() => [...(document.querySelector('main, article.detail-page')?.getAnimations({ subtree: true }) ?? [])].every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity))
  const result = await page.evaluate(() => {
    const root = document.querySelector('.ai-daily-public-page, .ai-daily-public-detail-page, main.detail-page')
    const visible = (node) => node.getClientRects().length > 0
    const nodes = [...root.querySelectorAll('h1, h2, p, button, a, .ai-daily-public-freshness, .ai-daily-public-coverage, .ai-daily-public-refresh')].filter(visible)
    const clipped = nodes.filter((node) => { const rect = node.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1 }).map((node) => ({ selector: node.className || node.tagName, text: node.textContent, width: node.clientWidth, content: node.scrollWidth }))
    const small = innerWidth <= 430 ? nodes.filter((node) => node.matches('a, button') && (node.getBoundingClientRect().height < 43.5 || node.getBoundingClientRect().width < 43.5)).map((node) => ({ selector: node.className, text: node.textContent, height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width })) : []
    const textOutside = []
    for (const control of nodes.filter((node) => node.matches('a, button'))) {
      const bounds = control.getBoundingClientRect()
      const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT)
      let text
      while ((text = walker.nextNode())) {
        if (!text.textContent.trim() || !visible(text.parentElement) || text.parentElement.closest('.sr-only, [hidden]')) continue
        const range = document.createRange()
        range.selectNodeContents(text)
        if ([...range.getClientRects()].some((rect) => rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) textOutside.push({ selector: control.className, text: text.textContent })
      }
    }
    return { clipped, small, textOutside, overflow: document.documentElement.scrollWidth - innerWidth }
  })
  assert.deepEqual(result.clipped, [], 'AI Daily text and controls must fit their containers and viewport')
  assert.deepEqual(result.small, [], 'AI Daily mobile actions must retain 44px targets')
  assert.deepEqual(result.textOutside, [], 'AI Daily action text must remain inside its control')
  assert.ok(result.overflow <= 1)
}

async function assertReachable(page, locator) {
  assert.equal(await locator.isVisible(), true)
  // Native "if needed" can stop inside the fixed tabbar; check a real reading position.
  await locator.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.waitForFunction((node) => { const rect = node.getBoundingClientRect(); const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2); return hit && (node === hit || node.contains(hit)) }, await locator.elementHandle())
  await locator.focus()
  assert.ok(await locator.evaluate((node) => node === document.activeElement))
}

export async function checkAiDailyInterfaceLanguage(browser, base) {
  let aiDailyInterfaceGroups = 0
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      const run = await createDailyPage(browser, base, { width, theme })
      const { page } = run
      try {
        for (const family of ['feed', 'detail']) {
          const path = family === 'feed' ? '/ai-daily' : `/ai-daily/${item.publicId}`
          await page.goto(`${base}${path}`, { waitUntil: 'load' })
          await waitForDaily(page, family)
          const root = await page.locator(family === 'feed' ? '.ai-daily-public-page' : '.ai-daily-public-detail-page').elementHandle()
          const beforeRequests = run.requests.length
          const beforePolls = await page.evaluate(() => window.__dailyPollStarts)
          const location = await page.evaluate(() => ({ href: location.href, history: history.length }))
          let snapshot
          for (const language of ['en', 'zh', 'en']) {
            await selectSiteLanguage(page, language)
            await assertDailyCopy(page, language, family)
            await assertDailyLayout(page)
            const next = await dailySnapshot(page, family)
            if (snapshot) assert.deepEqual(next, snapshot, 'language must preserve approved content, sources, IDs, URLs, counts and SEO')
            snapshot = next
            assert.ok(await root.evaluate((node) => node.isConnected), 'language must not remount AI Daily')
            assert.equal(run.requests.length, beforeRequests, 'language must not refetch AI Daily')
            assert.equal(await page.evaluate(() => window.__dailyPollStarts), beforePolls, 'language must not restart visibility polling')
            assert.deepEqual(await page.evaluate(() => ({ href: location.href, history: history.length })), location)
          }
          if (process.env.UI_CHECK_ARTIFACT_DIR && ((width === 320 && theme === 'morning') || (width === 430 && theme === 'stellar') || (width === 1440 && theme === 'nature'))) {
            await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `ai-daily-language-${family}-${width}-${theme}-en.png`) })
          }
          await page.reload({ waitUntil: 'load' })
          await waitForDaily(page, family)
          await assertSiteLanguage(page, 'en')
          await assertDailyCopy(page, 'en', family)
          assert.equal(await page.locator('html').getAttribute('data-site-theme'), theme)
          if (family === 'detail') {
            const guide = await page.locator('.detail-reading-guide').elementHandle()
            const toggle = page.locator('.detail-reading-guide__toggle')
            await assertReachable(page, toggle)
            await page.keyboard.press('Enter')
            const anchor = page.locator('.detail-reading-guide a[href="#ai-daily-citations"]')
            await anchor.focus()
            // Isolate language state from the existing outside-pointer dismissal.
            await page.locator('.nav-lang-toggle').evaluate((node) => node.click())
            await assertSiteLanguage(page, 'zh')
            assert.ok(await guide.evaluate((node) => node.isConnected))
            assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
            assert.ok(await anchor.evaluate((node) => node === document.activeElement))
            await assertDailyLayout(page)
            await page.keyboard.press('Escape')
            assert.ok(await toggle.evaluate((node) => node === document.activeElement))
            await page.keyboard.press('Enter')
            await anchor.focus()
            await page.keyboard.press('Enter')
            // A short intermediate section can bring its next heading inside the scroll spy.
            await page.waitForFunction(() => document.querySelector('.detail-reading-guide')?.getAttribute('data-active-section') === 'ai-daily-citations')
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
            assert.ok(await page.evaluate(() => scrollY > 0), 'a real outline anchor must move into the article')
            await assertReachable(page, page.locator('.ai-daily-public-citation').first())
          }
          const action = page.locator(family === 'feed' ? '.ai-daily-public-card__footer a' : '.detail-back').first()
          const destination = await action.getAttribute('href')
          await assertReachable(page, action)
          await page.keyboard.press('Enter')
          await page.waitForURL(`${base}${destination}`)
          await waitForDaily(page, family === 'feed' ? 'detail' : 'feed')
          await page.goBack()
          await page.waitForURL(`${base}${path}`)
          await waitForDaily(page, family)
          await assertSiteLanguage(page, family === 'detail' ? 'zh' : 'en')
          aiDailyInterfaceGroups += 1
        }
        run.verify()
      } catch (error) { throw new Error(`ai-daily-language ${width}/${theme} ${new URL(page.url()).pathname}: ${error.message}`, { cause: error }) }
      finally { await page.context().close() }
    }
  }

  let aiDailyLoadingGroups = 0
  for (const family of ['feed', 'detail']) {
    for (const width of [320, 1440]) {
      const gate = deferred()
      const run = await createDailyPage(browser, base, { width, respond: async (route, request) => {
        await gate.promise
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ready[request.family]) })
      } })
      try {
        await run.page.goto(`${base}/ai-daily${family === 'detail' ? `/${item.publicId}` : ''}`, { waitUntil: 'load' })
        await run.page.locator(family === 'feed' ? '.ai-daily-public-empty' : '.detail-missing').waitFor({ state: 'visible' })
        await run.firstRequest
        const count = run.requests.length
        for (const language of ['en', 'zh']) {
          await selectSiteLanguage(run.page, language)
          const en = language === 'en'
          if (family === 'feed') {
            assert.equal(await run.page.locator('.ai-daily-public-empty p').textContent(), en ? 'Loading approved AI updates…' : '正在读取已批准的 AI 动态…')
            assert.equal(await run.page.locator('.ai-daily-public-freshness strong').textContent(), en ? 'Syncing' : '正在同步')
            assert.equal(await run.page.locator('.ai-daily-public-refresh button').isDisabled(), true)
          } else {
            assert.equal(await run.page.locator('.detail-missing h1').textContent(), en ? 'Loading AI Daily' : 'AI 日报载入中')
            assert.equal(await run.page.locator('.detail-missing p').textContent(), en ? 'Opening the public brief.' : '正在打开公开快讯。')
            assert.equal(await run.page.locator('.detail-reading-guide').count(), 0)
          }
          assert.ok(await run.page.locator('main').evaluate((node, tag) => node.matches(`:lang(${tag})`), en ? 'en' : 'zh-CN'))
          assert.equal(run.requests.length, count, 'switching language during loading must not create another request')
          await assertDailyLayout(run.page)
        }
        gate.release()
        await waitForDaily(run.page, family)
        run.verify()
        aiDailyLoadingGroups += 1
      } finally { gate.release(); await run.page.context().close() }
    }
  }

  const errorCases = [
    ['feed', 404, 'fixture', '公开 AI 日报接口尚未配置或没有公开入口。', 'The public AI Daily endpoint is not configured or available.'],
    ['feed', 429, 'fixture', '刷新太频繁，请稍后再试。', 'Too many refreshes. Please try again later.'],
    ['feed', 503, 'fixture', '内容服务还没有连接到 Studio 数据库。', 'The content service is not yet connected to the Studio database.'],
    ['feed', 0, 'network', '浏览器无法连接内容服务，请稍后重试。', 'The browser cannot reach the content service. Please try again later.'],
    ['feed', 500, 'fixture', '内容服务暂时返回异常状态。', 'The content service is temporarily unavailable.'],
    ['detail', 404, 'fixture', '这条快讯不存在，或还没有通过公开审核。', 'This brief does not exist or has not been approved for public release.'],
    ['detail', 410, 'public-item-withdrawn', '这条快讯已被撤回。', 'This brief has been withdrawn.'],
    ['detail', 410, 'public-item-expired', '这条快讯已超过公开保留时间。', 'This brief is past its public retention period.'],
    ['detail', 0, 'network', '浏览器无法连接内容服务，请稍后重试。', 'The browser cannot reach the content service. Please try again later.'],
    ['detail', 500, 'fixture', '内容服务暂时返回异常状态。', 'The content service is temporarily unavailable.'],
  ]
  for (const [family, status, error, zh, en] of errorCases) {
    const run = await createDailyPage(browser, base, { width: 320, respond: (route) => status === 0 ? route.abort('failed') : route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error }) }) })
    try {
      await run.page.goto(`${base}/ai-daily${family === 'detail' ? '/error-fixture' : ''}`, { waitUntil: 'load' })
      const notice = run.page.locator(family === 'feed' ? '.ai-daily-public-notice.is-error' : '.detail-missing')
      await notice.waitFor({ state: 'visible' })
      if (family === 'detail') await run.page.waitForFunction(() => document.querySelector('.detail-missing-actions') !== null)
      const count = run.requests.length
      for (const language of ['en', 'zh', 'en']) {
        await selectSiteLanguage(run.page, language)
        assert.equal(await notice.locator('p').textContent(), language === 'en' ? en : zh)
        assert.equal(await notice.locator('button').textContent(), language === 'en' ? 'Retry' : '重试')
        assert.equal(await notice.locator(family === 'feed' ? 'strong' : 'h1').textContent(), family === 'feed'
          ? (language === 'en' ? 'AI Daily could not refresh' : '暂时无法刷新 AI 日报')
          : (language === 'en' ? 'This brief could not be opened' : '无法打开这条快讯'))
        assert.ok(await run.page.locator('main').evaluate((node, tag) => node.matches(`:lang(${tag})`), language === 'en' ? 'en' : 'zh-CN'))
        assert.equal(run.requests.length, count, 'an existing error must translate without retrying')
        assert.equal(await run.page.locator('.detail-reading-guide').count(), 0)
        await assertDailyLayout(run.page)
      }
      if (family === 'detail') assert.equal(await notice.locator('a').getAttribute('href'), '/ai-daily')
      if (process.env.UI_CHECK_ARTIFACT_DIR && family === 'detail' && status === 410 && error.includes('withdrawn')) await run.page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, 'ai-daily-language-withdrawn-320-en.png') })
      await assertReachable(run.page, notice.locator('button'))
      await Promise.all([
        run.page.waitForRequest((request) => request.url().startsWith(`${base}/public/ai-daily/`)),
        run.page.keyboard.press('Enter'),
      ])
      await run.page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent === text, { selector: family === 'feed' ? '.ai-daily-public-notice.is-error p' : '.detail-missing p', text: en })
      assert.equal(run.requests.length, count + 1, 'explicit retry must issue exactly one request')
      run.verify()
    } catch (failure) { throw new Error(`ai-daily-error ${family}/${status}/${error}: ${failure.message}`, { cause: failure }) }
    finally { await run.page.context().close() }
  }

  for (const mode of ['stale', 'empty', 'minimal']) {
    const minimal = createAiDailyPublicFixtureItem({ corrected: false, correctedAt: null, uncertainty: null, citations: [] })
    const fixture = createAiDailyPublicPayloads(mode === 'minimal' ? minimal : item, mode === 'stale' ? { status: 'stale', stale: true } : mode === 'empty' ? { status: 'empty', latestApprovalAt: null, latestProjectionAt: null } : {})
    if (mode === 'empty') fixture.feed.items = []
    if (mode !== 'stale') fixture.feed.meta.editorialCoverage = { scope: 'page', itemCount: mode === 'empty' ? 0 : 1, citedItemCount: 0, citationCoverage: 0 }
    const run = await createDailyPage(browser, base, { width: 320, respond: (route, request) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture[request.family]) }) })
    try {
      await run.page.goto(`${base}/ai-daily`, { waitUntil: 'load' })
      await run.page.waitForFunction(() => document.querySelector('.ai-daily-public-refresh button')?.disabled === false)
      for (const language of ['en', 'zh']) {
        await selectSiteLanguage(run.page, language)
        const en = language === 'en'
        if (mode === 'stale') {
          assert.equal(await run.page.locator('.ai-daily-public-freshness strong').textContent(), en ? 'Feed needs attention' : '投影需要关注')
          assert.equal(await run.page.locator('.is-stale p').textContent(), en ? 'The API is available, but the latest public update is over 180 minutes old. Content may be behind.' : '当前 API 可用，但最近一次公开投影已经超过 180 分钟，内容可能暂时滞后。')
        } else if (mode === 'empty') {
          assert.equal(await run.page.locator('.ai-daily-public-empty h2').textContent(), en ? 'No public briefs yet' : '公开快讯暂为空')
          assert.equal(await run.page.locator('.ai-daily-public-freshness strong').textContent(), en ? 'Waiting for public content' : '等待公开内容')
          assert.equal(await run.page.locator('.ai-daily-public-freshness div > span').textContent(), en ? 'No approved public records yet' : '还没有可公开的批准记录')
        } else {
          assert.equal(await run.page.locator('.ai-daily-public-card__footer > span').textContent(), en ? 'Sources being collected' : '来源整理中')
          assert.equal(await run.page.locator('.ai-daily-public-correction').count(), 0)
        }
        await assertDailyLayout(run.page)
      }
      if (mode === 'minimal') {
        await run.page.locator('.ai-daily-public-card__footer a').click()
        await waitForDaily(run.page, 'detail')
        for (const language of ['en', 'zh']) {
          await selectSiteLanguage(run.page, language)
          assert.deepEqual(await run.page.locator('.detail-block').evaluateAll((nodes) => nodes.map((node) => node.id)), sectionIds.slice(0, 2))
          assert.deepEqual(await run.page.locator('.detail-block-title').allTextContents(), sectionLabels[language].slice(0, 2))
          assert.equal(await run.page.locator('.detail-reading-guide nav a').count(), 2)
          assert.equal(await run.page.locator('.ai-daily-public-correction, .ai-daily-public-citation').count(), 0)
        }
      }
      run.verify()
    } finally { await run.page.context().close() }
  }

  const refreshGate = deferred()
  const refresh = await createDailyPage(browser, base, { width: 320, respond: async (route, request, count) => {
    if (count === 1) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: '"language-refresh"' }, body: JSON.stringify(ready.feed) })
    if (count === 2) { await refreshGate.promise; return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"transient"}' }) }
    return route.fulfill({ status: 304, headers: { ETag: '"language-refresh"' } })
  } })
  try {
    const { page } = refresh
    await page.goto(`${base}/ai-daily`, { waitUntil: 'load' })
    await waitForDaily(page, 'feed')
    const card = await page.locator('.ai-daily-public-card').elementHandle()
    await page.locator('.ai-daily-public-refresh button').click()
    await page.waitForFunction(() => document.querySelector('.ai-daily-public-refresh button')?.disabled === true)
    await selectSiteLanguage(page, 'en')
    assert.equal(refresh.requests.length, 2)
    assert.equal(await page.locator('.ai-daily-public-refresh button').isDisabled(), true)
    refreshGate.release()
    await page.locator('.ai-daily-public-notice.is-error').waitFor({ state: 'visible' })
    assert.equal(await page.locator('.ai-daily-public-notice p').textContent(), 'The content service is not yet connected to the Studio database. Previously loaded content has been kept.')
    await selectSiteLanguage(page, 'zh')
    assert.equal(await page.locator('.ai-daily-public-notice p').textContent(), '内容服务还没有连接到 Studio 数据库。 已保留上一次成功加载的内容。')
    assert.equal(refresh.requests.length, 2)
    await page.getByRole('button', { name: '重试', exact: true }).click()
    await page.locator('.ai-daily-public-notice.is-error').waitFor({ state: 'hidden' })
    assert.equal(refresh.requests.length, 3)
    assert.deepEqual(refresh.requests.map((request) => request.etag), [null, '"language-refresh"', '"language-refresh"'])
    assert.ok(await card.evaluate((node) => node.isConnected), 'refresh errors and 304 must retain the loaded card')
    assert.equal(await page.locator('.ai-daily-public-card h2').textContent(), item.title)
    refresh.verify()
  } finally { refreshGate.release(); await refresh.page.context().close() }

  const appendGate = deferred()
  const earlierItem = createAiDailyPublicFixtureItem({ publicId: 'earlier-brief', title: '更早的公开快讯', corrected: false, correctedAt: null })
  const nextPage = createAiDailyPublicPayloads(earlierItem).feed
  const firstPage = { ...ready.feed, nextCursor: 'earlier-page-cursor' }
  const pagination = await createDailyPage(browser, base, { width: 320, respond: async (route, request, count) => {
    if (count === 1) return route.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: '"language-page-1"' }, body: JSON.stringify(firstPage) })
    if (request.cursor) { await appendGate.promise; return route.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: '"language-page-2"' }, body: JSON.stringify(nextPage) }) }
    return route.fulfill({ status: 304, headers: { ETag: '"language-page-1"' } })
  } })
  try {
    const { page } = pagination
    await page.goto(`${base}/ai-daily`, { waitUntil: 'load' })
    await waitForDaily(page, 'feed')
    const card = await page.locator('.ai-daily-public-card').elementHandle()
    await selectSiteLanguage(page, 'en')
    const more = page.locator('.ai-daily-public-load-more button')
    assert.equal((await more.textContent()).trim(), 'Load earlier briefs')
    await assertDailyLayout(page)
    await assertReachable(page, more)
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('.ai-daily-public-load-more button')?.disabled === true)
    assert.equal((await more.textContent()).trim(), 'Loading…')
    await selectSiteLanguage(page, 'zh')
    assert.equal((await more.textContent()).trim(), '读取中…')
    assert.equal(pagination.requests.length, 2)
    assert.equal(await page.locator('.ai-daily-public-refresh button').isDisabled(), true)
    appendGate.release()
    await page.waitForFunction(() => document.querySelectorAll('.ai-daily-public-card').length === 2)
    assert.deepEqual(await page.locator('.ai-daily-public-card h2').allTextContents(), [item.title, earlierItem.title])
    assert.equal(await more.count(), 0)
    assert.ok(await card.evaluate((node) => node.isConnected))
    await page.locator('.ai-daily-public-refresh button').click()
    await page.waitForFunction(() => document.querySelector('.ai-daily-public-refresh button')?.disabled === false)
    assert.deepEqual(pagination.requests.map((request) => [request.cursor, request.etag, request.limit]), [[null, null, '20'], ['earlier-page-cursor', null, '20'], [null, '"language-page-1"', '20']])
    assert.equal(await page.locator('.ai-daily-public-card').count(), 2)
    pagination.verify()
  } finally { appendGate.release(); await pagination.page.context().close() }

  const oldResponse = deferred()
  const oldFinished = deferred()
  const race = await createDailyPage(browser, base, { width: 390, respond: async (route, request) => {
    if (request.path.endsWith('/slow-language')) {
      await oldResponse.promise
      const oldItem = createAiDailyPublicFixtureItem({ publicId: 'slow-language', title: '迟到的旧快讯' })
      try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(createAiDailyPublicPayloads(oldItem).detail) }) }
      catch { /* The intentional route-change abort may close this request. */ }
      finally { oldFinished.release() }
      return
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ready[request.family]) })
  } })
  try {
    const { page } = race
    const abortedOldRequest = page.waitForEvent('requestfailed', { predicate: (request) => request.url().endsWith('/slow-language') })
    await page.goto(`${base}/ai-daily/slow-language`, { waitUntil: 'load' })
    await race.firstRequest
    await page.locator('.detail-missing').waitFor({ state: 'visible' })
    await selectSiteLanguage(page, 'en')
    assert.equal(race.requests.length, 1)
    await assertReachable(page, page.locator('.site-footer__links a[href="/ai-daily"]'))
    await page.keyboard.press('Enter')
    await waitForDaily(page, 'feed')
    assert.match((await abortedOldRequest).failure()?.errorText ?? '', /ERR_ABORTED/u, 'leaving the pending detail must abort its request')
    await assertReachable(page, page.locator('.ai-daily-public-card__footer a'))
    await page.keyboard.press('Enter')
    await waitForDaily(page, 'detail')
    oldResponse.release()
    await oldFinished.promise
    await assertDailyCopy(page, 'en', 'detail')
    assert.equal(new URL(page.url()).pathname, `/ai-daily/${item.publicId}`)
    assert.deepEqual(race.requests.map((request) => request.path), ['/public/ai-daily/events/slow-language', '/public/ai-daily/feed', `/public/ai-daily/events/${item.publicId}`])
    assert.ok(await page.locator('.detail-title').textContent() !== '迟到的旧快讯', 'a late response must not replace the newer route after a language switch')
    race.verify()
  } finally { oldResponse.release(); await race.page.context().close() }

  return { aiDailyInterfaceGroups, aiDailyLoadingGroups, aiDailyErrorGroups: errorCases.length, aiDailyStateGroups: 3, aiDailyRecoveryGroups: 3, modelCalls: 0 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const browser = await chromium.launch({ headless: true })
  try { console.log('AI Daily language UI passed:', await checkAiDailyInterfaceLanguage(browser, process.env.UI_CHECK_BASE || 'http://127.0.0.1:5174')) }
  finally { await browser.close() }
}
