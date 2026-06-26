import { IconArrowRight } from '@douyinfe/semi-icons'
import type { Project } from '../data/portfolio'

interface ProjectCardProps {
  project: Project
  onViewDetails: () => void
}

export function ProjectCard({ project, onViewDetails }: ProjectCardProps) {
  return (
    <div className="glass-card project-card hover-lift">
      {project.image && (
        <div className="project-image">
          <img src={project.image} alt={project.title} loading="lazy" />
        </div>
      )}
      
      <div className="project-content">
        <div className="project-header">
          <h3 className="project-title">{project.title}</h3>
          <span className="tag">{project.role}</span>
        </div>
        
        <p className="project-summary">{project.summary}</p>
        
        <div className="project-stack">
          {project.stack.slice(0, 4).map((tech) => (
            <span key={tech} className="stack-tag">{tech}</span>
          ))}
          {project.stack.length > 4 && (
            <span className="stack-tag">+{project.stack.length - 4}</span>
          )}
        </div>
        
        <div className="project-footer">
          <button className="btn" onClick={onViewDetails}>
            <span>查看详情</span>
            <IconArrowRight />
          </button>
          
          {project.links.length > 0 && (
            <div className="project-links">
              {project.links.filter(link => link.type === 'external').slice(0, 2).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-badge"
                  onClick={(e) => e.stopPropagation()}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
