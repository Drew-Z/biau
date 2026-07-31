import { env } from './env.js'
import type { AssistantModelChannelSummary } from './types.js'

const DEFAULT_MODEL_CHANNEL_ID = 'default'
const FALLBACK_MODEL_CHANNEL_PREFIX = 'fallback'

export interface AssistantModelChannelConfig extends AssistantModelChannelSummary {
  apiKey: string
  baseUrl: string
}

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
