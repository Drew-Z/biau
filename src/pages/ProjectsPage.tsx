import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { projects } from '../data/portfolio'
import { trackAnalyticsEvent } from '../utils/analytics'

type ProjectGroupKey = 'ai' | 'fullstack' | 'games'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [activeMobileGroup, setActiveMobileGroup] = useState<ProjectGroupKey>('ai')
  const [isMobileLayout, setIsMobileLayout] = useState(false)

  const openProjectDetail = (projectId: string) => {
    trackAnalyticsEvent('project_detail_open', {
      source: 'projects-page-card',
      projectId,
    })
    navigate(`/projects/${projectId}`)
  }

  const projectGroups = useMemo(() => {
    const ai = projects.filter((project) => project.category === 'ai')
    const business = projects.filter((project) => project.category === 'business')
    const interactive = projects.filter((project) => project.category === 'interactive')
    const mobile = projects.filter((project) => project.category === 'mobile')
    const platform = projects.filter((project) => project.category === 'platform')

    return [
      { key: 'ai' as const, title: 'AI 应用', projects: ai },
      { key: 'fullstack' as const, title: '全栈开发', projects: [...business, ...platform, ...mobile] },
      { key: 'games' as const, title: '游戏项目', projects: interactive },
    ]
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 720px)')
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches)

    updateLayout()
    mediaQuery.addEventListener('change', updateLayout)
    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [])

  let projectIndex = 0

  return (
    <main className="projects-tools-page page-stack">
      <section className="section-header page-hero">
        <p className="section-subtitle">PROJECT PORTFOLIO</p>
        <h1 className="section-title">项目集</h1>
        <p className="section-description">让技术落进可演示的流程</p>
      </section>


      {projectGroups.map((group) => {
        const panelId = `project-group-panel-${group.key}`
        const isActive = activeMobileGroup === group.key

        return (
          <section key={group.key} className={`project-group ${isActive ? 'is-mobile-active' : ''}`}>
            <div className="project-group-head">
              <span>{group.key.toUpperCase()}</span>
              <h2 className="project-group-title">{group.title}</h2>
            </div>
            <button
              type="button"
              className="project-group-toggle"
              aria-expanded={isActive}
              aria-controls={panelId}
              onClick={() => setActiveMobileGroup(group.key)}
            >
              <span className="project-group-toggle__index">{group.key.toUpperCase()}</span>
              <span className="project-group-toggle__copy">
                <strong>{group.title}</strong>
                <em>{group.projects.length} 个项目</em>
              </span>
              <ChevronDown size={18} aria-hidden />
            </button>
            <div
              id={panelId}
              className="projects-grid card-grid collapsed-tool-grid"
              hidden={isMobileLayout && !isActive}
            >
              {group.projects.map((project) => {
                projectIndex += 1
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={projectIndex}
                    onViewDetails={() => openProjectDetail(project.id)}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
