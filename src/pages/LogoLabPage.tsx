import { Link } from 'react-router-dom'
import { CodexLogoV3Mark } from '../components/CodexLogoV3Mark'
import { ClaudeLogoV3Mark } from '../components/ClaudeLogoV3Mark'
import '../styles/logo-lab.css'

const sizes = [24, 40, 48, 64]
const themes = [
  { id: 'morning', label: 'Morning', note: '暖瓷 / 开放入口' },
  { id: 'nature', label: 'Nature', note: '青瓷 / 低频流动' },
  { id: 'stellar', label: 'Stellar', note: '深空 / 信号点' },
] as const

type VariantCardProps =
  | { source: 'codex-v3' }
  | { source: 'claude-v3' }

function VariantCard(props: VariantCardProps) {
  const { source } = props
  const meta = source === 'codex-v3'
    ? {
      label: 'CODEX / Tide Gate',
      title: '潮汐门',
      description: '偏移主轴与上下两段开放岸线围出真实水口，状态点和证据刻度组成公开入口；整体只借用 B/b 的偏心节奏，不描完整字母。',
      read: '第一眼：开放港口入口；第二眼：流动状态与验证节拍。',
    }
    : {
      label: 'CLAUDE / Flow Threshold',
      title: '流动阈值',
      description: '左侧固定脊柱与上下两条开放流线围出负空间，开放阈值刻度和三枚状态节点表达可验证的公共入口；不闭合为标准字母或方块。',
      read: '第一眼：开放入口；第二眼：流动边界与状态锚点。',
    }
  const mark = (options: { size: number; monochrome?: boolean; animated?: boolean; title: string }) => (
    source === 'codex-v3'
      ? <CodexLogoV3Mark ariaHidden={false} {...options} />
      : <ClaudeLogoV3Mark ariaHidden={false} {...options} />
  )
  return (
    <article className="logo-lab-card">
      <header className="logo-lab-card__head">
        <div>
          <p className="logo-lab-card__eyebrow">{meta.label}</p>
          <h2>{meta.title}</h2>
        </div>
        <div className="logo-lab-card__hero-mark" aria-label={`${meta.title}彩色预览`}>
          {mark({ size: 144, animated: true, title: `${meta.title}彩色预览` })}
        </div>
      </header>
      <p className="logo-lab-card__description">{meta.description}</p>
      <p className="logo-lab-card__read">{meta.read}</p>

      <div className="logo-lab-card__section">
        <div className="logo-lab-card__section-head">
          <span>单色轮廓</span>
          <span className="logo-lab-card__hint">去掉主题与动效</span>
        </div>
        <div className="logo-lab-card__mono">
          {mark({ size: 116, monochrome: true, title: `${meta.title}单色轮廓` })}
        </div>
      </div>

      <div className="logo-lab-card__section">
        <div className="logo-lab-card__section-head">
          <span>小尺寸阶梯</span>
          <span className="logo-lab-card__hint">favicon / nav / intro</span>
        </div>
        <div className="logo-lab-card__sizes">
          {sizes.map((size) => (
            <div key={size} className="logo-lab-size">
              <div className="logo-lab-size__surface">
                {mark({ size, title: `${meta.title} ${size}像素` })}
              </div>
              <span>{size}px</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

export function LogoLabPage() {
  return (
    <main className="logo-lab-page page-stack">
      <section className="logo-lab-hero page-hero">
        <p className="section-subtitle">BRAND LAB / MARK COMPARISON</p>
        <h1 className="section-title">BIAU Port Logo 对照实验</h1>
          <p className="section-description">
          本轮并列展示 Codex 的“潮汐门”和 Claude Code 的“流动阈值”两套独立 V3 几何。所有候选共用同一套尺寸、单色、主题材质和动效验收规则，先比较轮廓与缩小后的稳定性，再讨论是否进入生产。
        </p>
        <div className="logo-lab-hero__meta">
          <span>当前生产 Logo 未替换</span>
          <span>仅实验页使用</span>
          <span>不写入项目数据</span>
        </div>
      </section>

      <section className="logo-lab-variants" aria-label="两套全新 Logo 候选">
        <VariantCard source="codex-v3" />
        <VariantCard source="claude-v3" />
      </section>

      <section className="logo-lab-themes" aria-labelledby="logo-lab-themes-title">
        <div className="logo-lab-section-head">
          <div>
            <p className="section-subtitle">MATERIAL PARITY</p>
            <h2 id="logo-lab-themes-title">三主题材质对照</h2>
          </div>
          <p>每套候选在三个主题中保持自身几何不变，只替换外壳、主笔画和状态点的材质 token。</p>
        </div>
        <div className="logo-lab-theme-grid">
          {themes.map((theme) => (
            <article key={theme.id} className={`logo-lab-theme logo-lab-theme--${theme.id}`}>
              <div className="logo-lab-theme__copy">
                <span>{theme.label}</span>
                <small>{theme.note}</small>
              </div>
              <div className="logo-lab-theme__marks">
                <CodexLogoV3Mark ariaHidden={false} size={108} title={`${theme.label} Codex 潮汐门`} />
                <ClaudeLogoV3Mark ariaHidden={false} size={108} title={`${theme.label} Claude Code 流动阈值`} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="logo-lab-next" aria-labelledby="logo-lab-next-title">
        <div>
          <p className="section-subtitle">NEXT DECISION</p>
          <h2 id="logo-lab-next-title">先选主标，再扩展项目子标</h2>
          <p>主标确定后，项目 Logo 会沿用同一安全区、笔画和开放切口，再根据真实产品能力做独立轮廓。</p>
        </div>
        <Link to="/projects" className="btn">查看项目内容</Link>
      </section>
    </main>
  )
}
