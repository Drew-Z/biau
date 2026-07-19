import { createAiDailyModelArtifactHash } from './aiDailyModelArtifacts.js'

export const aiDailyRollbackEvidenceSchemaVersion = 'ai-daily-rollback-evidence-v1'
export const aiDailyRollbackEvidenceDefaultPath = 'server/data/ai-daily-rollback-evidence.local.json'

const checkStatuses = ['passed', 'failed', 'pending'] as const
const rollbackReasons = ['acceptance-drill', 'production-incident', 'operator-request'] as const
const actionKeys = ['ingestCronPaused', 'editorialCronPaused', 'productionGenerationDisabled', 'publicFeedDisabled'] as const
const preservationKeys = ['studioManualEditingAvailable', 'studioReviewAvailable', 'offlineExportAvailable', 'databaseHistoryPreserved'] as const

type CheckStatus = (typeof checkStatuses)[number]
type RollbackReason = (typeof rollbackReasons)[number]

export interface AiDailyRollbackAcceptanceBinding {
  acceptanceId: string
  editionDate: string
  issueId: string
  runId: string
}

export interface AiDailyRollbackEvidenceManifest {
  schemaVersion: typeof aiDailyRollbackEvidenceSchemaVersion
  evidenceId: string
  recordedBy: string
  recordedAt: string
  acceptanceBinding: AiDailyRollbackAcceptanceBinding
  preconditions: {
    databaseBackupRecorded: boolean
    previousRenderRevisionRecorded: boolean
    migrationNames: string[]
  }
  actions: Record<(typeof actionKeys)[number], CheckStatus>
  preservation: Record<(typeof preservationKeys)[number], CheckStatus> & {
    destructiveMutationPerformed: boolean
  }
  decision: {
    status: CheckStatus
    reason: RollbackReason
  }
  recordHash: string | null
}

export type AiDailyRollbackEvaluationResult =
  | {
      ok: true
      manifest: AiDailyRollbackEvidenceManifest
      readyToSeal: boolean
      sealed: boolean
      issues: string[]
    }
  | { ok: false; error: 'invalid-ai-daily-rollback-evidence'; issues: string[] }

export function createAiDailyRollbackEvidenceManifest(input: {
  evidenceId: string
  recordedBy: string
  recordedAt?: string
  acceptanceBinding: AiDailyRollbackAcceptanceBinding
  reason: RollbackReason
}): AiDailyRollbackEvidenceManifest {
  return {
    schemaVersion: aiDailyRollbackEvidenceSchemaVersion,
    evidenceId: readIdentifier(input.evidenceId, 'evidence-id'),
    recordedBy: readSafeActor(input.recordedBy, 'recorded-by'),
    recordedAt: readIsoDate(input.recordedAt ?? new Date().toISOString(), 'recorded-at'),
    acceptanceBinding: normalizeAcceptanceBinding(input.acceptanceBinding),
    preconditions: {
      databaseBackupRecorded: false,
      previousRenderRevisionRecorded: false,
      migrationNames: [],
    },
    actions: emptyStatuses(actionKeys),
    preservation: {
      ...emptyStatuses(preservationKeys),
      destructiveMutationPerformed: false,
    },
    decision: {
      status: 'pending',
      reason: readEnum(input.reason, rollbackReasons, 'decision-reason'),
    },
    recordHash: null,
  }
}

export function normalizeAiDailyRollbackEvidenceManifest(value: unknown): AiDailyRollbackEvidenceManifest {
  if (!isRecord(value) || value.schemaVersion !== aiDailyRollbackEvidenceSchemaVersion) {
    throw new Error('rollback-schema-invalid')
  }
  assertExactKeys(value, ['schemaVersion', 'evidenceId', 'recordedBy', 'recordedAt', 'acceptanceBinding', 'preconditions', 'actions', 'preservation', 'decision', 'recordHash'], 'manifest')
  if (!isRecord(value.preconditions)) throw new Error('rollback-preconditions-required')
  assertExactKeys(value.preconditions, ['databaseBackupRecorded', 'previousRenderRevisionRecorded', 'migrationNames'], 'preconditions')
  if (!isRecord(value.actions)) throw new Error('rollback-actions-required')
  assertExactKeys(value.actions, actionKeys, 'actions')
  if (!isRecord(value.preservation)) throw new Error('rollback-preservation-required')
  assertExactKeys(value.preservation, [...preservationKeys, 'destructiveMutationPerformed'], 'preservation')
  if (!isRecord(value.decision)) throw new Error('rollback-decision-required')
  assertExactKeys(value.decision, ['status', 'reason'], 'decision')

  const actions = {} as AiDailyRollbackEvidenceManifest['actions']
  for (const key of actionKeys) actions[key] = readEnum(value.actions[key], checkStatuses, `action-${key}`)
  const preservation = {} as AiDailyRollbackEvidenceManifest['preservation']
  for (const key of preservationKeys) preservation[key] = readEnum(value.preservation[key], checkStatuses, `preservation-${key}`)
  preservation.destructiveMutationPerformed = readBoolean(value.preservation.destructiveMutationPerformed, 'destructive-mutation-performed')

  return {
    schemaVersion: aiDailyRollbackEvidenceSchemaVersion,
    evidenceId: readIdentifier(value.evidenceId, 'evidence-id'),
    recordedBy: readSafeActor(value.recordedBy, 'recorded-by'),
    recordedAt: readIsoDate(value.recordedAt, 'recorded-at'),
    acceptanceBinding: normalizeAcceptanceBinding(value.acceptanceBinding),
    preconditions: {
      databaseBackupRecorded: readBoolean(value.preconditions.databaseBackupRecorded, 'database-backup-recorded'),
      previousRenderRevisionRecorded: readBoolean(value.preconditions.previousRenderRevisionRecorded, 'previous-render-revision-recorded'),
      migrationNames: readMigrationNames(value.preconditions.migrationNames),
    },
    actions,
    preservation,
    decision: {
      status: readEnum(value.decision.status, checkStatuses, 'decision-status'),
      reason: readEnum(value.decision.reason, rollbackReasons, 'decision-reason'),
    },
    recordHash: value.recordHash === null ? null : readHash(value.recordHash, 'record-hash'),
  }
}

export function evaluateAiDailyRollbackEvidenceManifest(input: {
  manifest: unknown
  expectedBinding?: AiDailyRollbackAcceptanceBinding
  requireSealed?: boolean
}): AiDailyRollbackEvaluationResult {
  let manifest: AiDailyRollbackEvidenceManifest
  try {
    manifest = normalizeAiDailyRollbackEvidenceManifest(input.manifest)
  } catch (error) {
    return { ok: false, error: 'invalid-ai-daily-rollback-evidence', issues: [errorMessage(error)] }
  }

  const issues: string[] = []
  if (input.expectedBinding && !sameBinding(manifest.acceptanceBinding, normalizeAcceptanceBinding(input.expectedBinding))) {
    issues.push('rollback-acceptance-binding-mismatch')
  }
  if (!manifest.preconditions.databaseBackupRecorded) issues.push('rollback-database-backup-required')
  if (!manifest.preconditions.previousRenderRevisionRecorded) issues.push('rollback-previous-revision-required')
  if (manifest.preconditions.migrationNames.length === 0) issues.push('rollback-migrations-required')
  if (actionKeys.some((key) => manifest.actions[key] !== 'passed')) issues.push('rollback-actions-incomplete')
  if (preservationKeys.some((key) => manifest.preservation[key] !== 'passed')) issues.push('rollback-preservation-incomplete')
  if (manifest.preservation.destructiveMutationPerformed) issues.push('rollback-destructive-mutation-detected')
  if (manifest.decision.status !== 'passed') issues.push('rollback-decision-not-passed')

  const expectedRecordHash = createAiDailyRollbackEvidenceRecordHash(manifest)
  const recordHashPresent = manifest.recordHash !== null
  const recordHashValid = recordHashPresent && manifest.recordHash === expectedRecordHash
  if (recordHashPresent && !recordHashValid) issues.push('rollback-record-hash-mismatch')
  const readyToSeal = issues.length === 0
  const sealed = readyToSeal && recordHashValid
  if (input.requireSealed && !sealed) issues.push(recordHashPresent ? 'rollback-not-ready' : 'rollback-record-hash-required')
  return { ok: true, manifest, readyToSeal, sealed, issues: unique(issues) }
}

export function sealAiDailyRollbackEvidenceManifest(input: {
  manifest: unknown
  expectedBinding?: AiDailyRollbackAcceptanceBinding
}): AiDailyRollbackEvidenceManifest {
  const result = evaluateAiDailyRollbackEvidenceManifest({
    manifest: input.manifest,
    expectedBinding: input.expectedBinding,
  })
  if (!result.ok) throw new Error(`${result.error}:${result.issues.join(',')}`)
  if (!result.readyToSeal) throw new Error(`ai-daily-rollback-evidence-not-ready:${result.issues.join(',')}`)
  const base = { ...result.manifest, recordHash: null }
  return { ...base, recordHash: createAiDailyModelArtifactHash(base) }
}

export function createAiDailyRollbackEvidenceRecordHash(manifest: AiDailyRollbackEvidenceManifest) {
  return createAiDailyModelArtifactHash({ ...manifest, recordHash: null })
}

function normalizeAcceptanceBinding(value: unknown): AiDailyRollbackAcceptanceBinding {
  if (!isRecord(value)) throw new Error('rollback-acceptance-binding-required')
  assertExactKeys(value, ['acceptanceId', 'editionDate', 'issueId', 'runId'], 'acceptance-binding')
  return {
    acceptanceId: readIdentifier(value.acceptanceId, 'acceptance-id'),
    editionDate: readEditionDate(value.editionDate, 'edition-date'),
    issueId: readIdentifier(value.issueId, 'issue-id'),
    runId: readIdentifier(value.runId, 'run-id'),
  }
}

function sameBinding(left: AiDailyRollbackAcceptanceBinding, right: AiDailyRollbackAcceptanceBinding) {
  return createAiDailyModelArtifactHash(left) === createAiDailyModelArtifactHash(right)
}

function emptyStatuses<const T extends readonly string[]>(keys: T): Record<T[number], CheckStatus> {
  return Object.fromEntries(keys.map((key) => [key, 'pending'])) as Record<T[number], CheckStatus>
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  const allowedSet = new Set(allowed)
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key))
  if (unknown.length > 0) throw new Error(`rollback-${label}-unknown-field`)
  const missing = allowed.filter((key) => !(key in value))
  if (missing.length > 0) throw new Error(`rollback-${label}-missing-field`)
}

function readIdentifier(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/u.test(value)) throw new Error(`rollback-${label}-invalid`)
  return value
}

function readSafeActor(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 120 || /[\r\n\\/]|https?:|@/iu.test(value)) {
    throw new Error(`rollback-${label}-invalid`)
  }
  return value.trim()
}

function readIsoDate(value: unknown, label: string) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error(`rollback-${label}-invalid`)
  return new Date(value).toISOString()
}

function readEditionDate(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error(`rollback-${label}-invalid`)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`rollback-${label}-invalid`)
  return value
}

function readMigrationNames(value: unknown) {
  if (!Array.isArray(value) || value.length > 20) throw new Error('rollback-migration-names-invalid')
  return value.map((item) => {
    if (typeof item !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u.test(item)) throw new Error('rollback-migration-name-invalid')
    return item
  })
}

function readBoolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') throw new Error(`rollback-${label}-invalid`)
  return value
}

function readHash(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) throw new Error(`rollback-${label}-invalid`)
  return value
}

function readEnum<T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new Error(`rollback-${label}-invalid`)
  return value as T[number]
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
