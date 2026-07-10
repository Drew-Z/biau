import { chromium } from 'playwright'
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
import { projects } from '../src/data/portfolio.ts'
import { heroContent } from '../src/data/hero.ts'
import { blogColumnMeta, blogColumnOrder, getBlogEmptyState } from '../src/data/blog.ts'
import { publicAssistantSuggestions } from '../src/data/assistant.ts'

const base = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'
const siteUrl = 'https://biau.playlab.eu.cc'

const routes = [
  { path: '/', title: 'BIAU PORT', nav: '所有项目', canonical: '/' },
  { path: '/projects', title: '项目集', nav: '回主页', canonical: '/projects' },
  { path: '/blog', title: '知识库', nav: '回主页', canonical: '/blog' },
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
  { path: '/assistant', title: '内部助手', nav: '回主页', canonical: '/assistant' },
  {
    path: '/assistant/admin',
    title: '内部助手管理页',
    nav: '回主页',
    canonical: '/assistant/admin',
    clearLocalStorageKeys: ['biau-assistant-admin-token'],
  },
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

    await gotoApp(page, route.path)

    const titleText = await page.locator('h1, .hero-title-main').first().innerText().catch(() => '')
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

    if (route.expectedText) {
      const expectedTextVisible = await page.getByText(route.expectedText).first().isVisible().catch(() => false)
      if (!expectedTextVisible) {
        failures.push(`${viewport.name} ${route.path}: expected visible text "${route.expectedText}"`)
      }
    }

    if (route.path === '/assistant/admin') {
      const refreshAllButton = page.getByRole('button', { name: '刷新全部状态' })
      const refreshAllVisible = await refreshAllButton.isVisible().catch(() => false)
      const refreshAllDisabled = await refreshAllButton.isDisabled().catch(() => false)
      const tokenBoundaryVisible = await page.getByText('admin token 只保存在当前浏览器本地').isVisible().catch(() => false)

      if (!refreshAllVisible) {
        failures.push(`${viewport.name} ${route.path}: expected visible refresh-all action`)
      }
      if (!refreshAllDisabled) {
        failures.push(`${viewport.name} ${route.path}: refresh-all action should be disabled without admin token`)
      }
      if (!tokenBoundaryVisible) {
        failures.push(`${viewport.name} ${route.path}: expected local-only admin token boundary text`)
      }

      await page.getByRole('tab', { name: '知识' }).click()
      const knowledgeReadinessVisible = await page.getByLabel('内部知识同步路径').isVisible().catch(() => false)
      const sourceTypeSelectVisible = await page
        .locator('#assistant-admin-panel-knowledge label')
        .filter({ hasText: '来源类型' })
        .locator('select')
        .isVisible()
        .catch(() => false)
      const runbookSourceVisible = await page
        .locator('#assistant-admin-panel-knowledge .assistant-source-type-help')
        .getByText('运行手册')
        .isVisible()
        .catch(() => false)
      if (!knowledgeReadinessVisible) {
        failures.push(`${viewport.name} ${route.path}: expected internal knowledge readiness path`)
      }
      if (!sourceTypeSelectVisible || !runbookSourceVisible) {
        failures.push(`${viewport.name} ${route.path}: expected source type presets for internal knowledge`)
      }
    }

    if (route.path === '/assistant') {
      const openingText = await page.locator('.assistant-bubble.is-assistant p').first().innerText().catch(() => '')
      const openingCitationCards = await page
        .locator('.assistant-bubble.is-assistant')
        .first()
        .locator('.assistant-citation-card')
        .count()
      const runCards = await page.locator('.assistant-run-card').count()
      const inspectorPanels = await page.locator('.assistant-inspector .assistant-panel').count()
      const agentPanelVisible = await page.getByRole('heading', { name: 'LangGraph 运行状态' }).isVisible().catch(() => false)
      const toolPanelVisible = await page.getByRole('heading', { name: '工具轨迹' }).isVisible().catch(() => false)
      const guardrailPanelVisible = await page.getByRole('heading', { name: '安全检查' }).isVisible().catch(() => false)

      if (openingText.length > 52) {
        failures.push(`${viewport.name} ${route.path}: opening message should stay concise, got ${openingText.length} chars`)
      }
      if (openingCitationCards !== 0) {
        failures.push(`${viewport.name} ${route.path}: opening message should not render default citation cards`)
      }
      if (runCards < 3) {
        failures.push(`${viewport.name} ${route.path}: expected assistant run status strip with at least 3 cards`)
      }
      if (inspectorPanels < 5 || !agentPanelVisible || !toolPanelVisible || !guardrailPanelVisible) {
        failures.push(`${viewport.name} ${route.path}: expected productized Agent inspector panels`)
      }
    }

    if (route.path === '/studio') {
      const reviewQueueSummary = await page.getByLabel('Studio 待审核草稿摘要').isVisible().catch(() => false)
      const nextReviewLabel = await page.getByText('下一篇待审核').first().isVisible().catch(() => false)
      const hiddenReviewMetric = await page.getByText('Hidden 待审').isVisible().catch(() => false)
      const nextReviewButton = page.getByRole('button', { name: '打开下一篇待审核' })
      const nextReviewButtonVisible = await nextReviewButton.isVisible().catch(() => false)
      const nextReviewButtonDisabled = await nextReviewButton.isDisabled().catch(() => false)

      if (!reviewQueueSummary) {
        failures.push(`${viewport.name} ${route.path}: expected visible studio review queue summary`)
      }
      if (!nextReviewLabel || !hiddenReviewMetric) {
        failures.push(`${viewport.name} ${route.path}: expected review queue labels for next draft and hidden review-needed count`)
      }
      if (!nextReviewButtonVisible) {
        failures.push(`${viewport.name} ${route.path}: expected next review draft action`)
      }
      if (!nextReviewButtonDisabled) {
        failures.push(`${viewport.name} ${route.path}: next review draft action should be disabled before drafts load`)
      }
    }

    if (route.studioReviewFixture) {
      await page.getByText('UI Check 待审核草稿').first().waitFor({ state: 'visible', timeout: 10_000 })
      const hiddenReviewMetric = await page.locator('.studio-review-queue-metrics span').filter({ hasText: 'Hidden 待审' }).innerText()
      const nextReviewButton = page.getByRole('button', { name: '打开下一篇待审核' })
      const nextReviewButtonDisabled = await nextReviewButton.isDisabled().catch(() => true)

      if (!hiddenReviewMetric.includes('1')) {
        failures.push(`${viewport.name} ${route.path}: expected one hidden review-needed draft, got "${hiddenReviewMetric}"`)
      }
      if (nextReviewButtonDisabled) {
        failures.push(`${viewport.name} ${route.path}: next review draft action should be enabled with fixture drafts`)
      } else {
        await nextReviewButton.click()
        const currentDraftTitle = await page.locator('.studio-review-current > strong').first().innerText().catch(() => '')
        const activeDraftVisible = await page
          .locator('.studio-draft-item.is-active')
          .filter({ hasText: 'UI Check 待审核草稿' })
          .isVisible()
          .catch(() => false)

        if (!currentDraftTitle.includes('UI Check 待审核草稿') || !activeDraftVisible) {
          failures.push(`${viewport.name} ${route.path}: next review action did not select the review-needed draft`)
        }
      }
    }

    if (logs.length > 0) {
      failures.push(`${viewport.name} ${route.path}: ${logs.join(' | ')}`)
    }

    await page.close()
  }
}

const statusPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(statusPage, '/status')
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

const interactionPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(interactionPage, '/blog')
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

const navFocusPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(navFocusPage, '/blog')
const expectedNavFocusTargets = new Set(['brand', '首页', '项目', '博客', '助手', 'theme', 'language', 'primary'])
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

const lightScenePalettes = []
for (const scene of ['dusk', 'garden', 'stellar']) {
  const lightThemePage = await browser.newPage({ viewport: viewports[0], colorScheme: 'light' })
  await lightThemePage.addInitScript((harborScene) => {
    window.localStorage.setItem('theme', 'light')
    window.localStorage.setItem('biau-port-harbor-scene', harborScene)
    window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, scene)
  await gotoApp(lightThemePage, '/')
  const palette = await lightThemePage.evaluate(() => {
    const app = document.querySelector('.app.page-home')
    if (!(app instanceof HTMLElement)) return null
    const style = getComputedStyle(app)
    return {
      light: document.documentElement.classList.contains('light-theme'),
      c1: style.getPropertyValue('--flow-c1').trim().toLowerCase(),
      c5: style.getPropertyValue('--flow-c5').trim().toLowerCase(),
      fieldOpacity: Number.parseFloat(style.getPropertyValue('--flow-field-opacity')),
      panelAlpha: Number.parseFloat(style.getPropertyValue('--flow-panel-alpha')),
      saturation: Number.parseFloat(style.getPropertyValue('--flow-saturation')),
      ink: style.getPropertyValue('--ink').trim().toLowerCase(),
    }
  })
  if (!palette) {
    failures.push(`/ home light ${scene}: expected measurable theme tokens`)
  } else {
    lightScenePalettes.push(palette)
    if (!palette.light || palette.ink !== '#173047') {
      failures.push(`/ home light ${scene}: expected the morning-harbor light theme ink contract`)
    }
    if (palette.fieldOpacity > 0.7 || palette.panelAlpha < 0.55 || palette.saturation > 100) {
      failures.push(`/ home light ${scene}: expected restrained field, readable panels, and sub-100% saturation`)
    }
    if (palette.c5 === '#052433' || palette.c5 === '#16497b') {
      failures.push(`/ home light ${scene}: light palette should not reuse the old dark/deep-blue endpoint`)
    }
  }
  await lightThemePage.close()
}
if (new Set(lightScenePalettes.map((palette) => `${palette.c1}:${palette.c5}`)).size !== 3) {
  failures.push('/ home light scenes: dusk, garden, and stellar should keep distinct restrained palettes')
}

const assistantPage = await browser.newPage({ viewport: viewports[0] })
await gotoApp(assistantPage, '/assistant')
if (await assistantPage.locator('.public-assistant').count()) {
  failures.push('/assistant: public assistant widget should be hidden on assistant routes')
}
await assistantPage.locator('.assistant-suggestions button').first().click()
await assistantPage.waitForTimeout(150)
if ((await assistantPage.locator('.assistant-bubble.is-user').count()) < 1) {
  failures.push('/assistant: expected suggestion click to append a user message')
}
if ((await assistantPage.locator('.assistant-bubble.is-assistant').count()) < 2) {
  failures.push('/assistant: expected suggestion click to append an assistant answer')
}
await assistantPage.close()

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
for (const label of ['产品展示页', '技术文档', '阶段 APK']) {
  if (!(await xunqiuQuickLinks.getByRole('link', { name: label }).first().isVisible().catch(() => false))) {
    failures.push(`/projects/xunqiu quick links: expected visible "${label}" quick link`)
  }
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
    const firstCard = visibleCards[0]
    const secondCard = visibleCards[1]
    if (!brand || !actions || !inner || !navItems || !languageButton || !title || !viewport || !track) return null

    const brandRect = brand.getBoundingClientRect()
    const actionsRect = actions.getBoundingClientRect()
    const innerRect = inner.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const secondCardRect = secondCard?.getBoundingClientRect()

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
      nextCardPeeks: Boolean(secondCardRect && secondCardRect.left < viewportRect.right),
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
  if (mobileLayout.navItemsDisplay !== 'none' || mobileLayout.languageDisplay !== 'none') {
    failures.push(`/ home mobile ${width}px: desktop navigation controls should be collapsed`)
  }
  if (!mobileLayout.titleTouchAction.includes('pan-y')) {
    failures.push(`/ home mobile ${width}px: title should preserve vertical page panning`)
  }
  if (!['auto', 'scroll'].includes(mobileLayout.carouselOverflowX)) {
    failures.push(`/ home mobile ${width}px: project rail should use native horizontal scrolling`)
  }
  if (!mobileLayout.carouselTouchAction.includes('pan-y') || mobileLayout.carouselDirection !== 'row') {
    failures.push(`/ home mobile ${width}px: project rail should allow page panning and use a horizontal row`)
  }
  if (mobileLayout.carouselTransform !== 'none') {
    failures.push(`/ home mobile ${width}px: desktop vertical transform should be disabled`)
  }
  if (mobileLayout.visibleCardCount !== heroContent.projects.length) {
    failures.push(
      `/ home mobile ${width}px: expected ${heroContent.projects.length} unique project cards, got ${mobileLayout.visibleCardCount}`,
    )
  }
  if (!mobileLayout.nextCardPeeks) {
    failures.push(`/ home mobile ${width}px: expected the next project card to remain partially visible`)
  }
  if (mobileLayout.horizontalOverflow) {
    failures.push(`/ home mobile ${width}px: page should not overflow horizontally`)
  }

  const menuToggle = mobileHomePage.getByRole('button', { name: /打开导航菜单/ })
  if (!(await menuToggle.isVisible().catch(() => false))) {
    failures.push(`/ home mobile ${width}px: expected visible mobile menu button`)
  } else {
    await menuToggle.click()
    const mobilePanelVisible = await mobileHomePage.locator('.nav-mobile-panel').isVisible().catch(() => false)
    const languageActionVisible = await mobileHomePage
      .locator('.nav-mobile-language')
      .isVisible()
      .catch(() => false)
    const mobilePanelAboveHero = await mobileHomePage.evaluate(() => {
      const panel = document.querySelector('.nav-mobile-panel')
      if (!panel) return false
      const rect = panel.getBoundingClientRect()
      const topElement = document.elementFromPoint(rect.left + rect.width / 2, rect.top + Math.min(90, rect.height / 2))
      return Boolean(topElement?.closest('.nav-mobile-panel'))
    })
    if (!mobilePanelVisible || !languageActionVisible || !mobilePanelAboveHero) {
      failures.push(`/ home mobile ${width}px: expected navigation panel with language action`)
    }
    await mobileHomePage.getByRole('button', { name: /关闭导航菜单/ }).click()
  }

  const title = mobileHomePage.locator('.hero-title-rotator')
  const titleBefore = await title.getAttribute('aria-label')
  await title.click()
  await mobileHomePage
    .waitForFunction((previous) => document.querySelector('.hero-title-rotator')?.getAttribute('aria-label') !== previous, titleBefore)
    .catch(() => failures.push(`/ home mobile ${width}px: tapping the title should switch the poem`))

  const footer = mobileHomePage.locator('.site-footer')
  await footer.scrollIntoViewIfNeeded()
  await mobileHomePage.waitForTimeout(180)
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

await browser.close()

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`UI check passed for ${routes.length} routes across ${viewports.length} viewports at ${base}`)
