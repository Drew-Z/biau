import type { HeroProject } from '../data/hero'
import { ExternalLink } from 'lucide-react'
import type { KeyboardEvent } from 'react'

interface ColoredCardProps {
  project: HeroProject
  index: number
  loopCopy?: boolean
  onClick: () => void
  onActionClick?: () => void
}

export function ColoredCard({ project, index, loopCopy = false, onClick, onActionClick }: ColoredCardProps) {
  const number = String((index % 5) + 1).padStart(2, '0')
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
      {project.externalLink && onActionClick && (
        <button
          className="carousel-action"
          type="button"
          aria-label={`打开外部项目页面：${project.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onActionClick()
          }}
          onKeyDown={(event) => {
            event.stopPropagation()
          }}
        >
          <span>{project.action}</span>
          <ExternalLink size={16} aria-hidden />
        </button>
      )}
    </article>
  )
}
