import { chromium } from 'playwright'
import { createVerificationProgress } from './lib/verification-progress.mjs'
import { installLocalNetworkGuard } from './lib/ui-network-guard.mjs'

const base = process.env.UI_CHECK_BASE ?? 'http://127.0.0.1:5174'
const routes = [
  { path: '/', title: 'BIAU PORT', expectsRouteCss: false },
  { path: '/projects', title: '项目集', expectsRouteCss: false, forbidsLoadingFlash: true },
  { path: '/blog', title: '知识库', expectsRouteCss: false, forbidsLoadingFlash: true },
  { path: '/status', title: '项目可靠性观察', expectsRouteCss: true },
  { path: '/projects/legal-rag', title: 'Legal RAG', expectsRouteCss: true },
  { path: '/projects/canvas', title: 'BIAU Canvas', expectsRouteCss: true },
  { path: '/studio/brand/logo-lab', title: 'BIAU Port Logo 对照实验', expectsRouteCss: false, logoLab: true },
]
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 900 },
  { name: 'narrow', width: 320, height: 780 },
]

const browser = await chromium.launch({ headless: true })
const failures = []
const progress = createVerificationProgress('check:ui:smoke')

try {
  for (const route of routes) {
    for (const viewport of viewports) {
      const failureCount = failures.length
      progress.start('route-smoke', `${viewport.name} ${route.path}`)
      const page = await browser.newPage({ viewport })
      let externalRequestBlocked = false
      await installLocalNetworkGuard(page, base, ({ resourceType }) => {
        if (externalRequestBlocked) return
        externalRequestBlocked = true
        failures.push(`${route.path} ${viewport.name}: external_request_blocked (${resourceType})`)
      })
      if (route.forbidsLoadingFlash) {
        await page.addInitScript(() => {
          window.__routeLoadingSeen = false
          document.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector('.route-loading')) window.__routeLoadingSeen = true
            const observer = new MutationObserver(() => {
              if (document.querySelector('.route-loading')) window.__routeLoadingSeen = true
            })
            observer.observe(document.body, { childList: true, subtree: true })
            window.setTimeout(() => observer.disconnect(), 1200)
          })
        })
      }

      try {
        await page.goto(`${base}${route.path}`, { waitUntil: 'load', timeout: 45_000 })
        await page.locator('#root').waitFor({ state: 'attached', timeout: 10_000 })
        await page.locator('.route-loading').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})
        await page.getByText(route.title, { exact: route.path === '/' }).first().waitFor({ state: 'visible', timeout: 10_000 })

        const state = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          routeCssLoaded: Boolean(
            document.querySelector('style[data-vite-dev-id*="route-pages.css"], link[href*="route-pages"]'),
          ),
          routeLoadingSeen: Boolean(window.__routeLoadingSeen),
          logoLab: {
            codexMarks: document.querySelectorAll('.codex-logo-v3-mark').length,
            labelledCodexMarks: document.querySelectorAll('.codex-logo-v3-mark[role="img"]').length,
            claudeMarks: document.querySelectorAll('.claude-logo-v3-mark').length,
            labelledClaudeMarks: document.querySelectorAll('.claude-logo-v3-mark[role="img"]').length,
            mobileTabbarDisplay: document.querySelector('.mobile-tabbar')
              ? getComputedStyle(document.querySelector('.mobile-tabbar')).display
              : 'missing',
          },
        }))

        if (state.overflow > 1) {
          failures.push(`${route.path} ${viewport.name}: document overflowed horizontally by ${state.overflow}px`)
        }
        if (route.expectsRouteCss && !state.routeCssLoaded) {
          failures.push(`${route.path} ${viewport.name}: lazy route CSS did not load`)
        }
        if (route.forbidsLoadingFlash && state.routeLoadingSeen) {
          failures.push(`${route.path} ${viewport.name}: high-frequency route displayed route-loading`)
        }
        if (route.logoLab && (state.logoLab.codexMarks !== 9 || state.logoLab.labelledCodexMarks !== 9 || state.logoLab.claudeMarks !== 9 || state.logoLab.labelledClaudeMarks !== 9)) {
          failures.push(`${route.path} ${viewport.name}: expected 9 labelled Codex V3 and 9 labelled Claude V3 marks, got ${state.logoLab.codexMarks}/${state.logoLab.labelledCodexMarks}/${state.logoLab.claudeMarks}/${state.logoLab.labelledClaudeMarks}`)
        }
        if (route.logoLab && viewport.name !== 'desktop' && state.logoLab.mobileTabbarDisplay !== 'none') {
          failures.push(`${route.path} ${viewport.name}: mobile tabbar obscures the comparison surface`)
        }
      } catch (error) {
        failures.push(`${route.path} ${viewport.name}: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        await page.close()
        progress.finish(failures.length === failureCount)
      }
    }
  }
} catch (error) {
  failures.push(`${progress.currentLabel()}: ${error instanceof Error ? error.message : String(error)}`)
  progress.finish(false)
} finally {
  await browser.close()
}

progress.printSummary()

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`UI smoke passed for ${routes.length} routes across ${viewports.length} viewports at ${base}`)
