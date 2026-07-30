import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { MOBILE_SURFACE_LAYOUT_EVENT } from '../utils/mobileSurface'

export function usePublicAssistantCollision(
  rootRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
) {
  const frameRef = useRef(0)

  const applyOffset = useCallback((nextOffset: number) => {
    const normalizedOffset = Math.max(0, Math.ceil(nextOffset))
    const root = rootRef.current
    root?.style.setProperty('--public-assistant-collision-offset', `${normalizedOffset}px`)
    if (root) root.dataset.collisionOffset = String(normalizedOffset)
  }, [rootRef])

  const clearOffset = useCallback(() => applyOffset(0), [applyOffset])

  useEffect(() => {
    const measureCollision = () => {
      frameRef.current = 0
      const root = rootRef.current
      const trigger = root?.querySelector<HTMLElement>('.public-assistant__trigger')
      const guide = document.querySelector<HTMLElement>('.detail-reading-guide__toggle')
      const isMobileDetail = window.matchMedia('(max-width: 720px)').matches && Boolean(document.querySelector('.app.page-detail'))
      if (!root || !trigger || !guide || !isMobileDetail || isOpen) {
        applyOffset(0)
        return
      }

      const triggerRect = trigger.getBoundingClientRect()
      const guideRect = guide.getBoundingClientRect()
      const transform = window.getComputedStyle(root).transform
      const translateY = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
      const baseTop = triggerRect.top - translateY
      const baseBottom = triggerRect.bottom - translateY
      const overlapsHorizontally = triggerRect.left < guideRect.right && triggerRect.right > guideRect.left
      const overlapsVertically = baseTop < guideRect.bottom && baseBottom > guideRect.top
      applyOffset(overlapsHorizontally && overlapsVertically ? baseBottom - guideRect.top + 8 : 0)
    }

    const scheduleMeasure = () => {
      if (frameRef.current !== 0) return
      frameRef.current = window.requestAnimationFrame(measureCollision)
    }

    scheduleMeasure()
    window.addEventListener('scroll', scheduleMeasure, { passive: true })
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('load', scheduleMeasure)
    window.addEventListener(MOBILE_SURFACE_LAYOUT_EVENT, scheduleMeasure)
    return () => {
      window.removeEventListener('scroll', scheduleMeasure)
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('load', scheduleMeasure)
      window.removeEventListener(MOBILE_SURFACE_LAYOUT_EVENT, scheduleMeasure)
      if (frameRef.current !== 0) window.cancelAnimationFrame(frameRef.current)
    }
  }, [applyOffset, isOpen, rootRef])

  return clearOffset
}
