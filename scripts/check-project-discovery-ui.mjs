import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'
import { assertSiteLanguage, selectSiteLanguage } from './lib/ui-language.mjs'

const groups = ['ai', 'fullstack', 'tool']
const groupSearch = { ai: '', fullstack: '?group=fullstack', tool: '?group=tool' }

async function createPage(browser, base, width, theme) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    reducedMotion: 'reduce',
    hasTouch: width <= 720,
    isMobile: width <= 720,
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('external_request_blocked'), { allowLoopback: false })
  await page.route(`${base}/api/**`, (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'local_verification_fixture' }),
  }))
  await page.addInitScript((initialTheme) => {
    if (!localStorage.getItem('biau-port-theme')) localStorage.setItem('biau-port-theme', initialTheme)
    sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, theme)
  return { page, errors }
}

async function openDocument(page, url, language) {
  await page.goto(url, { waitUntil: 'load' })
  await selectSiteLanguage(page, language)
}

async function checkCatalog(page, group, width, expectedTitles) {
  await page.locator('.projects-tools-page').waitFor({ state: 'visible' })
  await page.waitForFunction(({ expected, mobile }) => {
    const selected = document.querySelector('.project-group-toggle[aria-expanded="true"]')
    const visible = [...document.querySelectorAll('.projects-grid')].filter((panel) => !panel.hidden)
    return selected?.getAttribute('aria-controls') === `project-group-panel-${expected}` &&
      (mobile ? visible.length === 1 && visible[0].id === `project-group-panel-${expected}` : visible.length === 3)
  }, { expected: group, mobile: width <= 720 }, { timeout: 5000 }).catch(() => {})

  const selected = await page.locator('.project-group-toggle[aria-expanded="true"]').getAttribute('aria-controls')
  assert.equal(selected, `project-group-panel-${group}`, 'the selected project group must follow the URL')
  const visiblePanels = await page.locator('.projects-grid:visible').evaluateAll((panels) => panels.map((panel) => panel.id))
  assert.deepEqual(visiblePanels, width <= 720 ? [`project-group-panel-${group}`] : groups.map((key) => `project-group-panel-${key}`))
  if (width > 720) assert.equal(await page.locator('.project-group-toggle:visible').count(), 0)
  const titles = await page.locator(`#project-group-panel-${group} .project-card`).evaluateAll((cards) => cards.map((card) => card.getAttribute('data-graph-label')))
  assert.ok(titles.length > 0, 'each existing group must retain its projects')
  if (expectedTitles) assert.deepEqual(titles, expectedTitles, 'return must preserve the project collection and order')
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'catalog must not overflow')
  assert.equal(new URL(page.url()).pathname, '/projects')
  assert.equal(new URL(page.url()).search, groupSearch[group])
  return titles
}

export async function checkProjectDiscoveryNavigation(browser, base) {
  let matrixGroups = 0
  let breakpointGroups = 0
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      for (const language of ['zh', 'en']) {
        const context = `${width}-${theme}-${language}`
        const current = await createPage(browser, base, width, theme)
        const copied = await createPage(browser, base, width, theme)
        const { page } = current
        try {
          for (const group of ['tool', 'fullstack', 'ai']) {
            const listPath = `/projects${groupSearch[group]}`
            await openDocument(page, `${base}${listPath}`, language)
            const titles = await checkCatalog(page, group, width)
            assert.equal(await page.locator('html').getAttribute('data-site-theme'), theme)
            await page.reload({ waitUntil: 'load' })
            await assertSiteLanguage(page, language)
            await checkCatalog(page, group, width, titles)
            await openDocument(copied.page, page.url(), language)
            await checkCatalog(copied.page, group, width, titles)

            const action = page.locator(`#project-group-panel-${group} .project-footer > .btn`).first()
            await action.focus()
            await page.keyboard.press('Enter')
            await page.locator('.project-detail-page .detail-back').waitFor({ state: 'visible' })
            const detailUrl = page.url()
            assert.equal(new URL(detailUrl).search, groupSearch[group])
            assert.equal(await page.locator('.detail-back').getAttribute('href'), listPath)
            assert.ok(!(await page.locator('link[rel="canonical"]').getAttribute('href')).includes('?'))
            const readingLinks = await page.locator('#project-readings a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
            assert.ok(readingLinks.every((href) => !href.includes('group=')), 'blog readings must not receive project context')
            await page.goBack()
            await checkCatalog(page, group, width, titles)
            await page.goForward()
            await page.locator('.project-detail-page .detail-back').waitFor({ state: 'visible' })
            await page.locator('.detail-back').focus()
            await page.keyboard.press('Enter')
            await checkCatalog(page, group, width, titles)

            await openDocument(copied.page, detailUrl, language)
            await copied.page.locator('.project-detail-page .detail-back').waitFor({ state: 'visible' })
            const related = copied.page.locator('#project-related .detail-related-card').first()
            const relatedHref = await related.getAttribute('href')
            assert.equal(new URL(relatedHref, base).search, groupSearch[group])
            await related.click()
            await copied.page.waitForURL(`${base}${relatedHref}`)
            await copied.page.locator('.project-detail-page .detail-back').waitFor({ state: 'visible' })
            assert.equal(await copied.page.locator('.detail-back').getAttribute('href'), listPath)
            await copied.page.locator('.detail-back').click()
            await checkCatalog(copied.page, group, width, titles)
          }

          await openDocument(page, `${base}/projects`, language)
          const interactionWidth = Math.min(width, 430)
          await page.setViewportSize({ width: interactionWidth, height: 900 })
          await checkCatalog(page, 'ai', interactionWidth)
          const historyBefore = await page.evaluate(() => history.length)
          const fullstack = page.locator('[aria-controls="project-group-panel-fullstack"]')
          await fullstack.focus()
          await page.keyboard.press('Enter')
          await checkCatalog(page, 'fullstack', interactionWidth)
          assert.equal(await page.evaluate(() => history.length), historyBefore + 1)
          await fullstack.click()
          assert.equal(await page.evaluate(() => history.length), historyBefore + 1, 'reselecting a group must not add history')
          await page.locator('[aria-controls="project-group-panel-tool"]').click()
          await checkCatalog(page, 'tool', interactionWidth)
          await page.goBack()
          await checkCatalog(page, 'fullstack', interactionWidth)
          await page.goBack()
          await checkCatalog(page, 'ai', interactionWidth)
          await page.goForward()
          await checkCatalog(page, 'fullstack', interactionWidth)
          await page.goForward()
          await checkCatalog(page, 'tool', interactionWidth)
          await page.setViewportSize({ width: 1440, height: 900 })
          await checkCatalog(page, 'tool', 1440)
          await page.setViewportSize({ width, height: 900 })
          await checkCatalog(page, 'tool', width)

          if (process.env.UI_CHECK_ARTIFACT_DIR) {
            await page.evaluate(async () => {
              window.scrollTo({ top: 0, behavior: 'instant' })
              await document.fonts.ready
              await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
            })
            await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `projects-${context}.png`) })
          }

          await openDocument(page, `${base}/projects?group=tool&group=ai&unused=1`, language)
          await page.waitForURL((url) => url.search === '?group=tool')
          await checkCatalog(page, 'tool', width)
          await openDocument(page, `${base}/projects?group=unknown&group=tool&returnTo=%2F%2Fexample.invalid`, language)
          await page.waitForURL((url) => url.search === '')
          await checkCatalog(page, 'ai', width)
          await openDocument(page, `${base}/projects/ui-check-missing-discovery?group=tool&returnTo=%2F%2Fexample.invalid`, language)
          const missingBack = page.locator('.detail-missing .btn')
          await missingBack.waitFor({ state: 'visible' })
          assert.equal(await missingBack.getAttribute('href'), '/projects?group=tool')
          await missingBack.focus()
          await page.keyboard.press('Enter')
          await checkCatalog(page, 'tool', width)
          assert.deepEqual(current.errors, [], `${context}: unexpected page/network failures`)
          assert.deepEqual(copied.errors, [], `${context}: copied page failures`)
          matrixGroups += 1
        } catch (error) {
          if (process.env.UI_CHECK_ARTIFACT_DIR) {
            await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `projects-${context}-failed.png`) }).catch(() => {})
          }
          throw new Error(`project-discovery ${context}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
        } finally {
          await page.close()
          await copied.page.close()
        }
      }
    }
  }

  const boundary = await createPage(browser, base, 720, 'morning')
  try {
    await openDocument(boundary.page, `${base}/projects?group=fullstack`, 'zh')
    for (const width of [720, 721]) {
      await boundary.page.setViewportSize({ width, height: 900 })
      await checkCatalog(boundary.page, 'fullstack', width)
      breakpointGroups += 1
    }
    await boundary.page.setViewportSize({ width: 320, height: 900 })
    await checkCatalog(boundary.page, 'fullstack', 320)
    assert.deepEqual(boundary.errors, [])
  } finally {
    await boundary.page.close()
  }
  return { matrixGroups, breakpointGroups }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const browser = await chromium.launch({ headless: true })
  try {
    const result = await checkProjectDiscoveryNavigation(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174')
    console.log(`Project discovery UI passed: ${result.matrixGroups} viewport/theme/language groups and ${result.breakpointGroups} breakpoint groups.`)
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}
