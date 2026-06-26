import { useRef, useEffect, type PointerEvent, type WheelEvent } from 'react'
import { ColoredCard } from './ColoredCard'
import type { HeroProject } from '../data/hero'

interface RightScrollCardsProps {
  projects: HeroProject[]
  onProjectClick: (link: string) => void
}

export function RightScrollCards({ projects, onProjectClick }: RightScrollCardsProps) {
  const wrapperRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollYRef = useRef(0)
  const velocityYRef = useRef(0)
  const cycleHeightRef = useRef(1)
  const isHoveringRef = useRef(false)
  const rafRef = useRef(0)
  const tiltRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const dragRef = useRef({
    isDragging: false,
    startY: 0,
    startScroll: 0,
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
      cycleHeightRef.current = Math.max(1, track.scrollHeight / 3)
      return cycleHeightRef.current
    }

    const applyTransform = () => {
      track.style.transform = `translate3d(0, ${-scrollYRef.current}px, 0)`
      track.style.setProperty('--carousel-scroll-y', `${scrollYRef.current.toFixed(2)}px`)
    }

    const wrap = () => {
      const cycleHeight = updateCycleHeight()
      if (!hasInitialPosition) {
        scrollYRef.current = cycleHeight - 34
        hasInitialPosition = true
      }
      if (scrollYRef.current >= cycleHeight * 2) scrollYRef.current -= cycleHeight
      if (scrollYRef.current < 0) scrollYRef.current += cycleHeight
    }

    const tick = () => {
      if (!active || !track.isConnected) return
      const dragging = dragRef.current.isDragging
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

      tilt.x += (tilt.targetX - tilt.x) * 0.08
      tilt.y += (tilt.targetY - tilt.y) * 0.08
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
  }, [])

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const nextVelocity = velocityYRef.current + event.deltaY * 0.35
    velocityYRef.current = Math.max(-25, Math.min(25, nextVelocity))
  }

  const wrapScrollPosition = () => {
    const cycleHeight = cycleHeightRef.current
    if (scrollYRef.current >= cycleHeight * 2) scrollYRef.current -= cycleHeight
    if (scrollYRef.current < 0) scrollYRef.current += cycleHeight
  }

  const applyDragTransform = () => {
    const track = trackRef.current
    if (!track) return
    wrapScrollPosition()
    track.style.transform = `translate3d(0, ${-scrollYRef.current}px, 0)`
    track.style.setProperty('--carousel-scroll-y', `${scrollYRef.current.toFixed(2)}px`)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    drag.isDragging = true
    drag.clickPrevented = false
    drag.startY = event.clientY
    drag.startScroll = scrollYRef.current
    drag.lastY = event.clientY
    drag.lastTime = performance.now()
    velocityYRef.current = 0
    wrapperRef.current?.classList.add('is-dragging')
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag.isDragging) {
      const wrapper = wrapperRef.current
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      tiltRef.current.targetX = ((event.clientY - rect.top) / rect.height - 0.5) * -2.5
      tiltRef.current.targetY = ((event.clientX - rect.left) / rect.width - 0.5) * 2.5
      return
    }

    scrollYRef.current = drag.startScroll + (drag.startY - event.clientY)
    const now = performance.now()
    const elapsed = now - drag.lastTime
    if (elapsed > 0) {
      velocityYRef.current = ((drag.lastY - event.clientY) / elapsed) * 16
    }
    if (Math.abs(drag.startY - event.clientY) > 5) {
      drag.clickPrevented = true
    }
    drag.lastY = event.clientY
    drag.lastTime = now
    applyDragTransform()
  }

  const handlePointerEnd = () => {
    const drag = dragRef.current
    if (!drag.isDragging) return

    drag.isDragging = false
    velocityYRef.current = Math.max(-25, Math.min(25, velocityYRef.current))
    wrapperRef.current?.classList.remove('is-dragging')
    window.setTimeout(() => {
      drag.clickPrevented = false
    }, 0)
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
        className="carousel-viewport"
        onWheel={handleWheel}
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
