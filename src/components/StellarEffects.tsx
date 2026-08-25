import { useEffect, useRef } from 'react'
import { getFlowProfile } from '../background/flowPalettes'
import { isLowPowerDevice } from '../utils/visualPerformance'
import { isHarborScene, type HarborScene } from '../utils/appearance'

const REDUCED = '(prefers-reduced-motion: reduce)'

export function StellarEffects({ scene }: { scene: HarborScene }) {
  const ownerRef = useRef<HTMLDivElement>(null)
  const initialSceneRef = useRef(scene)

  useEffect(() => {
    const owner = ownerRef.current
    if (!owner) return
    const root = document.documentElement

    let frame = 0
    let stopped = false
    let reducedMotion = matchMedia(REDUCED).matches
    let lowPower = isLowPowerDevice()
    let pointerX = innerWidth / 2
    let pointerY = innerHeight / 2
    let profileVersion = 0
    let profileSignature = ''
    const edgeTargets = new Map<HTMLElement, HTMLElement>()

    const syncEdgeTargets = () => {
      const nextTargets = Array.from(document.querySelectorAll<HTMLElement>('.navigation-top, .home-hero, .hero-panel'))
      edgeTargets.forEach((layer, target) => {
        if (nextTargets.includes(target)) return
        layer.remove()
        edgeTargets.delete(target)
      })
      nextTargets.forEach((target) => {
        if (edgeTargets.has(target)) return
        const layer = document.createElement('span')
        layer.className = 'stellar-edge-glow-layer'
        layer.setAttribute('aria-hidden', 'true')
        target.classList.add('stellar-edge-glow-target')
        target.append(layer)
        edgeTargets.set(target, layer)
      })
    }

    const paintEdgeTargets = () => {
      const enabled = root.dataset.harborScene === 'stellar' && !reducedMotion && !lowPower && !document.hidden
      edgeTargets.forEach((_layer, target) => {
        if (!enabled) {
          target.style.setProperty('--stellar-edge-glow-opacity', '0')
          return
        }
        const rect = target.getBoundingClientRect()
        const x = Math.max(0, Math.min(rect.width, pointerX - rect.left))
        const y = Math.max(0, Math.min(rect.height, pointerY - rect.top))
        const outside = pointerX < rect.left || pointerX > rect.right || pointerY < rect.top || pointerY > rect.bottom
        const edgeDistance = Math.min(x, y, rect.width - x, rect.height - y)
        const edgeRange = Math.max(52, Math.min(96, Math.min(rect.width, rect.height) * 0.14))
        const opacity = outside ? 0 : Math.max(0, Math.min(1, 1 - edgeDistance / edgeRange))
        target.style.setProperty('--stellar-edge-glow-x', `${x.toFixed(1)}px`)
        target.style.setProperty('--stellar-edge-glow-y', `${y.toFixed(1)}px`)
        target.style.setProperty('--stellar-edge-glow-opacity', opacity.toFixed(3))
      })
    }

    const syncBrandGeometry = () => {
      const target = document.querySelector<HTMLElement>(
        document.documentElement.classList.contains('harbor-intro-active')
          ? '.harbor-intro__logo-shell'
          : '.nav-logo',
      )
      if (!target) return
      const rect = target.getBoundingClientRect()
      owner.style.setProperty('--stellar-brand-x', `${(rect.left + rect.width / 2).toFixed(1)}px`)
      owner.style.setProperty('--stellar-brand-y', `${(rect.top + rect.height / 2).toFixed(1)}px`)
    }

    const sync = () => {
      const activeScene = isHarborScene(root.dataset.harborScene) ? root.dataset.harborScene : initialSceneRef.current
      const profile = getFlowProfile(activeScene, root.classList.contains('light-theme'))
      lowPower = isLowPowerDevice()
      const effects = lowPower
        ? {
            ...profile.stellarEffects,
            edgeGlow: profile.stellarEffects.edgeGlow * 0.48,
            perimeterOpacity: profile.stellarEffects.perimeterOpacity * 0.42,
            perimeterDuration: profile.stellarEffects.perimeterDuration > 0
              ? profile.stellarEffects.perimeterDuration * 1.5
              : profile.stellarEffects.perimeterDuration,
            brandHighlight: profile.stellarEffects.brandHighlight * 0.62,
          }
        : profile.stellarEffects
      const signature = JSON.stringify({ activeScene, effects })
      if (signature !== profileSignature) {
        profileSignature = signature
        profileVersion += 1
      }
      owner.dataset.stellarScene = activeScene
      owner.dataset.stellarProfileVersion = String(profileVersion)
      owner.dataset.stellarLowPower = lowPower ? 'true' : 'false'
      owner.dataset.stellarState = activeScene !== 'stellar' ? 'inactive' : reducedMotion || document.hidden ? 'paused' : lowPower ? 'ambient' : effects.edgeGlow > 0.1 ? 'running' : 'ambient'
      owner.style.setProperty('--stellar-edge-glow', String(effects.edgeGlow))
      owner.style.setProperty('--stellar-perimeter-opacity', String(effects.perimeterOpacity))
      owner.style.setProperty('--stellar-perimeter-duration', `${effects.perimeterDuration || 7.6}s`)
      owner.style.setProperty('--stellar-brand-highlight', String(effects.brandHighlight))
      root.style.setProperty('--stellar-scene-perimeter-opacity', String(effects.perimeterOpacity))
      root.style.setProperty('--stellar-scene-perimeter-duration', `${effects.perimeterDuration || 7.6}s`)
      root.style.setProperty('--stellar-scene-perimeter-play-state', activeScene === 'stellar' && !lowPower ? 'running' : 'paused')
      root.style.setProperty('--stellar-scene-edge-glow', String(effects.edgeGlow))
      syncEdgeTargets()
      paintEdgeTargets()
      owner.style.setProperty('--stellar-pointer-x', `${pointerX}px`)
      owner.style.setProperty('--stellar-pointer-y', `${pointerY}px`)
      syncBrandGeometry()
      if (activeScene !== 'stellar' || reducedMotion || lowPower || document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else if (!frame) {
        frame = requestAnimationFrame(syncFrame)
      }
    }
    const syncFrame = () => {
      frame = 0
      if (stopped || root.dataset.harborScene !== 'stellar' || reducedMotion || lowPower || document.hidden) return
      owner.style.setProperty('--stellar-pointer-x', `${pointerX}px`)
      owner.style.setProperty('--stellar-pointer-y', `${pointerY}px`)
    }
    const handlePointer = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      paintEdgeTargets()
      if (root.dataset.harborScene === 'stellar' && !reducedMotion && !lowPower && !frame) frame = requestAnimationFrame(syncFrame)
    }
    const handleMotion = () => {
      reducedMotion = matchMedia(REDUCED).matches
      sync()
    }
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-harbor-scene', 'data-harbor-scene-version'],
    })
    addEventListener('pointermove', handlePointer, { passive: true })
    addEventListener('resize', sync, { passive: true })
    addEventListener('scroll', syncBrandGeometry, { passive: true })
    document.addEventListener('visibilitychange', sync)
    const media = matchMedia(REDUCED)
    media.addEventListener('change', handleMotion)
    sync()

    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      removeEventListener('pointermove', handlePointer)
      removeEventListener('resize', sync)
      removeEventListener('scroll', syncBrandGeometry)
      document.removeEventListener('visibilitychange', sync)
      media.removeEventListener('change', handleMotion)
      root.style.removeProperty('--stellar-scene-perimeter-opacity')
      root.style.removeProperty('--stellar-scene-perimeter-duration')
      root.style.removeProperty('--stellar-scene-perimeter-play-state')
      root.style.removeProperty('--stellar-scene-edge-glow')
      edgeTargets.forEach((layer, target) => {
        layer.remove()
        target.classList.remove('stellar-edge-glow-target')
        target.style.removeProperty('--stellar-edge-glow-x')
        target.style.removeProperty('--stellar-edge-glow-y')
        target.style.removeProperty('--stellar-edge-glow-opacity')
      })
      edgeTargets.clear()
    }
  }, [])

  return (
    <div ref={ownerRef} className="stellar-effects" data-stellar-effects aria-hidden="true">
      <span className="stellar-effects__pointer-glow" />
      <span className="stellar-effects__brand-glow" />
    </div>
  )
}
