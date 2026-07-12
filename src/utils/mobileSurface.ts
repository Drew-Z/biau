export type MobileSurfaceId = 'public-assistant' | 'detail-reading-guide'

export interface MobileSurfaceOpenDetail {
  surface: MobileSurfaceId
}

export const MOBILE_SURFACE_OPEN_EVENT = 'biau:mobile-surface-open'
export const MOBILE_SURFACE_LAYOUT_EVENT = 'biau:mobile-surface-layout'

export function isMobileSurfaceViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
}

export function announceMobileSurfaceOpen(surface: MobileSurfaceId) {
  if (!isMobileSurfaceViewport()) return
  window.dispatchEvent(new CustomEvent<MobileSurfaceOpenDetail>(MOBILE_SURFACE_OPEN_EVENT, { detail: { surface } }))
}

export function announceMobileSurfaceLayout() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(MOBILE_SURFACE_LAYOUT_EVENT))
}