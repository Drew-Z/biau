import { chromium } from 'playwright'
import { createVerificationProgress } from './lib/verification-progress.mjs'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const commandName = 'check:ui:production-appearance'
const progress = createVerificationProgress(commandName)
const failures = []
const themes = ['morning', 'nature', 'stellar']
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
    if (window.localStorage.getItem('biau-port-theme') === null) window.localStorage.setItem('biau-port-theme', storedTheme)
    window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, { storedTheme: theme })
  return page
}

async function gotoHome(page, label) {
  const response = await page.goto(baseUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  if (!response?.ok()) failures.push(`${label}: document_http_${response?.status() ?? 'missing'}`)
  await page.locator('.home-hero').waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForFunction(() => {
    const root = document.documentElement
    return Boolean(
      root.dataset.siteTheme &&
      document.querySelector('.flow-background')?.getAttribute('data-flow-profile-version') &&
      document.querySelector('.starfield-background')?.getAttribute('data-starfield-profile-version') &&
      document.querySelector('.stellar-effects')?.getAttribute('data-stellar-profile-version'),
    )
  }, undefined, { timeout: 15_000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

const referenceDynamics = {
  morning: [15, 0.53, 0.39, 0.33, 0.2, 1.09, 318],
  nature: [10, 0.82, 0.19, 0.75, 3, 1.03, 318],
  stellar: [15, 0.67, 0.71, 0.41, 0.2, 1.41, 318],
}

function hasReferenceDynamics(theme, values) {
  const expected = referenceDynamics[theme]
  return Array.isArray(expected) && values.length === expected.length &&
    values.every((value, index) => Number.isFinite(value) && value === expected[index])
}

async function readAppearance(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const flow = document.querySelector('.flow-background')
    const starfield = document.querySelector('.starfield-background')
    const effects = document.querySelector('.stellar-effects')
    const logo = document.querySelector('.nav-logo')
    const logoMark = document.querySelector('.nav-logo-mark')
    const brand = document.querySelector('.nav-brand-link')
    const heroTitle = document.querySelector('.hero-title-rotator')
    const card = document.querySelector('.carousel-card')
    const cardTitle = card?.querySelector('strong')
    const colorProbe = document.createElement('span')
    colorProbe.style.position = 'absolute'
    colorProbe.style.visibility = 'hidden'
    document.body.append(colorProbe)
    const parseColor = (value) => {
      colorProbe.style.color = value.trim()
      const resolved = getComputedStyle(colorProbe).color
      const match = resolved.match(/^rgba?\(([^)]+)\)$/u)
      if (!match) return null
      const channels = match[1].split(',').map((channel) => Number.parseFloat(channel.trim()))
      if (channels.length < 3 || channels.slice(0, 3).some((channel) => !Number.isFinite(channel))) return null
      return {
        r: channels[0],
        g: channels[1],
        b: channels[2],
        a: Number.isFinite(channels[3]) ? channels[3] : 1,
      }
    }
    const composite = (foreground, background) => ({
      r: foreground.r * foreground.a + background.r * (1 - foreground.a),
      g: foreground.g * foreground.a + background.g * (1 - foreground.a),
      b: foreground.b * foreground.a + background.b * (1 - foreground.a),
      a: 1,
    })
    const luminance = (color) => {
      if (!color) return null
      return [color.r, color.g, color.b].reduce((sum, channel, index) => {
        const normalized = channel / 255
        const linear = normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
        return sum + linear * [0.2126, 0.7152, 0.0722][index]
      }, 0)
    }
    const contrast = (foreground, background) => {
      const foregroundColor = parseColor(foreground)
      const backgroundColor = parseColor(background)
      if (!foregroundColor || !backgroundColor) return 0
      const a = luminance(foregroundColor)
      const b = luminance(backgroundColor)
      return a === null || b === null ? 0 : (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    const rect = (selector) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const bounds = element.getBoundingClientRect()
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: bounds.width, height: bounds.height }
    }
    const rootStyle = getComputedStyle(root)
    const pageSolid = rootStyle.getPropertyValue('--home-page-solid')
    const panelBackground = parseColor(rootStyle.getPropertyValue('--home-panel-bg'))
    const cardBackground = parseColor(rootStyle.getPropertyValue('--home-card-bg'))
    const solidBackground = parseColor(pageSolid)
    const resolvedPanelBackground = panelBackground && solidBackground ? composite(panelBackground, solidBackground) : null
    const resolvedCardBackground = cardBackground && solidBackground ? composite(cardBackground, solidBackground) : null
    const serializeColor = (color) => color ? `rgb(${color.r} ${color.g} ${color.b})` : ''
    const appearance = {
      theme: root.dataset.siteTheme ?? '',
      themeVersion: Number.parseInt(root.dataset.siteThemeVersion ?? '0', 10),
      flowTheme: flow?.getAttribute('data-flow-theme') ?? '',
      flowVersion: Number.parseInt(flow?.getAttribute('data-flow-profile-version') ?? '0', 10),
      starfieldTheme: starfield?.getAttribute('data-starfield-theme') ?? '',
      starfieldVersion: Number.parseInt(starfield?.getAttribute('data-starfield-profile-version') ?? '0', 10),
      starfieldCount: Number.parseInt(starfield?.getAttribute('data-starfield-count') ?? '0', 10),
      stellarTheme: effects?.getAttribute('data-stellar-theme') ?? '',
      stellarVersion: Number.parseInt(effects?.getAttribute('data-stellar-profile-version') ?? '0', 10),
      stellarState: effects?.getAttribute('data-stellar-state') ?? '',
      perimeterOpacity: Number.parseFloat(rootStyle.getPropertyValue('--stellar-scene-perimeter-opacity')) || 0,
      logoTag: logo?.tagName ?? '',
      logoTheme: logo?.getAttribute('data-theme') ?? '',
      brandHref: brand?.getAttribute('href') ?? '',
      logoOpacity: Number.parseFloat(logoMark ? getComputedStyle(logoMark).opacity : '0'),
      heroContrast: heroTitle ? contrast(getComputedStyle(heroTitle).color, serializeColor(resolvedPanelBackground)) : 0,
      cardContrast: cardTitle ? contrast(getComputedStyle(cardTitle).color, serializeColor(resolvedCardBackground)) : 0,
      flowDynamics: (flow?.getAttribute('data-flow-dynamics') ?? '').split('|').filter(Boolean).map(Number),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      controls: {
        logo: rect('.nav-logo'),
        brand: rect('.nav-brand-link'),
        language: rect('.nav-lang-toggle'),
        theme: rect('.nav-theme-selector'),
      },
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    }
    colorProbe.remove()
    return appearance
  })
}

function hasContainedControls(appearance) {
  return Object.values(appearance.controls).every((bounds) => bounds &&
    bounds.width > 0 && bounds.height > 0 &&
    bounds.left >= -1 && bounds.top >= -1 &&
    bounds.right <= appearance.viewportWidth + 1 && bounds.bottom <= appearance.viewportHeight + 1)
}

function hasSharedThemeOwner(appearance, theme) {
  return appearance.theme === theme &&
    appearance.flowTheme === theme && appearance.starfieldTheme === theme && appearance.stellarTheme === theme &&
    appearance.logoTheme === theme && appearance.logoTag === 'A' && appearance.brandHref === '/' &&
    appearance.themeVersion >= 1 && appearance.flowVersion >= 1 && appearance.starfieldVersion >= 1 && appearance.stellarVersion >= 1
}

function hasThemeSpecificEffects(appearance, theme) {
  if (theme === 'stellar') {
    return appearance.stellarState === 'running' && appearance.perimeterOpacity > 0 && appearance.starfieldCount >= 100
  }
  return appearance.stellarState === 'inactive' && appearance.perimeterOpacity <= 0.01 && appearance.starfieldCount < 100
}

const browser = await chromium.launch({ headless: true })
try {
  for (const theme of themes) {
    await runGroup('theme-appearance', theme, async () => {
      const label = `production ${theme}`
      const page = await createProductionPage(browser, { viewport: { width: 1440, height: 1000 }, colorScheme: theme === 'stellar' ? 'dark' : 'light' }, theme, label)
      try {
        await gotoHome(page, label)
        const appearance = await readAppearance(page)
        if (!hasSharedThemeOwner(appearance, theme) || !hasReferenceDynamics(theme, appearance.flowDynamics)) {
          failures.push(`${label}: theme owner, profile version, navigation, or dynamics contract failed`)
        }
        if (appearance.logoOpacity < 0.95 || appearance.heroContrast < 4.5 || appearance.cardContrast < 4.5) {
          failures.push(`${label}: logo visibility or homepage contrast contract failed ${JSON.stringify({ logoOpacity: appearance.logoOpacity, heroContrast: appearance.heroContrast, cardContrast: appearance.cardContrast })}`)
        }
        if (!hasThemeSpecificEffects(appearance, theme)) {
          failures.push(`${label}: Stellar-only effects or dense starfield contract failed`)
        }
      } finally {
        await page.close()
      }
    })
  }

  await runGroup('theme-keyboard-persistence', 'morning-nature-stellar', async () => {
    const label = 'production theme persistence'
    const page = await createProductionPage(browser, { viewport: { width: 1440, height: 1000 }, colorScheme: 'light' }, 'morning', label)
    try {
      await gotoHome(page, label)
      await page.locator('[data-theme-option="nature"]').click()
      await page.waitForFunction(() => document.documentElement.dataset.siteTheme === 'nature')
      await page.locator('[data-theme-option="stellar"]').focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.documentElement.dataset.siteTheme === 'stellar')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.home-hero').waitFor({ state: 'visible', timeout: 15_000 })
      await page.waitForFunction(() => document.documentElement.dataset.siteTheme === 'stellar')
      const afterReload = await readAppearance(page)
      const storedTheme = await page.evaluate(() => window.localStorage.getItem('biau-port-theme'))
      if (storedTheme !== 'stellar' || !hasSharedThemeOwner(afterReload, 'stellar')) {
        failures.push(`${label}: click, Enter, and refresh must preserve the selected theme`)
      }
    } finally {
      await page.close()
    }
  })

  await runGroup('default-theme-appearance', 'morning', async () => {
    const label = 'production default appearance'
    const page = await createProductionPage(browser, { viewport: { width: 1440, height: 1000 }, colorScheme: 'light' }, 'morning', label)
    try {
      await gotoHome(page, label)
      await page.waitForFunction(() => document.documentElement.dataset.siteTheme === 'morning')
      const appearance = await readAppearance(page)
      const stored = await page.evaluate(() => ({
        theme: window.localStorage.getItem('biau-port-theme'),
      }))
      if (!hasSharedThemeOwner(appearance, 'morning') || stored.theme !== 'morning') {
        failures.push(`${label}: a fresh browser should default to Morning without a second appearance axis`)
      }
    } finally {
      await page.close()
    }
  })

  for (const theme of themes) {
    for (const width of mobileWidths) {
      await runGroup('mobile-containment', `${theme}/${width}`, async () => {
        const label = `mobile ${theme}/${width}`
        const page = await createProductionPage(browser, { viewport: { width, height: 900 }, colorScheme: theme === 'stellar' ? 'dark' : 'light' }, theme, label)
        try {
          await gotoHome(page, label)
          const appearance = await readAppearance(page)
          if (
            !hasSharedThemeOwner(appearance, theme) || !hasContainedControls(appearance) ||
            appearance.overflow > 1 || appearance.logoOpacity < 0.95
          ) {
            failures.push(`${label}: theme owner, logo/brand controls, or horizontal containment contract failed`)
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
  console.log(`[${commandName}] 14-group production appearance matrix verified at ${baseUrl.origin}`)
}
