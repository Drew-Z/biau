import { useRef, useEffect, useCallback, type PointerEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ColoredCard } from './ColoredCard'
import type { HeroProject } from '../data/hero'
import { getProjectCta, getProjectPublication } from '../data/projectPublication'
import { usesMobileInteractionMode } from '../utils/responsive'
import { getVisualPerformanceMode } from '../utils/visualPerformance'

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

const CAROUSEL_FRICTION = 4
const CAROUSEL_MAX_DELTA_SECONDS = 0.02
const CAROUSEL_MAX_FLICK_VELOCITY = 4200
const CAROUSEL_MIN_GLIDE_VELOCITY = 16
const CAROUSEL_WHEEL_SCALE = 2.5

export function RightScrollCards({ projects, onProjectClick, onProjectAction, onProjectStatus }: RightScrollCardsProps) {
  const wrapperRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const borderFlowRef = useRef<HTMLSpanElement>(null)
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
    const friction = CAROUSEL_FRICTION
    const minVelocity = CAROUSEL_MIN_GLIDE_VELOCITY
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
      const deltaSeconds = Math.min(CAROUSEL_MAX_DELTA_SECONDS, Math.max(0.001, (now - lastTickAt) / 1000))
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

  useEffect(() => {
    const wrapper = wrapperRef.current
    const flow = borderFlowRef.current
    if (!wrapper || !flow) return

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)')
    let raf = 0
    let stopped = false
    let lastPaint = 0
    let startedAt = 0
    let revealStartedAt = 0
    let width = 1
    let height = 1
    let radius = 8

    const readGeometry = () => {
      const rect = wrapper.getBoundingClientRect()
      const style = getComputedStyle(wrapper)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      radius = Math.max(8, Math.min(Math.min(width, height) / 2, Number.parseFloat(style.borderTopLeftRadius) || 8))
      wrapper.style.setProperty('--stellar-border-flow-radius', `${radius.toFixed(1)}px`)
    }
    const isActive = () =>
      document.documentElement.dataset.harborScene === 'stellar' &&
      !document.hidden &&
      !document.documentElement.classList.contains('harbor-intro-active') &&
      !reducedMotion.matches &&
      finePointer.matches &&
      getVisualPerformanceMode() !== 'static'
    const reset = () => {
      flow.style.opacity = '0'
      wrapper.dataset.stellarBorderFlow = 'paused'
      wrapper.style.setProperty('--stellar-border-flow-opacity', '0')
    }
    const pointAt = (progress: number) => {
      const straightX = Math.max(0, width - radius * 2)
      const straightY = Math.max(0, height - radius * 2)
      const arc = Math.PI * radius / 2
      const segmentLengths = [straightX, arc, straightY, arc, straightX, arc, straightY, arc]
      const segmentTimeScales = [1, 1, 0.8, 0.8, 1, 1, 0.8, 0.8]
      const timedLengths = segmentLengths.map((length, index) => length * segmentTimeScales[index])
      const perimeter = timedLengths.reduce((sum, length) => sum + length, 0)
      let timedDistance = ((progress % 1) + 1) % 1 * perimeter
      let segment = 0
      while (segment < timedLengths.length - 1 && timedDistance > timedLengths[segment]) {
        timedDistance -= timedLengths[segment]
        segment += 1
      }
      const distance = timedDistance / segmentTimeScales[segment]
      const ratio = segmentLengths[segment] > 0 ? distance / segmentLengths[segment] : 0
      const arcPoint = (cx: number, cy: number, start: number) => ({
        x: cx + Math.cos(start + ratio * Math.PI / 2) * radius,
        y: cy + Math.sin(start + ratio * Math.PI / 2) * radius,
      })
      switch (segment) {
        case 0: return { x: radius + distance, y: 0, vertical: false }
        case 1: return { ...arcPoint(width - radius, radius, -Math.PI / 2), vertical: false }
        case 2: return { x: width, y: radius + distance, vertical: true }
        case 3: return { ...arcPoint(width - radius, height - radius, 0), vertical: true }
        case 4: return { x: width - radius - distance, y: height, vertical: false }
        case 5: return { ...arcPoint(radius, height - radius, Math.PI / 2), vertical: false }
        case 6: return { x: 0, y: height - radius - distance, vertical: true }
        default: return { ...arcPoint(radius, radius, Math.PI), vertical: true }
      }
    }
    const tick = (now: number) => {
      raf = 0
      if (stopped || !isActive()) {
        reset()
        return
      }
      const mode = getVisualPerformanceMode()
      const fps = mode === 'full' ? 45 : 30
      if (now - lastPaint >= 1000 / fps) {
        if (!startedAt) startedAt = now
        if (!revealStartedAt && Number.parseFloat(getComputedStyle(wrapper).opacity) >= 0.95) revealStartedAt = now
        const point = pointAt((now - startedAt) / 7600)
        const revealProgress = revealStartedAt ? Math.max(0, Math.min(1, (now - revealStartedAt) / 1400)) : 0
        const reveal = revealProgress * revealProgress * (3 - 2 * revealProgress)
        const major = 88 * (point.vertical ? 1.45 : 1)
        flow.style.transform = `translate3d(${(point.x - major / 2).toFixed(1)}px, ${(point.y - 26).toFixed(1)}px, 0)`
        flow.style.width = `${major.toFixed(1)}px`
        flow.style.height = '52px'
        flow.style.opacity = String(0.9 * reveal)
        wrapper.style.setProperty('--stellar-border-flow-x', `${point.x.toFixed(1)}px`)
        wrapper.style.setProperty('--stellar-border-flow-y', `${point.y.toFixed(1)}px`)
        wrapper.style.setProperty('--stellar-border-flow-size-x', `${major.toFixed(1)}px`)
        wrapper.style.setProperty('--stellar-border-flow-size-y', '52px')
        wrapper.style.setProperty('--stellar-border-flow-opacity', (0.9 * reveal).toFixed(3))
        wrapper.dataset.stellarBorderFlow = 'running'
        wrapper.dataset.stellarBorderFlowFps = String(fps)
        lastPaint = now
      }
      raf = requestAnimationFrame(tick)
    }
    const sync = () => {
      readGeometry()
      if (!isActive()) {
        cancelAnimationFrame(raf)
        raf = 0
        reset()
        return
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const observer = new MutationObserver(sync)
    const resizeObserver = new ResizeObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-harbor-scene', 'data-performance'] })
    resizeObserver.observe(wrapper)
    document.addEventListener('visibilitychange', sync)
    reducedMotion.addEventListener('change', sync)
    finePointer.addEventListener('change', sync)
    sync()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', sync)
      reducedMotion.removeEventListener('change', sync)
      finePointer.removeEventListener('change', sync)
      reset()
    }
  }, [])

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
    const nextVelocity = velocityYRef.current + normalizedDeltaY * CAROUSEL_WHEEL_SCALE
    velocityYRef.current = Math.max(-CAROUSEL_MAX_FLICK_VELOCITY, Math.min(CAROUSEL_MAX_FLICK_VELOCITY, nextVelocity))
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
    const edgeRange = Math.max(52, Math.min(96, Math.min(rect.width, rect.height) * 0.14))
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
      const instantVelocity = ((drag.lastY - event.clientY) / elapsed) * 1000
      velocityYRef.current = velocityYRef.current * 0.6 + instantVelocity * 0.4
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
    const staleRelease = performance.now() - drag.lastTime > 80
    velocityYRef.current = staleRelease
      ? 0
      : Math.max(
          -CAROUSEL_MAX_FLICK_VELOCITY,
          Math.min(CAROUSEL_MAX_FLICK_VELOCITY, velocityYRef.current * 1.2),
        )
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
      <span ref={borderFlowRef} className="stellar-panel-border-flow" aria-hidden="true" />
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
