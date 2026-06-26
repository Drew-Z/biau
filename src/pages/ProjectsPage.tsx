import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { projects } from '../data/portfolio'

export function ProjectsPage() {
  const navigate = useNavigate()

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

  return (
    <div className="page-section">
      <div className="section-header">
        <p className="section-subtitle">PROJECT PORTFOLIO</p>
        <h1 className="section-title">项目集</h1>
        <p className="section-description">让技术落进可演示的流程</p>
      </div>

      {projectGroups.map((group) => (
        <div key={group.key} className="project-group">
          <h2 className="project-group-title">{group.title}</h2>
          <div className="projects-grid">
            {group.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onViewDetails={() => navigate(`/projects/${project.id}`)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
