import { chromium } from 'playwright'
import sharp from 'sharp'
import {
  findReliabilityProjectForTarget,
  reliabilityProjects as staticReliabilityProjects,
  siteStatusTargets,
} from '../src/data/statusTargets.ts'
import {
  getReliabilityStatusSummary,
  getStatusManualActionQueue,
  mergeSiteStatusPayload,
  parseEvidenceFreshness,
} from '../src/data/siteStatusView.ts'
import { catalogProjects, projects } from '../src/data/portfolio.ts'
import { heroContent } from '../src/data/hero.ts'
import { blogColumnMeta, blogColumnOrder, getBlogEmptyState } from '../src/data/blog.ts'
import { publicAssistantSuggestions } from '../src/data/assistant.ts'

const base = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'
const siteUrl = 'https://biau.playlab.eu.cc'

async function measureLocatorFrameDelta(page, locator, intervalMs = 500) {
  const readPixels = async () =>
    sharp(await locator.screenshot())
      .resize({ width: 240 })
      .removeAlpha()
      .raw()
      .toBuffer()
  const first = await readPixels()
  await page.waitForTimeout(intervalMs)
  const second = await readPixels()
  let totalDelta = 0
  for (let index = 0; index < first.length; index += 1) {
    totalDelta += Math.abs(first[index] - second[index])
  }
  return totalDelta / first.length
}

async function waitForFlowMotion(page, expected, timeout = 8_000) {
  await page.waitForFunction(
    (value) => document.querySelector('.flow-background')?.getAttribute('data-flow-motion') === value,
    expected,
    { timeout },
  )
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
}

const routes = [
  { path: '/', title: 'BIAU PORT', nav: '所有项目', canonical: '/' },
  { path: '/projects', title: '项目集', nav: '回主页', canonical: '/projects' },
  { path: '/blog', title: '知识库', nav: '回主页', canonical: '/blog' },
  { path: '/ai-daily', title: 'AI 日报', nav: '回主页', canonical: '/ai-daily', aiDailyPublicFixture: true },
  {
    path: '/ai-daily/flash-public-1',
    title: '公开 Flash 标题',
    nav: '回主页',
    canonical: '/ai-daily/flash-public-1',
    seoTitle: '公开 Flash 标题 | BIAU Port AI 日报',
    seoDescription: '这是 UI 检查使用的证据绑定事实摘要。',
    aiDailyPublicFixture: true,
  },
  { path: '/status', title: '项目可靠性观察', nav: '回主页', canonical: '/status' },
  { path: '/status/legal-rag', title: 'Legal RAG', nav: '回主页', canonical: '/status/legal-rag' },
  { path: '/studio', title: '内容工作台', nav: '回主页', canonical: '/studio' },
  {
    path: '/studio?ui-check=review-queue',
    title: '内容工作台',
    nav: '回主页',
    canonical: '/studio',
    localStorageValues: { 'biau-studio-admin-token': 'ui-check-token' },
    studioReviewFixture: true,
  },
  {
    path: '/studio?draft=ui_check_draft_01',
    title: '内容工作台',
    nav: '回主页',
    canonical: '/studio',
    expectedText: '请先保存 Studio token，保存后会自动定位助手创建的草稿。',
    clearLocalStorageKeys: ['biau-studio-admin-token'],
  },
  {
    path: '/studio/ai-daily/ui-check-issue',
    title: 'AI 日报详情',
    nav: '回主页',
    canonical: '/studio/ai-daily/ui-check-issue',
    expectedText: '请先保存 Studio token，保存后可以刷新这期 AI 日报 issue。',
    clearLocalStorageKeys: ['biau-studio-admin-token'],
  },
  {
    path: '/studio/ai-daily?ui-check=ai-daily-workspace',
    title: 'AI Daily 工作区',
    nav: '回主页',
    canonical: '/studio/ai-daily',
    localStorageValues: { 'biau-studio-admin-token': 'ui-check-token' },
    aiDailyWorkspaceFixture: true,
  },
  { path: '/operator', title: '新的站务任务', nav: '回主页', canonical: '/operator' },
  { path: '/operator/settings', title: '泊岸站务', nav: '回主页', canonical: '/operator/settings' },
  { path: '/assistant', title: '页面没有靠岸', nav: '回主页', canonical: '/assistant' },
  { path: '/assistant/admin', title: '页面没有靠岸', nav: '回主页', canonical: '/assistant/admin' },
  { path: '/projects/legal-rag', title: 'Legal RAG', nav: '回主页', canonical: '/projects/legal-rag' },
  {
    path: '/blog/legal-rag-review',
    title: '合同审查 RAG 项目复盘',
    nav: '回主页',
    canonical: '/blog/legal-rag-review',
  },
  { path: '/missing-route-for-ui-check', title: '页面没有靠岸', nav: '回主页', canonical: '/missing-route-for-ui-check' },
]

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 900 },
]

const operatorModelChannelFixture = {
  id: 'operator-primary',
  label: 'Operator primary',
  provider: 'deterministic-mock',
  model: 'operator-mock-model',
  configured: true,
  isDefault: true,
  isActive: true,
}

const operatorProfileFixture = {
  id: 'site-owner',
  name: 'UI Check Owner',
  role: 'OWNER',
  modelChannelId: operatorModelChannelFixture.id,
  modelChannel: operatorModelChannelFixture,
}

async function installOperatorApiFixture(page) {
  await page.route('**/api/operator/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api\/operator/u, '')
    let body

    if (path === '/me') body = { operator: operatorProfileFixture }
    else if (path === '/sessions') body = { sessions: [] }
    else if (path === '/summary') {
      body = {
        sessions: 0,
        messages: 0,
        memories: 0,
        usage: 0,
        internalKnowledgeDocuments: 0,
        lastInternalKnowledgeSync: null,
        operator: operatorProfileFixture,
        modelChannels: [operatorModelChannelFixture],
      }
    } else if (path === '/knowledge-documents') body = { documents: [], lastSyncRun: null }
    else if (path === '/rag/status') body = { configured: true, syncConfigured: true, health: null, diagnostic: null }
    else if (path === '/memories') body = { memories: [] }
    else if (path === '/usage') body = { usage: [] }
    else if (path === '/model-channels') {
      body = { modelChannels: [operatorModelChannelFixture], selectedModelChannel: operatorModelChannelFixture }
    } else if (path === '/chat' && request.method() === 'POST') {
      body = {
        answer: '已完成确定性站务规划；没有执行发布、部署或云平台写入。',
        citations: [],
        sessionId: 'operator-ui-session',
        messageId: 'operator-ui-message',
        meta: null,
      }
    } else {
      body = { error: 'operator-ui-fixture-not-found' }
    }

    await route.fulfill({
      status: body.error ? 404 : 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

async function installOperatorSessionRaceFixture(page) {
  const sessions = [
    { id: 'operator-session-a', title: '延迟会话 A', preview: '较慢响应', updatedAt: '2026-07-17T00:00:00.000Z' },
    { id: 'operator-session-b', title: '快速会话 B', preview: '最新选择', updatedAt: '2026-07-17T00:01:00.000Z' },
  ]
  await page.route('**/api/operator/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api\/operator/u, '')
    let body

    if (path === '/me') body = { operator: operatorProfileFixture }
    else if (path === '/sessions') body = { sessions }
    else if (path === '/sessions/operator-session-a/messages') {
      await new Promise((resolve) => setTimeout(resolve, 350))
      body = {
        messages: [
          { id: 'message-a', role: 'assistant', content: '延迟会话 A 的旧消息', timestamp: '2026-07-17T00:00:00.000Z' },
        ],
      }
    } else if (path === '/sessions/operator-session-b/messages') {
      await new Promise((resolve) => setTimeout(resolve, 20))
      body = {
        messages: [
          { id: 'message-b', role: 'assistant', content: '快速会话 B 的当前消息', timestamp: '2026-07-17T00:01:00.000Z' },
        ],
      }
    } else body = { error: 'operator-race-fixture-not-found' }

    await route.fulfill({
      status: body.error ? 404 : 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

async function installAiDailyPublicFixture(page) {
  const item = createAiDailyPublicFixtureItem()
  const { feed, detail } = createAiDailyPublicPayloads(item)
  await page.route('**/public/ai-daily/feed*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: '"ui-check-feed"' }, body: JSON.stringify(feed) }),
  )
  await page.route('**/public/ai-daily/events/flash-public-1*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: '"ui-check-detail"' }, body: JSON.stringify(detail) }),
  )
}

function createAiDailyPublicFixtureItem(overrides = {}) {
  return {
    publicId: 'flash-public-1',
    revision: 2,
    title: '公开 Flash 标题',
    factSummary: '这是 UI 检查使用的证据绑定事实摘要。',
    whyItMatters: '这条快讯用于确认公开阅读层的布局与来源边界。',
    uncertainty: '后续信息仍需继续观察。',
    approvedAt: '2026-07-19T10:00:00.000Z',
    updatedAt: '2026-07-19T10:00:00.000Z',
    corrected: true,
    correctedAt: '2026-07-19T11:00:00.000Z',
    citations: [
      {
        title: '公开来源标题',
        publisher: 'Example AI Lab',
        url: 'https://example.com/ai-daily/ui-check',
        publishedAt: '2026-07-19T09:00:00.000Z',
        excerpt: '公开来源摘要，用来检查引用卡片的换行和外链安全属性。',
      },
    ],
    ...overrides,
  }
}

function createAiDailyPublicPayloads(item, freshnessOverrides = {}) {
  const freshness = {
    status: 'fresh',
    stale: false,
    staleAfterMinutes: 180,
    latestApprovalAt: item.approvedAt,
    latestProjectionAt: item.updatedAt,
    ...freshnessOverrides,
  }
  const feed = {
    items: [item],
    nextCursor: null,
    meta: {
      generatedAt: item.updatedAt,
      windowHours: 72,
      freshness,
      editorialCoverage: { scope: 'page', itemCount: 1, citedItemCount: 1, citationCoverage: 1 },
    },
  }
  const detail = { item, meta: { generatedAt: item.updatedAt, windowHours: 72, freshness } }
  return { feed, detail }
}

async function installAiDailyPublicRefreshFixture(page) {
  const { feed } = createAiDailyPublicPayloads(createAiDailyPublicFixtureItem())
  let requestCount = 0
  await page.route('**/public/ai-daily/feed*', async (route) => {
    requestCount += 1
    if (requestCount === 1) {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: '"refresh-v1"' }, body: JSON.stringify(feed) })
      return
    }
    if (requestCount === 2) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'fixture-transient-failure' }) })
      return
    }
    await route.fulfill({ status: 304, headers: { ETag: '"refresh-v1"' } })
  })
}

async function installAiDailyPublicStaleFixture(page) {
  const { feed } = createAiDailyPublicPayloads(createAiDailyPublicFixtureItem(), { status: 'stale', stale: true })
  await page.route('**/public/ai-daily/feed*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: { ETag: '"stale-v1"' }, body: JSON.stringify(feed) }),
  )
}

async function installAiDailyPublicInvalidCitationFixture(page) {
  const item = createAiDailyPublicFixtureItem({
    publicId: 'invalid-citation',
    title: '不安全引用快讯',
    citations: [
      {
        title: '不安全来源',
        publisher: 'Unsafe fixture',
        url: 'javascript:document.body.dataset.compromised="true"',
        publishedAt: '2026-07-19T09:00:00.000Z',
        excerpt: '这个引用必须在 API 解码边界被拒绝。',
      },
    ],
  })
  const { detail } = createAiDailyPublicPayloads(item)
  await page.route('**/public/ai-daily/events/invalid-citation*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) }),
  )
}

async function installAiDailyPublicRaceFixture(page) {
  await page.route('**/public/ai-daily/events/*', async (route) => {
    const publicId = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    const slow = publicId === 'slow-event'
    const item = createAiDailyPublicFixtureItem({
      publicId,
      title: slow ? '延迟旧快讯' : '快速当前快讯',
      factSummary: slow ? '这条旧响应不应覆盖新路由。' : '这条快速响应属于当前路由。',
    })
    const { detail } = createAiDailyPublicPayloads(item)
    if (slow) await new Promise((resolve) => setTimeout(resolve, 450))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) }).catch(() => {})
  })
}

async function installAiDailyPublicDelayedFeedFixture(page) {
  const { feed } = createAiDailyPublicPayloads(createAiDailyPublicFixtureItem())
  await page.route('**/public/ai-daily/feed*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(feed) }).catch(() => {})
  })
}
const projectDetailVisualCases = projects
  .map((project) => {
    const sections = Object.values(project.detailContent ?? {}).flatMap((items) => items ?? [])
    const visuals = sections.flatMap((section) => (section.visual ? [section.visual] : []))
    const imageBackedVisuals = visuals.filter((visual) => visual.image)
    return {
      id: project.id,
      title: project.title,
      expectedVisuals: visuals.length,
      expectedVisualImages: imageBackedVisuals.length,
      expectedVisualAltTexts: imageBackedVisuals
        .map((visual) => visual.alt ?? visual.title)
        .filter((text) => text.trim().length > 0),
      expectedVisualCaptions: imageBackedVisuals
        .map((visual) => visual.caption ?? '')
        .filter((text) => text.trim().length > 0),
      expectedVisualSourceLinks: visuals.filter((visual) => Boolean(visual.sourceUrl)).length,
    }
  })
  .filter((project) => project.expectedVisuals > 0)

async function gotoApp(page, path, options = {}) {
  const url = `${base}${path}`
  const waitUntil = options.waitUntil ?? 'domcontentloaded'
  const timeout = options.timeout ?? 45_000
  let lastError = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil, timeout })
      lastError = null
      break
    } catch (error) {
      lastError = error
      if (attempt === 0) await page.waitForTimeout(500)
    }
  }

  if (lastError) throw lastError
  await page.locator('#root').waitFor({ state: 'attached', timeout: 10000 })
  await page.locator('.route-loading').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})
  if (path.startsWith('/blog/')) {
    await page
      .waitForFunction(
        () => {
          const title = document.querySelector('h1, .hero-title-main')?.textContent?.trim() ?? ''
          return title.length > 0 && title !== '文章载入中'
        },
        null,
        { timeout: 15_000 },
      )
      .catch(() => {})
  }
}

async function waitForImageReady(imageLocator, timeout = 15_000) {
  await imageLocator.scrollIntoViewIfNeeded()
  await imageLocator.waitFor({ state: 'visible', timeout }).catch(() => {})
  return imageLocator.evaluate(
    (image, waitMs) =>
      new Promise((resolve) => {
        const img = image instanceof HTMLImageElement ? image : null
        if (!img) {
          resolve(false)
          return
        }
        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          resolve(true)
          return
        }

        const timer = window.setTimeout(() => resolve(false), waitMs)
        const done = () => {
          window.clearTimeout(timer)
          resolve(img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)
        }
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
      }),
    timeout,
  )
}

function isIgnorableConsoleResourceError(message) {
  if (message.includes('GL Driver Message') && message.includes('GPU stall due to ReadPixels')) return true
  return [
    'Failed to load resource: net::ERR_TIMED_OUT',
    'Failed to load resource: net::ERR_CONNECTION_TIMED_OUT',
  ].includes(message)
}

async function collectStudioOverflow(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    return [...document.querySelectorAll('.studio-page, .studio-page *')]
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const parentRect = element.parentElement?.getBoundingClientRect()
        const className = typeof element.className === 'string' ? element.className : ''
        const tagName = element.tagName.toLowerCase()
        const text = (element.textContent ?? '').replace(/\s+/gu, ' ').trim().slice(0, 96)
        const hidden =
          rect.width <= 0 ||
          rect.height <= 0 ||
          window.getComputedStyle(element).visibility === 'hidden' ||
          window.getComputedStyle(element).display === 'none'
        const ignoreSelfOverflow =
          ['input', 'textarea', 'select'].includes(tagName) ||
          className.includes('detail-header')
        const selfOverflow = !ignoreSelfOverflow && element.scrollWidth > element.clientWidth + 2
        const viewportOverflow = rect.left < -2 || rect.right > viewportWidth + 2
        const parentOverflow = parentRect ? rect.left < parentRect.left - 2 || rect.right > parentRect.right + 2 : false

        return {
          tagName,
          className,
          text,
          hidden,
          selfOverflow,
          viewportOverflow,
          parentOverflow,
          width: Math.round(rect.width),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }
      })
      .filter(
        (item) =>
          !item.hidden &&
          (item.selfOverflow || item.viewportOverflow || item.parentOverflow) &&
          item.width > 0,
      )
      .slice(0, 8)
  })
}

async function collectStudioVisualIssues(page, viewportName, routePath) {
  return page.evaluate(({ name, path }) => {
    const issues = []
    const isMainStudioRoute = path === '/studio' || path.startsWith('/studio?')
    if (isMainStudioRoute && !document.querySelector('.studio-review-guide')) {
      issues.push('studio review guide missing')
    }

    const title = document.querySelector('.studio-page > .page-hero .section-title')
    if (title) {
      const fontSize = Number.parseFloat(window.getComputedStyle(title).fontSize)
      if (fontSize > 44) {
        issues.push(`studio hero title too large: ${Math.round(fontSize)}px`)
      }
    }

    const grid = document.querySelector('.studio-grid')
    if (grid) {
      const columns = window
        .getComputedStyle(grid)
        .gridTemplateColumns.split(' ')
        .filter((value) => value && value !== 'none')
      if (name === 'desktop' && columns.length > 2) {
        issues.push(`studio grid is too dense: ${columns.length} columns`)
      }
    }

    const tokenActions = [...document.querySelectorAll('.studio-token-form .assistant-admin-actions button')]
    if (name === 'desktop' && tokenActions.length > 2) {
      const rows = new Set(tokenActions.map((button) => Math.round(button.getBoundingClientRect().top)))
      if (rows.size > 1) {
        issues.push(`studio token actions wrapped into ${rows.size} rows`)
      }
    }

    return issues
  }, { name: viewportName, path: routePath })
}

async function checkStudioWorkspaceModes(browser, failures) {
  const mobileWidths = [320, 390, 430]

  for (const width of mobileWidths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.addInitScript(() => {
      window.localStorage.setItem('biau-studio-admin-token', 'ui-check-token')
    })
    await gotoApp(page, '/studio?ui-check=review-queue')

    const tabs = page.getByRole('tablist', { name: 'Studio 手机工作模式' })
    const draftsTab = page.getByRole('tab', { name: /^草稿箱/ })
    const editorTab = page.getByRole('tab', { name: /^编辑/ })
    const supportTab = page.getByRole('tab', { name: /^辅助/ })
    const draftsPanel = page.locator('#studio-mobile-panel-drafts')
    const editorPanel = page.locator('#studio-mobile-panel-editor')
    const supportPanel = page.locator('#studio-mobile-panel-support')

    if (!(await tabs.isVisible().catch(() => false))) {
      failures.push(`mobile-${width} /studio: expected visible workspace mode tabs`)
      await page.close()
      continue
    }

    for (const tab of [draftsTab, editorTab, supportTab]) {
      const box = await tab.boundingBox()
      if (!box || box.height < 44) {
        failures.push(`mobile-${width} /studio: workspace mode target must be at least 44px high`)
      }
    }

    if (
      !(await editorPanel.isVisible()) ||
      (await draftsPanel.isVisible()) ||
      (await supportPanel.isVisible()) ||
      (await editorTab.getAttribute('aria-selected')) !== 'true'
    ) {
      failures.push(`mobile-${width} /studio: Edit should be the only default workspace mode`)
    }

    const workspaceModes = [
      { id: 'drafts', tab: draftsTab, panel: draftsPanel },
      { id: 'editor', tab: editorTab, panel: editorPanel },
      { id: 'support', tab: supportTab, panel: supportPanel },
    ]

    for (const mode of workspaceModes) {
      const tabId = `studio-mobile-tab-${mode.id}`
      const panelId = `studio-mobile-panel-${mode.id}`
      if (
        (await mode.tab.getAttribute('id')) !== tabId ||
        (await mode.tab.getAttribute('aria-controls')) !== panelId ||
        (await mode.panel.getAttribute('aria-labelledby')) !== tabId
      ) {
        failures.push(`mobile-${width} /studio: ${mode.id} tab/panel association is incomplete`)
      }
    }

    const verifyKeyboardMode = async (expectedId, action) => {
      const expectedTabId = `studio-mobile-tab-${expectedId}`
      await page
        .waitForFunction(
          (tabId) =>
            document.activeElement?.id === tabId &&
            document.getElementById(tabId)?.getAttribute('aria-selected') === 'true',
          expectedTabId,
          { timeout: 2_000 },
        )
        .catch(() => {})

      const states = await Promise.all(
        workspaceModes.map(async (mode) => ({
          id: mode.id,
          selected: await mode.tab.getAttribute('aria-selected'),
          tabIndex: await mode.tab.getAttribute('tabindex'),
          visible: await mode.panel.isVisible(),
        })),
      )
      const focusedId = await page.evaluate(() => document.activeElement?.id ?? '')
      const valid = states.every((state) =>
        state.id === expectedId
          ? state.selected === 'true' && state.tabIndex === '0' && state.visible
          : state.selected === 'false' && state.tabIndex === '-1' && !state.visible,
      )
      if (!valid || focusedId !== expectedTabId) {
        failures.push(
          `mobile-${width} /studio: ${action} did not activate and focus ${expectedId} (${JSON.stringify({ focusedId, states })})`,
        )
      }
    }

    await editorTab.focus()
    await editorTab.press('ArrowRight')
    await verifyKeyboardMode('support', 'ArrowRight')
    await supportTab.press('ArrowDown')
    await verifyKeyboardMode('drafts', 'ArrowDown wrap')
    await draftsTab.press('ArrowLeft')
    await verifyKeyboardMode('support', 'ArrowLeft wrap')
    await supportTab.press('ArrowUp')
    await verifyKeyboardMode('editor', 'ArrowUp')
    await editorTab.press('Home')
    await verifyKeyboardMode('drafts', 'Home')
    await draftsTab.press('End')
    await verifyKeyboardMode('support', 'End')
    await supportTab.press('ArrowLeft')
    await verifyKeyboardMode('editor', 'ArrowLeft')

    const titleInput = editorPanel.locator('label').filter({ hasText: '标题' }).locator('input').first()
    const titleValue = `移动模式状态保留 ${width}`
    await titleInput.fill(titleValue)
    await draftsTab.click()
    if (!(await draftsPanel.isVisible()) || (await editorPanel.isVisible()) || (await supportPanel.isVisible())) {
      failures.push(`mobile-${width} /studio: Drafts mode did not isolate the draft list`)
    }
    await supportTab.click()
    if (!(await supportPanel.isVisible()) || (await draftsPanel.isVisible()) || (await editorPanel.isVisible())) {
      failures.push(`mobile-${width} /studio: Support mode did not isolate auxiliary tools`)
    }
    await editorTab.click()
    if ((await titleInput.inputValue()) !== titleValue) {
      failures.push(`mobile-${width} /studio: switching modes lost editor form state`)
    }

    await draftsTab.click()
    await draftsPanel.getByRole('button', { name: '新建' }).click()
    if ((await editorTab.getAttribute('aria-selected')) !== 'true' || !(await editorPanel.isVisible())) {
      failures.push(`mobile-${width} /studio: creating a draft should return to Edit mode`)
    }

    await draftsTab.click()
    await draftsPanel.getByRole('button', { name: /UI Check 待审核草稿/ }).click()
    await editorPanel.waitFor({ state: 'visible' })
    if ((await editorTab.getAttribute('aria-selected')) !== 'true' || !(await editorPanel.isVisible())) {
      failures.push(`mobile-${width} /studio: selecting a draft should return to Edit mode`)
    }

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, 0)
    })
    await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 5000 })
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        }),
    )
    const layoutOrder = await page.evaluate(() => {
      const token = document.querySelector('.studio-control-bar')?.getBoundingClientRect().top ?? 0
      const tabsTop = document.querySelector('.studio-workspace-tabs')?.getBoundingClientRect().top ?? 0
      const grid = document.querySelector('.studio-grid')?.getBoundingClientRect().top ?? 0
      const review = document.querySelector('.studio-review-guide')?.getBoundingClientRect().top ?? 0
      return { token, tabsTop, grid, review }
    })
    if (!(layoutOrder.token < layoutOrder.tabsTop && layoutOrder.tabsTop < layoutOrder.grid && layoutOrder.grid < layoutOrder.review)) {
      failures.push(
        `mobile-${width} /studio: expected token, modes, workspace, then review guidance order (${JSON.stringify(layoutOrder)})`,
      )
    }

    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    if (overflowX) failures.push(`mobile-${width} /studio: workspace modes caused horizontal overflow`)
    await page.close()
  }

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await desktop.addInitScript(() => {
    window.localStorage.setItem('biau-studio-admin-token', 'ui-check-token')
  })
  await gotoApp(desktop, '/studio?ui-check=review-queue')
  const desktopTabsVisible = await desktop
    .getByRole('tablist', { name: 'Studio 手机工作模式' })
    .isVisible()
    .catch(() => false)
  const desktopPanelsVisible = await Promise.all(
    ['drafts', 'editor', 'support'].map((panel) => desktop.locator(`#studio-mobile-panel-${panel}`).isVisible()),
  )
  if (desktopTabsVisible || desktopPanelsVisible.some((visible) => !visible)) {
    failures.push('desktop /studio: mode tabs should stay hidden while all workspace areas remain visible')
  }
  await desktop.close()
}
async function checkOperatorSettingsSections(browser, failures) {
  const sections = ['总览', '知识', 'RAG', '记忆', '用量']

  for (const width of [320, 390, 430, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 1000 : 900 } })
    await installOperatorApiFixture(page)
    await gotoApp(page, '/operator/settings')
    const sectionNav = page.getByRole('navigation', { name: '站务设置分区' })

    if (!(await sectionNav.isVisible().catch(() => false))) {
      failures.push(`/operator/settings ${width}px: expected visible settings navigation`)
      await page.close()
      continue
    }

    for (const label of sections) {
      const button = sectionNav.getByRole('button', { name: label, exact: true })
      const bounds = await button.boundingBox()
      if (!bounds || bounds.height < 42) {
        failures.push(`/operator/settings ${width}px: ${label} should keep a stable touch target`)
        continue
      }
      await button.click()
      if ((await page.locator('.operator-settings-section:visible').count()) !== 1) {
        failures.push(`/operator/settings ${width}px: ${label} should render exactly one active section`)
      }
    }

    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      tokenInputs: document.querySelectorAll('input[name*="token" i], input[id*="token" i]').length,
    }))
    if (metrics.overflow) failures.push(`/operator/settings ${width}px: horizontal overflow detected`)
    if (metrics.tokenInputs !== 0) failures.push(`/operator/settings ${width}px: browser UI must not expose reusable service-token inputs`)
    await page.close()
  }
}

async function checkMobileDetailSurfaceCoordination(browser, failures) {
  const mobileWidths = [320, 390, 430]

  for (const width of mobileWidths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.route('**/health', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'fallback', modelConfigured: false }),
      }),
    )
    await gotoApp(page, '/projects/legal-rag')
    await page
      .waitForFunction(() => {
        const assistant = document.querySelector('.public-assistant')
        const assistantRect = document.querySelector('.public-assistant__trigger')?.getBoundingClientRect()
        const guideRect = document.querySelector('.detail-reading-guide__toggle')?.getBoundingClientRect()
        if (!assistant || !assistantRect || !guideRect) return false
        const overlapWidth = Math.max(0, Math.min(assistantRect.right, guideRect.right) - Math.max(assistantRect.left, guideRect.left))
        const overlapHeight = Math.max(0, Math.min(assistantRect.bottom, guideRect.bottom) - Math.max(assistantRect.top, guideRect.top))
        return overlapWidth * overlapHeight === 0 && guideRect.top - assistantRect.bottom >= 7
      }, null, { timeout: 2_000 })
      .catch(() => {})

    const assistant = page.locator('.public-assistant')
    const assistantTrigger = page.locator('.public-assistant__trigger')
    const guideToggle = page.locator('.detail-reading-guide__toggle')
    const initialMetrics = await page.evaluate(() => {
      const assistantRect = document.querySelector('.public-assistant__trigger')?.getBoundingClientRect()
      const guideRect = document.querySelector('.detail-reading-guide__toggle')?.getBoundingClientRect()
      if (!assistantRect || !guideRect) return null
      const overlapWidth = Math.max(0, Math.min(assistantRect.right, guideRect.right) - Math.max(assistantRect.left, guideRect.left))
      const overlapHeight = Math.max(0, Math.min(assistantRect.bottom, guideRect.bottom) - Math.max(assistantRect.top, guideRect.top))
      return {
        overlapArea: overlapWidth * overlapHeight,
        gap: guideRect.top - assistantRect.bottom,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }
    })
    const initialOffset = Number(await assistant.getAttribute('data-collision-offset'))
    if (!initialMetrics || initialMetrics.overlapArea > 0 || initialMetrics.gap < 7 || initialMetrics.overflow || initialOffset < 0) {
      failures.push(`mobile-${width} project detail: floating controls must resolve collision with an 8px gap`)
    }

    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, 1200)
    })
    await page.waitForTimeout(350)
    if (Number(await assistant.getAttribute('data-collision-offset')) !== 0) {
      failures.push(`mobile-${width} project detail: stale assistant offset should clear after the guide sticks to the top`)
    }

    await guideToggle.click()
    await page.waitForTimeout(100)
    await assistantTrigger.click()
    await page.waitForTimeout(100)
    if ((await guideToggle.getAttribute('aria-expanded')) !== 'false' || (await assistantTrigger.getAttribute('aria-expanded')) !== 'true') {
      failures.push(`mobile-${width} project detail: opening assistant should close reading outline`)
    }

    await assistantTrigger.click()
    await assistantTrigger.click()
    await page.waitForTimeout(250)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('biau:mobile-surface-open', { detail: { surface: 'detail-reading-guide' } }))
    })
    await page.waitForFunction(
      () => document.querySelector('.public-assistant__trigger')?.getAttribute('aria-expanded') === 'false',
    )
    await guideToggle.click()
    await page.waitForTimeout(250)
    if ((await assistantTrigger.getAttribute('aria-expanded')) !== 'false' || (await guideToggle.getAttribute('aria-expanded')) !== 'true') {
      failures.push(`mobile-${width} project detail: reading-guide intent should close assistant before the outline opens`)
    }
    await page.close()
  }

  const blog = await browser.newPage({ viewport: { width: 390, height: 900 } })
  await gotoApp(blog, '/blog/legal-rag-review')
  await blog.waitForTimeout(400)
  if (Number(await blog.locator('.public-assistant').getAttribute('data-collision-offset')) !== 0) {
    failures.push('mobile blog detail: non-colliding controls should keep the normal assistant position')
  }
  await blog.close()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await desktop.route('**/health', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'fallback', modelConfigured: false }),
    }),
  )
  await gotoApp(desktop, '/projects/legal-rag')
  const desktopGuide = desktop.locator('.detail-reading-guide__toggle')
  const desktopAssistant = desktop.locator('.public-assistant__trigger')
  await desktopGuide.click()
  await desktopAssistant.click()
  await desktop.waitForTimeout(100)
  if (
    Number(await desktop.locator('.public-assistant').getAttribute('data-collision-offset')) !== 0 ||
    (await desktopAssistant.getAttribute('aria-expanded')) !== 'true'
  ) {
    failures.push('desktop project detail: mobile collision rules must not affect the assistant')
  }
  await desktop.close()
}
async function checkMobilePrimaryNavigation(browser, failures) {
  const expectedTabs = [
    { href: '/', label: '首页' },
    { href: '/projects', label: '项目' },
    { href: '/blog', label: '知识' },
    { href: '/status', label: '状态' },
  ]
  const routeCases = [
    { path: '/', activeHref: '/' },
    { path: '/projects/biau-playlab', activeHref: '/projects' },
    { path: '/blog/legal-rag-review', activeHref: '/blog' },
    { path: '/status/legal-rag', activeHref: '/status' },
  ]

  for (const width of [320, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.route('**/health', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'fallback', modelConfigured: false }),
      }),
    )
    await page.addInitScript(() => {
      window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    })

    for (const routeCase of routeCases) {
      await gotoApp(page, routeCase.path)
      const tabbar = page.locator('.mobile-tabbar')
      const tabs = tabbar.locator('.mobile-tab')
      const tabbarBox = await tabbar.boundingBox()
      const tabData = await tabs.evaluateAll((items) =>
        items.map((item) => {
          const rect = item.getBoundingClientRect()
          return {
            href: item.getAttribute('href'),
            label: item.textContent?.trim() ?? '',
            active: item.classList.contains('is-active'),
            width: rect.width,
            height: rect.height,
          }
        }),
      )
      const activeTabs = tabData.filter((tab) => tab.active)

      if (!tabbarBox || tabbarBox.left < -1 || tabbarBox.right > width + 1 || Math.abs(tabbarBox.bottom - 900) > 1) {
        failures.push(`${routeCase.path} mobile ${width}px: bottom navigation should stay fixed and bounded`)
      }
      if (
        tabData.length !== expectedTabs.length ||
        JSON.stringify(tabData.map(({ href, label }) => ({ href, label }))) !== JSON.stringify(expectedTabs)
      ) {
        failures.push(`${routeCase.path} mobile ${width}px: expected the five ordered primary route tabs`)
      }
      if (tabData.some((tab) => tab.width < 44 || tab.height < 44)) {
        failures.push(`${routeCase.path} mobile ${width}px: every bottom navigation target must be at least 44px`)
      }
      if (activeTabs.length !== 1 || activeTabs[0].href !== routeCase.activeHref) {
        failures.push(`${routeCase.path} mobile ${width}px: expected active parent tab ${routeCase.activeHref}`)
      }
      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )
      if (horizontalOverflow) {
        failures.push(`${routeCase.path} mobile ${width}px: bottom navigation must not introduce horizontal overflow`)
      }

      if (routeCase.path === '/') {
        await page.locator('.public-assistant__trigger').waitFor({ state: 'visible' })
        const floatingGap = await page.evaluate(() => {
          const bar = document.querySelector('.mobile-tabbar')?.getBoundingClientRect()
          const trigger = document.querySelector('.public-assistant__trigger')?.getBoundingClientRect()
          if (!bar || !trigger) return null
          return bar.top - trigger.bottom
        })
        if (floatingGap === null || floatingGap < 8) {
          failures.push(`/ home mobile ${width}px: assistant trigger should clear the bottom navigation by at least 8px`)
        }
        if (await page.getByRole('button', { name: /导航菜单/ }).isVisible().catch(() => false)) {
          failures.push(`/ home mobile ${width}px: persistent tabs should replace the hamburger menu`)
        }
        const languageBox = await page.locator('.nav-lang-toggle').boundingBox()
        if (!languageBox || languageBox.width < 43.5 || languageBox.height < 43.5) {
          failures.push(`/ home mobile ${width}px: language control should remain visible and touch-sized`)
        }

        await page.evaluate(() => {
          document.documentElement.style.scrollBehavior = 'auto'
          window.scrollTo(0, document.documentElement.scrollHeight)
        })
        await page.waitForFunction(() =>
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1,
        )
        const footerClearance = await page.evaluate(() => {
          const bar = document.querySelector('.mobile-tabbar')?.getBoundingClientRect()
          const copyright = document.querySelector('.site-footer__copyright')?.getBoundingClientRect()
          if (!bar || !copyright) return null
          return bar.top - copyright.bottom
        })
        if (footerClearance === null || footerClearance < 16) {
          failures.push(`/ home mobile ${width}px: footer content should remain readable above the bottom navigation`)
        }
      }
    }
    await page.close()
  }

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await gotoApp(desktop, '/')
  if (await desktop.locator('.mobile-tabbar').isVisible().catch(() => false)) {
    failures.push('/ home desktop: mobile bottom navigation must remain hidden')
  }
  await desktop.close()
}
async function checkMobileProjectCatalog(browser, failures) {
  const expectedGroups = [
    { key: 'ai', title: 'AI 应用', projects: catalogProjects.filter((project) => project.category === 'ai') },
    {
      key: 'fullstack',
      title: '全栈开发',
      projects: catalogProjects.filter((project) => ['business', 'platform', 'mobile'].includes(project.category)),
    },
  ]
  const standaloneGames = projects.filter((project) => project.category === 'interactive')

  for (const width of [320, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.addInitScript(() => {
      window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    })
    await gotoApp(page, '/projects')
    await page.waitForFunction(() => document.querySelectorAll('.project-group-toggle').length === 2)

    const toggles = page.locator('.project-group-toggle')
    if ((await toggles.count()) !== expectedGroups.length) {
      failures.push(`/projects mobile ${width}px: expected two project group controls`)
    }

    const initialState = await page.evaluate(() => ({
      expanded: [...document.querySelectorAll('.project-group-toggle')].map((toggle) => toggle.getAttribute('aria-expanded')),
      visiblePanels: [...document.querySelectorAll('.projects-grid')].filter((panel) => !panel.hasAttribute('hidden')).map((panel) => panel.id),
      height: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }))
    if (
      initialState.expanded.join(',') !== 'true,false' ||
      initialState.visiblePanels.join(',') !== 'project-group-panel-ai'
    ) {
      failures.push(`/projects mobile ${width}px: AI applications should be the only default group`)
    }
    if (initialState.overflow) {
      failures.push(`/projects mobile ${width}px: focused catalog should not overflow horizontally`)
    }
    if (width === 390 && initialState.height >= 3_000) {
      failures.push(`/projects mobile 390px: focused catalog should materially reduce the 4,144px baseline`)
    }

    const reachableTitles = []
    for (const group of expectedGroups) {
      const toggle = page.getByRole('button', { name: new RegExp(group.title) })
      const toggleBox = await toggle.boundingBox()
      if (!toggleBox || toggleBox.height < 44) {
        failures.push(`/projects mobile ${width}px: ${group.title} control must be at least 44px high`)
      }
      await toggle.click()
      const panel = page.locator(`#project-group-panel-${group.key}`)
      await panel.waitFor({ state: 'visible' })
      await page.waitForTimeout(350)

      const visiblePanelIds = await page.locator('.projects-grid:visible').evaluateAll((panels) => panels.map((panel) => panel.id))
      const visibleTitles = await panel.locator('.project-card').evaluateAll((cards) =>
        cards.map((card) => card.getAttribute('data-graph-label') ?? ''),
      )
      if (visiblePanelIds.length !== 1 || visiblePanelIds[0] !== `project-group-panel-${group.key}`) {
        failures.push(`/projects mobile ${width}px: ${group.title} should be the only visible project group`)
      }
      if (JSON.stringify(visibleTitles) !== JSON.stringify(group.projects.map((project) => project.title))) {
        failures.push(`/projects mobile ${width}px: ${group.title} should preserve source project order and count`)
      }
      reachableTitles.push(...visibleTitles)

      const shortActions = await panel.locator('.project-card button, .project-card a').evaluateAll((actions) =>
        actions
          .filter((action) => {
            const style = getComputedStyle(action)
            const rect = action.getBoundingClientRect()
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              Number.parseFloat(style.opacity || '1') > 0 &&
              action.getClientRects().length > 0 &&
              rect.width > 0 &&
              rect.height > 0
            )
          })
          .filter((action) => action.getBoundingClientRect().height + 0.01 < 44)
          .map((action) => (action.textContent ?? '').trim()),
      )
      if (shortActions.length > 0) {
        failures.push(`/projects mobile ${width}px: ${group.title} has project actions below 44px`)
      }
    }

    if (
      reachableTitles.length !== catalogProjects.length ||
      new Set(reachableTitles).size !== catalogProjects.length ||
      catalogProjects.some((project) => !reachableTitles.includes(project.title))
    ) {
      failures.push(`/projects mobile ${width}px: every catalog project should remain reachable exactly once`)
    }
    if (
      reachableTitles.filter((title) => title.includes('BIAU Playlab')).length !== 1 ||
      standaloneGames.some((project) => reachableTitles.includes(project.title))
    ) {
      failures.push(`/projects mobile ${width}px: Playlab should replace standalone game cards in the catalog`)
    }
    await page.close()
  }

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await gotoApp(desktop, '/projects')
  if (
    (await desktop.locator('.project-group-toggle:visible').count()) !== 0 ||
    (await desktop.locator('.projects-grid:visible').count()) !== expectedGroups.length ||
    (await desktop.locator('.project-card:visible').count()) !== catalogProjects.length
  ) {
    failures.push('/projects desktop: both catalog groups and all catalog projects should remain visible')
  }
  const desktopTitles = await desktop.locator('.project-card:visible').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-graph-label') ?? ''),
  )
  if (
    desktopTitles.filter((title) => title.includes('BIAU Playlab')).length !== 1 ||
    standaloneGames.some((project) => desktopTitles.includes(project.title))
  ) {
    failures.push('/projects desktop: standalone game cards should be consolidated into one Playlab card')
  }
  await desktop.close()

  const playlab = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await gotoApp(playlab, '/projects/biau-playlab')
  const expectedDetailHrefs = standaloneGames.map((project) => `/projects/${project.id}`)
  const expectedPlayHrefs = [
    'https://play.playlab.eu.cc/first-tetris/index.html',
    'https://play.playlab.eu.cc/next-spacewar/index.html',
    'https://play.playlab.eu.cc/intespace/index.html',
    'https://play.playlab.eu.cc/raiden/index.html',
    'https://play.playlab.eu.cc/space-war/index.html',
    'https://play.playlab.eu.cc/spacewar-ii/index.html',
  ]
  const playlabHrefs = await playlab.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
  for (const href of [...expectedDetailHrefs, ...expectedPlayHrefs]) {
    if (!playlabHrefs.includes(href)) {
      failures.push(`/projects/biau-playlab: expected consolidated link ${href}`)
    }
  }
  await playlab.close()

  for (const game of standaloneGames) {
    const detail = await browser.newPage({ viewport: { width: 390, height: 900 } })
    await gotoApp(detail, `/projects/${game.id}`)
    const title = await detail.locator('.project-detail-page .detail-title').first().innerText().catch(() => '')
    if (!title.includes(game.title)) {
      failures.push(`/projects/${game.id}: retained game detail route should render its source title`)
    }
    await detail.close()
  }
}
async function checkStatusDetailReadingNavigation(browser, failures) {
  const routePath = '/status/legal-rag'
  const expectedIds = [
    'status-detail-overview',
    'status-detail-distribution',
    'status-detail-checks',
    'status-detail-handling',
    'status-detail-gates',
    'status-detail-next-actions',
  ]
  const expectedProject = staticReliabilityProjects.find((project) => project.id === 'legal-rag')
  const viewports = [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile-320', width: 320, height: 900 },
    { name: 'mobile-390', width: 390, height: 900 },
    { name: 'mobile-430', width: 430, height: 900 },
  ]

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/health', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'fallback', modelConfigured: false }),
      }),
    )
    await page.addInitScript(() => {
      window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    })
    await gotoApp(page, routePath)

    const guide = page.locator('.detail-reading-guide')
    const toggle = guide.locator('.detail-reading-guide__toggle')
    const targetIds = await guide.locator('.detail-reading-guide__outline a').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')?.slice(1) ?? ''),
    )
    if (JSON.stringify(targetIds) !== JSON.stringify(expectedIds)) {
      failures.push(`${routePath} ${viewport.name}: expected six ordered status navigation targets`)
    }

    const contentState = await page.evaluate(() => ({
      checks: document.querySelectorAll('#status-detail-checks .status-check').length,
      gates: document.querySelectorAll('#status-detail-gates .status-project__manual-list > li').length,
      nextActions: document.querySelectorAll('#status-detail-next-actions .status-project__manual-list > li').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }))
    if (
      !expectedProject ||
      contentState.checks !== expectedProject.checks.length ||
      contentState.gates !== expectedProject.gates.length ||
      contentState.nextActions !== expectedProject.nextActions.length
    ) {
      failures.push(`${routePath} ${viewport.name}: reading navigation must preserve checks, gates, and next actions`)
    }
    if (contentState.overflow) {
      failures.push(`${routePath} ${viewport.name}: status detail should not overflow horizontally`)
    }

    for (const id of expectedIds) {
      await toggle.click()
      await page.waitForTimeout(50)
      await guide.locator(`a[href="#${id}"]`).click()
      await page.waitForTimeout(200)
      const landing = await page.evaluate((targetId) => {
        const target = document.getElementById(targetId)
        const guideElement = document.querySelector('.detail-reading-guide')
        if (!target || !guideElement) return null
        const targetRect = target.getBoundingClientRect()
        const guideRect = guideElement.getBoundingClientRect()
        return {
          expanded: guideElement.querySelector('.detail-reading-guide__toggle')?.getAttribute('aria-expanded'),
          targetTop: targetRect.top,
          guideBottom: guideRect.bottom,
          guideSticky: guideRect.top <= 93,
        }
      }, id)
      if (!landing || landing.expanded !== 'false' || landing.targetTop < (landing.guideSticky ? landing.guideBottom - 2 : -1)) {
        failures.push(`${routePath} ${viewport.name}: ${id} should land below the closed sticky guide`)
      }
    }

    await page.evaluate(() => {
      const target = document.getElementById('status-detail-checks')
      if (!target) return
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, window.scrollY + target.getBoundingClientRect().top - 120)
      window.dispatchEvent(new Event('scroll'))
    })
    await page
      .waitForFunction(
        () => document.querySelector('.detail-reading-guide')?.getAttribute('data-active-section') === 'status-detail-checks',
        null,
        { timeout: 2_000 },
      )
      .catch(() => failures.push(`${routePath} ${viewport.name}: passive scrolling should update the active section`))

    if (viewport.width <= 430) {
      const assistantTrigger = page.locator('.public-assistant__trigger')
      await toggle.click()
      await assistantTrigger.click()
      await page.waitForTimeout(100)
      const openState = await page.evaluate(() => {
        const guideToggle = document.querySelector('.detail-reading-guide__toggle')
        const assistantToggle = document.querySelector('.public-assistant__trigger')
        const guideRect = guideToggle?.getBoundingClientRect()
        const assistantRect = assistantToggle?.getBoundingClientRect()
        if (!guideRect || !assistantRect) return null
        const overlapWidth = Math.max(0, Math.min(guideRect.right, assistantRect.right) - Math.max(guideRect.left, assistantRect.left))
        const overlapHeight = Math.max(0, Math.min(guideRect.bottom, assistantRect.bottom) - Math.max(guideRect.top, assistantRect.top))
        return {
          guideExpanded: guideToggle?.getAttribute('aria-expanded'),
          assistantExpanded: assistantToggle?.getAttribute('aria-expanded'),
          overlapArea: overlapWidth * overlapHeight,
        }
      })
      if (!openState || openState.guideExpanded !== 'false' || openState.assistantExpanded !== 'true' || openState.overlapArea > 0) {
        failures.push(`${routePath} ${viewport.name}: assistant should close and avoid the status reading guide`)
      }
    }

    await page.close()
  }

  const statusOverview = await browser.newPage({ viewport: { width: 390, height: 900 } })
  await gotoApp(statusOverview, '/status')
  if (
    !(await statusOverview.locator('.status-section-navigator').isVisible().catch(() => false)) ||
    (await statusOverview.locator('.detail-reading-guide').count()) !== 0
  ) {
    failures.push('/status: main status navigator should remain unchanged')
  }
  await statusOverview.close()

  const missing = await browser.newPage({ viewport: { width: 390, height: 900 } })
  await gotoApp(missing, '/status/missing-reading-guide')
  if ((await missing.locator('.detail-reading-guide').count()) !== 0) {
    failures.push('/status/missing-reading-guide: missing status detail should not render a reading guide')
  }
  await missing.close()
}
const failures = []
const browser = await chromium.launch({ headless: true })

for (const viewport of viewports) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport })
    const logs = []

    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        if (isIgnorableConsoleResourceError(message.text())) return
        logs.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('requestfailed', (request) => {
      logs.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? 'failed'}`)
    })
    page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`))
    if (route.clearLocalStorageKeys?.length || route.localStorageValues) {
      await page.addInitScript(({ keys, values }) => {
        for (const key of keys) {
          window.localStorage.removeItem(key)
        }
        for (const [key, value] of Object.entries(values)) {
          window.localStorage.setItem(key, value)
        }
      }, { keys: route.clearLocalStorageKeys ?? [], values: route.localStorageValues ?? {} })
    }
    if (route.path.startsWith('/operator')) await installOperatorApiFixture(page)
    if (route.aiDailyPublicFixture) await installAiDailyPublicFixture(page)

    await gotoApp(page, route.path)
    if (route.aiDailyPublicFixture) {
      await page.getByText('公开 Flash 标题').first().waitFor({ state: 'visible', timeout: 10_000 })
    }

    const titleText = await page.locator('h1:visible, .hero-title-main:visible').first().innerText().catch(() => '')
    const navCount = await page.locator('.nav-all-tools').count()
    const navText = navCount > 0 ? (await page.locator('.nav-all-tools').innerText()).trim() : 'hidden'
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')

    if (!titleText.includes(route.title)) {
      failures.push(`${viewport.name} ${route.path}: expected title containing "${route.title}", got "${titleText}"`)
    }

    if (viewport.name === 'desktop' && navText !== route.nav) {
      failures.push(`${viewport.name} ${route.path}: expected nav "${route.nav}", got "${navText}"`)
    }

    if (overflowX) {
      failures.push(`${viewport.name} ${route.path}: horizontal overflow detected`)
    }

    if (route.path.startsWith('/studio')) {
      const studioOverflow = await collectStudioOverflow(page)
      if (studioOverflow.length > 0) {
        failures.push(
          `${viewport.name} ${route.path}: studio visible overflow ${JSON.stringify(studioOverflow)}`,
        )
      }
      const studioVisualIssues = await collectStudioVisualIssues(page, viewport.name, route.path)
      for (const issue of studioVisualIssues) {
        failures.push(`${viewport.name} ${route.path}: ${issue}`)
      }
    }

    if (viewport.name === 'desktop' && canonical !== `${siteUrl}${route.canonical}`) {
      failures.push(`${viewport.name} ${route.path}: expected canonical "${siteUrl}${route.canonical}", got "${canonical}"`)
    }

    if (viewport.name === 'desktop' && (!description || description.length < 20)) {
      failures.push(`${viewport.name} ${route.path}: missing useful meta description`)
    }

    if (viewport.name === 'desktop' && (!ogTitle || ogTitle.length < 8)) {
      failures.push(`${viewport.name} ${route.path}: missing useful og:title`)
    }

    if (viewport.name === 'desktop' && route.seoTitle) {
      const documentTitle = await page.title()
      if (documentTitle !== route.seoTitle || ogTitle !== route.seoTitle) {
        failures.push(`${viewport.name} ${route.path}: expected dynamic SEO title "${route.seoTitle}"`)
      }
    }

    if (viewport.name === 'desktop' && route.seoDescription && description !== route.seoDescription) {
      failures.push(`${viewport.name} ${route.path}: expected dynamic SEO description from approved fact summary`)
    }

    if (route.expectedText) {
      const expectedTextVisible = await page.getByText(route.expectedText).first().isVisible().catch(() => false)
      if (!expectedTextVisible) {
        failures.push(`${viewport.name} ${route.path}: expected visible text "${route.expectedText}"`)
      }
    }

    if (route.path === '/operator/settings') {
      const sections = await page.getByRole('navigation', { name: '站务设置分区' }).getByRole('button').count()
      const refreshVisible = await page.getByRole('button', { name: '刷新', exact: true }).isVisible().catch(() => false)
      const statusText = await page.locator('.operator-settings-status').innerText().catch(() => '')
      if (sections !== 5 || !refreshVisible || !statusText.includes('站务配置已同步')) {
        failures.push(`${viewport.name} ${route.path}: expected five owner settings areas and a synchronized status`)
      }
    }

    if (route.path === '/operator') {
      const openingText = await page.locator('.operator-message.is-assistant p').first().innerText().catch(() => '')
      const suggestions = await page.locator('.operator-suggestions button').count()
      const publicAssistantCount = await page.locator('.public-assistant').count()
      const ownerInputEnabled = await page.getByLabel('站务任务', { exact: true }).isEnabled().catch(() => false)
      if (!openingText.includes('站务工作区已就绪') || suggestions !== 4 || publicAssistantCount !== 0 || !ownerInputEnabled) {
        failures.push(`${viewport.name} ${route.path}: expected connected owner workspace, four task starters, and no public widget`)
      }
      if (viewport.name === 'desktop' && !(await page.getByLabel('站务运行检查器').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: expected visible runtime inspector`)
      }
    }

    if (route.path === '/ai-daily') {
      if (!(await page.getByText('公开 Flash 标题').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: expected public Flash fixture card`)
      }
      if (!(await page.getByText('公开投影正常').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: expected freshness status`)
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
        failures.push(`${viewport.name} ${route.path}: public feed caused horizontal overflow`)
      }
    }

    if (route.path === '/ai-daily/flash-public-1') {
      if (!(await page.getByText('公开来源标题').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: expected citation source`)
      }
      if (!(await page.getByText('已修正').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: expected correction marker`)
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
        failures.push(`${viewport.name} ${route.path}: public detail caused horizontal overflow`)
      }
    }

    if (route.path === '/studio') {
      const reviewQueueSummary = await page.getByLabel('Studio 待审核草稿摘要').isVisible().catch(() => false)
      const nextReviewLabel = await page.getByText('下一篇待审核').first().isVisible().catch(() => false)
      const hiddenReviewMetric = await page.getByText('Hidden 待审').isVisible().catch(() => false)
      const nextReviewButton = page.getByRole('button', { name: '打开下一篇待审核' })
      const nextNeedsChangesButton = page.getByRole('button', { name: '打开下一篇待修改' })
      const nextReviewButtonVisible = await nextReviewButton.isVisible().catch(() => false)
      const nextReviewButtonDisabled = await nextReviewButton.isDisabled().catch(() => false)
      const nextNeedsChangesButtonVisible = await nextNeedsChangesButton.isVisible().catch(() => false)
      const nextNeedsChangesButtonDisabled = await nextNeedsChangesButton.isDisabled().catch(() => false)

      if (!reviewQueueSummary) {
        failures.push(`${viewport.name} ${route.path}: expected visible studio review queue summary`)
      }
      if (!nextReviewLabel || !hiddenReviewMetric) {
        failures.push(`${viewport.name} ${route.path}: expected review queue labels for next draft and hidden review-needed count`)
      }
      if (!nextReviewButtonVisible || !nextNeedsChangesButtonVisible) {
        failures.push(`${viewport.name} ${route.path}: expected review and needs-changes draft actions`)
      }
      if (!nextReviewButtonDisabled || !nextNeedsChangesButtonDisabled) {
        failures.push(`${viewport.name} ${route.path}: review actions should be disabled before drafts load`)
      }
    }

    if (route.aiDailyWorkspaceFixture) {
      const fixtureStatus = page.getByText('AI Daily workspace UI check fixture 已加载。').first()
      await fixtureStatus.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
      const tabs = page.getByRole('tab', { name: /Runs|Sources|Candidates \/ Events|Flash Review|Edition/u })
      if ((await tabs.count()) !== 5) {
        failures.push(`${viewport.name} ${route.path}: expected five AI Daily workspace tabs`)
      }
      const tabRelations = await tabs.evaluateAll((elements) =>
        elements.map((element) => ({
          id: element.id,
          controls: element.getAttribute('aria-controls'),
          selected: element.getAttribute('aria-selected'),
        })),
      )
      for (const relation of tabRelations) {
        if (!relation.id || !relation.controls) {
          failures.push(`${viewport.name} ${route.path}: workspace tab is missing id or aria-controls`)
          continue
        }
        const panel = page.locator(`#${relation.controls}`)
        if ((await panel.count()) !== 1 || (await panel.getAttribute('role')) !== 'tabpanel') {
          failures.push(`${viewport.name} ${route.path}: tab ${relation.id} does not control one tabpanel`)
        }
        if ((await panel.getAttribute('aria-labelledby')) !== relation.id) {
          failures.push(`${viewport.name} ${route.path}: tabpanel ${relation.controls} is not labelled by ${relation.id}`)
        }
        if (relation.selected === 'true' && !(await panel.isVisible().catch(() => false))) {
          failures.push(`${viewport.name} ${route.path}: selected tab ${relation.id} has no visible panel`)
        }
      }
      if ((await page.getByRole('option', { name: /AI Daily 工作区 UI Check/u }).count()) !== 1) {
        failures.push(`${viewport.name} ${route.path}: expected fixture Edition title`)
      }
      await page.getByRole('tab', { name: 'Candidates / Events' }).click()
      if (!(await page.getByText('官方模型平台更新').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: expected candidate evidence card`)
      }
      if ((await page.getByRole('button', { name: '纳入' }).count()) < 1 || (await page.getByRole('button', { name: '请求证据' }).count()) < 1) {
        failures.push(`${viewport.name} ${route.path}: candidates tab should expose editorial override actions`)
      }
      if (!(await page.getByText('事件聚类').isVisible().catch(() => false)) || (await page.getByRole('button', { name: '保存排序' }).count()) < 1) {
        failures.push(`${viewport.name} ${route.path}: candidates tab should expose cluster ordering controls`)
      }
      const candidateCard = page.locator('.studio-ai-daily-item').filter({ hasText: '官方模型平台更新' }).first()
      const includeButton = candidateCard.getByRole('button', { name: '纳入' })
      if (await includeButton.isVisible().catch(() => false)) {
        await includeButton.click()
        if (!(await page.getByText(/Fixture 已执行：纳入候选/u).first().isVisible().catch(() => false))) {
          failures.push(`${viewport.name} ${route.path}: fixture candidate include action should publish status`)
        }
      }
      await page.getByRole('tab', { name: 'Sources' }).click()
      if (!(await page.getByText('Official AI Platform RSS').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: sources tab should expose feed health`)
      }
      await page.getByRole('tab', { name: 'Flash Review' }).click()
      if (!(await page.getByText('官方模型平台发布更新').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: flash tab should expose revision preview`)
      }
      if ((await page.getByRole('button', { name: /批准 Revision 1/u }).count()) < 1) {
        failures.push(`${viewport.name} ${route.path}: flash tab should expose approve action`)
      }
      if ((await page.getByRole('button', { name: '暂挂 Flash' }).count()) < 1) {
        failures.push(`${viewport.name} ${route.path}: flash tab should expose lifecycle hold action`)
      }
      if ((await page.getByRole('button', { name: '创建修正' }).count()) < 1) {
        failures.push(`${viewport.name} ${route.path}: flash tab should expose correction action for approved revision`)
      }
      if ((await page.getByText('批准、暂挂、恢复和撤回都会写入审计记录').count()) !== 1) {
        failures.push(`${viewport.name} ${route.path}: flash tab should explain write and immutable-correction behavior`)
      }
      await page.getByRole('tab', { name: 'Edition' }).click()
      if (!(await page.getByText('打开草稿审核').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: edition tab should link to draft review`)
      }
      const editionRevisionCard = page.locator('.studio-ai-daily-revision-card').filter({ hasText: 'Revision 2' }).first()
      if (!(await editionRevisionCard.isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: edition should expose an actionable pending revision`)
      } else {
        if ((await editionRevisionCard.getByRole('button', { name: '编辑修正' }).count()) !== 1) {
          failures.push(`${viewport.name} ${route.path}: pending revision should expose correction action`)
        }
        if ((await editionRevisionCard.getByRole('button', { name: '重新验证' }).count()) !== 1) {
          failures.push(`${viewport.name} ${route.path}: pending revision should expose revalidation action`)
        }
        if (!(await editionRevisionCard.getByText('丢弃理由').isVisible().catch(() => false))) {
          failures.push(`${viewport.name} ${route.path}: discard reason field should be visible before destructive action`)
        }
        await editionRevisionCard.getByRole('button', { name: '编辑修正' }).click()
        if (!(await page.getByRole('button', { name: '提交修正版' }).isVisible().catch(() => false))) {
          failures.push(`${viewport.name} ${route.path}: correction form should open from pending revision`)
        } else {
          await page.getByRole('button', { name: '提交修正版' }).click()
          await page.getByText(/Fixture 已执行：创建修正版/u).first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
        }
        const correctionCard = page.locator('.studio-ai-daily-revision-card').filter({ hasText: 'Revision 3' }).first()
        if (!(await correctionCard.isVisible().catch(() => false))) {
          failures.push(`${viewport.name} ${route.path}: correction should append a new revision instead of replacing its source`)
        } else {
          await correctionCard.getByRole('button', { name: '重新验证' }).click()
          await page.getByText(/Fixture 已执行：重新验证/u).first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
          if ((await correctionCard.getByRole('button', { name: '应用到草稿' }).count()) !== 1) {
            failures.push(`${viewport.name} ${route.path}: valid revision should expose apply action after revalidation`)
          } else {
            await correctionCard.getByRole('button', { name: '应用到草稿' }).click()
            await page.getByText(/Fixture 已执行：应用辅助草稿/u).first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
          }
        }
        const sourceRevisionCard = page.locator('.studio-ai-daily-revision-card').filter({ hasText: 'Revision 2' }).first()
        const discardReason = sourceRevisionCard.getByLabel('丢弃理由')
        if (await discardReason.isVisible().catch(() => false)) {
          await discardReason.fill('UI fixture discard audit')
          page.once('dialog', (dialog) => dialog.accept())
          await sourceRevisionCard.getByRole('button', { name: '丢弃' }).click()
          await page.getByText(/Fixture 已执行：丢弃修订/u).first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
        } else {
          failures.push(`${viewport.name} ${route.path}: source revision should remain available for explicit discard`)
        }
        const editionOverflow = await collectStudioOverflow(page)
        if (editionOverflow.length > 0 || await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
          failures.push(`${viewport.name} ${route.path}: Edition mutations introduced visible overflow ${JSON.stringify(editionOverflow)}`)
        }
      }
    }

    if (route.studioReviewFixture) {
      await page.getByText('UI Check 待审核草稿').first().waitFor({ state: 'visible', timeout: 10_000 })
      const fixtureApiRequests = []
      page.on('request', (request) => {
        if (request.url().includes('/studio/api/')) fixtureApiRequests.push(request.url())
      })
      const hiddenReviewMetric = await page.locator('.studio-review-queue-metrics span').filter({ hasText: 'Hidden 待审' }).innerText()
      const needsChangesMetric = await page.locator('.studio-review-queue-metrics span').filter({ hasText: '待修改' }).innerText()
      const nextReviewButton = page.getByRole('button', { name: '打开下一篇待审核' })
      const nextNeedsChangesButton = page.getByRole('button', { name: '打开下一篇待修改' })
      const nextReviewButtonDisabled = await nextReviewButton.isDisabled().catch(() => true)
      const nextNeedsChangesButtonDisabled = await nextNeedsChangesButton.isDisabled().catch(() => true)

      if (!hiddenReviewMetric.includes('1')) {
        failures.push(`${viewport.name} ${route.path}: expected one hidden review-needed draft, got "${hiddenReviewMetric}"`)
      }
      if (!needsChangesMetric.includes('1')) {
        failures.push(`${viewport.name} ${route.path}: expected one needs-changes draft, got "${needsChangesMetric}"`)
      }
      if (nextNeedsChangesButtonDisabled) {
        failures.push(`${viewport.name} ${route.path}: next needs-changes action should be enabled with fixture drafts`)
      }
      if (nextReviewButtonDisabled) {
        failures.push(`${viewport.name} ${route.path}: next review draft action should be enabled with fixture drafts`)
      } else {
        await nextReviewButton.click()
        const currentDraftTitle = await page.locator('.studio-review-current > strong').first().innerText().catch(() => '')
        const activeDraftSelected =
          (await page
            .locator('.studio-draft-item.is-active')
            .filter({ hasText: 'UI Check 待审核草稿' })
            .count()) > 0
        const editorLoadedDraft = await page
          .locator('#studio-mobile-panel-editor label')
          .filter({ hasText: '标题' })
          .locator('input')
          .first()
          .inputValue()
          .catch(() => '')

        if (
          !currentDraftTitle.includes('UI Check 待审核草稿') ||
          !activeDraftSelected ||
          !editorLoadedDraft.includes('UI Check 待审核草稿')
        ) {
          failures.push(`${viewport.name} ${route.path}: next review action did not load the review-needed draft in the editor`)
        }
      }

      if (!nextNeedsChangesButtonDisabled) {
        await nextNeedsChangesButton.click()
        const needsChangesTitle = await page.locator('.studio-review-current > strong').first().innerText().catch(() => '')
        const editorPanel = page.locator('#studio-mobile-panel-editor')
        const resubmitButton = editorPanel.getByRole('button', { name: '重新提交审核' })
        const approveButton = editorPanel.getByRole('button', { name: '审核通过' })
        const resubmitVisibleBeforeSave = await resubmitButton.isVisible().catch(() => false)
        const approveDisabledBeforeResubmit = await approveButton.isDisabled().catch(() => false)
        if (!needsChangesTitle.includes('UI Check 待修改草稿')) {
          failures.push(`${viewport.name} ${route.path}: needs-changes action should load the draft`)
        }
        if (resubmitVisibleBeforeSave) {
          failures.push(`${viewport.name} ${route.path}: needs-changes draft must be saved before resubmission`)
        }
        if (!approveDisabledBeforeResubmit) {
          failures.push(`${viewport.name} ${route.path}: needs-changes draft must not allow approval before resubmission`)
        }
        const titleInput = editorPanel.locator('label').filter({ hasText: '标题' }).locator('input').first()
        await titleInput.fill(`${await titleInput.inputValue()} 已修订`)
        await editorPanel.getByRole('button', { name: '保存草稿' }).click()
        const resubmitVisibleAfterSave = await resubmitButton.isVisible().catch(() => false)
        if (!resubmitVisibleAfterSave) {
          failures.push(`${viewport.name} ${route.path}: saved needs-changes draft should expose resubmission`)
        } else {
          await resubmitButton.click()
          if (await approveButton.isDisabled().catch(() => true)) {
            failures.push(`${viewport.name} ${route.path}: resubmitted draft should become eligible for approval`)
          }
        }
      }

      if (viewport.name === 'mobile') await page.getByRole('tab', { name: /^草稿箱/ }).click()
      await page.locator('.studio-draft-item').filter({ hasText: 'UI Check 普通草稿' }).click()
      const editorPanel = page.locator('#studio-mobile-panel-editor')
      const submitButton = editorPanel.getByRole('button', { name: '提交审核' })
      const approveDraftButton = editorPanel.getByRole('button', { name: '审核通过' })
      if (!(await submitButton.isVisible().catch(() => false)) || !(await approveDraftButton.isDisabled().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: ordinary draft should require submission before approval`)
      } else {
        await submitButton.click()
        if (await approveDraftButton.isDisabled().catch(() => true)) {
          failures.push(`${viewport.name} ${route.path}: submitted draft should become eligible for approval`)
        }
      }

      const archiveButton = editorPanel.getByRole('button', { name: '归档草稿' })
      page.once('dialog', (dialog) => dialog.accept())
      await archiveButton.click()
      const archivedStatusVisible = await page.getByText('草稿已归档并设为暂不公开。').isVisible().catch(() => false)
      const archivedTitleDisabled = await editorPanel
        .locator('label')
        .filter({ hasText: '标题' })
        .locator('input')
        .first()
        .isDisabled()
        .catch(() => false)
      if (!archivedStatusVisible || !archivedTitleDisabled || !(await archiveButton.isDisabled().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: archived draft should become hidden, read-only, and non-archivable`)
      }

      if (viewport.name === 'mobile') await page.getByRole('tab', { name: /^草稿箱/ }).click()
      await page.locator('.studio-draft-item').filter({ hasText: 'UI Check 已发布草稿' }).click()
      const publishedArchiveDisabled = await editorPanel
        .getByRole('button', { name: '归档草稿' })
        .isDisabled()
        .catch(() => false)
      if (!publishedArchiveDisabled) {
        failures.push(`${viewport.name} ${route.path}: published draft should require withdrawal before archive`)
      }

      if (viewport.name === 'mobile') await page.getByRole('tab', { name: /^草稿箱/ }).click()
      await page.locator('.studio-draft-item').filter({ hasText: 'UI Check 已批准草稿' }).click()
      const fixtureExportButton = editorPanel.getByRole('button', { name: '创建导出记录' })
      await fixtureExportButton.click()
      if (!(await page.getByText('已创建本地 UI 检查用发布导出记录。').isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: fixture export should complete locally`)
      }
      if (!(await fixtureExportButton.isDisabled().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: current draft version must not create duplicate exports`)
      }
      if (fixtureApiRequests.length > 0) {
        failures.push(`${viewport.name} ${route.path}: fixture actions must not call Studio API (${fixtureApiRequests.length})`)
      }

      if (viewport.name === 'mobile') {
        await page.getByRole('tab', { name: /^辅助/ }).click()
      }
      const exportCommand = page.getByText(
        'npm.cmd run studio:export -- --draft ui-check-approved --publish-export-id ui-check-export-01 --run-checks',
        { exact: true },
      )
      const exportCopyButton = page.getByRole('button', { name: /复制 UI Check 已批准草稿 的导出命令/u })
      if (!(await exportCommand.isVisible().catch(() => false)) || !(await exportCopyButton.isVisible().catch(() => false))) {
        failures.push(`${viewport.name} ${route.path}: publish export should expose the runnable command and copy action`)
      }
    }

    if (logs.length > 0) {
      failures.push(`${viewport.name} ${route.path}: ${logs.join(' | ')}`)
    }

    await page.close()
  }
}

await checkStudioWorkspaceModes(browser, failures)
await checkOperatorSettingsSections(browser, failures)
await checkMobileDetailSurfaceCoordination(browser, failures)
await checkMobilePrimaryNavigation(browser, failures)
await checkMobileProjectCatalog(browser, failures)
await checkStatusDetailReadingNavigation(browser, failures)

const statusPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(statusPage, '/status')
if (await statusPage.locator('.status-section-navigator').isVisible().catch(() => false)) {
  failures.push('/status desktop navigator: mobile section navigator should stay hidden')
}
const statusCards = await statusPage.locator('.status-target').count()
const expectedStatusCards = siteStatusTargets.length
const reliabilityProjectCards = await statusPage.locator('.status-project-card').count()
const reliabilityProjectManualMetaCells = await statusPage.locator('.status-project-card__meta div').count()
const rawStatusPayload = await statusPage
  .evaluate(async () => {
    const response = await fetch('/status/site-status.json', { cache: 'no-store' })
    if (!response.ok) return null
    return response.json()
  })
  .catch(() => null)
const mergedStatusPayload = mergeSiteStatusPayload(rawStatusPayload)
const expectedEntrySummary = mergedStatusPayload.summary
const expectedReliabilitySummary = getReliabilityStatusSummary(mergedStatusPayload.reliabilityProjects)
const expectedManualActionQueue = getStatusManualActionQueue(mergedStatusPayload.reliabilityProjects)
const expectedReliabilityNeedsAttention =
  expectedReliabilitySummary.degraded > 0 ||
  expectedReliabilitySummary.offline > 0 ||
  expectedReliabilitySummary.unchecked > 0 ||
  expectedReliabilitySummary.planned > 0
const entrySummaryCards = statusPage.locator('[data-status-scope="entry"]')
const reliabilitySummaryCards = statusPage.locator('[data-status-scope="reliability"]')
const manualActionCards = statusPage.locator('.status-manual-action')
const manualActionLinks = statusPage.locator('.status-manual-action__link')
const legalStatusLink = statusPage.getByRole('link', { name: '打开入口' }).first()
const legalStatusHref = await legalStatusLink.getAttribute('href').catch(() => null)
const legalStatusTarget = await legalStatusLink.getAttribute('target').catch(() => null)
const legalStatusRel = await legalStatusLink.getAttribute('rel').catch(() => null)
const detailStatusLinks = await statusPage.getByRole('link', { name: /^详细状态：/ }).count()
const entrySummaryKeys = ['online', 'degraded', 'offline', 'unchecked']
const reliabilitySummaryKeys = ['online', 'degraded', 'offline', 'unchecked', 'planned']
if (statusCards !== expectedStatusCards) {
  failures.push(`/status targets: expected ${expectedStatusCards} homepage external targets, got ${statusCards}`)
}
if (detailStatusLinks !== expectedStatusCards) {
  failures.push(`/status targets: expected ${expectedStatusCards} detail status links, got ${detailStatusLinks}`)
}
for (const target of siteStatusTargets) {
  const detailProject = findReliabilityProjectForTarget(target, staticReliabilityProjects)
  if (!detailProject) {
    failures.push(`/status detail link: expected a reliability project for ${target.id}`)
    continue
  }
  const expectedHref = `/status/${detailProject.id}`
  const detailLink = statusPage.getByRole('link', { name: `详细状态：${detailProject.title}` }).first()
  const detailHref = await detailLink.getAttribute('href').catch(() => null)
  if (detailHref !== expectedHref) {
    failures.push(`/status detail link: expected ${target.id} to link to ${expectedHref}, got "${detailHref}"`)
  }
  if (detailHref?.startsWith('#')) {
    failures.push(`/status detail link: expected ${target.id} to use a route instead of hash "${detailHref}"`)
  }
}
if (reliabilityProjectCards < staticReliabilityProjects.length) {
  failures.push(`/status reliability: expected at least ${staticReliabilityProjects.length} project detail cards, got ${reliabilityProjectCards}`)
}
if (reliabilityProjectManualMetaCells !== staticReliabilityProjects.length * 2) {
  failures.push(
    `/status reliability: expected ${staticReliabilityProjects.length * 2} manual gate summary cells, got ${reliabilityProjectManualMetaCells}`,
  )
}
const statusOverviewTitle = await statusPage.locator('#status-overview h2').innerText().catch(() => '')
const statusPulseTone = await statusPage.locator('#status-overview .status-pulse').getAttribute('class').catch(() => '')
if (expectedReliabilityNeedsAttention && !statusOverviewTitle.includes('部分能力仍待验证')) {
  failures.push('/status overview: planned or incomplete reliability checks should be visible, got "' + statusOverviewTitle + '"')
}
if (expectedReliabilityNeedsAttention && !statusPulseTone.includes('degraded')) {
  failures.push('/status overview: planned or incomplete reliability checks should use the attention pulse')
}
if ((await entrySummaryCards.count()) !== entrySummaryKeys.length) {
  failures.push(`/status summary: expected ${entrySummaryKeys.length} entry summary cards, got ${await entrySummaryCards.count()}`)
}
if ((await reliabilitySummaryCards.count()) !== reliabilitySummaryKeys.length) {
  failures.push(
    `/status summary: expected ${reliabilitySummaryKeys.length} reliability summary cards, got ${await reliabilitySummaryCards.count()}`,
  )
}
if ((await manualActionCards.count()) !== expectedManualActionQueue.length) {
  failures.push(`/status manual queue: expected ${expectedManualActionQueue.length} action cards, got ${await manualActionCards.count()}`)
}
if ((await manualActionLinks.count()) !== expectedManualActionQueue.length) {
  failures.push(`/status manual queue: expected ${expectedManualActionQueue.length} detail links, got ${await manualActionLinks.count()}`)
}
for (const action of expectedManualActionQueue) {
  const card = statusPage
    .locator(`.status-manual-action[data-project-id="${action.projectId}"][data-manual-action-type="${action.type}"]`)
    .first()
  const cardCount = await card.count()
  if (cardCount !== 1) {
    failures.push(`/status manual queue: expected one ${action.type} card for ${action.projectId}, got ${cardCount}`)
    continue
  }
  const href = await card.locator('.status-manual-action__link').getAttribute('href').catch(() => null)
  const text = await card.innerText().catch(() => '')
  if (href !== action.detailPath) {
    failures.push(`/status manual queue: expected ${action.id} to link to ${action.detailPath}, got "${href}"`)
  }
  if (!text.includes(action.projectTitle) || !text.includes(action.typeLabel)) {
    failures.push(`/status manual queue: expected ${action.id} to render title and type label`)
  }
}
for (const key of entrySummaryKeys) {
  const card = statusPage.locator(`[data-status-scope="entry"][data-status-key="${key}"]`).first()
  const label = await card.locator('span').first().innerText().catch(() => '')
  const value = await card.locator('strong').first().innerText().catch(() => '')
  const expectedValue = String(expectedEntrySummary[key])
  if (!label.includes('入口')) {
    failures.push(`/status summary: expected entry ${key} label to mention 入口, got "${label}"`)
  }
  if (value.trim() !== expectedValue) {
    failures.push(`/status summary: expected entry ${key} count ${expectedValue}, got "${value}"`)
  }
}
for (const key of reliabilitySummaryKeys) {
  const card = statusPage.locator(`[data-status-scope="reliability"][data-status-key="${key}"]`).first()
  const label = await card.locator('span').first().innerText().catch(() => '')
  const value = await card.locator('strong').first().innerText().catch(() => '')
  const expectedValue = String(expectedReliabilitySummary[key])
  if (!label.includes('能力')) {
    failures.push(`/status summary: expected reliability ${key} label to mention 能力, got "${label}"`)
  }
  if (value.trim() !== expectedValue) {
    failures.push(`/status summary: expected reliability ${key} count ${expectedValue}, got "${value}"`)
  }
}
if (legalStatusHref !== 'https://legal-rag-web.onrender.com') {
  failures.push(`/status external link: expected Legal RAG href, got "${legalStatusHref}"`)
}
if (legalStatusTarget !== '_blank') {
  failures.push(`/status external link: expected target _blank, got "${legalStatusTarget}"`)
}
if (legalStatusRel !== 'noopener noreferrer') {
  failures.push(`/status external link: expected rel noopener noreferrer, got "${legalStatusRel}"`)
}
const legalDetailProject = findReliabilityProjectForTarget(
  siteStatusTargets.find((target) => target.id === 'legal-rag-entry') ?? siteStatusTargets[0],
  staticReliabilityProjects,
)
await statusPage.getByRole('link', { name: `详细状态：${legalDetailProject?.title ?? 'Legal RAG 法律机器人'}` }).first().click()
await statusPage.waitForURL(`${base}/status/${legalDetailProject?.id ?? 'legal-rag'}`, { timeout: 5000 }).catch(() => {
  failures.push('/status detail route: expected Legal RAG detail link to navigate to a dedicated status route')
})
const legalDetailTitle = await statusPage.locator('.status-project h2').first().innerText().catch(() => '')
const legalDetailChecks = await statusPage.locator('.status-check').count()
const legalBackHref = await statusPage.getByRole('link', { name: '返回状态总览' }).first().getAttribute('href').catch(() => null)
const legalMergedProject = mergedStatusPayload.reliabilityProjects?.find(
  (project) => project.id === (legalDetailProject?.id ?? 'legal-rag'),
)
const expectedLegalFreshnessFacts =
  legalMergedProject?.checks.filter((check) => parseEvidenceFreshness(check.evidence)).length ?? 0
if (expectedLegalFreshnessFacts > 0) {
  await statusPage
    .locator('.status-evidence-freshness')
    .nth(expectedLegalFreshnessFacts - 1)
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {})
}
const legalFreshnessFacts = await statusPage.locator('.status-evidence-freshness').count()
const legalFreshnessBadges = await statusPage.locator('.status-freshness-badge').count()
const legalGateItems = await statusPage.locator('.status-project__manual-list.is-gate li').count()
const legalNextActionItems = await statusPage.locator('.status-project__manual-list.is-next li').count()
const legalManualGuidance = statusPage.locator('.status-project__handling-guide')
if (!legalDetailTitle.includes(legalDetailProject?.title ?? 'Legal RAG')) {
  failures.push(`/status detail route: expected Legal RAG title on detail page, got "${legalDetailTitle}"`)
}
if (legalDetailChecks < 1) {
  failures.push('/status detail route: expected reliability checks on Legal RAG detail page')
}
if (legalGateItems !== (legalMergedProject?.gates.length ?? 0)) {
  failures.push(
    `/status detail manual gates: expected ${legalMergedProject?.gates.length ?? 0} gate checklist items, got ${legalGateItems}`,
  )
}
if (legalNextActionItems !== (legalMergedProject?.nextActions.length ?? 0)) {
  failures.push(
    `/status detail manual gates: expected ${legalMergedProject?.nextActions.length ?? 0} next-action checklist items, got ${legalNextActionItems}`,
  )
}
if (!(await legalManualGuidance.filter({ hasText: '低敏证据' }).isVisible())) {
  failures.push('/status detail manual guidance: expected low-sensitive evidence handling guidance')
}
if (!(await legalManualGuidance.filter({ hasText: 'token、密码、数据库 URL、模型渠道' }).isVisible())) {
  failures.push('/status detail manual guidance: expected sensitive-field warning')
}
if (expectedLegalFreshnessFacts > 0 && legalFreshnessFacts !== expectedLegalFreshnessFacts) {
  failures.push(
    `/status detail freshness: expected ${expectedLegalFreshnessFacts} freshness fact rows on Legal RAG detail page, got ${legalFreshnessFacts}`,
  )
}
if (expectedLegalFreshnessFacts > 0 && legalFreshnessBadges !== expectedLegalFreshnessFacts) {
  failures.push(
    `/status detail freshness: expected ${expectedLegalFreshnessFacts} freshness badges on Legal RAG detail page, got ${legalFreshnessBadges}`,
  )
}
if (legalBackHref !== '/status') {
  failures.push(`/status detail route: expected back link to /status, got "${legalBackHref}"`)
}
await statusPage.close()

const statusSectionIds = [
  'status-overview',
  'status-summary',
  'status-layers',
  'status-manual',
  'status-targets',
  'status-projects',
]
for (const width of [320, 390, 430]) {
  const mobileStatusPage = await browser.newPage({ viewport: { width, height: 900 } })
  await gotoApp(mobileStatusPage, '/status')
  const navigator = mobileStatusPage.locator('.status-section-navigator')
  const sectionSelect = mobileStatusPage.getByRole('combobox', { name: '选择状态页分区' })
  const navigatorBounds = await navigator.boundingBox()
  if (!navigatorBounds || navigatorBounds.height < 44 || navigatorBounds.x < 0 || navigatorBounds.x + navigatorBounds.width > width + 0.5) {
    failures.push(`/status mobile navigator ${width}px: navigator should be visible, touch-sized, and bounded`)
  }
  if ((await sectionSelect.locator('option').count()) !== statusSectionIds.length) {
    failures.push(`/status mobile navigator ${width}px: expected all ${statusSectionIds.length} section options`)
  }
  if ((await mobileStatusPage.locator('.status-target').count()) !== siteStatusTargets.length) {
    failures.push(`/status mobile navigator ${width}px: entry evidence cards should remain rendered`)
  }
  if ((await mobileStatusPage.locator('.status-project-card').count()) < staticReliabilityProjects.length) {
    failures.push(`/status mobile navigator ${width}px: project reliability evidence should remain rendered`)
  }

  for (const sectionId of statusSectionIds) {
    await sectionSelect.selectOption(sectionId)
    await mobileStatusPage.waitForFunction(
      (id) => {
        const target = document.getElementById(id)
        if (!target) return false
        const top = target.getBoundingClientRect().top
        return top >= 70 && top <= 105
      },
      sectionId,
      { timeout: 2500 },
    ).catch(() => undefined)
    const sectionTop = await mobileStatusPage.locator(`#${sectionId}`).evaluate((item) => item.getBoundingClientRect().top)
    if (sectionTop < 70 || sectionTop > 105) {
      failures.push(`/status mobile navigator ${width}px: ${sectionId} should land below the sticky navigator, got ${sectionTop.toFixed(1)}px`)
    }
    if ((await sectionSelect.inputValue()) !== sectionId) {
      failures.push(`/status mobile navigator ${width}px: selector should retain ${sectionId} after navigation`)
    }
  }

  await mobileStatusPage.evaluate(() => {
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    document.querySelector('#status-manual')?.scrollIntoView({ block: 'start' })
    root.style.scrollBehavior = previous
  })
  await mobileStatusPage.waitForFunction(
    () => document.querySelector('.status-section-navigator select')?.value === 'status-manual',
    undefined,
    { timeout: 2000 },
  ).catch(() => undefined)
  if ((await sectionSelect.inputValue()) !== 'status-manual') {
    failures.push(`/status mobile navigator ${width}px: scrolling should update the current section`)
  }
  const stickyTop = await navigator.evaluate((item) => item.getBoundingClientRect().top)
  if (stickyTop < 0 || stickyTop > 16) {
    failures.push(`/status mobile navigator ${width}px: sticky navigator should remain near the viewport top`)
  }
  const overflow = await mobileStatusPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  if (overflow) failures.push(`/status mobile navigator ${width}px: page should not overflow horizontally`)
  await mobileStatusPage.close()
}

const interactionPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(interactionPage, '/blog')
if (await interactionPage.locator('.blog-column-select').isVisible().catch(() => false)) {
  failures.push('/blog columns: mobile column selector should stay hidden on desktop')
}
for (const column of blogColumnOrder) {
  const label = blogColumnMeta[column].titleZh
  if (!(await interactionPage.getByRole('button', { name: new RegExp(label) }).isVisible().catch(() => false))) {
    failures.push(`/blog columns: expected ${label} column filter to stay visible even before first public post`)
  }
}
await interactionPage.getByRole('button', { name: /AI 日报/ }).click()
await interactionPage.waitForTimeout(100)
for (const column of ['ai-daily', 'resources']) {
  const expectedEmptyState = getBlogEmptyState(column, '')
  await interactionPage.getByRole('button', { name: new RegExp(blogColumnMeta[column].titleZh) }).click()
  await interactionPage.waitForTimeout(100)
  const columnEmptyState = interactionPage.locator(`.blog-empty[data-blog-empty-column="${column}"]`)
  if (!(await columnEmptyState.filter({ hasText: expectedEmptyState.title }).isVisible())) {
    failures.push(`/blog columns: expected ${blogColumnMeta[column].titleZh} empty state title to match shared projection`)
  }
  if (!(await columnEmptyState.filter({ hasText: expectedEmptyState.description }).isVisible())) {
    failures.push(`/blog columns: expected ${blogColumnMeta[column].titleZh} empty state description to match shared projection`)
  }
  if (expectedEmptyState.note && !(await columnEmptyState.filter({ hasText: expectedEmptyState.note }).isVisible())) {
    failures.push(`/blog columns: expected ${blogColumnMeta[column].titleZh} empty state note to match shared projection`)
  }
}
await interactionPage.getByRole('button', { name: '全部' }).click()
await interactionPage.waitForTimeout(100)
const initialCards = await interactionPage.locator('.blog-card').count()
const initialResultMeta = await interactionPage.locator('.blog-result-meta').innerText()
const initialTotalMatch = initialResultMeta.match(/(\d+)\s*篇文章/)
if (!initialTotalMatch) {
  failures.push(`/blog pagination: expected result meta to include total article count, got "${initialResultMeta}"`)
} else {
  const initialTotal = Number.parseInt(initialTotalMatch[1], 10)
  const expectedFirstPageCards = Math.min(12, initialTotal)
  if (initialCards !== expectedFirstPageCards) {
    failures.push(`/blog pagination: expected ${expectedFirstPageCards} curated cards on first page, got ${initialCards}`)
  }
}
const previousButton = interactionPage.getByRole('button', { name: '上一页' })
const previousDisabled = await previousButton.isDisabled()
const previousAriaDisabled = await previousButton.getAttribute('aria-disabled')
if (!previousDisabled || previousAriaDisabled !== 'true') {
  failures.push('/blog pagination: previous button should be disabled with aria-disabled on first page')
}
await interactionPage.locator('.blog-search').fill('RAG')
await interactionPage.waitForTimeout(100)
const searchedCards = await interactionPage.locator('.blog-card').count()
const resultMeta = await interactionPage.locator('.blog-result-meta').innerText()
if (searchedCards === 0 || !resultMeta.includes('篇文章')) {
  failures.push('/blog search: expected visible search results and result meta')
}
await interactionPage.locator('.blog-search').fill('Embedding')
await interactionPage.waitForTimeout(100)
if (!(await interactionPage.locator('.blog-empty').isVisible())) {
  failures.push('/blog legacy posts: expected archived template articles to stay out of public search')
}
await interactionPage.locator('.blog-search').fill('no-result-for-ui-check')
await interactionPage.waitForTimeout(100)
const expectedQueryEmptyState = getBlogEmptyState('all', 'no-result-for-ui-check')
const queryEmptyState = interactionPage.locator('.blog-empty[data-blog-empty-query="true"]')
if (!(await queryEmptyState.filter({ hasText: expectedQueryEmptyState.title }).isVisible())) {
  failures.push('/blog empty state: expected empty state for unmatched search')
}
if (!(await queryEmptyState.filter({ hasText: expectedQueryEmptyState.description }).isVisible())) {
  failures.push('/blog empty state: expected unmatched search to use query-specific guidance')
}
await interactionPage.close()

for (const width of [320, 390, 430]) {
  const mobileBlogPage = await browser.newPage({ viewport: { width, height: 900 } })
  await gotoApp(mobileBlogPage, '/blog')

  const mobileSelectorShell = mobileBlogPage.locator('.blog-column-select')
  const mobileSelector = mobileBlogPage.getByRole('combobox', { name: '选择知识库栏目' })
  if (!(await mobileSelectorShell.isVisible().catch(() => false))) {
    failures.push(`/blog mobile columns ${width}px: expected the complete column selector to be visible`)
  }
  if (await mobileBlogPage.locator('.blog-column-filter').isVisible().catch(() => false)) {
    failures.push(`/blog mobile columns ${width}px: desktop column buttons should be hidden`)
  }

  const options = await mobileSelector.locator('option').allTextContents()
  if (options.length !== blogColumnOrder.length + 1) {
    failures.push(`/blog mobile columns ${width}px: expected ${blogColumnOrder.length + 1} options, got ${options.length}`)
  }
  for (const column of blogColumnOrder) {
    const meta = blogColumnMeta[column]
    if (!options.some((option) => option.includes(meta.titleZh) && option.includes(meta.titleEn))) {
      failures.push(`/blog mobile columns ${width}px: expected an option for ${meta.titleZh} / ${meta.titleEn}`)
    }
  }

  const selectorBounds = await mobileSelectorShell.boundingBox()
  if (!selectorBounds || selectorBounds.height < 44 || selectorBounds.x < 0 || selectorBounds.x + selectorBounds.width > width + 0.5) {
    failures.push(`/blog mobile columns ${width}px: selector should be at least 44px high and stay inside the viewport`)
  }

  const hasHorizontalOverflow = await mobileBlogPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  if (hasHorizontalOverflow) {
    failures.push(`/blog mobile columns ${width}px: page should not overflow horizontally`)
  }

  await mobileSelector.selectOption('knowledge')
  await mobileBlogPage.waitForTimeout(100)
  if ((await mobileBlogPage.locator('.blog-card').count()) === 0) {
    failures.push(`/blog mobile columns ${width}px: selecting a populated column should show curated cards`)
  }
  const populatedPageMeta = await mobileBlogPage.locator('.blog-result-meta').innerText()
  if (!populatedPageMeta.includes('第 1 /')) {
    failures.push(`/blog mobile columns ${width}px: changing columns should reset pagination to page one`)
  }

  const emptyColumn = 'resources'
  await mobileSelector.selectOption(emptyColumn)
  await mobileBlogPage.waitForTimeout(100)
  const expectedMobileEmptyState = getBlogEmptyState(emptyColumn, '')
  const mobileEmptyState = mobileBlogPage.locator(`.blog-empty[data-blog-empty-column="${emptyColumn}"]`)
  if (!(await mobileEmptyState.filter({ hasText: expectedMobileEmptyState.title }).isVisible())) {
    failures.push(`/blog mobile columns ${width}px: expected the shared ${emptyColumn} empty state`)
  }

  await mobileBlogPage.close()
}

const operatorDesktopPage = await browser.newPage({ viewport: viewports[0] })
await installOperatorApiFixture(operatorDesktopPage)
await gotoApp(operatorDesktopPage, '/operator')
if (await operatorDesktopPage.getByRole('button', { name: '打开站务会话' }).isVisible().catch(() => false)) {
  failures.push('/operator desktop workspace: mobile drawer trigger should stay hidden')
}
if (!(await operatorDesktopPage.locator('.operator-sidebar').isVisible().catch(() => false))) {
  failures.push('/operator desktop workspace: session sidebar should remain visible')
}
if (!(await operatorDesktopPage.getByLabel('站务运行检查器').isVisible().catch(() => false))) {
  failures.push('/operator desktop workspace: runtime inspector should remain visible')
}
await operatorDesktopPage.close()

const operatorRacePage = await browser.newPage({ viewport: viewports[0] })
await installOperatorSessionRaceFixture(operatorRacePage)
await gotoApp(operatorRacePage, '/operator')
const fastSessionButton = operatorRacePage.locator('.operator-session').filter({ hasText: '快速会话 B' })
await fastSessionButton.waitFor({ state: 'visible', timeout: 5_000 })
await fastSessionButton.click()
await operatorRacePage.getByText('快速会话 B 的当前消息', { exact: true }).waitFor({ state: 'visible', timeout: 2_000 })
await operatorRacePage.waitForTimeout(450)
const staleSessionVisible = await operatorRacePage.getByText('延迟会话 A 的旧消息', { exact: true }).isVisible().catch(() => false)
const fastSessionActive = (await fastSessionButton.getAttribute('class'))?.includes('is-active') === true
if (staleSessionVisible || !fastSessionActive) {
  failures.push('/operator session ordering: a delayed previous session response must not replace the latest selected session')
}
await operatorRacePage.close()

for (const width of [320, 390, 430]) {
  const mobileOperatorPage = await browser.newPage({ viewport: { width, height: 900 } })
  await installOperatorApiFixture(mobileOperatorPage)
  await gotoApp(mobileOperatorPage, '/operator')

  const drawer = mobileOperatorPage.locator('.operator-sidebar')
  const trigger = mobileOperatorPage.getByRole('button', { name: '打开站务会话' })
  const triggerBounds = await trigger.boundingBox()
  if (!triggerBounds || triggerBounds.height < 44 || triggerBounds.x < 0 || triggerBounds.x + triggerBounds.width > width + 0.5) {
    failures.push(`/operator mobile workspace ${width}px: drawer trigger should keep a bounded 44px target`)
  }
  if ((await drawer.getAttribute('class'))?.includes('is-open')) {
    failures.push(`/operator mobile workspace ${width}px: session drawer should start closed`)
  }

  await trigger.click()
  const drawerEnteredViewport = await mobileOperatorPage
    .waitForFunction(
      (viewportWidth) => {
        const drawerElement = document.querySelector('.operator-sidebar.is-open')
        if (!(drawerElement instanceof HTMLElement)) return false
        const bounds = drawerElement.getBoundingClientRect()
        return bounds.x >= -1 && bounds.right <= viewportWidth + 1
      },
      width,
      { timeout: 1_200 },
    )
    .then(() => true)
    .catch(() => false)
  if (!drawerEnteredViewport) {
    failures.push(`/operator mobile workspace ${width}px: session drawer should open inside the viewport`)
  }
  if (!(await mobileOperatorPage.locator('.operator-drawer-backdrop.is-open').isVisible().catch(() => false))) {
    failures.push(`/operator mobile workspace ${width}px: open drawer should expose a backdrop`)
  }

  await drawer.getByRole('button', { name: '关闭站务会话' }).click()
  await mobileOperatorPage.waitForTimeout(220)
  if ((await drawer.getAttribute('class'))?.includes('is-open')) {
    failures.push(`/operator mobile workspace ${width}px: close button should dismiss the drawer`)
  }
  const operatorOverflow = await mobileOperatorPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  if (operatorOverflow) failures.push(`/operator mobile workspace ${width}px: page should not overflow horizontally`)
  await mobileOperatorPage.close()
}

const navFocusPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(navFocusPage, '/blog')
const expectedNavFocusTargets = new Set(['brand', '首页', '项目', '博客', '状态', 'theme', 'language', 'primary'])
const seenNavFocusTargets = new Map()
for (let index = 0; index < 24; index += 1) {
  await navFocusPage.keyboard.press('Tab')
  const focused = await navFocusPage.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null

    const styles = getComputedStyle(active)
    let key = ''
    if (active.classList.contains('nav-brand-section')) key = 'brand'
    if (active.classList.contains('nav-link-center')) key = active.textContent?.trim() ?? ''
    if (active.classList.contains('nav-theme-toggle')) key = 'theme'
    if (active.classList.contains('nav-lang-toggle')) key = 'language'
    if (active.classList.contains('nav-all-tools')) key = 'primary'
    if (!key) return null

    return {
      key,
      focusVisible: active.matches(':focus-visible'),
      hasVisibleRing: styles.boxShadow !== 'none' || styles.outlineStyle !== 'none',
    }
  })

  if (focused && !seenNavFocusTargets.has(focused.key)) {
    seenNavFocusTargets.set(focused.key, focused)
  }

  if ([...expectedNavFocusTargets].every((target) => seenNavFocusTargets.has(target))) break
}

for (const target of expectedNavFocusTargets) {
  const focused = seenNavFocusTargets.get(target)
  if (!focused) {
    failures.push(`/blog nav keyboard: expected Tab to reach ${target}`)
  } else if (!focused.focusVisible || !focused.hasVisibleRing) {
    failures.push(`/blog nav keyboard: ${target} focus should have a visible focus ring`)
  }
}
await navFocusPage.close()

const navIndicatorPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(navIndicatorPage, '/blog')
const navIndicator = await navIndicatorPage.locator('.nav-link-center.active').evaluate((item) => {
  const style = getComputedStyle(item, '::after')
  return {
    width: Number.parseFloat(style.width),
    height: Number.parseFloat(style.height),
    shadow: style.boxShadow,
    background: style.backgroundImage,
  }
})
if (navIndicator.width < 32 || navIndicator.height < 3 || navIndicator.shadow === 'none') {
  failures.push('/blog nav indicator: active underline should be wide, thick, and visible')
}
await navIndicatorPage.close()

const harborThemeSignatures = []
for (const theme of ['light', 'dark']) {
  for (const scene of ['dusk', 'garden', 'stellar']) {
    const harborThemePage = await browser.newPage({ viewport: viewports[0], colorScheme: theme })
    await harborThemePage.addInitScript(({ harborScene, harborTheme }) => {
      window.localStorage.setItem('theme', harborTheme)
      window.localStorage.setItem('biau-port-harbor-scene', harborScene)
      window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    }, { harborScene: scene, harborTheme: theme })
    await gotoApp(harborThemePage, '/')
    const canvas = harborThemePage.locator('.flow-background[data-flow-ready="true"]')
    await canvas.waitFor({ state: 'attached' })
    harborThemeSignatures.push((await canvas.screenshot()).toString('base64'))
    await harborThemePage.close()
  }
}
if (new Set(harborThemeSignatures).size !== 6) {
  failures.push('/ home flow canvas: light/dark dusk, garden, and stellar should render six distinct frames')
}
const cardResponsePage = await browser.newPage({ viewport: viewports[0], colorScheme: 'dark' })
await cardResponsePage.addInitScript(() => {
  window.localStorage.setItem('theme', 'dark')
  window.localStorage.setItem('biau-port-harbor-scene', 'stellar')
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
})
await gotoApp(cardResponsePage, '/')
const responseCards = cardResponsePage.locator('.carousel-card')
const visibleResponseCardIndex = await responseCards.evaluateAll((cards) => {
  const viewport = document.querySelector('.carousel-viewport')?.getBoundingClientRect()
  if (!viewport) return -1
  return cards.findIndex((card) => {
    const rect = card.getBoundingClientRect()
    return (
      rect.top >= viewport.top + 24 &&
      rect.bottom <= viewport.bottom - 24 &&
      rect.left >= viewport.left &&
      rect.right <= viewport.right
    )
  })
})
const responseCard = responseCards.nth(Math.max(0, visibleResponseCardIndex))
const cardSheenBefore = await responseCard.evaluate((card) => {
  const style = getComputedStyle(card)
  return {
    opacity: Number.parseFloat(style.getPropertyValue('--flow-card-sheen-opacity')),
    shift: style.getPropertyValue('--flow-card-sheen-shift').trim(),
  }
})
const responseCardBox = await responseCard.boundingBox()
if (responseCardBox) {
  await cardResponsePage.mouse.move(
    responseCardBox.x + responseCardBox.width * 0.5,
    responseCardBox.y + responseCardBox.height * 0.5,
  )
}
await cardResponsePage.waitForTimeout(180)
const cardSheenAfter = await responseCard.evaluate((card) => {
  const style = getComputedStyle(card)
  return {
    opacity: Number.parseFloat(style.getPropertyValue('--flow-card-sheen-opacity')),
    shift: style.getPropertyValue('--flow-card-sheen-shift').trim(),
  }
})
if (
  !responseCardBox ||
  cardSheenAfter.opacity <= cardSheenBefore.opacity ||
  cardSheenAfter.shift === cardSheenBefore.shift
) {
  failures.push('/ home card response: desktop hover should strengthen and move the bounded specular sheen')
}
await cardResponsePage.close()

const mobileHarborPage = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' })
await mobileHarborPage.addInitScript(() => {
  window.localStorage.setItem('theme', 'dark')
  window.localStorage.setItem('biau-port-harbor-scene', 'stellar')
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
})
await gotoApp(mobileHarborPage, '/')
const mobileFlow = mobileHarborPage.locator('.flow-background[data-flow-ready="true"]')
await mobileFlow.waitFor({ state: 'attached' })
const mobileHarbor = await mobileFlow.evaluate((canvas) => ({
  pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  width: canvas.width,
  height: canvas.height,
}))
if (mobileHarbor.pageOverflow > 1 || mobileHarbor.width > 488 || mobileHarbor.height > 1055) {
  failures.push('/ home mobile flow: expected bounded overflow and viewport-sized capped-DPR canvas at 390px')
}
await mobileHarborPage.close()
const reducedHarborPage = await browser.newPage({ viewport: viewports[0], colorScheme: 'dark', reducedMotion: 'reduce' })
await reducedHarborPage.addInitScript(() => {
  window.localStorage.setItem('theme', 'dark')
  window.localStorage.setItem('biau-port-harbor-scene', 'stellar')
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
})
await gotoApp(reducedHarborPage, '/')
const reducedFlow = reducedHarborPage.locator('.flow-background')
await reducedFlow.waitFor({ state: 'attached' })
const reducedModeReady = await reducedHarborPage
  .waitForFunction(() => {
    const canvas = document.querySelector('.flow-background')
    return canvas?.getAttribute('data-flow-ready') === 'true' || canvas?.getAttribute('data-flow-fallback') === 'css'
  }, undefined, { timeout: 8_000 })
  .then(() => true)
  .catch(() => false)
if (!reducedModeReady) {
  failures.push('/ home reduced motion: flow background never reached canvas or CSS fallback mode')
} else if ((await reducedFlow.getAttribute('data-flow-ready')) === 'true') {
  await waitForFlowMotion(reducedHarborPage, 'reduced-settled').catch(() => {
    failures.push('/ home reduced motion: flow worker did not acknowledge a settled frame')
  })
  const reducedFrameA = await reducedFlow.evaluate((canvas) => {
    const blank = document.createElement('canvas')
    blank.width = canvas.width
    blank.height = canvas.height
    const black = document.createElement('canvas')
    black.width = canvas.width
    black.height = canvas.height
    const context = black.getContext('2d')
    context?.fillRect(0, 0, black.width, black.height)
    return { frame: canvas.toDataURL(), blank: blank.toDataURL(), black: black.toDataURL() }
  })
  await reducedHarborPage.waitForTimeout(500)
  const reducedFrameB = await reducedFlow.evaluate((canvas) => canvas.toDataURL())
  if (
    reducedFrameA.frame !== reducedFrameB ||
    reducedFrameA.frame.length < 100 ||
    reducedFrameA.frame === reducedFrameA.blank ||
    reducedFrameA.frame === reducedFrameA.black
  ) {
    failures.push('/ home reduced motion: expected a stable nonblank flow canvas frame')
  }
} else {
  const fallbackState = await reducedFlow.evaluate((canvas) => {
    const app = document.querySelector('.app')
    const canvasStyle = getComputedStyle(canvas)
    const appBefore = app ? getComputedStyle(app, '::before') : null
    return {
      canvasOpacity: Number.parseFloat(canvasStyle.opacity),
      backgroundImage: appBefore?.backgroundImage ?? 'none',
      backgroundOpacity: Number.parseFloat(appBefore?.opacity ?? '0'),
    }
  })
  if (
    fallbackState.canvasOpacity !== 0 ||
    fallbackState.backgroundImage === 'none' ||
    fallbackState.backgroundOpacity <= 0
  ) {
    failures.push('/ home reduced motion: expected a stable nonblank CSS fallback without WebGL2')
  }
}
await reducedHarborPage.close()

const motionSwitchPage = await browser.newPage({
  viewport: viewports[0],
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
})
await motionSwitchPage.addInitScript(() => {
  window.localStorage.setItem('theme', 'dark')
  window.localStorage.setItem('biau-port-harbor-scene', 'stellar')
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
})
await gotoApp(motionSwitchPage, '/')
const motionSwitchFlow = motionSwitchPage.locator('.flow-background[data-flow-ready="true"]')
await motionSwitchFlow.waitFor({ state: 'attached' })
await waitForFlowMotion(motionSwitchPage, 'running').catch(() => {
  failures.push('/ home runtime motion: flow worker did not acknowledge running state')
})
const animatedFrameDelta = await measureLocatorFrameDelta(motionSwitchPage, motionSwitchFlow)
if (animatedFrameDelta <= 0.15) {
  failures.push('/ home runtime motion: normal preference should keep the worker canvas animated')
}

await motionSwitchPage.emulateMedia({ reducedMotion: 'reduce' })
await waitForFlowMotion(motionSwitchPage, 'reduced-settled').catch(() => {
  failures.push('/ home runtime motion: flow worker did not acknowledge reduced-motion state')
})
const runtimeReducedFrameDelta = await measureLocatorFrameDelta(motionSwitchPage, motionSwitchFlow)
if (runtimeReducedFrameDelta >= 0.05) {
  failures.push('/ home runtime motion: switching to reduce should stop the worker canvas on one stable frame')
}

await motionSwitchFlow.evaluate((canvas) => {
  canvas.setAttribute('data-flow-fallback', 'css')
})
await motionSwitchPage.waitForFunction(() => {
  const canvas = document.querySelector('.flow-background')
  const app = document.querySelector('.app')
  const canvasStyle = canvas ? getComputedStyle(canvas) : null
  const appBefore = app ? getComputedStyle(app, '::before') : null
  const appAfter = app ? getComputedStyle(app, '::after') : null
  return (
    canvasStyle?.opacity === '0' &&
    appBefore?.backgroundImage !== 'none' &&
    appBefore?.opacity !== '0' &&
    appAfter?.backgroundImage !== 'none'
  )
}, undefined, { timeout: 2_000 }).catch(() => {
  failures.push('/ home runtime fallback: CSS fallback styles did not settle')
})
const fallbackState = await motionSwitchFlow.evaluate((canvas) => {
  const app = document.querySelector('.app')
  const canvasStyle = getComputedStyle(canvas)
  const appBefore = app ? getComputedStyle(app, '::before') : null
  const appAfter = app ? getComputedStyle(app, '::after') : null
  const result = {
    canvasOpacity: Number.parseFloat(canvasStyle.opacity),
    backgroundImage: appBefore?.backgroundImage ?? 'none',
    backgroundOpacity: Number.parseFloat(appBefore?.opacity ?? '0'),
    afterImage: appAfter?.backgroundImage ?? 'none',
  }
  canvas.removeAttribute('data-flow-fallback')
  return result
})
if (
  fallbackState.canvasOpacity !== 0 ||
  fallbackState.backgroundImage === 'none' ||
  fallbackState.backgroundOpacity <= 0 ||
  fallbackState.afterImage === 'none'
) {
  failures.push('/ home runtime fallback: worker failure should reveal a stable reduced-motion CSS background')
}

await motionSwitchPage.emulateMedia({ reducedMotion: 'no-preference' })
await waitForFlowMotion(motionSwitchPage, 'running').catch(() => {
  failures.push('/ home runtime motion: flow worker did not acknowledge resumed state')
})
const resumedFrameDelta = await measureLocatorFrameDelta(motionSwitchPage, motionSwitchFlow)
if (resumedFrameDelta <= 0.15) {
  failures.push('/ home runtime motion: switching back to no-preference should resume one worker render loop')
}
await motionSwitchPage.close()

const operatorPage = await browser.newPage({ viewport: viewports[0] })
await installOperatorApiFixture(operatorPage)
await gotoApp(operatorPage, '/operator')
if (await operatorPage.locator('.public-assistant').count()) {
  failures.push('/operator: public assistant widget should be hidden on owner routes')
}
await operatorPage.locator('.operator-suggestions button').first().click()
await operatorPage.getByRole('button', { name: '发送站务任务' }).click()
await operatorPage.waitForTimeout(180)
if ((await operatorPage.locator('.operator-message.is-user').count()) < 1) {
  failures.push('/operator: expected a task starter to create a user message')
}
if ((await operatorPage.locator('.operator-message.is-assistant').count()) < 1) {
  failures.push('/operator: expected deterministic Operator response rendering')
}
await operatorPage.close()

const publicAssistantPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(publicAssistantPage, '/blog')
await publicAssistantPage.locator('.public-assistant__trigger').click()
if (!(await publicAssistantPage.locator('.public-assistant__panel').isVisible())) {
  failures.push('/blog public assistant: expected panel to open')
}
if ((await publicAssistantPage.locator('.public-assistant__message').count()) !== 0) {
  failures.push('/blog public assistant: expected initial panel to open without default chat bubbles')
}
const publicAssistantStatus = await publicAssistantPage.locator('.public-assistant__status').innerText().catch(() => '')
if (!publicAssistantStatus.includes('未连接模型')) {
  failures.push(`/blog public assistant: expected local mode to say model is not connected, got "${publicAssistantStatus}"`)
}
if ((await publicAssistantPage.locator('.public-assistant__citation').count()) !== 0) {
  failures.push('/blog public assistant: expected initial panel to stay concise without citation cards')
}
const manualGateSuggestion = publicAssistantSuggestions.find((suggestion) => suggestion.id === 'manual-gates')
if (
  manualGateSuggestion &&
  !(await publicAssistantPage.getByRole('button', { name: manualGateSuggestion.label }).isVisible().catch(() => false))
) {
  failures.push('/blog public assistant: expected manual gate suggestion to stay visible')
}
await publicAssistantPage.locator('.public-assistant__suggestion').first().click()
await publicAssistantPage.waitForTimeout(150)
if ((await publicAssistantPage.locator('.public-assistant__message.is-user').count()) < 1) {
  failures.push('/blog public assistant: expected suggestion click to append a user message')
}
if ((await publicAssistantPage.locator('.public-assistant__citation').count()) < 1) {
  failures.push('/blog public assistant: expected cited local knowledge')
}
await publicAssistantPage.locator('.public-assistant__close').click()
if (await publicAssistantPage.locator('.public-assistant__panel').isVisible().catch(() => false)) {
  failures.push('/blog public assistant: expected panel to close')
}
await publicAssistantPage.close()

for (const path of ['/projects', '/blog']) {
  const routeFlashPage = await browser.newPage({ viewport: viewports[0] })
  await routeFlashPage.addInitScript(() => {
    window.__routeFlashEvents = []
    const record = (kind, value) => {
      window.__routeFlashEvents.push({ kind, value, time: Math.round(performance.now()) })
    }
    document.addEventListener('DOMContentLoaded', () => {
      record('domcontentloaded-route-loading', String(!!document.querySelector('.route-loading')))
      const observer = new MutationObserver(() => {
        if (document.querySelector('.route-loading')) record('route-loading', 'present')
      })
      observer.observe(document.body, { childList: true, subtree: true })
      window.setTimeout(() => observer.disconnect(), 1200)
    })
  })
  await routeFlashPage.goto(`${base}${path}`, { waitUntil: 'load', timeout: 45_000 })
  await routeFlashPage.waitForTimeout(1300)
  const routeFlashEvents = await routeFlashPage.evaluate(() => window.__routeFlashEvents ?? [])
  if (routeFlashEvents.some((event) => event.value === 'present' || event.value === 'true')) {
    failures.push(`${path} route flash: should not show route-loading during initial render`)
  }
  await routeFlashPage.close()
}

const homeIntroPage = await browser.newPage({ viewport: viewports[0] })
await homeIntroPage.addInitScript(() => {
  window.sessionStorage.removeItem('biau-port-harbor-intro:v3')
  window.__harborIntroEvents = []
  for (const type of ['animationstart', 'animationend']) {
    document.addEventListener(
      type,
      (event) => {
        if (!(event.target instanceof Element)) return
        if (!String(event.animationName).startsWith('harbor')) return
        window.__harborIntroEvents.push({
          type,
          name: event.animationName,
          className: event.target.className,
          time: Math.round(performance.now()),
        })
      },
      true,
    )
  }
})
await gotoApp(homeIntroPage, '/', { waitUntil: 'domcontentloaded' })
await homeIntroPage.waitForSelector('.harbor-intro__vessel', { timeout: 3000 }).catch(() => {
  failures.push('/ home intro: expected harbor intro vessel to mount on first visit')
})
await homeIntroPage.waitForTimeout(700)
const harborDockMetrics = await homeIntroPage.evaluate(() => {
  const intro = document.querySelector('.harbor-intro')
  const navLogo = document.querySelector('.nav-logo')
  const vessel = document.querySelector('.harbor-intro__vessel')
  if (!(intro instanceof HTMLElement) || !(navLogo instanceof HTMLElement) || !(vessel instanceof HTMLElement)) {
    return null
  }

  const introStyle = getComputedStyle(intro)
  const navRect = navLogo.getBoundingClientRect()
  const dockX = Number.parseFloat(introStyle.getPropertyValue('--harbor-logo-x'))
  const dockY = Number.parseFloat(introStyle.getPropertyValue('--harbor-logo-y'))
  const dockWidth = Number.parseFloat(introStyle.getPropertyValue('--harbor-logo-width'))
  const dockHeight = Number.parseFloat(introStyle.getPropertyValue('--harbor-logo-height'))
  const stageScale = Number.parseFloat(introStyle.getPropertyValue('--harbor-logo-stage-scale'))

  return {
    dx: Math.abs(dockX - (navRect.left + navRect.width / 2)),
    dy: Math.abs(dockY - (navRect.top + navRect.height / 2)),
    dw: Math.abs(dockWidth - navRect.width),
    dh: Math.abs(dockHeight - navRect.height),
    stageScale,
    navOpacity: getComputedStyle(navLogo).opacity,
    introSeen: window.sessionStorage.getItem('biau-port-harbor-intro:v3'),
    externalStylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('http')),
  }
})
if (!harborDockMetrics) {
  failures.push('/ home intro docking: expected measurable intro, vessel, and navigation logo')
} else {
  if (
    !Number.isFinite(harborDockMetrics.dx) ||
    !Number.isFinite(harborDockMetrics.dy) ||
    !Number.isFinite(harborDockMetrics.dw) ||
    !Number.isFinite(harborDockMetrics.dh) ||
    !Number.isFinite(harborDockMetrics.stageScale)
  ) {
    failures.push('/ home intro docking: expected finite dock target CSS variables')
  }
  if (harborDockMetrics.dx > 1 || harborDockMetrics.dy > 1) {
    failures.push(
      `/ home intro docking: expected intro dock target to match nav logo center, got dx=${harborDockMetrics.dx}, dy=${harborDockMetrics.dy}`,
    )
  }
  if (harborDockMetrics.dw > 0.5 || harborDockMetrics.dh > 0.5 || harborDockMetrics.stageScale <= 1) {
    failures.push(
      `/ home intro docking: expected vessel base size to match nav logo, got dw=${harborDockMetrics.dw}, dh=${harborDockMetrics.dh}, stageScale=${harborDockMetrics.stageScale}`,
    )
  }
  if (harborDockMetrics.navOpacity !== '0') {
    failures.push('/ home intro docking: expected nav logo hidden before settling crossfade')
  }
  if (harborDockMetrics.introSeen !== null) {
    failures.push('/ home intro: should mark the intro as seen only after the animation completes')
  }
  if (harborDockMetrics.externalStylesheets.length > 0) {
    failures.push(`/ home performance: render-blocking external stylesheets found: ${harborDockMetrics.externalStylesheets.join(', ')}`)
  }
}
await homeIntroPage
  .waitForFunction(() => document.documentElement.classList.contains('harbor-intro-settling'), null, { timeout: 5000 })
  .catch(() => failures.push('/ home intro docking: expected a settling handoff state'))
const harborLandingMetrics = await homeIntroPage.evaluate(() => {
  const vessel = document.querySelector('.harbor-intro__vessel')
  const logoShell = document.querySelector('.harbor-intro__logo-shell')
  const introMark = document.querySelector('.harbor-intro__boat')
  const navLogo = document.querySelector('.nav-logo')
  const navMark = document.querySelector('.nav-logo-mark')
  const mark = document.querySelector('.harbor-intro__mark')
  if (
    !(vessel instanceof HTMLElement) ||
    !(logoShell instanceof HTMLElement) ||
    !(introMark instanceof SVGElement) ||
    !(navLogo instanceof HTMLElement) ||
    !(navMark instanceof SVGElement)
  ) return null
  const vesselRect = vessel.getBoundingClientRect()
  const navRect = navLogo.getBoundingClientRect()
  const shellStyle = getComputedStyle(logoShell)
  const navStyle = getComputedStyle(navLogo)
  return {
    dx: Math.abs(vesselRect.left - navRect.left),
    dy: Math.abs(vesselRect.top - navRect.top),
    dw: Math.abs(vesselRect.width - navRect.width),
    dh: Math.abs(vesselRect.height - navRect.height),
    backgroundMatches: shellStyle.background === navStyle.background,
    radiusMatches: shellStyle.borderRadius === navStyle.borderRadius,
    markFilterMatches: getComputedStyle(introMark).filter === getComputedStyle(navMark).filter,
    markOpacity: mark instanceof HTMLElement ? Number.parseFloat(getComputedStyle(mark).opacity) : 1,
  }
})
if (!harborLandingMetrics) {
  failures.push('/ home intro docking: expected measurable final landing geometry')
} else {
  if (Math.max(harborLandingMetrics.dx, harborLandingMetrics.dy, harborLandingMetrics.dw, harborLandingMetrics.dh) > 0.75) {
    failures.push(`/ home intro docking: final vessel should geometrically match nav logo, got ${JSON.stringify(harborLandingMetrics)}`)
  }
  if (!harborLandingMetrics.backgroundMatches || !harborLandingMetrics.radiusMatches || !harborLandingMetrics.markFilterMatches) {
    failures.push('/ home intro docking: final vessel shell should visually match the stable nav logo')
  }
  if (harborLandingMetrics.markOpacity > 0.05) {
    failures.push(`/ home intro docking: center wordmark should clear before handoff, opacity=${harborLandingMetrics.markOpacity}`)
  }
}
await homeIntroPage
  .waitForFunction(
    () => {
      const events = window.__harborIntroEvents ?? []
      return events.some((event) => event.name === 'harborIntroVeil') && !document.querySelector('.harbor-intro')
    },
    null,
    { timeout: 10000 },
  )
  .catch(() => {
    failures.push('/ home intro: expected harbor intro to finish and unmount')
  })
const harborIntroEvents = await homeIntroPage.evaluate(() => window.__harborIntroEvents ?? [])
const harborIntroSeen = await homeIntroPage.evaluate(() => window.sessionStorage.getItem('biau-port-harbor-intro:v3'))
const vesselStartEvent = harborIntroEvents.find(
  (event) => event.type === 'animationstart' && event.name === 'harborVesselDock',
)
const vesselEndIndex = harborIntroEvents.findIndex(
  (event) => event.type === 'animationend' && event.name === 'harborVesselDock',
)
const markEndIndex = harborIntroEvents.findIndex((event) => event.type === 'animationend' && event.name === 'harborMarkLand')
const veilEndIndex = harborIntroEvents.findIndex((event) => event.type === 'animationend' && event.name === 'harborIntroVeil')
if (vesselEndIndex < 0 || markEndIndex < 0 || veilEndIndex < 0) {
  failures.push('/ home intro: expected vessel, mark, and veil animation completion events')
} else if (veilEndIndex < vesselEndIndex || veilEndIndex < markEndIndex) {
  failures.push('/ home intro: veil should fade only after vessel and mark finish docking')
} else if (!vesselStartEvent || harborIntroEvents[veilEndIndex].time - vesselStartEvent.time > 3000) {
  failures.push('/ home intro: expected harbor intro animation span to complete within 3s')
}
if (harborIntroSeen !== '1') {
  failures.push('/ home intro: expected completed animation to persist the seen marker')
}
await homeIntroPage.close()

const mobileIntroContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'no-preference',
})
const mobileIntroPage = await mobileIntroContext.newPage()
await mobileIntroPage.addInitScript(() => {
  window.sessionStorage.removeItem('biau-port-harbor-intro:v3')
})
await gotoApp(mobileIntroPage, '/', { waitUntil: 'domcontentloaded' })
await mobileIntroPage.waitForSelector('.harbor-intro__vessel', { timeout: 3000 }).catch(() => {
  failures.push('/ home mobile intro: expected harbor animation to mount on a first mobile visit')
})
const mobileIntroState = await mobileIntroPage.evaluate(() => ({
  active: document.documentElement.classList.contains('harbor-intro-active'),
  seen: window.sessionStorage.getItem('biau-port-harbor-intro:v3'),
}))
if (!mobileIntroState.active || mobileIntroState.seen !== null) {
  failures.push('/ home mobile intro: expected active animation without an early seen marker')
}
await mobileIntroPage.locator('.harbor-intro').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {
  failures.push('/ home mobile intro: expected harbor animation to complete and unmount')
})
const mobileIntroSeen = await mobileIntroPage.evaluate(() => window.sessionStorage.getItem('biau-port-harbor-intro:v3'))
if (mobileIntroSeen !== '1') {
  failures.push('/ home mobile intro: expected completed animation to persist the seen marker')
}
await mobileIntroContext.close()

const homeCarouselPage = await browser.newPage({ viewport: viewports[0] })
await homeCarouselPage.addInitScript(() => {
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
})
await gotoApp(homeCarouselPage, '/')
const carouselViewport = homeCarouselPage.locator('.carousel-viewport')
const carouselTrack = homeCarouselPage.locator('.carousel-track')
await carouselViewport.hover({ force: true })
const initialScrollY = await carouselTrack.evaluate((track) =>
  getComputedStyle(track).getPropertyValue('--carousel-scroll-y').trim()
)
const carouselNativeHintCount = await homeCarouselPage
  .locator('.carousel-card[title], .carousel-card [title], a.carousel-card[href]')
  .count()
if (carouselNativeHintCount > 0) {
  failures.push('/ home carousel: cards should not expose native browser title/url hints')
}
await homeCarouselPage.mouse.wheel(0, 260)
await homeCarouselPage.waitForTimeout(180)
const quickWheelScrollY = await carouselTrack.evaluate((track) =>
  getComputedStyle(track).getPropertyValue('--carousel-scroll-y').trim()
)
if (!quickWheelScrollY || quickWheelScrollY === initialScrollY) {
  failures.push('/ home carousel: expected mouse wheel to update carousel position promptly')
}
await homeCarouselPage.waitForFunction(
  (initial) => {
    const track = document.querySelector('.carousel-track')
    if (!track) return false
    const style = getComputedStyle(track)
    const scrollY = style.getPropertyValue('--carousel-scroll-y').trim()
    return scrollY && scrollY !== initial && style.transform !== 'none'
  },
  initialScrollY,
  { timeout: 2000 },
).catch(() => {
  failures.push('/ home carousel: expected mouse wheel to update carousel transform')
})
const wheelScrollY = await carouselTrack.evaluate((track) =>
  getComputedStyle(track).getPropertyValue('--carousel-scroll-y').trim()
)
if (!wheelScrollY || wheelScrollY === initialScrollY) {
  failures.push('/ home carousel: expected carousel scroll position to change after wheel')
}
await homeCarouselPage.close()

const homeTitleDragPage = await browser.newPage({ viewport: viewports[0] })
await homeTitleDragPage.addInitScript(() => {
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
})
await gotoApp(homeTitleDragPage, '/')
const titleRotator = homeTitleDragPage.locator('.hero-title-rotator')
const titleBeforeDrag = await titleRotator.getAttribute('aria-label')
const titleBox = await titleRotator.boundingBox()
if (!titleBox) {
  failures.push('/ home title drag: expected title rotator to be visible')
} else {
  await homeTitleDragPage.mouse.move(titleBox.x + titleBox.width * 0.38, titleBox.y + titleBox.height * 0.48)
  await homeTitleDragPage.mouse.down()
  await homeTitleDragPage.mouse.move(titleBox.x + titleBox.width * 0.38 + 170, titleBox.y + titleBox.height * 0.48 - 18, {
    steps: 10,
  })
  await homeTitleDragPage.mouse.up()
  await homeTitleDragPage
    .waitForFunction(
      (previous) => {
        const title = document.querySelector('.hero-title-rotator')
        return title?.getAttribute('aria-label') !== previous
      },
      titleBeforeDrag,
      { timeout: 2200 },
    )
    .catch(() => {
      failures.push('/ home title drag: expected drag release to switch hero title')
    })
}
await homeTitleDragPage.close()

const homeCarouselClickPage = await browser.newPage({ viewport: viewports[0] })
await homeCarouselClickPage.addInitScript(() => {
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
})
await gotoApp(homeCarouselClickPage, '/')
await homeCarouselClickPage.locator('.carousel-viewport').hover({ force: true })
await homeCarouselClickPage.waitForTimeout(120)
await homeCarouselClickPage.locator('.carousel-card').filter({ hasText: '法律智能机器人' }).nth(1).click({ force: true })
await homeCarouselClickPage.waitForURL(`${base}/projects/legal-rag`, { timeout: 5000 }).catch(() => {
  failures.push('/ home carousel: expected Legal RAG card click to navigate to project detail')
})
await homeCarouselClickPage.close()

const homeCarouselActionKeyboardPage = await browser.newPage({ viewport: viewports[0] })
await homeCarouselActionKeyboardPage.addInitScript(() => {
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  window.__openedUrls = []
  window.open = (url) => {
    window.__openedUrls.push(String(url))
    return null
  }
})
await gotoApp(homeCarouselActionKeyboardPage, '/')
await homeCarouselActionKeyboardPage.locator('.carousel-viewport').hover({ force: true })
const legalRagAction = homeCarouselActionKeyboardPage
  .getByRole('button', { name: '打开外部项目页面：法律智能机器人' })
  .nth(1)
await legalRagAction.focus()
await homeCarouselActionKeyboardPage.keyboard.press('Enter')
await homeCarouselActionKeyboardPage.waitForTimeout(100)
await homeCarouselActionKeyboardPage.keyboard.press('Space')
await homeCarouselActionKeyboardPage.waitForTimeout(100)
const actionKeyboardResult = await homeCarouselActionKeyboardPage.evaluate(() => ({
  pathname: window.location.pathname,
  openedUrls: window.__openedUrls ?? [],
}))
if (actionKeyboardResult.pathname !== '/') {
  failures.push('/ home carousel: keyboard activation on external action should not navigate to project detail')
}
if (!actionKeyboardResult.openedUrls.some((url) => url === 'https://legal-rag-web.onrender.com')) {
  failures.push('/ home carousel: expected keyboard activation on Legal RAG action to open external link')
}
await homeCarouselActionKeyboardPage.close()

const blogCardKeyboardPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(blogCardKeyboardPage, '/blog')
const firstKeyboardBlogCard = blogCardKeyboardPage.locator('.blog-card[role="link"]').first()
await firstKeyboardBlogCard.focus()
await blogCardKeyboardPage.keyboard.press('Enter')
await blogCardKeyboardPage.waitForURL(/\/blog\/[^/]+$/, { timeout: 5000 }).catch(() => {
  failures.push('/blog keyboard: Enter on a focused blog card should navigate to the article')
})
await blogCardKeyboardPage.close()

for (const width of [320, 390, 430]) {
  const touchContext = await browser.newContext({
    viewport: { width, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
  })
  const touchPage = await touchContext.newPage()
  await touchPage.addInitScript(() => {
    window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    window.__uiCheckPushStateCount = 0
    const originalPushState = window.history.pushState.bind(window.history)
    window.history.pushState = (...args) => {
      window.__uiCheckPushStateCount += 1
      return originalPushState(...args)
    }
  })

  await gotoApp(touchPage, '/')
  const homeCardTouchAction = await touchPage
    .locator('.carousel-card:not([data-loop-copy="true"])')
    .first()
    .evaluate((card) => getComputedStyle(card).touchAction)
  if (homeCardTouchAction !== 'pan-y') {
    failures.push(`/ mobile card feedback ${width}px: home card should preserve vertical panning`)
  }
  const homeEntryTop = await touchPage.locator('.carousel-card:not([data-loop-copy="true"])').first().evaluate((card) => card.getBoundingClientRect().top)
  if (homeEntryTop > 410) {
    failures.push(`/ mobile editorial rhythm ${width}px: first home project should enter the first viewport, got y=${homeEntryTop}`)
  }

  await gotoApp(touchPage, '/projects')
  const projectCardState = await touchPage.locator('.project-card').first().evaluate((card) => ({
    touchAction: getComputedStyle(card).touchAction,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))
  if (projectCardState.touchAction !== 'pan-y' || projectCardState.horizontalOverflow) {
    failures.push(`/ mobile card feedback ${width}px: project cards should be touch-safe and bounded`)
  }
  const projectRhythm = await touchPage.evaluate(() => {
    const toggle = document.querySelector('.project-group-toggle')
    const grid = document.querySelector('.projects-grid')
    if (!(toggle instanceof HTMLElement) || !(grid instanceof HTMLElement)) return null
    const gridStyle = getComputedStyle(grid)
    return {
      entryTop: toggle.getBoundingClientRect().top,
      toggleHeight: toggle.getBoundingClientRect().height,
      gridBorderWidth: Number.parseFloat(gridStyle.borderTopWidth),
      gridShadow: gridStyle.boxShadow,
    }
  })
  if (!projectRhythm || projectRhythm.entryTop > 300 || projectRhythm.toggleHeight < 44 || projectRhythm.gridBorderWidth > 0 || projectRhythm.gridShadow !== 'none') {
    failures.push(`/ mobile editorial rhythm ${width}px: project grouping should be compact, touch-safe, and free of nested-card framing`)
  }

  await gotoApp(touchPage, '/blog')
  const firstBlogCard = touchPage.locator('.blog-card[role="link"]').first()
  const blogCardState = await firstBlogCard.evaluate((card) => {
    const discovery = document.querySelector('.blog-discovery')
    const select = document.querySelector('.blog-column-select__control')
    const search = document.querySelector('.blog-search')
    return {
      touchAction: getComputedStyle(card).touchAction,
      minTransitionMs: getComputedStyle(card)
        .transitionDuration.split(',')
        .map((duration) => Number.parseFloat(duration) * (duration.includes('ms') ? 1 : 1000))
        .filter(Number.isFinite)
        .reduce((minimum, duration) => Math.min(minimum, duration), Number.POSITIVE_INFINITY),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      entryTop: card.getBoundingClientRect().top,
      discoveryDisplay: discovery ? getComputedStyle(discovery).display : '',
      selectHeight: select?.getBoundingClientRect().height ?? 0,
      searchHeight: search?.getBoundingClientRect().height ?? 0,
    }
  })
  if (blogCardState.touchAction !== 'pan-y' || blogCardState.horizontalOverflow) {
    failures.push(`/ mobile card feedback ${width}px: blog cards should be touch-safe and bounded`)
  }
  if (
    blogCardState.entryTop > (width === 320 ? 430 : 410) ||
    blogCardState.discoveryDisplay !== 'grid' ||
    blogCardState.selectHeight < 44 ||
    blogCardState.searchHeight < 44
  ) {
    failures.push(`/ mobile editorial rhythm ${width}px: blog discovery should meet the responsive first-entry boundary`)
  }
  if (!Number.isFinite(blogCardState.minTransitionMs) || blogCardState.minTransitionMs > 100) {
    failures.push(`/ mobile card feedback ${width}px: press feedback should respond within 100ms`)
  }

  const pushesBeforeButton = await touchPage.evaluate(() => window.__uiCheckPushStateCount ?? 0)
  await firstBlogCard.locator('button').click()
  await touchPage.waitForURL(/\/blog\/[^/]+$/, { timeout: 5000 }).catch(() => {
    failures.push(`/ mobile card feedback ${width}px: blog button should navigate to the article`)
  })
  const pushesAfterButton = await touchPage.evaluate(() => window.__uiCheckPushStateCount ?? 0)
  if (pushesAfterButton - pushesBeforeButton !== 1) {
    failures.push(`/ mobile card feedback ${width}px: nested blog button should trigger exactly one navigation`)
  }

  await gotoApp(touchPage, '/blog')
  const pushesBeforeCard = await touchPage.evaluate(() => window.__uiCheckPushStateCount ?? 0)
  await touchPage.locator('.blog-card[role="link"]').first().locator('.blog-title').click()
  await touchPage.waitForURL(/\/blog\/[^/]+$/, { timeout: 5000 }).catch(() => {
    failures.push(`/ mobile card feedback ${width}px: tapping blog card content should navigate to the article`)
  })
  const pushesAfterCard = await touchPage.evaluate(() => window.__uiCheckPushStateCount ?? 0)
  if (pushesAfterCard - pushesBeforeCard !== 1) {
    failures.push(`/ mobile card feedback ${width}px: blog card content should trigger exactly one navigation`)
  }

  await touchContext.close()
}
const keyboardPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(keyboardPage, '/projects')
for (let index = 0; index < 20; index += 1) {
  const focusedProject = await keyboardPage.evaluate(() => document.activeElement?.classList.contains('project-card'))
  if (focusedProject) break
  await keyboardPage.keyboard.press('Tab')
}
const focusedProject = await keyboardPage.evaluate(() => document.activeElement?.classList.contains('project-card'))
if (!focusedProject) {
  failures.push('/projects keyboard: expected Tab to reach a project card')
} else {
  await keyboardPage.keyboard.press('Enter')
  await keyboardPage.waitForURL(/\/projects\/[^/]+$/, { timeout: 5000 }).catch(() => {
    failures.push('/projects keyboard: Enter on focused project card did not navigate to detail page')
  })
}
await keyboardPage.close()

const projectsMobileActionPage = await browser.newPage({ viewport: viewports[1] })
await gotoApp(projectsMobileActionPage, '/projects')
const legalRagMobileCard = projectsMobileActionPage.locator('.project-card').filter({ hasText: 'Legal RAG' }).first()
const mobileFooterVisible = await legalRagMobileCard.locator('.project-footer').isVisible().catch(() => false)
const mobileDetailButtonVisible = await legalRagMobileCard
  .getByRole('button', { name: '查看项目详情：Legal RAG｜法律智能机器人与合同审查' })
  .isVisible()
  .catch(() => false)
const mobileExternalLink = legalRagMobileCard.getByRole('link', { name: '在线工作台' }).first()
const mobileExternalLinkVisible = await mobileExternalLink.isVisible().catch(() => false)
const mobileExternalHref = await mobileExternalLink.getAttribute('href').catch(() => null)
const mobileExternalTarget = await mobileExternalLink.getAttribute('target').catch(() => null)
const mobileExternalRel = await mobileExternalLink.getAttribute('rel').catch(() => null)
if (!mobileFooterVisible) {
  failures.push('/projects mobile actions: expected project card footer to stay visible')
}
if (!mobileDetailButtonVisible) {
  failures.push('/projects mobile actions: expected visible detail button in project card footer')
}
if (!mobileExternalLinkVisible) {
  failures.push('/projects mobile actions: expected visible external project link in project card footer')
}
if (mobileExternalHref !== 'https://legal-rag-web.onrender.com') {
  failures.push(`/projects mobile actions: expected Legal RAG external href, got "${mobileExternalHref}"`)
}
if (mobileExternalTarget !== '_blank') {
  failures.push(`/projects mobile actions: expected external link target _blank, got "${mobileExternalTarget}"`)
}
if (mobileExternalRel !== 'noopener noreferrer') {
  failures.push(`/projects mobile actions: expected external link rel noopener noreferrer, got "${mobileExternalRel}"`)
}
const popupPromise = projectsMobileActionPage.waitForEvent('popup', { timeout: 3000 }).catch(() => null)
await mobileExternalLink.click()
const mobileExternalPopup = await popupPromise
if (mobileExternalPopup) await mobileExternalPopup.close()
const mobileActionPathname = await projectsMobileActionPage.evaluate(() => window.location.pathname)
if (mobileActionPathname !== '/projects') {
  failures.push('/projects mobile actions: external link click should not navigate the card to a detail page')
}
await projectsMobileActionPage.close()

const projectDetailButtonKeyboardPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(projectDetailButtonKeyboardPage, '/projects')
await projectDetailButtonKeyboardPage
  .getByRole('button', { name: '查看项目详情：Legal RAG｜法律智能机器人与合同审查' })
  .press('Enter')
await projectDetailButtonKeyboardPage.waitForURL(`${base}/projects/legal-rag`, { timeout: 5000 }).catch(() => {
  failures.push('/projects keyboard: Enter on project detail button did not navigate to detail page')
})
await projectDetailButtonKeyboardPage.close()

const imagePage = await browser.newPage({ viewport: viewports[1] })
await gotoApp(imagePage, '/projects/legal-rag')
const heroImage = imagePage.locator('.detail-hero-image img')
const heroImageReady = await waitForImageReady(heroImage)
const imageOk = heroImageReady && (await heroImage.evaluate((image) => {
  const img = image instanceof HTMLImageElement ? image : null
  if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return false
  const rect = img.getBoundingClientRect()
  return rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1
}))
const webpSource = await imagePage.locator('.detail-hero-image source[type="image/webp"]').getAttribute('srcset')
if (!imageOk) {
  failures.push('/projects/legal-rag image: detail image did not load or overflowed horizontally')
}
if (!webpSource?.endsWith('.webp')) {
  failures.push('/projects/legal-rag image: expected webp source fallback picture')
}
await imagePage.close()

const originalImageLinkPage = await browser.newPage({ viewport: viewports[1] })
await gotoApp(originalImageLinkPage, '/projects/xunqiu')
const originalImageLink = originalImageLinkPage.getByRole('link', { name: /打开 .+ 项目截图原图/ })
const originalImageHref = await originalImageLink.getAttribute('href')
const originalImageTarget = await originalImageLink.getAttribute('target')
const originalImageRel = await originalImageLink.getAttribute('rel')
const originalImageActionVisible = await originalImageLink.locator('.detail-hero-image-action').isVisible().catch(() => false)
const originalImageMobileMetrics = await originalImageLinkPage.evaluate(() => {
  const imageLink = document.querySelector('.detail-hero-image')
  const action = document.querySelector('.detail-hero-image-action')
  if (!(imageLink instanceof HTMLElement) || !(action instanceof HTMLElement)) return null
  const imageRect = imageLink.getBoundingClientRect()
  const actionRect = action.getBoundingClientRect()
  return {
    imageHeight: Math.round(imageRect.height),
    actionTop: Math.round(actionRect.top),
    actionBottom: Math.round(actionRect.bottom),
    viewportHeight: window.innerHeight,
  }
})
if (!originalImageHref?.endsWith('/images/projects/showcase/xunqiu-android64-runtime.png')) {
  failures.push(`/projects/xunqiu original image: expected hero link to point to project image, got "${originalImageHref}"`)
}
if (originalImageTarget !== '_blank') {
  failures.push(`/projects/xunqiu original image: expected target _blank, got "${originalImageTarget}"`)
}
if (originalImageRel !== 'noopener noreferrer') {
  failures.push(`/projects/xunqiu original image: expected rel noopener noreferrer, got "${originalImageRel}"`)
}
if (!originalImageActionVisible) {
  failures.push('/projects/xunqiu original image: expected visible open-original affordance')
}
if (!originalImageMobileMetrics) {
  failures.push('/projects/xunqiu original image: expected measurable mobile image metrics')
} else {
  if (originalImageMobileMetrics.imageHeight > 390) {
    failures.push(
      `/projects/xunqiu original image: expected compact mobile preview height, got ${originalImageMobileMetrics.imageHeight}`,
    )
  }
  if (
    originalImageMobileMetrics.actionTop < 0 ||
    originalImageMobileMetrics.actionBottom > originalImageMobileMetrics.viewportHeight
  ) {
    failures.push('/projects/xunqiu original image: expected open-original affordance inside first mobile viewport')
  }
}
await originalImageLinkPage.close()

for (const project of projectDetailVisualCases) {
  const projectVisualPage = await browser.newPage({ viewport: viewports[0] })
  await gotoApp(projectVisualPage, `/projects/${project.id}`)

  const visualFigures = projectVisualPage.locator('.project-case-study .project-visual')
  const renderedVisualCount = await visualFigures.count()
  const visibleVisualCount = await projectVisualPage.locator('.project-case-study .project-visual:visible').count()
  const visualImages = projectVisualPage.locator('.project-case-study .project-visual__image img')
  const renderedImageCount = await visualImages.count()
  const visualCaptions = projectVisualPage.locator('.project-case-study .project-visual__caption')
  const renderedCaptionCount = await visualCaptions.count()
  const visualSourceLinks = projectVisualPage.locator('.project-case-study .project-visual__source-link')
  const renderedSourceLinkCount = await visualSourceLinks.count()
  const renderedAltTexts = await visualImages.evaluateAll((images) =>
    images.map((image) => image.getAttribute('alt')?.trim() ?? ''),
  )
  const renderedCaptionTexts = await visualCaptions.evaluateAll((captions) =>
    captions.map((caption) => caption.textContent?.trim() ?? ''),
  )
  const hasHorizontalOverflow = await projectVisualPage.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )

  if (project.expectedVisuals < 2) {
    failures.push(`/projects/${project.id} case visuals: expected project data to define at least 2 body visuals`)
  }
  if (renderedVisualCount !== project.expectedVisuals) {
    failures.push(
      `/projects/${project.id} case visuals: expected ${project.expectedVisuals} body visuals from project data, got ${renderedVisualCount}`,
    )
  }
  if (visibleVisualCount !== project.expectedVisuals) {
    failures.push(
      `/projects/${project.id} case visuals: expected ${project.expectedVisuals} visible body visuals, got ${visibleVisualCount}`,
    )
  }
  if (renderedImageCount !== project.expectedVisualImages) {
    failures.push(
      `/projects/${project.id} case visuals: expected ${project.expectedVisualImages} visual images, got ${renderedImageCount}`,
    )
  }
  if (renderedCaptionCount !== project.expectedVisualCaptions.length) {
    failures.push(
      `/projects/${project.id} case visuals: expected ${project.expectedVisualCaptions.length} visual captions, got ${renderedCaptionCount}`,
    )
  }
  if (renderedSourceLinkCount !== project.expectedVisualSourceLinks) {
    failures.push(
      `/projects/${project.id} case visuals: expected ${project.expectedVisualSourceLinks} visual source links, got ${renderedSourceLinkCount}`,
    )
  }
  for (const expectedAltText of project.expectedVisualAltTexts) {
    if (!renderedAltTexts.includes(expectedAltText)) {
      failures.push(`/projects/${project.id} case visuals: expected rendered image alt "${expectedAltText}"`)
    }
  }
  for (const expectedCaption of project.expectedVisualCaptions) {
    if (!renderedCaptionTexts.some((caption) => caption.includes(expectedCaption))) {
      failures.push(`/projects/${project.id} case visuals: expected visible caption "${expectedCaption}"`)
    }
  }
  if (hasHorizontalOverflow) {
    failures.push(`/projects/${project.id} case visuals: project detail page should not overflow horizontally`)
  }

  for (let index = 0; index < renderedImageCount; index += 1) {
    const visualImage = visualImages.nth(index)
    const isReady = await waitForImageReady(visualImage)
    const metrics = isReady
      ? await visualImage.evaluate((image) => {
      const img = image instanceof HTMLImageElement ? image : null
      if (!img) return null
      const rect = img.getBoundingClientRect()
      return {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        viewportWidth: document.documentElement.clientWidth,
      }
    })
      : null

    if (!metrics || !metrics.complete || metrics.naturalWidth === 0 || metrics.naturalHeight === 0) {
      failures.push(`/projects/${project.id} case visuals: visual image ${index + 1} did not load`)
      continue
    }
    if (metrics.left < -1 || metrics.right > metrics.viewportWidth + 1) {
      failures.push(`/projects/${project.id} case visuals: visual image ${index + 1} overflows horizontally`)
    }
  }

  await projectVisualPage.close()
}

const detailQuickLinksPage = await browser.newPage({ viewport: viewports[1] })
await gotoApp(detailQuickLinksPage, '/projects/legal-rag')
const legalQuickLinks = detailQuickLinksPage.locator('.detail-header .detail-quick-links')
const legalQuickLinkCount = await legalQuickLinks.locator('a.link-badge').count()
const legalQuickExternal = legalQuickLinks.getByRole('link', { name: '在线工作台' }).first()
const legalQuickInternal = legalQuickLinks.getByRole('link', { name: '项目复盘' }).first()
const legalQuickExternalVisible = await legalQuickExternal.isVisible().catch(() => false)
const legalQuickInternalVisible = await legalQuickInternal.isVisible().catch(() => false)
const legalQuickExternalTarget = await legalQuickExternal.getAttribute('target').catch(() => null)
const legalQuickExternalRel = await legalQuickExternal.getAttribute('rel').catch(() => null)
const legalQuickExternalClass = await legalQuickExternal.getAttribute('class').catch(() => '')
const legalQuickExternalType = await legalQuickExternal.getAttribute('data-link-type').catch(() => null)
const legalQuickInternalHref = await legalQuickInternal.getAttribute('href').catch(() => null)
const legalQuickInternalTarget = await legalQuickInternal.getAttribute('target').catch(() => null)
const legalQuickInternalClass = await legalQuickInternal.getAttribute('class').catch(() => '')
const legalQuickInternalType = await legalQuickInternal.getAttribute('data-link-type').catch(() => null)
const legalQuickLinksBeforeImage = await detailQuickLinksPage.evaluate(() => {
  const quickLinks = document.querySelector('.detail-header .detail-quick-links')
  const image = document.querySelector('.detail-hero-image')
  if (!quickLinks || !image) return false
  return quickLinks.getBoundingClientRect().bottom < image.getBoundingClientRect().top
})
const legalLowerLinkCount = await detailQuickLinksPage.locator('.detail-body .detail-links a.link-badge').count()
const legalLowerExternalClass = await detailQuickLinksPage
  .locator('.detail-body .detail-links a.link-badge')
  .filter({ hasText: '在线工作台' })
  .first()
  .getAttribute('class')
  .catch(() => '')
const legalLowerInternalClass = await detailQuickLinksPage
  .locator('.detail-body .detail-links a.link-badge')
  .filter({ hasText: '项目复盘' })
  .first()
  .getAttribute('class')
  .catch(() => '')
if (legalQuickLinkCount < 4) {
  failures.push(`/projects/legal-rag quick links: expected header to expose existing links, got ${legalQuickLinkCount}`)
}
if (!legalQuickExternalVisible || !legalQuickInternalVisible) {
  failures.push('/projects/legal-rag quick links: expected external and internal quick links to be visible')
}
if (legalQuickExternalTarget !== '_blank') {
  failures.push(`/projects/legal-rag quick links: expected external target _blank, got "${legalQuickExternalTarget}"`)
}
if (legalQuickExternalRel !== 'noopener noreferrer') {
  failures.push(`/projects/legal-rag quick links: expected external rel noopener noreferrer, got "${legalQuickExternalRel}"`)
}
if (!legalQuickExternalClass?.includes('link-badge--external') || legalQuickExternalType !== 'external') {
  failures.push('/projects/legal-rag quick links: expected external quick link affordance')
}
if (legalQuickInternalHref !== '/blog/legal-rag-review' || legalQuickInternalTarget) {
  failures.push('/projects/legal-rag quick links: expected internal quick link to stay an SPA route without target')
}
if (!legalQuickInternalClass?.includes('link-badge--internal') || legalQuickInternalType !== 'internal') {
  failures.push('/projects/legal-rag quick links: expected internal quick link affordance')
}
if (!legalQuickLinksBeforeImage) {
  failures.push('/projects/legal-rag quick links: expected header quick links before project screenshot')
}
if (legalLowerLinkCount < 4) {
  failures.push(`/projects/legal-rag quick links: expected lower related links block to remain, got ${legalLowerLinkCount}`)
}
if (!legalLowerExternalClass?.includes('link-badge--external') || !legalLowerInternalClass?.includes('link-badge--internal')) {
  failures.push('/projects/legal-rag quick links: expected lower links to keep external/internal affordance')
}
await detailQuickLinksPage.close()

const xunqiuQuickLinksPage = await browser.newPage({ viewport: viewports[1] })
await gotoApp(xunqiuQuickLinksPage, '/projects/xunqiu')
const xunqiuQuickLinks = xunqiuQuickLinksPage.locator('.detail-header .detail-quick-links')
for (const label of ['产品展示页', '技术文档']) {
  if (!(await xunqiuQuickLinks.getByRole('link', { name: label }).first().isVisible().catch(() => false))) {
    failures.push(`/projects/xunqiu quick links: expected visible "${label}" quick link`)
  }
}
if (await xunqiuQuickLinks.getByRole('link', { name: '阶段 APK' }).count()) {
  failures.push('/projects/xunqiu quick links: unapproved stage APK link should not be public')
}
const xunqiuQuickLinksBeforeImage = await xunqiuQuickLinksPage.evaluate(() => {
  const quickLinks = document.querySelector('.detail-header .detail-quick-links')
  const image = document.querySelector('.detail-hero-image')
  if (!quickLinks || !image) return false
  return quickLinks.getBoundingClientRect().bottom < image.getBoundingClientRect().top
})
if (!xunqiuQuickLinksBeforeImage) {
  failures.push('/projects/xunqiu quick links: expected header quick links before project screenshot')
}
await xunqiuQuickLinksPage.close()

for (const projectId of ['ozon-erp', 'xunqiu']) {
  const projectPath = `/projects/${projectId}`
  const relatedPage = await browser.newPage({ viewport: viewports[0] })
  await gotoApp(relatedPage, projectPath)

  const relatedSection = relatedPage
    .locator('.detail-related', {
      has: relatedPage.locator('.detail-block-title', { hasText: '相关项目' }),
    })
    .first()
  const relatedSectionCount = await relatedSection.count()

  if (relatedSectionCount === 0) {
    failures.push(`${projectPath} related projects: expected a section titled 相关项目`)
    await relatedPage.close()
    continue
  }

  const relatedTitle = (await relatedSection.locator('.detail-block-title').innerText()).trim()
  const relatedCards = relatedSection.locator('.detail-related-card')
  const relatedCardCount = await relatedCards.count()

  if (relatedTitle !== '相关项目') {
    failures.push(`${projectPath} related projects: expected title 相关项目, got "${relatedTitle}"`)
  }

  if (relatedCardCount < 1 || relatedCardCount > 3) {
    failures.push(`${projectPath} related projects: expected 1-3 cards, got ${relatedCardCount}`)
  }

  const relatedHrefs = await relatedCards.evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('href') ?? ''),
  )
  if (relatedHrefs.some((href) => href === projectPath)) {
    failures.push(`${projectPath} related projects: should not link to itself`)
  }

  if (relatedCardCount > 0) {
    await relatedCards.first().click()
    await relatedPage
      .waitForURL((url) => url.pathname.startsWith('/projects/') && url.pathname !== projectPath, { timeout: 5000 })
      .catch(() => {
        failures.push(`${projectPath} related projects: first card did not navigate to another project detail page`)
      })
  }

  await relatedPage.close()
}

const projectDetailInternalLinkPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(projectDetailInternalLinkPage, '/projects/legal-rag')
const projectDetailSpaMarker = await projectDetailInternalLinkPage.evaluate(() => {
  window.__projectDetailSpaMarker = `project-detail-${Date.now()}`
  return window.__projectDetailSpaMarker
})
await projectDetailInternalLinkPage.locator('.detail-links a.link-badge[href="/blog/legal-rag-review"]').first().click()
await projectDetailInternalLinkPage.waitForURL(`${base}/blog/legal-rag-review`, { timeout: 5000 }).catch(() => {
  failures.push('/projects/legal-rag internal link: expected project review link to navigate to blog route')
})
const projectDetailSpaMarkerAfter = await projectDetailInternalLinkPage.evaluate(() => window.__projectDetailSpaMarker)
if (projectDetailSpaMarkerAfter !== projectDetailSpaMarker) {
  failures.push('/projects/legal-rag internal link: expected internal link to preserve SPA page context')
}
await projectDetailInternalLinkPage.close()

const readingGuideRoutes = ['/blog/legal-rag-review', '/projects/legal-rag', '/status/legal-rag']
const readingGuideViewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile-320', width: 320, height: 900 },
  { name: 'mobile-390-reduced', width: 390, height: 900, reducedMotion: true },
  { name: 'mobile-430', width: 430, height: 900 },
]

for (const viewport of readingGuideViewports) {
  for (const path of readingGuideRoutes) {
    const readingPage = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
    if (viewport.reducedMotion) await readingPage.emulateMedia({ reducedMotion: 'reduce' })
    await readingPage.addInitScript(() => {
      window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    })
    await gotoApp(readingPage, path)

    const guide = readingPage.locator('.detail-reading-guide')
    const toggle = guide.locator('.detail-reading-guide__toggle')
    const outline = guide.locator('.detail-reading-guide__outline')
    const outlineLinks = outline.locator('a')
    if (!(await guide.isVisible().catch(() => false))) {
      failures.push(`${path} ${viewport.name}: expected a visible detail reading guide`)
      await readingPage.close()
      continue
    }

    const initialGuideState = await guide.evaluate((element) => {
      const toggleElement = element.querySelector('.detail-reading-guide__toggle')
      const progress = element.querySelector('[role="progressbar"]')
      const links = [...element.querySelectorAll('.detail-reading-guide__outline a')]
      const targetIds = links.map((link) => link.getAttribute('href')?.slice(1) ?? '')
      const rect = element.getBoundingClientRect()
      return {
        expanded: toggleElement?.getAttribute('aria-expanded'),
        progress: Number(progress?.getAttribute('aria-valuenow')),
        targetIds,
        missingTargets: targetIds.filter((id) => !id || !document.getElementById(id)),
        duplicateTargets: targetIds.length - new Set(targetIds).size,
        left: rect.left,
        right: rect.right,
        viewportWidth: document.documentElement.clientWidth,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })

    if (initialGuideState.expanded !== 'false' || initialGuideState.progress < 0) {
      failures.push(`${path} ${viewport.name}: reading guide should start collapsed with measurable progress`)
    }
    if (
      initialGuideState.targetIds.length < 5 ||
      initialGuideState.missingTargets.length > 0 ||
      initialGuideState.duplicateTargets > 0
    ) {
      failures.push(`${path} ${viewport.name}: outline targets should be unique, existing, and cover major sections`)
    }
    if (
      initialGuideState.left < -1 ||
      initialGuideState.right > initialGuideState.viewportWidth + 1 ||
      initialGuideState.horizontalOverflow
    ) {
      failures.push(`${path} ${viewport.name}: reading guide should stay inside the viewport without page overflow`)
    }

    if (viewport.width <= 720) {
      await readingPage.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto'
        window.scrollTo(0, Math.min(640, document.documentElement.scrollHeight - window.innerHeight - 160))
      })
      await readingPage
        .waitForFunction(() => {
          const guide = document.querySelector('.detail-reading-guide')
          const shell = guide?.querySelector('.detail-reading-guide__shell')
          return Boolean(
            guide?.classList.contains('is-auto-hidden') &&
              shell &&
              Number.parseFloat(getComputedStyle(shell).opacity) <= 0.05,
          )
        })
        .catch(() => failures.push(`${path} ${viewport.name}: downward reading should hide the collapsed guide`))
      const hiddenGuideState = await guide.evaluate((element) => {
        const shell = element.querySelector('.detail-reading-guide__shell')
        const style = shell ? getComputedStyle(shell) : null
        return {
          pointerEvents: style?.pointerEvents,
          opacity: Number.parseFloat(style?.opacity ?? '1'),
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        }
      })
      if (
        hiddenGuideState.pointerEvents !== 'none' ||
        hiddenGuideState.opacity > 0.05 ||
        hiddenGuideState.horizontalOverflow
      ) {
        failures.push(`${path} ${viewport.name}: hidden guide should not leave an interactive transparent layer`)
      }

      await readingPage.evaluate(() => window.scrollBy(0, -120))
      await readingPage
        .waitForFunction(() => !document.querySelector('.detail-reading-guide')?.classList.contains('is-auto-hidden'))
        .catch(() => failures.push(`${path} ${viewport.name}: upward reading should reveal the guide`))
      await readingPage.evaluate(() => window.scrollTo(0, 0))
    } else {
      await readingPage.evaluate(() => window.scrollTo(0, 640))
      if (await guide.evaluate((element) => element.classList.contains('is-auto-hidden'))) {
        failures.push(`${path} ${viewport.name}: desktop reading guide should never auto-hide`)
      }
      await readingPage.evaluate(() => window.scrollTo(0, 0))
    }
    await toggle.click()
    await readingPage
      .waitForFunction(() => {
        const element = document.querySelector('.detail-reading-guide__outline')
        if (!element || element.hasAttribute('hidden')) return false
        const rect = element.getBoundingClientRect()
        return rect.top >= -1 && rect.bottom <= window.innerHeight + 1
      })
      .catch(() => {})
    const openState = await outline.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return {
        hidden: element.hasAttribute('hidden'),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: window.innerHeight,
      }
    })
    if (
      openState.hidden ||
      openState.left < -1 ||
      openState.right > openState.viewportWidth + 1 ||
      openState.top < -1 ||
      openState.bottom > openState.viewportHeight + 1
    ) {
      failures.push(`${path} ${viewport.name}: open reading outline should remain fully operable inside the viewport`)
    }

    if (viewport.width <= 720) {
      await readingPage.evaluate(() => window.scrollBy(0, 180))
      await readingPage.waitForTimeout(80)
      if (await guide.evaluate((element) => element.classList.contains('is-auto-hidden'))) {
        failures.push(`${path} ${viewport.name}: an open reading outline should not auto-hide`)
      }
    }
    await readingPage.keyboard.press('Escape')
    if ((await toggle.getAttribute('aria-expanded')) !== 'false' || !(await toggle.evaluate((element) => element === document.activeElement))) {
      failures.push(`${path} ${viewport.name}: Escape should close the outline and restore toggle focus`)
    }

    await toggle.click()
    const targetLink = outlineLinks.last()
    const targetId = ((await targetLink.getAttribute('href')) ?? '').slice(1)
    const scrollBeforeNavigate = await readingPage.evaluate(() => window.scrollY)
    await targetLink.click()
    await readingPage
      .waitForFunction(
        (id) => document.querySelector('.detail-reading-guide')?.getAttribute('data-active-section') === id,
        targetId,
      )
      .catch(() => failures.push(`${path} ${viewport.name}: selected outline target should become the current section`))
    const navigationState = await readingPage.evaluate(() => ({
      scrollY: window.scrollY,
      expanded: document.querySelector('.detail-reading-guide__toggle')?.getAttribute('aria-expanded'),
    }))
    if (navigationState.scrollY <= scrollBeforeNavigate || navigationState.expanded !== 'false') {
      failures.push(`${path} ${viewport.name}: outline navigation should scroll forward and close the panel`)
    }

    if (viewport.width <= 720) {
      await readingPage.evaluate(() => window.scrollBy(0, -120))
      await readingPage
        .waitForFunction(() => !document.querySelector('.detail-reading-guide')?.classList.contains('is-auto-hidden'))
        .catch(() => failures.push(`${path} ${viewport.name}: guide should return before reopening after anchor navigation`))
    }    await toggle.click()
    await readingPage.mouse.click(2, 2)
    if ((await toggle.getAttribute('aria-expanded')) !== 'false') {
      failures.push(`${path} ${viewport.name}: outside pointer interaction should close the outline`)
    }

    await readingPage.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await readingPage
      .waitForFunction(() => Number(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')) >= 95)
      .catch(() => failures.push(`${path} ${viewport.name}: reading progress should reach at least 95% at page bottom`))

    await readingPage.close()
  }
}

for (const path of ['/blog/missing-reading-guide', '/projects/missing-reading-guide']) {
  const missingDetailPage = await browser.newPage({ viewport: { width: 390, height: 900 } })
  await gotoApp(missingDetailPage, path)
  if ((await missingDetailPage.locator('.detail-reading-guide').count()) !== 0) {
    failures.push(`${path}: missing detail states should not render an empty reading guide`)
  }
  await missingDetailPage.close()
}

for (const width of [320, 390, 430]) {
  const mobileHomePage = await browser.newPage({ viewport: { width, height: 900 } })
  await mobileHomePage.addInitScript(() => {
    window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  })
  await gotoApp(mobileHomePage, '/')
  await mobileHomePage.waitForTimeout(160)

  const mobileLayout = await mobileHomePage.evaluate(() => {
    const brand = document.querySelector('.nav-brand-section')
    const actions = document.querySelector('.nav-actions')
    const inner = document.querySelector('.nav-inner')
    const navItems = document.querySelector('.nav-items-center')
    const languageButton = document.querySelector('.nav-lang-toggle')
    const title = document.querySelector('.hero-title-rotator')
    const viewport = document.querySelector('.carousel-viewport')
    const track = document.querySelector('.carousel-track')
    const cards = [...document.querySelectorAll('.carousel-card')]
    const visibleCards = cards.filter((card) => window.getComputedStyle(card).display !== 'none')
    if (!brand || !actions || !inner || !navItems || !languageButton || !title || !viewport || !track) return null

    const brandRect = brand.getBoundingClientRect()
    const actionsRect = actions.getBoundingClientRect()
    const innerRect = inner.getBoundingClientRect()
    const cardRects = visibleCards.map((card) => {
      const rect = card.getBoundingClientRect()
      const action = card.querySelector('.carousel-action')
      const actionRect = action?.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        hasAction: Boolean(actionRect),
        actionWidth: actionRect?.width ?? 0,
        actionHeight: actionRect?.height ?? 0,
        actionRight: actionRect?.right ?? rect.right,
      }
    })

    return {
      brandRight: Math.round(brandRect.right),
      actionsLeft: Math.round(actionsRect.left),
      innerLeft: Math.round(innerRect.left),
      innerRight: Math.round(innerRect.right),
      viewportWidth: document.documentElement.clientWidth,
      navItemsDisplay: window.getComputedStyle(navItems).display,
      languageDisplay: window.getComputedStyle(languageButton).display,
      titleTouchAction: window.getComputedStyle(title).touchAction,
      carouselOverflowX: window.getComputedStyle(viewport).overflowX,
      carouselTouchAction: window.getComputedStyle(viewport).touchAction,
      carouselDirection: window.getComputedStyle(track).flexDirection,
      carouselTransform: window.getComputedStyle(track).transform,
      visibleCardCount: visibleCards.length,
      portIndices: visibleCards.map((card) => card.getAttribute('data-port-index')),
      cardRects,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })

  if (!mobileLayout) {
    failures.push(`/ home mobile ${width}px: expected measurable navigation and carousel layout`)
    await mobileHomePage.close()
    continue
  }
  if (mobileLayout.brandRight > mobileLayout.actionsLeft) {
    failures.push(`/ home mobile ${width}px: navigation brand overlaps actions`)
  }
  if (mobileLayout.innerLeft < -1 || mobileLayout.innerRight > mobileLayout.viewportWidth + 1) {
    failures.push(`/ home mobile ${width}px: navigation shell exceeds viewport`)
  }
  if (mobileLayout.navItemsDisplay !== 'none' || mobileLayout.languageDisplay === 'none') {
    failures.push(`/ home mobile ${width}px: desktop links should collapse while the language control remains available`)
  }
  if (!mobileLayout.titleTouchAction.includes('pan-y')) {
    failures.push(`/ home mobile ${width}px: title should preserve vertical page panning`)
  }
  if (['auto', 'scroll'].includes(mobileLayout.carouselOverflowX)) {
    failures.push(`/ home mobile ${width}px: project manifest should not own horizontal scrolling`)
  }
  if (!mobileLayout.carouselTouchAction.includes('pan-y') || mobileLayout.carouselDirection !== 'column') {
    failures.push(`/ home mobile ${width}px: project manifest should allow page panning and use a vertical column`)
  }
  if (mobileLayout.carouselTransform !== 'none') {
    failures.push(`/ home mobile ${width}px: desktop vertical transform should be disabled`)
  }
  if (mobileLayout.visibleCardCount !== heroContent.projects.length) {
    failures.push(
      `/ home mobile ${width}px: expected ${heroContent.projects.length} unique project cards, got ${mobileLayout.visibleCardCount}`,
    )
  }
  const expectedPortIndices = heroContent.projects.map((_, index) => String(index + 1).padStart(2, '0'))
  if (mobileLayout.portIndices.join(',') !== expectedPortIndices.join(',')) {
    failures.push(`/ home mobile ${width}px: project manifest should use one continuous port index sequence`)
  }
  const cardsStayBounded = mobileLayout.cardRects.every(
    (rect) => rect.left >= -1 && rect.right <= mobileLayout.viewportWidth + 1 && rect.actionRight <= mobileLayout.viewportWidth + 1,
  )
  const cardsDoNotOverlap = mobileLayout.cardRects.every(
    (rect, index, rects) => index === 0 || rect.top >= rects[index - 1].bottom - 1,
  )
  const actionsAreOperable = mobileLayout.cardRects.every(
    (rect) => !rect.hasAction || (rect.actionWidth >= 40 && rect.actionHeight >= 40),
  )
  if (!cardsStayBounded || !cardsDoNotOverlap) {
    failures.push(`/ home mobile ${width}px: project rows should stay in the viewport and form a non-overlapping column`)
  }
  if (!actionsAreOperable) {
    failures.push(`/ home mobile ${width}px: project external actions should remain visible and at least 40px`)
  }
  if (mobileLayout.horizontalOverflow) {
    failures.push(`/ home mobile ${width}px: page should not overflow horizontally`)
  }

  const menuToggle = mobileHomePage.getByRole('button', { name: /导航菜单/ })
  if (await menuToggle.isVisible().catch(() => false)) {
    failures.push(`/ home mobile ${width}px: bottom navigation should replace the redundant menu button`)
  }
  const languageToggle = mobileHomePage.locator('.nav-lang-toggle')
  const languageToggleBox = await languageToggle.boundingBox()
  if (!languageToggleBox || languageToggleBox.width < 43.5 || languageToggleBox.height < 43.5) {
    failures.push(`/ home mobile ${width}px: language control should remain visible and touch-sized`)
  }
  const title = mobileHomePage.locator('.hero-title-rotator')
  const titleBefore = await title.getAttribute('aria-label')
  await title.click()
  await mobileHomePage
    .waitForFunction((previous) => document.querySelector('.hero-title-rotator')?.getAttribute('aria-label') !== previous, titleBefore)
    .catch(() => failures.push(`/ home mobile ${width}px: tapping the title should switch the poem`))

  const footer = mobileHomePage.locator('.site-footer')
  await footer.scrollIntoViewIfNeeded()
  await mobileHomePage
    .waitForFunction(() => {
      const trigger = document.querySelector('.public-assistant__trigger')
      if (!trigger) return false
      const style = getComputedStyle(trigger)
      return Number.parseFloat(style.opacity) <= 0.05 && style.pointerEvents === 'none'
    })
    .catch(() => {})
  const trustLabelsVisible = await Promise.all(
    ['项目性质', '隐私说明', '免责声明', '联系方式'].map((label) =>
      footer.getByText(label, { exact: true }).isVisible().catch(() => false),
    ),
  )
  if (trustLabelsVisible.some((visible) => !visible)) {
    failures.push(`/ home mobile ${width}px: expected complete site trust footer`)
  }
  const assistantTriggerAtFooter = await mobileHomePage.locator('.public-assistant__trigger').evaluate((trigger) => ({
    opacity: Number.parseFloat(getComputedStyle(trigger).opacity),
    pointerEvents: getComputedStyle(trigger).pointerEvents,
  }))
  if (assistantTriggerAtFooter.opacity > 0.05 || assistantTriggerAtFooter.pointerEvents !== 'none') {
    failures.push(`/ home mobile ${width}px: collapsed assistant trigger should not cover footer content`)
  }

  await mobileHomePage.close()
}

const mobileDetailRoutes = ['/blog/legal-rag-review', '/projects/legal-rag']

for (const width of [320, 390, 430]) {
  for (const path of mobileDetailRoutes) {
    const mobileDetailPage = await browser.newPage({ viewport: { width, height: 900 } })
    await mobileDetailPage.addInitScript(() => {
      window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
    })
    await gotoApp(mobileDetailPage, path)

    const readingLayout = await mobileDetailPage.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      const app = document.querySelector('.app.page-detail')
      const detailBody = document.querySelector('.detail-body')
      const bodyText = document.querySelector('.blog-post-body-text, .detail-highlights li')
      if (!(app instanceof HTMLElement) || !(detailBody instanceof HTMLElement) || !(bodyText instanceof HTMLElement)) {
        return null
      }

      const viewportWidth = document.documentElement.clientWidth
      const boundedElements = [
        ...document.querySelectorAll(
          '.detail-page .detail-body, .detail-page .detail-block, .detail-page .blog-post-section, .detail-page .project-visual, .detail-page figure, .detail-page img, .detail-page pre, .detail-page table',
        ),
      ].filter((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      const outOfBounds = boundedElements.filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.left < -1 || rect.right > viewportWidth + 1
      }).length
      const bodyStyle = getComputedStyle(detailBody)

      return {
        viewportWidth,
        horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
        appOverflowY: getComputedStyle(app).overflowY,
        bodyFontSize: Number.parseFloat(getComputedStyle(bodyText).fontSize),
        bodyBackground: bodyStyle.backgroundColor,
        bodyBorderTopWidth: bodyStyle.borderTopWidth,
        bodyBoxShadow: bodyStyle.boxShadow,
        outOfBounds,
      }
    })

    if (!readingLayout) {
      failures.push(`${path} mobile ${width}px: expected measurable detail reading layout`)
      await mobileDetailPage.close()
      continue
    }
    if (readingLayout.horizontalOverflow || readingLayout.outOfBounds > 0) {
      failures.push(`${path} mobile ${width}px: detail content should stay inside the reading viewport`)
    }
    if (readingLayout.appOverflowY !== 'visible') {
      failures.push(`${path} mobile ${width}px: document should own vertical scrolling`)
    }
    if (readingLayout.bodyFontSize < 15) {
      failures.push(`${path} mobile ${width}px: primary detail text should be at least 15px`)
    }
    if (
      readingLayout.bodyBackground !== 'rgba(0, 0, 0, 0)' ||
      readingLayout.bodyBorderTopWidth !== '0px' ||
      readingLayout.bodyBoxShadow !== 'none'
    ) {
      failures.push(`${path} mobile ${width}px: detail body should use a flattened transparent reading surface`)
    }

    const finalRelated = mobileDetailPage.locator('.detail-related').last()
    if ((await finalRelated.count()) > 0) {
      await finalRelated.scrollIntoViewIfNeeded()
      if (!(await finalRelated.isVisible().catch(() => false))) {
        failures.push(`${path} mobile ${width}px: final related-content section should remain reachable`)
      }
    }

    await mobileDetailPage.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await mobileDetailPage
      .waitForFunction(() => {
        const trigger = document.querySelector('.public-assistant__trigger')
        if (!trigger) return false
        const style = getComputedStyle(trigger)
        return Number.parseFloat(style.opacity) <= 0.05 && style.pointerEvents === 'none'
      })
      .catch(() => {})
    const bottomState = await mobileDetailPage.evaluate(() => ({
      reachedBottom: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
      footerVisible: Boolean(document.querySelector('.site-footer')?.getBoundingClientRect().bottom <= window.innerHeight + 1),
    }))
    if (!bottomState.reachedBottom || !bottomState.footerVisible) {
      failures.push(`${path} mobile ${width}px: document scrolling should reach the true footer bottom`)
    }

    const footerTrust = mobileDetailPage.locator('.site-footer__trust')
    if (!(await footerTrust.isVisible().catch(() => false))) {
      failures.push(`${path} mobile ${width}px: footer trust content should remain visible at the bottom`)
    }
    const assistantTriggerAtFooter = await mobileDetailPage
      .locator('.public-assistant__trigger')
      .evaluate((trigger) => ({
        opacity: Number.parseFloat(getComputedStyle(trigger).opacity),
        pointerEvents: getComputedStyle(trigger).pointerEvents,
      }))
    if (assistantTriggerAtFooter.opacity > 0.05 || assistantTriggerAtFooter.pointerEvents !== 'none') {
      failures.push(`${path} mobile ${width}px: collapsed assistant trigger should not cover final reading content`)
    }

    await mobileDetailPage.close()
  }
}

const publicFeedRefreshPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await installAiDailyPublicRefreshFixture(publicFeedRefreshPage)
await gotoApp(publicFeedRefreshPage, '/ai-daily')
await publicFeedRefreshPage.getByText('公开 Flash 标题').waitFor({ state: 'visible' })
await publicFeedRefreshPage.getByRole('button', { name: '刷新 AI 日报' }).click()
await publicFeedRefreshPage.getByRole('alert').waitFor({ state: 'visible' })
if (!(await publicFeedRefreshPage.getByText('公开 Flash 标题').isVisible().catch(() => false))) {
  failures.push('/ai-daily refresh: transient failure should retain the last successful payload')
}
await publicFeedRefreshPage.getByRole('button', { name: '重试' }).click()
const refreshErrorCleared = await publicFeedRefreshPage
  .getByRole('alert')
  .waitFor({ state: 'detached', timeout: 3_000 })
  .then(() => true)
  .catch(() => false)
if (!refreshErrorCleared) {
  failures.push('/ai-daily refresh: a successful 304 should clear the previous error')
}
await publicFeedRefreshPage.close()

const publicFeedStalePage = await browser.newPage({ viewport: { width: 390, height: 900 } })
await installAiDailyPublicStaleFixture(publicFeedStalePage)
await gotoApp(publicFeedStalePage, '/ai-daily')
await publicFeedStalePage.getByText('投影需要关注').waitFor({ state: 'visible', timeout: 3_000 })
if (!(await publicFeedStalePage.getByText('投影需要关注').isVisible().catch(() => false))) {
  failures.push('/ai-daily stale: expected visible stale projection notice')
}
await publicFeedStalePage.close()

const invalidCitationPage = await browser.newPage({ viewport: { width: 390, height: 900 } })
await installAiDailyPublicInvalidCitationFixture(invalidCitationPage)
await gotoApp(invalidCitationPage, '/ai-daily/invalid-citation')
await invalidCitationPage.getByText('无法打开这条快讯').waitFor({ state: 'visible' })
if ((await invalidCitationPage.locator('a[href^="javascript:"]').count()) !== 0) {
  failures.push('/ai-daily invalid citation: unsafe javascript URL should never reach an anchor')
}
if (await invalidCitationPage.evaluate(() => document.body.dataset.compromised === 'true')) {
  failures.push('/ai-daily invalid citation: unsafe citation URL should not execute')
}
await invalidCitationPage.close()

const publicDetailRacePage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await installAiDailyPublicRaceFixture(publicDetailRacePage)
await gotoApp(publicDetailRacePage, '/ai-daily/slow-event')
await publicDetailRacePage.evaluate(() => {
  window.history.pushState({}, '', '/ai-daily/fast-event')
  window.dispatchEvent(new PopStateEvent('popstate'))
})
await publicDetailRacePage.getByText('快速当前快讯').waitFor({ state: 'visible' })
await publicDetailRacePage.waitForTimeout(550)
if (!(await publicDetailRacePage.getByText('快速当前快讯').isVisible().catch(() => false)) || await publicDetailRacePage.getByText('延迟旧快讯').count()) {
  failures.push('/ai-daily detail race: a late response from the old publicId should not replace the current route')
}
await publicDetailRacePage.close()

const publicFeedReducedMotionPage = await browser.newPage({
  viewport: { width: 390, height: 900 },
  reducedMotion: 'reduce',
})
await installAiDailyPublicDelayedFeedFixture(publicFeedReducedMotionPage)
await gotoApp(publicFeedReducedMotionPage, '/ai-daily')
await publicFeedReducedMotionPage.locator('.loading-bar').waitFor({ state: 'visible' })
const reducedMotionState = await publicFeedReducedMotionPage.evaluate(() => {
  const dot = document.querySelector('.ai-daily-public-status-dot')
  const bar = document.querySelector('.loading-bar')
  const after = bar ? getComputedStyle(bar, '::after') : null
  return {
    dotAnimation: dot ? getComputedStyle(dot).animationName : 'missing',
    barAnimation: after?.animationName ?? 'missing',
    barTransform: after?.transform ?? 'missing',
  }
})
if (reducedMotionState.dotAnimation !== 'none' || reducedMotionState.barAnimation !== 'none' || reducedMotionState.barTransform !== 'none') {
  failures.push('/ai-daily reduced motion: loading indicators should remain static when motion is reduced')
}
await publicFeedReducedMotionPage.close()

await browser.close()

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`UI check passed for ${routes.length} routes across ${viewports.length} viewports at ${base}`)
