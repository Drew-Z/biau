export const THEME_STORAGE_KEY = 'theme'
export const HARBOR_SCENE_STORAGE_KEY = 'biau-port-harbor-scene'

export const THEME_MODES = ['light', 'dark', 'auto'] as const
export const HARBOR_SCENES = ['dusk', 'garden', 'stellar'] as const

export type ThemeMode = (typeof THEME_MODES)[number]
export type ResolvedTheme = Exclude<ThemeMode, 'auto'>
export type HarborScene = (typeof HARBOR_SCENES)[number]

export const HARBOR_SCENE_META: Record<
  HarborScene,
  { label: { zh: string; en: string } }
> = {
  dusk: { label: { zh: '暮港', en: 'DUSK' } },
  garden: { label: { zh: '自然', en: 'GARDEN' } },
  stellar: { label: { zh: '星辰', en: 'STELLAR' } },
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.some((mode) => mode === value)
}

export function isHarborScene(value: string | null): value is HarborScene {
  return value !== null && HARBOR_SCENES.some((scene) => scene === value)
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
  if (typeof window === 'undefined') return 'dusk'
  try {
    const stored = window.localStorage.getItem(HARBOR_SCENE_STORAGE_KEY)
    return isHarborScene(stored) ? stored : 'dusk'
  } catch {
    return 'dusk'
  }
}

export function getNextHarborScene(scene: HarborScene): HarborScene {
  const index = HARBOR_SCENES.indexOf(scene)
  return HARBOR_SCENES[(index + 1) % HARBOR_SCENES.length]
}

export function resolveThemeMode(mode: ThemeMode, prefersLight: boolean): ResolvedTheme {
  if (mode === 'auto') return prefersLight ? 'light' : 'dark'
  return mode
}

export function applyResolvedTheme(root: HTMLElement, resolved: ResolvedTheme) {
  root.classList.toggle('light-theme', resolved === 'light')
  root.dataset.colorMode = resolved
}

export function applyHarborScene(root: HTMLElement, scene: HarborScene) {
  root.dataset.harborScene = scene
}

export function applyInitialAppearance() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false
  applyResolvedTheme(document.documentElement, resolveThemeMode(readStoredThemeMode(), prefersLight))
  applyHarborScene(document.documentElement, readStoredHarborScene())
}
