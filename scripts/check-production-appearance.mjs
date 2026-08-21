import { chromium } from 'playwright'
import { createVerificationProgress } from './lib/verification-progress.mjs'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const commandName = 'check:ui:production-appearance'
const progress = createVerificationProgress(commandName)
const failures = []
const themes = ['light', 'dark']
const mobileWidths = [320, 390, 430]

function resolveBaseUrl() {
  const value = process.env.UI_CHECK_BASE ?? 'https://biau.pages.dev'
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('UI_CHECK_BASE must use http or https')
  url.pathname = '/'
  url.search = ''
  url.hash = ''
  return url
}

const baseUrl = resolveBaseUrl()

async function runGroup(group, context, operation) {
  const initialFailureCount = failures.length
  progress.start(group, context)
  try {
    await operation()
  } catch (error) {
    failures.push(`${group} ${context}: ${error instanceof Error ? error.name : 'unknown_error'}`)
  } finally {
    progress.finish(failures.length === initialFailureCount)
  }
}

async function createProductionPage(browser, options, theme, label) {
  const page = await browser.newPage(options)
  await installLocalNetworkGuard(page, baseUrl, ({ resourceType }) => {
    failures.push(`${label}: external_request_blocked (${resourceType})`)
  }, { allowLoopback: false })
  page.on('pageerror', () => failures.push(`${label}: page_error`))
  await page.addInitScript(({ storedTheme }) => {
    window.localStorage.setItem('theme', storedTheme)
    window.localStorage.setItem('biau-port-harbor-scene', 'garden')
    window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, { storedTheme: theme })
  return page
}

async function gotoHome(page, label) {
  const response = await page.goto(baseUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  if (!response?.ok()) failures.push(`${label}: document_http_${response?.status() ?? 'missing'}`)
  await page.locator('.home-hero').waitFor({ state: 'visible', timeout: 15_000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function readAppearance(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const flow = document.querySelector('.flow-background')
    const starfield = document.querySelector('.starfield-background')
    const effects = document.querySelector('.stellar-effects')
    const logo = document.querySelector('.nav-logo')
    const logoMark = document.querySelector('.nav-logo-mark')
    const heroTitle = document.querySelector('.hero-title-rotator')
    const card = document.querySelector('.carousel-card')
    const cardTitle = card?.querySelector('strong')
    const cardStyle = card ? getComputedStyle(card) : null
    const luminance = (value) => {
      const channels = value.match(/[\d.]+/gu)?.slice(0, 3).map(Number) ?? []
      if (channels.length !== 3) return null
      return channels.reduce((sum, channel, index) => {
        const normalized = channel / 255
        const linear = normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
        return sum + linear * [0.2126, 0.7152, 0.0722][index]
      }, 0)
    }
    const contrast = (foreground, background) => {
      const a = luminance(foreground)
      const b = luminance(background)
      return a === null || b === null ? 0 : (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    return {
      theme: root.dataset.colorMode ?? '',
      scene: root.dataset.harborScene ?? '',
      flowScene: flow?.getAttribute('data-flow-scene') ?? '',
      starfieldScene: starfield?.getAttribute('data-starfield-scene') ?? '',
      stellarScene: effects?.getAttribute('data-stellar-scene') ?? '',
      hasFoundation: Boolean(document.querySelector('[data-harbor-scene-foundation]')),
      logoTag: logo?.tagName ?? '',
      logoHref: logo?.getAttribute('href') ?? '',
      logoOpacity: Number.parseFloat(logoMark ? getComputedStyle(logoMark).opacity : '0'),
      heroContrast: heroTitle ? contrast(getComputedStyle(heroTitle).color, 'rgb(5, 10, 28)') : 0,
      cardContrast: cardTitle && cardStyle ? contrast(getComputedStyle(cardTitle).color, cardStyle.backgroundColor) : 0,
      flowDynamics: (flow?.getAttribute('data-flow-dynamics') ?? '').split('|').filter(Boolean).map(Number),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
}

const browser = await chromium.launch({ headless: true })
try {
  for (const theme of themes) {
    await runGroup('stellar-contract', theme, async () => {
      const label = `production ${theme}`
      const page = await createProductionPage(browser, { viewport: { width: 1440, height: 1000 }, colorScheme: theme }, theme, label)
      try {
        await gotoHome(page, label)
        const appearance = await readAppearance(page)
        if (
          appearance.theme !== theme || appearance.scene !== 'stellar' || appearance.flowScene !== 'stellar' ||
          appearance.starfieldScene !== 'stellar' || appearance.stellarScene !== 'stellar' || appearance.hasFoundation ||
          appearance.logoTag !== 'A' || appearance.logoHref !== '/' || appearance.logoOpacity < 0.95 ||
          appearance.flowDynamics.length !== 7 || appearance.heroContrast < 4.5 || appearance.cardContrast < 4.5
        ) failures.push(`${label}: fixed Stellar ownership, logo, dynamics, or contrast contract failed`)
      } finally {
        await page.close()
      }
    })
  }

  for (const theme of themes) {
    for (const width of mobileWidths) {
      await runGroup('mobile-containment', `${theme}/${width}`, async () => {
        const label = `mobile ${theme}/${width}`
        const page = await createProductionPage(browser, { viewport: { width, height: 900 }, colorScheme: theme }, theme, label)
        try {
          await gotoHome(page, label)
          const appearance = await readAppearance(page)
          if (appearance.theme !== theme || appearance.scene !== 'stellar' || appearance.overflow > 1 || appearance.logoOpacity < 0.95) {
            failures.push(`${label}: fixed Stellar mobile layout or navigation containment failed`)
          }
        } finally {
          await page.close()
        }
      })
    }
  }
} finally {
  await browser.close()
}

progress.printSummary()
if (failures.length > 0) {
  for (const failure of failures) console.error(failure)
  process.exitCode = 1
} else {
  console.log(`[${commandName}] Production Stellar appearance verified at ${baseUrl.origin}`)
}
