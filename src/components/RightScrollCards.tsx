import { useRef, useState, useEffect } from 'react'
import { ColoredCard } from './ColoredCard'
import type { HeroProject } from '../data/hero'

interface RightScrollCardsProps {
  projects: HeroProject[]
  onProjectClick: (link: string) => void
}

export function RightScrollCards({ projects, onProjectClick }: RightScrollCardsProps) {
  const [isPaused, setIsPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.style.animationPlayState = isPaused ? 'paused' : 'running'
  }, [isPaused])

  const doubledProjects = [...projects, ...projects]

  return (
    <section className="hero-panel carousel-wrapper">
      <div className="panel-head">
        <p>IN PORT</p>
        <span>{projects.length} 个项目</span>
      </div>

      <div className="carousel-viewport">
        <div
          ref={trackRef}
          className="carousel-track"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {doubledProjects.map((project, index) => (
            <ColoredCard
              key={`${project.id}-${index}`}
              project={project}
              index={index}
              onClick={() => onProjectClick(project.link)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
