import { env } from './env.js'
import type { AssistantModelChannelSummary } from './types.js'

const DEFAULT_MODEL_CHANNEL_ID = 'default'

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

export function listSafeModelChannels(): AssistantModelChannelSummary[] {
  const channel = resolveModelChannel()
  return [
    {
      id: channel.id,
      label: channel.label,
      provider: channel.provider,
      model: channel.model,
      configured: channel.configured,
      isDefault: true,
      isActive: true,
    },
  ]
}

export function hasConfiguredModelChannel() {
  return resolveModelChannel().configured
}
