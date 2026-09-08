import assert from 'node:assert/strict'

export async function assertSiteLanguage(page, language) {
  const label = language === 'en' ? 'EN' : '中'
  await page.waitForFunction((expected) => document.querySelector('.nav-lang-toggle')?.textContent?.trim() === expected, label)
  assert.equal(await page.locator('html').getAttribute('lang'), language === 'en' ? 'en' : 'zh-CN', 'document language must follow the visitor preference')
}

export async function selectSiteLanguage(page, language) {
  const toggle = page.locator('.nav-lang-toggle')
  await toggle.waitFor({ state: 'visible' })
  if ((await toggle.innerText()).trim() !== (language === 'en' ? 'EN' : '中')) await toggle.click()
  await assertSiteLanguage(page, language)
}
