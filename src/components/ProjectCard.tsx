import { ArrowRight } from 'lucide-react'
import type { Project } from '../data/portfolio'
import { findProjectPublication, getPublishedProjectLinks } from '../data/projectPublication'
import { catalogCopy } from '../data/catalogCopy'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'
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
  const language = useSiteLanguage()
  const copy = catalogCopy[language]
  const number = index ? String(index).padStart(2, '0') : undefined
  const publishedLinks = getPublishedProjectLinks(findProjectPublication(project.id), project.links, language)
    .filter((link) => link.type === 'external' || link.intent === 'status')
    .slice(0, 2)
  return (
    <article
      className={`glass-card project-card feature-card hover-lift ${categoryAccent[project.category]}`}
      lang="zh-CN"
      data-project-index={number}
      data-graph-label={project.title}
      onClick={onViewDetails}
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
        
        <div className="project-footer" lang={SITE_LANGUAGE_TAGS[language]}>
          <button
            className="btn"
            data-reading-entry={`projects:${project.id}`}
            aria-label={copy.projectDetails(project.title)}
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails()
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
            }}
          >
            <span>{copy.viewDetails}</span>
            <ArrowRight size={16} aria-hidden />
          </button>
          
          {publishedLinks.length > 0 && (
            <div className="project-links" lang={SITE_LANGUAGE_TAGS[language]}>
              {publishedLinks.map((link) =>
                link.type === 'external' ? (
                  <a
                    key={`${link.intent}-${link.href}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-badge"
                    title={link.explanation}
                    lang={SITE_LANGUAGE_TAGS[link.explanationLanguage ?? link.labelLanguage]}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <span className="project-entry-label" lang={SITE_LANGUAGE_TAGS[link.labelLanguage]}>{link.label}</span>
                  </a>
                ) : (
                  <button
                    key={`${link.intent}-${link.href}`}
                    type="button"
                    className="link-badge link-badge--status"
                    data-project-href={link.href}
                    title={link.explanation}
                    lang={SITE_LANGUAGE_TAGS[link.explanationLanguage ?? link.labelLanguage]}
                    onClick={(event) => {
                      event.stopPropagation()
                      onNavigate(link.href)
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <span className="project-entry-label" lang={SITE_LANGUAGE_TAGS[link.labelLanguage]}>{link.label}</span>
                    <span className="sr-only" lang="zh-CN">{`${language === 'en' ? ': ' : '：'}${project.title}`}</span>
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
