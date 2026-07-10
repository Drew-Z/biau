import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BiauPortMark } from './BiauPortMark'

const INTRO_STORAGE_KEY = 'biau-port-harbor-intro:v2'
let introTriggeredThisRuntime = false

function canShowIntro() {
  if (typeof window === 'undefined') return false

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return false

  try {
    if (window.sessionStorage.getItem(INTRO_STORAGE_KEY) === '1') return false
  } catch {
    return true
  }

  return true
}

function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_STORAGE_KEY, '1')
  } catch {
    // Ignore storage failures; the intro can still play for the current visit.
  }
}

export function HarborIntro() {
  const [visible, setVisible] = useState(() => !introTriggeredThisRuntime && canShowIntro())
  const [leaving, setLeaving] = useState(false)
  const introRef = useRef<HTMLDivElement>(null)
  const vesselRef = useRef<HTMLDivElement>(null)
  const completionRef = useRef({ vessel: false, mark: false, leaving: false })

  useLayoutEffect(() => {
    if (!visible) return
    introTriggeredThisRuntime = true
    document.documentElement.classList.add('harbor-intro-active')

    return () => {
      document.documentElement.classList.remove('harbor-intro-active', 'harbor-intro-settling')
    }
  }, [visible])

  useLayoutEffect(() => {
    if (!visible) return

    const intro = introRef.current
    const vessel = vesselRef.current
    if (!intro || !vessel) return

    const syncDockTarget = () => {
      const navLogo = document.querySelector<HTMLElement>('.nav-logo')
      if (!navLogo) return

      const navRect = navLogo.getBoundingClientRect()
      const vesselWidth = vessel.offsetWidth
      const targetScale = navRect.width > 0 && vesselWidth > 0 ? navRect.width / vesselWidth : 0.32

      intro.style.setProperty('--harbor-logo-x', `${navRect.left + navRect.width / 2}px`)
      intro.style.setProperty('--harbor-logo-y', `${navRect.top + navRect.height / 2}px`)
      intro.style.setProperty('--harbor-logo-target-scale', targetScale.toFixed(4))
    }

    syncDockTarget()

    const frameId = window.requestAnimationFrame(syncDockTarget)
    const timeoutIds = [120, 360, 620, 980].map((delay) => window.setTimeout(syncDockTarget, delay))
    const navInner = document.querySelector<HTMLElement>('.nav-inner')

    window.addEventListener('resize', syncDockTarget)
    window.addEventListener('orientationchange', syncDockTarget)
    navInner?.addEventListener('animationend', syncDockTarget)

    return () => {
      window.cancelAnimationFrame(frameId)
      timeoutIds.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('resize', syncDockTarget)
      window.removeEventListener('orientationchange', syncDockTarget)
      navInner?.removeEventListener('animationend', syncDockTarget)
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    completionRef.current = { vessel: false, mark: false, leaving: false }
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={introRef}
      className={`harbor-intro ${leaving ? 'is-harbor-intro-leaving' : ''}`}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target && event.animationName === 'harborIntroVeil') {
          markIntroSeen()
          setVisible(false)
          return
        }
        if (event.animationName === 'harborMarkLand') {
          completionRef.current.mark = true
        }
        if (event.animationName === 'harborVesselDock') {
          completionRef.current.vessel = true
        }
        if (completionRef.current.mark && completionRef.current.vessel && !completionRef.current.leaving) {
          completionRef.current.leaving = true
          document.documentElement.classList.add('harbor-intro-settling')
          event.currentTarget.classList.add('is-harbor-intro-leaving')
          setLeaving(true)
          return
        }
      }}
    >
      <div className="harbor-intro__sky" />
      <div className="harbor-intro__beacon" />
      <div className="harbor-intro__current" />
      <div className="harbor-intro__dock-light" />
      <div className="harbor-intro__wake harbor-intro__wake--a" />
      <div className="harbor-intro__wake harbor-intro__wake--b" />
      <div ref={vesselRef} className="harbor-intro__vessel">
        <BiauPortMark className="harbor-intro__boat" animated />
      </div>
      <div className="harbor-intro__mark">
        <span className="harbor-intro__mark-title">BIAU PORT</span>
        <span className="harbor-intro__mark-subtitle">泊岸</span>
      </div>
    </div>
  )
}
