import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const listSearch = '?column=project-notes&q=RAG'

async function createPage(browser, base, { width, theme }) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    reducedMotion: 'reduce',
    hasTouch: width <= 430,
    isMobile: width <= 430,
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
    localStorage.setItem('biau-port-theme', initialTheme)
    sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, theme)
  return { page, errors }
}

async function openDocument(page, url, language) {
  await page.goto(url, { waitUntil: 'load' })
  await page.locator('.nav-lang-toggle').waitFor({ state: 'visible' })
  if (language === 'en') await page.locator('.nav-lang-toggle').click()
}

async function checkList(page, { column = 'project-notes', query = 'RAG', titles } = {}) {
  await page.locator('.blog-index-page').waitFor({ state: 'visible' })
  await page.waitForFunction(({ expectedColumn, expectedQuery, expectedTitles }) => (
    document.querySelector('.blog-column-select select')?.value === expectedColumn &&
    document.querySelector('#blog-search')?.value === expectedQuery &&
    (expectedTitles === null || JSON.stringify([...document.querySelectorAll('.blog-card .blog-title')].map((title) => title.textContent)) === JSON.stringify(expectedTitles))
  ), { expectedColumn: column, expectedQuery: query, expectedTitles: titles ?? null }, { timeout: 5000 })
  assert.equal(await page.locator('.blog-column-select select').inputValue(), column, 'column must follow the URL')
  assert.equal(await page.locator('#blog-search').inputValue(), query, 'search must follow the URL')
  const actualTitles = await page.locator('.blog-card .blog-title').allTextContents()
  if (titles) assert.deepEqual(actualTitles, titles, 'return must restore the same result collection')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 1, `blog discovery must not overflow (${overflow}px)`)
  return actualTitles
}

async function selectProjectNotes(page, width) {
  if (width <= 430) await page.locator('.blog-column-select select').selectOption('project-notes')
  else await page.locator('.blog-column-filter .filter-btn').filter({ hasText: 'Project Notes' }).click()
}

export async function checkBlogDiscoveryNavigation(browser, base) {
  let groups = 0
  for (const width of [1440, 320, 390, 430]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      for (const language of ['zh', 'en']) {
        const context = `${width}-${theme}-${language}`
        const { page, errors } = await createPage(browser, base, { width, theme })
        const extraPages = []
        try {
          await openDocument(page, `${base}/blog${listSearch}`, language)
          const titles = await checkList(page)
          assert.ok(titles.length > 0, 'the existing RAG project notes must be discoverable')
          await page.reload({ waitUntil: 'load' })
          if (language === 'en') await page.locator('.nav-lang-toggle').click()
          await checkList(page, { titles })

          const copied = await createPage(browser, base, { width, theme })
          extraPages.push(copied)
          await openDocument(copied.page, page.url(), language)
          await checkList(copied.page, { titles })

          await openDocument(page, `${base}/blog`, language)
          await checkList(page, { column: 'all', query: '' })
          await selectProjectNotes(page, width)
          const historyBeforeTyping = await page.evaluate(() => history.length)
          await page.locator('#blog-search').pressSequentially('RAG')
          await checkList(page, { titles })
          assert.equal(await page.evaluate(() => history.length), historyBeforeTyping, 'typing must replace history')
          assert.equal(new URL(page.url()).search, listSearch)

          await page.goBack()
          await checkList(page, { column: 'all', query: '' })
          await page.goForward()
          await checkList(page, { titles })

          const action = page.locator('.blog-card .btn').first()
          await action.focus()
          await page.keyboard.press('Enter')
          await page.locator('.blog-post-page .detail-back').waitFor({ state: 'visible' })
          const detailUrl = page.url()
          assert.equal(new URL(detailUrl).search, listSearch, 'detail URL must retain the list context')
          assert.equal(await page.locator('.detail-back').getAttribute('href'), `/blog${listSearch}`)
          assert.ok(!(await page.locator('link[rel="canonical"]').getAttribute('href')).includes('?'), 'canonical must omit search')
          await page.goBack()
          await checkList(page, { titles })
          await page.goForward()
          await page.locator('.blog-post-page .detail-back').waitFor({ state: 'visible' })
          await page.locator('.detail-back').focus()
          await page.keyboard.press('Enter')
          await checkList(page, { titles })

          await openDocument(copied.page, detailUrl, language)
          await copied.page.locator('.blog-post-page .detail-back').waitFor({ state: 'visible' })
          const related = copied.page.locator('#blog-related-posts .detail-related-card').first()
          const relatedHref = await related.getAttribute('href')
          assert.ok(relatedHref.endsWith(listSearch), 'related articles must keep the same list context')
          await related.click()
          await copied.page.waitForURL(`${base}${relatedHref}`)
          await copied.page.locator('.blog-post-page .detail-back').waitFor({ state: 'visible' })
          assert.equal(await copied.page.locator('.detail-back').getAttribute('href'), `/blog${listSearch}`)
          await copied.page.locator('.detail-back').click()
          await checkList(copied.page, { titles })

          if (process.env.UI_CHECK_ARTIFACT_DIR) {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
            await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `blog-${context}.png`) })
          }

          await page.locator('#blog-search').fill('no-results-fixture-79e38')
          await page.locator('.blog-empty').waitFor({ state: 'visible' })
          await checkList(page, { query: 'no-results-fixture-79e38', titles: [] })
          assert.ok(await page.locator('.blog-pagination button').first().isDisabled())
          assert.ok(await page.locator('.blog-pagination button').last().isDisabled())
          assert.match(await page.locator('.blog-result-meta').innerText(), /第 1 \/ 1 页/u)
          await page.locator('#blog-search').fill('RAG ')
          await page.locator('#blog-search').pressSequentially('公开')
          assert.equal(await page.locator('#blog-search').inputValue(), 'RAG 公开', 'typing must retain word separators')

          await openDocument(page, `${base}/blog?column=invalid&q=${'x'.repeat(160)}&page=-2&returnTo=https%3A%2F%2Fexample.invalid`, language)
          await page.waitForURL((url) => url.search === `?q=${'x'.repeat(120)}`)
          await checkList(page, { column: 'all', query: 'x'.repeat(120), titles: [] })
          await openDocument(page, `${base}/blog?column=project-notes&q=RAG&page=999`, language)
          await page.waitForURL((url) => url.search === listSearch)
          await checkList(page, { titles })

          await openDocument(page, `${base}/blog/ui-check-missing-discovery${listSearch}&returnTo=%2F%2Fexample.invalid`, language)
          const missingBack = page.locator('.detail-missing .btn')
          await missingBack.waitFor({ state: 'visible' })
          assert.equal(await missingBack.getAttribute('href'), `/blog${listSearch}`)
          await missingBack.click()
          await checkList(page, { titles })
          assert.deepEqual(errors, [], `${context}: unexpected page/network failures`)
          for (const extra of extraPages) assert.deepEqual(extra.errors, [], `${context}: copied page failures`)
          groups += 1
        } catch (error) {
          if (process.env.UI_CHECK_ARTIFACT_DIR) {
            await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `blog-${context}-failed.png`) }).catch(() => {})
          }
          throw new Error(`blog-discovery ${context}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
        } finally {
          await page.close()
          for (const extra of extraPages) await extra.page.close()
        }
      }
    }
  }
  return { groups }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const browser = await chromium.launch({ headless: true })
  try {
    const result = await checkBlogDiscoveryNavigation(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174')
    console.log(`Blog discovery UI passed: ${result.groups} viewport/theme/language groups.`)
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}
