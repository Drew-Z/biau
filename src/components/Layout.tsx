import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSiteTheme } from '../hooks/useSiteTheme'
import { Navigation } from './Navigation'
import { FlowBackground } from './FlowBackground'

export type SiteLanguage = 'zh' | 'en'

export interface SiteOutletContext {
  language: SiteLanguage
}

export function Layout() {
  const [language, setLanguage] = useState<SiteLanguage>('zh')
  const { theme, selectTheme } = useSiteTheme()

  return (
    <div className="app">
      <FlowBackground theme={theme} />

      <Navigation
        language={language}
        theme={theme}
        onSelectTheme={selectTheme}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'))}
      />

      <Outlet context={{ language } satisfies SiteOutletContext} />
    </div>
  )
}
