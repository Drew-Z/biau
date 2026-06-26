import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

// auto 模式下的浅色时段：6:00（含）至 18:00（不含）
const LIGHT_START_HOUR = 6
const LIGHT_END_HOUR = 18

function isDaytime(date: Date): boolean {
  const hour = date.getHours()
  return hour >= LIGHT_START_HOUR && hour < LIGHT_END_HOUR
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') {
    return isDaytime(new Date()) ? 'light' : 'dark'
  }
  return mode
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'auto'
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredMode()))

  // 持久化用户选择
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode)
    setResolved(resolveTheme(mode))
  }, [mode])

  // auto 模式下定时重算，跨越时间边界时自动切换
  useEffect(() => {
    if (mode !== 'auto') return
    const timer = window.setInterval(() => {
      setResolved((prev) => {
        const next = resolveTheme('auto')
        return prev === next ? prev : next
      })
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [mode])

  // 应用到根元素：深色为默认 :root，浅色加 light-theme 类
  useEffect(() => {
    const root = document.documentElement
    if (resolved === 'light') {
      root.classList.add('light-theme')
    } else {
      root.classList.remove('light-theme')
    }
  }, [resolved])

  const cycleMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light'))
  }, [])

  return { mode, resolved, cycleMode }
}
