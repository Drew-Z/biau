import { FlowRenderer } from './FlowRenderer'
import type { FlowPalette } from './flowPalettes'

type Message =
  | {
      type: 'init'
      canvas: OffscreenCanvas
      width: number
      height: number
      dpr: number
      palette: FlowPalette
      reducedMotion: boolean
      running: boolean
    }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'palette'; palette: FlowPalette }
  | { type: 'motion'; reducedMotion: boolean; running: boolean }

let renderer: FlowRenderer | undefined
let palette: FlowPalette | undefined
let requestedRunning = false
let reducedMotion = false
let timer: ReturnType<typeof setTimeout> | undefined
let start = performance.now()

function cancelFrame() {
  if (!timer) return
  clearTimeout(timer)
  timer = undefined
}

function frame() {
  cancelFrame()
  if (!renderer || !palette) return
  renderer.draw(reducedMotion ? 0 : (performance.now() - start) / 1000, palette)
  self.postMessage({ type: 'frame' })
  if (requestedRunning && !reducedMotion) timer = setTimeout(frame, 1000 / 30)
}

function updateMotion(nextReducedMotion: boolean, nextRequestedRunning: boolean) {
  const wasAnimating = requestedRunning && !reducedMotion
  const willAnimate = nextRequestedRunning && !nextReducedMotion
  reducedMotion = nextReducedMotion
  requestedRunning = nextRequestedRunning
  if (!wasAnimating && willAnimate) start = performance.now()
  frame()
}

self.onmessage = ({ data }: MessageEvent<Message>) => {
  try {
    if (data.type === 'init') {
      // A retained buffer keeps a runtime reduced-motion switch visibly stable.
      renderer = new FlowRenderer(data.canvas, { preserveDrawingBuffer: true })
      palette = data.palette
      renderer.resize(data.width, data.height, data.dpr)
      start = performance.now()
      updateMotion(data.reducedMotion, data.running)
    } else if (data.type === 'resize') {
      renderer?.resize(data.width, data.height, data.dpr)
      frame()
    } else if (data.type === 'palette') {
      palette = data.palette
      frame()
    } else {
      updateMotion(data.reducedMotion, data.running)
    }
  } catch (error) {
    cancelFrame()
    requestedRunning = false
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Flow worker failed' })
  }
}
