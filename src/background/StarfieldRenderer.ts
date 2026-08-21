import type { StarfieldProfile } from './flowPalettes'

interface Star {
  x: number
  y: number
  depth: number
  radius: number
  alpha: number
  phase: number
  temperature: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let next = Math.imul(value ^ (value >>> 15), 1 | value)
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function mixChannel(start: number, end: number, amount: number) {
  return Math.round(start + (end - start) * amount)
}

export class StarfieldRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private stars: Star[] = []
  private profile?: StarfieldProfile
  private profileSignature = ''
  private width = 1
  private height = 1
  private dpr = 1
  private pointerX = 0
  private pointerY = 0
  private scroll = 0

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Canvas2D unavailable')
    this.canvas = canvas
    this.context = context
  }

  resize(width: number, height: number, dpr: number) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.dpr = Math.max(1, dpr)
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr))
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr))
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.context.clearRect(0, 0, this.width, this.height)
  }

  setProfile(profile: StarfieldProfile) {
    const signature = JSON.stringify(profile)
    if (signature === this.profileSignature) return
    this.profileSignature = signature
    this.profile = profile
    this.stars = []
    if (!profile.enabled || profile.count <= 0) return

    const random = seededRandom(profile.seed)
    const depths = [0.22, 0.48, 0.76, 1.08]
    this.stars = Array.from({ length: profile.count }, (_, index) => {
      const layer = index % depths.length
      const depth = depths[layer]
      return {
        x: random(),
        y: random(),
        depth: depth + (random() - 0.5) * 0.08,
        radius: (0.18 + random() * random() * 1.8) * (0.66 + depth * 0.44),
        alpha: 0.24 + random() * 0.62,
        phase: random() * Math.PI * 2,
        temperature: random(),
      }
    })
  }

  setPointer(x: number, y: number) {
    this.pointerX = clamp(x, -1, 1)
    this.pointerY = clamp(y, -1, 1)
  }

  setScroll(progress: number) {
    this.scroll = clamp(progress, -1, 1)
  }

  draw(seconds: number, profile: StarfieldProfile = this.profile ?? {
    enabled: false,
    count: 0,
    opacity: 0,
    speed: 0,
    parallax: 0,
    twinkle: 0,
    temperature: 0,
    seed: 0,
  }) {
    this.setProfile(profile)
    const context = this.context
    context.clearRect(0, 0, this.width, this.height)
    if (!profile.enabled || profile.opacity <= 0) return

    for (const star of this.stars) {
      const drift = seconds * profile.speed * star.depth
      const visualDepth = clamp(star.depth, 0.12, 1.12)
      const parallaxDepth = visualDepth * visualDepth
      const x = ((star.x + drift * 0.018) % 1) * this.width + this.pointerX * profile.parallax * 52 * parallaxDepth
      const y = ((star.y + this.scroll * profile.parallax * 0.02) % 1) * this.height + this.pointerY * profile.parallax * 42 * parallaxDepth
      const timeMs = seconds * 1000
      const twinkle = profile.twinkle <= 0
        ? 1
        : 0.94 + Math.sin(timeMs * 0.00055 * profile.speed + star.phase) * (0.025 + visualDepth * 0.045)
          + Math.sin(timeMs * 0.0017 + star.phase * 1.7) * 0.018
      const intensity = clamp(profile.opacity * star.alpha * twinkle * (0.58 + visualDepth * 0.42), 0, 1)
      const warmth = clamp(profile.temperature * (0.45 + star.temperature * 0.7), 0, 1)
      const red = mixChannel(148, 255, warmth)
      const green = mixChannel(197, 224, warmth)
      const blue = mixChannel(255, 184, warmth)
      const radius = star.radius * (0.74 + visualDepth * 0.38)

      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${intensity})`
      context.beginPath()
      context.arc((x + this.width) % this.width, (y + this.height) % this.height, radius, 0, Math.PI * 2)
      context.fill()

      if (star.depth > 0.8 && intensity > 0.34) {
        context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${intensity * 0.22})`
        context.lineWidth = 0.45
        context.beginPath()
        context.moveTo((x + this.width) % this.width - radius * 3.6, (y + this.height) % this.height)
        context.lineTo((x + this.width) % this.width + radius * 3.6, (y + this.height) % this.height)
        context.moveTo((x + this.width) % this.width, (y + this.height) % this.height - radius * 3.6)
        context.lineTo((x + this.width) % this.width, (y + this.height) % this.height + radius * 3.6)
        context.stroke()
      }
    }
  }

  clear() {
    this.context.clearRect(0, 0, this.width, this.height)
  }

  destroy() {
    this.clear()
    this.stars = []
    this.profile = undefined
  }
}
