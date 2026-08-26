import type { FlowThemeProfile } from './flowPalettes'

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
uniform float u_angle;
uniform float u_distortion;
uniform float u_fieldOpacity;
uniform float u_mistOpacity;
uniform float u_noiseScale;
uniform float u_noiseIntensity;
uniform float u_noiseFlow;
uniform float u_noiseFlowAngle;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform int u_noiseOctaves;
uniform int u_colorCount;
uniform vec3 u_colors[7];
uniform float u_stops[7];
uniform sampler2D u_noiseTex;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  float a = hash(i), b = hash(i + vec2(1., 0.));
  float c = hash(i + vec2(0., 1.)), d = hash(i + vec2(1., 1.));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0., amplitude = .5;
  mat2 rotate = mat2(.8, -.6, .6, .8);
  for (int i = 0; i < 6; i++) {
    if (i >= u_noiseOctaves) break;
    value += amplitude * noise(p);
    p = rotate * p * 2.03 + 13.7;
    amplitude *= .5;
  }
  return value;
}

vec3 gradientColor(float t) {
  vec3 color = u_colors[0];
  for (int i = 1; i < 7; i++) {
    if (i >= u_colorCount) break;
    float left = u_stops[i - 1];
    float right = max(left + .001, u_stops[i]);
    color = mix(color, u_colors[i], smoothstep(left, right, t));
  }
  return color;
}

vec3 saturateColor(vec3 color, float amount) {
  float gray = dot(color, vec3(.299, .587, .114));
  return mix(vec3(gray), color, amount);
}

void main() {
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.), 1.);
  vec2 p = (v_uv * 2. - 1.) * aspect;
  float time = u_time * .32;
  float distortion = mix(.08, .62, u_distortion);
  float noiseScale = clamp(u_noiseScale, .2, 3.);
  float noiseIntensity = clamp(u_noiseIntensity, 0., 1.);
  float noiseFlow = clamp(u_noiseFlow, 0., 1.);
  vec2 noiseDirection = normalize(vec2(cos(radians(u_noiseFlowAngle)), sin(radians(u_noiseFlowAngle))));
  vec2 noiseNormal = vec2(-noiseDirection.y, noiseDirection.x);
  vec2 drift = noiseDirection * time * mix(.08, 1.18, noiseFlow) + noiseNormal * sin(time * .52) * .28 * noiseFlow;
  vec2 crossDrift = noiseNormal * time * mix(.03, .38, noiseFlow) - noiseDirection * cos(time * .41) * .18 * noiseFlow;
  float low = fbm(p * (.82 * noiseScale) + drift * .62 + crossDrift * .24);
  float mid = low;
  vec2 curl = vec2(0.);
  if (noiseIntensity > 0.) {
    mid = fbm(p * (1.46 * noiseScale) - drift * .38 + crossDrift * .58 + vec2(low * .4, -low * .22));
    float high = fbm(p * (2.55 * noiseScale) + drift * .26 - crossDrift * .44 + vec2(mid * .55, low * .45));
    curl = vec2(low - mid, high - low);
  }
  vec2 center = p - vec2(.18, -.04);
  float swirl = .12 / (.22 + dot(center, center));
  vec2 tangent = vec2(-center.y, center.x) * swirl;
  vec2 flow = v_uv + curl * mix(.12, .34, noiseFlow) * distortion * noiseIntensity + tangent * mix(.26, .78, noiseFlow) * distortion * noiseIntensity + noiseDirection * (low - .5) * .08 * noiseFlow * distortion;
  float angle = radians(u_angle);
  vec2 direction = normalize(vec2(cos(angle), sin(angle)));
  vec2 normal = vec2(-direction.y, direction.x);
  vec2 field = (flow * 2. - 1.) * aspect;
  float axial = dot(field, direction), cross = dot(field, normal);
  vec2 upperCenter = normal * (.82 + sin(time * .72) * .18) - direction * (.34 + cos(time * .51) * .16) + noiseDirection * sin(time * .46) * .22 * noiseFlow;
  vec2 lowerCenter = -normal * (.74 + cos(time * .64) * .16) + direction * (.24 + sin(time * .58) * .14) - noiseDirection * cos(time * .39) * .2 * noiseFlow;
  float broadBend = cross * cross * .58 - cross * .2;
  float upperPull = .32 / (.5 + dot(field - upperCenter, field - upperCenter));
  float lowerPull = .24 / (.56 + dot(field - lowerCenter, field - lowerCenter));
  float waveBend = sin(cross * 1.7 + axial * .55 + low * 1.8 + time * mix(.18, .78, noiseFlow)) * .14;
  float curvedField = axial * .28 + broadBend + upperPull - lowerPull + waveBend;
  curvedField += ((low - .5) * .24 + (mid - .5) * .16 + sin(cross * 2.4 + low * 2.2 + time * mix(.2, .9, noiseFlow)) * .08) * distortion * noiseIntensity;
  float gradientPosition = clamp(curvedField * .78 + .48, 0., 1.);
  vec3 base = gradientColor(gradientPosition);
  float vapor = smoothstep(.12, .94, fbm(p * (.92 * noiseScale) + curl * noiseIntensity + drift * .48));
  float mist = smoothstep(.22, .9, fbm(p * (1.34 * noiseScale) - curl * (.56 * noiseIntensity) - drift * .34 + crossDrift * .28));
  float haze = smoothstep(.08, .96, fbm(p * (.54 * noiseScale) + curl * (.4 * noiseIntensity) - drift * .22));
  vec3 light = mix(base, vec3(.9, 1., .96), vapor * .32 * u_fieldOpacity * mix(.35, 1.15, noiseIntensity));
  vec3 deep = gradientColor(clamp(gradientPosition + (mist - .5) * .16, 0., 1.));
  vec3 color = mix(light, deep, mist * .22);
  vec3 hazeColor = mix(vec3(.92, 1., .98), base, .42);
  color = mix(color, hazeColor, haze * .16 * u_mistOpacity);
  float grain = texture(u_noiseTex, v_uv * u_resolution / 128. + vec2(time * .06, -time * .04)).r;
  color += (grain - .5) * .018;
  color = (color - .5) * u_contrast + .5;
  color = saturateColor(color * u_brightness, u_saturation);
  outColor = vec4(clamp(color, 0., 1.), 1.);
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
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'compile')
  return shader
}

export class FlowRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private resolution: WebGLUniformLocation
  private time: WebGLUniformLocation
  private angle: WebGLUniformLocation
  private distortion: WebGLUniformLocation
  private fieldOpacity: WebGLUniformLocation
  private mistOpacity: WebGLUniformLocation
  private noiseScale: WebGLUniformLocation
  private noiseIntensity: WebGLUniformLocation
  private noiseFlow: WebGLUniformLocation
  private noiseFlowAngle: WebGLUniformLocation
  private brightness: WebGLUniformLocation
  private contrast: WebGLUniformLocation
  private saturation: WebGLUniformLocation
  private noiseOctaves: WebGLUniformLocation
  private colorCount: WebGLUniformLocation
  private colors: WebGLUniformLocation
  private stops: WebGLUniformLocation
  private noiseSampler: WebGLUniformLocation
  private texture: WebGLTexture
  private canvas: RenderCanvas

  constructor(canvas: RenderCanvas, { preserveDrawingBuffer = false }: { preserveDrawingBuffer?: boolean } = {}) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power', preserveDrawingBuffer }) as WebGL2RenderingContext | null
    if (!gl) throw new Error('WebGL2 unavailable')
    this.gl = gl
    const program = gl.createProgram()
    if (!program) throw new Error('program')
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link')
    this.program = program
    this.resolution = gl.getUniformLocation(program, 'u_resolution')!
    this.time = gl.getUniformLocation(program, 'u_time')!
    this.angle = gl.getUniformLocation(program, 'u_angle')!
    this.distortion = gl.getUniformLocation(program, 'u_distortion')!
    this.fieldOpacity = gl.getUniformLocation(program, 'u_fieldOpacity')!
    this.mistOpacity = gl.getUniformLocation(program, 'u_mistOpacity')!
    this.noiseScale = gl.getUniformLocation(program, 'u_noiseScale')!
    this.noiseIntensity = gl.getUniformLocation(program, 'u_noiseIntensity')!
    this.noiseFlow = gl.getUniformLocation(program, 'u_noiseFlow')!
    this.noiseFlowAngle = gl.getUniformLocation(program, 'u_noiseFlowAngle')!
    this.brightness = gl.getUniformLocation(program, 'u_brightness')!
    this.contrast = gl.getUniformLocation(program, 'u_contrast')!
    this.saturation = gl.getUniformLocation(program, 'u_saturation')!
    this.noiseOctaves = gl.getUniformLocation(program, 'u_noiseOctaves')!
    this.colorCount = gl.getUniformLocation(program, 'u_colorCount')!
    this.colors = gl.getUniformLocation(program, 'u_colors[0]')!
    this.stops = gl.getUniformLocation(program, 'u_stops[0]')!
    this.noiseSampler = gl.getUniformLocation(program, 'u_noiseTex')!
    const texture = gl.createTexture()
    if (!texture) throw new Error('texture')
    this.texture = texture
    const noise = new Uint8Array(128 * 128 * 4)
    for (let index = 0; index < noise.length; index += 4) {
      const value = Math.floor(Math.random() * 255)
      noise[index] = value
      noise[index + 1] = value
      noise[index + 2] = value
      noise[index + 3] = 255
    }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, noise)
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

  draw(seconds: number, profile: FlowThemeProfile) {
    const gl = this.gl
    const dynamics = profile.dynamics
    const effects = profile.effects
    const stops = profile.stops ?? profile.palette.map((_, index) => index === profile.palette.length - 1 ? 1 : [0, .19, .41, .64, .86][index] ?? index / Math.max(profile.palette.length - 1, 1))
    gl.useProgram(this.program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1i(this.noiseSampler, 0)
    gl.uniform2f(this.resolution, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.time, seconds * (26 / dynamics.speed))
    gl.uniform1f(this.angle, dynamics.angle)
    gl.uniform1f(this.distortion, dynamics.distortion)
    gl.uniform1f(this.fieldOpacity, dynamics.fieldScale)
    gl.uniform1f(this.mistOpacity, dynamics.ribbonStrength)
    gl.uniform1f(this.noiseScale, dynamics.noiseScale)
    gl.uniform1f(this.noiseIntensity, effects.noiseIntensity)
    gl.uniform1f(this.noiseFlow, effects.noiseFlow)
    gl.uniform1f(this.noiseFlowAngle, effects.noiseFlowAngle)
    gl.uniform1f(this.brightness, effects.brightness)
    gl.uniform1f(this.contrast, dynamics.contrast)
    gl.uniform1f(this.saturation, effects.saturation)
    gl.uniform1i(this.noiseOctaves, effects.noiseOctaves)
    gl.uniform1i(this.colorCount, profile.palette.length)
    gl.uniform3fv(this.colors, profile.palette.flatMap(rgb))
    gl.uniform1fv(this.stops, stops)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  destroy() {
    this.gl.deleteTexture(this.texture)
    this.gl.deleteProgram(this.program)
  }
}
