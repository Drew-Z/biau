import { createHash } from 'node:crypto'

export const aiDailyProfiles = ['FIXTURE', 'DEGRADED', 'PRODUCTION'] as const
export type AiDailyProfileName = (typeof aiDailyProfiles)[number]

export const aiDailyRunStatuses = [
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'COMPLETED_WITH_GAPS',
  'FAILED_CONFIG',
  'FAILED',
  'CANCELLED',
] as const
export type AiDailyRunStatusName = (typeof aiDailyRunStatuses)[number]

export const aiDailyRunStages = [
  'COLLECT',
  'DISCOVER',
  'FETCH',
  'DEDUPE',
  'GROUP',
  'RANK',
  'PROMOTE',
  'EXTRACT_FACTS',
  'COMPOSE',
  'VERIFY',
  'VALIDATE',
  'DRAFT',
] as const
export type AiDailyRunStageName = (typeof aiDailyRunStages)[number]

export const aiDailyEditorialStates = [
  'COLLECTING',
  'EVIDENCE_READY',
  'NEEDS_MORE_EVIDENCE',
  'REVIEW_NEEDED',
  'EXPORTED',
  'REJECTED',
] as const
export type AiDailyEditorialStateName = (typeof aiDailyEditorialStates)[number]

export const aiDailyWorkStatuses = ['PENDING', 'LEASED', 'RETRY_WAIT', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const
export type AiDailyWorkStatusName = (typeof aiDailyWorkStatuses)[number]

export const aiDailyGeneratedApplyStates = ['PENDING', 'APPLIED', 'BLOCKED', 'DISCARDED'] as const
export type AiDailyGeneratedApplyStateName = (typeof aiDailyGeneratedApplyStates)[number]

export const aiDailyGeneratedValidationStates = ['VALID', 'NEEDS_EDITOR_REVIEW', 'REJECTED'] as const
export type AiDailyGeneratedValidationStateName = (typeof aiDailyGeneratedValidationStates)[number]

export const aiDailyFlashLifecycleStates = ['ACTIVE', 'HELD', 'WITHDRAWN'] as const
export type AiDailyFlashLifecycleStateName = (typeof aiDailyFlashLifecycleStates)[number]

export const aiDailyFlashRevisionStatuses = ['DRAFT', 'APPROVED', 'REJECTED', 'SUPERSEDED'] as const
export type AiDailyFlashRevisionStatusName = (typeof aiDailyFlashRevisionStatuses)[number]

export const aiDailyCandidateSelectionStates = ['CANDIDATE', 'SELECTED', 'REJECTED', 'DUPLICATE'] as const
export type AiDailyCandidateSelectionStateName = (typeof aiDailyCandidateSelectionStates)[number]

export const aiDailyClusterEditorStates = ['AUTO', 'PROPOSED', 'ACCEPTED', 'REJECTED'] as const
export type AiDailyClusterEditorStateName = (typeof aiDailyClusterEditorStates)[number]

export type AiDailyTransitionDomain =
  | 'run'
  | 'editorial'
  | 'work'
  | 'generated-apply'
  | 'generated-validation'
  | 'flash-lifecycle'
  | 'flash-revision'
  | 'candidate-selection'
  | 'cluster-editorial'

export type AiDailyTransitionResult<T extends string> =
  | { ok: true; current: T; next: T }
  | {
      ok: false
      error: 'invalid-ai-daily-transition'
      domain: AiDailyTransitionDomain
      current: T
      next: T
    }

export interface AiDailyConfigurationInput {
  database: boolean
  fixtureData: boolean
  officialFeeds: boolean
  search: boolean
  pageExtraction: boolean
  factExtractionModel: boolean
  compositionModel: boolean
  verificationModel: boolean
}

export interface AiDailyConfigurationReadiness {
  profile: AiDailyProfileName
  ready: boolean
  missing: (keyof AiDailyConfigurationInput)[]
}

export interface AiDailyCanonicalSourceIdentity {
  canonicalUrl: string
  canonicalKey: string
  canonicalizationVersion: 1
  publisherDomain: string
}

export interface AiDailyEditionDate {
  date: string
  value: Date
}

export interface AiDailyCitationSnapshotV2 {
  version: 2
  sourceItemId: string | null
  evidenceId: string | null
  title: string
  publisher: string
  originalUrl: string
  canonicalUrl: string
  publishedAt: string | null
  retrievedAt: string
  excerpt: string
  locator?: {
    heading?: string
    startChar?: number
    endChar?: number
  }
  contentHash?: string
}

export type AiDailyCitationSnapshotResult =
  | { ok: true; snapshot: AiDailyCitationSnapshotV2 }
  | { ok: false; error: 'invalid-citation-snapshot-v2' }

const runTransitions: Record<AiDailyRunStatusName, readonly AiDailyRunStatusName[]> = {
  QUEUED: ['RUNNING', 'FAILED_CONFIG', 'FAILED', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'COMPLETED_WITH_GAPS', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  COMPLETED_WITH_GAPS: [],
  FAILED_CONFIG: [],
  FAILED: [],
  CANCELLED: [],
}

const editorialTransitions: Record<AiDailyEditorialStateName, readonly AiDailyEditorialStateName[]> = {
  COLLECTING: ['EVIDENCE_READY', 'NEEDS_MORE_EVIDENCE', 'REJECTED'],
  EVIDENCE_READY: ['REVIEW_NEEDED', 'NEEDS_MORE_EVIDENCE', 'REJECTED'],
  NEEDS_MORE_EVIDENCE: ['COLLECTING', 'EVIDENCE_READY', 'REJECTED'],
  REVIEW_NEEDED: ['EXPORTED', 'NEEDS_MORE_EVIDENCE', 'REJECTED'],
  EXPORTED: ['REVIEW_NEEDED', 'REJECTED'],
  REJECTED: ['COLLECTING'],
}

const workTransitions: Record<AiDailyWorkStatusName, readonly AiDailyWorkStatusName[]> = {
  PENDING: ['LEASED', 'CANCELLED'],
  LEASED: ['SUCCEEDED', 'RETRY_WAIT', 'FAILED', 'CANCELLED'],
  RETRY_WAIT: ['LEASED', 'CANCELLED'],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
}

const generatedApplyTransitions: Record<AiDailyGeneratedApplyStateName, readonly AiDailyGeneratedApplyStateName[]> = {
  PENDING: ['APPLIED', 'BLOCKED', 'DISCARDED'],
  BLOCKED: ['APPLIED', 'DISCARDED'],
  APPLIED: [],
  DISCARDED: [],
}

const generatedValidationTransitions: Record<
  AiDailyGeneratedValidationStateName,
  readonly AiDailyGeneratedValidationStateName[]
> = {
  VALID: ['VALID', 'NEEDS_EDITOR_REVIEW', 'REJECTED'],
  NEEDS_EDITOR_REVIEW: ['VALID', 'NEEDS_EDITOR_REVIEW', 'REJECTED'],
  REJECTED: [],
}

const flashLifecycleTransitions: Record<AiDailyFlashLifecycleStateName, readonly AiDailyFlashLifecycleStateName[]> = {
  ACTIVE: ['HELD', 'WITHDRAWN'],
  HELD: ['ACTIVE', 'WITHDRAWN'],
  WITHDRAWN: [],
}

const flashRevisionTransitions: Record<AiDailyFlashRevisionStatusName, readonly AiDailyFlashRevisionStatusName[]> = {
  DRAFT: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUPERSEDED'],
  REJECTED: [],
  SUPERSEDED: [],
}

const candidateSelectionTransitions: Record<
  AiDailyCandidateSelectionStateName,
  readonly AiDailyCandidateSelectionStateName[]
> = {
  CANDIDATE: ['SELECTED', 'REJECTED'],
  SELECTED: ['CANDIDATE', 'REJECTED'],
  REJECTED: ['CANDIDATE', 'SELECTED'],
  DUPLICATE: [],
}

const clusterEditorTransitions: Record<AiDailyClusterEditorStateName, readonly AiDailyClusterEditorStateName[]> = {
  AUTO: ['PROPOSED', 'ACCEPTED', 'REJECTED'],
  PROPOSED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PROPOSED', 'REJECTED'],
  REJECTED: ['PROPOSED', 'ACCEPTED'],
}

const profileRequirements: Record<AiDailyProfileName, readonly (keyof AiDailyConfigurationInput)[]> = {
  FIXTURE: ['fixtureData'],
  DEGRADED: ['database', 'officialFeeds'],
  PRODUCTION: [
    'database',
    'officialFeeds',
    'search',
    'pageExtraction',
    'factExtractionModel',
    'compositionModel',
    'verificationModel',
  ],
}

const trackingQueryKeys = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'yclid',
])

function evaluateTransition<T extends string>(
  domain: AiDailyTransitionDomain,
  transitions: Record<T, readonly T[]>,
  current: T,
  next: T,
): AiDailyTransitionResult<T> {
  if (transitions[current]?.includes(next)) return { ok: true, current, next }
  return { ok: false, error: 'invalid-ai-daily-transition', domain, current, next }
}

export function evaluateAiDailyRunTransition(
  current: AiDailyRunStatusName,
  next: AiDailyRunStatusName,
): AiDailyTransitionResult<AiDailyRunStatusName> {
  return evaluateTransition('run', runTransitions, current, next)
}

export function evaluateAiDailyEditorialTransition(
  current: AiDailyEditorialStateName,
  next: AiDailyEditorialStateName,
): AiDailyTransitionResult<AiDailyEditorialStateName> {
  return evaluateTransition('editorial', editorialTransitions, current, next)
}

export function evaluateAiDailyWorkTransition(
  current: AiDailyWorkStatusName,
  next: AiDailyWorkStatusName,
): AiDailyTransitionResult<AiDailyWorkStatusName> {
  return evaluateTransition('work', workTransitions, current, next)
}

export function evaluateAiDailyGeneratedApplyTransition(
  current: AiDailyGeneratedApplyStateName,
  next: AiDailyGeneratedApplyStateName,
): AiDailyTransitionResult<AiDailyGeneratedApplyStateName> {
  return evaluateTransition('generated-apply', generatedApplyTransitions, current, next)
}

export function evaluateAiDailyGeneratedValidationTransition(
  current: AiDailyGeneratedValidationStateName,
  next: AiDailyGeneratedValidationStateName,
): AiDailyTransitionResult<AiDailyGeneratedValidationStateName> {
  return evaluateTransition('generated-validation', generatedValidationTransitions, current, next)
}

export function evaluateAiDailyFlashLifecycleTransition(
  current: AiDailyFlashLifecycleStateName,
  next: AiDailyFlashLifecycleStateName,
): AiDailyTransitionResult<AiDailyFlashLifecycleStateName> {
  return evaluateTransition('flash-lifecycle', flashLifecycleTransitions, current, next)
}

export function evaluateAiDailyFlashRevisionTransition(
  current: AiDailyFlashRevisionStatusName,
  next: AiDailyFlashRevisionStatusName,
): AiDailyTransitionResult<AiDailyFlashRevisionStatusName> {
  return evaluateTransition('flash-revision', flashRevisionTransitions, current, next)
}

export function evaluateAiDailyCandidateSelectionTransition(
  current: AiDailyCandidateSelectionStateName,
  next: AiDailyCandidateSelectionStateName,
): AiDailyTransitionResult<AiDailyCandidateSelectionStateName> {
  return evaluateTransition('candidate-selection', candidateSelectionTransitions, current, next)
}

export function evaluateAiDailyClusterEditorTransition(
  current: AiDailyClusterEditorStateName,
  next: AiDailyClusterEditorStateName,
): AiDailyTransitionResult<AiDailyClusterEditorStateName> {
  return evaluateTransition('cluster-editorial', clusterEditorTransitions, current, next)
}

export function evaluateAiDailyRunStageTransition(
  current: AiDailyRunStageName | null,
  next: AiDailyRunStageName,
): { ok: true } | { ok: false; error: 'invalid-ai-daily-stage-transition' } {
  if (current === null) return { ok: true }
  const currentIndex = aiDailyRunStages.indexOf(current)
  const nextIndex = aiDailyRunStages.indexOf(next)
  return nextIndex >= currentIndex
    ? { ok: true }
    : { ok: false, error: 'invalid-ai-daily-stage-transition' }
}

export function evaluateAiDailyConfiguration(
  profile: AiDailyProfileName,
  input: AiDailyConfigurationInput,
): AiDailyConfigurationReadiness {
  const missing = profileRequirements[profile].filter((key) => !input[key])
  return { profile, ready: missing.length === 0, missing }
}

export function parseAiDailyEditionDate(value: string): AiDailyEditionDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { date: value, value: date }
}

export function canonicalizeAiDailySourceUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('invalid-ai-daily-source-url')
  url.hash = ''
  url.hostname = url.hostname.toLowerCase()
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = ''
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || trackingQueryKeys.has(key.toLowerCase())) url.searchParams.delete(key)
  }
  const sortedEntries = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    const keyOrder = leftKey.localeCompare(rightKey)
    return keyOrder === 0 ? leftValue.localeCompare(rightValue) : keyOrder
  })
  url.search = ''
  for (const [key, entryValue] of sortedEntries) url.searchParams.append(key, entryValue)
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/u, '') || '/'
  return url.toString()
}

export function createAiDailyCanonicalSourceIdentity(value: string): AiDailyCanonicalSourceIdentity {
  const canonicalUrl = canonicalizeAiDailySourceUrl(value)
  const publisherDomain = new URL(canonicalUrl).hostname
  return {
    canonicalUrl,
    canonicalKey: createHash('sha256').update(`ai-daily-canonical-v1:${canonicalUrl}`).digest('hex'),
    canonicalizationVersion: 1,
    publisherDomain,
  }
}

export function createAiDailyTitleFingerprint(value: string) {
  const normalized = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ')
  return createHash('sha256').update(normalized).digest('hex')
}

export function buildAiDailyWorkIdempotencyKey(input: {
  editionDate: string
  kind: string
  scope: string
  version?: number
}) {
  const edition = parseAiDailyEditionDate(input.editionDate)
  if (!edition) throw new Error('invalid-ai-daily-edition-date')
  const version = input.version ?? 1
  const normalized = `${version}\n${edition.date}\n${input.kind.trim().toUpperCase()}\n${input.scope.trim().toLowerCase()}`
  return `ai-daily-work-v${version}:${createHash('sha256').update(normalized).digest('hex')}`
}

export function evaluateAiDailyLease(input: {
  currentLeaseToken: string | null
  currentLeaseExpiresAt: Date | null
  providedLeaseToken: string
  now: Date
}): { ok: true } | { ok: false; error: 'lease-token-mismatch' | 'lease-expired' } {
  if (!input.currentLeaseToken || input.currentLeaseToken !== input.providedLeaseToken) {
    return { ok: false, error: 'lease-token-mismatch' }
  }
  if (!input.currentLeaseExpiresAt || input.currentLeaseExpiresAt.getTime() <= input.now.getTime()) {
    return { ok: false, error: 'lease-expired' }
  }
  return { ok: true }
}

export function normalizeAiDailyCitationSnapshotV2(value: unknown): AiDailyCitationSnapshotResult {
  if (!isRecord(value) || value.version !== 2) return { ok: false, error: 'invalid-citation-snapshot-v2' }
  const title = readBoundedString(value.title, 240)
  const publisher = readBoundedString(value.publisher, 160)
  const originalUrl = readBoundedString(value.originalUrl, 1000)
  const canonicalUrl = readBoundedString(value.canonicalUrl, 1000)
  const retrievedAt = readIsoDate(value.retrievedAt)
  const publishedAt = value.publishedAt === null ? null : readIsoDate(value.publishedAt)
  const excerpt = readBoundedString(value.excerpt, 1024)
  if (!title || !publisher || !retrievedAt || !excerpt || !isPublicUrl(originalUrl) || !isPublicUrl(canonicalUrl)) {
    return { ok: false, error: 'invalid-citation-snapshot-v2' }
  }
  if (value.publishedAt !== null && !publishedAt) return { ok: false, error: 'invalid-citation-snapshot-v2' }

  const locator = readCitationLocator(value.locator)
  if (value.locator !== undefined && !locator) return { ok: false, error: 'invalid-citation-snapshot-v2' }
  return {
    ok: true,
    snapshot: {
      version: 2,
      sourceItemId: readNullableBoundedString(value.sourceItemId, 120),
      evidenceId: readNullableBoundedString(value.evidenceId, 120),
      title,
      publisher,
      originalUrl,
      canonicalUrl,
      publishedAt,
      retrievedAt,
      excerpt,
      ...(locator ? { locator } : {}),
      ...(readBoundedString(value.contentHash, 128) ? { contentHash: readBoundedString(value.contentHash, 128) } : {}),
    },
  }
}

function readCitationLocator(value: unknown): AiDailyCitationSnapshotV2['locator'] | null {
  if (value === undefined) return undefined
  if (!isRecord(value)) return null
  const heading = readBoundedString(value.heading, 240)
  const startChar = readNonNegativeInteger(value.startChar)
  const endChar = readNonNegativeInteger(value.endChar)
  if (value.startChar !== undefined && startChar === undefined) return null
  if (value.endChar !== undefined && endChar === undefined) return null
  if (startChar !== undefined && endChar !== undefined && endChar < startChar) return null
  return {
    ...(heading ? { heading } : {}),
    ...(startChar !== undefined ? { startChar } : {}),
    ...(endChar !== undefined ? { endChar } : {}),
  }
}

function readNonNegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

function readIsoDate(value: unknown) {
  if (typeof value !== 'string' || value.length > 40) return ''
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString()
}

function isPublicUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readBoundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length <= maxLength ? value.trim() : ''
}

function readNullableBoundedString(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return null
  return readBoundedString(value, maxLength) || null
}
