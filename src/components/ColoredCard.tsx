import type { HeroProject } from '../data/hero'
import type { ProjectCtaProjection } from '../data/projectPublication'
import { Activity, ExternalLink } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { catalogCopy } from '../data/catalogCopy'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

interface ColoredCardProps {
  project: HeroProject
  index: number
  projectCount: number
  entryAction: ProjectCtaProjection
  loopCopy?: boolean
  onClick: () => void
  onActionClick?: () => void
}

export function ColoredCard({ project, index, projectCount, entryAction, loopCopy = false, onClick, onActionClick }: ColoredCardProps) {
  const language = useSiteLanguage()
  const number = String((index % Math.max(projectCount, 1)) + 1).padStart(2, '0')
  const authoredActionLabel = entryAction.enabled ? project.actionLabel : undefined
  const actionLabel = authoredActionLabel ?? `${entryAction.label}${language === 'en' ? ': ' : '：'}${project.title}`
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onClick()
  }

  return (
    <article
      className={`carousel-card ${project.accent}`}
      data-port-index={number}
      data-loop-copy={loopCopy ? 'true' : undefined}
      aria-label={catalogCopy[language].projectDetails(project.title)}
      lang={SITE_LANGUAGE_TAGS[language]}
      role="link"
      tabIndex={0}
      onClick={() => {
        onClick()
      }}
      onKeyDown={handleKeyDown}
    >
      <div lang="zh-CN">
        <strong>{project.title}</strong>
        <p className="desc">
          {project.description}
          <span className="literary-title"> ——{project.poetry}</span>
        </p>
      </div>
      {onActionClick && (
        <button
          className="carousel-action"
          type="button"
          data-entry-mode={entryAction.mode}
          aria-label={actionLabel}
          lang={SITE_LANGUAGE_TAGS[authoredActionLabel ? 'zh' : entryAction.labelLanguage]}
          onClick={(event) => {
            event.stopPropagation()
            onActionClick()
          }}
          onKeyDown={(event) => {
            event.stopPropagation()
          }}
        >
          <span className="carousel-action__label carousel-action__label--full" lang={SITE_LANGUAGE_TAGS[entryAction.labelLanguage]}>{entryAction.label}</span>
          <span className="carousel-action__label carousel-action__label--compact" lang={SITE_LANGUAGE_TAGS[entryAction.labelLanguage]} aria-hidden>{entryAction.compactLabel}</span>
          {entryAction.enabled ? <ExternalLink size={16} aria-hidden /> : <Activity size={16} aria-hidden />}
        </button>
      )}
    </article>
  )
}
