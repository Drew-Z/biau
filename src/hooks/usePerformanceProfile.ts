import { useEffect } from 'react'
import { applyPerformanceProfile, subscribePerformanceProfile } from '../utils/performanceProfile'

export function usePerformanceProfile() {
  useEffect(() => {
    applyPerformanceProfile()
    return subscribePerformanceProfile(applyPerformanceProfile)
  }, [])
}