import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_IMAGE,
  SITE_NAME,
  absoluteUrl,
  getBlogPostSeo,
  getProjectSeo,
  getStaticSeo,
  type SeoMeta,
} from '../utils/seo'

function setMeta(selector: string, createAttrs: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(createAttrs).forEach(([key, value]) => element?.setAttribute(key, value))
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', url)
}

function applySeo(meta: SeoMeta) {
  const canonicalUrl = absoluteUrl(meta.canonicalPath)
  const image = meta.image ?? DEFAULT_IMAGE

  document.title = meta.title
  setCanonical(canonicalUrl)
  setMeta('meta[name="description"]', { name: 'description' }, meta.description)
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME)
  setMeta('meta[property="og:title"]', { property: 'og:title' }, meta.title)
  setMeta('meta[property="og:description"]', { property: 'og:description' }, meta.description)
  setMeta('meta[property="og:type"]', { property: 'og:type' }, meta.type ?? 'website')
  setMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl)
  setMeta('meta[property="og:image"]', { property: 'og:image' }, image)
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image')
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, meta.title)
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, meta.description)
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, image)
}

export function SeoManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelled = false
    const path = pathname.replace(/\/+$/, '') || '/'

    applySeo(getStaticSeo(path))

    async function loadRouteSeo() {
      if (path.startsWith('/projects/')) {
        const { projects } = await import('../data/portfolio')
        const project = projects.find((item) => `/projects/${item.id}` === path)
        if (!cancelled && project) applySeo(getProjectSeo(project))
      }

      if (path.startsWith('/blog/')) {
        const { getPublicBlogPostSummary } = await import('../data/blogCuration')
        const post = getPublicBlogPostSummary(path.replace('/blog/', ''))
        if (!cancelled && post) applySeo(getBlogPostSeo(post))
      }
    }

    void loadRouteSeo()
    return () => {
      cancelled = true
    }
  }, [pathname])

  return null
}
