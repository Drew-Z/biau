import {
  normalizePublicAssistantSessionHistory,
  type PublicAssistantMode,
  type PublicAssistantSessionHistory,
} from './publicAssistantApi'

const DRAFT_PREFIX = 'biau-public-assistant-draft-v1:'
const SNAPSHOT_PREFIX = 'biau-public-assistant-history-v1:'
const DRAFT_TTL_MS = 2 * 60 * 60 * 1_000
const SNAPSHOT_TTL_MS = 15 * 60 * 1_000
const MAX_DRAFT_LENGTH = 500

export interface PublicAssistantDraft {
  sessionId: string
  input: string
  mode: PublicAssistantMode
  updatedAt: number
}

export interface PublicAssistantHistorySnapshot {
  sessionId: string
  capturedAt: number
  expiresAt: number
  history: PublicAssistantSessionHistory
}

export function readPublicAssistantDraft(sessionId: string, now = Date.now()): PublicAssistantDraft | null {
  if (!isSessionId(sessionId)) return null
  const parsed = readStorage(draftKey(sessionId))
  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    parsed.sessionId !== sessionId ||
    !isMode(parsed.mode) ||
    typeof parsed.input !== 'string' ||
    typeof parsed.updatedAt !== 'number' ||
    !Number.isFinite(parsed.updatedAt) ||
    parsed.updatedAt > now + 60_000 ||
    parsed.updatedAt + DRAFT_TTL_MS <= now
  ) {
    clearPublicAssistantDraft(sessionId)
    return null
  }
  const input = parsed.input.slice(0, MAX_DRAFT_LENGTH)
  return input ? { sessionId, input, mode: parsed.mode, updatedAt: parsed.updatedAt } : null
}

export function writePublicAssistantDraft(sessionId: string, input: string, mode: PublicAssistantMode, now = Date.now()) {
  if (!isSessionId(sessionId)) return
  const bounded = input.slice(0, MAX_DRAFT_LENGTH)
  if (!bounded) {
    clearPublicAssistantDraft(sessionId)
    return
  }
  writeStorage(draftKey(sessionId), { version: 1, sessionId, input: bounded, mode, updatedAt: now })
}

export function clearPublicAssistantDraft(sessionId: string, expectedInput?: string) {
  if (expectedInput !== undefined) {
    const current = readPublicAssistantDraft(sessionId)
    if (!current || current.input !== expectedInput) return
  }
  removeStorage(draftKey(sessionId))
}

export function readPublicAssistantHistorySnapshot(
  sessionId: string,
  now = Date.now(),
): PublicAssistantHistorySnapshot | null {
  if (!isSessionId(sessionId)) return null
  const parsed = readStorage(snapshotKey(sessionId))
  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    parsed.sessionId !== sessionId ||
    typeof parsed.capturedAt !== 'number' ||
    typeof parsed.expiresAt !== 'number' ||
    !Number.isFinite(parsed.capturedAt) ||
    !Number.isFinite(parsed.expiresAt) ||
    parsed.capturedAt > now + 60_000 ||
    parsed.expiresAt <= parsed.capturedAt ||
    parsed.expiresAt > parsed.capturedAt + SNAPSHOT_TTL_MS ||
    parsed.expiresAt <= now
  ) {
    clearPublicAssistantHistorySnapshot(sessionId)
    return null
  }
  const history = normalizePublicAssistantSessionHistory(parsed.history)
  if (!history || history.session.id !== sessionId) {
    clearPublicAssistantHistorySnapshot(sessionId)
    return null
  }
  return { sessionId, capturedAt: parsed.capturedAt, expiresAt: parsed.expiresAt, history }
}

export function writePublicAssistantHistorySnapshot(history: PublicAssistantSessionHistory, now = Date.now()) {
  const serverExpiry = new Date(history.session.expiresAt).getTime()
  if (!Number.isFinite(serverExpiry)) return
  const expiresAt = Math.min(serverExpiry, now + SNAPSHOT_TTL_MS)
  if (expiresAt <= now) return
  writeStorage(snapshotKey(history.session.id), {
    version: 1,
    sessionId: history.session.id,
    capturedAt: now,
    expiresAt,
    history,
  })
}

export function clearPublicAssistantHistorySnapshot(sessionId: string) {
  removeStorage(snapshotKey(sessionId))
}

export function clearPublicAssistantSessionBrowserState(sessionId: string) {
  clearPublicAssistantDraft(sessionId)
  clearPublicAssistantHistorySnapshot(sessionId)
}

function draftKey(sessionId: string) {
  return `${DRAFT_PREFIX}${sessionId}`
}

function snapshotKey(sessionId: string) {
  return `${SNAPSHOT_PREFIX}${sessionId}`
}

function readStorage(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) as unknown : null
  } catch {
    return null
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Session storage is an optional enhancement.
  }
}

function removeStorage(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Session storage is an optional enhancement.
  }
}

function isSessionId(value: string) {
  return /^[a-zA-Z0-9_-]{12,80}$/u.test(value)
}

function isMode(value: unknown): value is PublicAssistantMode {
  return value === 'auto' || value === 'site' || value === 'web'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
