import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import {
  applyResolvedTheme,
  readStoredThemeMode,
  resolveThemeMode,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '../utils/appearance'

const SYSTEM_COLOR_QUERY = '(prefers-color-scheme: light)'

function readSystemPrefersLight() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(SYSTEM_COLOR_QUERY).matches
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStoredThemeMode)
  const [prefersLight, setPrefersLight] = useState(readSystemPrefersLight)
  const resolved = resolveThemeMode(mode, prefersLight)

  // 持久化用户选择
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      // The active mode still applies when storage is unavailable.
    }
  }, [mode])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(SYSTEM_COLOR_QUERY)
    const sync = () => setPrefersLight(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  // 应用到根元素：深色为默认 :root，浅色加 light-theme 类
  useLayoutEffect(() => {
    applyResolvedTheme(document.documentElement, resolved)
  }, [resolved])

  const cycleMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light'))
  }, [])

  return { mode, resolved, cycleMode }
}
