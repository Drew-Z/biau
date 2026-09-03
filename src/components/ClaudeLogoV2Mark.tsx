import { useId } from 'react'
import '../styles/claude-logo-v2.css'

interface ClaudeLogoV2MarkProps {
  animated?: boolean
  ariaHidden?: boolean
  className?: string
  monochrome?: boolean
  size?: number | string
  title?: string
}

/**
 * Quay Cut — BIAU Port 标记再生成候选（Claude v2，仅探索，不是生产资产）。
 *
 * 构造原则与既有候选相反：不是在底板上画线，而是**从一块实心陆地里切出港口**。
 * 可见的墨是陆地，标识来自水切走的部分，因此负空间承担全部语义。
 *
 * 图层（自下而上）：
 * - water   整块版形铺满"水/水流"渐变，只从切口透出
 * - glow    泊位光晕，被 land 自动裁切在切口内
 * - berth   停靠状态：悬浮在泊位口内的实心 accent 块
 * - land    单条 evenodd 路径 = 版形 - 深水道 - 浅进水口，两个切口都咬开右边缘
 * - shore   切口岸线高光，界定陆与水的交接
 * - rim     外缘微光，仅用于材质，不承担语义
 * - gauge   三段递增刻度 = 验证证据的节拍
 *
 * 语义映射（来自 HeroSplit 的站点承诺句，不是新增主张）：
 * 深水道自右边缘向内收窄 = 生命周期从公开入口走向内部；x=21.6 的直立内壁 =
 * 能力边界，水道到此为止；壁脚折下的泊位口 = 靠泊，其中的 accent 块 = 当前状态；
 * 浅进水口与刻度 = 证据节拍。切口咬开边缘而非封闭在内部，是"公开港口"的直接表达。
 */

const PLATE_PATH =
  'M22 5 L42 5 A17 17 0 0 1 59 22 L59 42 A17 17 0 0 1 42 59 L7.5 59 A2.5 2.5 0 0 1 5 56.5 L5 22 A17 17 0 0 1 22 5 Z'

// 两个切口都超出版形右缘（x=62）后再由 plateClip 裁掉，这样"入海口"是真的敞开，
// 而不是被子路径的闭合段在 x=59 处补上一条发丝线。
const CHANNEL_PATH =
  'M62 23.2 L23.1 24.35 Q21.6 24.4 21.6 25.9 L21.6 39.1 Q21.6 40.6 23.1 40.6 L26.1 40.6 Q27.6 40.6 27.6 39.1 L27.6 30.9 Q27.6 29.4 29.1 29.4 L62 29.4 Z'

const INLET_PATH =
  'M62 34.8 L38.6 34.8 Q37.2 34.8 37.2 36.2 L37.2 37.5 Q37.2 38.9 38.6 38.9 L62 38.9 Z'

const LAND_PATH = `${PLATE_PATH} ${CHANNEL_PATH} ${INLET_PATH}`
const SHORE_PATH = `${CHANNEL_PATH} ${INLET_PATH}`

const GAUGE_STEPS = [
  { step: 1, d: 'M14.6 50.4 V46.8' },
  { step: 2, d: 'M19.6 50.4 V45.4' },
  { step: 3, d: 'M24.6 50.4 V44' },
]

export function ClaudeLogoV2Mark({
  animated = false,
  ariaHidden = true,
  className = '',
  monochrome = false,
  size = 48,
  title,
}: ClaudeLogoV2MarkProps) {
  const rawId = useId().replace(/:/g, '')
  const waterId = `${rawId}-quay-water`
  const landId = `${rawId}-quay-land`
  const berthId = `${rawId}-quay-berth`
  const plateClipId = `${rawId}-quay-plate-clip`
  const landClipId = `${rawId}-quay-land-clip`
  const titleId = `${rawId}-quay-title`
  const labelled = !ariaHidden && Boolean(title)
  const classes = [
    'claude-logo-v2',
    animated ? 'is-claude-logo-v2-animated' : '',
    monochrome ? 'is-claude-logo-v2-monochrome' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      data-mark-size={size}
      fill="none"
      aria-hidden={ariaHidden ? 'true' : undefined}
      aria-labelledby={labelled ? titleId : undefined}
      focusable="false"
      role={labelled ? 'img' : undefined}
    >
      {labelled ? <title id={titleId}>{title}</title> : null}
      <g clipPath={`url(#${plateClipId})`}>
        <path className="claude-logo-v2__water" d={PLATE_PATH} fill={`url(#${waterId})`} />
        <rect
          className="claude-logo-v2__glow"
          x="17.1"
          y="28.4"
          width="15"
          height="15"
          rx="7.5"
          fill="var(--claude-mark-v2-berth, #d8952f)"
        />
        <rect
          className="claude-logo-v2__berth"
          x="22.6"
          y="33.1"
          width="4"
          height="5.7"
          rx="1.1"
          fill={`url(#${berthId})`}
        />
        <path
          className="claude-logo-v2__land"
          d={LAND_PATH}
          fill={`url(#${landId})`}
          fillRule="evenodd"
          clipRule="evenodd"
        />
        <path
          className="claude-logo-v2__shore"
          d={SHORE_PATH}
          stroke="var(--claude-mark-v2-shore, rgb(233 245 255 / 62%))"
          strokeWidth="1"
          pathLength={1}
        />
      </g>
      <g clipPath={`url(#${landClipId})`}>
        <path
          className="claude-logo-v2__rim"
          d={PLATE_PATH}
          stroke="var(--claude-mark-v2-rim, rgb(233 245 255 / 40%))"
          strokeWidth="1.6"
        />
        {GAUGE_STEPS.map(({ step, d }) => (
          <path
            className="claude-logo-v2__gauge"
            d={d}
            data-gauge-step={step}
            key={step}
            stroke="var(--claude-mark-v2-gauge, rgb(233 245 255 / 58%))"
            strokeLinecap="round"
            strokeWidth="2"
            pathLength={1}
          />
        ))}
      </g>
      <defs>
        <clipPath id={plateClipId}>
          <path d={PLATE_PATH} />
        </clipPath>
        <clipPath id={landClipId}>
          <path d={LAND_PATH} clipRule="evenodd" />
        </clipPath>
        <linearGradient id={waterId} x1="59" y1="25" x2="23" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--claude-mark-v2-water-start, #eaf6ff)" />
          <stop offset="0.55" stopColor="var(--claude-mark-v2-water-mid, #bcdcf0)" />
          <stop offset="1" stopColor="var(--claude-mark-v2-water-end, #8fc4dd)" />
        </linearGradient>
        <linearGradient id={landId} x1="9" y1="7" x2="57" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--claude-mark-v2-land-start, #24405f)" />
          <stop offset="0.52" stopColor="var(--claude-mark-v2-land-mid, #172e48)" />
          <stop offset="1" stopColor="var(--claude-mark-v2-land-end, #0d1e30)" />
        </linearGradient>
        <linearGradient id={berthId} x1="24.6" y1="33.1" x2="24.6" y2="38.8" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--claude-mark-v2-berth-strong, #f0b95c)" />
          <stop offset="1" stopColor="var(--claude-mark-v2-berth, #d8952f)" />
        </linearGradient>
      </defs>
    </svg>
  )
}
