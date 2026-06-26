import { useEffect, useState } from 'react'

const INTRO_STORAGE_KEY = 'biau-port-harbor-intro:v1'
const INTRO_DURATION_MS = 2350

function shouldShowIntro() {
  if (typeof window === 'undefined') return false

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return false

  try {
    if (window.sessionStorage.getItem(INTRO_STORAGE_KEY) === '1') return false
    window.sessionStorage.setItem(INTRO_STORAGE_KEY, '1')
  } catch {
    return true
  }

  return true
}

export function HarborIntro() {
  const [visible, setVisible] = useState(shouldShowIntro)

  useEffect(() => {
    if (!visible) return
    document.documentElement.classList.add('harbor-intro-active')
    const timer = window.setTimeout(() => {
      setVisible(false)
      document.documentElement.classList.remove('harbor-intro-active')
    }, INTRO_DURATION_MS)

    return () => {
      window.clearTimeout(timer)
      document.documentElement.classList.remove('harbor-intro-active')
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="harbor-intro" aria-hidden="true">
      <div className="harbor-intro__sky" />
      <div className="harbor-intro__beacon" />
      <div className="harbor-intro__wake harbor-intro__wake--a" />
      <div className="harbor-intro__wake harbor-intro__wake--b" />
      <div className="harbor-intro__vessel">
        <svg className="harbor-intro__boat" viewBox="0 0 96 96" fill="none">
          <path
            className="harbor-intro__sail"
            d="M45 16L69 52H45V16Z"
            fill="url(#harborIntroSail)"
          />
          <path
            className="harbor-intro__mast"
            d="M43.8 14V58"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            className="harbor-intro__hull"
            d="M18 58H78L66.5 72H29.5L18 58Z"
            fill="url(#harborIntroHull)"
          />
          <path
            d="M28 78C35.5 72.2 43.5 72.2 51 78C58.5 83.8 67.5 82.8 78 75"
            stroke="url(#harborIntroWave)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="69" cy="53" r="5" fill="#FFD36E" />
          <defs>
            <linearGradient id="harborIntroSail" x1="45" y1="16" x2="73" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#C8D6FF" />
            </linearGradient>
            <linearGradient id="harborIntroHull" x1="18" y1="58" x2="78" y2="72" gradientUnits="userSpaceOnUse">
              <stop stopColor="#667EEA" />
              <stop offset="1" stopColor="#764BA2" />
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
