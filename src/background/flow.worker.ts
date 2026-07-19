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
      motionToken: number
    }
  | { type: 'resize'; width: number; height: number; dpr: number; motionToken: number }
  | { type: 'palette'; palette: FlowPalette; motionToken: number }
  | { type: 'motion'; reducedMotion: boolean; running: boolean; motionToken: number }

let renderer: FlowRenderer | undefined
let palette: FlowPalette | undefined
let requestedRunning = false
let reducedMotion = false
let timer: ReturnType<typeof setTimeout> | undefined
let start = performance.now()
let motionToken = 0

function cancelFrame() {
  if (!timer) return
  clearTimeout(timer)
  timer = undefined
}

function drawFrame() {
  if (!renderer || !palette) return
  renderer.draw(reducedMotion ? 0 : (performance.now() - start) / 1000, palette)
  self.postMessage({ type: 'frame' })
}

function frame(token = motionToken) {
  cancelFrame()
  if (token !== motionToken) return
  drawFrame()
  if (requestedRunning && !reducedMotion) {
    timer = setTimeout(() => frame(token), 1000 / 30)
  }
}

function postMotionSettled(token: number) {
  self.postMessage({
    type: 'motion-settled',
    reducedMotion,
    running: requestedRunning,
    motionToken: token,
  })
}

function updateMotion(nextReducedMotion: boolean, nextRequestedRunning: boolean, nextMotionToken: number) {
  if (nextMotionToken < motionToken) return
  const wasAnimating = requestedRunning && !reducedMotion
  const willAnimate = nextRequestedRunning && !nextReducedMotion
  cancelFrame()
  motionToken = nextMotionToken
  reducedMotion = nextReducedMotion
  requestedRunning = nextRequestedRunning
  if (!wasAnimating && willAnimate) start = performance.now()
  frame(motionToken)
  postMotionSettled(motionToken)
}

self.onmessage = ({ data }: MessageEvent<Message>) => {
  try {
    if (data.type === 'init') {
      // A retained buffer keeps a runtime reduced-motion switch visibly stable.
      renderer = new FlowRenderer(data.canvas, { preserveDrawingBuffer: true })
      palette = data.palette
      renderer.resize(data.width, data.height, data.dpr)
      start = performance.now()
      updateMotion(data.reducedMotion, data.running, data.motionToken)
    } else if (data.type === 'resize') {
      renderer?.resize(data.width, data.height, data.dpr)
      if (!requestedRunning || reducedMotion) drawFrame()
    } else if (data.type === 'palette') {
      palette = data.palette
      if (!requestedRunning || reducedMotion) drawFrame()
    } else {
      updateMotion(data.reducedMotion, data.running, data.motionToken)
    }
  } catch (error) {
    cancelFrame()
    requestedRunning = false
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Flow worker failed' })
  }
}
