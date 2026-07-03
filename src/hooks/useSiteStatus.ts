import { useEffect, useMemo, useState } from 'react'
import { mergeSiteStatusPayload, type SiteStatusPayload } from '../data/siteStatusView'

export function useSiteStatus() {
  const [payload, setPayload] = useState<SiteStatusPayload | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/status/site-status.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<SiteStatusPayload>
      })
      .then((data) => {
        if (!active) return
        setPayload(data)
        setLoadError('')
      })
      .catch((error) => {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : String(error))
      })
    return () => {
      active = false
    }
  }, [])

  const status = useMemo(() => mergeSiteStatusPayload(payload), [payload])

  return { status, loadError }
}
