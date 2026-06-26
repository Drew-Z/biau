import { heroContent, type HeroProject } from '../data/hero'
import { IconArrowRight } from '@douyinfe/semi-icons'

type SiteLanguage = 'zh' | 'en'

interface HeroProps {
  language: SiteLanguage
  onProjectClick: (link: string) => void
}

export function Hero({ language, onProjectClick }: HeroProps) {
  const { title, poetry, projects } = heroContent

  return (
    <section className="hero-fullscreen">
      {/* 大标题区 */}
      <div className="hero-header">
        <h1 className="site-title">{title[language]}</h1>
        <p className="site-title-en">{title.en}</p>
        
        <div className="poetry-section">
          <h2 className="poetry-main">{poetry.main}</h2>
          <p className="poetry-sub">{poetry.sub}</p>
        </div>
      </div>

      {/* IN PORT 区块 */}
      <div className="in-port-section">
        <h3 className="section-label">IN PORT</h3>
        
        <div className="project-list">
          {projects.map((project) => (
            <HorizontalProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project.link)}
            />
          ))}
        </div>
      </div>

      {/* 底部装饰性音频控制器 */}
      <div className="audio-controls-decoration">
        <span className="audio-icon">Ⅱ</span>
        <span className="audio-time">0.00 / 0.00</span>
        <div className="playback-speed">
          <span>0.25x</span>
          <span>0.5x</span>
          <span className="active">1x</span>
          <span>2x</span>
          <span>4x</span>
        </div>
      </div>
    </section>
  )
}

interface HorizontalProjectCardProps {
  project: HeroProject
  onClick: () => void
}

function HorizontalProjectCard({ project, onClick }: HorizontalProjectCardProps) {
  return (
    <div className="project-card-horizontal">
      <div className="card-left">
        <h4 className="card-title-horizontal">{project.title}</h4>
        <p className="card-description-horizontal">{project.description}</p>
        <cite className="card-poetry-horizontal">{project.poetry}</cite>
      </div>
      <div className="card-right">
        <button className="btn btn-primary" onClick={onClick}>
          <span>{project.action}</span>
          <IconArrowRight />
        </button>
      </div>
    </div>
  )
}
