import { useEffect, useRef } from 'react'
import { StarfieldRenderer } from '../background/StarfieldRenderer'
import { getFlowProfile, type StarfieldProfile } from '../background/flowPalettes'
import { isLowPowerDevice } from '../utils/visualPerformance'
import { isHarborScene, type HarborScene } from '../utils/appearance'

const REDUCED = '(prefers-reduced-motion: reduce)'
const MAX_FPS = 30

function getProfile(scene: HarborScene): StarfieldProfile {
  const profile = getFlowProfile(scene, document.documentElement.classList.contains('light-theme')).starfield
  const viewportScale = Math.max(0.6, Math.min(1.35, Math.sqrt((innerWidth * innerHeight) / (1440 * 1000))))
  const sceneFloor = scene === 'stellar' ? 100 : scene === 'dusk' ? 18 : 12
  const areaCount = Math.max(sceneFloor, Math.round(profile.count * viewportScale))
  if (isLowPowerDevice()) {
    return { ...profile, count: Math.max(8, Math.round(areaCount * 0.32)), opacity: profile.opacity * 0.72, twinkle: 0 }
  }
  return { ...profile, count: areaCount }
}

export function StarfieldBackground({ scene }: { scene: HarborScene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const initialSceneRef = useRef(scene)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer: StarfieldRenderer | undefined
    let raf = 0
    let stopped = false
    let last = 0
    let profileVersion = 0
    let profileSignature = ''
    let reducedMotion = matchMedia(REDUCED).matches
    let pointerX = 0
    let pointerY = 0
    let scrollProgress = 0

    const readScene = () => isHarborScene(document.documentElement.dataset.harborScene)
      ? document.documentElement.dataset.harborScene
      : initialSceneRef.current
    const readProfile = () => getProfile(readScene())
    const publishProfile = () => {
      const activeScene = readScene()
      const current = getProfile(activeScene)
      const signature = JSON.stringify(current)
      if (signature !== profileSignature) {
        profileSignature = signature
        profileVersion += 1
      }
      canvas.dataset.starfieldScene = activeScene
      canvas.dataset.starfieldProfileVersion = String(profileVersion)
      canvas.dataset.starfieldCount = String(current.count)
      return current
    }
    const size = () => {
      const profile = readProfile()
      const portrait = innerWidth <= 768 && innerHeight >= innerWidth
      const budget = profile.count > 100 ? (portrait ? 1.05 : 1.25) : portrait ? 1 : 1.1
      return { width: innerWidth, height: innerHeight, dpr: Math.min(devicePixelRatio || 1, budget) }
    }
    const canAnimate = () => !document.hidden && !document.documentElement.classList.contains('harbor-intro-active')
    const sync = () => {
      if (!renderer) return
      const profile = publishProfile()
      const currentSize = size()
      renderer.resize(currentSize.width, currentSize.height, currentSize.dpr)
      renderer.setProfile(profile)
      renderer.setPointer(pointerX, pointerY)
      renderer.setScroll(scrollProgress)
      if (reducedMotion || !canAnimate()) {
        cancelAnimationFrame(raf)
        raf = 0
        renderer.draw(0, profile)
        canvas.dataset.starfieldState = reducedMotion ? 'reduced' : 'paused'
        return
      }
      canvas.dataset.starfieldState = 'running'
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const draw = (now: number) => {
      raf = 0
      if (stopped || !renderer) return
      if (!canAnimate()) {
        canvas.dataset.starfieldState = reducedMotion ? 'reduced' : 'paused'
        return
      }
      const profile = publishProfile()
      if (now - last >= 1000 / MAX_FPS) {
        renderer.setProfile(profile)
        renderer.setPointer(pointerX, pointerY)
        renderer.setScroll(scrollProgress)
        renderer.draw(reducedMotion ? 0 : now / 1000, profile)
        last = now
      }
      if (!reducedMotion) raf = requestAnimationFrame(draw)
    }
    const updatePointer = (event: PointerEvent) => {
      pointerX = Math.max(-1, Math.min(1, event.clientX / Math.max(innerWidth, 1) * 2 - 1))
      pointerY = Math.max(-1, Math.min(1, event.clientY / Math.max(innerHeight, 1) * 2 - 1))
      if (!reducedMotion && canAnimate() && !raf) raf = requestAnimationFrame(draw)
    }
    const updateScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight)
      scrollProgress = Math.max(-1, Math.min(1, (scrollY / max) * 2 - 1))
    }
    const handleMotion = () => {
      reducedMotion = matchMedia(REDUCED).matches
      sync()
    }

    try {
      renderer = new StarfieldRenderer(canvas)
      const currentSize = size()
      renderer.resize(currentSize.width, currentSize.height, currentSize.dpr)
      const profile = publishProfile()
      renderer.setProfile(profile)
      renderer.draw(0, profile)
      canvas.dataset.starfieldState = reducedMotion ? 'reduced' : 'running'
      if (!reducedMotion) raf = requestAnimationFrame(draw)
    } catch {
      canvas.dataset.starfieldState = 'fallback'
      canvas.dataset.starfieldFallback = 'css'
    }

    addEventListener('resize', sync, { passive: true })
    addEventListener('pointermove', updatePointer, { passive: true })
    addEventListener('scroll', updateScroll, { passive: true })
    document.addEventListener('visibilitychange', sync)
    const media = matchMedia(REDUCED)
    media.addEventListener('change', handleMotion)
    const rootClassObserver = new MutationObserver(() => sync())
    rootClassObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-harbor-scene', 'data-harbor-scene-version'],
    })
    updateScroll()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      removeEventListener('resize', sync)
      removeEventListener('pointermove', updatePointer)
      removeEventListener('scroll', updateScroll)
      document.removeEventListener('visibilitychange', sync)
      media.removeEventListener('change', handleMotion)
      rootClassObserver.disconnect()
      renderer?.destroy()
    }
  }, [])

  return <canvas ref={canvasRef} className="starfield-background" data-starfield-background aria-hidden="true" />
}
