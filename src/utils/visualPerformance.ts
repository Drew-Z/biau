export type VisualPerformanceMode = 'static' | 'balanced' | 'full'

export function isLowPowerDevice() {
  if (typeof navigator === 'undefined') return false
  const state = navigator as Navigator & {
    connection?: { saveData?: boolean }
    deviceMemory?: number
  }
  return Boolean(state.connection?.saveData || state.deviceMemory !== undefined && state.deviceMemory <= 2)
}

export function getVisualPerformanceMode(reducedMotion = false): VisualPerformanceMode {
  if (reducedMotion || isLowPowerDevice()) return 'static'
  if (typeof document !== 'undefined' && document.documentElement.dataset.performance === 'full') return 'full'
  return 'balanced'
}
