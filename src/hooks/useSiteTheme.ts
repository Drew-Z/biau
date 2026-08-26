import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  applySiteTheme,
  persistSiteTheme,
  readStoredSiteTheme,
  type SiteTheme,
} from '../utils/appearance'

export function useSiteTheme() {
  const [theme, setTheme] = useState(readStoredSiteTheme)
  const themeRef = useRef(theme)

  useLayoutEffect(() => {
    themeRef.current = theme
    applySiteTheme(document.documentElement, theme)
    persistSiteTheme(theme)
  }, [theme])

  const selectTheme = useCallback((nextTheme: SiteTheme) => {
    if (themeRef.current === nextTheme) return

    const commit = () => {
      themeRef.current = nextTheme
      applySiteTheme(document.documentElement, nextTheme)
      persistSiteTheme(nextTheme)
      flushSync(() => setTheme(nextTheme))
    }
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown
    }
    if (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && typeof transitionDocument.startViewTransition === 'function'
    ) {
      transitionDocument.startViewTransition(commit)
      return
    }
    commit()
  }, [])

  return { theme, selectTheme }
}
