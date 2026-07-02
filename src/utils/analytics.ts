type AnalyticsProvider = 'umami' | 'plausible' | 'debug' | 'none'

export type AnalyticsEventName =
  | 'project_detail_open'
  | 'project_external_open'
  | 'public_assistant_open'
  | 'public_assistant_question'

type AnalyticsEventValue = string | number | boolean | null
export type AnalyticsEventProperties = Record<string, AnalyticsEventValue | undefined>

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
