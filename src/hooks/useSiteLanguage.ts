import { createContext, useCallback, useContext, useLayoutEffect, useState } from 'react'
import { persistSiteLanguage, readStoredSiteLanguage, SITE_LANGUAGE_TAGS, type SiteLanguage } from '../utils/siteLanguage'

export const SiteLanguageContext = createContext<SiteLanguage>('zh')

export function useSiteLanguage() {
  return useContext(SiteLanguageContext)
}

export function useSiteLanguagePreference() {
  const [language, setLanguage] = useState(readStoredSiteLanguage)

  useLayoutEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = SITE_LANGUAGE_TAGS[language]
    persistSiteLanguage(language)
  }, [language])

  const toggleLanguage = useCallback(() => setLanguage((previous) => previous === 'zh' ? 'en' : 'zh'), [])
  return { language, toggleLanguage }
}
