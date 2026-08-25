import { chromium } from 'playwright'
import { createVerificationProgress } from './lib/verification-progress.mjs'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const commandName = 'check:ui:production-appearance'
const progress = createVerificationProgress(commandName)
const failures = []
const themes = ['light', 'dark']
const scenes = ['dusk', 'garden', 'stellar']
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

async function createProductionPage(browser, options, theme, scene, label) {
  const page = await browser.newPage(options)
  await installLocalNetworkGuard(page, baseUrl, ({ resourceType }) => {
    failures.push(`${label}: external_request_blocked (${resourceType})`)
  }, { allowLoopback: false })
  page.on('pageerror', () => failures.push(`${label}: page_error`))
  await page.addInitScript(({ storedTheme, storedScene }) => {
    if (window.localStorage.getItem('theme') === null) window.localStorage.setItem('theme', storedTheme)
    if (window.localStorage.getItem('biau-port-harbor-scene') === null) {
      window.localStorage.setItem('biau-port-harbor-scene', storedScene)
    }
    window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, { storedTheme: theme, storedScene: scene })
  return page
}

async function gotoHome(page, label) {
  const response = await page.goto(baseUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  if (!response?.ok()) failures.push(`${label}: document_http_${response?.status() ?? 'missing'}`)
  await page.locator('.home-hero').waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForFunction(() => {
    const root = document.documentElement
    return Boolean(
      root.dataset.harborScene &&
      document.querySelector('.flow-background')?.getAttribute('data-flow-profile-version') &&
      document.querySelector('.starfield-background')?.getAttribute('data-starfield-profile-version') &&
      document.querySelector('.stellar-effects')?.getAttribute('data-stellar-profile-version'),
    )
  }, undefined, { timeout: 15_000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

function isValidDynamics(values) {
  const [speed, fieldScale, distortion, ribbonStrength, noiseScale, contrast, angle] = values
  return values.length === 7 &&
    values.every(Number.isFinite) &&
    speed >= 0.25 && speed <= 1.5 &&
    fieldScale >= 0.5 && fieldScale <= 1.5 &&
    distortion >= 0.25 && distortion <= 1.6 &&
    ribbonStrength >= 0.1 && ribbonStrength <= 0.9 &&
    noiseScale >= 0.5 && noiseScale <= 1.8 &&
    contrast >= 0.75 && contrast <= 1.4 &&
    angle >= 0 && angle <= 360
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
      theme: root.dataset.colorMode ?? '',
      scene: root.dataset.harborScene ?? '',
      sceneVersion: Number.parseInt(root.dataset.harborSceneVersion ?? '0', 10),
      flowScene: flow?.getAttribute('data-flow-scene') ?? '',
      flowVersion: Number.parseInt(flow?.getAttribute('data-flow-profile-version') ?? '0', 10),
      starfieldScene: starfield?.getAttribute('data-starfield-scene') ?? '',
      starfieldVersion: Number.parseInt(starfield?.getAttribute('data-starfield-profile-version') ?? '0', 10),
      starfieldCount: Number.parseInt(starfield?.getAttribute('data-starfield-count') ?? '0', 10),
      stellarScene: effects?.getAttribute('data-stellar-scene') ?? '',
      stellarVersion: Number.parseInt(effects?.getAttribute('data-stellar-profile-version') ?? '0', 10),
      stellarState: effects?.getAttribute('data-stellar-state') ?? '',
      perimeterOpacity: Number.parseFloat(rootStyle.getPropertyValue('--stellar-scene-perimeter-opacity')) || 0,
      logoTag: logo?.tagName ?? '',
      logoScene: logo?.getAttribute('data-scene') ?? '',
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
        theme: rect('.nav-theme-toggle'),
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

function hasSharedSceneOwner(appearance, theme, scene) {
  return appearance.theme === theme && appearance.scene === scene &&
    appearance.flowScene === scene && appearance.starfieldScene === scene && appearance.stellarScene === scene &&
    appearance.logoScene === scene && appearance.logoTag === 'BUTTON' && appearance.brandHref === '/' &&
    appearance.sceneVersion >= 1 && appearance.flowVersion >= 1 && appearance.starfieldVersion >= 1 && appearance.stellarVersion >= 1
}

function hasSceneSpecificEffects(appearance, scene) {
  if (scene === 'stellar') {
    return appearance.stellarState === 'running' && appearance.perimeterOpacity > 0 && appearance.starfieldCount >= 100
  }
  return appearance.stellarState === 'inactive' && appearance.perimeterOpacity <= 0.01 && appearance.starfieldCount < 100
}

const browser = await chromium.launch({ headless: true })
try {
  for (const theme of themes) {
    for (const scene of scenes) {
      await runGroup('scene-appearance', `${theme}/${scene}`, async () => {
        const label = `production ${theme}/${scene}`
        const page = await createProductionPage(browser, { viewport: { width: 1440, height: 1000 }, colorScheme: theme }, theme, scene, label)
        try {
          await gotoHome(page, label)
          const appearance = await readAppearance(page)
          if (!hasSharedSceneOwner(appearance, theme, scene) || !isValidDynamics(appearance.flowDynamics)) {
            failures.push(`${label}: scene owner, profile version, navigation, or dynamics contract failed`)
          }
          if (appearance.logoOpacity < 0.95 || appearance.heroContrast < 4.5 || appearance.cardContrast < 4.5) {
            failures.push(`${label}: logo visibility or homepage contrast contract failed ${JSON.stringify({ logoOpacity: appearance.logoOpacity, heroContrast: appearance.heroContrast, cardContrast: appearance.cardContrast })}`)
          }
          if (!hasSceneSpecificEffects(appearance, scene)) {
            failures.push(`${label}: Stellar-only effects or dense starfield contract failed`)
          }
        } finally {
          await page.close()
        }
      })
    }
  }

  await runGroup('scene-keyboard-persistence', 'dusk-garden-stellar-dusk', async () => {
    const label = 'production scene persistence'
    const page = await createProductionPage(browser, { viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' }, 'dark', 'dusk', label)
    try {
      await gotoHome(page, label)
      await page.locator('.nav-logo').click()
      await page.waitForFunction(() => document.documentElement.dataset.harborScene === 'garden')
      await page.locator('.nav-logo').focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.documentElement.dataset.harborScene === 'stellar')
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.documentElement.dataset.harborScene === 'dusk')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.home-hero').waitFor({ state: 'visible', timeout: 15_000 })
      await page.waitForFunction(() => document.documentElement.dataset.harborScene === 'dusk')
      const afterReload = await readAppearance(page)
      const storedScene = await page.evaluate(() => window.localStorage.getItem('biau-port-harbor-scene'))
      if (storedScene !== 'dusk' || !hasSharedSceneOwner(afterReload, 'dark', 'dusk')) {
        failures.push(`${label}: click, Enter, and refresh must preserve the selected scene`)
      }
    } finally {
      await page.close()
    }
  })

  await runGroup('auto-system-appearance', 'garden-dark-light-dark', async () => {
    const label = 'production auto appearance'
    const page = await createProductionPage(browser, { viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' }, 'auto', 'garden', label)
    try {
      await gotoHome(page, label)
      await page.waitForFunction(() => document.documentElement.dataset.colorMode === 'dark')
      await page.emulateMedia({ colorScheme: 'light' })
      await page.waitForFunction(() => document.documentElement.dataset.colorMode === 'light')
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.waitForFunction(() => document.documentElement.dataset.colorMode === 'dark')
      const appearance = await readAppearance(page)
      const stored = await page.evaluate(() => ({
        theme: window.localStorage.getItem('theme'),
        scene: window.localStorage.getItem('biau-port-harbor-scene'),
      }))
      if (!hasSharedSceneOwner(appearance, 'dark', 'garden') || stored.theme !== 'auto' || stored.scene !== 'garden') {
        failures.push(`${label}: system changes must update resolved theme without replacing the scene preference`)
      }
    } finally {
      await page.close()
    }
  })

  for (const theme of themes) {
    for (const [index, width] of mobileWidths.entries()) {
      const scene = scenes[index]
      await runGroup('mobile-containment', `${theme}/${width}/${scene}`, async () => {
        const label = `mobile ${theme}/${width}/${scene}`
        const page = await createProductionPage(browser, { viewport: { width, height: 900 }, colorScheme: theme }, theme, scene, label)
        try {
          await gotoHome(page, label)
          const appearance = await readAppearance(page)
          if (
            !hasSharedSceneOwner(appearance, theme, scene) || !hasContainedControls(appearance) ||
            appearance.overflow > 1 || appearance.logoOpacity < 0.95
          ) {
            failures.push(`${label}: scene owner, logo/brand controls, or horizontal containment contract failed`)
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
