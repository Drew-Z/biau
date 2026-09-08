import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { getPublicBlogPostSummary } from '../src/data/blogCuration.ts'
import { projects } from '../src/data/portfolio.ts'
import { projectPublications } from '../src/data/projectPublication.ts'
import { reliabilityProjects } from '../src/data/statusTargets.ts'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const families = [
  { name: 'blog', invalid: '/blog/%', encoded: '/blog/%6cegal-rag-review/', title: getPublicBlogPostSummary('legal-rag-review')?.title, list: '/blog', missing: '未找到该文章', suggestion: '总结核心结论' },
  { name: 'projects', invalid: '/projects/%E0%A4%A', encoded: '/projects/%6cegal-rag/', title: projects.find((project) => project.id === 'legal-rag')?.title, list: '/projects', missing: '未找到该项目', suggestion: '这个项目解决什么问题' },
]
const defaultLabels = ['哪些项目可演示', '律航怎么体验', '查看可靠性状态']

async function withRoutePage(browser, base, width, theme, label, run) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  const apiRequests = []
  page.on('pageerror', (error) => errors.push(error.message))
  await installLocalNetworkGuard(page, base, () => errors.push('blocked_request'), { allowLoopback: false })
  await page.route(`${base}/api/**`, (route) => {
    apiRequests.push({ method: route.request().method(), path: new URL(route.request().url()).pathname })
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local_route_fixture"}' })
  })
  await page.addInitScript((value) => {
    localStorage.setItem('biau-port-theme', value)
    sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, theme)
  try {
    await run(page)
    assert.deepEqual(errors, [], `${label}: unexpected page error or off-origin request`)
    assert(apiRequests.every((request) => request.method === 'GET' && request.path === '/api/health'), `${label}: unexpected business request`)
  } catch (error) {
    if (process.env.UI_CHECK_ARTIFACT_DIR) {
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `route-recovery-${label}-failed.png`) }).catch(() => {})
    }
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}; pageErrors=${JSON.stringify(errors)}`)
  } finally {
    await context.close()
  }
}

async function mountAssistant(page, base, closed) {
  await page.goto(`${base}/blog`, { waitUntil: 'networkidle' })
  await page.locator('.public-assistant__trigger').click()
  await page.locator('.public-assistant__panel').waitFor({ state: 'visible' })
  if (closed) await closeAssistant(page)
}

async function closeAssistant(page) {
  await page.keyboard.press('Escape')
  await page.locator('.public-assistant__panel').waitFor({ state: 'hidden' })
}

async function navigateInApp(page, pathname) {
  // Exercise React after the shell has loaded. A direct malformed request can
  // be rejected by preview middleware before the client has a chance to run.
  await page.evaluate((path) => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, pathname)
}

async function assertMissingPage(page, family) {
  const heading = page.locator('.detail-missing h1').filter({ hasText: family.missing })
  await heading.waitFor({ state: 'visible', timeout: 5000 })
  assert(await page.locator('.navigation-top').isVisible(), `${family.name}: navigation was lost`)
  assert.equal(await page.locator('.detail-missing .btn').getAttribute('href'), family.list)
}

async function checkMalformedRoute(browser, base, family, width, theme, closed) {
  const label = `${family.name}-${width}-${theme}-${closed ? 'closed' : 'open'}`
  await withRoutePage(browser, base, width, theme, label, async (page) => {
    await mountAssistant(page, base, closed)
    await navigateInApp(page, family.invalid)
    await assertMissingPage(page, family)
    if (!closed) {
      assert.deepEqual(await page.locator('.public-assistant__suggestions button').allTextContents(), defaultLabels)
      await closeAssistant(page)
    }

    await page.goBack()
    await page.locator('.blogs-grid .blog-card').first().waitFor({ state: 'visible' })
    assert.equal(new URL(page.url()).pathname, '/blog')
    await page.goForward()
    await assertMissingPage(page, family)

    if (process.env.UI_CHECK_ARTIFACT_DIR && ((width === 320 && theme === 'morning') || (width === 1440 && theme === 'stellar')) && closed) {
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: resolve(process.env.UI_CHECK_ARTIFACT_DIR, `route-recovery-${label}.png`) })
    }
    await page.locator('.detail-missing .btn').click()
    await page.waitForURL((url) => url.pathname === family.list)
    await page.locator('h1[data-reading-heading]').waitFor({ state: 'visible' })
  })
}

async function checkEncodedRoute(browser, base, family, width) {
  await withRoutePage(browser, base, width, 'morning', `${family.name}-encoded-${width}`, async (page) => {
    await mountAssistant(page, base, false)
    await navigateInApp(page, family.encoded)
    assert(family.title, `${family.name}: the encoded-route reference is missing`)
    // The catalog card has the same title in an h3 before navigation commits.
    await page.getByRole('heading', { level: 1, name: family.title, exact: true }).waitFor({ state: 'visible' })
    assert.equal(await page.locator('.public-assistant__suggestions button').first().textContent(), family.suggestion)
    await closeAssistant(page)
    await page.goBack()
    await page.locator('.blogs-grid .blog-card').first().waitFor({ state: 'visible' })
  })
}

async function checkStatusReferences(browser, base, width) {
  const statusProjects = new Map(reliabilityProjects.map((project) => [`/status/${project.id}`, project]))
  for (const publication of Object.values(projectPublications)) {
    await withRoutePage(browser, base, width, 'morning', `${publication.projectId}-status-${width}`, async (page) => {
      const expected = statusProjects.get(publication.statusHref)
      assert(publication.statusHref === '/status' || expected, `${publication.projectId}: missing status reference`)
      await page.goto(`${base}${publication.statusHref}`, { waitUntil: 'networkidle' })
      if (expected) {
        await page.locator('.status-project').waitFor({ state: 'visible' })
        assert.equal(await page.locator('h1').textContent(), expected.title)
        if (publication.projectId === 'pet-workspace') assert.equal(expected.id, 'pet-gamer')
      } else {
        await page.locator('.status-hero').waitFor({ state: 'visible' })
      }
      assert.equal(await page.locator('.detail-missing').count(), 0)
    })
  }
}

export async function checkPublicRouteRecovery(browser, base) {
  let matrixGroups = 0
  let encodedGroups = 0
  for (const width of [320, 390, 430, 1440]) {
    for (const theme of ['morning', 'nature', 'stellar']) {
      for (const family of families) {
        for (const closed of [false, true]) {
          await checkMalformedRoute(browser, base, family, width, theme, closed)
          matrixGroups += 1
        }
      }
    }
  }
  for (const width of [390, 1440]) {
    for (const family of families) {
      await checkEncodedRoute(browser, base, family, width)
      encodedGroups += 1
    }
    await checkStatusReferences(browser, base, width)
  }
  return { matrixGroups, encodedGroups, statusGroups: Object.keys(projectPublications).length * 2, modelCalls: 0 }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const browser = await chromium.launch({ headless: true })
  try {
    console.log(JSON.stringify({ check: 'public-route-recovery', ...await checkPublicRouteRecovery(browser, process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174') }))
  } finally {
    await browser.close()
  }
}
