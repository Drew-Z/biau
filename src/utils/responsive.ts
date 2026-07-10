const MOBILE_INTERACTION_QUERY = '(max-width: 768px), (pointer: coarse)'

export function usesMobileInteractionMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MOBILE_INTERACTION_QUERY).matches
}
