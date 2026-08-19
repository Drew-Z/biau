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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.2, 9.1);
    a *= .48;
  }
  return v;
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
    fbm(uv * (1.45 * u_noiseScale) + vec2(t, -t * .7)),
    fbm(uv * (1.3 * u_noiseScale) + vec2(-t * .55, t * .8))
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
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  destroy() {
    this.gl.deleteProgram(this.program)
  }
}
