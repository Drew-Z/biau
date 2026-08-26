export const SITE_THEME_STORAGE_KEY = 'biau-port-theme'
export const LEGACY_THEME_STORAGE_KEY = 'theme'
export const LEGACY_HARBOR_SCENE_STORAGE_KEY = 'biau-port-harbor-scene'

export const SITE_THEMES = ['morning', 'nature', 'stellar'] as const
export type SiteTheme = (typeof SITE_THEMES)[number]

export const DEFAULT_SITE_THEME: SiteTheme = 'morning'

export const SITE_THEME_META: Record<SiteTheme, { label: { zh: string; en: string } }> = {
  morning: { label: { zh: '晨曦', en: 'MORNING' } },
  nature: { label: { zh: '自然', en: 'NATURE' } },
  stellar: { label: { zh: '星辰', en: 'STELLAR' } },
}

const LEGACY_SCENE_THEME: Record<string, SiteTheme> = {
  dusk: 'morning',
  garden: 'nature',
  stellar: 'stellar',
}

const LEGACY_COLOR_THEME: Record<string, SiteTheme> = {
  light: 'morning',
  dark: 'stellar',
  auto: 'morning',
}

export function isSiteTheme(value: string | null | undefined): value is SiteTheme {
  return value != null && SITE_THEMES.some((theme) => theme === value)
}

export function readStoredSiteTheme(): SiteTheme {
  if (typeof window === 'undefined') return DEFAULT_SITE_THEME

  try {
    const stored = window.localStorage.getItem(SITE_THEME_STORAGE_KEY)
    if (isSiteTheme(stored)) return stored

    const legacyScene = window.localStorage.getItem(LEGACY_HARBOR_SCENE_STORAGE_KEY)
    const legacyColor = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    const migrated = (legacyScene && LEGACY_SCENE_THEME[legacyScene])
      || (legacyColor && LEGACY_COLOR_THEME[legacyColor])
      || DEFAULT_SITE_THEME
    window.localStorage.setItem(SITE_THEME_STORAGE_KEY, migrated)
    return migrated
  } catch {
    return DEFAULT_SITE_THEME
  }
}

export function applySiteTheme(root: HTMLElement, theme: SiteTheme) {
  const changed = root.dataset.siteTheme !== theme
  if (changed) root.dataset.siteTheme = theme
  root.classList.toggle('light-theme', theme !== 'stellar')
  root.style.colorScheme = theme === 'stellar' ? 'dark' : 'light'
  delete root.dataset.colorMode
  delete root.dataset.harborScene
  delete root.dataset.harborSceneVersion

  if (!root.dataset.siteThemeVersion || changed) {
    const currentVersion = Number.parseInt(root.dataset.siteThemeVersion ?? '0', 10)
    root.dataset.siteThemeVersion = String(Number.isFinite(currentVersion) ? currentVersion + 1 : 1)
  }
}

export function persistSiteTheme(theme: SiteTheme) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SITE_THEME_STORAGE_KEY, theme)
  } catch {
    // The selected visual state still applies when storage is unavailable.
  }
}

export function applyInitialAppearance() {
  if (typeof document === 'undefined') return
  applySiteTheme(document.documentElement, readStoredSiteTheme())
}
