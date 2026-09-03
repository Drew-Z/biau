import { useId } from 'react'

interface BiauPortMarkProps {
  animated?: boolean
  ariaHidden?: boolean
  className?: string
  title?: string
}

export function BiauPortMark({ animated = false, ariaHidden = true, className = '', title }: BiauPortMarkProps) {
  const rawId = useId().replace(/:/g, '')
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
      <path
        className="biau-port-mark__shell"
        d="M13.5 18V14.2C13.5 12.2 15.2 10.5 17.2 10.5H21M43 10.5H46.8C48.8 10.5 50.5 12.2 50.5 14.2V18M13.5 46V49.8C13.5 51.8 15.2 53.5 17.2 53.5H21M43 53.5H46.8C48.8 53.5 50.5 51.8 50.5 49.8V46"
        fill="none"
        stroke="var(--biau-mark-shell-edge, rgba(255,255,255,0.36))"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        className="biau-port-mark__bowl"
        d="M18.8 24.5V21.5H45.2V24.5"
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth="5.2"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        pathLength={1}
      />
      <path
        className="biau-port-mark__terminal"
        d="M23.5 34H40.5"
        stroke={`url(#${strokeId})`}
        strokeWidth="5"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="biau-port-mark__stage"
        d="M26.5 44.5H37.5"
        stroke={`url(#${strokeId})`}
        strokeWidth="5"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="biau-port-mark__spine"
        d="M32 44.5V23"
        stroke={`url(#${strokeId})`}
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="biau-port-mark__water"
        d="M24 52H30.5M33.5 52H40"
        stroke={`url(#${waterId})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle
        className="biau-port-mark__beacon-glow biau-port-mark__node-glow"
        cx="32"
        cy="15"
        r="6.6"
        fill="var(--biau-mark-beacon, #F2A23A)"
        opacity="0.18"
      />
      <circle
        className="biau-port-mark__beacon-ring"
        cx="32"
        cy="15"
        r="4.8"
        fill="none"
        stroke="var(--biau-mark-beacon, #F2A23A)"
        strokeWidth="1"
        opacity="0.5"
      />
      <circle
        className="biau-port-mark__beacon biau-port-mark__node"
        cx="32"
        cy="15"
        r="3.2"
        fill="var(--biau-mark-beacon, #F2A23A)"
      />
      <defs>
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
