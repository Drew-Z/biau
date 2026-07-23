import { env } from './env.js'
import { aiDailyGenerationRoles, type AiDailyGenerationRole } from './aiDailyGeneration.js'

export const aiDailyModelRuntimeSchemaVersion = 'ai-daily-model-runtime-v2'
export const aiDailyModelProtocol = 'responses' as const

export interface AiDailyModelRuntimeChannel {
  id: string
  providerRef: string
  failureDomainRef: string
  protocol: typeof aiDailyModelProtocol
  baseUrl: string
  apiKey: string
  modelIdentifier: string
  timeoutMs: number
}

export interface AiDailyModelRuntimeCandidate {
  candidateId: string
  role: AiDailyGenerationRole
  channelId: string
}

export interface AiDailyModelRuntimeConfig {
  schemaVersion: typeof aiDailyModelRuntimeSchemaVersion
  channels: AiDailyModelRuntimeChannel[]
  candidates: AiDailyModelRuntimeCandidate[]
}

export type AiDailyModelRuntimeParseResult =
  | { ok: true; config: AiDailyModelRuntimeConfig }
  | { ok: false; issues: string[] }

export interface AiDailyModelRuntimeSummary {
  channelCount: number
  candidateCount: number
  configuredChannelCount: number
  roles: Record<AiDailyGenerationRole, number>
  failureDomains: string[]
}

export interface AiDailyModelEvaluationPoolSummary {
  roles: Record<AiDailyGenerationRole, {
    candidateCount: number
    failureDomainCount: number
    reducedRedundancy: boolean
  }>
  reducedRedundancyRoles: AiDailyGenerationRole[]
}

/**
 * Validate the candidate count before a real evaluation starts. A provider
 * catalog may expose many model ids, but shared failure domains are not
 * independent failover. Reduced-redundancy comparison is therefore an
 * explicit opt-in for the evaluation command.
 */
export function validateAiDailyModelEvaluationPool(
  config: AiDailyModelRuntimeConfig,
  options: { allowReducedRedundancy?: boolean } = {},
): AiDailyModelEvaluationPoolSummary {
  const roles = Object.fromEntries(aiDailyGenerationRoles.map((role) => {
    const candidates = config.candidates.filter((candidate) => candidate.role === role)
    if (candidates.length < 2 || candidates.length > 3) {
      throw new Error(`ai-daily-${role}-candidate-count-must-be-2-or-3`)
    }
    const failureDomains = new Set(candidates.map((candidate) => {
      const resolved = resolveAiDailyRuntimeCandidate(config, candidate.candidateId)
      return resolved?.channel.failureDomainRef ?? ''
    }))
    const reducedRedundancy = failureDomains.size < 2
    if (reducedRedundancy && options.allowReducedRedundancy !== true) {
      throw new Error(`ai-daily-${role}-independent-failure-domain-required`)
    }
    return [role, {
      candidateCount: candidates.length,
      failureDomainCount: failureDomains.size,
      reducedRedundancy,
    }]
  })) as AiDailyModelEvaluationPoolSummary['roles']
  return {
    roles,
    reducedRedundancyRoles: aiDailyGenerationRoles.filter((role) => roles[role].reducedRedundancy),
  }
}

export function readAiDailyModelRuntimeConfig(
  raw = env.aiDailyModelRuntimeJson,
  options: { allowLocalBaseUrl?: boolean } = {},
): AiDailyModelRuntimeParseResult {
  if (!raw.trim()) return { ok: false, issues: ['runtime-config-missing'] }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, issues: ['runtime-config-json-invalid'] }
  }
  return normalizeAiDailyModelRuntimeConfig(parsed, options)
}

export function normalizeAiDailyModelRuntimeConfig(
  value: unknown,
  options: { allowLocalBaseUrl?: boolean } = {},
): AiDailyModelRuntimeParseResult {
  const issues: string[] = []
  if (!isRecord(value)) return { ok: false, issues: ['runtime-config-object-required'] }
  if (value.schemaVersion !== aiDailyModelRuntimeSchemaVersion) issues.push('runtime-config-schema-version-invalid')
  const rawChannels = value.channels
  const rawCandidates = value.candidates
  if (!Array.isArray(rawChannels) || !Array.isArray(rawCandidates)) {
    if (!Array.isArray(rawChannels)) issues.push('runtime-config-channels-required')
    if (!Array.isArray(rawCandidates)) issues.push('runtime-config-candidates-required')
    return { ok: false, issues }
  }
  if (issues.length > 0) return { ok: false, issues }

  const channels: AiDailyModelRuntimeChannel[] = []
  const channelIds = new Set<string>()
  for (const [index, raw] of rawChannels.entries()) {
    if (!isRecord(raw)) {
      issues.push(`channels[${index}].object-required`)
      continue
    }
    const id = readSlug(raw.id)
    const providerRef = readSlug(raw.providerRef)
    const failureDomainRef = readSlug(raw.failureDomainRef)
    const protocol = raw.protocol === aiDailyModelProtocol ? aiDailyModelProtocol : null
    const baseUrl = readUrl(raw.baseUrl, options.allowLocalBaseUrl === true)
    const apiKey = readBoundedString(raw.apiKey, 800)
    const modelIdentifier = readModelIdentifier(raw.modelIdentifier ?? raw.model)
    const timeoutMs = readInteger(raw.timeoutMs, 5_000, 180_000) ?? 20_000
    if (!id) issues.push(`channels[${index}].id-invalid`)
    if (!providerRef) issues.push(`channels[${index}].provider-ref-invalid`)
    if (!failureDomainRef) issues.push(`channels[${index}].failure-domain-ref-invalid`)
    if (!protocol) issues.push(`channels[${index}].protocol-invalid`)
    if (!baseUrl) issues.push(`channels[${index}].base-url-invalid`)
    if (!apiKey) issues.push(`channels[${index}].api-key-required`)
    if (!modelIdentifier) issues.push(`channels[${index}].model-identifier-invalid`)
    if (id && channelIds.has(id)) issues.push(`channels[${index}].id-duplicate`)
    if (id) channelIds.add(id)
    if (id && providerRef && failureDomainRef && protocol && baseUrl && apiKey && modelIdentifier && !channels.some((item) => item.id === id)) {
      channels.push({ id, providerRef, failureDomainRef, protocol, baseUrl, apiKey, modelIdentifier, timeoutMs })
    }
  }

  const candidates: AiDailyModelRuntimeCandidate[] = []
  const candidateIds = new Set<string>()
  for (const [index, raw] of rawCandidates.entries()) {
    if (!isRecord(raw)) {
      issues.push(`candidates[${index}].object-required`)
      continue
    }
    const candidateId = readSlug(raw.candidateId ?? raw.id)
    const role = aiDailyGenerationRoles.includes(raw.role as AiDailyGenerationRole)
      ? (raw.role as AiDailyGenerationRole)
      : null
    const channelId = readSlug(raw.channelId)
    if (!candidateId) issues.push(`candidates[${index}].candidate-id-invalid`)
    if (!role) issues.push(`candidates[${index}].role-invalid`)
    if (!channelId || !channelIds.has(channelId)) issues.push(`candidates[${index}].channel-invalid`)
    if (candidateId && candidateIds.has(candidateId)) issues.push(`candidates[${index}].candidate-id-duplicate`)
    if (candidateId) candidateIds.add(candidateId)
    if (candidateId && role && channelId && channelIds.has(channelId) && !candidates.some((item) => item.candidateId === candidateId)) {
      candidates.push({ candidateId, role, channelId })
    }
  }

  for (const role of aiDailyGenerationRoles) {
    if (!candidates.some((candidate) => candidate.role === role)) issues.push(`role-${role}-candidate-missing`)
  }
  if (channels.length > 12) issues.push('runtime-config-channel-limit-exceeded')
  if (candidates.length > 36) issues.push('runtime-config-candidate-limit-exceeded')
  return issues.length > 0
    ? { ok: false, issues: unique(issues) }
    : { ok: true, config: { schemaVersion: aiDailyModelRuntimeSchemaVersion, channels, candidates } }
}

export function resolveAiDailyRuntimeCandidate(
  config: AiDailyModelRuntimeConfig,
  candidateId: string,
): { candidate: AiDailyModelRuntimeCandidate; channel: AiDailyModelRuntimeChannel } | null {
  const candidate = config.candidates.find((item) => item.candidateId === candidateId)
  if (!candidate) return null
  const channel = config.channels.find((item) => item.id === candidate.channelId)
  return channel ? { candidate, channel } : null
}

export function summarizeAiDailyModelRuntime(config: AiDailyModelRuntimeConfig): AiDailyModelRuntimeSummary {
  const roles = Object.fromEntries(aiDailyGenerationRoles.map((role) => [role, config.candidates.filter((candidate) => candidate.role === role).length])) as Record<AiDailyGenerationRole, number>
  return {
    channelCount: config.channels.length,
    candidateCount: config.candidates.length,
    configuredChannelCount: config.channels.filter((channel) => Boolean(channel.apiKey && channel.baseUrl && channel.modelIdentifier)).length,
    roles,
    failureDomains: [...new Set(config.channels.map((channel) => channel.failureDomainRef))].sort(),
  }
}

function readSlug(value: unknown) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.trim()) && value.trim().length <= 120
    ? value.trim()
    : ''
}

function readBoundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength ? value.trim() : ''
}

function readUrl(value: unknown, allowLocalBaseUrl: boolean) {
  if (typeof value !== 'string' || value.trim().length > 400) return ''
  try {
    const url = new URL(value.trim())
    if (!['https:', ...(allowLocalBaseUrl ? ['http:'] : [])].includes(url.protocol)) return ''
    if (url.username || url.password || url.search || url.hash) return ''
    if (!allowLocalBaseUrl && /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/iu.test(url.hostname)) return ''
    return url.toString().replace(/\/$/u, '')
  } catch {
    return ''
  }
}

function readModelIdentifier(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/u.test(normalized)) return ''
  if (normalized.includes('://') || /(?:^|[^A-Za-z0-9])(?:sk|pk|rk)-[A-Za-z0-9_-]{8,}/u.test(normalized)) return ''
  return normalized
}

function readInteger(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function unique(values: string[]) {
  return [...new Set(values)]
}
