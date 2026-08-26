import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BiauPortMark } from './BiauPortMark'

const INTRO_STORAGE_KEY = 'biau-port-harbor-intro:v3'
let introTriggeredThisRuntime = false

import type { SiteTheme } from '../utils/appearance'

interface HarborIntroProps {
  theme?: SiteTheme
}

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

export function HarborIntro({ theme = 'morning' }: HarborIntroProps) {
  const [visible, setVisible] = useState(() => !introTriggeredThisRuntime && canShowIntro())
  const [leaving, setLeaving] = useState(false)
  const introRef = useRef<HTMLDivElement>(null)
  const vesselRef = useRef<HTMLDivElement>(null)
  const completionRef = useRef({ vessel: false, mark: false, leaving: false })

  const finishIntro = () => {
    markIntroSeen()
    setVisible(false)
  }

  const beginLeaving = () => {
    if (completionRef.current.leaving) return
    completionRef.current.leaving = true
    document.documentElement.classList.add('harbor-intro-settling')
    introRef.current?.classList.add('is-harbor-intro-leaving')
    setLeaving(true)
  }

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
      const compact = window.matchMedia('(max-width: 768px)').matches
      const stageWidth = compact
        ? Math.min(148, Math.max(112, window.innerWidth * 0.36))
        : Math.min(174, Math.max(132, window.innerWidth * 0.12))
      const stageScale = navRect.width > 0 ? stageWidth / navRect.width : 3
      const navStyle = window.getComputedStyle(navLogo)
      const navMark = navLogo.querySelector<SVGElement>('.nav-logo-mark')

      intro.style.setProperty('--harbor-logo-x', `${navRect.left + navRect.width / 2}px`)
      intro.style.setProperty('--harbor-logo-y', `${navRect.top + navRect.height / 2}px`)
      intro.style.setProperty('--harbor-logo-width', `${navRect.width}px`)
      intro.style.setProperty('--harbor-logo-height', `${navRect.height}px`)
      intro.style.setProperty('--harbor-logo-stage-scale', stageScale.toFixed(4))
      intro.style.setProperty('--harbor-logo-stage-start-scale', (stageScale * 0.72).toFixed(4))
      intro.style.setProperty('--harbor-logo-stage-soft-scale', (stageScale * 0.96).toFixed(4))
      intro.style.setProperty('--harbor-logo-background', navStyle.background)
      intro.style.setProperty('--harbor-logo-border', navStyle.border)
      intro.style.setProperty('--harbor-logo-radius', navStyle.borderRadius)
      intro.style.setProperty('--harbor-logo-shadow', navStyle.boxShadow)
      if (navMark) {
        intro.style.setProperty('--harbor-logo-mark-filter', window.getComputedStyle(navMark).filter)
      }
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

  useEffect(() => {
    if (!visible || leaving) return
    const fallback = window.setTimeout(beginLeaving, 2_500)
    return () => window.clearTimeout(fallback)
  }, [visible, leaving])

  useEffect(() => {
    if (!visible || !leaving) return
    const fallback = window.setTimeout(finishIntro, 600)
    return () => window.clearTimeout(fallback)
  }, [visible, leaving])

  if (!visible) return null

  return (
    <div
      ref={introRef}
      className={`harbor-intro ${leaving ? 'is-harbor-intro-leaving' : ''}`}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target && event.animationName === 'harborIntroVeil') {
          finishIntro()
          return
        }
        if (event.animationName === 'harborMarkLand') {
          completionRef.current.mark = true
        }
        if (event.animationName === 'harborVesselDock') {
          completionRef.current.vessel = true
        }
        if (completionRef.current.mark && completionRef.current.vessel && !completionRef.current.leaving) {
          beginLeaving()
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
        <span className="harbor-intro__logo-shell" data-theme={theme}>
          <BiauPortMark className="harbor-intro__boat" animated />
        </span>
      </div>
      <div className="harbor-intro__mark">
        <span className="harbor-intro__mark-title">BIAU PORT</span>
        <span className="harbor-intro__mark-subtitle">泊岸</span>
      </div>
    </div>
  )
}
