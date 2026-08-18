import { useId } from 'react'

interface BiauPortMarkProps {
  animated?: boolean
  ariaHidden?: boolean
  className?: string
  title?: string
}

export function BiauPortMark({ animated = false, ariaHidden = true, className = '', title }: BiauPortMarkProps) {
  const rawId = useId().replace(/:/g, '')
  const shellId = `${rawId}-biau-shell`
  const strokeId = `${rawId}-biau-stroke`
  const waterId = `${rawId}-biau-water`
  const titleId = `${rawId}-biau-title`
  const classes = ['biau-port-mark', animated ? 'is-biau-port-mark-animated' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <svg
      className={classes}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden={ariaHidden ? 'true' : undefined}
      aria-labelledby={!ariaHidden && title ? titleId : undefined}
      focusable="false"
      role={!ariaHidden && title ? 'img' : undefined}
    >
      {!ariaHidden && title ? <title id={titleId}>{title}</title> : null}
      <rect className="biau-port-mark__shell" x="5" y="5" width="54" height="54" rx="18" fill={`url(#${shellId})`} />
      <path
        className="biau-port-mark__port-shadow"
        d="M25.5 48.5C22.5 52.4 18.3 52.7 15.8 49.8"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <path
        className="biau-port-mark__spine"
        d="M24.5 15.2V48.1"
        stroke={`url(#${strokeId})`}
        strokeWidth="5.4"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="biau-port-mark__bowl"
        d="M25.8 20.4C38.8 20.2 47.4 27.2 45.2 36.3C43.1 45.1 34.4 49.9 25.3 45.7"
        stroke={`url(#${strokeId})`}
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <path
        className="biau-port-mark__water"
        d="M18.3 39.1C23.7 36.2 29.1 36.7 34.3 39.3C38 41.1 41.7 40.6 45.4 37.7"
        stroke={`url(#${waterId})`}
        strokeWidth="2.3"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="biau-port-mark__terminal"
        d="M33.8 30.8L39 34.6L33.8 38.4"
        stroke="var(--biau-mark-terminal, rgba(255,246,218,0.76))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <circle className="biau-port-mark__beacon-glow" cx="43.2" cy="20.5" r="7.2" fill="var(--biau-mark-beacon, #F2A23A)" opacity="0.18" />
      <circle className="biau-port-mark__beacon" cx="43.2" cy="20.5" r="3.4" fill="var(--biau-mark-beacon, #F2A23A)" />
      <defs>
        <linearGradient id={shellId} x1="9" y1="7" x2="57" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--biau-mark-shell-start, #163B5B)" />
          <stop offset="0.52" stopColor="var(--biau-mark-shell-mid, #102A43)" />
          <stop offset="1" stopColor="var(--biau-mark-shell-end, #071827)" />
        </linearGradient>
        <linearGradient id={strokeId} x1="20" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--biau-mark-stroke-start, #F7FBFF)" />
          <stop offset="0.48" stopColor="var(--biau-mark-stroke-mid, #C8D6E5)" />
          <stop offset="1" stopColor="var(--biau-mark-stroke-end, #7FA7C7)" />
        </linearGradient>
        <linearGradient id={waterId} x1="18" y1="37" x2="46" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--biau-mark-water-start, #A7D6E8)" />
          <stop offset="0.58" stopColor="var(--biau-mark-water-mid, #EAF7FF)" />
          <stop offset="1" stopColor="var(--biau-mark-water-end, #F2A23A)" />
        </linearGradient>
      </defs>
    </svg>
  )
}
