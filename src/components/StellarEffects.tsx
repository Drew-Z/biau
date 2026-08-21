import { useEffect, useRef } from 'react'
import { getFlowProfile, type HarborScene } from '../background/flowPalettes'

const REDUCED = '(prefers-reduced-motion: reduce)'

function isLowPowerDevice() {
  const navigatorState = navigator as Navigator & {
    connection?: { saveData?: boolean }
    deviceMemory?: number
  }
  return Boolean(navigatorState.connection?.saveData || navigatorState.deviceMemory !== undefined && navigatorState.deviceMemory <= 2)
}

function currentScene(fallback: HarborScene): HarborScene {
  const scene = document.documentElement.dataset.harborScene
  return scene === 'dusk' || scene === 'garden' || scene === 'stellar' ? scene : fallback
}

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

    const sync = () => {
      const activeScene = currentScene(initialSceneRef.current)
      const light = document.documentElement.classList.contains('light-theme')
      const profile = getFlowProfile(activeScene, light)
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
      const signature = JSON.stringify({ activeScene, light, effects })
      if (signature !== profileSignature) {
        profileSignature = signature
        profileVersion += 1
      }
      owner.dataset.stellarScene = activeScene
      owner.dataset.stellarProfileVersion = String(profileVersion)
      owner.dataset.stellarLowPower = lowPower ? 'true' : 'false'
      owner.dataset.stellarState = reducedMotion || document.hidden ? 'paused' : lowPower ? 'ambient' : effects.edgeGlow > 0.1 ? 'running' : 'ambient'
      owner.style.setProperty('--stellar-edge-glow', String(effects.edgeGlow))
      owner.style.setProperty('--stellar-perimeter-opacity', String(effects.perimeterOpacity))
      owner.style.setProperty('--stellar-perimeter-duration', `${effects.perimeterDuration || 7.6}s`)
      owner.style.setProperty('--stellar-brand-highlight', String(effects.brandHighlight))
      root.style.setProperty('--stellar-scene-perimeter-opacity', String(effects.perimeterOpacity))
      root.style.setProperty('--stellar-scene-perimeter-duration', `${effects.perimeterDuration || 7.6}s`)
      root.style.setProperty('--stellar-scene-perimeter-play-state', lowPower ? 'paused' : 'running')
      owner.style.setProperty('--stellar-pointer-x', `${pointerX}px`)
      owner.style.setProperty('--stellar-pointer-y', `${pointerY}px`)
      if (reducedMotion || lowPower || document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else if (!frame) {
        frame = requestAnimationFrame(syncFrame)
      }
    }
    const syncFrame = () => {
      frame = 0
      if (stopped || reducedMotion || lowPower || document.hidden) return
      owner.style.setProperty('--stellar-pointer-x', `${pointerX}px`)
      owner.style.setProperty('--stellar-pointer-y', `${pointerY}px`)
    }
    const handlePointer = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      if (!reducedMotion && !lowPower && !frame) frame = requestAnimationFrame(syncFrame)
    }
    const handleMotion = () => {
      reducedMotion = matchMedia(REDUCED).matches
      sync()
    }
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-harbor-scene', 'data-harbor-scene-version'] })
    addEventListener('pointermove', handlePointer, { passive: true })
    addEventListener('resize', sync, { passive: true })
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
      document.removeEventListener('visibilitychange', sync)
      media.removeEventListener('change', handleMotion)
      root.style.removeProperty('--stellar-scene-perimeter-opacity')
      root.style.removeProperty('--stellar-scene-perimeter-duration')
      root.style.removeProperty('--stellar-scene-perimeter-play-state')
    }
  }, [])

  return (
    <div ref={ownerRef} className="stellar-effects" data-stellar-effects aria-hidden="true">
      <span className="stellar-effects__pointer-glow" />
      <span className="stellar-effects__brand-glow" />
    </div>
  )
}
