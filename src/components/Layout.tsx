import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { Navigation } from './Navigation'

export type SiteLanguage = 'zh' | 'en'

export interface SiteOutletContext {
  language: SiteLanguage
}

export function Layout() {
  const [language, setLanguage] = useState<SiteLanguage>('zh')
  const { mode: themeMode, cycleMode: cycleThemeMode } = useTheme()

  return (
    <div className="app">
      <div className="gradient-bg" />

      <Navigation
        language={language}
        themeMode={themeMode}
        onCycleTheme={cycleThemeMode}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'))}
      />

      <Outlet context={{ language } satisfies SiteOutletContext} />
    </div>
  )
}
