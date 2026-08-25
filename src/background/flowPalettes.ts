import type { HarborScene } from '../utils/appearance'

export type FlowPalette = readonly [string, string, string, string, string, string]

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
  fieldOpacity: number
  mistOpacity: number
  noiseIntensity: number
  noiseFlow: number
  noiseFlowAngle: number
  noiseOctaves: number
  starIntensity: number
  starScale: number
}

export interface StarfieldProfile {
  enabled: boolean
  count: number
  opacity: number
  speed: number
  parallax: number
  twinkle: number
  temperature: number
  seed: number
}

export interface StellarEffectsProfile {
  edgeGlow: number
  perimeterOpacity: number
  perimeterDuration: number
  brandHighlight: number
}

export interface RenderBudget {
  desktopDpr: number
  mobileDpr: number
  maxFps: number
}

export interface FlowSceneProfile {
  scene: HarborScene
  palette: FlowPalette
  dynamics: FlowDynamics
  effects: FlowEffects
  starfield: StarfieldProfile
  stellarEffects: StellarEffectsProfile
  renderBudget: RenderBudget
}

interface FlowProfileDefinition extends Omit<FlowSceneProfile, 'scene' | 'dynamics'> {
  dynamics: Omit<FlowDynamics, 'angle'>
  angle: number
  portraitAngle?: number
  portraitPalette?: FlowPalette
}

const darkEffects: Record<HarborScene, FlowEffects> = {
  dusk: { brightness: 0.92, saturation: 1.04, fieldOpacity: 0.62, mistOpacity: 0.28, noiseIntensity: 0.3, noiseFlow: 0.9, noiseFlowAngle: 292, noiseOctaves: 5, starIntensity: 0, starScale: 1 },
  garden: { brightness: 0.86, saturation: 0.92, fieldOpacity: 0.56, mistOpacity: 0.34, noiseIntensity: 0.34, noiseFlow: 0.64, noiseFlowAngle: 304, noiseOctaves: 5, starIntensity: 0, starScale: 1 },
  stellar: { brightness: 0.7, saturation: 1.38, fieldOpacity: 0.67, mistOpacity: 0.41, noiseIntensity: 0, noiseFlow: 0.58, noiseFlowAngle: 315, noiseOctaves: 6, starIntensity: 0, starScale: 1 },
}

const lightEffects: Record<HarborScene, FlowEffects> = {
  dusk: { ...darkEffects.dusk, brightness: 1.03, saturation: 0.92, fieldOpacity: 0.56, mistOpacity: 0.22 },
  garden: { ...darkEffects.garden, brightness: 1.01, saturation: 0.86, fieldOpacity: 0.5, mistOpacity: 0.26 },
  stellar: { ...darkEffects.stellar, brightness: 0.88, saturation: 1.08, fieldOpacity: 0.56, mistOpacity: 0.32 },
}

const starfields: Record<HarborScene, StarfieldProfile> = {
  dusk: { enabled: true, count: 34, opacity: 0.16, speed: 0.06, parallax: 0.08, twinkle: 0.16, temperature: 0.24, seed: 20260727 },
  garden: { enabled: true, count: 22, opacity: 0.09, speed: 0.025, parallax: 0.035, twinkle: 0.08, temperature: 0.12, seed: 20260727 },
  stellar: { enabled: true, count: 172, opacity: 0.78, speed: 1, parallax: 1, twinkle: 1, temperature: 0.72, seed: 20260727 },
}

const stellarEffects: Record<HarborScene, StellarEffectsProfile> = {
  dusk: { edgeGlow: 0, perimeterOpacity: 0, perimeterDuration: 0, brandHighlight: 0 },
  garden: { edgeGlow: 0, perimeterOpacity: 0, perimeterDuration: 0, brandHighlight: 0 },
  stellar: { edgeGlow: 0.9, perimeterOpacity: 0.9, perimeterDuration: 7.6, brandHighlight: 0.82 },
}

const renderBudgets: Record<HarborScene, RenderBudget> = {
  dusk: { desktopDpr: 1.2, mobileDpr: 1, maxFps: 30 },
  garden: { desktopDpr: 1.1, mobileDpr: 1, maxFps: 24 },
  stellar: { desktopDpr: 1.25, mobileDpr: 1, maxFps: 24 },
}

const dynamics: Record<HarborScene, Omit<FlowDynamics, 'angle'>> = {
  dusk: { speed: 0.92, fieldScale: 1.08, distortion: 0.78, ribbonStrength: 0.42, noiseScale: 0.86, contrast: 1.02 },
  garden: { speed: 0.58, fieldScale: 0.76, distortion: 0.5, ribbonStrength: 0.7, noiseScale: 1.48, contrast: 0.9 },
  stellar: { speed: 0.72, fieldScale: 1.2, distortion: 1.36, ribbonStrength: 0.3, noiseScale: 0.78, contrast: 1.4 },
}

const profiles: Record<'dark' | 'light', Record<HarborScene, FlowProfileDefinition>> = {
  dark: {
    dusk: { palette: ['#120914', '#3c1732', '#8e3f58', '#dc8065', '#f3bf6b', '#08273c'], dynamics: dynamics.dusk, effects: darkEffects.dusk, starfield: starfields.dusk, stellarEffects: stellarEffects.dusk, renderBudget: renderBudgets.dusk, angle: 318, portraitAngle: 262, portraitPalette: ['#120914', '#8e3f58', '#f3bf6b', '#90bfe0', '#333ca0', '#08273c'] },
    garden: { palette: ['#07150f', '#0b3827', '#1d795c', '#7cab6d', '#d7d08e', '#0b2b27'], dynamics: dynamics.garden, effects: darkEffects.garden, starfield: starfields.garden, stellarEffects: stellarEffects.garden, renderBudget: renderBudgets.garden, angle: 304, portraitAngle: 282, portraitPalette: ['#07150f', '#1d795c', '#d7d08e', '#7cab6d', '#0b3827', '#173f34'] },
    stellar: { palette: ['#59575c', '#2b315f', '#354b7b', '#092243', '#052433', '#061132'], dynamics: dynamics.stellar, effects: darkEffects.stellar, starfield: starfields.stellar, stellarEffects: stellarEffects.stellar, renderBudget: renderBudgets.stellar, angle: 318, portraitAngle: 304, portraitPalette: ['#59575c', '#354b7b', '#092243', '#061132', '#052433', '#2b315f'] },
  },
  light: {
    dusk: { palette: ['#f8eee7', '#efc3b7', '#d8888e', '#7abfc4', '#f1c678', '#7397a9'], dynamics: dynamics.dusk, effects: lightEffects.dusk, starfield: starfields.dusk, stellarEffects: stellarEffects.dusk, renderBudget: renderBudgets.dusk, angle: 318, portraitAngle: 262, portraitPalette: ['#f8eee7', '#d8888e', '#f1c678', '#90bfe0', '#333ca0', '#7397a9'] },
    garden: { palette: ['#eef3dc', '#d5c8e8', '#a8ddd4', '#79be8d', '#d8d98a', '#7ca18c'], dynamics: dynamics.garden, effects: lightEffects.garden, starfield: starfields.garden, stellarEffects: stellarEffects.garden, renderBudget: renderBudgets.garden, angle: 304, portraitAngle: 282, portraitPalette: ['#eef3dc', '#a8ddd4', '#d8d98a', '#79be8d', '#d5c8e8', '#7ca18c'] },
    stellar: { palette: ['#eef2f8', '#c7d2e9', '#849dd0', '#776ea8', '#b5e1df', '#7795a8'], dynamics: dynamics.stellar, effects: lightEffects.stellar, starfield: starfields.stellar, stellarEffects: stellarEffects.stellar, renderBudget: renderBudgets.stellar, angle: 318, portraitAngle: 304, portraitPalette: ['#eef2f8', '#849dd0', '#b5e1df', '#776ea8', '#c7d2e9', '#7795a8'] },
  },
}

export function getFlowProfile(scene: HarborScene, light: boolean, portrait = false): FlowSceneProfile {
  const profile = profiles[light ? 'light' : 'dark'][scene]
  return {
    scene,
    palette: portrait ? (profile.portraitPalette ?? profile.palette) : profile.palette,
    effects: profile.effects,
    dynamics: { ...profile.dynamics, angle: portrait ? (profile.portraitAngle ?? profile.angle) : profile.angle },
    starfield: profile.starfield,
    stellarEffects: profile.stellarEffects,
    renderBudget: profile.renderBudget,
  }
}
