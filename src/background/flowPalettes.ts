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

const stellarProfile: FlowSceneProfile = {
  scene: 'stellar',
  palette: ['#59575c', '#2b315f', '#354b7b', '#092243', '#052433', '#061132'],
  dynamics: {
    speed: 0.72,
    fieldScale: 1.2,
    distortion: 1.36,
    ribbonStrength: 0.3,
    noiseScale: 0.78,
    contrast: 1.4,
    angle: 318,
  },
  effects: {
    brightness: 0.7,
    saturation: 1.38,
    fieldOpacity: 0.67,
    mistOpacity: 0.41,
    noiseIntensity: 0,
    noiseFlow: 0.58,
    noiseFlowAngle: 315,
    noiseOctaves: 6,
    starIntensity: 0,
    starScale: 1,
  },
  starfield: {
    enabled: true,
    count: 172,
    opacity: 0.78,
    speed: 1,
    parallax: 1,
    twinkle: 1,
    temperature: 0.72,
    seed: 20260727,
  },
  stellarEffects: {
    edgeGlow: 0.9,
    perimeterOpacity: 0.9,
    perimeterDuration: 7.6,
    brandHighlight: 0.82,
  },
  renderBudget: {
    desktopDpr: 1.25,
    mobileDpr: 1,
    maxFps: 24,
  },
}

export function getFlowProfile(..._compatibility: [HarborScene, boolean, boolean?]): FlowSceneProfile {
  void _compatibility
  return stellarProfile
}
