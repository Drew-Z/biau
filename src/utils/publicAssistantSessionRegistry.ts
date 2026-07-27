const CURRENT_SESSION_STORAGE_KEY = 'biau-public-assistant-session-v1'
const SESSION_REGISTRY_STORAGE_KEY = 'biau-public-assistant-sessions-v2'
const MAX_SESSION_IDS = 24

export interface PublicAssistantSessionRegistry {
  version: 2
  currentSessionId: string
  sessionIds: string[]
}

export function createPublicAssistantSessionId() {
  const secureCrypto = globalThis.crypto
  if (typeof secureCrypto?.randomUUID === 'function') return secureCrypto.randomUUID()
  if (typeof secureCrypto?.getRandomValues === 'function') {
    const bytes = secureCrypto.getRandomValues(new Uint8Array(18))
    return `public-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
  }
  throw new Error('secure-random-unavailable')
}

export function readPublicAssistantSessionRegistry(): PublicAssistantSessionRegistry {
  const fresh = createPublicAssistantSessionId()
  if (typeof window === 'undefined') return { version: 2, currentSessionId: fresh, sessionIds: [fresh] }
  try {
    const stored = window.localStorage.getItem(SESSION_REGISTRY_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as unknown
      if (isRecord(parsed) && parsed.version === 2) {
        const currentSessionId = readSessionId(parsed.currentSessionId)
        const sessionIds = Array.isArray(parsed.sessionIds)
          ? parsed.sessionIds.map(readSessionId).filter(Boolean).filter(unique).slice(0, MAX_SESSION_IDS)
          : []
        if (currentSessionId) {
          return {
            version: 2,
            currentSessionId,
            sessionIds: [currentSessionId, ...sessionIds.filter((id) => id !== currentSessionId)].slice(0, MAX_SESSION_IDS),
          }
        }
      }
    }
    const legacy = readSessionId(window.localStorage.getItem(CURRENT_SESSION_STORAGE_KEY))
    const registry = { version: 2 as const, currentSessionId: legacy || fresh, sessionIds: [legacy || fresh] }
    persistPublicAssistantSessionRegistry(registry)
    return registry
  } catch {
    return { version: 2, currentSessionId: fresh, sessionIds: [fresh] }
  }
}

export function rememberPublicAssistantSession(
  registry: PublicAssistantSessionRegistry,
  sessionId: string,
): PublicAssistantSessionRegistry {
  const normalized = readSessionId(sessionId)
  if (!normalized) return registry
  return {
    version: 2,
    currentSessionId: normalized,
    sessionIds: [normalized, ...registry.sessionIds.filter((id) => id !== normalized)].slice(0, MAX_SESSION_IDS),
  }
}

export function forgetPublicAssistantSession(
  registry: PublicAssistantSessionRegistry,
  sessionId: string,
): PublicAssistantSessionRegistry {
  const remaining = registry.sessionIds.filter((id) => id !== sessionId)
  const currentSessionId = registry.currentSessionId === sessionId
    ? (remaining[0] || createPublicAssistantSessionId())
    : registry.currentSessionId
  return {
    version: 2,
    currentSessionId,
    sessionIds: [currentSessionId, ...remaining.filter((id) => id !== currentSessionId)].slice(0, MAX_SESSION_IDS),
  }
}

export function persistPublicAssistantSessionRegistry(registry: PublicAssistantSessionRegistry) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SESSION_REGISTRY_STORAGE_KEY, JSON.stringify(registry))
    window.localStorage.setItem(CURRENT_SESSION_STORAGE_KEY, registry.currentSessionId)
  } catch {
    // Storage failure degrades to the in-memory registry for this visit.
  }
}

function readSessionId(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return /^[a-zA-Z0-9_-]{12,80}$/u.test(normalized) ? normalized : ''
}

function unique<T>(value: T, index: number, values: T[]) {
  return values.indexOf(value) === index
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
