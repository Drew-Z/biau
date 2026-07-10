import { ArrowRight } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type { Project } from '../data/portfolio'
import { ResponsiveImage } from './ResponsiveImage'

interface ProjectCardProps {
  project: Project
  index?: number
  onViewDetails: () => void
}

const categoryAccent: Record<Project['category'], string> = {
  ai: 'signal',
  business: 'commerce',
  interactive: 'image',
  mobile: 'preview',
  platform: 'formula',
}

export function ProjectCard({ project, index, onViewDetails }: ProjectCardProps) {
  const number = index ? String(index).padStart(2, '0') : undefined
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onViewDetails()
  }

  return (
    <article
      className={`glass-card project-card feature-card hover-lift ${categoryAccent[project.category]}`}
      data-project-index={number}
      data-graph-label={project.title}
      onClick={onViewDetails}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`查看项目：${project.title}`}
    >
      {project.image && (
        <div className="project-image">
          <ResponsiveImage src={project.image} alt={project.title} loading="lazy" />
        </div>
      )}
      
      <div className="project-content">
        <div className="project-header feature-head">
          <span className="tag badge">{project.role}</span>
        </div>

        <h3 className="project-title">{project.title}</h3>
        
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
          <button
            className="btn"
            aria-label={`查看项目详情：${project.title}`}
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails()
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
            }}
          >
            <span>查看详情</span>
            <ArrowRight size={16} aria-hidden />
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
                  onKeyDown={(e) => {
                    e.stopPropagation()
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
