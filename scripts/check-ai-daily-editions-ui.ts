import assert from 'node:assert/strict'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { editionFixture } from './lib/ai-daily-edition-fixtures.ts'
import { emptyIndex, packageEdition, planPublication } from './horizon/editions.ts'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'
import { selectSiteLanguage } from './lib/ui-language.mjs'

const morning = await packageEdition(await editionFixture(), '2026-11-05T00:11:00.000Z')
const evening = await packageEdition(await editionFixture('evening'), '2026-11-05T12:11:00.000Z')
const index = planPublication(planPublication(emptyIndex, morning).index, evening).index
const server = await createServer({ server: { host: '127.0.0.1', port: 5187, strictPort: false }, define: { 'import.meta.env.VITE_AI_DAILY_EDITIONS_ENABLED': '"true"' } })
await server.listen()
const base = server.resolvedUrls!.local[0].replace(/\/$/u, '')
const browser = await chromium.launch({ headless: true })
let groups = 0
try {
  for (const width of [320, 390, 430, 1440]) for (const theme of ['morning', 'nature', 'stellar']) for (const language of ['zh', 'en']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.clock.setFixedTime(new Date('2026-11-07T00:00:00Z'))
    const errors: string[] = []
    const requests: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await context.addInitScript(({ theme, language }) => {
      if (!localStorage.getItem('biau-port-theme')) localStorage.setItem('biau-port-theme', theme)
      if (!localStorage.getItem('biau-port-language')) localStorage.setItem('biau-port-language', language)
      localStorage.setItem('biau-port-intro-seen', 'true')
    }, { theme, language })
    await installLocalNetworkGuard(page, base, () => errors.push('external-request'))
    let failed = false
    let badHash = false
    let empty = false
    await page.route(`${base}/api/**`, async (route) => {
      const request = route.request()
      requests.push(`${request.method()} ${new URL(request.url()).pathname}`)
      const path = new URL(request.url()).pathname
      let body: unknown = { error: 'offline-fixture' }
      let status = 503
      if (path === '/api/ai-daily' && !failed) { body = empty ? emptyIndex : index; status = 200 }
      else if (path.startsWith('/api/ai-daily/editions/') && !failed) {
        const detail = path.endsWith(morning.edition.editionId) ? morning : evening
        body = badHash ? { ...detail, markdown: 'corrupt' } : detail
        status = 200
      }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    })
    await page.goto(`${base}/ai-daily`)
    await page.locator('.daily-edition-row').first().waitFor()
    assert.equal(await page.locator('.daily-edition-row').count(), 2)
    assert.equal(await page.locator('.daily-editions').getAttribute('lang'), language === 'zh' ? 'zh-CN' : 'en')
    assert.ok(await page.locator('.daily-editions-note').isVisible())
    failed = true
    await page.getByRole('button', { name: language === 'zh' ? '刷新日报' : 'Refresh editions', exact: true }).click()
    await page.getByRole('alert').waitFor()
    assert.equal(await page.locator('.daily-edition-row').count(), 2)
    failed = false
    await page.locator('.daily-edition-row h2 a').first().click()
    await page.locator('.daily-edition-markdown').waitFor()
    assert.equal(await page.locator('.daily-edition-markdown').getAttribute('lang'), 'zh-CN')
    const content = await page.locator('.daily-edition-markdown').textContent()
    assert.ok(content?.includes('离线测试期刊'))
    const bodyWidth = await page.locator('#daily-body').evaluate((element) => element.getBoundingClientRect().width)
    assert.ok(bodyWidth >= (width >= 1000 ? 600 : width - 70), `reading column too narrow: ${bodyWidth}`)
    const anchor = page.locator('.daily-edition-markdown a[href="#daily-model-news"]')
    await anchor.click()
    assert.ok(page.url().endsWith('#daily-model-news'))
    await page.locator('summary').focus()
    await page.keyboard.press('Enter')
    assert.equal(await page.locator('details').getAttribute('open'), '')
    assert.ok(await page.locator('.daily-edition-sources a').isVisible())
    assert.equal(await page.locator('.daily-edition-sources a').getAttribute('rel'), 'noopener noreferrer')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    assert.equal(overflow, false, `${width}/${theme}/${language}: horizontal overflow`)
    assert.deepEqual(errors, [])
    assert.ok(requests.every((request) => request.startsWith('GET ')))
    if (width === 390 && theme === 'stellar' && language === 'zh') {
      const count = requests.length
      await selectSiteLanguage(page, 'en')
      assert.equal(await page.locator('.daily-edition-markdown').textContent(), content)
      assert.equal(requests.length, count)
      await page.reload()
      await page.locator('.daily-edition-markdown').waitFor()
      assert.equal(await page.locator('.daily-edition-detail').getAttribute('lang'), 'en')
      badHash = true
      await page.reload()
      await page.locator('.detail-missing').waitFor()
      assert.equal(await page.locator('.daily-edition-markdown').count(), 0)
      badHash = false
      empty = true
      await page.goto(`${base}/ai-daily`)
      await page.locator('.ai-daily-public-empty').waitFor()
      assert.equal(await page.locator('.daily-edition-row').count(), 0)
      empty = false
    }
    if (process.env.UI_CHECK_ARTIFACT_DIR && language === 'zh' && ((width === 1440 && theme === 'morning') || (width === 390 && theme === 'stellar'))) {
      await page.goto(`${base}/ai-daily/${morning.edition.editionId}`)
      await page.locator('.daily-edition-markdown').waitFor()
      await page.screenshot({ path: join(process.env.UI_CHECK_ARTIFACT_DIR, `ai-daily-${theme}-${width}.png`), fullPage: true })
    }
    await context.close()
    groups += 1
  }
  console.log(JSON.stringify({ ok: true, matrixGroups: groups, modelCalls: 0, externalRequests: 0 }))
} finally {
  await browser.close()
  await server.close()
}
