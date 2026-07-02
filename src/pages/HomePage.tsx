import { useNavigate } from 'react-router-dom'
import { HeroSplit } from '../components/HeroSplit'
import { trackAnalyticsEvent } from '../utils/analytics'

function projectIdFromDetailLink(link: string) {
  return link.startsWith('/projects/') ? link.slice('/projects/'.length) : undefined
}

function hostFromUrl(link: string) {
  try {
    return new URL(link).hostname
  } catch {
    return undefined
  }
}

export function HomePage() {
  const navigate = useNavigate()

  const handleProjectClick = (link: string) => {
    trackAnalyticsEvent('project_detail_open', {
      source: 'home-carousel',
      projectId: projectIdFromDetailLink(link),
    })

    if (link.startsWith('/')) {
      navigate(link)
      return
    }
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  const handleProjectAction = (link: string) => {
    trackAnalyticsEvent('project_external_open', {
      source: 'home-carousel',
      targetHost: hostFromUrl(link),
    })
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  return <HeroSplit onProjectClick={handleProjectClick} onProjectAction={handleProjectAction} />
}
