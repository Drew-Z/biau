import type { HeroProject } from '../data/hero'
import type { ProjectCtaProjection } from '../data/projectPublication'
import { Activity, ExternalLink } from 'lucide-react'
import type { KeyboardEvent } from 'react'

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
  const number = String((index % Math.max(projectCount, 1)) + 1).padStart(2, '0')
  const compactActionLabel = entryAction.mode === 'direct'
    ? entryAction.label.includes('受控') ? '受控' : '打开'
    : entryAction.mode === 'caution'
      ? '谨慎'
      : entryAction.label.includes('规划') ? '规划' : '状态'
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
      aria-label={`查看项目详情：${project.title}`}
      role="link"
      tabIndex={0}
      onClick={() => {
        onClick()
      }}
      onKeyDown={handleKeyDown}
    >
      <div>
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
          aria-label={entryAction.enabled ? project.actionLabel ?? `打开外部项目页面：${project.title}` : `${entryAction.label}：${project.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onActionClick()
          }}
          onKeyDown={(event) => {
            event.stopPropagation()
          }}
        >
          <span className="carousel-action__label carousel-action__label--full">{entryAction.label}</span>
          <span className="carousel-action__label carousel-action__label--compact" aria-hidden>{compactActionLabel}</span>
          {entryAction.enabled ? <ExternalLink size={16} aria-hidden /> : <Activity size={16} aria-hidden />}
        </button>
      )}
    </article>
  )
}
