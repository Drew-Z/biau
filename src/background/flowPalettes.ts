import type { SiteTheme } from '../utils/appearance'

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

export interface FlowThemeProfile {
  theme: SiteTheme
  palette: FlowPalette
  stops?: readonly number[]
  dynamics: FlowDynamics
  effects: FlowEffects
  starfield: StarfieldProfile
  stellarEffects: StellarEffectsProfile
  renderBudget: RenderBudget
}

interface FlowProfileDefinition extends Omit<FlowThemeProfile, 'theme' | 'dynamics'> {
  dynamics: Omit<FlowDynamics, 'angle'>
  angle: number
  portraitAngle?: number
  portraitPalette?: FlowPalette
  portraitStops?: readonly number[]
}

const profiles: Record<SiteTheme, FlowProfileDefinition> = {
  morning: {
    palette: ['#d5566d', '#e9e89d', '#90bfe0', '#333ca0', '#16497b', '#16497b'],
    portraitPalette: ['#d5566d', '#e9e89d', '#90bfe0', '#333ca0', '#16497b', '#16497b'],
    stops: [0, 0.23, 0.47, 0.79, 1, 1],
    portraitStops: [0, 0.4, 0.62, 0.84, 1, 1],
    dynamics: { speed: 15, fieldScale: 0.53, distortion: 0.39, ribbonStrength: 0.33, noiseScale: 0.2, contrast: 1.09 },
    effects: { brightness: 1.02, saturation: 1.1, fieldOpacity: 0.53, mistOpacity: 0.33, noiseIntensity: 0, noiseFlow: 0.76, noiseFlowAngle: 260, noiseOctaves: 6, starIntensity: 0, starScale: 1 },
    starfield: { enabled: true, count: 32, opacity: 0.15, speed: 0.05, parallax: 0.07, twinkle: 0.14, temperature: 0.32, seed: 20260727 },
    stellarEffects: { edgeGlow: 0, perimeterOpacity: 0, perimeterDuration: 0, brandHighlight: 0 },
    renderBudget: { desktopDpr: 1.2, mobileDpr: 1, maxFps: 30 },
    angle: 318,
    portraitAngle: 262,
  },
  nature: {
    palette: ['#e6d6f9', '#c5b2d2', '#98dddf', '#8fd695', '#61a769', '#5b873d'],
    portraitPalette: ['#e6d6f9', '#c5b2d2', '#98dddf', '#8fd695', '#61a769', '#5b873d'],
    stops: [0, 0.06, 0.24, 0.58, 0.74, 1],
    dynamics: { speed: 10, fieldScale: 0.82, distortion: 0.19, ribbonStrength: 0.75, noiseScale: 3, contrast: 1.03 },
    effects: { brightness: 1.02, saturation: 0.85, fieldOpacity: 0.82, mistOpacity: 0.75, noiseIntensity: 0.8, noiseFlow: 1, noiseFlowAngle: 318, noiseOctaves: 6, starIntensity: 0, starScale: 1 },
    starfield: { enabled: true, count: 22, opacity: 0.09, speed: 0.025, parallax: 0.035, twinkle: 0.08, temperature: 0.12, seed: 20260727 },
    stellarEffects: { edgeGlow: 0, perimeterOpacity: 0, perimeterDuration: 0, brandHighlight: 0 },
    renderBudget: { desktopDpr: 1.1, mobileDpr: 1, maxFps: 24 },
    angle: 318,
    portraitAngle: 318,
  },
  stellar: {
    palette: ['#59575c', '#2b315f', '#354b7b', '#092243', '#052433', '#061132'],
    portraitPalette: ['#59575c', '#354b7b', '#092243', '#061132', '#052433', '#2b315f'],
    stops: [0, 0.19, 0.41, 0.64, 0.86, 1],
    dynamics: { speed: 15, fieldScale: 0.67, distortion: 0.71, ribbonStrength: 0.41, noiseScale: 0.2, contrast: 1.41 },
    effects: { brightness: 0.7, saturation: 1.38, fieldOpacity: 0.67, mistOpacity: 0.41, noiseIntensity: 0, noiseFlow: 0.58, noiseFlowAngle: 315, noiseOctaves: 6, starIntensity: 0, starScale: 1 },
    starfield: { enabled: true, count: 172, opacity: 0.78, speed: 1, parallax: 1, twinkle: 1, temperature: 0.72, seed: 20260727 },
    stellarEffects: { edgeGlow: 0.9, perimeterOpacity: 0.9, perimeterDuration: 7.6, brandHighlight: 0.82 },
    renderBudget: { desktopDpr: 1.25, mobileDpr: 1, maxFps: 24 },
    angle: 318,
    portraitAngle: 304,
  },
}

export function getFlowProfile(theme: SiteTheme, portrait = false): FlowThemeProfile {
  const profile = profiles[theme]
  return {
    theme,
    palette: portrait ? (profile.portraitPalette ?? profile.palette) : profile.palette,
    stops: portrait ? (profile.portraitStops ?? profile.stops) : profile.stops,
    effects: profile.effects,
    dynamics: { ...profile.dynamics, angle: portrait ? (profile.portraitAngle ?? profile.angle) : profile.angle },
    starfield: profile.starfield,
    stellarEffects: profile.stellarEffects,
    renderBudget: profile.renderBudget,
  }
}
