import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const base = new URL(process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5180')
const evidenceDir = fileURLToPath(new URL('./evidence/', import.meta.url))
const themes = ['morning', 'nature', 'stellar']
const widths = [1440, 320, 390, 430]
const referenceDynamics = {
  morning: {
    desktop: '15|0.53|0.39|0.33|0.2|1.09|318',
    portrait: '15|0.53|0.39|0.33|0.2|1.09|262',
  },
  nature: {
    desktop: '10|0.82|0.19|0.75|3|1.03|318',
    portrait: '10|0.82|0.19|0.75|3|1.03|318',
  },
  stellar: {
    desktop: '15|0.67|0.71|0.41|0.2|1.41|318',
    portrait: '15|0.67|0.71|0.41|0.2|1.41|304',
  },
}
const captures = []

async function capture(browser, theme, width) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    colorScheme: theme === 'stellar' ? 'dark' : 'light',
  })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin === base.origin || url.protocol === 'data:' || url.protocol === 'blob:') {
      await route.fallback()
      return
    }
    await route.abort('blockedbyclient')
  })
  await page.addInitScript((siteTheme) => {
    localStorage.setItem('biau-port-theme', siteTheme)
    sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
  }, theme)

  await page.goto(base.href, { waitUntil: 'domcontentloaded' })
  await page.locator('.home-hero').waitFor({ state: 'visible' })
  await page.waitForFunction((siteTheme) => {
    const root = document.documentElement
    const flow = document.querySelector('.flow-background')
    return root.dataset.siteTheme === siteTheme
      && !root.classList.contains('harbor-intro-active')
      && flow?.getAttribute('data-flow-theme') === siteTheme
      && flow?.getAttribute('data-flow-ready') === 'true'
      && flow?.getAttribute('data-flow-motion') === 'running'
  }, theme, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2_800)

  const canvasBuffer = await page.locator('.flow-background').screenshot()
  const canvasStats = await sharp(canvasBuffer).resize({ width: 240 }).removeAlpha().stats()
  const rgbChannels = canvasStats.channels.slice(0, 3)
  const pixelRange = Math.min(...rgbChannels.map((channel) => channel.max - channel.min))
  const pixelStdDev = rgbChannels.reduce((sum, channel) => sum + channel.stdev, 0) / rgbChannels.length
  const fileName = `final-${theme}-${width}x900.png`
  await page.screenshot({ path: `${evidenceDir}/${fileName}` })

  const diagnostics = await page.evaluate(() => {
    const root = document.documentElement
    const flow = document.querySelector('.flow-background')
    const starfield = document.querySelector('.starfield-background')
    const stellar = document.querySelector('.stellar-effects')
    const themeControls = [...document.querySelectorAll('[data-theme-option]')]
    return {
      rootTheme: root.dataset.siteTheme ?? '',
      themeVersion: Number(root.dataset.siteThemeVersion ?? 0),
      flowTheme: flow?.getAttribute('data-flow-theme') ?? '',
      flowVersion: Number(flow?.getAttribute('data-flow-profile-version') ?? 0),
      flowMotion: flow?.getAttribute('data-flow-motion') ?? '',
      flowReady: flow?.getAttribute('data-flow-ready') ?? '',
      flowFallback: flow?.getAttribute('data-flow-fallback') ?? '',
      flowDynamics: flow?.getAttribute('data-flow-dynamics') ?? '',
      starfieldTheme: starfield?.getAttribute('data-starfield-theme') ?? '',
      starfieldVersion: Number(starfield?.getAttribute('data-starfield-profile-version') ?? 0),
      stellarTheme: stellar?.getAttribute('data-stellar-theme') ?? '',
      stellarState: stellar?.getAttribute('data-stellar-state') ?? '',
      flowOwners: document.querySelectorAll('canvas.flow-background').length,
      starfieldOwners: document.querySelectorAll('canvas.starfield-background').length,
      overflow: root.scrollWidth - root.clientWidth,
      pressedThemes: themeControls
        .filter((control) => control.getAttribute('aria-pressed') === 'true')
        .map((control) => control.getAttribute('data-theme-option')),
      themeTargetSizes: themeControls.map((control) => {
        const bounds = control.getBoundingClientRect()
        return { width: bounds.width, height: bounds.height }
      }),
    }
  })
  await page.close()

  return {
    theme,
    viewport: `${width}x900`,
    file: fileName,
    canvas: {
      pixelRange: Number(pixelRange.toFixed(2)),
      pixelStdDev: Number(pixelStdDev.toFixed(2)),
      nonblank: pixelRange >= 20 && pixelStdDev >= 5,
    },
    ...diagnostics,
  }
}

async function createDesktopSheet() {
  const tiles = await Promise.all(themes.map((theme) =>
    sharp(`${evidenceDir}/final-${theme}-1440x900.png`).resize(480, 300).png().toBuffer()))
  await sharp({ create: { width: 1440, height: 300, channels: 3, background: '#111111' } })
    .composite(tiles.map((input, index) => ({ input, left: index * 480, top: 0 })))
    .png()
    .toFile(`${evidenceDir}/final-desktop-contact-sheet.png`)
}

async function createMobileSheet() {
  const mobileWidths = widths.slice(1)
  const composites = []
  for (let row = 0; row < themes.length; row += 1) {
    for (let column = 0; column < mobileWidths.length; column += 1) {
      const input = await sharp(`${evidenceDir}/final-${themes[row]}-${mobileWidths[column]}x900.png`)
        .resize({ width: 160, height: 360, fit: 'contain', background: '#111111' })
        .png()
        .toBuffer()
      composites.push({ input, left: column * 160, top: row * 360 })
    }
  }
  await sharp({ create: { width: 480, height: 1080, channels: 3, background: '#111111' } })
    .composite(composites)
    .png()
    .toFile(`${evidenceDir}/final-mobile-contact-sheet.png`)
}

const browser = await chromium.launch({ headless: true })
try {
  for (const theme of themes) {
    for (const width of widths) captures.push(await capture(browser, theme, width))
  }
} finally {
  await browser.close()
}

await Promise.all([createDesktopSheet(), createMobileSheet()])
await writeFile(`${evidenceDir}/final-theme-evidence.json`, `${JSON.stringify(captures, null, 2)}\n`)

const failed = captures.filter((capture) => !capture.canvas.nonblank
  || capture.rootTheme !== capture.theme
  || capture.flowTheme !== capture.theme
  || capture.starfieldTheme !== capture.theme
  || capture.stellarTheme !== capture.theme
  || capture.flowOwners !== 1
  || capture.starfieldOwners !== 1
  || capture.overflow > 1
  || capture.flowDynamics !== referenceDynamics[capture.theme][Number.parseInt(capture.viewport, 10) <= 768 ? 'portrait' : 'desktop']
  || capture.pressedThemes.length !== 1
  || capture.pressedThemes[0] !== capture.theme
  || (Number.parseInt(capture.viewport, 10) <= 430
    && capture.themeTargetSizes.some(({ width, height }) => width < 44 || height < 44)))

console.log(`Captured ${captures.length} theme states; failed=${failed.length}`)
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2))
  process.exitCode = 1
}
