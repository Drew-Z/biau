import { useRef, useEffect, useCallback, type PointerEvent } from 'react'
import { ColoredCard } from './ColoredCard'
import type { HeroProject } from '../data/hero'

interface RightScrollCardsProps {
  projects: HeroProject[]
  onProjectClick: (link: string) => void
}

export function RightScrollCards({ projects, onProjectClick }: RightScrollCardsProps) {
  const wrapperRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollYRef = useRef(0)
  const velocityYRef = useRef(0)
  const cycleHeightRef = useRef(1)
  const isHoveringRef = useRef(false)
  const rafRef = useRef(0)
  const tiltRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const dragRef = useRef({
    isPointerDown: false,
    isDragging: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScroll: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    clickPrevented: false,
  })

  useEffect(() => {
    const wrapper = wrapperRef.current
    const track = trackRef.current
    if (!wrapper || !track) return

    let active = true
    let hasInitialPosition = false
    const autoSpeed = 0.3
    const friction = 0.92
    const minVelocity = 0.15
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updateCycleHeight = () => {
      const firstCard = track.querySelector<HTMLElement>('.carousel-card')
      const styles = window.getComputedStyle(track)
      const gap = Number.parseFloat(styles.rowGap || styles.gap || '0') || 0
      const cardHeight = firstCard?.getBoundingClientRect().height || 0
      const measuredCycle = projects.length > 0 ? (cardHeight + gap) * projects.length : 0
      cycleHeightRef.current = Math.max(1, measuredCycle || track.scrollHeight / 3)
      return cycleHeightRef.current
    }

    const applyTransform = () => {
      track.style.transform = `translate3d(0, ${-scrollYRef.current}px, 0)`
      track.style.setProperty('--carousel-scroll-y', `${scrollYRef.current.toFixed(2)}px`)
    }

    const wrap = () => {
      const cycleHeight = updateCycleHeight()
      if (!hasInitialPosition) {
        scrollYRef.current = cycleHeight
        hasInitialPosition = true
      }
      if (scrollYRef.current >= cycleHeight * 2) scrollYRef.current -= cycleHeight
      if (scrollYRef.current < 0) scrollYRef.current += cycleHeight
    }

    const tick = () => {
      if (!active || !track.isConnected) return
      const dragging = dragRef.current.isDragging || dragRef.current.isPointerDown
      const tilt = tiltRef.current

      const velocity = velocityYRef.current
      if (!dragging && !isHoveringRef.current && Math.abs(velocity) < 0.5 && !reducedMotion.matches) {
        scrollYRef.current += autoSpeed
      }

      if (!dragging && Math.abs(velocityYRef.current) > minVelocity) {
        scrollYRef.current += velocityYRef.current
        velocityYRef.current *= friction
      } else {
        velocityYRef.current = 0
      }

      tilt.x += (tilt.targetX - tilt.x) * 0.09
      tilt.y += (tilt.targetY - tilt.y) * 0.09
      wrapper.style.setProperty('--carousel-tilt-x', `${tilt.x.toFixed(3)}deg`)
      wrapper.style.setProperty('--carousel-tilt-y', `${tilt.y.toFixed(3)}deg`)

      wrap()
      applyTransform()
      rafRef.current = window.requestAnimationFrame(tick)
    }

    rafRef.current = window.requestAnimationFrame(tick)
    return () => {
      active = false
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      wrapper.classList.remove('is-dragging')
    }
  }, [projects.length])

  const wrapScrollPosition = useCallback(() => {
    const cycleHeight = cycleHeightRef.current
    if (scrollYRef.current >= cycleHeight * 2) scrollYRef.current -= cycleHeight
    if (scrollYRef.current < 0) scrollYRef.current += cycleHeight
  }, [])

  const applyDragTransform = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    wrapScrollPosition()
    track.style.transform = `translate3d(0, ${-scrollYRef.current}px, 0)`
    track.style.setProperty('--carousel-scroll-y', `${scrollYRef.current.toFixed(2)}px`)
  }, [wrapScrollPosition])

  const applyWheelDelta = useCallback((deltaY: number, deltaMode: number) => {
    const deltaUnit = deltaMode === 1 ? 16 : deltaMode === 2 ? 96 : 1
    const normalizedDeltaY = deltaY * deltaUnit
    const immediateStep = Math.max(-42, Math.min(42, normalizedDeltaY * 0.18))
    scrollYRef.current += immediateStep
    const nextVelocity = velocityYRef.current + normalizedDeltaY * 0.12
    velocityYRef.current = Math.max(-22, Math.min(22, nextVelocity))
    applyDragTransform()
  }, [applyDragTransform])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault()
      applyWheelDelta(event.deltaY, event.deltaMode)
    }

    viewport.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleNativeWheel)
  }, [applyWheelDelta])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const drag = dragRef.current
    drag.isPointerDown = true
    drag.isDragging = false
    drag.pointerId = event.pointerId
    drag.clickPrevented = false
    drag.startX = event.clientX
    drag.startY = event.clientY
    drag.startScroll = scrollYRef.current
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastTime = performance.now()
    velocityYRef.current = 0
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag.isPointerDown) {
      const wrapper = wrapperRef.current
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      tiltRef.current.targetX = ((event.clientY - rect.top) / rect.height - 0.5) * -2.2
      tiltRef.current.targetY = ((event.clientX - rect.left) / rect.width - 0.5) * 2.2
      return
    }

    if (drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = drag.startY - event.clientY
    const distance = Math.hypot(dx, drag.startY - event.clientY)
    if (distance <= 5 && !drag.isDragging) return

    if (!drag.isDragging) {
      drag.isDragging = true
      drag.clickPrevented = true
      wrapperRef.current?.classList.add('is-dragging')
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }
    event.preventDefault()

    scrollYRef.current = drag.startScroll + dy
    const now = performance.now()
    const elapsed = now - drag.lastTime
    if (elapsed > 0) {
      velocityYRef.current = ((drag.lastY - event.clientY) / elapsed) * 16
    }
    tiltRef.current.targetX = Math.max(-3.2, Math.min(3.2, dy * -0.018))
    tiltRef.current.targetY = Math.max(-3.2, Math.min(3.2, dx * 0.018))
    if (distance > 5) {
      drag.clickPrevented = true
    }
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastTime = now
    applyDragTransform()
  }

  const handlePointerEnd = (event?: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag.isPointerDown) return

    const wasDragging = drag.isDragging
    drag.isPointerDown = false
    drag.isDragging = false
    drag.pointerId = -1
    velocityYRef.current = Math.max(-25, Math.min(25, velocityYRef.current))
    tiltRef.current.targetX = 0
    tiltRef.current.targetY = 0
    wrapperRef.current?.classList.remove('is-dragging')
    if (event?.pointerId != null && wasDragging) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    if (wasDragging) {
      window.setTimeout(() => {
        drag.clickPrevented = false
      }, 60)
    } else {
      drag.clickPrevented = false
    }
  }

  const loopedProjects = [...projects, ...projects, ...projects]

  return (
    <section
      ref={wrapperRef}
      className="hero-panel carousel-wrapper"
      onMouseEnter={() => {
        isHoveringRef.current = true
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false
        tiltRef.current.targetX = 0
        tiltRef.current.targetY = 0
      }}
    >
      <div className="panel-head">
        <p>IN PORT</p>
        <span>{projects.length} 个项目</span>
      </div>

      <div
        ref={viewportRef}
        className="carousel-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label="滚轮浏览 IN PORT 项目"
      >
        <div
          ref={trackRef}
          className="carousel-track"
          onClickCapture={(event) => {
            if (!dragRef.current.clickPrevented) return
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          {loopedProjects.map((project, index) => (
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
