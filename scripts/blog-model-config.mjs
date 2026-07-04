import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const defaultEnvPath = resolve(repoRoot, '.env.local')

export const supportedProfiles = ['default', 'strong', 'fast', 'review']
export const modelConfigFields = ['BASE_URL', 'API_KEY', 'MODEL', 'PROVIDER', 'TEMPERATURE']
export const setupProfileOrder = ['strong', 'review', 'fast']

export const profileRecommendations = {
  default: {
    role: 'shared fallback',
    label: 'Shared fallback channel',
    recommendation: 'Use only as a compatibility fallback.',
    modelExamples: ['openai-compatible-model'],
    providerExamples: ['openai-compatible'],
    defaultTemperature: '0.65',
  },
  strong: {
    role: 'generation',
    label: 'Generation model',
    recommendation: 'GLM-5.2 or Gemini 3.1 Pro for long-form Chinese technical drafts.',
    modelExamples: ['glm-5.2', 'gemini-3.1-pro'],
    providerExamples: ['glm', 'gemini', 'relay-main'],
    defaultTemperature: '0.65',
  },
  review: {
    role: 'polish',
    label: 'Polishing model',
    recommendation: 'DeepSeek V4 Pro for structure, tone, density, and lower AI-smell rewrites.',
    modelExamples: ['deepseek-v4-pro'],
    providerExamples: ['deepseek', 'relay-review'],
    defaultTemperature: '0.2',
  },
  fast: {
    role: 'fast helper',
    label: 'Fast helper model',
    recommendation: 'Gemini 3.5 Flash for titles, outlines, summaries, and low-risk checks.',
    modelExamples: ['gemini-3.5-flash'],
    providerExamples: ['gemini', 'relay-fast'],
    defaultTemperature: '0.35',
  },
}

const legacyFieldKeys = {
  BASE_URL: 'GEMINI_BASE_URL',
  API_KEY: 'GEMINI_API_KEY',
  MODEL: 'GEMINI_MODEL',
  PROVIDER: '',
  TEMPERATURE: 'GEMINI_TEMPERATURE',
}

const fallbackValues = {
  BASE_URL: 'http://localhost:8317',
  API_KEY: '',
  MODEL: 'gemini',
  TEMPERATURE: '0.65',
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key)
}

export function repoRelativePath(filePath) {
  const value = relative(repoRoot, filePath).replace(/\\/g, '/')
  return value || '.'
}

export function normalizeProfile(value) {
  const profile = String(value ?? '').trim().toLowerCase()
  return profile || 'default'
}

export function profileEnvPrefix(profileInput) {
  const profile = normalizeProfile(profileInput)
  if (profile === 'default') return ''
  const suffix = profile.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  return `BLOG_DRAFT_${suffix}_`
}

export function profileFieldKey(profileInput, field) {
  const profile = normalizeProfile(profileInput)
  return profile === 'default' ? `BLOG_DRAFT_${field}` : `${profileEnvPrefix(profile)}${field}`
}

export function profileFieldKeys(profileInput) {
  return Object.fromEntries(modelConfigFields.map((field) => [field, profileFieldKey(profileInput, field)]))
}

export function fallbackEnvPrefix(profileInput, index) {
  const profile = normalizeProfile(profileInput)
  const normalizedIndex = normalizeFallbackIndex(index)
  return profile === 'default'
    ? `BLOG_DRAFT_FALLBACK_${normalizedIndex}_`
    : `${profileEnvPrefix(profile)}FALLBACK_${normalizedIndex}_`
}

export function fallbackFieldKey(profileInput, index, field) {
  return `${fallbackEnvPrefix(profileInput, index)}${field}`
}

export function fallbackFieldKeys(profileInput, index) {
  return Object.fromEntries(modelConfigFields.map((field) => [field, fallbackFieldKey(profileInput, index, field)]))
}

export function normalizeFallbackIndex(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return parsed
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function discoverFallbackIndexes(profileInput, source = process.env) {
  const profile = normalizeProfile(profileInput)
  const prefix = profile === 'default' ? 'BLOG_DRAFT_FALLBACK_' : `${profileEnvPrefix(profile)}FALLBACK_`
  const fieldPattern = modelConfigFields.join('|')
  const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)_(${fieldPattern})$`)
  const indexes = new Set()
  for (const key of Object.keys(source)) {
    const match = key.match(pattern)
    if (!match) continue
    const index = normalizeFallbackIndex(match[1])
    if (index > 0) indexes.add(index)
  }
  return Array.from(indexes).sort((a, b) => a - b)
}

export function nextFallbackIndex(profileInput, source = process.env) {
  const indexes = discoverFallbackIndexes(profileInput, source)
  return indexes.length === 0 ? 1 : Math.max(...indexes) + 1
}

export function getProfileRecommendation(profileInput) {
  const profile = normalizeProfile(profileInput)
  return profileRecommendations[profile] ?? {
    role: 'custom',
    label: `${profile} custom model`,
    recommendation: 'Custom OpenAI-compatible model profile.',
    modelExamples: [`${profile}-model-id`],
    providerExamples: [`${profile}-relay`],
    defaultTemperature: '0.65',
  }
}

export function normalizeBaseUrl(value) {
  return String(value ?? '').trim().replace(/\/+$/, '')
}

export function buildChatCompletionsUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl)
  return normalized.endsWith('/v1')
    ? `${normalized}/chat/completions`
    : `${normalized}/v1/chat/completions`
}

export function unquoteEnvValue(value) {
  const trimmed = String(value ?? '').trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function parseEnvText(text) {
  const values = new Map()
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/)
    if (!match) continue
    values.set(match[1], unquoteEnvValue(match[2]))
  }
  return values
}

export async function readEnvFileValues(filePath = defaultEnvPath) {
  if (!existsSync(filePath)) return new Map()
  return parseEnvText(await readFile(filePath, 'utf8'))
}

export async function loadLocalEnv(filePath = defaultEnvPath, target = process.env) {
  const values = await readEnvFileValues(filePath)
  for (const [key, value] of values.entries()) {
    if (hasOwn(target, key)) continue
    target[key] = value
  }
}

export function resolveProfileEnv(profileInput, field, source = process.env) {
  const profile = normalizeProfile(profileInput)
  const candidates = []
  if (profile !== 'default') {
    candidates.push({ source: 'profile', key: profileFieldKey(profile, field) })
  }
  candidates.push({ source: 'default', key: `BLOG_DRAFT_${field}` })

  const legacyKey = legacyFieldKeys[field]
  if (legacyKey) candidates.push({ source: 'legacy', key: legacyKey })

  for (const candidate of candidates) {
    if (hasOwn(source, candidate.key)) {
      return { ...candidate, value: source[candidate.key] ?? '' }
    }
  }

  const fallback = field === 'PROVIDER'
    ? (profile === 'default' ? 'openai-compatible' : `${profile}-profile`)
    : (fallbackValues[field] ?? '')

  return { source: 'fallback', key: '', value: fallback }
}

export function resolveFallbackEnv(profileInput, indexInput, field, source = process.env) {
  const profile = normalizeProfile(profileInput)
  const index = normalizeFallbackIndex(indexInput)
  const key = fallbackFieldKey(profile, index, field)
  if (hasOwn(source, key)) {
    return { source: `fallback-${index}`, key, value: source[key] ?? '' }
  }

  if (field === 'PROVIDER') {
    return { source: 'derived', key: '', value: `${profile}-fallback-${index}` }
  }

  if (field === 'TEMPERATURE') {
    return { source: 'profile-default', key: '', value: getProfileRecommendation(profile).defaultTemperature }
  }

  return { source: 'missing', key, value: '' }
}

export function readTemperature(profile, source = process.env) {
  const resolution = resolveProfileEnv(profile, 'TEMPERATURE', source)
  const value = Number(resolution.value)
  return Number.isFinite(value) ? value : 0.65
}

function readTemperatureFromResolution(profile, resolution) {
  const value = Number(resolution.value)
  if (Number.isFinite(value)) return value
  const fallback = Number(getProfileRecommendation(profile).defaultTemperature)
  return Number.isFinite(fallback) ? fallback : 0.65
}

function buildChannelFromResolutions(profileInput, role, index, resolutions) {
  const profile = normalizeProfile(profileInput)
  const normalizedIndex = role === 'fallback' ? normalizeFallbackIndex(index) : 0
  return {
    profile,
    role,
    index: normalizedIndex,
    label: role === 'fallback' ? `fallback-${normalizedIndex}` : 'primary',
    baseUrl: normalizeBaseUrl(resolutions.BASE_URL.value),
    apiKey: String(resolutions.API_KEY.value ?? ''),
    model: String(resolutions.MODEL.value ?? ''),
    provider: String(resolutions.PROVIDER.value ?? ''),
    temperature: readTemperatureFromResolution(profile, resolutions.TEMPERATURE),
    resolutions,
  }
}

export function readDraftModelConfig(profileInput = '', source = process.env) {
  const selectedProfile = normalizeProfile(profileInput || source.BLOG_DRAFT_PROFILE)
  const resolutions = Object.fromEntries(
    modelConfigFields.map((field) => [field, resolveProfileEnv(selectedProfile, field, source)]),
  )

  return buildChannelFromResolutions(selectedProfile, 'primary', 0, resolutions)
}

export function readDraftModelFallbackConfig(profileInput, index, source = process.env) {
  const selectedProfile = normalizeProfile(profileInput)
  const normalizedIndex = normalizeFallbackIndex(index)
  const resolutions = Object.fromEntries(
    modelConfigFields.map((field) => [field, resolveFallbackEnv(selectedProfile, normalizedIndex, field, source)]),
  )

  return buildChannelFromResolutions(selectedProfile, 'fallback', normalizedIndex, resolutions)
}

export function readDraftModelChannels(profileInput = '', source = process.env) {
  const selectedProfile = normalizeProfile(profileInput || source.BLOG_DRAFT_PROFILE)
  const primary = readDraftModelConfig(selectedProfile, source)
  const fallbackIndexes = discoverFallbackIndexes(selectedProfile, source)
  const fallbacks = fallbackIndexes.map((index) => readDraftModelFallbackConfig(selectedProfile, index, source))
  return {
    profile: selectedProfile,
    primary,
    fallbacks,
    channels: [primary, ...fallbacks],
  }
}

export function hasUsableValue(value) {
  return String(value ?? '').trim().length > 0
}

export function validateDraftModelChannel(config) {
  const issues = []
  if (!hasUsableValue(config.baseUrl)) {
    issues.push({
      code: 'missing_base_url',
      message: `Missing model base URL for ${config.profile} ${config.label ?? 'channel'}.`,
    })
  }
  if (!hasUsableValue(config.apiKey)) {
    issues.push({
      code: 'missing_api_key',
      message: `Missing API key for ${config.profile} ${config.label ?? 'channel'}.`,
    })
  }
  if (!hasUsableValue(config.model)) {
    issues.push({
      code: 'missing_model',
      message: `Missing model id for ${config.profile} ${config.label ?? 'channel'}.`,
    })
  }
  return issues
}

export function validateDraftModelConfig(config) {
  return validateDraftModelChannel(config)
}

export function buildModelChannelStatus(config, primaryModel = '') {
  const issues = validateDraftModelChannel(config)
  const warnings = []
  if (config.role === 'fallback' && primaryModel && config.model && config.model !== primaryModel) {
    warnings.push(`fallback model differs from primary model (${primaryModel}). Confirm this is an equivalent same-role channel.`)
  }
  return {
    profile: config.profile,
    role: config.role,
    index: config.index,
    label: config.label,
    ok: issues.length === 0,
    provider: {
      value: config.provider,
      source: config.resolutions.PROVIDER.source,
      key: config.resolutions.PROVIDER.key,
      set: hasUsableValue(config.provider),
    },
    model: {
      value: config.model,
      source: config.resolutions.MODEL.source,
      key: config.resolutions.MODEL.key,
      set: hasUsableValue(config.model),
    },
    temperature: {
      value: config.temperature,
      source: config.resolutions.TEMPERATURE.source,
      key: config.resolutions.TEMPERATURE.key,
    },
    baseUrl: {
      set: hasUsableValue(config.baseUrl),
      source: config.resolutions.BASE_URL.source,
      key: config.resolutions.BASE_URL.key,
    },
    apiKey: {
      set: hasUsableValue(config.apiKey),
      source: config.resolutions.API_KEY.source,
      key: config.resolutions.API_KEY.key,
    },
    issues,
    warnings,
  }
}

export function buildModelConfigStatus(config) {
  return buildModelChannelStatus(config)
}

export function redactSensitiveText(value) {
  return String(value ?? '')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/https?:\/\/[^\s"',)]+/gi, '[redacted-url]')
    .replace(/\bsk-[A-Za-z0-9._-]{8,}\b/g, '[redacted-token]')
    .replace(/\bAIza[A-Za-z0-9._-]{8,}\b/g, '[redacted-token]')
    .replace(/((?:api[_-]?key|token|authorization)["']?\s*[:=]\s*["']?)[^"',\s)]+/gi, '$1[redacted]')
}

export function formatEnvValue(value) {
  return String(value ?? '').trim()
}

export async function updateEnvFileValues(filePath, updates) {
  await mkdir(dirname(filePath), { recursive: true })
  const existing = existsSync(filePath) ? await readFile(filePath, 'utf8') : ''
  const lines = existing ? existing.split(/\r?\n/) : []
  const pending = new Map(
    Object.entries(updates).filter(([, value]) => value !== undefined).map(([key, value]) => [key, formatEnvValue(value)]),
  )
  const applied = new Set()
  const nextLines = []

  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/)
    if (!match || !pending.has(match[1])) {
      nextLines.push(line)
      continue
    }

    const key = match[1]
    if (!applied.has(key)) {
      nextLines.push(`${key}=${pending.get(key)}`)
      applied.add(key)
    }
    pending.delete(key)
  }

  if (pending.size > 0) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() !== '') nextLines.push('')
    nextLines.push('# Blog draft model profile configured by blog:model setup')
    for (const [key, value] of pending.entries()) {
      nextLines.push(`${key}=${value}`)
      applied.add(key)
    }
  }

  const content = `${nextLines.join('\n').replace(/\n*$/, '')}\n`
  await writeFile(filePath, content, 'utf8')
  return { path: repoRelativePath(filePath), keys: Array.from(applied) }
}
