import { useState, useEffect, useRef, useCallback, type PointerEvent } from 'react'
import { heroContent, type HeroPoem } from '../data/hero'
import { AnimatedText } from './AnimatedText'
import { RightScrollCards } from './RightScrollCards'
import { usesMobileInteractionMode } from '../utils/responsive'
import { getGreeting, formatDateTime } from '../utils/time'

interface HeroSplitProps {
  onProjectClick: (link: string) => void
  onProjectAction: (link: string) => void
}

const POEM_ROTATE_MS = 6300
const TITLE_SWITCH_DISTANCE = 120
const TOUCH_TITLE_SWITCH_DISTANCE = 58
const TOUCH_HORIZONTAL_BIAS = 1.18

export function HeroSplit({ onProjectClick, onProjectAction }: HeroSplitProps) {
  const { poems, projects } = heroContent

  return (
    <main className="home-hero">
      <section className="hero-intro">
        <h1 className="eyebrow">BIAU PORT</h1>

        <HeroTitleRotator poems={poems} />

        <SystemStatus />
      </section>

      <RightScrollCards projects={projects} onProjectClick={onProjectClick} onProjectAction={onProjectAction} />
    </main>
  )
}

function HeroTitleRotator({ poems }: { poems: HeroPoem[] }) {
  const [index, setIndex] = useState(0)
  const [ghostPoem, setGhostPoem] = useState<HeroPoem | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const pausedRef = useRef(false)
  const indexRef = useRef(0)
  const ghostTimerRef = useRef(0)
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastDx: 0,
    lastDy: 0,
    lastDistance: 0,
    lastMoveAt: 0,
    lastVelocityX: 0,
    lastVelocityY: 0,
    dragging: false,
    isTouch: false,
    suppressClick: false,
  })

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(
    () => () => {
      window.clearTimeout(ghostTimerRef.current)
    },
    [],
  )

  const advancePoem = useCallback(() => {
    if (poems.length <= 1) return
    setGhostPoem(poems[indexRef.current] ?? null)
    window.clearTimeout(ghostTimerRef.current)
    setIndex((prev) => {
      const next = (prev + 1) % poems.length
      indexRef.current = next
      return next
    })
    ghostTimerRef.current = window.setTimeout(() => setGhostPoem(null), 760)
  }, [poems])

  useEffect(() => {
    if (poems.length <= 1) return
    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReducedMotion) return

    const timer = window.setInterval(() => {
      if (pausedRef.current) return
      if (document.documentElement.classList.contains('harbor-intro-active')) return
      advancePoem()
    }, POEM_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [advancePoem, poems.length])

  const poem = poems[index]
  const subDelay = poem.main.length * 0.032 + 0.08

  const releaseTitle = () => {
    const title = titleRef.current
    const drag = dragRef.current
    if (!title || drag.pointerId < 0) return

    const wasDragging = drag.dragging
    const releaseDx = drag.lastDx
    const releaseDy = drag.lastDy
    const releaseDistance = drag.lastDistance
    const unitX = releaseDistance ? releaseDx / releaseDistance : 0
    const unitY = releaseDistance ? releaseDy / releaseDistance : 0
    drag.pointerId = -1
    drag.dragging = false
    title.classList.remove('is-hero-title-dragging')
    const sampledSpeed = Math.hypot(drag.lastVelocityX, drag.lastVelocityY)
    const distanceSpeed = Math.min(1050, drag.lastDistance * 5.2)
    const releaseSpeed = Math.max(sampledSpeed, distanceSpeed)
    const switchDistance = drag.isTouch ? TOUCH_TITLE_SWITCH_DISTANCE : TITLE_SWITCH_DISTANCE
    const shouldSwitch = wasDragging && releaseDistance >= switchDistance
    const strength = Math.max(
      0.74,
      Math.min(1.55, Math.max(0.74 + (releaseDistance - switchDistance) / 120, 0.72 + releaseSpeed / 1050)),
    )
    const exitDistance = shouldSwitch ? 78 + strength * 58 + Math.min(1, releaseSpeed / 1200) * 68 : 0
    const entryDistance = shouldSwitch ? 42 + strength * 38 : 0

    title.style.setProperty('--hero-title-exit-x', `${(-unitX * exitDistance).toFixed(2)}px`)
    title.style.setProperty('--hero-title-exit-y', `${(-unitY * exitDistance).toFixed(2)}px`)
    title.style.setProperty('--hero-title-enter-x', `${(unitX * entryDistance).toFixed(2)}px`)
    title.style.setProperty('--hero-title-enter-y', `${(unitY * entryDistance).toFixed(2)}px`)

    title.classList.toggle('is-hero-title-switching', shouldSwitch)
    title.dataset.heroElasticDragged = wasDragging ? '1' : '0'
    title.style.transition = shouldSwitch
      ? 'transform 820ms cubic-bezier(0.18, 1.18, 0.24, 1)'
      : 'transform 620ms cubic-bezier(0.16, 1, 0.3, 1)'
    title.style.transform = ''
    pausedRef.current = false
    if (shouldSwitch && poems.length > 1) {
      advancePoem()
    }
    if (wasDragging) {
      drag.suppressClick = true
      window.setTimeout(() => {
        drag.suppressClick = false
      }, 180)
    }
    window.setTimeout(() => {
      if (!title.isConnected) return
      title.style.transition = ''
      title.classList.remove('is-hero-title-switching')
      title.dataset.heroElasticDragged = '0'
      title.style.removeProperty('--hero-title-exit-x')
      title.style.removeProperty('--hero-title-exit-y')
      title.style.removeProperty('--hero-title-enter-x')
      title.style.removeProperty('--hero-title-enter-y')
    }, 840)
  }

  const handlePointerDown = (event: PointerEvent<HTMLHeadingElement>) => {
    if (event.button !== 0) return
    const title = titleRef.current
    if (!title) return
    const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen'

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastDx: 0,
      lastDy: 0,
      lastDistance: 0,
      lastMoveAt: performance.now(),
      lastVelocityX: 0,
      lastVelocityY: 0,
      dragging: false,
      isTouch,
      suppressClick: false,
    }
    pausedRef.current = true
    title.dataset.heroElasticDragged = '0'
    title.style.animation = 'none'
    title.style.opacity = '1'
    title.style.transition = ''
    if (!isTouch) {
      title.setPointerCapture?.(event.pointerId)
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLHeadingElement>) => {
    const title = titleRef.current
    const drag = dragRef.current
    if (!title || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    const distance = Math.hypot(dx, dy)
    const now = performance.now()
    const elapsed = Math.max(16, now - drag.lastMoveAt)
    drag.lastVelocityX = ((dx - drag.lastDx) / elapsed) * 1000
    drag.lastVelocityY = ((dy - drag.lastDy) / elapsed) * 1000
    drag.lastMoveAt = now
    drag.lastDx = dx
    drag.lastDy = dy
    drag.lastDistance = distance
    if (distance < 5 && !drag.dragging) return
    if (drag.isTouch && !drag.dragging) {
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      if (absY > absX * TOUCH_HORIZONTAL_BIAS) {
        drag.pointerId = -1
        drag.dragging = false
        pausedRef.current = false
        title.dataset.heroElasticDragged = '0'
        title.style.animation = ''
        title.style.transition = ''
        title.style.transform = ''
        title.classList.remove('is-hero-title-dragging')
        return
      }
      if (absX < absY * TOUCH_HORIZONTAL_BIAS || absX < 18) return
    }

    event.preventDefault()
    drag.dragging = true
    title.dataset.heroElasticDragged = '1'
    title.classList.add('is-hero-title-dragging')
    title.setPointerCapture?.(event.pointerId)

    const pull = Math.min(74, distance * 0.44)
    const unitX = distance ? dx / distance : 0
    const unitY = distance ? dy / distance : 0
    const tension = pull / 74
    const scaleX = 1 + 0.035 + tension * 0.075
    const scaleY = 1 - 0.018 - tension * 0.04
    const skewX = Math.max(-4.5, Math.min(4.5, dx * 0.035))
    const skewY = Math.max(-2.2, Math.min(2.2, dy * -0.018))

    title.style.transform = `translate3d(${(unitX * pull).toFixed(2)}px, ${(unitY * pull).toFixed(2)}px, 0) skew(${skewX.toFixed(2)}deg, ${skewY.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`
  }

  const handleTitleClick = () => {
    const drag = dragRef.current
    if (drag.suppressClick || !usesMobileInteractionMode()) return
    advancePoem()
  }

  return (
    <h2
      ref={titleRef}
      className={`hero-title-rotator ${ghostPoem ? 'has-hero-title-ghost' : ''}`}
      data-ghost-main={ghostPoem?.main ?? ''}
      data-ghost-sub={ghostPoem?.sub ?? ''}
      aria-label={`${poem.main} ${poem.sub ?? ''}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releaseTitle}
      onPointerCancel={releaseTitle}
      onLostPointerCapture={releaseTitle}
      onClick={handleTitleClick}
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
