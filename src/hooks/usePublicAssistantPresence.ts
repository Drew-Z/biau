import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { DEFAULT_ASSISTANT_PRESENCE, readPublicAssistantPresence, writePublicAssistantPresence, type PublicAssistantPresence } from '../utils/publicAssistantPresence'

function viewportBounds() {
  const width = typeof window === 'undefined' ? 1440 : window.innerWidth
  const height = typeof window === 'undefined' ? 900 : window.innerHeight
  const mobile = width <= 768
  const size = mobile ? 72 : 96
  const gap = mobile ? 16 : Math.min(32, Math.max(16, width * 0.03))
  const tabbar = typeof document === 'undefined' ? 72 : Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-tabbar-clearance')) || 72
  const navigationBottom = typeof document === 'undefined' ? 84 : document.querySelector('.navigation-top')?.getBoundingClientRect().bottom ?? 84
  const minY = Math.min(Math.max(96, navigationBottom + 12), Math.max(0, height - size))
  const maxY = Math.max(minY, height - size - (mobile ? tabbar + 12 : gap))
  return { width, height, mobile, size, gap, minY, maxY }
}

/** Presentation preferences only; never owns chat or request state. */
export function usePublicAssistantPresence(triggerRef: RefObject<HTMLButtonElement | null>) {
  const [preference, setPreference] = useState(readPublicAssistantPresence)
  const [bounds, setBounds] = useState(viewportBounds)
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const x = dragPoint?.x ?? (preference.side === 'left' ? bounds.gap : bounds.width - bounds.gap - bounds.size)
  const y = dragPoint?.y ?? bounds.minY + preference.height * (bounds.maxY - bounds.minY)

  useEffect(() => {
    const resize = () => {
      if (drag.current?.moved) suppressClick.current = true
      drag.current = null
      setDragPoint(null)
      setBounds(viewportBounds())
    }
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    const navigation = document.querySelector('.navigation-top')
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    if (navigation) observer?.observe(navigation)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('resize', resize)
    }
  }, [])

  function update(next: PublicAssistantPresence) {
    setPreference(next)
    writePublicAssistantPresence(next)
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    drag.current = null
    suppressClick.current = active.moved
    if (active.moved && !cancelled) {
      const nextY = Math.min(bounds.maxY, Math.max(bounds.minY, active.y + event.clientY - active.startY))
      update({ ...preference, side: event.clientX < bounds.width / 2 ? 'left' : 'right', height: (nextY - bounds.minY) / Math.max(1, bounds.maxY - bounds.minY) })
    }
    setDragPoint(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return {
    preference, bounds, x, y, dragging: dragPoint !== null,
    dock: (side: PublicAssistantPresence['side']) => update({ ...preference, side }),
    reset: () => update({ ...DEFAULT_ASSISTANT_PRESENCE }),
    setHidden: (hidden: boolean) => update({ ...preference, hidden }),
    consumeDragClick: () => { const suppressed = suppressClick.current; suppressClick.current = false; return suppressed },
    pointer: {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        suppressClick.current = false
        if (bounds.mobile || event.button !== 0 || !event.isPrimary) return
        drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const active = drag.current
        if (!active || active.pointerId !== event.pointerId) return
        const dx = event.clientX - active.startX
        const dy = event.clientY - active.startY
        if (!active.moved && Math.hypot(dx, dy) <= 6) return
        active.moved = true
        setDragPoint({ x: Math.min(bounds.width - bounds.size - bounds.gap, Math.max(bounds.gap, active.x + dx)), y: Math.min(bounds.maxY, Math.max(bounds.minY, active.y + dy)) })
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finishDrag(event),
      onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => finishDrag(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => finishDrag(event, true),
      onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
        if (event.key !== 'Escape' || !drag.current) return
        event.preventDefault()
        event.stopPropagation()
        const pointerId = drag.current.pointerId
        suppressClick.current = true
        drag.current = null
        if (event.currentTarget.hasPointerCapture(pointerId)) event.currentTarget.releasePointerCapture(pointerId)
        setDragPoint(null)
        triggerRef.current?.focus({ preventScroll: true })
      },
    },
  }
}
