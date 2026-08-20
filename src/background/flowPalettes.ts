import type { HarborScene } from '../utils/appearance'

export type { HarborScene } from '../utils/appearance'

export type FlowPalette = readonly [string, string, string, string, string]

export interface FlowDynamics {
  speed: number
  fieldScale: number
  distortion: number
  ribbonStrength: number
  noiseScale: number
  contrast: number
  angle: number
}

export interface FlowEffects {
  brightness: number
  saturation: number
  noiseFlow: number
  starIntensity: number
  starScale: number
}

export interface FlowSceneProfile {
  scene: HarborScene
  palette: FlowPalette
  dynamics: FlowDynamics
  effects: FlowEffects
}

type FlowProfileDefinition = Omit<FlowSceneProfile, 'scene' | 'dynamics'> & {
  dynamics: Omit<FlowDynamics, 'angle'>
  angle: number
  portraitAngle?: number
  portraitPalette?: FlowPalette
}

const effects: Record<HarborScene, FlowEffects> = {
  dusk: {
    brightness: 1.02,
    saturation: 1.04,
    noiseFlow: 0.9,
    starIntensity: 0,
    starScale: 1,
  },
  garden: {
    brightness: 0.96,
    saturation: 0.92,
    noiseFlow: 0.64,
    starIntensity: 0,
    starScale: 1,
  },
  stellar: {
    brightness: 0.92,
    saturation: 1.18,
    noiseFlow: 1.18,
    starIntensity: 0.9,
    starScale: 1.04,
  },
}

const dynamics: Record<HarborScene, Omit<FlowDynamics, 'angle'>> = {
  dusk: {
    speed: 0.92,
    fieldScale: 1.08,
    distortion: 0.78,
    ribbonStrength: 0.42,
    noiseScale: 0.86,
    contrast: 1.02,
  },
  garden: {
    speed: 0.58,
    fieldScale: 0.76,
    distortion: 0.5,
    ribbonStrength: 0.7,
    noiseScale: 1.48,
    contrast: 0.9,
  },
  stellar: {
    speed: 0.86,
    fieldScale: 1.2,
    distortion: 1.36,
    ribbonStrength: 0.3,
    noiseScale: 0.78,
    contrast: 1.2,
  },
}

const profiles: Record<'dark' | 'light', Record<HarborScene, FlowProfileDefinition>> = {
  dark: {
    dusk: {
      palette: ['#120914', '#3c1732', '#8e3f58', '#dc8065', '#f3bf6b'],
      dynamics: dynamics.dusk,
      effects: effects.dusk,
      angle: 318,
      portraitAngle: 262,
      portraitPalette: ['#120914', '#8e3f58', '#f3bf6b', '#90bfe0', '#333ca0'],
    },
    garden: {
      palette: ['#07150f', '#0b3827', '#1d795c', '#7cab6d', '#d7d08e'],
      dynamics: dynamics.garden,
      effects: effects.garden,
      angle: 304,
      portraitAngle: 282,
      portraitPalette: ['#07150f', '#1d795c', '#d7d08e', '#7cab6d', '#0b3827'],
    },
    stellar: {
      palette: ['#040713', '#101c42', '#263c7e', '#6b62b5', '#7fd9dc'],
      dynamics: dynamics.stellar,
      effects: effects.stellar,
      angle: 326,
      portraitAngle: 304,
      portraitPalette: ['#040713', '#263c7e', '#7fd9dc', '#6b62b5', '#101c42'],
    },
  },
  light: {
    dusk: {
      palette: ['#f8eee7', '#efc3b7', '#d8888e', '#7abfc4', '#f1c678'],
      dynamics: dynamics.dusk,
      effects: effects.dusk,
      angle: 318,
      portraitAngle: 262,
      portraitPalette: ['#f8eee7', '#d8888e', '#f1c678', '#90bfe0', '#333ca0'],
    },
    garden: {
      palette: ['#eef3dc', '#d5c8e8', '#a8ddd4', '#79be8d', '#d8d98a'],
      dynamics: dynamics.garden,
      effects: effects.garden,
      angle: 304,
      portraitAngle: 282,
      portraitPalette: ['#eef3dc', '#a8ddd4', '#d8d98a', '#79be8d', '#d5c8e8'],
    },
    stellar: {
      palette: ['#eef2f8', '#c7d2e9', '#849dd0', '#776ea8', '#b5e1df'],
      dynamics: dynamics.stellar,
      effects: effects.stellar,
      angle: 326,
      portraitAngle: 304,
      portraitPalette: ['#eef2f8', '#849dd0', '#b5e1df', '#776ea8', '#c7d2e9'],
    },
  },
}

export function getFlowProfile(scene: HarborScene, light: boolean, portrait = false): FlowSceneProfile {
  const profile = profiles[light ? 'light' : 'dark'][scene]
  return {
    scene,
    palette: portrait ? (profile.portraitPalette ?? profile.palette) : profile.palette,
    effects: profile.effects,
    dynamics: {
      ...profile.dynamics,
      angle: portrait ? (profile.portraitAngle ?? profile.angle) : profile.angle,
    },
  }
}
