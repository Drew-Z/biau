import { useEffect, useState } from 'react'
import { ChevronDown, MapPinned } from 'lucide-react'

const statusSections = [
  { id: 'status-overview', label: '总体状态', shortLabel: '总体' },
  { id: 'status-summary', label: '状态统计', shortLabel: '统计' },
  { id: 'status-layers', label: '可靠性分层', shortLabel: '分层' },
  { id: 'status-manual', label: '人工待办', shortLabel: '待办' },
  { id: 'status-targets', label: '入口检测', shortLabel: '入口' },
  { id: 'status-projects', label: '项目可靠性', shortLabel: '项目' },
] as const

type StatusSectionId = (typeof statusSections)[number]['id']

export function StatusSectionNavigator() {
  const [currentSection, setCurrentSection] = useState<StatusSectionId>('status-overview')

  useEffect(() => {
    let frame = 0
    const updateCurrentSection = () => {
      frame = 0
      const readingLine = Math.min(180, window.innerHeight * 0.22)
      let active: StatusSectionId = statusSections[0].id
      for (const section of statusSections) {
        const target = document.getElementById(section.id)
        if (target && target.getBoundingClientRect().top <= readingLine) active = section.id
      }
      setCurrentSection(active)
    }
    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateCurrentSection)
    }

    updateCurrentSection()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

  const handleSectionChange = (value: string) => {
    const section = statusSections.find((item) => item.id === value)
    if (!section) return

    const target = document.getElementById(section.id)
    if (!target) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const longJump = Math.abs(target.getBoundingClientRect().top) > window.innerHeight * 2
    setCurrentSection(section.id)
    if (reduceMotion || longJump) {
      const previousScrollBehavior = document.documentElement.style.scrollBehavior
      document.documentElement.style.scrollBehavior = 'auto'
      target.scrollIntoView({ behavior: 'auto', block: 'start' })
      document.documentElement.style.scrollBehavior = previousScrollBehavior
      return
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const currentIndex = statusSections.findIndex((section) => section.id === currentSection)
  const current = statusSections[currentIndex] ?? statusSections[0]

  return (
    <nav className="status-section-navigator" aria-label="状态页分区导航">
      <div className="status-section-navigator__meta">
        <span>STATUS MAP</span>
        <strong>{current.shortLabel}</strong>
        <em>{currentIndex + 1} / {statusSections.length}</em>
      </div>
      <label className="status-section-navigator__control">
        <MapPinned size={18} aria-hidden />
        <select aria-label="选择状态页分区" value={currentSection} onChange={(event) => handleSectionChange(event.target.value)}>
          {statusSections.map((section, index) => (
            <option key={section.id} value={section.id}>
              {index + 1}. {section.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} aria-hidden />
      </label>
    </nav>
  )
}