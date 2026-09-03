import { useId } from 'react'
import '../styles/codex-logo-v3.css'

interface CodexLogoV3MarkProps {
  size?: number | string
  monochrome?: boolean
  animated?: boolean
  title?: string
  ariaHidden?: boolean
  className?: string
}

/**
 * Tide Gate: a slanted breakwater and two shoreline fragments around a public inlet.
 * The offset rhythm only hints at B/b; no contour closes into a letterform.
 */
export function CodexLogoV3Mark({
  size = 64,
  monochrome = false,
  animated = false,
  title,
  ariaHidden = true,
  className = '',
}: CodexLogoV3MarkProps) {
  const rawId = useId().replace(/:/g, '')
  const inkId = `${rawId}-tide-gate-ink`
  const currentId = `${rawId}-tide-gate-current`
  const titleId = `${rawId}-tide-gate-title`
  const labelled = !ariaHidden && Boolean(title)
  const classes = [
    'codex-logo-v3-mark',
    monochrome ? 'is-codex-logo-v3-monochrome' : '',
    animated ? 'is-codex-logo-v3-animated' : '',
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
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : 'true'}
      aria-labelledby={labelled ? titleId : undefined}
      focusable="false"
    >
      {labelled ? <title id={titleId}>{title}</title> : null}
      <path
        className="codex-logo-v3-mark__ridge"
        d="M25 10.5C22.8 17.4 21.2 24.6 20.1 32.1C18.9 40.2 17.3 47.2 13.8 53"
        stroke={`url(#${inkId})`}
        strokeWidth="5.4"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="codex-logo-v3-mark__shore codex-logo-v3-mark__shore--upper"
        d="M29.2 14.2C39.5 13.1 47.4 19.1 48.1 27.4"
        stroke={`url(#${inkId})`}
        strokeWidth="5.3"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="codex-logo-v3-mark__shore codex-logo-v3-mark__shore--lower"
        d="M46.8 40.2C44.3 44.2 40.2 47 34 48.6"
        stroke={`url(#${inkId})`}
        strokeWidth="5.3"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="codex-logo-v3-mark__inlet"
        d="M12.8 34.4C19.1 30.8 25.8 30.8 33.8 35.1C37.2 36.9 40.7 37.4 44.8 36.1"
        stroke={`url(#${currentId})`}
        strokeWidth="2.35"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle
        className="codex-logo-v3-mark__node-glow"
        cx="34.2"
        cy="35.2"
        r="6.3"
        fill="var(--codex-logo-v3-node)"
      />
      <circle
        className="codex-logo-v3-mark__node"
        cx="34.2"
        cy="35.2"
        r="2.8"
        fill="var(--codex-logo-v3-node)"
      />
      <path
        className="codex-logo-v3-mark__evidence"
        d="M26 55.2H30.4M34.7 55.2H39.1"
        stroke={`url(#${currentId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        pathLength={1}
      />
      <defs>
        <linearGradient id={inkId} x1="16" y1="12" x2="49" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--codex-logo-v3-ink-start)" />
          <stop offset="0.52" stopColor="var(--codex-logo-v3-ink-mid)" />
          <stop offset="1" stopColor="var(--codex-logo-v3-ink-end)" />
        </linearGradient>
        <linearGradient id={currentId} x1="13" y1="32" x2="45" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--codex-logo-v3-current-start)" />
          <stop offset="1" stopColor="var(--codex-logo-v3-current-end)" />
        </linearGradient>
      </defs>
    </svg>
  )
}
