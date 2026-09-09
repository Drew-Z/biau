import { useEffect, useState } from 'react'
import { ChevronDown, MapPinned } from 'lucide-react'
import { statusInterfaceCopy, statusOverviewSectionIds } from '../data/statusInterfaceCopy'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

type StatusSectionId = (typeof statusOverviewSectionIds)[number]

export function StatusSectionNavigator() {
  const language = useSiteLanguage()
  const copy = statusInterfaceCopy[language]
  const [currentSection, setCurrentSection] = useState<StatusSectionId>('status-overview')

  useEffect(() => {
    let frame = 0
    const updateCurrentSection = () => {
      frame = 0
      const readingLine = Math.min(180, window.innerHeight * 0.22)
      let active: StatusSectionId = statusOverviewSectionIds[0]
      for (const id of statusOverviewSectionIds) {
        const target = document.getElementById(id)
        if (target && target.getBoundingClientRect().top <= readingLine) active = id
      }
      setCurrentSection(active)
    }
    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateCurrentSection)
    }

    updateCurrentSection()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    document.addEventListener('scroll', scheduleUpdate, { capture: true, passive: true })
    window.addEventListener('resize', scheduleUpdate)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      document.removeEventListener('scroll', scheduleUpdate, true)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

  const handleSectionChange = (value: string) => {
    const sectionId = statusOverviewSectionIds.find((id) => id === value)
    if (!sectionId) return

    const target = document.getElementById(sectionId)
    if (!target) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targetTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 86)
    const longJump = Math.abs(targetTop - window.scrollY) > window.innerHeight * 2
    setCurrentSection(sectionId)
    window.scrollTo({ top: targetTop, behavior: reduceMotion || longJump ? 'instant' : 'smooth' })
  }

  const currentIndex = statusOverviewSectionIds.indexOf(currentSection)
  const current = copy.overviewSections[statusOverviewSectionIds[currentIndex] ?? statusOverviewSectionIds[0]]

  return (
    <nav className="status-section-navigator" aria-label={copy.navigatorLabel} lang={SITE_LANGUAGE_TAGS[language]}>
      <div className="status-section-navigator__meta">
        <span lang="en">STATUS MAP</span>
        <strong>{current.shortLabel}</strong>
        <em>{currentIndex + 1} / {statusOverviewSectionIds.length}</em>
      </div>
      <label className="status-section-navigator__control">
        <MapPinned size={18} aria-hidden />
        <select aria-label={copy.selectSection} value={currentSection} onChange={(event) => handleSectionChange(event.target.value)}>
          {statusOverviewSectionIds.map((id, index) => (
            <option key={id} value={id}>
              {index + 1}. {copy.overviewSections[id].label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} aria-hidden />
      </label>
    </nav>
  )
}
