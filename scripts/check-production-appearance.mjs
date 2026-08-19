import { createHash } from 'node:crypto'
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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('UI_CHECK_BASE must use http or https')
  }
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

async function createProductionPage(browser, options, seed, label) {
  const page = await browser.newPage(options)
  let reportedExternalRequest = false
  await installLocalNetworkGuard(page, baseUrl, ({ resourceType }) => {
    if (reportedExternalRequest) return
    reportedExternalRequest = true
    failures.push(`${label}: external_request_blocked (${resourceType})`)
  }, { allowLoopback: false })
  page.on('pageerror', () => failures.push(`${label}: page_error`))
  await page.addInitScript(({ storedTheme, storedScene }) => {
    if (storedTheme && !window.localStorage.getItem('theme')) {
      window.localStorage.setItem('theme', storedTheme)
    }
    if (storedScene && !window.localStorage.getItem('biau-port-harbor-scene')) {
      window.localStorage.setItem('biau-port-harbor-scene', storedScene)
    }
    window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, seed)
  return page
}

async function gotoHome(page, label) {
  let response = null
  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await page.goto(baseUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      lastError = null
      break
    } catch (error) {
      lastError = error
      if (attempt === 0) await page.waitForTimeout(500)
    }
  }
  if (lastError) throw lastError
  if (!response?.ok()) failures.push(`${label}: document_http_${response?.status() ?? 'missing'}`)
  await page.locator('.home-hero').waitFor({ state: 'visible', timeout: 15_000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function readAppearance(page, expectedTheme, expectedScene) {
  return page.evaluate(({ theme, scene }) => {
    const root = document.documentElement
    const logo = document.querySelector('.nav-logo')
    const logoMark = logo?.querySelector('.nav-logo-mark')
    const homeHero = document.querySelector('.home-hero')
    const heroIntro = document.querySelector('.hero-intro')
    const eyebrow = heroIntro?.querySelector('.eyebrow')
    const heroBody = heroIntro?.querySelector('.hero-body')
    const systemStatus = heroIntro?.querySelector('.system-status')
    const heroPanel = document.querySelector('.hero-panel')
    const heroTitle = document.querySelector('.hero-title-rotator')
    const card = document.querySelector('.carousel-card')
    const cardTitle = card?.querySelector('strong')
    const sceneFoundation = document.querySelector('[data-harbor-scene-foundation]')
    const sceneWash = document.querySelector('[data-harbor-scene-layer="wash"]')
    const sceneTexture = document.querySelector('[data-harbor-scene-layer="texture"]')
    const sceneLandmark = document.querySelector('[data-harbor-scene-layer="landmark"]')
    const footer = document.querySelector('.site-footer')

    const resolveColor = (value) => {
      const probe = document.createElement('span')
      probe.style.color = value
      document.body.append(probe)
      const resolved = getComputedStyle(probe).color
      probe.remove()
      return resolved
    }
    const luminance = (value) => {
      const channels = value.match(/[\d.]+/gu)?.slice(0, 3).map(Number) ?? []
      if (channels.length !== 3) return null
      const linear = channels.map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
    }
    const contrast = (foreground, background) => {
      const foregroundLuminance = luminance(foreground)
      const backgroundLuminance = luminance(background)
      if (foregroundLuminance === null || backgroundLuminance === null) return 0
      return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    }

    const logoRect = logo?.getBoundingClientRect()
    const logoStyle = logoMark ? getComputedStyle(logoMark) : null
    const cardStyle = card ? getComputedStyle(card) : null
    const eyebrowRect = eyebrow?.getBoundingClientRect()
    const statusRect = systemStatus?.getBoundingClientRect()
    const panelRect = heroPanel?.getBoundingClientRect()
    const foundationRect = sceneFoundation?.getBoundingClientRect()
    const foundationStyle = sceneFoundation ? getComputedStyle(sceneFoundation) : null
    const footerStyle = footer ? getComputedStyle(footer) : null
    const introContentCenter = eyebrowRect && statusRect ? (eyebrowRect.top + statusRect.bottom) / 2 : 0
    const panelCenter = panelRect ? panelRect.top + panelRect.height / 2 : 0
    return {
      expectedTheme: theme,
      expectedScene: scene,
      resolvedTheme: root.dataset.colorMode ?? '',
      resolvedScene: root.dataset.harborScene ?? '',
      lightClass: root.classList.contains('light-theme'),
      logoTag: logo?.tagName ?? '',
      logoOpacity: Number.parseFloat(logoStyle?.opacity ?? '0'),
      logoWidth: logoRect?.width ?? 0,
      logoHeight: logoRect?.height ?? 0,
      logoPseudoContent: logo ? getComputedStyle(logo, '::before').content : '',
      heroBody: heroBody?.textContent?.trim() ?? '',
      introCenterDelta: Math.abs(introContentCenter - panelCenter),
      sceneFoundationReady: Boolean(
        foundationRect &&
        foundationRect.width >= window.innerWidth &&
        foundationRect.height >= window.innerHeight &&
        foundationStyle?.position === 'fixed' &&
        foundationStyle.pointerEvents === 'none'
      ),
      sceneLayerCount: sceneFoundation?.querySelectorAll('[data-harbor-scene-layer]').length ?? 0,
      footerBackground: footerStyle?.backgroundImage ?? '',
      materialSignature: homeHero && heroPanel && sceneFoundation && sceneWash && sceneTexture && sceneLandmark && footer
        ? [
            foundationStyle?.backgroundColor,
            getComputedStyle(sceneWash).backgroundImage,
            getComputedStyle(sceneTexture).backgroundImage,
            getComputedStyle(sceneTexture).backgroundSize,
            getComputedStyle(sceneLandmark).backgroundImage,
            getComputedStyle(homeHero, '::before').backgroundImage,
            getComputedStyle(heroPanel).backgroundImage,
            footerStyle?.backgroundImage,
          ].join('|')
        : '',
      heroContrast: heroTitle
        ? contrast(getComputedStyle(heroTitle).color, resolveColor('var(--home-page-solid)'))
        : 0,
      cardContrast: cardTitle && cardStyle
        ? contrast(getComputedStyle(cardTitle).color, cardStyle.backgroundColor)
        : 0,
    }
  }, { theme: expectedTheme, scene: expectedScene })
}

const browser = await chromium.launch({ headless: true })
const flowSignatures = new Set()
const materialSignatures = new Set()

try {
  for (const theme of themes) {
    for (const scene of scenes) {
      await runGroup('appearance-matrix', `${theme}/${scene}`, async () => {
        const label = `appearance ${theme}/${scene}`
        const page = await createProductionPage(
          browser,
          { viewport: { width: 1440, height: 1000 }, colorScheme: theme },
          { storedTheme: theme, storedScene: scene },
          label,
        )
        try {
          await gotoHome(page, label)
          const canvas = page.locator('.flow-background[data-flow-ready="true"]')
          await canvas.waitFor({ state: 'attached', timeout: 15_000 })
          flowSignatures.add(createHash('sha256').update(await canvas.screenshot()).digest('hex'))
          const appearance = await readAppearance(page, theme, scene)
          materialSignatures.add(appearance.materialSignature)
          if (
            appearance.resolvedTheme !== theme ||
            appearance.resolvedScene !== scene ||
            appearance.lightClass !== (theme === 'light')
          ) {
            failures.push(`${label}: persisted root state mismatch`)
          }
          if (
            appearance.logoTag !== 'BUTTON' ||
            appearance.logoOpacity < 0.95 ||
            appearance.logoWidth < 32 ||
            appearance.logoHeight < 32 ||
            appearance.logoPseudoContent.includes('泊')
          ) {
            failures.push(`${label}: real logo is not visible in the scene control`)
          }
          if (appearance.heroContrast < 4.5 || appearance.cardContrast < 4.5) {
            failures.push(
              `${label}: contrast ${appearance.heroContrast.toFixed(2)}/${appearance.cardContrast.toFixed(2)}`,
            )
          }
          if (appearance.heroBody !== '记录每个产品从构想到上线的过程，并公开它的能力边界、当前状态与验证证据。') {
            failures.push(`${label}: audited product-boundary statement is missing`)
          }
          if (appearance.introCenterDelta > 48) {
            failures.push(`${label}: intro is not vertically balanced with the project board`)
          }
          if (!appearance.sceneFoundationReady || appearance.sceneLayerCount !== 3 || appearance.footerBackground === 'none') {
            failures.push(`${label}: fixed three-layer scene foundation or themed footer is missing`)
          }
          if (theme === themes.at(-1) && scene === scenes.at(-1) && flowSignatures.size !== 6) {
            failures.push(`${label}: expected 6 distinct Flow frames, got ${flowSignatures.size}`)
          }
          if (theme === themes.at(-1) && scene === scenes.at(-1) && materialSignatures.size !== 6) {
            failures.push(`${label}: expected 6 distinct scene material signatures, got ${materialSignatures.size}`)
          }
        } finally {
          await page.close()
        }
      })
    }
  }

  await runGroup('scene-persistence', 'desktop', async () => {
    const label = 'scene persistence'
    const page = await createProductionPage(
      browser,
      { viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' },
      { storedTheme: 'dark', storedScene: 'dusk' },
      label,
    )
    try {
      await gotoHome(page, label)
      const sceneButton = page.locator('.nav-logo')
      await sceneButton.focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.documentElement.dataset.harborScene === 'garden')
      const storedScene = await page.evaluate(() => window.localStorage.getItem('biau-port-harbor-scene'))
      if (storedScene !== 'garden') failures.push(`${label}: keyboard change was not stored`)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.documentElement.dataset.harborScene === 'garden')
      if ((await page.locator('.nav-logo').getAttribute('data-scene')) !== 'garden') {
        failures.push(`${label}: refresh did not restore garden`)
      }
    } finally {
      await page.close()
    }
  })

  await runGroup('auto-theme', 'desktop', async () => {
    const label = 'auto theme'
    const page = await createProductionPage(
      browser,
      { viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' },
      { storedTheme: 'auto', storedScene: 'dusk' },
      label,
    )
    try {
      await gotoHome(page, label)
      await page.waitForFunction(() => document.documentElement.dataset.colorMode === 'dark')
      await page.emulateMedia({ colorScheme: 'light' })
      await page.waitForFunction(
        () => document.documentElement.dataset.colorMode === 'light' && document.documentElement.classList.contains('light-theme'),
      )
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.waitForFunction(
        () => document.documentElement.dataset.colorMode === 'dark' && !document.documentElement.classList.contains('light-theme'),
      )
      if ((await page.evaluate(() => window.localStorage.getItem('theme'))) !== 'auto') {
        failures.push(`${label}: system changes replaced the stored preference`)
      }
    } finally {
      await page.close()
    }
  })

  for (const theme of themes) {
    for (const width of mobileWidths) {
      await runGroup('mobile-containment', `${theme}/${width}`, async () => {
        const label = `mobile ${theme}/${width}`
        const page = await createProductionPage(
          browser,
          { viewport: { width, height: 900 }, colorScheme: theme },
          { storedTheme: theme, storedScene: 'dusk' },
          label,
        )
        try {
          await gotoHome(page, label)
          const layout = await page.evaluate(() => {
            const logo = document.querySelector('.nav-logo-mark')
            const brand = document.querySelector('.nav-brand-section')?.getBoundingClientRect()
            const actions = document.querySelector('.nav-actions')?.getBoundingClientRect()
            const shell = document.querySelector('.nav-inner')?.getBoundingClientRect()
            return {
              resolvedTheme: document.documentElement.dataset.colorMode ?? '',
              logoOpacity: logo ? Number.parseFloat(getComputedStyle(logo).opacity) : 0,
              brandRight: brand?.right ?? Number.POSITIVE_INFINITY,
              actionsLeft: actions?.left ?? Number.NEGATIVE_INFINITY,
              shellLeft: shell?.left ?? -1,
              shellRight: shell?.right ?? Number.POSITIVE_INFINITY,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            }
          })
          if (
            layout.resolvedTheme !== theme ||
            layout.logoOpacity < 0.95 ||
            layout.brandRight > layout.actionsLeft ||
            layout.shellLeft < -1 ||
            layout.shellRight > width + 1 ||
            layout.overflow > 1
          ) {
            failures.push(`${label}: logo, navigation, or document containment failed`)
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
  console.log(`[${commandName}] Production appearance verified at ${baseUrl.origin}`)
}
