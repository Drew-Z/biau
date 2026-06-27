import { chromium } from 'playwright'

const base = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'
const siteUrl = 'https://biau.playlab.eu.cc'

const routes = [
  { path: '/', title: 'BIAU PORT', nav: '所有项目', canonical: '/' },
  { path: '/projects', title: '项目集', nav: '回主页', canonical: '/projects' },
  { path: '/blog', title: '知识库', nav: '回主页', canonical: '/blog' },
  { path: '/projects/legal-rag', title: 'Legal RAG', nav: '回主页', canonical: '/projects/legal-rag' },
  {
    path: '/blog/ai-fullstack-day-01-rag-overview',
    title: 'RAG 系统入门',
    nav: '回主页',
    canonical: '/blog/ai-fullstack-day-01-rag-overview',
  },
  { path: '/missing-route-for-ui-check', title: '页面没有靠岸', nav: '回主页', canonical: '/missing-route-for-ui-check' },
]

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 900 },
]

const failures = []
const browser = await chromium.launch({ headless: true })

for (const viewport of viewports) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport })
    const logs = []

    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        logs.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`))

    await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' })

    const titleText = await page.locator('h1, .hero-title-main').first().innerText().catch(() => '')
    const navCount = await page.locator('.nav-all-tools').count()
    const navText = navCount > 0 ? (await page.locator('.nav-all-tools').innerText()).trim() : 'hidden'
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')

    if (!titleText.includes(route.title)) {
      failures.push(`${viewport.name} ${route.path}: expected title containing "${route.title}", got "${titleText}"`)
    }

    if (viewport.name === 'desktop' && navText !== route.nav) {
      failures.push(`${viewport.name} ${route.path}: expected nav "${route.nav}", got "${navText}"`)
    }

    if (overflowX) {
      failures.push(`${viewport.name} ${route.path}: horizontal overflow detected`)
    }

    if (viewport.name === 'desktop' && canonical !== `${siteUrl}${route.canonical}`) {
      failures.push(`${viewport.name} ${route.path}: expected canonical "${siteUrl}${route.canonical}", got "${canonical}"`)
    }

    if (viewport.name === 'desktop' && (!description || description.length < 20)) {
      failures.push(`${viewport.name} ${route.path}: missing useful meta description`)
    }

    if (viewport.name === 'desktop' && (!ogTitle || ogTitle.length < 8)) {
      failures.push(`${viewport.name} ${route.path}: missing useful og:title`)
    }

    if (logs.length > 0) {
      failures.push(`${viewport.name} ${route.path}: ${logs.join(' | ')}`)
    }

    await page.close()
  }
}

const interactionPage = await browser.newPage({ viewport: viewports[0] })
await interactionPage.goto(`${base}/blog`, { waitUntil: 'networkidle' })
const initialCards = await interactionPage.locator('.blog-card').count()
if (initialCards !== 12) {
  failures.push(`/blog pagination: expected 12 cards on first page, got ${initialCards}`)
}
const previousButton = interactionPage.getByRole('button', { name: '上一页' })
const previousDisabled = await previousButton.isDisabled()
const previousAriaDisabled = await previousButton.getAttribute('aria-disabled')
if (!previousDisabled || previousAriaDisabled !== 'true') {
  failures.push('/blog pagination: previous button should be disabled with aria-disabled on first page')
}
await interactionPage.locator('.blog-search').fill('RAG')
await interactionPage.waitForTimeout(100)
const searchedCards = await interactionPage.locator('.blog-card').count()
const resultMeta = await interactionPage.locator('.blog-result-meta').innerText()
if (searchedCards === 0 || !resultMeta.includes('篇文章')) {
  failures.push('/blog search: expected visible search results and result meta')
}
await interactionPage.locator('.blog-search').fill('no-result-for-ui-check')
await interactionPage.waitForTimeout(100)
if (!(await interactionPage.locator('.blog-empty').isVisible())) {
  failures.push('/blog empty state: expected empty state for unmatched search')
}
await interactionPage.close()

const navFocusPage = await browser.newPage({ viewport: viewports[0] })
await navFocusPage.goto(`${base}/blog`, { waitUntil: 'networkidle' })
const expectedNavFocusTargets = new Set(['brand', '首页', '项目', '博客', 'theme', 'language', 'primary'])
const seenNavFocusTargets = new Map()
for (let index = 0; index < 16; index += 1) {
  await navFocusPage.keyboard.press('Tab')
  const focused = await navFocusPage.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null

    const styles = getComputedStyle(active)
    let key = ''
    if (active.classList.contains('nav-brand-section')) key = 'brand'
    if (active.classList.contains('nav-link-center')) key = active.textContent?.trim() ?? ''
    if (active.classList.contains('nav-theme-toggle')) key = 'theme'
    if (active.classList.contains('nav-lang-toggle')) key = 'language'
    if (active.classList.contains('nav-all-tools')) key = 'primary'
    if (!key) return null

    return {
      key,
      focusVisible: active.matches(':focus-visible'),
      hasVisibleRing: styles.boxShadow !== 'none' || styles.outlineStyle !== 'none',
    }
  })

  if (focused && !seenNavFocusTargets.has(focused.key)) {
    seenNavFocusTargets.set(focused.key, focused)
  }

  if (expectedNavFocusTargets.size === seenNavFocusTargets.size) break
}

for (const target of expectedNavFocusTargets) {
  const focused = seenNavFocusTargets.get(target)
  if (!focused) {
    failures.push(`/blog nav keyboard: expected Tab to reach ${target}`)
  } else if (!focused.focusVisible || !focused.hasVisibleRing) {
    failures.push(`/blog nav keyboard: ${target} focus should have a visible focus ring`)
  }
}
await navFocusPage.close()

const navIndicatorPage = await browser.newPage({ viewport: viewports[0] })
await navIndicatorPage.goto(`${base}/blog`, { waitUntil: 'networkidle' })
const navIndicator = await navIndicatorPage.locator('.nav-link-center.active').evaluate((item) => {
  const style = getComputedStyle(item, '::after')
  return {
    width: Number.parseFloat(style.width),
    height: Number.parseFloat(style.height),
    shadow: style.boxShadow,
    background: style.backgroundImage,
  }
})
if (navIndicator.width < 32 || navIndicator.height < 3 || navIndicator.shadow === 'none') {
  failures.push('/blog nav indicator: active underline should be wide, thick, and visible')
}
await navIndicatorPage.close()

for (const path of ['/projects', '/blog']) {
  const routeFlashPage = await browser.newPage({ viewport: viewports[0] })
  await routeFlashPage.addInitScript(() => {
    window.__routeFlashEvents = []
    const record = (kind, value) => {
      window.__routeFlashEvents.push({ kind, value, time: Math.round(performance.now()) })
    }
    document.addEventListener('DOMContentLoaded', () => {
      record('domcontentloaded-route-loading', String(!!document.querySelector('.route-loading')))
      const observer = new MutationObserver(() => {
        if (document.querySelector('.route-loading')) record('route-loading', 'present')
      })
      observer.observe(document.body, { childList: true, subtree: true })
      window.setTimeout(() => observer.disconnect(), 1200)
    })
  })
  await routeFlashPage.goto(`${base}${path}`, { waitUntil: 'load' })
  await routeFlashPage.waitForTimeout(1300)
  const routeFlashEvents = await routeFlashPage.evaluate(() => window.__routeFlashEvents ?? [])
  if (routeFlashEvents.some((event) => event.value === 'present' || event.value === 'true')) {
    failures.push(`${path} route flash: should not show route-loading during initial render`)
  }
  await routeFlashPage.close()
}

const homeIntroPage = await browser.newPage({ viewport: viewports[0] })
await homeIntroPage.addInitScript(() => {
  window.sessionStorage.removeItem('biau-port-harbor-intro:v1')
  window.__harborIntroEvents = []
  for (const type of ['animationstart', 'animationend']) {
    document.addEventListener(
      type,
      (event) => {
        if (!(event.target instanceof Element)) return
        if (!String(event.animationName).startsWith('harbor')) return
        window.__harborIntroEvents.push({
          type,
          name: event.animationName,
          className: event.target.className,
          time: Math.round(performance.now()),
        })
      },
      true,
    )
  }
})
await homeIntroPage.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
await homeIntroPage.waitForSelector('.harbor-intro__vessel', { timeout: 3000 }).catch(() => {
  failures.push('/ home intro: expected harbor intro vessel to mount on first visit')
})
await homeIntroPage
  .waitForFunction(
    () => {
      const events = window.__harborIntroEvents ?? []
      return events.some((event) => event.name === 'harborIntroVeil') && !document.querySelector('.harbor-intro')
    },
    null,
    { timeout: 10000 },
  )
  .catch(() => {
    failures.push('/ home intro: expected harbor intro to finish and unmount')
  })
const harborIntroEvents = await homeIntroPage.evaluate(() => window.__harborIntroEvents ?? [])
const vesselStartEvent = harborIntroEvents.find(
  (event) => event.type === 'animationstart' && event.name === 'harborVesselDock',
)
const vesselEndIndex = harborIntroEvents.findIndex(
  (event) => event.type === 'animationend' && event.name === 'harborVesselDock',
)
const markEndIndex = harborIntroEvents.findIndex((event) => event.type === 'animationend' && event.name === 'harborMarkLand')
const veilEndIndex = harborIntroEvents.findIndex((event) => event.type === 'animationend' && event.name === 'harborIntroVeil')
if (vesselEndIndex < 0 || markEndIndex < 0 || veilEndIndex < 0) {
  failures.push('/ home intro: expected vessel, mark, and veil animation completion events')
} else if (veilEndIndex < vesselEndIndex || veilEndIndex < markEndIndex) {
  failures.push('/ home intro: veil should fade only after vessel and mark finish docking')
} else if (!vesselStartEvent || harborIntroEvents[veilEndIndex].time - vesselStartEvent.time > 3000) {
  failures.push('/ home intro: expected harbor intro animation span to complete within 3s')
}
await homeIntroPage.close()

const homeCarouselPage = await browser.newPage({ viewport: viewports[0] })
await homeCarouselPage.addInitScript(() => {
  window.sessionStorage.setItem('biau-port-harbor-intro:v1', '1')
})
await homeCarouselPage.goto(`${base}/`, { waitUntil: 'networkidle' })
const carouselViewport = homeCarouselPage.locator('.carousel-viewport')
const carouselTrack = homeCarouselPage.locator('.carousel-track')
await carouselViewport.hover({ force: true })
const initialScrollY = await carouselTrack.evaluate((track) =>
  getComputedStyle(track).getPropertyValue('--carousel-scroll-y').trim()
)
const carouselNativeHintCount = await homeCarouselPage
  .locator('.carousel-card[title], .carousel-card [title], a.carousel-card[href]')
  .count()
if (carouselNativeHintCount > 0) {
  failures.push('/ home carousel: cards should not expose native browser title/url hints')
}
await homeCarouselPage.mouse.wheel(0, 260)
await homeCarouselPage.waitForTimeout(180)
const quickWheelScrollY = await carouselTrack.evaluate((track) =>
  getComputedStyle(track).getPropertyValue('--carousel-scroll-y').trim()
)
if (!quickWheelScrollY || quickWheelScrollY === initialScrollY) {
  failures.push('/ home carousel: expected mouse wheel to update carousel position promptly')
}
await homeCarouselPage.waitForFunction(
  (initial) => {
    const track = document.querySelector('.carousel-track')
    if (!track) return false
    const style = getComputedStyle(track)
    const scrollY = style.getPropertyValue('--carousel-scroll-y').trim()
    return scrollY && scrollY !== initial && style.transform !== 'none'
  },
  initialScrollY,
  { timeout: 2000 },
).catch(() => {
  failures.push('/ home carousel: expected mouse wheel to update carousel transform')
})
const wheelScrollY = await carouselTrack.evaluate((track) =>
  getComputedStyle(track).getPropertyValue('--carousel-scroll-y').trim()
)
if (!wheelScrollY || wheelScrollY === initialScrollY) {
  failures.push('/ home carousel: expected carousel scroll position to change after wheel')
}
await homeCarouselPage.close()

const homeTitleDragPage = await browser.newPage({ viewport: viewports[0] })
await homeTitleDragPage.addInitScript(() => {
  window.sessionStorage.setItem('biau-port-harbor-intro:v1', '1')
})
await homeTitleDragPage.goto(`${base}/`, { waitUntil: 'networkidle' })
const titleRotator = homeTitleDragPage.locator('.hero-title-rotator')
const titleBeforeDrag = await titleRotator.getAttribute('aria-label')
const titleBox = await titleRotator.boundingBox()
if (!titleBox) {
  failures.push('/ home title drag: expected title rotator to be visible')
} else {
  await homeTitleDragPage.mouse.move(titleBox.x + titleBox.width * 0.38, titleBox.y + titleBox.height * 0.48)
  await homeTitleDragPage.mouse.down()
  await homeTitleDragPage.mouse.move(titleBox.x + titleBox.width * 0.38 + 170, titleBox.y + titleBox.height * 0.48 - 18, {
    steps: 10,
  })
  await homeTitleDragPage.mouse.up()
  await homeTitleDragPage
    .waitForFunction(
      (previous) => {
        const title = document.querySelector('.hero-title-rotator')
        return title?.getAttribute('aria-label') !== previous
      },
      titleBeforeDrag,
      { timeout: 2200 },
    )
    .catch(() => {
      failures.push('/ home title drag: expected drag release to switch hero title')
    })
}
await homeTitleDragPage.close()

const homeCarouselClickPage = await browser.newPage({ viewport: viewports[0] })
await homeCarouselClickPage.addInitScript(() => {
  window.sessionStorage.setItem('biau-port-harbor-intro:v1', '1')
})
await homeCarouselClickPage.goto(`${base}/`, { waitUntil: 'networkidle' })
await homeCarouselClickPage.locator('.carousel-viewport').hover({ force: true })
await homeCarouselClickPage.waitForTimeout(120)
await homeCarouselClickPage.locator('.carousel-card').filter({ hasText: '法律智能机器人' }).nth(1).click({ force: true })
await homeCarouselClickPage.waitForURL(`${base}/projects/legal-rag`, { timeout: 5000 }).catch(() => {
  failures.push('/ home carousel: expected Legal RAG card click to navigate to project detail')
})
await homeCarouselClickPage.close()

const keyboardPage = await browser.newPage({ viewport: viewports[0] })
await keyboardPage.goto(`${base}/projects`, { waitUntil: 'networkidle' })
for (let index = 0; index < 20; index += 1) {
  const focusedProject = await keyboardPage.evaluate(() => document.activeElement?.classList.contains('project-card'))
  if (focusedProject) break
  await keyboardPage.keyboard.press('Tab')
}
const focusedProject = await keyboardPage.evaluate(() => document.activeElement?.classList.contains('project-card'))
if (!focusedProject) {
  failures.push('/projects keyboard: expected Tab to reach a project card')
} else {
  await keyboardPage.keyboard.press('Enter')
  await keyboardPage.waitForURL(/\/projects\/[^/]+$/, { timeout: 5000 }).catch(() => {
    failures.push('/projects keyboard: Enter on focused project card did not navigate to detail page')
  })
}
await keyboardPage.close()

const imagePage = await browser.newPage({ viewport: viewports[1] })
await imagePage.goto(`${base}/projects/legal-rag`, { waitUntil: 'networkidle' })
const imageOk = await imagePage.locator('.detail-hero-image img').evaluate((image) => {
  const img = image instanceof HTMLImageElement ? image : null
  if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return false
  const rect = img.getBoundingClientRect()
  return rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1
})
const webpSource = await imagePage.locator('.detail-hero-image source[type="image/webp"]').getAttribute('srcset')
if (!imageOk) {
  failures.push('/projects/legal-rag image: detail image did not load or overflowed horizontally')
}
if (!webpSource?.endsWith('.webp')) {
  failures.push('/projects/legal-rag image: expected webp source fallback picture')
}
await imagePage.close()

await browser.close()

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`UI check passed for ${routes.length} routes across ${viewports.length} viewports at ${base}`)
