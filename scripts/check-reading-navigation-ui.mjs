import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const families = [
  {
    key: 'blog', list: '/blog?column=project-notes',
    cards: '.blogs-grid .blog-card', action: '.btn', title: '.blog-title',
    detail: '.blog-post-page', related: '#blog-related-posts .detail-related-card',
  },
  {
    key: 'projects', list: '/projects?group=fullstack',
    cards: '#project-group-panel-fullstack .project-card', action: '.project-footer > .btn', title: '.project-title',
    detail: '.project-detail-page', related: '#project-related .detail-related-card',
  },
]

async function createReadingPage(browser, base, width, theme, reducedMotion = 'reduce') {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('blocked_request'), { allowLoopback: false })
  await page.route(`${base}/api/**`, (route) => route.fulfill({
    status: 503, contentType: 'application/json', body: '{"error":"local_verification_fixture"}',
  }))
  await page.addInitScript((value) => {
    if (!localStorage.getItem('biau-port-theme')) localStorage.setItem('biau-port-theme', value)
    sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, theme)
  return { page, errors }
}

async function settlePaint(page) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
}

async function settleEntryAnimations(target) {
  await target.evaluate(async (element) => {
    const animations = []
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      for (const animation of ancestor.getAnimations()) {
        const endTime = animation.effect?.getComputedTiming().endTime
        if (typeof endTime === 'number' && Number.isFinite(endTime) && endTime <= 2000 && animation.playState !== 'paused') {
          animations.push(animation.finished.catch(() => {}))
        }
      }
    }
    await Promise.all(animations)
  })
}

async function settleDetailImages(page, family) {
  await page.waitForFunction((selector) => {
    const detail = document.querySelector(selector)
    return detail && [...detail.querySelectorAll('img[loading="eager"]')].every((image) => image.complete)
  }, family.detail, { timeout: 5000 })
  await settlePaint(page)
}

async function assertFocused(locator, description) {
  // Router updates the URL before its new DOM commits. Re-resolve the locator
  // while waiting rather than retaining the previous detail's detached title.
  await locator.and(locator.page().locator(':focus')).waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
    const state = await locator.page().evaluate(() => ({ active: document.activeElement?.tagName, text: document.activeElement?.textContent?.slice(0, 100), y: window.scrollY }))
    throw new Error(`${description}: ${JSON.stringify(state)}`)
  })
}

async function openCatalog(page, base, family, language = 'zh') {
  await page.goto(`${base}${family.list}`, { waitUntil: 'load' })
  const languageToggle = page.locator('.nav-lang-toggle')
  const label = language === 'en' ? 'EN' : '中'
  if ((await languageToggle.innerText()).trim() !== label) await languageToggle.click()
  await page.locator(family.cards).last().waitFor({ state: 'visible' })
}

async function activateEntry(page, family, { index = -1, cardEntry = false } = {}) {
  const cards = page.locator(family.cards)
  const card = index < 0 ? cards.last() : cards.nth(index)
  const action = cardEntry ? card : card.locator(family.action)
  const title = await card.locator(family.title).innerText()
  await action.scrollIntoViewIfNeeded()
  await action.focus()
  await settlePaint(page)
  await settleEntryAnimations(action)
  const before = await action.evaluate((element) => ({ top: element.getBoundingClientRect().top, y: window.scrollY }))
  await page.keyboard.press('Enter')
  await assertNewDetail(page, family)
  return { title, cardEntry, ...before }
}

async function assertNewDetail(page, family) {
  const heading = page.locator(`${family.detail} .detail-title`)
  await assertFocused(heading, 'new detail must focus its loaded title')
  assert.ok(await page.evaluate(() => window.scrollY <= 2), 'new detail must start at the top')
}

async function assertCatalogReturn(page, base, family, before, { resized = false } = {}) {
  await page.waitForURL(`${base}${family.list}`)
  const card = page.locator(family.cards).filter({ has: page.getByRole('heading', { name: before.title, exact: true }) })
  const target = before.cardEntry ? card : card.locator(family.action)
  await assertFocused(target, 'catalog return must restore its original entry focus')
  await settleEntryAnimations(target)
  const position = await target.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    bottom: element.getBoundingClientRect().bottom,
    height: window.innerHeight,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }))
  assert.ok(!position.overflow, 'reading return must not overflow horizontally')
  if (resized) assert.ok(position.bottom > 0 && position.top < position.height - 80, 'resized original entry must be visible')
  else assert.ok(Math.abs(position.top - before.top) <= 8, `original entry position changed: ${before.top} -> ${position.top}`)
}

export async function checkReadingRound(browser, base, family, width, theme, language, reducedMotion = 'reduce') {
  const current = await createReadingPage(browser, base, width, theme, reducedMotion)
  const { page } = current
  const context = `${family.key}-${width}-${theme}-${language}-${reducedMotion}`
  try {
    await openCatalog(page, base, family, language)
    const before = await activateEntry(page, family)
    await settleDetailImages(page, family)
    await page.locator(`${family.detail} .detail-body .detail-block`).nth(2).evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await settlePaint(page)
    const detailY = await page.evaluate(() => window.scrollY)
    assert.ok(detailY > 200, 'history fixture must have actually scrolled the detail')
    await page.goBack()
    await assertCatalogReturn(page, base, family, before)
    await page.goForward()
    await page.locator(`${family.detail} .detail-title`).waitFor({ state: 'visible' })
    await settleDetailImages(page, family)
    await page.waitForFunction((y) => Math.abs(window.scrollY - y) <= 8, detailY, { timeout: 5000 }).catch(async () => {
      const actual = await page.evaluate(() => ({ y: window.scrollY, height: document.documentElement.scrollHeight, active: document.activeElement?.tagName }))
      throw new Error(`detail history position: expected ${detailY}, actual ${JSON.stringify(actual)}`)
    })
    await page.locator('.detail-back').focus()
    await page.keyboard.press('Enter')
    await assertCatalogReturn(page, base, family, before)

    const reopened = await activateEntry(page, family)
    const related = page.locator(family.related).first()
    const relatedHref = await related.getAttribute('href')
    await related.click()
    await page.waitForURL(`${base}${relatedHref}`)
    await assertNewDetail(page, family)
    await page.locator('.detail-back').click()
    await assertCatalogReturn(page, base, family, reopened)
    assert.deepEqual(current.errors, [], `${context}: unexpected page/network failures`)
    if (process.env.UI_CHECK_ARTIFACT_DIR) {
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `reading-${context}.png`) })
    }
  } catch (error) {
    if (process.env.UI_CHECK_ARTIFACT_DIR) {
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `reading-${context}-failed.png`) }).catch(() => {})
    }
    throw new Error(`reading-navigation ${context}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  } finally {
    await page.close()
  }
}

async function assertCatalogHeading(page, base, family) {
  await page.waitForURL(`${base}${family.list}`)
  await assertFocused(page.locator('main [data-reading-heading]'), 'unavailable origin must focus the catalog heading')
  assert.ok(await page.evaluate(() => window.scrollY <= 2), 'catalog fallback must start at the top')
}

export async function checkDelayedProjectHistory(browser, base) {
  const current = await createReadingPage(browser, base, 320, 'nature')
  const { page } = current
  let release
  const gate = new Promise((resolve) => { release = resolve })
  try {
    await page.route((url) => url.origin === new URL(base).origin && url.pathname.startsWith('/images/projects/'), async (route) => {
      await gate
      if (!page.isClosed()) await route.continue()
    })
    const family = families[1]
    await openCatalog(page, base, family)
    const before = await activateEntry(page, family)
    assert.equal(await page.locator('.detail-hero-image img').evaluate((image) => image.complete), false, 'fixture must hold the hero image')
    await page.locator(`${family.detail} .detail-body .detail-block`).nth(2).evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await settlePaint(page)
    const expectedY = await page.evaluate(() => window.scrollY)
    await page.goBack()
    await assertCatalogReturn(page, base, family, before)
    await page.goForward()
    await page.locator(`${family.detail} .detail-title`).waitFor({ state: 'visible' })
    await settlePaint(page)
    assert.equal(await page.locator('.detail-hero-image img').evaluate((image) => image.complete), false)
    release()
    await settleDetailImages(page, family)
    const actualY = await page.evaluate(() => window.scrollY)
    assert.ok(Math.abs(actualY - expectedY) <= 8, `delayed hero must not move restored history: ${expectedY} -> ${actualY}`)
    assert.deepEqual(current.errors, [])
    return { expectedY, actualY }
  } finally {
    release()
    await page.close()
  }
}

export async function checkReadingEdgeCases(browser, base) {
  let edgeGroups = 0
  for (const family of families) {
    const current = await createReadingPage(browser, base, 390, 'morning')
    const { page } = current
    try {
      await openCatalog(page, base, family)
      const firstEntry = await activateEntry(page, family)
      const firstDetailUrl = page.url()
      await page.locator('.detail-back').click()
      await assertCatalogReturn(page, base, family, firstEntry)
      const secondEntry = await activateEntry(page, family, { index: 0 })
      assert.notEqual(firstEntry.title, secondEntry.title, 'history fixture needs distinct entries at the same catalog URL')
      await page.goBack()
      await assertCatalogReturn(page, base, family, secondEntry)
      await page.goBack()
      await page.waitForURL(firstDetailUrl)
      await page.locator(`${family.detail} .detail-title`).filter({ hasText: firstEntry.title }).waitFor({ state: 'visible' })
      await page.goBack()
      await assertCatalogReturn(page, base, family, firstEntry)
      await page.goForward()
      await page.waitForURL(firstDetailUrl)
      await page.goForward()
      await assertCatalogReturn(page, base, family, secondEntry)
      edgeGroups += 1

      await openCatalog(page, base, family)
      await activateEntry(page, family)
      const detailUrl = page.url()
      const copied = await createReadingPage(browser, base, 390, 'morning')
      try {
        await copied.page.goto(detailUrl, { waitUntil: 'load' })
        await copied.page.locator(`${family.detail} .detail-title`).waitFor({ state: 'visible' })
        await copied.page.locator('.detail-back').click()
        await assertCatalogHeading(copied.page, base, family)
        assert.deepEqual(copied.errors, [])
      } finally {
        await copied.page.close()
      }
      edgeGroups += 1
      await page.reload({ waitUntil: 'load' })
      await page.locator(`${family.detail} .detail-title`).waitFor({ state: 'visible' })
      await page.locator('.detail-back').click()
      await assertCatalogHeading(page, base, family)
      edgeGroups += 1

      const missingSearch = new URL(family.list, base).search
      await page.goto(`${base}/${family.key}/ui-check-missing-reading${missingSearch}`, { waitUntil: 'load' })
      await page.locator('.detail-missing .btn').focus()
      await page.keyboard.press('Enter')
      await assertCatalogHeading(page, base, family)
      edgeGroups += 1

      for (const [from, to] of [[320, 1440], [1440, 390]]) {
        await page.setViewportSize({ width: from, height: 900 })
        await openCatalog(page, base, family)
        const before = await activateEntry(page, family)
        await page.setViewportSize({ width: to, height: 900 })
        await page.locator('.detail-back').click()
        await assertCatalogReturn(page, base, family, before, { resized: true })
        edgeGroups += 1
      }
      assert.deepEqual(current.errors, [])
    } finally {
      await page.close()
    }
  }

  const blog = families[0]
  const project = families[1]
  const keyboard = await createReadingPage(browser, base, 390, 'stellar')
  try {
    await openCatalog(keyboard.page, base, blog)
    const before = await activateEntry(keyboard.page, blog, { cardEntry: true })
    await keyboard.page.locator('.detail-back').click()
    await assertCatalogReturn(keyboard.page, base, blog, before)
    await keyboard.page.locator('#blog-search').focus()
    await keyboard.page.locator('#blog-search').pressSequentially('RAG', { delay: 0 })
    await keyboard.page.waitForURL((url) => url.searchParams.get('q') === 'RAG')
    await assertFocused(keyboard.page.locator('#blog-search'), 'typing must retain the search input focus')
    assert.equal(await keyboard.page.locator('#blog-search').inputValue(), 'RAG')
    assert.deepEqual(keyboard.errors, [])
    edgeGroups += 1
  } finally {
    await keyboard.page.close()
  }

  const hidden = await createReadingPage(browser, base, 1440, 'nature')
  try {
    await openCatalog(hidden.page, base, project)
    const otherGroup = hidden.page.locator('#project-group-panel-ai .project-footer > .btn').first()
    await otherGroup.focus()
    await hidden.page.keyboard.press('Enter')
    await assertNewDetail(hidden.page, project)
    await hidden.page.setViewportSize({ width: 390, height: 900 })
    await hidden.page.locator('.detail-back').click()
    await assertCatalogHeading(hidden.page, base, project)
    assert.equal(await hidden.page.locator('.project-group-toggle[aria-expanded="true"]').getAttribute('aria-controls'), 'project-group-panel-fullstack')
    assert.deepEqual(hidden.errors, [])
    edgeGroups += 1
  } finally {
    await hidden.page.close()
  }

  const pointer = await createReadingPage(browser, base, 390, 'morning')
  try {
    await openCatalog(pointer.page, base, project)
    const card = pointer.page.locator(project.cards).last()
    await settleEntryAnimations(card)
    await card.locator(project.title).evaluate((element) => window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top - (window.innerHeight - 130), behavior: 'instant',
    }))
    const action = card.locator(project.action)
    const before = { title: await card.locator(project.title).innerText(), cardEntry: false, top: await action.evaluate((element) => element.getBoundingClientRect().top) }
    assert.ok(before.top >= 820, 'pointer fixture must place the explicit action below usable viewport')
    await card.locator(project.title).click()
    await assertNewDetail(pointer.page, project)
    await pointer.page.locator('.detail-back').click()
    await assertCatalogReturn(pointer.page, base, project, before, { resized: true })
    assert.deepEqual(pointer.errors, [])
    edgeGroups += 1
  } finally {
    await pointer.page.close()
  }

  for (const [path, targetId] of [['/blog/legal-rag-review', 'blog-section-2'], ['/projects/legal-rag', 'project-stack']]) {
    const fragment = await createReadingPage(browser, base, 390, 'morning')
    try {
      await fragment.page.goto(`${base}${path}#${targetId}`, { waitUntil: 'load' })
      await assertFocused(fragment.page.locator(`#${targetId}`), 'loaded fragment must keep its target')
      const position = await fragment.page.locator(`#${targetId}`).evaluate((element) => ({ top: element.getBoundingClientRect().top, y: window.scrollY }))
      assert.ok(position.y > 200 && position.top >= 0 && position.top <= 180, 'fragment must align below the navigation')
      await fragment.page.goto(`${base}${path}#%E0%A4%A`, { waitUntil: 'load' })
      await fragment.page.locator('.detail-title').waitFor({ state: 'visible' })
      assert.deepEqual(fragment.errors, [], 'malformed fragments must not throw')
      edgeGroups += 1
    } finally {
      await fragment.page.close()
    }
  }

  for (const action of ['complete', 'interaction', 'leave']) {
    const delayed = await createReadingPage(browser, base, 390, 'morning')
    let release
    const gate = new Promise((resolve) => { release = resolve })
    let resolveLoaded
    const loaded = new Promise((resolve) => { resolveLoaded = resolve })
    let resolveIntercepted
    const intercepted = new Promise((resolve) => { resolveIntercepted = resolve })
    let interceptionTimeout
    try {
      await delayed.page.route((url) => url.origin === new URL(base).origin && /\/assets\/legal-rag-review-[\w-]+\.js$/u.test(url.pathname), async (route) => {
        resolveIntercepted()
        await gate
        await route.continue()
        resolveLoaded()
      })
      await delayed.page.goto(`${base}/blog`, { waitUntil: 'load' })
      await delayed.page.locator('[data-reading-entry="blog:legal-rag-review"]').focus()
      await delayed.page.keyboard.press('Enter')
      await delayed.page.locator('.detail-missing h1').filter({ hasText: '文章载入中' }).waitFor({ state: 'visible' })
      // The loading DOM may commit before Playwright receives the request event.
      await Promise.race([
        intercepted,
        new Promise((_, reject) => {
          interceptionTimeout = setTimeout(() => reject(new Error('fixture must delay the actual article module')), 5000)
        }),
      ])
      clearTimeout(interceptionTimeout)
      assert.equal(await delayed.page.locator('.blog-post-page .detail-title').count(), 0, 'article must remain unloaded until the fixture releases its module')
      if (action === 'interaction') await delayed.page.locator('.nav-lang-toggle').click()
      if (action === 'leave') await delayed.page.locator('.mobile-tab[href="/projects"]').click()
      const beforeY = await delayed.page.evaluate(() => window.scrollY)
      const responseFinished = delayed.page.waitForResponse((response) => /\/assets\/legal-rag-review-[\w-]+\.js$/u.test(new URL(response.url()).pathname)).then((response) => response.finished())
      release()
      await loaded
      await responseFinished
      if (action === 'complete') await assertNewDetail(delayed.page, blog)
      else if (action === 'interaction') {
        await delayed.page.locator('.blog-post-page .detail-title').waitFor({ state: 'visible' })
        await settlePaint(delayed.page)
        await assertFocused(delayed.page.locator('.nav-lang-toggle'), 'late content must not steal a user-selected control')
        assert.ok(Math.abs((await delayed.page.evaluate(() => window.scrollY)) - beforeY) <= 8, 'late content must not reset user position')
      } else {
        await delayed.page.waitForURL(`${base}/projects`)
        await settlePaint(delayed.page)
        await assertFocused(delayed.page.locator('.mobile-tab[href="/projects"]'), 'leaving a delayed article must retain the new navigation focus')
      }
      assert.deepEqual(delayed.errors, [])
      edgeGroups += 1
    } finally {
      clearTimeout(interceptionTimeout)
      release()
      await delayed.page.close()
    }
  }
  const unrelated = await createReadingPage(browser, base, 390, 'morning')
  try {
    await openCatalog(unrelated.page, base, blog)
    const before = await activateEntry(unrelated.page, blog)
    await unrelated.page.locator('.detail-back').click()
    await assertCatalogReturn(unrelated.page, base, blog, before)
    await unrelated.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await settlePaint(unrelated.page)
    const statusLink = unrelated.page.locator('.mobile-tab[href="/status"]')
    await statusLink.click()
    await unrelated.page.locator('.status-section-navigator').waitFor({ state: 'visible' })
    await unrelated.page.goBack()
    await unrelated.page.waitForURL(`${base}${blog.list}`)
    await unrelated.page.locator(blog.cards).last().waitFor({ state: 'visible' })
    await settleEntryAnimations(unrelated.page.locator(blog.cards).last())
    await assertFocused(statusLink, 'history from an unrelated route must not revive an older reading entry')
    assert.ok(await unrelated.page.evaluate(() => window.scrollY <= 2), 'unrelated navigation must retain its latest catalog position')
    assert.deepEqual(unrelated.errors, [])
    edgeGroups += 1
  } finally {
    await unrelated.page.close()
  }
  await checkDelayedProjectHistory(browser, base)
  edgeGroups += 1
  return edgeGroups
}

export async function checkReadingNavigation(browser, base) {
  let matrixGroups = 0
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      for (const language of ['zh', 'en']) {
        for (const family of families) {
          await checkReadingRound(browser, base, family, width, theme, language)
          matrixGroups += 1
        }
      }
    }
  }
  let normalMotionGroups = 0
  for (const width of [320, 1440]) {
    for (const family of families) {
      await checkReadingRound(browser, base, family, width, 'stellar', 'zh', 'no-preference')
      normalMotionGroups += 1
    }
  }
  const edgeGroups = await checkReadingEdgeCases(browser, base)
  return { matrixGroups, normalMotionGroups, edgeGroups }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log(JSON.stringify({ check: 'reading-navigation', ...await checkReadingNavigation(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174') }))
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}
