import { useCallback, useEffect, useRef, useState } from 'react'
import type { DailyReadResult } from '../utils/aiDailyEditionsApi'

/** Shared by the index and detail; language changes never restart content requests. */
export function useDailyEditionResource<T>(load: (signal: AbortSignal, etag?: string | null) => Promise<DailyReadResult<T>>) {
  const [payload, setPayload] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<number | null>(null)
  const [checkedAt, setCheckedAt] = useState(0)
  const saved = useRef<{ value: T | null; etag: string | null }>({ value: null, etag: null })
  const controller = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setLoading(true)
    const timeout = window.setTimeout(() => next.abort(new Error('daily-read-timeout')), 15_000)
    try {
      const result = await load(next.signal, saved.current.etag)
      if (controller.current !== next) return
      if (result.payload) {
        saved.current = { value: result.payload, etag: result.etag }
        setPayload(result.payload)
        setError(null)
      } else if (result.notModified && saved.current.value) setError(null)
      else setError(result.status === 304 ? 502 : result.status)
    } catch {
      if (controller.current === next) setError(0)
    } finally {
      window.clearTimeout(timeout)
      if (controller.current === next) {
        controller.current = null
        setLoading(false)
        setCheckedAt(Date.now())
      }
    }
  }, [load])
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !controller.current) void refresh()
    }, 300_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
      controller.current?.abort()
      controller.current = null
    }
  }, [refresh])
  return { payload, loading, error, checkedAt, refresh }
}
