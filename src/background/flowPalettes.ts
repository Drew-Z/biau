import type { HarborScene } from '../utils/appearance'

export type { HarborScene } from '../utils/appearance'
export type FlowPalette = readonly [string, string, string, string, string]
const palettes: Record<'dark' | 'light', Record<HarborScene, FlowPalette>> = {
  dark: {
    dusk: ['#120914', '#3c1732', '#8e3f58', '#dc8065', '#f3bf6b'],
    garden: ['#07150f', '#0b3827', '#1d795c', '#7cab6d', '#d7d08e'],
    stellar: ['#040713', '#101c42', '#263c7e', '#6b62b5', '#7fd9dc'],
  },
  light: {
    dusk: ['#f8eee7', '#efc3b7', '#d8888e', '#7abfc4', '#f1c678'],
    garden: ['#eef3dc', '#d5c8e8', '#a8ddd4', '#79be8d', '#d8d98a'],
    stellar: ['#eef2f8', '#c7d2e9', '#849dd0', '#776ea8', '#b5e1df'],
  },
}
export const getFlowPalette = (scene: HarborScene, light: boolean) => palettes[light ? 'light' : 'dark'][scene]
