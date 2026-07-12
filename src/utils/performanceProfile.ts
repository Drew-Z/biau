export type PerformanceProfile = 'balanced' | 'static'

export interface PerformanceSignals {
  reducedMotion: boolean
  saveData: boolean
  effectiveType?: string
  deviceMemory?: number
  hardwareConcurrency?: number
  mobileLike: boolean
}

interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
  addEventListener?: (type: 'change', listener: EventListener) => void
  removeEventListener?: (type: 'change', listener: EventListener) => void
}

interface NavigatorWithPerformanceSignals extends Navigator {
  deviceMemory?: number
  connection?: NetworkInformationLike
  mozConnection?: NetworkInformationLike
  webkitConnection?: NetworkInformationLike
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const MOBILE_LIKE_QUERY = '(max-width: 768px), (pointer: coarse)'
const CONSTRAINED_NETWORKS = new Set(['slow-2g', '2g'])

export function resolvePerformanceProfile(signals: PerformanceSignals): PerformanceProfile {
  if (signals.reducedMotion || signals.saveData) return 'static'
  if (signals.effectiveType && CONSTRAINED_NETWORKS.has(signals.effectiveType.toLowerCase())) return 'static'

  const lowMemory = signals.deviceMemory !== undefined && signals.deviceMemory <= 4
  const lowCpu = signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency <= 4
  return signals.mobileLike && lowMemory && lowCpu ? 'static' : 'balanced'
}

function readConnection(navigatorValue: NavigatorWithPerformanceSignals): NetworkInformationLike | undefined {
  return navigatorValue.connection ?? navigatorValue.mozConnection ?? navigatorValue.webkitConnection
}

export function readPerformanceSignals(): PerformanceSignals {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      reducedMotion: false,
      saveData: false,
      mobileLike: false,
    }
  }

  const navigatorValue = navigator as NavigatorWithPerformanceSignals
  const connection = readConnection(navigatorValue)

  return {
    reducedMotion: window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false,
    saveData: connection?.saveData === true,
    effectiveType: connection?.effectiveType,
    deviceMemory: navigatorValue.deviceMemory,
    hardwareConcurrency: navigatorValue.hardwareConcurrency,
    mobileLike: window.matchMedia?.(MOBILE_LIKE_QUERY).matches ?? false,
  }
}

export function readPerformanceProfile(): PerformanceProfile {
  return resolvePerformanceProfile(readPerformanceSignals())
}

export function applyPerformanceProfile(profile = readPerformanceProfile()): PerformanceProfile {
  if (typeof document !== 'undefined') document.documentElement.dataset.performance = profile
  return profile
}

export function subscribePerformanceProfile(listener: (profile: PerformanceProfile) => void): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return () => undefined

  const reducedMotion = window.matchMedia?.(REDUCED_MOTION_QUERY)
  const mobileLike = window.matchMedia?.(MOBILE_LIKE_QUERY)
  const connection = readConnection(navigator as NavigatorWithPerformanceSignals)
  const handleChange = () => listener(readPerformanceProfile())

  reducedMotion?.addEventListener?.('change', handleChange)
  mobileLike?.addEventListener?.('change', handleChange)
  connection?.addEventListener?.('change', handleChange)

  return () => {
    reducedMotion?.removeEventListener?.('change', handleChange)
    mobileLike?.removeEventListener?.('change', handleChange)
    connection?.removeEventListener?.('change', handleChange)
  }
}