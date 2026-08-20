import type { FlowSceneProfile } from './flowPalettes'

type RenderCanvas = HTMLCanvasElement | OffscreenCanvas

const vertex = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * .5 + .5;
  gl_Position = vec4(a_position, 0., 1.);
}`

const fragment = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_colors[5];
uniform float u_speed;
uniform float u_fieldScale;
uniform float u_distortion;
uniform float u_ribbonStrength;
uniform float u_noiseScale;
uniform float u_contrast;
uniform float u_angle;
uniform float u_brightness;
uniform float u_saturation;
uniform float u_noiseFlow;
uniform float u_starIntensity;
uniform float u_starScale;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0., a = .52;
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.2, 9.1);
    a *= .48;
  }
  return v;
}

float starLayer(vec2 uv, float scale, float depth, float seed, float time) {
  vec2 grid = uv * scale;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - .5;
  float n = hash(cell + vec2(seed, seed * 1.73));
  float present = step(.965, n);
  vec2 offset = vec2(hash(cell + seed + 2.1), hash(cell + seed + 8.7)) - .5;
  float radius = length(local - offset * .82);
  float twinkle = .72 + .28 * sin(time * (1.4 + depth * 1.8) + n * 31.);
  float core = (1. - smoothstep(0., .045 / depth, radius)) * present * twinkle;
  float halo = (1. - smoothstep(0., .16 / depth, radius)) * present * .18;
  float flare = (1. - smoothstep(0., .025 / depth, abs(local.x - offset.x))) *
    (1. - smoothstep(0., .025 / depth, abs(local.y - offset.y))) * present * .11;
  return (core + halo + flare) * depth;
}

vec3 applySaturation(vec3 color, float saturation) {
  float luma = dot(color, vec3(.2126, .7152, .0722));
  return mix(vec3(luma), color, saturation);
}

vec3 pal(float t) {
  t = clamp(t, 0., .999);
  float x = t * 4., f = smoothstep(0., 1., fract(x));
  int i = int(floor(x));
  if (i == 0) return mix(u_colors[0], u_colors[1], f);
  if (i == 1) return mix(u_colors[1], u_colors[2], f);
  if (i == 2) return mix(u_colors[2], u_colors[3], f);
  return mix(u_colors[3], u_colors[4], f);
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = v_uv - .5;
  uv.x *= aspect;
  float angle = radians(u_angle - 318.);
  mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  uv = rotation * uv + vec2(aspect * .5, .5);

  float t = u_time * .045 * u_speed;
  vec2 q = vec2(
    fbm(uv * (1.45 * u_noiseScale) + vec2(t * u_noiseFlow, -t * .7 * u_noiseFlow)),
    fbm(uv * (1.3 * u_noiseScale) + vec2(-t * .55 * u_noiseFlow, t * .8 * u_noiseFlow))
  );
  vec2 r = vec2(
    fbm(uv * (2. * u_fieldScale) + q * (1.05 + u_distortion) + vec2(t * .7, 0)),
    fbm(uv * (1.8 * u_fieldScale) + q * (.85 + u_distortion * .65) - vec2(0, t * .5))
  );
  float field = fbm(uv * (1.18 * u_fieldScale) + r * (1.05 + u_distortion * .9) + q * .7);
  float ribbon = smoothstep(.36, .78, field + sin((uv.x + uv.y) * (2.3 * u_fieldScale) + r.x * 2.) * .12);
  float depth = clamp(v_uv.x * .48 + (1. - v_uv.y) * .28 + field * .42, 0., 1.);
  vec3 color = mix(pal(depth), pal(clamp(depth + .2, 0., 1.)), ribbon * u_ribbonStrength);
  color += vec3(1.) * pow(max(0., 1. - abs(field - .57) * 6.), 3.) * .09;
  color = clamp((color - .5) * u_contrast + .5, 0., 1.);
  color = applySaturation(color, u_saturation) * u_brightness;
  float stars = 0.;
  stars += starLayer(v_uv - .5, 74. * u_starScale, .28, 3.1, u_time * .55);
  stars += starLayer(v_uv - .5, 132. * u_starScale, .54, 11.7, u_time * .78);
  stars += starLayer(v_uv - .5, 224. * u_starScale, .92, 27.3, u_time * 1.12);
  vec3 starColor = mix(vec3(.63, .78, 1.), vec3(1., .78, .52), fract(field * 4. + .23));
  color += starColor * stars * u_starIntensity;
  outColor = vec4(color, 1.);
}`

const rgb = (hex: string): [number, number, number] => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'compile')
  }
  return shader
}

export class FlowRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private resolution: WebGLUniformLocation
  private time: WebGLUniformLocation
  private colors: WebGLUniformLocation
  private speed: WebGLUniformLocation
  private fieldScale: WebGLUniformLocation
  private distortion: WebGLUniformLocation
  private ribbonStrength: WebGLUniformLocation
  private noiseScale: WebGLUniformLocation
  private contrast: WebGLUniformLocation
  private angle: WebGLUniformLocation
  private brightness: WebGLUniformLocation
  private saturation: WebGLUniformLocation
  private noiseFlow: WebGLUniformLocation
  private starIntensity: WebGLUniformLocation
  private starScale: WebGLUniformLocation
  private canvas: RenderCanvas

  constructor(canvas: RenderCanvas, { preserveDrawingBuffer = false }: { preserveDrawingBuffer?: boolean } = {}) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer,
    }) as WebGL2RenderingContext | null
    if (!gl) throw new Error('WebGL2 unavailable')
    this.gl = gl
    const program = gl.createProgram()
    if (!program) throw new Error('program')
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'link')
    }
    this.program = program
    this.resolution = gl.getUniformLocation(program, 'u_resolution')!
    this.time = gl.getUniformLocation(program, 'u_time')!
    this.colors = gl.getUniformLocation(program, 'u_colors[0]')!
    this.speed = gl.getUniformLocation(program, 'u_speed')!
    this.fieldScale = gl.getUniformLocation(program, 'u_fieldScale')!
    this.distortion = gl.getUniformLocation(program, 'u_distortion')!
    this.ribbonStrength = gl.getUniformLocation(program, 'u_ribbonStrength')!
    this.noiseScale = gl.getUniformLocation(program, 'u_noiseScale')!
    this.contrast = gl.getUniformLocation(program, 'u_contrast')!
    this.angle = gl.getUniformLocation(program, 'u_angle')!
    this.brightness = gl.getUniformLocation(program, 'u_brightness')!
    this.saturation = gl.getUniformLocation(program, 'u_saturation')!
    this.noiseFlow = gl.getUniformLocation(program, 'u_noiseFlow')!
    this.starIntensity = gl.getUniformLocation(program, 'u_starIntensity')!
    this.starScale = gl.getUniformLocation(program, 'u_starScale')!

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  }

  resize(width: number, height: number, dpr: number) {
    this.canvas.width = Math.max(1, Math.round(width * dpr))
    this.canvas.height = Math.max(1, Math.round(height * dpr))
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  draw(seconds: number, profile: FlowSceneProfile) {
    const gl = this.gl
    const values = profile.dynamics
    gl.useProgram(this.program)
    gl.uniform2f(this.resolution, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.time, seconds)
    gl.uniform3fv(this.colors, profile.palette.flatMap(rgb))
    gl.uniform1f(this.speed, values.speed)
    gl.uniform1f(this.fieldScale, values.fieldScale)
    gl.uniform1f(this.distortion, values.distortion)
    gl.uniform1f(this.ribbonStrength, values.ribbonStrength)
    gl.uniform1f(this.noiseScale, values.noiseScale)
    gl.uniform1f(this.contrast, values.contrast)
    gl.uniform1f(this.angle, values.angle)
    gl.uniform1f(this.brightness, profile.effects.brightness)
    gl.uniform1f(this.saturation, profile.effects.saturation)
    gl.uniform1f(this.noiseFlow, profile.effects.noiseFlow)
    gl.uniform1f(this.starIntensity, profile.effects.starIntensity)
    gl.uniform1f(this.starScale, profile.effects.starScale)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  destroy() {
    this.gl.deleteProgram(this.program)
  }
}
