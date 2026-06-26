import { useState, useEffect } from 'react'
import { heroContent, type HeroPoem } from '../data/hero'
import { AnimatedText } from './AnimatedText'
import { RightScrollCards } from './RightScrollCards'
import { getGreeting, formatDateTime } from '../utils/time'

interface HeroSplitProps {
  onProjectClick: (link: string) => void
}

const POEM_ROTATE_MS = 4500

export function HeroSplit({ onProjectClick }: HeroSplitProps) {
  const { poems, projects } = heroContent

  return (
    <main className="home-hero">
      <section className="hero-intro">
        <p className="eyebrow">BIAU PORT</p>

        <HeroTitleRotator poems={poems} />

        <SystemStatus />
      </section>

      <RightScrollCards projects={projects} onProjectClick={onProjectClick} />
    </main>
  )
}

function HeroTitleRotator({ poems }: { poems: HeroPoem[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (poems.length <= 1) return
    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReducedMotion) return

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % poems.length)
    }, POEM_ROTATE_MS)
    return () => clearInterval(timer)
  }, [poems.length])

  const poem = poems[index]
  const subDelay = poem.main.length * 0.05 + 0.1

  return (
    <h2
      className="hero-title-rotator"
      aria-label={`${poem.main} ${poem.sub ?? ''}`.trim()}
    >
      <AnimatedText key={`main-${index}`} text={poem.main} />
      {poem.sub && (
        <span className="hero-subline">
          <AnimatedText key={`sub-${index}`} text={poem.sub} delay={subDelay} />
        </span>
      )}
    </h2>
  )
}

function SystemStatus() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="system-status">
      <div className="status-text">
        <span>{getGreeting()}</span>
        <strong>{formatDateTime(currentTime)}</strong>
      </div>
    </div>
  )
}
