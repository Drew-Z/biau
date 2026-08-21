export const THEME_STORAGE_KEY = 'theme'
export const STELLAR_SCENE = 'stellar' as const

export const THEME_MODES = ['light', 'dark', 'auto'] as const

export type ThemeMode = (typeof THEME_MODES)[number]
export type ResolvedTheme = Exclude<ThemeMode, 'auto'>
export type HarborScene = typeof STELLAR_SCENE

export function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.some((mode) => mode === value)
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(stored) ? stored : 'auto'
  } catch {
    return 'auto'
  }
}

export function readStoredHarborScene(): HarborScene {
  return STELLAR_SCENE
}

export function resolveThemeMode(mode: ThemeMode, prefersLight: boolean): ResolvedTheme {
  if (mode === 'auto') return prefersLight ? 'light' : 'dark'
  return mode
}

export function applyResolvedTheme(root: HTMLElement, resolved: ResolvedTheme) {
  root.classList.toggle('light-theme', resolved === 'light')
  root.dataset.colorMode = resolved
}

export function applyHarborScene(root: HTMLElement) {
  const sceneChanged = root.dataset.harborScene !== STELLAR_SCENE
  if (sceneChanged) root.dataset.harborScene = STELLAR_SCENE
  if (!root.dataset.harborSceneVersion || sceneChanged) {
    const currentVersion = Number.parseInt(root.dataset.harborSceneVersion ?? '0', 10)
    root.dataset.harborSceneVersion = String(Number.isFinite(currentVersion) ? currentVersion + 1 : 1)
  }
}

export function applyInitialAppearance() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false
  applyResolvedTheme(document.documentElement, resolveThemeMode(readStoredThemeMode(), prefersLight))
  applyHarborScene(document.documentElement)
}
