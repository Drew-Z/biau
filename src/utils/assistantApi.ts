function normalizeApiBase(value: string | undefined) {
  return value?.trim().replace(/\/+$/, '') ?? ''
}

const assistantEnv = import.meta.env ?? {}
const legacyChatApiBase = normalizeApiBase(assistantEnv.VITE_CHAT_API_BASE_URL)

export const PUBLIC_ASSISTANT_API_BASE =
  normalizeApiBase(assistantEnv.VITE_PUBLIC_ASSISTANT_API_BASE_URL) || legacyChatApiBase

export const SAME_ORIGIN_ASSISTANT_API_BASE = '/api'

export const ASSISTANT_API_ENV_NAMES = {
  public: 'VITE_PUBLIC_ASSISTANT_API_BASE_URL',
  legacy: 'VITE_CHAT_API_BASE_URL',
} as const
