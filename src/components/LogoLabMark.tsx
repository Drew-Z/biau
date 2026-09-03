import { useId } from 'react'

export type LogoLabVariant = 'uppercase-b' | 'lowercase-b'

interface LogoLabMarkProps {
  variant: LogoLabVariant
  size?: number
  monochrome?: boolean
  animated?: boolean
  title?: string
  className?: string
}

export function LogoLabMark({
  variant,
  size = 128,
  monochrome = false,
  animated = false,
  title,
  className = '',
}: LogoLabMarkProps) {
  const rawId = useId().replace(/:/g, '')
  const inkId = `${rawId}-ink`
  const accentId = `${rawId}-accent`
  const titleId = `${rawId}-title`
  const classes = [
    'logo-lab-mark',
    variant === 'uppercase-b' ? 'logo-lab-mark--uppercase' : 'logo-lab-mark--lowercase',
    monochrome ? 'is-monochrome' : '',
    animated ? 'is-animated' : '',
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
      aria-hidden={title ? undefined : 'true'}
      aria-labelledby={title ? titleId : undefined}
      focusable="false"
      role={title ? 'img' : undefined}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <path
        className="logo-lab-mark__corners"
        d="M14 21V15H20M44 15H50V21M14 43V49H20M44 49H50V43"
        stroke={`url(#${accentId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />

      {variant === 'uppercase-b' ? (
        <>
          <path
            className="logo-lab-mark__spine"
            d="M20 15V49"
            stroke={`url(#${inkId})`}
            strokeWidth="6"
            strokeLinecap="round"
            pathLength={1}
          />
          <path
            className="logo-lab-mark__bowl logo-lab-mark__bowl--top"
            d="M20 15H33.5C40.7 15 45 18.5 45 24C45 28.4 41.1 31.2 34.5 31.2H22"
            stroke={`url(#${inkId})`}
            strokeWidth="5.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
          />
          <path
            className="logo-lab-mark__bowl logo-lab-mark__bowl--bottom"
            d="M22 33H35C42.2 33 47 36.1 47 40.7C47 46 42.4 49 34.2 49H20"
            stroke={`url(#${inkId})`}
            strokeWidth="5.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
          />
          <path
            className="logo-lab-mark__port-cut"
            d="M45 32H49"
            stroke={`url(#${accentId})`}
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={1}
          />
          <circle className="logo-lab-mark__node" cx="49" cy="32" r="2.5" fill={`url(#${accentId})`} />
        </>
      ) : (
        <>
          <path
            className="logo-lab-mark__spine"
            d="M22 14V49"
            stroke={`url(#${inkId})`}
            strokeWidth="6"
            strokeLinecap="round"
            pathLength={1}
          />
          <path
            className="logo-lab-mark__ascender"
            d="M22 14H29"
            stroke={`url(#${inkId})`}
            strokeWidth="5.4"
            strokeLinecap="round"
            pathLength={1}
          />
          <path
            className="logo-lab-mark__bowl"
            d="M22 31.2C25.3 27.2 29.5 25 34.6 25C42.1 25 46.5 29.7 46.5 37C46.5 44.5 42 49 34 49C28.4 49 24.4 46.4 22 42"
            stroke={`url(#${inkId})`}
            strokeWidth="5.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
          />
          <path
            className="logo-lab-mark__port-cut"
            d="M43.3 29.2H48"
            stroke={`url(#${accentId})`}
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={1}
          />
          <circle className="logo-lab-mark__node" cx="48" cy="29.2" r="2.5" fill={`url(#${accentId})`} />
        </>
      )}

      <path
        className="logo-lab-mark__evidence"
        d="M22 53H30M34 53H42"
        stroke={`url(#${accentId})`}
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={1}
      />

      <defs>
        <linearGradient id={inkId} x1="18" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop className="logo-lab-mark__ink-start" offset="0" />
          <stop className="logo-lab-mark__ink-mid" offset="0.52" />
          <stop className="logo-lab-mark__ink-end" offset="1" />
        </linearGradient>
        <linearGradient id={accentId} x1="20" y1="52" x2="49" y2="28" gradientUnits="userSpaceOnUse">
          <stop className="logo-lab-mark__accent-start" offset="0" />
          <stop className="logo-lab-mark__accent-end" offset="1" />
        </linearGradient>
      </defs>
    </svg>
  )
}
