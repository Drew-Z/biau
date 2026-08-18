import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useHarborScene } from '../hooks/useHarborScene'
import { Navigation } from './Navigation'
import { FlowBackground } from './FlowBackground'

export type SiteLanguage = 'zh' | 'en'

export interface SiteOutletContext {
  language: SiteLanguage
}

export function Layout() {
  const [language, setLanguage] = useState<SiteLanguage>('zh')
  const { scene: harborScene, cycleScene: cycleHarborScene } = useHarborScene()
  const { mode: themeMode, cycleMode: cycleThemeMode } = useTheme()

  return (
    <div className="app">
      <FlowBackground scene={harborScene} />

      <Navigation
        language={language}
        themeMode={themeMode}
        harborScene={harborScene}
        onCycleTheme={cycleThemeMode}
        onCycleHarborScene={cycleHarborScene}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'))}
      />

      <Outlet context={{ language } satisfies SiteOutletContext} />
    </div>
  )
}
