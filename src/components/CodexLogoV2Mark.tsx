import { useId } from 'react'
import '../styles/codex-logo-v2.css'

interface CodexLogoV2MarkProps {
  size?: number | string
  monochrome?: boolean
  animated?: boolean
  title?: string
  className?: string
}

/**
 * Split Quay: two separated quay posts and one open tidal contour.
 * The composition only hints at B through its balance; it never closes into
 * a font-like letterform and keeps the central public channel visibly open.
 */
export function CodexLogoV2Mark({
  size = 64,
  monochrome = false,
  animated = false,
  title,
  className = '',
}: CodexLogoV2MarkProps) {
  const rawId = useId().replace(/:/g, '')
  const structureId = `${rawId}-split-quay-structure`
  const currentId = `${rawId}-split-quay-current`
  const titleId = `${rawId}-split-quay-title`
  const hasTitle = typeof title === 'string' && title.trim().length > 0
  const classes = [
    'codex-logo-v2-mark',
    monochrome ? 'is-codex-logo-v2-monochrome' : '',
    animated ? 'is-codex-logo-v2-animated' : '',
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
        className="codex-logo-v2-mark__quay codex-logo-v2-mark__quay--upper"
        d="M19.5 15.5V27.8"
        stroke={`url(#${structureId})`}
        strokeWidth="5.8"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="codex-logo-v2-mark__quay codex-logo-v2-mark__quay--lower"
        d="M19.5 38.4V49"
        stroke={`url(#${structureId})`}
        strokeWidth="5.8"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="codex-logo-v2-mark__contour"
        d="M24 18.2C34.6 14.8 44.7 18.3 45.5 25.6C46.2 31.2 41.7 33.7 35.2 34.1C41.3 33.9 46.8 36.8 46.1 42.5C45.2 49.2 35.1 51.5 24.1 47"
        stroke={`url(#${structureId})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <path
        className="codex-logo-v2-mark__channel"
        d="M15.5 33.1C21.3 30.3 26.3 30.7 31.7 33.4"
        stroke={`url(#${currentId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle
        className="codex-logo-v2-mark__node-glow"
        cx="33.1"
        cy="34.1"
        r="6.2"
        fill="var(--codex-logo-v2-node)"
      />
      <circle
        className="codex-logo-v2-mark__node"
        cx="33.1"
        cy="34.1"
        r="2.8"
        fill="var(--codex-logo-v2-node)"
      />
      <path
        className="codex-logo-v2-mark__evidence"
        d="M26 54H31M35 54H40"
        stroke={`url(#${currentId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        pathLength={1}
      />
      <defs>
        <linearGradient id={structureId} x1="18" y1="15" x2="47" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--codex-logo-v2-structure-start)" />
          <stop offset="0.5" stopColor="var(--codex-logo-v2-structure-mid)" />
          <stop offset="1" stopColor="var(--codex-logo-v2-structure-end)" />
        </linearGradient>
        <linearGradient id={currentId} x1="16" y1="31" x2="41" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--codex-logo-v2-current-start)" />
          <stop offset="1" stopColor="var(--codex-logo-v2-current-end)" />
        </linearGradient>
      </defs>
    </svg>
  )
}
