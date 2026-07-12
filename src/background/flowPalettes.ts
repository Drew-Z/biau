export type HarborScene = 'dusk' | 'garden' | 'stellar'
export type FlowPalette = readonly [string, string, string, string, string]
const palettes: Record<'dark' | 'light', Record<HarborScene, FlowPalette>> = {
  dark: { dusk: ['#071019','#102f43','#17647a','#a85f69','#e6b86b'], garden: ['#071512','#123c32','#1f7563','#79a476','#d5c77a'], stellar: ['#080d1b','#17264b','#3f508c','#7167a9','#8ed4d0'] },
  light: { dusk: ['#eaf4f5','#c7e1df','#98c6ca','#dfadb0','#f1d7a0'], garden: ['#edf5ef','#c9dfd1','#91bda8','#b9cf91','#f0dca6'], stellar: ['#edf1f8','#cbd7eb','#a9b8df','#c3b8dc','#b9dedb'] },
}
export const getFlowPalette = (scene: HarborScene, light: boolean) => palettes[light ? 'light' : 'dark'][scene]
