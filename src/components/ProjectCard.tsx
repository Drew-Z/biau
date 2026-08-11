import { ArrowRight } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type { Project } from '../data/portfolio'
import { findProjectPublication, getPublishedProjectLinks } from '../data/projectPublication'
import { ResponsiveImage } from './ResponsiveImage'

interface ProjectCardProps {
  project: Project
  index?: number
  onViewDetails: () => void
  onNavigate: (href: string) => void
}

const categoryAccent: Record<Project['category'], string> = {
  ai: 'signal',
  business: 'commerce',
  interactive: 'image',
  mobile: 'preview',
  platform: 'formula',
  tool: 'signal',
}

export function ProjectCard({ project, index, onViewDetails, onNavigate }: ProjectCardProps) {
  const number = index ? String(index).padStart(2, '0') : undefined
  const publishedLinks = getPublishedProjectLinks(findProjectPublication(project.id), project.links)
    .filter((link) => link.type === 'external' || link.intent === 'status')
    .slice(0, 2)
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
          
          {publishedLinks.length > 0 && (
            <div className="project-links">
              {publishedLinks.map((link) =>
                link.type === 'external' ? (
                  <a
                    key={`${link.intent}-${link.href}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-badge"
                    title={link.explanation}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    {link.label}
                  </a>
                ) : (
                  <button
                    key={`${link.intent}-${link.href}`}
                    type="button"
                    className="link-badge link-badge--status"
                    aria-label={`${link.label}：${project.title}`}
                    title={link.explanation}
                    onClick={(event) => {
                      event.stopPropagation()
                      onNavigate(link.href)
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {link.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
