import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { catalogProjects } from '../data/portfolio'
import { catalogCopy } from '../data/catalogCopy'
import { trackAnalyticsEvent } from '../utils/analytics'
import { getProjectListHref, parseProjectGroupSearch, serializeProjectGroupSearch, type ProjectGroupKey } from '../utils/projectDiscovery'
import { useCatalogReadingNavigation } from '../hooks/useReadingNavigation'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

export function ProjectsPage() {
  const language = useSiteLanguage()
  const copy = catalogCopy[language]
  const navigate = useNavigate()
  const { search } = useLocation()
  const [, setSearchParams] = useSearchParams()
  const activeMobileGroup = parseProjectGroupSearch(search)
  const groupSearch = serializeProjectGroupSearch(activeMobileGroup)
  const [isMobileLayout, setIsMobileLayout] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches)
  const rememberReadingEntry = useCatalogReadingNavigation(getProjectListHref(activeMobileGroup))

  useEffect(() => {
    if (search !== groupSearch && window.location.search === search) setSearchParams(groupSearch, { replace: true })
  }, [groupSearch, search, setSearchParams])

  const selectMobileGroup = (group: ProjectGroupKey) => {
    if (group !== parseProjectGroupSearch(window.location.search)) setSearchParams(serializeProjectGroupSearch(group))
  }

  const openProjectDetail = (projectId: string) => {
    trackAnalyticsEvent('project_detail_open', {
      source: 'projects-page-card',
      projectId,
    })
    const group = parseProjectGroupSearch(window.location.search)
    navigate(`/projects/${projectId}${serializeProjectGroupSearch(group)}`, {
      state: rememberReadingEntry(`projects:${projectId}`, getProjectListHref(group)),
    })
  }

  const projectGroups = useMemo(() => {
    const ai = catalogProjects.filter((project) => project.category === 'ai')
    const business = catalogProjects.filter((project) => project.category === 'business')
    const mobile = catalogProjects.filter((project) => project.category === 'mobile')
    const platform = catalogProjects.filter((project) => project.category === 'platform')
    const tool = catalogProjects.filter((project) => project.category === 'tool')

    return [
      { key: 'ai' as const, projects: ai },
      { key: 'fullstack' as const, projects: [...business, ...platform, ...mobile] },
      { key: 'tool' as const, projects: tool },
    ]
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 720px)')
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches)

    updateLayout()
    mediaQuery.addEventListener('change', updateLayout)
    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [])

  let projectIndex = 0

  return (
    <main className="projects-tools-page page-stack" lang={SITE_LANGUAGE_TAGS[language]}>
      <section className="section-header page-hero">
        <p className="section-subtitle" lang="en">PROJECT PORTFOLIO</p>
        <h1 className="section-title" tabIndex={-1} data-reading-heading>{copy.projectsTitle}</h1>
        <p className="section-description">{copy.projectsDescription}</p>
      </section>


      {projectGroups.map((group) => {
        const panelId = `project-group-panel-${group.key}`
        const isActive = activeMobileGroup === group.key

        return (
          <section key={group.key} className={`project-group ${isActive ? 'is-mobile-active' : ''}`}>
            <div className="project-group-head">
              <span lang="en">{group.key.toUpperCase()}</span>
              <h2 className="project-group-title">{copy.projectGroups[group.key]}</h2>
            </div>
            <button
              type="button"
              className="project-group-toggle"
              aria-expanded={isActive}
              aria-controls={panelId}
              onClick={() => selectMobileGroup(group.key)}
            >
              <span className="project-group-toggle__index" lang="en">{group.key.toUpperCase()}</span>
              <span className="project-group-toggle__copy">
                <strong>{copy.projectGroups[group.key]}</strong>
                <em>{copy.projectCount(group.projects.length)}</em>
              </span>
              <ChevronDown size={18} aria-hidden />
            </button>
            <div
              id={panelId}
              className="projects-grid card-grid collapsed-tool-grid"
              hidden={isMobileLayout && !isActive}
            >
              {group.projects.map((project) => {
                projectIndex += 1
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={projectIndex}
                    onViewDetails={() => openProjectDetail(project.id)}
                    onNavigate={navigate}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
