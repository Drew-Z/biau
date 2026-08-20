import { useRef, useEffect, useCallback, type PointerEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ColoredCard } from './ColoredCard'
import type { HeroProject } from '../data/hero'
import { getProjectCta, getProjectPublication } from '../data/projectPublication'
import { usesMobileInteractionMode } from '../utils/responsive'

interface RightScrollCardsProps {
  projects: HeroProject[]
  onProjectClick: (link: string) => void
  onProjectAction: (link: string) => void
  onProjectStatus: (link: string) => void
}

const carouselMotionAllowed = () =>
  !document.hidden &&
  !document.documentElement.classList.contains('harbor-intro-active') &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function RightScrollCards({ projects, onProjectClick, onProjectAction, onProjectStatus }: RightScrollCardsProps) {
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
    const autoSpeed = 18
    const friction = 4
    const minVelocity = 8
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lastTickAt = performance.now()

    if (usesMobileInteractionMode()) {
      scrollYRef.current = 0
      velocityYRef.current = 0
      track.style.transform = ''
      track.style.removeProperty('--carousel-scroll-y')
      wrapper.style.removeProperty('--carousel-tilt-x')
      wrapper.style.removeProperty('--carousel-tilt-y')
      wrapper.classList.remove('is-dragging')
      return () => {
        wrapper.classList.remove('is-dragging')
      }
    }

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

    const tick = (now: number) => {
      rafRef.current = 0
      if (!active || !track.isConnected || !carouselMotionAllowed()) return
      const deltaSeconds = Math.min(0.05, Math.max(0.001, (now - lastTickAt) / 1000))
      lastTickAt = now
      const dragging = dragRef.current.isDragging || dragRef.current.isPointerDown
      const tilt = tiltRef.current

      const velocity = velocityYRef.current
      if (!dragging && !isHoveringRef.current && Math.abs(velocity) < 0.5 && !reducedMotion.matches) {
        scrollYRef.current += autoSpeed * deltaSeconds
      }

      if (!dragging && Math.abs(velocityYRef.current) > minVelocity) {
        scrollYRef.current += velocityYRef.current * deltaSeconds
        velocityYRef.current *= Math.exp(-friction * deltaSeconds)
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

    const resetReducedMotion = () => {
      scrollYRef.current = 0
      velocityYRef.current = 0
      lastTickAt = performance.now()
      hasInitialPosition = false
      tiltRef.current = { x: 0, y: 0, targetX: 0, targetY: 0 }
      track.style.transform = ''
      track.style.removeProperty('--carousel-scroll-y')
      wrapper.style.setProperty('--carousel-tilt-x', '0deg')
      wrapper.style.setProperty('--carousel-tilt-y', '0deg')
      wrapper.style.setProperty('--harbor-surface-glow-opacity', '0')
      wrapper.classList.remove('is-dragging')
    }
    const syncMotion = () => {
      if (!carouselMotionAllowed()) {
        if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
        velocityYRef.current = 0
        dragRef.current.isPointerDown = false
        dragRef.current.isDragging = false
        dragRef.current.pointerId = -1
        tiltRef.current.targetX = 0
        tiltRef.current.targetY = 0
        wrapper.classList.remove('is-dragging')
        wrapper.style.setProperty('--harbor-surface-glow-opacity', '0')
        if (reducedMotion.matches) resetReducedMotion()
        return
      }
      if (!rafRef.current) {
        lastTickAt = performance.now()
        rafRef.current = window.requestAnimationFrame(tick)
      }
    }
    const observer = new MutationObserver(syncMotion)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    document.addEventListener('visibilitychange', syncMotion)
    reducedMotion.addEventListener('change', syncMotion)
    syncMotion()
    return () => {
      active = false
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncMotion)
      reducedMotion.removeEventListener('change', syncMotion)
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
      if (usesMobileInteractionMode() || !carouselMotionAllowed()) return
      event.preventDefault()
      applyWheelDelta(event.deltaY, event.deltaMode)
    }

    viewport.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleNativeWheel)
  }, [applyWheelDelta])

  const handlePanelPointerMove = (event: PointerEvent<HTMLElement>) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    if (
      usesMobileInteractionMode() ||
      !carouselMotionAllowed() ||
      document.documentElement.dataset.harborScene !== 'stellar'
    ) {
      wrapper.style.setProperty('--harbor-surface-glow-opacity', '0')
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    const edgeDistance = Math.min(x, y, rect.width - x, rect.height - y)
    const edgeRange = Math.max(48, Math.min(96, Math.min(rect.width, rect.height) * 0.16))
    const opacity = Math.max(0, Math.min(1, 1 - edgeDistance / edgeRange))
    wrapper.style.setProperty('--harbor-surface-glow-x', `${x.toFixed(1)}px`)
    wrapper.style.setProperty('--harbor-surface-glow-y', `${y.toFixed(1)}px`)
    wrapper.style.setProperty('--harbor-surface-glow-opacity', opacity.toFixed(3))
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (usesMobileInteractionMode() || !carouselMotionAllowed()) return
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
    if (usesMobileInteractionMode() || !carouselMotionAllowed()) return
    const drag = dragRef.current
    const wrapper = wrapperRef.current
    if (!drag.isPointerDown) {
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      const scene = document.documentElement.dataset.harborScene
      const tiltStrength = scene === 'garden' ? 0.9 : scene === 'stellar' ? 2.6 : 2.1
      tiltRef.current.targetX = ((event.clientY - rect.top) / rect.height - 0.5) * -tiltStrength
      tiltRef.current.targetY = ((event.clientX - rect.left) / rect.width - 0.5) * tiltStrength
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
    const dragTiltLimit = document.documentElement.dataset.harborScene === 'garden' ? 1.4 : 3.2
    tiltRef.current.targetX = Math.max(-dragTiltLimit, Math.min(dragTiltLimit, dy * -0.018))
    tiltRef.current.targetY = Math.max(-dragTiltLimit, Math.min(dragTiltLimit, dx * 0.018))
    if (distance > 5) {
      drag.clickPrevented = true
    }
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastTime = now
    applyDragTransform()
  }

  const handlePointerEnd = (event?: PointerEvent<HTMLDivElement>) => {
    if (usesMobileInteractionMode()) return
    const drag = dragRef.current
    if (!drag.isPointerDown) return

    const wasDragging = drag.isDragging
    drag.isPointerDown = false
    drag.isDragging = false
    drag.pointerId = -1
    velocityYRef.current = Math.max(-1200, Math.min(1200, velocityYRef.current))
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
      data-cinema="panel"
      onPointerMove={handlePanelPointerMove}
      onMouseEnter={() => {
        isHoveringRef.current = true
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false
        tiltRef.current.targetX = 0
        tiltRef.current.targetY = 0
        wrapperRef.current?.style.setProperty('--harbor-surface-glow-opacity', '0')
      }}
    >
      <span className="harbor-surface-glow" aria-hidden="true" />
      <svg
        className="harbor-panel-border-flow"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="3" pathLength="1" />
      </svg>
      <div className="panel-head">
        <div className="panel-head__copy">
          <p>IN PORT / 当前泊岸</p>
          <span>项目状态与访问边界</span>
        </div>
        <strong>{String(projects.length).padStart(2, '0')} 项</strong>
      </div>

      <div
        ref={viewportRef}
        className="carousel-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label="浏览 IN PORT 项目"
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
          {loopedProjects.map((project, index) => {
            const entryAction = getProjectCta(getProjectPublication(project.id))
            return (
              <ColoredCard
                key={`${project.id}-${index}`}
                project={project}
                index={index}
                projectCount={projects.length}
                entryAction={entryAction}
                loopCopy={index >= projects.length}
                onClick={() => onProjectClick(project.detailLink)}
                onActionClick={() =>
                  entryAction.enabled ? onProjectAction(entryAction.href) : onProjectStatus(entryAction.href)
                }
              />
            )
          })}
        </div>
      </div>
      <Link
        className="panel-footer"
        to="/projects"
      >
        <span>查看全部项目</span>
        <ArrowRight size={16} aria-hidden />
      </Link>
    </section>
  )
}
