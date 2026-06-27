import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { projects, type Project } from '../data/portfolio'

export function ProjectsPage() {
  const navigate = useNavigate()

  const openProjectDetail = (project: Project) => {
    const detailLink = project.detailLink
    if (!detailLink) {
      navigate(`/projects/${project.id}`)
      return
    }

    if (detailLink.type === 'external') {
      window.open(detailLink.href, '_blank', 'noopener,noreferrer')
      return
    }

    navigate(detailLink.href)
  }

  const projectGroups = useMemo(() => {
    const ai = projects.filter((p) => p.category === 'ai')
    const business = projects.filter((p) => p.category === 'business')
    const interactive = projects.filter((p) => p.category === 'interactive')
    const mobile = projects.filter((p) => p.category === 'mobile')
    const platform = projects.filter((p) => p.category === 'platform')

    return [
      { key: 'ai', title: 'AI 应用', projects: ai },
      { key: 'fullstack', title: '全栈开发', projects: [...business, ...platform, ...mobile] },
      { key: 'games', title: '游戏项目', projects: interactive },
    ]
  }, [])

  let projectIndex = 0

  return (
    <main className="projects-tools-page page-stack">
      <section className="section-header page-hero">
        <p className="section-subtitle">PROJECT PORTFOLIO</p>
        <h1 className="section-title">项目集</h1>
        <p className="section-description">让技术落进可演示的流程</p>
      </section>

      {projectGroups.map((group) => (
        <section key={group.key} className="project-group">
          <div className="project-group-head">
            <span>{group.key.toUpperCase()}</span>
            <h2 className="project-group-title">{group.title}</h2>
          </div>
          <div className="projects-grid card-grid collapsed-tool-grid">
            {group.projects.map((project) => {
              projectIndex += 1
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={projectIndex}
                  onViewDetails={() => openProjectDetail(project)}
                />
              )
            })}
          </div>
        </section>
      ))}
    </main>
  )
}
