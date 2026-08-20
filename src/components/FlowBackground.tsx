import { useEffect, useRef, useState } from 'react'
import { FlowRenderer } from '../background/FlowRenderer'
import { getFlowProfile, type HarborScene } from '../background/flowPalettes'

const REDUCED = '(prefers-reduced-motion: reduce)'
const FINE_POINTER = '(any-hover: hover) and (any-pointer: fine)'
const SETTLED_COMPOSITOR_DELAY_MS = 120
type FlowMotionState = 'pending' | 'running' | 'reduced-settled' | 'paused' | 'css-fallback'
type SceneMotionState = 'interactive' | 'ambient' | 'paused' | 'reduced'

const isWebGlUnavailable = (value: unknown) =>
  value === 'WebGL2 unavailable' || (value instanceof Error && value.message === 'WebGL2 unavailable')

export function FlowBackground({ scene }: { scene: HarborScene }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const foundationRef = useRef<HTMLDivElement>(null)
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
    let motionSettleTimer = 0
    let stopped = false
    let readyReported = false
    let fallbackActive = false
    let last = 0
    let motionToken = 0
    let drawFrame: ((now: number) => void) | undefined
    let currentMotionState: FlowMotionState = 'pending'

    const media = matchMedia(REDUCED)
    const readReducedMotion = () => matchMedia(REDUCED).matches
    let reducedMotion = readReducedMotion()
    const readProfile = () => {
      const value = document.documentElement.dataset.harborScene
      const current = value === 'garden' || value === 'stellar' || value === 'dusk' ? value : initialScene.current
      const portrait = innerWidth <= 768 && innerHeight >= innerWidth
      return getFlowProfile(current, document.documentElement.classList.contains('light-theme'), portrait)
    }
    const publishProfile = () => {
      const current = readProfile()
      canvas.dataset.flowScene = current.scene
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
      dpr: Math.min(devicePixelRatio || 1, 1.25),
    })
    const lowPowerDevice = () =>
      Boolean((navigator as Navigator & { deviceMemory?: number }).deviceMemory &&
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 2) ||
      Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
    const canRun = () => !document.hidden && !document.documentElement.classList.contains('harbor-intro-active')
    const shouldAnimate = () => canRun() && !lowPowerDevice()
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
          if (running && (reduced || lowPowerDevice() || now - last >= 1000 / 30)) {
            renderer?.draw(reduced || lowPowerDevice() ? 0 : now / 1000, readProfile())
            last = now
            markReady()
            if (reduced) markReducedMotionSettled()
            else if (lowPowerDevice()) markMotion('paused')
            else markMotion('running')
            if (reduced || lowPowerDevice()) {
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
          running: canRun() && !lowPowerDevice(),
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
            const expectedRunning = canRun() && !lowPowerDevice()
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
            running: canRun() && !lowPowerDevice(),
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

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(readyRaf)
      window.clearTimeout(motionSettleTimer)
      worker?.terminate()
      renderer?.destroy()
      observer.disconnect()
      removeEventListener('resize', sync)
      document.removeEventListener('visibilitychange', sync)
      media.removeEventListener('change', handleMotionChange)
      window.clearInterval(motionPoll)
    }
  }, [])

  useEffect(() => {
    const foundation = foundationRef.current
    if (!foundation) return

    const reducedMotion = matchMedia(REDUCED)
    const finePointer = matchMedia(FINE_POINTER)
    let frame = 0
    let pointerX = innerWidth / 2
    let pointerY = innerHeight / 2

    const resetPointer = () => {
      foundation.style.setProperty('--harbor-pointer-wash-x', '0px')
      foundation.style.setProperty('--harbor-pointer-wash-y', '0px')
      foundation.style.setProperty('--harbor-pointer-texture-x', '0px')
      foundation.style.setProperty('--harbor-pointer-texture-y', '0px')
      foundation.style.setProperty('--harbor-pointer-landmark-x', '0px')
      foundation.style.setProperty('--harbor-pointer-landmark-y', '0px')
    }
    const resolveMotionState = (): SceneMotionState => {
      if (reducedMotion.matches) return 'reduced'
      if (document.hidden || document.documentElement.classList.contains('harbor-intro-active')) return 'paused'
      return finePointer.matches ? 'interactive' : 'ambient'
    }
    const syncMotionState = () => {
      const state = resolveMotionState()
      foundation.dataset.sceneMotion = state
      if (state !== 'interactive') {
        cancelAnimationFrame(frame)
        frame = 0
        resetPointer()
      }
    }
    const paintPointer = () => {
      frame = 0
      if (resolveMotionState() !== 'interactive') {
        syncMotionState()
        return
      }
      const x = Math.max(-1, Math.min(1, pointerX / Math.max(innerWidth, 1) * 2 - 1))
      const y = Math.max(-1, Math.min(1, pointerY / Math.max(innerHeight, 1) * 2 - 1))
      foundation.style.setProperty('--harbor-pointer-wash-x', `${(-x * 8).toFixed(2)}px`)
      foundation.style.setProperty('--harbor-pointer-wash-y', `${(-y * 6).toFixed(2)}px`)
      foundation.style.setProperty('--harbor-pointer-texture-x', `${(x * 11).toFixed(2)}px`)
      foundation.style.setProperty('--harbor-pointer-texture-y', `${(y * 8).toFixed(2)}px`)
      foundation.style.setProperty('--harbor-pointer-landmark-x', `${(-x * 15).toFixed(2)}px`)
      foundation.style.setProperty('--harbor-pointer-landmark-y', `${(-y * 10).toFixed(2)}px`)
    }
    const requestPointerPaint = () => {
      if (!frame) frame = requestAnimationFrame(paintPointer)
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      requestPointerPaint()
    }
    const handlePointerExit = () => {
      pointerX = innerWidth / 2
      pointerY = innerHeight / 2
      requestPointerPaint()
    }
    const handleResize = () => {
      handlePointerExit()
      syncMotionState()
    }

    const observer = new MutationObserver(syncMotionState)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    addEventListener('pointermove', handlePointerMove, { passive: true })
    addEventListener('pointerleave', handlePointerExit, { passive: true })
    addEventListener('blur', handlePointerExit)
    addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('visibilitychange', syncMotionState)
    reducedMotion.addEventListener('change', syncMotionState)
    finePointer.addEventListener('change', syncMotionState)
    syncMotionState()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      removeEventListener('pointermove', handlePointerMove)
      removeEventListener('pointerleave', handlePointerExit)
      removeEventListener('blur', handlePointerExit)
      removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', syncMotionState)
      reducedMotion.removeEventListener('change', syncMotionState)
      finePointer.removeEventListener('change', syncMotionState)
      resetPointer()
    }
  }, [])

  return (
    <div
      ref={foundationRef}
      className="harbor-scene-foundation"
      data-harbor-scene-foundation
      data-scene-motion="ambient"
      aria-hidden="true"
    >
      <span className="harbor-scene-foundation__wash" data-harbor-scene-layer="wash" />
      <canvas
        ref={ref}
        className="flow-background"
        data-flow-ready={ready || undefined}
        data-flow-fallback={fallback ? 'css' : undefined}
        data-flow-motion={motionState}
        data-flow-scene={scene}
      />
      <span className="harbor-scene-foundation__texture" data-harbor-scene-layer="texture" />
      <span className="harbor-scene-foundation__landmark" data-harbor-scene-layer="landmark" />
    </div>
  )
}
