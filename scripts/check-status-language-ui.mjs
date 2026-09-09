import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { tsImport } from 'tsx/esm/api'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'
import { assertSiteLanguage, selectSiteLanguage } from './lib/ui-language.mjs'

// language:ui runs with Node; resolve the fixture modules' TypeScript imports locally.
const { reliabilityProjects, siteStatusTargets } = await tsImport('../src/data/statusTargets.ts', import.meta.url)
const { buildSummary, mergeSiteStatusPayload } = await tsImport('../src/data/siteStatusView.ts', import.meta.url)

const overviewIds = ['status-overview', 'status-summary', 'status-layers', 'status-manual', 'status-targets', 'status-projects']
const detailIds = ['status-detail-overview', 'status-detail-distribution', 'status-detail-checks', 'status-detail-handling', 'status-detail-gates', 'status-detail-next-actions']
const overviewLabels = {
  zh: ['总体状态', '状态统计', '可靠性分层', '人工待办', '入口检测', '项目可靠性'],
  en: ['Overview', 'Status counts', 'Reliability layers', 'Manual tasks', 'Entry checks', 'Project reliability'],
}
const detailLabels = {
  zh: ['状态概览', '检查分布', '可靠性检查', '人工处理', '人工 Gate', '后续接入'],
  en: ['Status overview', 'Check distribution', 'Reliability checks', 'Manual handling', 'Manual gates', 'Next integrations'],
}
const statusLabels = { zh: ['可用', '受限', '异常', '未检测', '待接入'], en: ['Available', 'Limited', 'Issue', 'Unchecked', 'Planned'] }
const stateOrder = ['online', 'degraded', 'offline', 'unchecked', 'planned']
const timestamp = '2026-09-09T00:12:34.000Z'

function createFixture(mode = 'mixed') {
  const targets = siteStatusTargets.map((target, index) => ({
    ...target, status: mode === 'mixed' ? stateOrder[index % 4] : 'online',
    httpStatus: index === 0 ? 0 : 200, durationMs: index === 0 ? 0 : 1234,
    checkedAt: index === 0 ? '' : timestamp, finalUrl: target.url,
    issues: index === 1 ? ['保留的公开入口检查说明。'] : [],
  }))
  const projects = reliabilityProjects.map((project) => ({
    ...project,
    checks: project.checks.map((check, index) => ({
      ...check,
      status: mode === 'stable' ? 'online' : mode === 'capabilities' ? 'planned' : stateOrder[index % 5],
      evidence: `${check.evidence} 证据时间：${timestamp}；证据新鲜度：${['新鲜', '接近过期', '已过期', '未知'][index % 4]}（12 分钟）。`,
    })),
  }))
  return { checkedAt: timestamp, base: 'local-verification', ok: false, targets, summary: buildSummary(targets), reliabilityProjects: projects }
}

async function createStatusPage(browser, base, { width = 390, theme = 'morning', mode = 'mixed', response = 'ready' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width <= 430, isMobile: width <= 430, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const errors = []
  const apiRequests = []
  const fixture = createFixture(mode)
  let statusRequests = 0
  let release
  const ready = new Promise((resolveReady) => { release = resolveReady })
  page.on('pageerror', (error) => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('external_request_blocked'), { allowLoopback: false })
  await page.route(`${base}/api/**`, (route) => {
    apiRequests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local_verification_fixture"}' })
  })
  await page.route(`${base}/status/site-status.json`, async (route) => {
    statusRequests += 1
    if (response === 'delayed') await ready
    return route.fulfill({ status: response === 'error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(fixture) })
  })
  await page.addInitScript((initialTheme) => {
    if (localStorage.getItem('biau-port-theme') === null) localStorage.setItem('biau-port-theme', initialTheme)
    sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, theme)
  return { page, fixture, release, requests: () => statusRequests, verify: () => {
    assert.deepEqual(errors, [], 'status language must not cause page errors or external requests')
    assert.ok(apiRequests.every((request) => request === 'GET /api/health'), 'status checks must never call a model')
  } }
}

async function waitForStatus(page, family) {
  await page.locator('.site-status-page').waitFor({ state: 'visible' })
  if (family === 'overview') await page.waitForFunction(() => document.querySelectorAll('.status-metrics dd')[1]?.textContent === 'local-verification')
  if (family === 'detail') await page.waitForFunction(() => document.querySelector('.status-check .status-target__note')?.textContent?.includes('12 分钟'))
}

async function contentSnapshot(page, family) {
  const selectors = family === 'overview'
    ? '.status-target__main h2, .status-target__main > p, .status-target__note, .status-project-card h2, .status-project-card > div > p:not(.section-subtitle), .status-manual-action h3, .status-manual-action > p'
    : '.status-hero h1, .status-hero > .section-description, .status-project__header h2, .status-project__summary, .status-check h3, .status-check > p, .status-check__facts dd[lang="zh-CN"], .status-project__manual-list p, .status-evidence-freshness > span[lang="zh-CN"]'
  return page.locator('.site-status-page').evaluate((root, authoredSelector) => ({
    authored: [...root.querySelectorAll(authoredSelector)].map((node) => ({ text: node.textContent, chinese: node.matches(':lang(zh-CN)') })),
    links: [...root.querySelectorAll('a')].map((node) => ({ href: node.getAttribute('href'), target: node.getAttribute('target'), rel: node.getAttribute('rel') })),
    counts: [...root.querySelectorAll('.status-summary-card strong, .status-project__status-strip dd, .status-project-card__meta dd')].map((node) => node.textContent),
    tones: [...root.querySelectorAll('.status-badge, .status-summary-card, .status-check, .status-freshness-badge')].map((node) => node.className),
  }), selectors)
}

async function assertStatusCopy(page, language, family) {
  const en = language === 'en'
  await assertSiteLanguage(page, language)
  assert.ok(await page.locator('.site-status-page').evaluate((node, tag) => node.matches(`:lang(${tag})`), en ? 'en' : 'zh-CN'), 'status interface root must follow selected language')
  if (family === 'missing') {
    assert.equal(await page.locator('.detail-missing h1').textContent(), en ? 'Status page not found' : '没有找到这个状态页')
    assert.equal((await page.locator('.detail-missing .btn').textContent()).trim(), en ? 'Back to status overview' : '返回状态总览')
    assert.equal(await page.locator('.detail-missing .btn').getAttribute('href'), '/status')
    assert.equal(await page.locator('.detail-reading-guide').count(), 0)
    return
  }
  const snapshot = await contentSnapshot(page, family)
  assert.ok(snapshot.authored.length > 0 && snapshot.authored.every((item) => item.chinese), 'authored status descriptions and raw evidence must remain Chinese')
  if (family === 'overview') {
    assert.equal(await page.locator('h1').innerText(), en ? 'Project reliability' : '项目可靠性观察')
    assert.equal(await page.locator('.status-metrics').getAttribute('aria-label'), en ? 'Site entry status summary' : '站点入口状态摘要')
    assert.deepEqual(await page.locator('.status-summary-card > span').allTextContents(), en
      ? ['Available entries', 'Limited entries', 'Entry issues', 'Unchecked entries', 'Online capabilities', 'Limited capabilities', 'Capability issues', 'Unchecked capabilities', 'Planned capabilities']
      : ['可用入口', '受限入口', '异常入口', '未检测入口', '在线能力', '受限能力', '异常能力', '未检测能力', '待接入能力'])
    assert.deepEqual(await page.locator('.status-layer-card h2').allTextContents(), en ? ['Entry reachability', 'Functional checks', 'Project metrics', 'Dashboards and alerts'] : ['入口可达', '功能小任务', '项目指标', '看板告警'])
    const select = page.locator('.status-section-navigator select')
    assert.equal(await select.getAttribute('aria-label'), en ? 'Select status section' : '选择状态页分区')
    assert.deepEqual(await select.locator('option').allTextContents(), overviewLabels[language].map((label, index) => `${index + 1}. ${label}`))
    assert.deepEqual(await select.locator('option').evaluateAll((nodes) => nodes.map((node) => node.value)), overviewIds)
    assert.equal(await page.locator('.status-target').first().locator('.status-target__facts dd').first().textContent(), en ? 'Not recorded' : '未记录')
    assert.equal(await page.locator('.status-target').first().locator('.status-target__facts dd').nth(2).textContent(), en ? 'Not generated' : '未生成')
    for (const link of await page.locator('.status-target__actions a[target="_blank"]').all()) assert.equal(await link.getAttribute('rel'), 'noopener noreferrer')
  } else {
    assert.deepEqual(await page.locator('.status-detail-actions .btn').allTextContents(), en ? ['Back to status overview', 'Current detail page'] : ['返回状态总览', '当前详情页'])
    assert.equal(await page.locator('.status-project__header-tools a').textContent(), en ? 'Back to overview' : '返回总览')
    assert.deepEqual(await page.locator('.detail-reading-guide nav a > span:nth-child(2)').allTextContents(), detailLabels[language])
    assert.deepEqual(await page.locator('.detail-reading-guide nav a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href').slice(1))), detailIds)
    assert.ok(await page.locator('.detail-reading-guide nav a > span:nth-child(2)').evaluateAll((nodes, tag) => nodes.every((node) => node.matches(`:lang(${tag})`)), en ? 'en' : 'zh-CN'))
    const checks = await page.locator('.status-check .status-badge').allTextContents()
    assert.deepEqual(checks, checks.map((_, index) => statusLabels[language][index % 5]))
    assert.deepEqual(await page.locator('.status-freshness-badge').allTextContents(), checks.map((_, index) => (en ? ['Fresh', 'Expiring soon', 'Expired', 'Unknown'] : ['新鲜', '接近过期', '已过期', '未知'])[index % 4]))
  }
}

async function assertStatusLayout(page) {
  await page.evaluate(async () => { await document.fonts.ready })
  await page.waitForFunction(() => [...(document.querySelector('.site-status-page')?.getAnimations({ subtree: true }) ?? [])].every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity))
  const result = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.site-status-page h1, .site-status-page h2, .site-status-page h3, .site-status-page p, .site-status-page dt, .site-status-page dd, .site-status-page a.btn, .status-project__header-tools a, .status-section-navigator, .status-section-navigator select, .detail-reading-guide__outline a')].filter((node) => node.getClientRects().length)
    const clipped = nodes.filter((node) => { const rect = node.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1 }).map((node) => ({ selector: node.className || node.tagName, text: node.textContent, width: node.clientWidth, content: node.scrollWidth }))
    const small = innerWidth <= 430 ? nodes.filter((node) => node.matches('a, select') && (node.getBoundingClientRect().height < 43.5 || node.getBoundingClientRect().width < 43.5)).map((node) => ({ selector: node.className, text: node.textContent, height: node.getBoundingClientRect().height })) : []
    return { clipped, small, overflow: document.documentElement.scrollWidth - innerWidth }
  })
  assert.deepEqual(result.clipped, [], 'status text and actions must fit inside the viewport and their containers')
  assert.deepEqual(result.small, [], 'localized mobile status controls must retain 44px targets')
  assert.ok(result.overflow <= 1)
}

export async function checkStatusInterfaceLanguage(browser, base) {
  let statusInterfaceGroups = 0
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      const run = await createStatusPage(browser, base, { width, theme })
      const { page } = run
      try {
        for (const [family, path] of [['overview', '/status'], ['detail', '/status/legal-rag'], ['missing', '/status/missing-status-language']]) {
          await page.goto(`${base}${path}`, { waitUntil: 'load' })
          await waitForStatus(page, family)
          await selectSiteLanguage(page, 'zh')
          const root = await page.locator('.site-status-page').elementHandle()
          const beforeRequests = run.requests()
          const location = await page.evaluate(() => ({ href: location.href, history: history.length }))
          let content
          for (const language of ['zh', 'en', 'zh', 'en']) {
            await selectSiteLanguage(page, language)
            await assertStatusCopy(page, language, family)
            await assertStatusLayout(page)
            if (family !== 'missing') {
              const nextContent = await contentSnapshot(page, family)
              if (content) assert.deepEqual(nextContent, content, 'language must preserve evidence, action destinations, counts and status tones')
              content = nextContent
            }
            assert.ok(await root.evaluate((node) => node.isConnected), 'language must not remount status content')
            assert.equal(run.requests(), beforeRequests, 'language must not refetch status')
            assert.deepEqual(await page.evaluate(() => ({ href: location.href, history: history.length })), location)
          }
          if (process.env.UI_CHECK_ARTIFACT_DIR && ((width === 320 && theme === 'morning') || (width === 430 && theme === 'stellar') || (width === 1440 && theme === 'nature'))) {
            await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `status-language-${family}-${width}-${theme}-en.png`) })
          }
          await page.reload({ waitUntil: 'load' })
          await waitForStatus(page, family)
          await assertSiteLanguage(page, 'en')
          await assertStatusCopy(page, 'en', family)
          assert.equal(await page.locator('html').getAttribute('data-site-theme'), theme)
          if (family === 'overview' && width <= 430) {
            const select = page.locator('.status-section-navigator select')
            assert.equal(await select.getAttribute('aria-label'), 'Select status section')
            await select.selectOption('status-targets')
            await page.waitForFunction(() => document.querySelector('.status-section-navigator select')?.value === 'status-targets' && Math.abs(document.getElementById('status-targets').getBoundingClientRect().top - 86) < 3)
            await select.focus()
            // Update language without pointer-driven scrolling; keep the section control focused.
            await page.locator('.nav-lang-toggle').evaluate((node) => node.click())
            await assertSiteLanguage(page, 'zh')
            assert.equal(await select.inputValue(), 'status-targets')
            assert.ok(await select.evaluate((node) => node === document.activeElement))
            await select.selectOption('status-manual')
            await page.waitForFunction(() => Math.abs(document.getElementById('status-manual').getBoundingClientRect().top - 86) < 3)
          }
          if (family === 'detail') {
            const toggle = page.locator('.detail-reading-guide__toggle')
            await toggle.focus()
            await page.keyboard.press('Enter')
            const anchor = page.locator('.detail-reading-guide a[href="#status-detail-checks"]')
            await anchor.focus()
            await page.locator('.nav-lang-toggle').evaluate((node) => node.click())
            await assertSiteLanguage(page, 'zh')
            assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
            assert.ok(await anchor.evaluate((node) => node === document.activeElement))
            await assertStatusLayout(page)
            await page.keyboard.press('Escape')
            assert.ok(await toggle.evaluate((node) => node === document.activeElement))
            await page.keyboard.press('Enter')
            await anchor.focus()
            await page.keyboard.press('Enter')
            await page.waitForFunction(() => document.querySelector('.detail-reading-guide')?.getAttribute('data-active-section') === 'status-detail-checks')
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
          }
          const back = family === 'missing' ? page.locator('.detail-missing .btn') : family === 'detail' ? page.locator('.status-project__header-tools a') : page.locator('.status-manual-action__link').first()
          const destination = await back.getAttribute('href')
          await back.focus()
          assert.ok(await back.evaluate((node) => node === document.activeElement))
          await page.keyboard.press('Enter')
          await page.waitForURL(`${base}${destination}`)
          await page.locator(family === 'overview' ? '.status-project' : '.status-overview').waitFor({ state: 'visible' })
          await page.goBack()
          await page.waitForURL(`${base}${path}`)
          statusInterfaceGroups += 1
        }
        run.verify()
      } catch (error) {
        throw new Error(`status-language ${width}/${theme}: ${error.message}`, { cause: error })
      } finally { run.release(); await page.context().close() }
    }
  }
  let statusLoadingGroups = 0
  for (const response of ['delayed', 'error']) {
    for (const width of [320, 1440]) {
      const run = await createStatusPage(browser, base, { width, response })
      try {
        await run.page.goto(`${base}/status`, { waitUntil: 'load' })
        await run.page.locator('.status-overview').waitFor({ state: 'visible' })
        if (response === 'error') await run.page.locator('.status-load-error').waitFor({ state: 'visible' })
        const requestCount = run.requests()
        for (const language of ['en', 'zh']) {
          await selectSiteLanguage(run.page, language)
          const en = language === 'en'
          assert.equal(await run.page.locator('.status-metrics dd').first().textContent(), en ? 'Not generated' : '未生成')
          assert.equal(run.requests(), requestCount, 'pending and failed requests must not restart for language')
          if (response === 'error') assert.equal(await run.page.locator('.status-load-error').textContent(), en ? 'Status data could not be loaded: HTTP 503' : '状态数据暂未读取成功：HTTP 503')
          await assertStatusLayout(run.page)
        }
        run.release()
        if (response === 'delayed') await waitForStatus(run.page, 'overview')
        run.verify()
        statusLoadingGroups += 1
      } finally { run.release(); await run.page.context().close() }
    }
  }
  for (const [mode, heading] of [['mixed', 'Some entries need attention'], ['capabilities', 'Some capabilities await verification'], ['stable', 'Entries and key capabilities are stable']]) {
    const run = await createStatusPage(browser, base, { mode })
    try {
      await run.page.goto(`${base}/status`, { waitUntil: 'load' })
      await waitForStatus(run.page, 'overview')
      await selectSiteLanguage(run.page, 'en')
      assert.equal(await run.page.locator('.status-overview h2').textContent(), heading)
      assert.deepEqual(await run.page.locator('.status-summary-card strong').allTextContents(), (() => {
        const payload = mergeSiteStatusPayload(run.fixture)
        const counts = stateOrder.map((status) => payload.reliabilityProjects.flatMap((project) => project.checks).filter((check) => check.status === status).length)
        return [...stateOrder.slice(0, 4).map((status) => payload.summary[status]), ...counts].map(String)
      })())
      run.verify()
    } finally { run.release(); await run.page.context().close() }
  }
  return { statusInterfaceGroups, statusLoadingGroups, statusOverviewGroups: 3, modelCalls: 0 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const browser = await chromium.launch({ headless: true })
  try { console.log('Status language UI passed:', await checkStatusInterfaceLanguage(browser, process.env.UI_CHECK_BASE || 'http://127.0.0.1:5174')) }
  finally { await browser.close() }
}
