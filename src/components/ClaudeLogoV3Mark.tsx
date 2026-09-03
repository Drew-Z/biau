import { useId } from 'react'
import '../styles/claude-logo-v3.css'

interface ClaudeLogoV3MarkProps {
  size?: number | string
  monochrome?: boolean
  animated?: boolean
  title?: string
  ariaHidden?: boolean
  className?: string
}

export function ClaudeLogoV3Mark({
  size = 64,
  monochrome = false,
  animated = false,
  title,
  ariaHidden = true,
  className = ''
}: ClaudeLogoV3MarkProps) {
  const rawId = useId().replace(/:/g, '')
  const flowGradientId = `${rawId}-claude-flow`
  const thresholdGradientId = `${rawId}-claude-threshold`
  const titleId = `${rawId}-claude-title`

  const classes = [
    'claude-logo-v3-mark',
    monochrome ? 'is-claude-v3-monochrome' : '',
    animated ? 'is-claude-v3-animated' : '',
    className
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
      aria-hidden={ariaHidden ? 'true' : undefined}
      aria-labelledby={!ariaHidden && title ? titleId : undefined}
      focusable="false"
      role={!ariaHidden && title ? 'img' : undefined}
    >
      {!ariaHidden && title ? <title id={titleId}>{title}</title> : null}

      {/* Open threshold ticks keep the boundary legible without closing into an app tile. */}
      <path
        className="claude-v3-mark__threshold"
        d="M11 12H17M47 12H53M11 52H17M47 52H53"
        stroke={monochrome ? 'currentColor' : `url(#${thresholdGradientId})`}
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity={monochrome ? '0.45' : '0.72'}
      />

      {/* Offset upper contour: an open inlet edge, not a closed letterform. */}
      <path
        className="claude-v3-mark__flow-upper"
        d="M19 17 C27 12 39 13 45 19 C50 24 49 31 44 35 C41 37 37 38 33 37"
        stroke={monochrome ? 'currentColor' : `url(#${flowGradientId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />

      {/* Lower contour shifts inward to create a deliberate break in the rhythm. */}
      <path
        className="claude-v3-mark__flow-lower"
        d="M32 42 C27 39 20 39 17 43 C14 47 17 51 23 53 C31 55 41 51 46 44"
        stroke={monochrome ? 'currentColor' : `url(#${flowGradientId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />

      {/* Broken boundary fragments keep the left edge anchored without drawing a spine. */}
      <path
        className="claude-v3-mark__spine"
        d="M17 14L15 22M14 29L13 37M12 44L11 51"
        stroke={monochrome ? 'currentColor' : `url(#${flowGradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        pathLength={1}
      />

      {/* Offset threshold markers: public checkpoints rather than a vertical B spine. */}
      <circle
        className="claude-v3-mark__marker claude-v3-mark__marker--top"
        cx="18"
        cy="15"
        r="2.5"
        fill={monochrome ? 'currentColor' : 'var(--claude-v3-marker, #c77f31)'}
      />
      <circle
        className="claude-v3-mark__marker claude-v3-mark__marker--middle"
        cx="37"
        cy="34"
        r="2.5"
        fill={monochrome ? 'currentColor' : 'var(--claude-v3-marker, #c77f31)'}
      />
      <circle
        className="claude-v3-mark__marker claude-v3-mark__marker--bottom"
        cx="28"
        cy="51"
        r="2.5"
        fill={monochrome ? 'currentColor' : 'var(--claude-v3-marker, #c77f31)'}
      />

      <defs>
        <linearGradient id={flowGradientId} x1="12" y1="12" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--claude-v3-flow-start, #315e9b)" />
          <stop offset="0.5" stopColor="var(--claude-v3-flow-mid, #2478a0)" />
          <stop offset="1" stopColor="var(--claude-v3-flow-end, #367f62)" />
        </linearGradient>
        <linearGradient id={thresholdGradientId} x1="4" y1="8" x2="60" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--claude-v3-threshold-start, #e5f1e8)" />
          <stop offset="0.5" stopColor="var(--claude-v3-threshold-mid, #d9f0df)" />
          <stop offset="1" stopColor="var(--claude-v3-threshold-end, #a8d7b7)" />
        </linearGradient>
      </defs>
    </svg>
  )
}
