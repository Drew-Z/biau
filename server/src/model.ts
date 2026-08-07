import { env } from './env.js'
import type { AssistantModelChannelSummary, ProviderDiagnosticKind } from './types.js'

const DEFAULT_MODEL_CHANNEL_ID = 'default'
const FALLBACK_MODEL_CHANNEL_PREFIX = 'fallback'
const MODEL_CHANNEL_REPUTATION_HALF_LIFE_MS = 30 * 60_000
const MODEL_CHANNEL_REPUTATION_LIMIT = 8
const MODEL_CHANNEL_FAILURE_WEIGHT = 1.75
const MODEL_CHANNEL_SCORE_TIE = 0.05
const MODEL_CHANNEL_LATENCY_TIE_MS = 100
const MODEL_CHANNEL_HALF_OPEN_LEASE_MS = 60_000

export interface AssistantModelChannelConfig extends AssistantModelChannelSummary {
  apiKey: string
  baseUrl: string
}

export interface AssistantModelChannelOutcome {
  ok: boolean
  at?: number
  durationMs?: number
  firstActivityMs?: number
  failure?: 'not_configured' | 'provider_error' | 'empty_response' | 'invalid_response'
  diagnosticKind?: ProviderDiagnosticKind
  httpStatus?: number
}

interface AssistantModelChannelHealth {
  consecutiveFailures: number
  openUntil: number
  lastSuccessAt: number
  lastOutcomeAt: number
  firstActivityEwmaMs: number | null
  successEvidence: number
  failureEvidence: number
  halfOpenLeaseUntil: number
}

const modelChannelHealth = new Map<string, AssistantModelChannelHealth>()

export function resolveModelChannel(): AssistantModelChannelConfig {
  const apiKey = env.assistantModelApiKey || env.openaiApiKey
  const baseUrl = env.assistantModelBaseUrl || env.openaiBaseUrl
  const model = env.assistantModelName || env.openaiModel
  return {
    id: DEFAULT_MODEL_CHANNEL_ID,
    label: '默认模型通道',
    apiKey,
    baseUrl,
    model,
    provider: env.assistantModelProvider || 'openai-compatible',
    configured: Boolean(apiKey && baseUrl && model),
    isDefault: true,
    isActive: true,
  }
}

export function resolveModelChannels(): AssistantModelChannelConfig[] {
  const primary = resolveModelChannel()
  if (!hasCompleteFallbackConfiguration()) return [primary]
  const fallbackChannels = env.assistantModelFallbackModels.map((model, index) => ({
    id: `${FALLBACK_MODEL_CHANNEL_PREFIX}-${index + 1}`,
    label: `备用模型通道 ${index + 1}`,
    apiKey: env.assistantModelFallbackApiKey,
    baseUrl: env.assistantModelFallbackBaseUrl,
    model,
    provider: env.assistantModelFallbackProvider,
    configured: true,
    isDefault: false,
    isActive: true,
  }))
  return [primary, ...fallbackChannels]
}

export function resolveVisionModelChannel(): AssistantModelChannelConfig | null {
  if (!env.assistantVisionModel) return null
  return resolveModelChannels().find((channel) => (
    !channel.isDefault
    && channel.model === env.assistantVisionModel
    && channel.configured
  )) ?? null
}

export function resolveAdaptiveModelChannels(at = Date.now()): AssistantModelChannelConfig[] {
  const channels = resolveModelChannels()
  const entries = channels.map((channel, priority) => ({
    channel,
    priority,
    health: modelChannelHealth.get(modelChannelKey(channel)),
  }))
  const closed = entries
    .filter((entry) => (entry.health?.openUntil ?? 0) === 0)
    .sort((left, right) => compareModelChannelReputation(left, right, at))
  const recoveryCandidate = entries
    .filter((entry) => {
      const openUntil = entry.health?.openUntil ?? 0
      const leaseUntil = entry.health?.halfOpenLeaseUntil ?? 0
      return openUntil > 0 && openUntil <= at && leaseUntil <= at
    })
    .sort((left, right) => {
      const recoveryOrder = (left.health?.openUntil ?? 0) - (right.health?.openUntil ?? 0)
      return recoveryOrder || left.priority - right.priority
    })[0]

  if (recoveryCandidate?.health) {
    recoveryCandidate.health.halfOpenLeaseUntil = at + MODEL_CHANNEL_HALF_OPEN_LEASE_MS
    return [recoveryCandidate.channel, ...closed.map((entry) => entry.channel)]
  }
  if (closed.length > 0) return closed.map((entry) => entry.channel)
  return []
}

export function recordModelChannelOutcome(
  channel: AssistantModelChannelConfig,
  outcome: AssistantModelChannelOutcome,
) {
  const at = outcome.at ?? Date.now()
  const key = modelChannelKey(channel)
  const current = modelChannelHealth.get(key) ?? {
    consecutiveFailures: 0,
    openUntil: 0,
    lastSuccessAt: 0,
    lastOutcomeAt: at,
    firstActivityEwmaMs: null,
    successEvidence: 0,
    failureEvidence: 0,
    halfOpenLeaseUntil: 0,
  }
  const evidence = decayModelChannelEvidence(current, at)
  if (outcome.ok) {
    const firstActivityMs = outcome.firstActivityMs
    modelChannelHealth.set(key, {
      consecutiveFailures: 0,
      openUntil: 0,
      lastSuccessAt: at,
      lastOutcomeAt: at,
      firstActivityEwmaMs: firstActivityMs === undefined
        ? current.firstActivityEwmaMs
        : current.firstActivityEwmaMs === null
          ? firstActivityMs
          : Math.round(current.firstActivityEwmaMs * 0.7 + firstActivityMs * 0.3),
      successEvidence: Math.min(MODEL_CHANNEL_REPUTATION_LIMIT, evidence.success + 1),
      failureEvidence: evidence.failure,
      halfOpenLeaseUntil: 0,
    })
    return
  }

  const consecutiveFailures = current.consecutiveFailures + 1
  const cooldownMs = channelCooldownMs(outcome, consecutiveFailures)
  modelChannelHealth.set(key, {
    ...current,
    consecutiveFailures,
    openUntil: cooldownMs > 0 ? Math.max(current.openUntil, at + cooldownMs) : current.openUntil,
    lastOutcomeAt: at,
    successEvidence: evidence.success,
    failureEvidence: Math.min(MODEL_CHANNEL_REPUTATION_LIMIT, evidence.failure + 1),
    halfOpenLeaseUntil: 0,
  })
}

export function modelChannelRelation(
  current: AssistantModelChannelConfig,
  next: AssistantModelChannelConfig,
) {
  if (modelChannelKey(current) === modelChannelKey(next)) return 'same-channel' as const
  if (current.baseUrl === next.baseUrl && current.apiKey === next.apiKey) return 'same-failure-domain' as const
  return 'independent' as const
}

export function resetAdaptiveModelChannelRouting() {
  modelChannelHealth.clear()
}

export function resolveModelChannelForAttempt(attempt: 1 | 2 | 3): AssistantModelChannelConfig {
  const channels = resolveModelChannels()
  if (channels.length === 1 || attempt === 1) return channels[0]
  return channels[Math.min(attempt - 1, channels.length - 1)]
}

export function nextModelChannelRelation(attempt: 1 | 2 | 3) {
  if (attempt === 3) return null
  if (!hasIndependentFallbackModelChannel()) return 'same-channel' as const
  return attempt === 1 ? 'independent' as const : 'same-failure-domain' as const
}

export function hasIndependentFallbackModelChannel() {
  return resolveModelChannels().length > 1
}

export function listSafeModelChannels(): AssistantModelChannelSummary[] {
  return resolveModelChannels().map((channel) => ({
    id: channel.id,
    label: channel.label,
    provider: channel.provider,
    model: channel.model,
    configured: channel.configured,
    isDefault: channel.isDefault,
    isActive: channel.isActive,
  }))
}

export function hasConfiguredModelChannel() {
  return resolveModelChannels().some((channel) => channel.configured)
}

function hasCompleteFallbackConfiguration() {
  return Boolean(
    env.assistantModelFallbackApiKey
    && env.assistantModelFallbackBaseUrl
    && env.assistantModelFallbackModels.length > 0,
  )
}

function modelChannelKey(channel: AssistantModelChannelConfig) {
  return [channel.id, channel.provider, channel.baseUrl, channel.model].join('\u0000')
}

function compareModelChannelReputation(
  left: { priority: number; health?: AssistantModelChannelHealth },
  right: { priority: number; health?: AssistantModelChannelHealth },
  at: number,
) {
  const scoreDifference = modelChannelReputationScore(right.health, at) - modelChannelReputationScore(left.health, at)
  if (Math.abs(scoreDifference) >= MODEL_CHANNEL_SCORE_TIE) return scoreDifference

  const leftLatency = left.health?.firstActivityEwmaMs
  const rightLatency = right.health?.firstActivityEwmaMs
  const leftEvidenceMass = modelChannelEvidenceMass(left.health, at)
  const rightEvidenceMass = modelChannelEvidenceMass(right.health, at)
  if (leftEvidenceMass >= 0.5 && rightEvidenceMass >= 0.5
    && leftLatency !== null && leftLatency !== undefined && rightLatency !== null && rightLatency !== undefined) {
    const latencyDifference = leftLatency - rightLatency
    if (Math.abs(latencyDifference) >= MODEL_CHANNEL_LATENCY_TIE_MS) return latencyDifference
  }
  return left.priority - right.priority
}

function modelChannelReputationScore(health: AssistantModelChannelHealth | undefined, at: number) {
  if (!health) return 0
  const evidence = decayModelChannelEvidence(health, at)
  return evidence.success - evidence.failure * MODEL_CHANNEL_FAILURE_WEIGHT
}

function modelChannelEvidenceMass(health: AssistantModelChannelHealth | undefined, at: number) {
  if (!health) return 0
  const evidence = decayModelChannelEvidence(health, at)
  return evidence.success + evidence.failure
}

function decayModelChannelEvidence(health: AssistantModelChannelHealth, at: number) {
  const elapsedMs = Math.max(0, at - health.lastOutcomeAt)
  const decay = Math.pow(0.5, elapsedMs / MODEL_CHANNEL_REPUTATION_HALF_LIFE_MS)
  return {
    success: health.successEvidence * decay,
    failure: health.failureEvidence * decay,
  }
}

function channelCooldownMs(outcome: AssistantModelChannelOutcome, consecutiveFailures: number) {
  const status = outcome.httpStatus ?? 0
  if (outcome.failure === 'not_configured' || status === 401 || status === 403) return 15 * 60_000
  if (outcome.diagnosticKind === 'timeout' || outcome.diagnosticKind === 'network_error') return 2 * 60_000
  if (status === 429 || status >= 500 || status === 408 || status === 425) return 90_000
  if (status === 400 || status === 404 || status === 405 || status === 422) return 5 * 60_000
  if (outcome.failure === 'empty_response' || outcome.failure === 'invalid_response') return 60_000
  return consecutiveFailures >= 2 ? 60_000 : 0
}
