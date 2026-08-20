import { useEffect, useRef } from 'react'
import { getFlowProfile, type HarborScene } from '../background/flowPalettes'

const REDUCED = '(prefers-reduced-motion: reduce)'

function currentScene(fallback: HarborScene): HarborScene {
  const scene = document.documentElement.dataset.harborScene
  return scene === 'dusk' || scene === 'garden' || scene === 'stellar' ? scene : fallback
}

export function StellarEffects({ scene }: { scene: HarborScene }) {
  const ownerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const owner = ownerRef.current
    if (!owner) return
    const root = document.documentElement

    let frame = 0
    let stopped = false
    let reducedMotion = matchMedia(REDUCED).matches
    let pointerX = innerWidth / 2
    let pointerY = innerHeight / 2
    let profileVersion = 0
    let profileSignature = ''

    const sync = () => {
      const activeScene = currentScene(scene)
      const profile = getFlowProfile(activeScene, document.documentElement.classList.contains('light-theme'))
      const signature = JSON.stringify(profile.stellarEffects)
      if (signature !== profileSignature) {
        profileSignature = signature
        profileVersion += 1
      }
      owner.dataset.stellarScene = activeScene
      owner.dataset.stellarProfileVersion = String(profileVersion)
      owner.dataset.stellarState = reducedMotion || document.hidden ? 'paused' : profile.stellarEffects.edgeGlow > 0.1 ? 'running' : 'ambient'
      owner.style.setProperty('--stellar-edge-glow', String(profile.stellarEffects.edgeGlow))
      owner.style.setProperty('--stellar-perimeter-opacity', String(profile.stellarEffects.perimeterOpacity))
      owner.style.setProperty('--stellar-perimeter-duration', `${profile.stellarEffects.perimeterDuration || 7.6}s`)
      owner.style.setProperty('--stellar-brand-highlight', String(profile.stellarEffects.brandHighlight))
      root.style.setProperty('--stellar-scene-perimeter-opacity', String(profile.stellarEffects.perimeterOpacity))
      root.style.setProperty('--stellar-scene-perimeter-duration', `${profile.stellarEffects.perimeterDuration || 7.6}s`)
      owner.style.setProperty('--stellar-pointer-x', `${pointerX}px`)
      owner.style.setProperty('--stellar-pointer-y', `${pointerY}px`)
      if (!reducedMotion && !document.hidden && !frame) frame = requestAnimationFrame(syncFrame)
    }
    const syncFrame = () => {
      frame = 0
      if (stopped || reducedMotion || document.hidden) return
      owner.style.setProperty('--stellar-pointer-x', `${pointerX}px`)
      owner.style.setProperty('--stellar-pointer-y', `${pointerY}px`)
    }
    const handlePointer = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      if (!reducedMotion && !frame) frame = requestAnimationFrame(syncFrame)
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
    }
  }, [scene])

  return (
    <div ref={ownerRef} className="stellar-effects" data-stellar-effects aria-hidden="true">
      <span className="stellar-effects__pointer-glow" />
      <span className="stellar-effects__brand-glow" />
    </div>
  )
}
