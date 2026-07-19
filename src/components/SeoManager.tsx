import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPublicBlogPostSummary } from '../data/blogCuration'
import { projects } from '../data/portfolio'
import {
  applySeo,
  getBlogPostSeo,
  getProjectSeo,
  getStaticSeo,
} from '../utils/seo'

export function SeoManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/'

    applySeo(getStaticSeo(path))

    if (path.startsWith('/projects/')) {
      const project = projects.find((item) => `/projects/${item.id}` === path)
      if (project) applySeo(getProjectSeo(project))
    }

    if (path.startsWith('/blog/')) {
      const post = getPublicBlogPostSummary(path.replace('/blog/', ''))
      if (post) applySeo(getBlogPostSeo(post))
    }
  }, [pathname])

  return null
}
