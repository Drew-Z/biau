import { useId } from 'react'
import '../styles/claude-logo-lab.css'

interface ClaudeLogoLabMarkProps {
  size?: number | string
  monochrome?: boolean
  animated?: boolean
  title?: string
  className?: string
}

export function ClaudeLogoLabMark({
  size = 64,
  monochrome = false,
  animated = false,
  title,
  className = '',
}: ClaudeLogoLabMarkProps) {
  const rawId = useId().replace(/:/g, '')
  const quayId = `${rawId}-claude-lab-quay`
  const basinId = `${rawId}-claude-lab-basin`
  const titleId = `${rawId}-claude-lab-title`
  const hasTitle = typeof title === 'string' && title.trim().length > 0
  const classes = [
    'claude-logo-lab-mark',
    monochrome ? 'is-claude-logo-lab-mark-monochrome' : '',
    animated ? 'is-claude-logo-lab-mark-animated' : '',
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
        className="claude-logo-lab-mark__quay-upper"
        d="M17.5 11.5V33"
        stroke={`url(#${quayId})`}
        strokeWidth="5.6"
        strokeLinecap="butt"
        pathLength={1}
      />
      <path
        className="claude-logo-lab-mark__quay-lower"
        d="M17.5 33V52"
        stroke={`url(#${quayId})`}
        strokeWidth="5.6"
        strokeLinecap="butt"
        pathLength={1}
      />
      <path
        className="claude-logo-lab-mark__basin"
        d="M17.5 34.3C20.8 29 25.5 25.8 31.7 25.8C39.1 25.8 44 30.8 44 38C44 45.2 39.3 50.3 31.5 50.3C25.4 50.3 20.6 47.1 17.5 42.2"
        stroke={`url(#${basinId})`}
        strokeWidth="5.6"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="claude-logo-lab-mark__channel-cut"
        d="M39 28.3H47.1"
        stroke="var(--claude-lab-node, #c77f31)"
        strokeWidth="2.2"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle className="claude-logo-lab-mark__node-glow" cx="47.12" cy="28.29" r="6.2" fill="var(--claude-lab-node, #c77f31)" />
      <circle className="claude-logo-lab-mark__node" cx="47.12" cy="28.29" r="3" fill="var(--claude-lab-node, #c77f31)" />
      <defs>
        <linearGradient id={quayId} x1="14" y1="12" x2="22" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--claude-lab-quay-start, #1c2e4e)" />
          <stop offset="0.52" stopColor="var(--claude-lab-quay-mid, #27466f)" />
          <stop offset="1" stopColor="var(--claude-lab-quay-end, #315e9b)" />
        </linearGradient>
        <linearGradient id={basinId} x1="18" y1="26" x2="44" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--claude-lab-basin-start, #2f6fa8)" />
          <stop offset="0.54" stopColor="var(--claude-lab-basin-mid, #4f8fb8)" />
          <stop offset="1" stopColor="var(--claude-lab-basin-end, #b85b7e)" />
        </linearGradient>
      </defs>
    </svg>
  )
}
