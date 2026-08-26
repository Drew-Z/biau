import { useEffect, useRef, useState } from 'react'
import { FlowRenderer } from '../background/FlowRenderer'
import { getFlowProfile } from '../background/flowPalettes'
import { isSiteTheme, type SiteTheme } from '../utils/appearance'
import { isLowPowerDevice } from '../utils/visualPerformance'

const REDUCED = '(prefers-reduced-motion: reduce)'
const SETTLED_COMPOSITOR_DELAY_MS = 120
type FlowMotionState = 'pending' | 'running' | 'reduced-settled' | 'paused' | 'css-fallback'

const isWebGlUnavailable = (value: unknown) =>
  value === 'WebGL2 unavailable' || (value instanceof Error && value.message === 'WebGL2 unavailable')

export function FlowBackground({ theme }: { theme: SiteTheme }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const initialThemeRef = useRef(theme)
  const [ready, setReady] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [motionState, setMotionState] = useState<FlowMotionState>('pending')

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    let worker: Worker | undefined
    let renderer: FlowRenderer | undefined
    let raf = 0
    let readyRaf = 0
    let motionSettleTimer = 0
    let stopped = false
    let readyReported = false
    let fallbackActive = false
    let last = 0
    let motionToken = 0
    let drawFrame: ((now: number) => void) | undefined
    let currentMotionState: FlowMotionState = 'pending'
    let profileVersion = 0
    let profileSignature = ''

    const media = matchMedia(REDUCED)
    const readReducedMotion = () => matchMedia(REDUCED).matches
    let reducedMotion = readReducedMotion()
    const readProfile = () => {
      const portrait = innerWidth <= 768 && innerHeight >= innerWidth
      const activeTheme = isSiteTheme(document.documentElement.dataset.siteTheme)
        ? document.documentElement.dataset.siteTheme
        : initialThemeRef.current
      return getFlowProfile(activeTheme, portrait)
    }
    const publishProfile = () => {
      const current = readProfile()
      const nextSignature = JSON.stringify(current)
      if (nextSignature !== profileSignature) {
        profileSignature = nextSignature
        profileVersion += 1
      }
      canvas.dataset.flowTheme = current.theme
      canvas.dataset.flowProfileVersion = String(profileVersion)
      canvas.dataset.flowDynamics = [
        current.dynamics.speed,
        current.dynamics.fieldScale,
        current.dynamics.distortion,
        current.dynamics.ribbonStrength,
        current.dynamics.noiseScale,
        current.dynamics.contrast,
        current.dynamics.angle,
      ].join('|')
      return current
    }
    const size = () => ({
      width: innerWidth,
      height: innerHeight,
      dpr: (() => {
        const profile = readProfile()
        const portrait = innerWidth <= 768 && innerHeight >= innerWidth
        return Math.min(devicePixelRatio || 1, portrait ? profile.renderBudget.mobileDpr : profile.renderBudget.desktopDpr)
      })(),
    })
    const canRun = () => !document.hidden && !document.documentElement.classList.contains('harbor-intro-active')
    const shouldAnimate = () => canRun() && !isLowPowerDevice()
    const markReady = () => {
      if (readyReported || fallbackActive) return
      readyReported = true
      readyRaf = requestAnimationFrame(() => {
        readyRaf = 0
        if (!stopped && !fallbackActive) setReady(true)
      })
    }
    const markMotion = (next: FlowMotionState) => {
      if (stopped || fallbackActive || currentMotionState === next) return
      window.clearTimeout(motionSettleTimer)
      currentMotionState = next
      setMotionState(next)
    }
    const markReducedMotionSettled = () => {
      window.clearTimeout(motionSettleTimer)
      motionSettleTimer = window.setTimeout(() => {
        if (!stopped && reducedMotion && canRun()) markMotion('reduced-settled')
      }, SETTLED_COMPOSITOR_DELAY_MS)
    }
    const activateCssFallback = (reason: unknown) => {
      fallbackActive = true
      cancelAnimationFrame(readyRaf)
      window.clearTimeout(motionSettleTimer)
      worker?.terminate()
      worker = undefined
      if (!stopped) {
        currentMotionState = 'css-fallback'
        setReady(false)
        setFallback(true)
        setMotionState('css-fallback')
      }
      if (isWebGlUnavailable(reason)) console.info('[flow-background] WebGL2 unavailable; CSS fallback active')
      else console.warn('[flow-background] CSS fallback active:', reason)
    }

    const main = () => {
      try {
        // Publish the typed profile before the first main-thread frame as well
        // as in the worker init path; UI diagnostics must be deterministic in dev.
        publishProfile()
        renderer = new FlowRenderer(canvas, { preserveDrawingBuffer: true })
        const initialSize = size()
        renderer.resize(initialSize.width, initialSize.height, initialSize.dpr)
        drawFrame = (now: number) => {
          if (stopped) return
          const reduced = reducedMotion
          const running = canRun()
          const frameBudget = readProfile().renderBudget.maxFps
          if (running && (reduced || isLowPowerDevice() || now - last >= 1000 / frameBudget)) {
            renderer?.draw(reduced || isLowPowerDevice() ? 0 : now / 1000, readProfile())
            last = now
            markReady()
            if (reduced) markReducedMotionSettled()
            else if (isLowPowerDevice()) markMotion('paused')
            else markMotion('running')
            if (reduced || isLowPowerDevice()) {
              raf = 0
              return
            }
          } else if (!running) {
            markMotion('paused')
            raf = 0
            return
          }
          if (drawFrame) raf = requestAnimationFrame(drawFrame)
        }
        raf = requestAnimationFrame(drawFrame)
      } catch (error) {
        activateCssFallback(error)
      }
    }

    const sync = () => {
      const currentSize = size()
      const currentProfile = publishProfile()
      const token = ++motionToken
      if (worker) {
        // Motion is sent last so its acknowledgement follows resize and palette updates.
        markMotion('pending')
        worker.postMessage({ type: 'resize', ...currentSize, motionToken: token })
        worker.postMessage({ type: 'profile', profile: currentProfile, motionToken: token })
        worker.postMessage({
          type: 'motion',
          reducedMotion,
          running: canRun() && !isLowPowerDevice(),
          motionToken: token,
        })
      } else if (renderer) {
        renderer.resize(currentSize.width, currentSize.height, currentSize.dpr)
        if (reducedMotion) {
          last = 0
          renderer.draw(0, currentProfile)
          markReady()
          markReducedMotionSettled()
        } else if (!canRun()) {
          markMotion('paused')
        } else if (!raf && shouldAnimate()) {
          last = 0
          if (drawFrame) raf = requestAnimationFrame(drawFrame)
        }
      }
    }

    if (!import.meta.env.DEV && 'transferControlToOffscreen' in canvas && typeof Worker !== 'undefined') {
      try {
        worker = new Worker(new URL('../background/flow.worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = ({ data }) => {
          if (data.type === 'frame') {
            markReady()
          } else if (data.type === 'motion-settled') {
            const isCurrentRequest = data.motionToken === motionToken
            const expectedRunning = canRun() && !isLowPowerDevice()
            const matchesCurrentState = data.reducedMotion === reducedMotion && data.running === expectedRunning
            if (!isCurrentRequest && !matchesCurrentState) return
            markMotion(data.reducedMotion ? 'reduced-settled' : data.running ? 'running' : 'paused')
          } else if (data.type === 'error') {
            activateCssFallback(data.message)
          }
        }
        worker.onerror = (event) => {
          event.preventDefault()
          activateCssFallback('Flow worker runtime failed')
        }
        worker.onmessageerror = () => activateCssFallback('Flow worker message failed')
        const initialSize = size()
        const token = ++motionToken
        canvas.width = Math.max(1, Math.round(initialSize.width * initialSize.dpr))
        canvas.height = Math.max(1, Math.round(initialSize.height * initialSize.dpr))
        const offscreen = canvas.transferControlToOffscreen()
        worker.postMessage(
          {
            type: 'init',
            canvas: offscreen,
            ...initialSize,
            profile: publishProfile(),
            reducedMotion,
            running: canRun() && !isLowPowerDevice(),
            motionToken: token,
          },
          [offscreen],
        )
      } catch {
        console.info('[flow-background] worker unavailable; trying main-thread renderer')
        worker?.terminate()
        worker = undefined
        main()
      }
    } else {
      main()
    }

    addEventListener('resize', sync)
    document.addEventListener('visibilitychange', sync)
    const handleMotionChange = () => {
      reducedMotion = readReducedMotion()
      sync()
      if (worker) return
      markMotion(reducedMotion ? 'reduced-settled' : canRun() ? 'running' : 'paused')
    }
    const motionPoll = window.setInterval(() => {
      const nextReducedMotion = readReducedMotion()
      if (nextReducedMotion !== reducedMotion) handleMotionChange()
    }, 250)
    media.addEventListener('change', handleMotionChange)
    const rootClassObserver = new MutationObserver(() => sync())
    rootClassObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-site-theme', 'data-site-theme-version'],
    })

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(readyRaf)
      window.clearTimeout(motionSettleTimer)
      worker?.terminate()
      renderer?.destroy()
      removeEventListener('resize', sync)
      document.removeEventListener('visibilitychange', sync)
      media.removeEventListener('change', handleMotionChange)
      rootClassObserver.disconnect()
      window.clearInterval(motionPoll)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className="flow-background"
      data-flow-ready={ready || undefined}
      data-flow-fallback={fallback ? 'css' : undefined}
      data-flow-motion={motionState}
      data-flow-theme={theme}
      aria-hidden="true"
    />
  )
}
