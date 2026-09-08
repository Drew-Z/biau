export type SiteLanguage = 'zh' | 'en'

export const SITE_LANGUAGE_STORAGE_KEY = 'biau-port-language'
export const SITE_LANGUAGE_TAGS: Record<SiteLanguage, string> = { zh: 'zh-CN', en: 'en' }

export function readStoredSiteLanguage(): SiteLanguage {
  if (typeof window === 'undefined') return 'zh'
  try {
    return window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export function persistSiteLanguage(language: SiteLanguage) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language)
  } catch {
    // The current selection remains usable when browser storage is unavailable.
  }
}
