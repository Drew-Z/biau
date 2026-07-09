type AnalyticsProvider = 'umami' | 'plausible' | 'debug' | 'none'

export type AnalyticsEventName =
  | 'route_view'
  | 'project_detail_open'
  | 'project_external_open'
  | 'public_assistant_open'
  | 'public_assistant_question'

type AnalyticsEventValue = string | number | boolean | null
export type AnalyticsEventProperties = Record<string, AnalyticsEventValue | undefined>
type AnalyticsRouteArea =
  | 'home'
  | 'projects'
  | 'project-detail'
  | 'assistant'
  | 'assistant-admin'
  | 'studio'
  | 'studio-ai-daily'
  | 'status'
  | 'status-detail'
  | 'blog'
  | 'blog-post'
  | 'not-found'

interface AnalyticsRouteMetadata {
  routePattern: string
  routeArea: AnalyticsRouteArea
  routeDepth: number
}

declare global {
  interface Window {
    umami?: {
      track?: (eventName: string, eventData?: Record<string, AnalyticsEventValue>) => void
    }
    plausible?: (eventName: string, options?: { props?: Record<string, AnalyticsEventValue> }) => void
  }
}

function normalizeProvider(value: string | undefined): AnalyticsProvider {
  const provider = value?.trim().toLowerCase()
  if (provider === 'umami' || provider === 'plausible' || provider === 'debug') return provider
  return 'none'
}

function cleanProperties(properties: AnalyticsEventProperties = {}) {
  const cleaned: Record<string, AnalyticsEventValue> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue
    cleaned[key] = value
  }
  return cleaned
}

function normalizePathname(pathname: string) {
  const pathOnly = pathname.split(/[?#]/u)[0]?.trim() || '/'
  const normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
  return normalized.length > 1 ? normalized.replace(/\/+$/u, '') : '/'
}

export function getAnalyticsRouteMetadata(pathname: string): AnalyticsRouteMetadata {
  const normalized = normalizePathname(pathname)
  const segments = normalized.split('/').filter(Boolean)
  const [first, second] = segments

  if (normalized === '/') return { routePattern: '/', routeArea: 'home', routeDepth: 0 }
  if (first === 'projects' && segments.length === 1) {
    return { routePattern: '/projects', routeArea: 'projects', routeDepth: 1 }
  }
  if (first === 'projects') {
    return { routePattern: '/projects/:id', routeArea: 'project-detail', routeDepth: segments.length }
  }
  if (first === 'assistant' && second === 'admin') {
    return { routePattern: '/assistant/admin', routeArea: 'assistant-admin', routeDepth: segments.length }
  }
  if (first === 'assistant') return { routePattern: '/assistant', routeArea: 'assistant', routeDepth: segments.length }
  if (first === 'studio' && second === 'ai-daily') {
    return { routePattern: '/studio/ai-daily/:issueId', routeArea: 'studio-ai-daily', routeDepth: segments.length }
  }
  if (first === 'studio') return { routePattern: '/studio/*', routeArea: 'studio', routeDepth: segments.length }
  if (first === 'status' && segments.length === 1) {
    return { routePattern: '/status', routeArea: 'status', routeDepth: 1 }
  }
  if (first === 'status') {
    return { routePattern: '/status/:projectId', routeArea: 'status-detail', routeDepth: segments.length }
  }
  if (first === 'blog' && segments.length === 1) return { routePattern: '/blog', routeArea: 'blog', routeDepth: 1 }
  if (first === 'blog') return { routePattern: '/blog/:slug', routeArea: 'blog-post', routeDepth: segments.length }

  return { routePattern: 'not-found', routeArea: 'not-found', routeDepth: segments.length }
}

let lastTrackedRoutePathname: string | null = null

export function trackRouteView(pathname: string) {
  const normalized = normalizePathname(pathname)
  if (lastTrackedRoutePathname === normalized) return
  lastTrackedRoutePathname = normalized

  const metadata = getAnalyticsRouteMetadata(normalized)
  trackAnalyticsEvent('route_view', {
    routePattern: metadata.routePattern,
    routeArea: metadata.routeArea,
    routeDepth: metadata.routeDepth,
  })
}

export function trackAnalyticsEvent(name: AnalyticsEventName, properties: AnalyticsEventProperties = {}) {
  if (typeof window === 'undefined') return

  const provider = normalizeProvider(import.meta.env.VITE_ANALYTICS_PROVIDER)
  if (provider === 'none') return

  const eventProperties = cleanProperties(properties)
  if (provider === 'umami') {
    window.umami?.track?.(name, eventProperties)
    return
  }

  if (provider === 'plausible') {
    window.plausible?.(name, { props: eventProperties })
    return
  }

  if (provider === 'debug') {
    window.dispatchEvent(new CustomEvent('biau:analytics', { detail: { name, properties: eventProperties } }))
  }
}
