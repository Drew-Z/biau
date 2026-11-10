export interface PublicAssistantPresence {
  side: 'left' | 'right'
  height: number
  hidden: boolean
}

export const PUBLIC_ASSISTANT_PRESENCE_KEY = 'biau-public-assistant-presence-v1'
export const DEFAULT_ASSISTANT_PRESENCE: PublicAssistantPresence = { side: 'right', height: 1, hidden: false }

export function readPublicAssistantPresence(): PublicAssistantPresence {
  try {
    if (typeof window === 'undefined') return DEFAULT_ASSISTANT_PRESENCE
    const value: unknown = JSON.parse(window.localStorage.getItem(PUBLIC_ASSISTANT_PRESENCE_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return DEFAULT_ASSISTANT_PRESENCE
    const stored = value as Record<string, unknown>
    return {
      side: stored.side === 'left' ? 'left' : 'right',
      height: typeof stored.height === 'number' && Number.isFinite(stored.height) ? Math.min(1, Math.max(0, stored.height)) : 1,
      hidden: stored.hidden === true,
    }
  } catch { return DEFAULT_ASSISTANT_PRESENCE }
}

export function writePublicAssistantPresence(value: PublicAssistantPresence) {
  try { window.localStorage.setItem(PUBLIC_ASSISTANT_PRESENCE_KEY, JSON.stringify(value)) } catch { /* Preferences are optional. */ }
}
