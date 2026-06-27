import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { Navigation } from './Navigation'

export type SiteLanguage = 'zh' | 'en'
type HarborScene = 'dusk' | 'garden' | 'stellar'

const HARBOR_SCENE_STORAGE_KEY = 'biau-port-harbor-scene'

function readHarborScene(): HarborScene {
  if (typeof window === 'undefined') return 'dusk'
  const stored = window.localStorage.getItem(HARBOR_SCENE_STORAGE_KEY)
  if (stored === 'dusk' || stored === 'garden' || stored === 'stellar') return stored
  return 'dusk'
}

export interface SiteOutletContext {
  language: SiteLanguage
}

export function Layout() {
  const [language, setLanguage] = useState<SiteLanguage>('zh')
  const [harborScene, setHarborScene] = useState<HarborScene>(readHarborScene)
  const { mode: themeMode, cycleMode: cycleThemeMode } = useTheme()

  useEffect(() => {
    document.documentElement.dataset.harborScene = harborScene
    window.localStorage.setItem(HARBOR_SCENE_STORAGE_KEY, harborScene)
  }, [harborScene])

  return (
    <div className="app">
      <div className="gradient-bg" />

      <Navigation
        language={language}
        themeMode={themeMode}
        harborScene={harborScene}
        onCycleTheme={cycleThemeMode}
        onCycleHarborScene={() =>
          setHarborScene((prev) => (prev === 'dusk' ? 'garden' : prev === 'garden' ? 'stellar' : 'dusk'))
        }
        onToggleLanguage={() => setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'))}
      />

      <Outlet context={{ language } satisfies SiteOutletContext} />
    </div>
  )
}
