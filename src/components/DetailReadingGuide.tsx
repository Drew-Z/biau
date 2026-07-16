import { BookOpen, Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import {
  announceMobileSurfaceLayout,
  announceMobileSurfaceOpen,
  isMobileSurfaceViewport,
  MOBILE_SURFACE_OPEN_EVENT,
  type MobileSurfaceOpenDetail,
} from '../utils/mobileSurface'

export interface DetailReadingItem {
  id: string
  label: string
}

interface DetailReadingGuideProps {
  items: DetailReadingItem[]
  label?: string
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function DetailReadingGuide({ items, label = '阅读导航' }: DetailReadingGuideProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isAutoHidden, setIsAutoHidden] = useState(false)
  const lastScrollYRef = useRef(0)
  const [activeId, setActiveId] = useState(items[0]?.id ?? '')
  const [progress, setProgress] = useState(0)
  const activeItem = useMemo(() => items.find((item) => item.id === activeId) ?? items[0], [activeId, items])

  useEffect(() => {
    announceMobileSurfaceLayout()
    return () => {
      window.requestAnimationFrame(announceMobileSurfaceLayout)
    }
  }, [])

  useEffect(() => {
    const handleSurfaceOpen = (event: Event) => {
      const detail = (event as CustomEvent<MobileSurfaceOpenDetail>).detail
      if (isMobileSurfaceViewport() && detail?.surface === 'public-assistant') setIsOpen(false)
    }
    window.addEventListener(MOBILE_SURFACE_OPEN_EVENT, handleSurfaceOpen)
    return () => window.removeEventListener(MOBILE_SURFACE_OPEN_EVENT, handleSurfaceOpen)
  }, [])

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const documentHeight = document.documentElement.scrollHeight
      const maxScroll = Math.max(documentHeight - window.innerHeight, 0)
      const currentScrollY = window.scrollY
      const scrollDelta = currentScrollY - lastScrollYRef.current
      setProgress(clampProgress(maxScroll === 0 ? 100 : (currentScrollY / maxScroll) * 100))

      if (window.innerWidth > 720 || currentScrollY <= 120 || isOpen) {
        setIsAutoHidden(false)
      } else if (scrollDelta >= 10) {
        setIsAutoHidden(true)
      } else if (scrollDelta <= -10) {
        setIsAutoHidden(false)
      }
      lastScrollYRef.current = currentScrollY

      const readingAnchor = Math.min(240, Math.max(120, window.innerHeight * 0.28))
      let nextActiveId = items[0]?.id ?? ''
      for (const item of items) {
        const target = document.getElementById(item.id)
        if (!target) continue
        if (target.getBoundingClientRect().top <= readingAnchor) nextActiveId = item.id
        else break
      }
      setActiveId(nextActiveId)
    }

    const scheduleMeasure = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(measure)
    }

    scheduleMeasure()
    window.addEventListener('scroll', scheduleMeasure, { passive: true })
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      window.removeEventListener('scroll', scheduleMeasure)
      window.removeEventListener('resize', scheduleMeasure)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [isOpen, items])

  useEffect(() => {
    if (!isOpen) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current
      if (!root) return
      const stickyOffset = window.innerWidth <= 720 ? 8 : 12
      const targetTop = window.scrollY + root.getBoundingClientRect().top - stickyOffset
      const shouldAlignImmediately = reduceMotion || window.innerWidth <= 720
      window.scrollTo({ top: targetTop, behavior: shouldAlignImmediately ? 'auto' : 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      toggleRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (items.length === 0) return null

  const handleNavigate = (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setIsOpen(false)
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }, 0)
  }

  return (
    <aside
      ref={rootRef}
      className={`detail-reading-guide ${isOpen ? 'is-open' : ''} ${isAutoHidden ? 'is-auto-hidden' : ''}`}
      aria-label={label}
      data-active-section={activeItem?.id ?? ''}
    >
      <div className="detail-reading-guide__shell">
        <button
          ref={toggleRef}
          type="button"
          className="detail-reading-guide__toggle"
          aria-expanded={isOpen}
          aria-controls="detail-reading-outline"
          onClick={() => {
            setIsAutoHidden(false)
            if (!isOpen) announceMobileSurfaceOpen('detail-reading-guide')
            setIsOpen(!isOpen)
          }}
        >
          <BookOpen size={18} aria-hidden />
          <span className="detail-reading-guide__copy">
            <span className="detail-reading-guide__eyebrow">{label}</span>
            <span className="detail-reading-guide__current">{activeItem?.label}</span>
          </span>
          <span className="detail-reading-guide__percent">{progress}%</span>
          <ChevronDown className="detail-reading-guide__chevron" size={18} aria-hidden />
        </button>

        <div
          className="detail-reading-guide__progress"
          role="progressbar"
          aria-label="全文阅读进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>

        <nav
          id="detail-reading-outline"
          className="detail-reading-guide__outline"
          aria-label="本文目录"
          hidden={!isOpen}
        >
          <div className="detail-reading-guide__outline-head">
            <strong>本文目录</strong>
            <span>{items.length} 个章节</span>
          </div>
          <ol>
            {items.map((item, index) => {
              const isActive = item.id === activeItem?.id
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={isActive ? 'is-active' : undefined}
                    aria-current={isActive ? 'location' : undefined}
                    onClick={(event) => handleNavigate(event, item.id)}
                  >
                    <span className="detail-reading-guide__index">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item.label}</span>
                    {isActive && <Check size={15} aria-hidden />}
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>
      </div>
    </aside>
  )
}
