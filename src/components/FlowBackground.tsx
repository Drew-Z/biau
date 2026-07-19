import { useEffect, useRef, useState } from 'react'
import { FlowRenderer } from '../background/FlowRenderer'
import { getFlowPalette, type HarborScene } from '../background/flowPalettes'

const REDUCED = '(prefers-reduced-motion: reduce)'
type FlowMotionState = 'pending' | 'running' | 'reduced-settled' | 'paused' | 'css-fallback'

const isWebGlUnavailable = (value: unknown) =>
  value === 'WebGL2 unavailable' || (value instanceof Error && value.message === 'WebGL2 unavailable')

export function FlowBackground({ scene }: { scene: HarborScene }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const initialScene = useRef(scene)
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
    let stopped = false
    let readyReported = false
    let fallbackActive = false
    let last = 0
    let motionToken = 0
    let currentMotionState: FlowMotionState = 'pending'

    const media = matchMedia(REDUCED)
    const palette = () => {
      const value = document.documentElement.dataset.harborScene
      const current = value === 'garden' || value === 'stellar' || value === 'dusk' ? value : initialScene.current
      return getFlowPalette(current, document.documentElement.classList.contains('light-theme'))
    }
    const size = () => ({
      width: innerWidth,
      height: innerHeight,
      dpr: Math.min(devicePixelRatio || 1, 1.25),
    })
    const canRun = () => !document.hidden && !document.documentElement.classList.contains('harbor-intro-active')
    const markReady = () => {
      if (readyReported || fallbackActive) return
      readyReported = true
      readyRaf = requestAnimationFrame(() => {
        readyRaf = requestAnimationFrame(() => {
          if (!stopped && !fallbackActive) setReady(true)
        })
      })
    }
    const markMotion = (next: FlowMotionState) => {
      if (stopped || fallbackActive || currentMotionState === next) return
      currentMotionState = next
      setMotionState(next)
    }
    const activateCssFallback = (reason: unknown) => {
      fallbackActive = true
      cancelAnimationFrame(readyRaf)
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
        renderer = new FlowRenderer(canvas, { preserveDrawingBuffer: true })
        const initialSize = size()
        renderer.resize(initialSize.width, initialSize.height, initialSize.dpr)
        const draw = (now: number) => {
          if (stopped) return
          const reduced = media.matches
          const running = canRun()
          if (running && (reduced ? last === 0 : now - last >= 1000 / 30)) {
            renderer?.draw(reduced ? 0 : now / 1000, palette())
            last = now
            markReady()
            markMotion(reduced ? 'reduced-settled' : 'running')
          } else if (!running) {
            markMotion('paused')
          }
          raf = requestAnimationFrame(draw)
        }
        raf = requestAnimationFrame(draw)
      } catch (error) {
        activateCssFallback(error)
      }
    }

    const sync = () => {
      const currentSize = size()
      const token = ++motionToken
      if (worker) {
        // Motion is sent last so its acknowledgement follows resize and palette updates.
        markMotion('pending')
        worker.postMessage({ type: 'resize', ...currentSize, motionToken: token })
        worker.postMessage({ type: 'palette', palette: palette(), motionToken: token })
        worker.postMessage({
          type: 'motion',
          reducedMotion: media.matches,
          running: canRun(),
          motionToken: token,
        })
      } else if (renderer) {
        renderer.resize(currentSize.width, currentSize.height, currentSize.dpr)
        if (media.matches) {
          last = 0
          renderer.draw(0, palette())
          markReady()
          markMotion('reduced-settled')
        } else if (!canRun()) {
          markMotion('paused')
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
            if (data.motionToken !== motionToken) return
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
            palette: palette(),
            reducedMotion: media.matches,
            running: canRun(),
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

    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-harbor-scene'] })
    addEventListener('resize', sync)
    document.addEventListener('visibilitychange', sync)
    media.addEventListener('change', sync)

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(readyRaf)
      worker?.terminate()
      renderer?.destroy()
      observer.disconnect()
      removeEventListener('resize', sync)
      document.removeEventListener('visibilitychange', sync)
      media.removeEventListener('change', sync)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className="flow-background"
      data-flow-ready={ready || undefined}
      data-flow-fallback={fallback ? 'css' : undefined}
      data-flow-motion={motionState}
      aria-hidden="true"
    />
  )
}
