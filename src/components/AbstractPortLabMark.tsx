import { useId } from 'react'
import '../styles/abstract-port-lab.css'

interface AbstractPortLabMarkProps {
  size?: number | string
  monochrome?: boolean
  animated?: boolean
  title?: string
  className?: string
}

/**
 * An abstract port glyph inspired by the earliest BIAU Port mark.
 * It keeps the stem, open basin, tidal channel, and status point without
 * closing the shape into a literal B or retaining the old app-tile shell.
 */
export function AbstractPortLabMark({
  size = 64,
  monochrome = false,
  animated = false,
  title,
  className = '',
}: AbstractPortLabMarkProps) {
  const rawId = useId().replace(/:/g, '')
  const inkId = `${rawId}-abstract-ink`
  const accentId = `${rawId}-abstract-accent`
  const titleId = `${rawId}-abstract-title`
  const hasTitle = typeof title === 'string' && title.trim().length > 0
  const classes = [
    'abstract-port-lab-mark',
    monochrome ? 'is-abstract-port-lab-mark-monochrome' : '',
    animated ? 'is-abstract-port-lab-mark-animated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      data-mark-size={size}
      viewBox="0 0 64 64"
      fill="none"
      role={hasTitle ? 'img' : undefined}
      aria-hidden={hasTitle ? undefined : 'true'}
      aria-labelledby={hasTitle ? titleId : undefined}
      focusable="false"
    >
      {hasTitle ? <title id={titleId}>{title}</title> : null}
      <path
        className="abstract-port-lab-mark__spine"
        d="M24.5 14.5C24 25.8 24.2 39.6 27.2 49.5"
        stroke={`url(#${inkId})`}
        strokeWidth="5.8"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="abstract-port-lab-mark__basin"
        d="M27 20.5C39.2 18.7 47.2 25 45.7 34.8C44.4 43.4 36.2 49 27.5 45.5"
        stroke={`url(#${inkId})`}
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <path
        className="abstract-port-lab-mark__channel"
        d="M17.5 39C23.8 35.2 29.2 35.7 34.7 38.4C39.4 40.6 43.2 39.4 48.5 35"
        stroke={`url(#${accentId})`}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <path
        className="abstract-port-lab-mark__quay"
        d="M17.5 19H24.2"
        stroke={`url(#${accentId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle
        className="abstract-port-lab-mark__node-glow"
        cx="48.5"
        cy="35"
        r="6"
        fill="var(--abstract-port-lab-node, #d5566d)"
      />
      <circle
        className="abstract-port-lab-mark__node"
        cx="48.5"
        cy="35"
        r="2.7"
        fill="var(--abstract-port-lab-node, #d5566d)"
      />
      <defs>
        <linearGradient id={inkId} x1="18" y1="13" x2="47" y2="51" gradientUnits="userSpaceOnUse">
          <stop className="abstract-port-lab-mark__ink-start" offset="0" />
          <stop className="abstract-port-lab-mark__ink-mid" offset="0.52" />
          <stop className="abstract-port-lab-mark__ink-end" offset="1" />
        </linearGradient>
        <linearGradient id={accentId} x1="20" y1="52" x2="50" y2="30" gradientUnits="userSpaceOnUse">
          <stop className="abstract-port-lab-mark__accent-start" offset="0" />
          <stop className="abstract-port-lab-mark__accent-end" offset="1" />
        </linearGradient>
      </defs>
    </svg>
  )
}
