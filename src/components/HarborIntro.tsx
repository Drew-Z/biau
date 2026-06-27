import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const INTRO_STORAGE_KEY = 'biau-port-harbor-intro:v1'
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
  const completionRef = useRef({ vessel: false, mark: false, leaving: false })

  useLayoutEffect(() => {
    if (!visible) return
    introTriggeredThisRuntime = true
    markIntroSeen()
    document.documentElement.classList.add('harbor-intro-active')

    return () => {
      document.documentElement.classList.remove('harbor-intro-active')
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    completionRef.current = { vessel: false, mark: false, leaving: false }
  }, [visible])

  if (!visible) return null

  return (
    <div
      className={`harbor-intro ${leaving ? 'is-harbor-intro-leaving' : ''}`}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target && event.animationName === 'harborIntroVeil') {
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
      <div className="harbor-intro__vessel">
        <svg className="harbor-intro__boat" viewBox="0 0 96 96" fill="none">
          <path
            className="harbor-intro__b-spine"
            d="M42.8 14V60"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            className="harbor-intro__b-sail harbor-intro__b-sail--upper"
            d="M44 18C60 19 71 28 63.5 38.2C59.2 44 51.2 44.5 44 40.5V18Z"
            fill="url(#harborIntroSail)"
          />
          <path
            className="harbor-intro__b-sail harbor-intro__b-sail--lower"
            d="M44 39.2C62.8 38.2 76.2 48.4 69.2 59.6C63.6 68.5 51.6 67.7 44 60V39.2Z"
            fill="url(#harborIntroSmallSail)"
          />
          <path
            className="harbor-intro__hull"
            d="M16 60C27.5 63.8 43.5 64 80 58.5C75 67.4 66.8 73 54.5 73H30.2C24.6 70.5 19.8 66.2 16 60Z"
            fill="url(#harborIntroHull)"
          />
          <path
            d="M27 63.5C39 66.4 54.5 66 72 62.4"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            className="harbor-intro__b-keel"
            d="M43.2 59.5C50.8 65.9 61.6 67.8 71.8 62.2"
            stroke="rgba(255, 246, 218, 0.62)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M24 78C33 71.2 42 71.4 51 78C59.2 84 68.8 82.9 80 74.8"
            stroke="url(#harborIntroWave)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="70" cy="54" r="5.2" fill="#FFD36E" />
          <circle cx="70" cy="54" r="9" fill="#FFD36E" opacity="0.18" />
          <defs>
            <linearGradient id="harborIntroSail" x1="45" y1="16" x2="73" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#C8D6FF" />
            </linearGradient>
            <linearGradient id="harborIntroSmallSail" x1="28" y1="31" x2="43" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F7FBFF" stopOpacity="0.9" />
              <stop offset="1" stopColor="#90BFE0" stopOpacity="0.72" />
            </linearGradient>
            <linearGradient id="harborIntroHull" x1="18" y1="58" x2="78" y2="72" gradientUnits="userSpaceOnUse">
              <stop stopColor="#667EEA" />
              <stop offset="0.54" stopColor="#354B7B" />
              <stop offset="1" stopColor="#092243" />
            </linearGradient>
            <linearGradient id="harborIntroWave" x1="28" y1="74" x2="78" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EAF7FF" />
              <stop offset="1" stopColor="#FFD36E" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="harbor-intro__mark">
        <span>BIAU PORT</span>
      </div>
    </div>
  )
}
