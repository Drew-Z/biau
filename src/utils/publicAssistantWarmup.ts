import { PUBLIC_ASSISTANT_API_BASE, SAME_ORIGIN_ASSISTANT_API_BASE } from './assistantApi'

export type PublicAssistantWarmupState = 'idle' | 'warming' | 'ready' | 'error'

export interface PublicAssistantWarmupSnapshot {
  state: PublicAssistantWarmupState
  issueCode: string | null
  readyUntil: number | null
}

const WARMUP_STORAGE_KEY = 'biau-public-assistant-warmup-v1'
const WARMUP_READY_TTL_MS = 12 * 60 * 1_000
const WARMUP_RETRY_DELAY_MS = 800
const API_BASE = PUBLIC_ASSISTANT_API_BASE || SAME_ORIGIN_ASSISTANT_API_BASE
const SERVER_SNAPSHOT: PublicAssistantWarmupSnapshot = { state: 'idle', issueCode: null, readyUntil: null }

let snapshot = readStoredSnapshot()
let activeController: AbortController | null = null
let activePromise: Promise<PublicAssistantWarmupSnapshot> | null = null
let readyExpiryTimer: number | null = null
const listeners = new Set<() => void>()

scheduleReadyExpiry(snapshot.readyUntil)

export function getPublicAssistantWarmupSnapshot() {
  return snapshot
}

export function getPublicAssistantWarmupServerSnapshot() {
  return SERVER_SNAPSHOT
}

export function subscribePublicAssistantWarmup(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function startPublicAssistantWarmup() {
  if (snapshot.state === 'ready' && snapshot.readyUntil && snapshot.readyUntil > Date.now()) {
    return Promise.resolve(snapshot)
  }
  if (activePromise) return activePromise

  activeController = new AbortController()
  const controller = activeController
  updateSnapshot({ state: 'warming', issueCode: null, readyUntil: null })
  activePromise = runWarmup(controller)
    .finally(() => {
      if (activeController === controller) activeController = null
      activePromise = null
    })
  return activePromise
}

export function abortPublicAssistantWarmup() {
  activeController?.abort()
}

async function runWarmup(controller: AbortController) {
  let issueCode = 'public-assistant-endpoint-unreachable'
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}/health`, { method: 'GET', signal: controller.signal })
      if (!response.ok) {
        issueCode = statusErrorCode(response.status)
        throw new Error(issueCode)
      }
      const payload = await response.json().catch(() => null)
      if (!isRecord(payload) || payload.ok !== true) {
        issueCode = 'public-assistant-invalid-response'
        throw new Error(issueCode)
      }
      const readyUntil = Date.now() + WARMUP_READY_TTL_MS
      updateSnapshot({ state: 'ready', issueCode: null, readyUntil })
      persistReadySnapshot(readyUntil)
      return snapshot
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        updateSnapshot({ state: 'idle', issueCode: null, readyUntil: null })
        return snapshot
      }
      if (error instanceof TypeError) {
        issueCode = typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'public-assistant-offline'
          : 'public-assistant-endpoint-unreachable'
      } else if (error instanceof Error && error.message.startsWith('public-')) {
        issueCode = error.message
      }
      if (attempt === 1) {
        try {
          await waitForRetry(controller.signal)
        } catch (delayError) {
          if (delayError instanceof DOMException && delayError.name === 'AbortError') {
            updateSnapshot({ state: 'idle', issueCode: null, readyUntil: null })
            return snapshot
          }
          issueCode = 'public-assistant-endpoint-unreachable'
          break
        }
      }
    }
  }
  clearStoredSnapshot()
  updateSnapshot({ state: 'error', issueCode, readyUntil: null })
  return snapshot
}

function waitForRetry(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, WARMUP_RETRY_DELAY_MS)
    const handleAbort = () => {
      window.clearTimeout(timeout)
      signal.removeEventListener('abort', handleAbort)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

function updateSnapshot(next: PublicAssistantWarmupSnapshot) {
  snapshot = next
  scheduleReadyExpiry(next.readyUntil)
  listeners.forEach((listener) => listener())
}

function scheduleReadyExpiry(readyUntil: number | null) {
  if (typeof window === 'undefined') return
  if (readyExpiryTimer !== null) {
    window.clearTimeout(readyExpiryTimer)
    readyExpiryTimer = null
  }
  if (!readyUntil) return
  readyExpiryTimer = window.setTimeout(() => {
    readyExpiryTimer = null
    if (snapshot.state !== 'ready' || snapshot.readyUntil !== readyUntil || readyUntil > Date.now()) return
    clearStoredSnapshot()
    updateSnapshot({ state: 'idle', issueCode: null, readyUntil: null })
  }, Math.max(0, readyUntil - Date.now()))
}

function readStoredSnapshot(): PublicAssistantWarmupSnapshot {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT
  try {
    const raw = window.sessionStorage.getItem(WARMUP_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) as unknown : null
    if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.readyUntil !== 'number') return SERVER_SNAPSHOT
    if (!Number.isFinite(parsed.readyUntil) || parsed.readyUntil <= Date.now()) {
      window.sessionStorage.removeItem(WARMUP_STORAGE_KEY)
      return SERVER_SNAPSHOT
    }
    return { state: 'ready', issueCode: null, readyUntil: parsed.readyUntil }
  } catch {
    return SERVER_SNAPSHOT
  }
}

function persistReadySnapshot(readyUntil: number) {
  try {
    window.sessionStorage.setItem(WARMUP_STORAGE_KEY, JSON.stringify({ version: 1, readyUntil }))
  } catch {
    // Storage failure only removes the cross-route readiness hint.
  }
}

function clearStoredSnapshot() {
  try {
    window.sessionStorage.removeItem(WARMUP_STORAGE_KEY)
  } catch {
    // Ignore unavailable browser storage.
  }
}

function statusErrorCode(status: number) {
  if (status === 502) return 'public-assistant-upstream-unreachable'
  if (status === 503) return 'public-assistant-service-unavailable'
  if (status === 504) return 'public-assistant-upstream-timeout'
  return 'public-chat-request-failed'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', abortPublicAssistantWarmup)
}
