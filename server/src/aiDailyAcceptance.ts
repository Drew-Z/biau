import {
  createAiDailyModelArtifactHash,
  validateAiDailyModelApprovalBundle,
  validateAiDailyModelEvaluationProposal,
  type AiDailyModelApprovalBundle,
  type AiDailyModelEvaluationProposal,
} from './aiDailyModelArtifacts.js'
import {
  evaluateAiDailyRollbackEvidenceManifest,
  type AiDailyRollbackAcceptanceBinding,
} from './aiDailyRollback.js'

export const aiDailyAcceptanceManifestSchemaVersion = 'ai-daily-acceptance-v2'
export const aiDailyAcceptanceManifestDefaultPath = 'server/data/ai-daily-acceptance.local.json'

const acceptanceProfiles = ['PRODUCTION', 'FIXTURE', 'DEGRADED'] as const
const liveRunStatuses = ['COMPLETED', 'COMPLETED_WITH_GAPS', 'FAILED', 'CANCELLED'] as const
const reviewStatuses = ['APPROVED', 'NEEDS_CHANGES', 'REJECTED', 'PENDING'] as const
const draftStatuses = ['APPROVED', 'PUBLISHED', 'REVIEW_NEEDED', 'DRAFT', 'REJECTED', 'ARCHIVED'] as const
const exportStatuses = ['passed', 'failed', 'local-export-written', 'pending-local-export'] as const
const deploymentChecks = ['publicFeed', 'detailPage', 'etag304', 'withdrawn410', 'mobile'] as const

type Nullable<T> = T | null
type CheckStatus = 'passed' | 'failed' | 'pending'

export interface AiDailyAcceptanceEvaluationEvidence {
  proposalHash: string
  proposalSelectionRecordHash: string
  bundleHash: string
  approvedSelectionRecordHash: string
  selectionId: string
  reviewedBy: string
  approvedAt: string
}

export interface AiDailyAcceptanceLiveEdition {
  issueId: Nullable<string>
  runId: Nullable<string>
  editionDate: Nullable<string>
  profile: Nullable<(typeof acceptanceProfiles)[number]>
  status: Nullable<(typeof liveRunStatuses)[number]>
  completedAt: Nullable<string>
}

export interface AiDailyAcceptanceStudioReview {
  issueId: Nullable<string>
  runId: Nullable<string>
  editionDate: Nullable<string>
  draftId: Nullable<string>
  draftUpdatedAt: Nullable<string>
  reviewId: Nullable<string>
  draftStatus: Nullable<(typeof draftStatuses)[number]>
  reviewStatus: Nullable<(typeof reviewStatuses)[number]>
  checklist: {
    sourceChecked: boolean
    safetyChecked: boolean
    publicReady: boolean
  } | null
}

export interface AiDailyAcceptancePublishExport {
  publishExportId: Nullable<string>
  draftId: Nullable<string>
  reviewId: Nullable<string>
  draftUpdatedAt: Nullable<string>
  target: Nullable<string>
  exportedFiles: string[]
  checks: {
    status: (typeof exportStatuses)[number]
    exportedAt: string | null
    results: Array<{ command: string; exitCode: number | null }>
  } | null
}

export interface AiDailyAcceptanceDeploymentObservation {
  observedBy: Nullable<string>
  observedAt: Nullable<string>
  checks: Record<(typeof deploymentChecks)[number], CheckStatus>
  rollbackEvidence: {
    evidenceId: string
    recordHash: string
    status: 'passed'
  } | null
}

export interface AiDailyAcceptanceManifest {
  schemaVersion: typeof aiDailyAcceptanceManifestSchemaVersion
  acceptanceId: string
  editionDate: string
  createdAt: string
  evaluation: AiDailyAcceptanceEvaluationEvidence
  liveEdition: AiDailyAcceptanceLiveEdition
  studio: AiDailyAcceptanceStudioReview
  publishExport: AiDailyAcceptancePublishExport
  deployment: AiDailyAcceptanceDeploymentObservation
  recordHash: string | null
}

export interface AiDailyAcceptanceGateReport {
  evaluation: 'verified' | 'recorded' | 'missing'
  liveEdition: 'passed' | 'missing' | 'failed'
  studio: 'passed' | 'missing' | 'failed'
  publishExport: 'passed' | 'missing' | 'failed'
  deployment: 'passed' | 'missing' | 'failed'
  rollback: 'verified' | 'missing' | 'failed'
}

export type AiDailyAcceptanceEvaluationResult =
  | {
      ok: true
      manifest: AiDailyAcceptanceManifest
      readyToSeal: boolean
      sealed: boolean
      evidenceVerified: boolean
      issues: string[]
      gates: AiDailyAcceptanceGateReport
    }
  | { ok: false; error: 'invalid-ai-daily-acceptance-manifest'; issues: string[] }

export function createAiDailyAcceptanceManifest(input: {
  acceptanceId: string
  editionDate: string
  proposal: unknown
  bundle: unknown
  createdAt?: string
}): AiDailyAcceptanceManifest {
  const proposal = validateAiDailyModelEvaluationProposal(input.proposal)
  const bundle = validateAiDailyModelApprovalBundle(input.bundle)
  const issues = compareEvaluationArtifacts(proposal, bundle)
  if (issues.length > 0) throw new Error(`invalid-ai-daily-acceptance-artifacts:${issues.join(',')}`)
  const acceptanceId = readIdentifier(input.acceptanceId, 'acceptance-id')
  const editionDate = readEditionDate(input.editionDate, 'edition-date')
  const createdAt = readIsoDate(input.createdAt ?? new Date().toISOString(), 'created-at')
  return {
    schemaVersion: aiDailyAcceptanceManifestSchemaVersion,
    acceptanceId,
    editionDate,
    createdAt,
    evaluation: evaluationFromArtifacts(proposal, bundle),
    liveEdition: {
      issueId: null,
      runId: null,
      editionDate: null,
      profile: null,
      status: null,
      completedAt: null,
    },
    studio: {
      issueId: null,
      runId: null,
      editionDate: null,
      draftId: null,
      draftUpdatedAt: null,
      reviewId: null,
      draftStatus: null,
      reviewStatus: null,
      checklist: null,
    },
    publishExport: {
      publishExportId: null,
      draftId: null,
      reviewId: null,
      draftUpdatedAt: null,
      target: null,
      exportedFiles: [],
      checks: null,
    },
    deployment: {
      observedBy: null,
      observedAt: null,
      checks: emptyDeploymentChecks(),
      rollbackEvidence: null,
    },
    recordHash: null,
  }
}

export function normalizeAiDailyAcceptanceManifest(value: unknown): AiDailyAcceptanceManifest {
  if (!isRecord(value) || value.schemaVersion !== aiDailyAcceptanceManifestSchemaVersion) {
    throw new Error('invalid-ai-daily-acceptance-manifest-schema')
  }
  assertExactKeys(value, ['schemaVersion', 'acceptanceId', 'editionDate', 'createdAt', 'evaluation', 'liveEdition', 'studio', 'publishExport', 'deployment', 'recordHash'], 'manifest')
  const evaluation = normalizeEvaluation(value.evaluation)
  const liveEdition = normalizeLiveEdition(value.liveEdition)
  const studio = normalizeStudio(value.studio)
  const publishExport = normalizePublishExport(value.publishExport)
  const deployment = normalizeDeployment(value.deployment)
  return {
    schemaVersion: aiDailyAcceptanceManifestSchemaVersion,
    acceptanceId: readIdentifier(value.acceptanceId, 'acceptance-id'),
    editionDate: readEditionDate(value.editionDate, 'edition-date'),
    createdAt: readIsoDate(value.createdAt, 'created-at'),
    evaluation,
    liveEdition,
    studio,
    publishExport,
    deployment,
    recordHash: value.recordHash === null ? null : readHash(value.recordHash, 'record-hash'),
  }
}

export function evaluateAiDailyAcceptanceManifest(input: {
  manifest: unknown
  proposal?: unknown
  bundle?: unknown
  rollbackEvidence?: unknown
  requireArtifacts?: boolean
  requireSealed?: boolean
}): AiDailyAcceptanceEvaluationResult {
  let manifest: AiDailyAcceptanceManifest
  try {
    manifest = normalizeAiDailyAcceptanceManifest(input.manifest)
  } catch (error) {
    return { ok: false, error: 'invalid-ai-daily-acceptance-manifest', issues: [errorMessage(error)] }
  }

  const issues: string[] = []
  const artifactsRequired = input.requireArtifacts === true || input.requireSealed === true
  let evidenceVerified = false
  if (input.proposal !== undefined || input.bundle !== undefined) {
    if (input.proposal === undefined || input.bundle === undefined) {
      issues.push('acceptance-artifact-pair-required')
    } else {
      try {
        const proposal = validateAiDailyModelEvaluationProposal(input.proposal)
        const bundle = validateAiDailyModelApprovalBundle(input.bundle)
        issues.push(...compareEvaluationArtifacts(proposal, bundle))
        issues.push(...compareManifestEvaluation(manifest.evaluation, proposal, bundle))
        evidenceVerified = issues.length === 0
      } catch (error) {
        issues.push(`acceptance-artifacts-invalid:${errorMessage(error)}`)
      }
    }
  } else if (artifactsRequired) {
    issues.push('acceptance-artifacts-required')
  }

  const rollback = evaluateRollbackEvidence(manifest, input.rollbackEvidence, issues)

  const gates: AiDailyAcceptanceGateReport = {
    evaluation: evidenceVerified ? 'verified' : artifactsRequired ? 'missing' : 'recorded',
    liveEdition: evaluateLiveEdition(manifest, issues),
    studio: evaluateStudioReview(manifest, issues),
    publishExport: evaluatePublishExport(manifest, issues),
    deployment: evaluateDeployment(manifest, issues),
    rollback: rollback.gate,
  }
  const expectedRecordHash = createAiDailyAcceptanceRecordHash(manifest)
  const recordHashPresent = manifest.recordHash !== null
  const recordHashValid = recordHashPresent && manifest.recordHash === expectedRecordHash
  if (recordHashPresent && !recordHashValid) issues.push('acceptance-record-hash-mismatch')
  const readyToSeal = issues.length === 0 && evidenceVerified && rollback.verified && Object.values(gates).every((gate) => gate === 'passed' || gate === 'verified')
  const sealed = recordHashPresent && recordHashValid && readyToSeal
  if (input.requireSealed && !sealed) issues.push(recordHashPresent ? 'acceptance-not-ready' : 'acceptance-record-hash-required')
  return {
    ok: true,
    manifest,
    readyToSeal,
    sealed,
    evidenceVerified,
    issues: unique(issues),
    gates,
  }
}

export function sealAiDailyAcceptanceManifest(input: {
  manifest: unknown
  proposal: unknown
  bundle: unknown
  rollbackEvidence: unknown
}): AiDailyAcceptanceManifest {
  const result = evaluateAiDailyAcceptanceManifest({
    manifest: input.manifest,
    proposal: input.proposal,
    bundle: input.bundle,
    rollbackEvidence: input.rollbackEvidence,
    requireArtifacts: true,
  })
  if (!result.ok) throw new Error(`${result.error}:${result.issues.join(',')}`)
  if (!result.readyToSeal) throw new Error(`ai-daily-acceptance-not-ready:${result.issues.join(',')}`)
  const base = { ...result.manifest, recordHash: null }
  return { ...base, recordHash: createAiDailyModelArtifactHash(base) }
}

export function createAiDailyAcceptanceRecordHash(manifest: AiDailyAcceptanceManifest) {
  return createAiDailyModelArtifactHash({ ...manifest, recordHash: null })
}

function evaluationFromArtifacts(
  proposal: AiDailyModelEvaluationProposal,
  bundle: AiDailyModelApprovalBundle,
): AiDailyAcceptanceEvaluationEvidence {
  return {
    proposalHash: proposal.proposalHash,
    proposalSelectionRecordHash: proposal.selection.recordHash,
    bundleHash: bundle.bundleHash,
    approvedSelectionRecordHash: bundle.selection.recordHash,
    selectionId: bundle.selection.selectionId,
    reviewedBy: bundle.selection.approval.reviewedBy,
    approvedAt: bundle.selection.approval.reviewedAt,
  }
}

function compareEvaluationArtifacts(proposal: AiDailyModelEvaluationProposal, bundle: AiDailyModelApprovalBundle) {
  const issues: string[] = []
  if (proposal.selection.selectionId !== bundle.selection.selectionId) issues.push('acceptance-selection-id-mismatch')
  if (createAiDailyModelArtifactHash(proposal.candidateRecords) !== createAiDailyModelArtifactHash(bundle.candidateRecords)) {
    issues.push('acceptance-candidate-records-mismatch')
  }
  if (selectionBaseHash(proposal.selection) !== selectionBaseHash(bundle.selection)) issues.push('acceptance-selection-mismatch')
  return issues
}

function compareManifestEvaluation(
  evaluation: AiDailyAcceptanceEvaluationEvidence,
  proposal: AiDailyModelEvaluationProposal,
  bundle: AiDailyModelApprovalBundle,
) {
  const expected = evaluationFromArtifacts(proposal, bundle)
  return createAiDailyModelArtifactHash(evaluation) === createAiDailyModelArtifactHash(expected)
    ? []
    : ['acceptance-evaluation-evidence-mismatch']
}

function selectionBaseHash(selection: unknown) {
  if (!isRecord(selection)) throw new Error('acceptance-selection-invalid')
  const base = { ...selection }
  delete base.approval
  delete base.recordHash
  return createAiDailyModelArtifactHash(base)
}

function evaluateLiveEdition(manifest: AiDailyAcceptanceManifest, issues: string[]) {
  const value = manifest.liveEdition
  if (!value.issueId || !value.runId || !value.editionDate || !value.profile || !value.status || !value.completedAt) {
    issues.push('live-edition-required')
    return 'missing' as const
  }
  if (value.editionDate !== manifest.editionDate) issues.push('live-edition-date-mismatch')
  if (value.profile !== 'PRODUCTION') issues.push('live-edition-profile-not-production')
  if (value.status !== 'COMPLETED') issues.push('live-edition-not-completed')
  return value.profile === 'PRODUCTION' && value.status === 'COMPLETED' && value.editionDate === manifest.editionDate
    ? 'passed' as const
    : 'failed' as const
}

function evaluateStudioReview(manifest: AiDailyAcceptanceManifest, issues: string[]) {
  const value = manifest.studio
  if (!value.issueId || !value.runId || !value.editionDate || !value.draftId || !value.draftUpdatedAt || !value.reviewId || !value.draftStatus || !value.reviewStatus || !value.checklist) {
    issues.push('studio-review-required')
    return 'missing' as const
  }
  if (value.issueId !== manifest.liveEdition.issueId) issues.push('studio-issue-mismatch')
  if (value.runId !== manifest.liveEdition.runId) issues.push('studio-run-mismatch')
  if (value.editionDate !== manifest.editionDate) issues.push('studio-edition-date-mismatch')
  if (value.draftStatus !== 'APPROVED' && value.draftStatus !== 'PUBLISHED') issues.push('studio-draft-not-approved')
  if (value.reviewStatus !== 'APPROVED') issues.push('studio-review-not-approved')
  if (!value.checklist.sourceChecked || !value.checklist.safetyChecked || !value.checklist.publicReady) issues.push('studio-review-checklist-incomplete')
  const passed = value.issueId === manifest.liveEdition.issueId &&
    value.runId === manifest.liveEdition.runId &&
    value.editionDate === manifest.editionDate &&
    (value.draftStatus === 'APPROVED' || value.draftStatus === 'PUBLISHED') &&
    value.reviewStatus === 'APPROVED' &&
    value.checklist.sourceChecked && value.checklist.safetyChecked && value.checklist.publicReady
  return passed ? 'passed' as const : 'failed' as const
}

function evaluatePublishExport(manifest: AiDailyAcceptanceManifest, issues: string[]) {
  const value = manifest.publishExport
  if (!value.publishExportId || !value.draftId || !value.reviewId || !value.draftUpdatedAt || !value.target || value.exportedFiles.length === 0 || !value.checks || !value.checks.exportedAt) {
    issues.push('publish-export-required')
    return 'missing' as const
  }
  if (value.draftId !== manifest.studio.draftId) issues.push('publish-export-draft-mismatch')
  if (value.reviewId !== manifest.studio.reviewId) issues.push('publish-export-review-mismatch')
  if (value.draftUpdatedAt !== manifest.studio.draftUpdatedAt) issues.push('publish-export-version-mismatch')
  if (value.checks.status !== 'passed') issues.push('publish-export-checks-not-passed')
  if (value.checks.results.length === 0 || value.checks.results.some((result) => result.exitCode !== 0)) issues.push('publish-export-command-failed')
  const passed = value.draftId === manifest.studio.draftId &&
    value.reviewId === manifest.studio.reviewId &&
    value.draftUpdatedAt === manifest.studio.draftUpdatedAt &&
    value.checks.status === 'passed' &&
    value.checks.results.length > 0 &&
    value.checks.results.every((result) => result.exitCode === 0)
  return passed ? 'passed' as const : 'failed' as const
}

function evaluateRollbackEvidence(
  manifest: AiDailyAcceptanceManifest,
  rollbackEvidence: unknown,
  issues: string[],
): { gate: AiDailyAcceptanceGateReport['rollback']; verified: boolean } {
  if (rollbackEvidence === undefined) {
    issues.push('acceptance-rollback-evidence-required')
    return { gate: 'missing', verified: false }
  }
  if (!manifest.liveEdition.issueId || !manifest.liveEdition.runId) {
    issues.push('acceptance-rollback-binding-required')
    return { gate: 'failed', verified: false }
  }
  const expectedBinding: AiDailyRollbackAcceptanceBinding = {
    acceptanceId: manifest.acceptanceId,
    editionDate: manifest.editionDate,
    issueId: manifest.liveEdition.issueId,
    runId: manifest.liveEdition.runId,
  }
  const result = evaluateAiDailyRollbackEvidenceManifest({
    manifest: rollbackEvidence,
    expectedBinding,
    requireSealed: true,
  })
  if (!result.ok) {
    issues.push('acceptance-rollback-evidence-invalid')
    return { gate: 'failed', verified: false }
  }
  if (result.issues.includes('rollback-acceptance-binding-mismatch')) {
    issues.push('acceptance-rollback-evidence-binding-mismatch')
  }
  if (!result.sealed) issues.push('acceptance-rollback-evidence-not-sealed')
  const reference = manifest.deployment.rollbackEvidence
  if (!reference) {
    issues.push('acceptance-rollback-evidence-reference-required')
    return { gate: result.sealed ? 'missing' : 'failed', verified: false }
  }
  if (
    reference.evidenceId !== result.manifest.evidenceId ||
    reference.recordHash !== result.manifest.recordHash ||
    reference.status !== 'passed'
  ) {
    issues.push('acceptance-rollback-evidence-reference-mismatch')
  }
  const verified = result.sealed && result.issues.length === 0 &&
    reference.evidenceId === result.manifest.evidenceId &&
    reference.recordHash === result.manifest.recordHash &&
    reference.status === 'passed'
  return { gate: verified ? 'verified' : 'failed', verified }
}

function evaluateDeployment(manifest: AiDailyAcceptanceManifest, issues: string[]) {
  const value = manifest.deployment
  if (!value.observedBy || !value.observedAt) {
    issues.push('deployment-observation-required')
    return 'missing' as const
  }
  const failed = deploymentChecks.some((check) => value.checks[check] !== 'passed')
  if (failed) issues.push('deployment-observation-incomplete')
  return failed ? 'failed' as const : 'passed' as const
}

function normalizeEvaluation(value: unknown): AiDailyAcceptanceEvaluationEvidence {
  if (!isRecord(value)) throw new Error('acceptance-evaluation-required')
  assertExactKeys(value, ['proposalHash', 'proposalSelectionRecordHash', 'bundleHash', 'approvedSelectionRecordHash', 'selectionId', 'reviewedBy', 'approvedAt'], 'evaluation')
  return {
    proposalHash: readHash(value.proposalHash, 'proposal-hash'),
    proposalSelectionRecordHash: readHash(value.proposalSelectionRecordHash, 'proposal-selection-record-hash'),
    bundleHash: readHash(value.bundleHash, 'bundle-hash'),
    approvedSelectionRecordHash: readHash(value.approvedSelectionRecordHash, 'approved-selection-record-hash'),
    selectionId: readIdentifier(value.selectionId, 'selection-id'),
    reviewedBy: readSafeActor(value.reviewedBy, 'reviewed-by'),
    approvedAt: readIsoDate(value.approvedAt, 'approved-at'),
  }
}

function normalizeLiveEdition(value: unknown): AiDailyAcceptanceLiveEdition {
  if (!isRecord(value)) throw new Error('acceptance-live-edition-required')
  assertExactKeys(value, ['issueId', 'runId', 'editionDate', 'profile', 'status', 'completedAt'], 'live-edition')
  return {
    issueId: readNullableIdentifier(value.issueId, 'live-issue-id'),
    runId: readNullableIdentifier(value.runId, 'live-run-id'),
    editionDate: value.editionDate === null ? null : readEditionDate(value.editionDate, 'live-edition-date'),
    profile: readNullableEnum(value.profile, acceptanceProfiles, 'live-profile'),
    status: readNullableEnum(value.status, liveRunStatuses, 'live-status'),
    completedAt: value.completedAt === null ? null : readIsoDate(value.completedAt, 'live-completed-at'),
  }
}

function normalizeStudio(value: unknown): AiDailyAcceptanceStudioReview {
  if (!isRecord(value)) throw new Error('acceptance-studio-review-required')
  assertExactKeys(value, ['issueId', 'runId', 'editionDate', 'draftId', 'draftUpdatedAt', 'reviewId', 'draftStatus', 'reviewStatus', 'checklist'], 'studio')
  let checklist: AiDailyAcceptanceStudioReview['checklist'] = null
  if (value.checklist !== null) {
    if (!isRecord(value.checklist) || typeof value.checklist.sourceChecked !== 'boolean' || typeof value.checklist.safetyChecked !== 'boolean' || typeof value.checklist.publicReady !== 'boolean') {
      throw new Error('acceptance-studio-checklist-invalid')
    }
    assertExactKeys(value.checklist, ['sourceChecked', 'safetyChecked', 'publicReady'], 'studio-checklist')
    checklist = {
      sourceChecked: value.checklist.sourceChecked,
      safetyChecked: value.checklist.safetyChecked,
      publicReady: value.checklist.publicReady,
    }
  }
  return {
    issueId: readNullableIdentifier(value.issueId, 'studio-issue-id'),
    runId: readNullableIdentifier(value.runId, 'studio-run-id'),
    editionDate: value.editionDate === null ? null : readEditionDate(value.editionDate, 'studio-edition-date'),
    draftId: readNullableIdentifier(value.draftId, 'studio-draft-id'),
    draftUpdatedAt: value.draftUpdatedAt === null ? null : readIsoDate(value.draftUpdatedAt, 'studio-draft-updated-at'),
    reviewId: readNullableIdentifier(value.reviewId, 'studio-review-id'),
    draftStatus: readNullableEnum(value.draftStatus, draftStatuses, 'studio-draft-status'),
    reviewStatus: readNullableEnum(value.reviewStatus, reviewStatuses, 'studio-review-status'),
    checklist,
  }
}

function normalizePublishExport(value: unknown): AiDailyAcceptancePublishExport {
  if (!isRecord(value)) throw new Error('acceptance-publish-export-required')
  assertExactKeys(value, ['publishExportId', 'draftId', 'reviewId', 'draftUpdatedAt', 'target', 'exportedFiles', 'checks'], 'publish-export')
  const exportedFiles = readStringArray(value.exportedFiles, 20)
  if (exportedFiles.some((file) => !isSafeRepoPath(file))) throw new Error('acceptance-exported-file-invalid')
  let checks: AiDailyAcceptancePublishExport['checks'] = null
  if (value.checks !== null) {
    if (!isRecord(value.checks)) throw new Error('acceptance-export-checks-invalid')
    assertExactKeys(value.checks, ['status', 'exportedAt', 'results'], 'export-checks')
    const results = Array.isArray(value.checks.results)
      ? value.checks.results.map((item) => {
          if (!isRecord(item) || typeof item.command !== 'string' || item.command.length === 0 || item.command.length > 160) throw new Error('acceptance-export-result-invalid')
          assertExactKeys(item, ['command', 'exitCode'], 'export-result')
          return { command: readLowSensitivityText(item.command, 'export-command', 160), exitCode: readExitCode(item.exitCode) }
        })
      : []
    checks = {
      status: readEnum(value.checks.status, exportStatuses, 'export-check-status'),
      exportedAt: value.checks.exportedAt === null ? null : readIsoDate(value.checks.exportedAt, 'exported-at'),
      results,
    }
  }
  return {
    publishExportId: readNullableIdentifier(value.publishExportId, 'publish-export-id'),
    draftId: readNullableIdentifier(value.draftId, 'export-draft-id'),
    reviewId: readNullableIdentifier(value.reviewId, 'export-review-id'),
    draftUpdatedAt: value.draftUpdatedAt === null ? null : readIsoDate(value.draftUpdatedAt, 'export-draft-updated-at'),
    target: value.target === null ? null : readLowSensitivityText(value.target, 'export-target', 120),
    exportedFiles,
    checks,
  }
}

function normalizeDeployment(value: unknown): AiDailyAcceptanceDeploymentObservation {
  if (!isRecord(value) || !isRecord(value.checks)) throw new Error('acceptance-deployment-required')
  assertExactKeys(value, ['observedBy', 'observedAt', 'checks', 'rollbackEvidence'], 'deployment')
  assertExactKeys(value.checks, deploymentChecks, 'deployment-checks')
  const checks = {} as AiDailyAcceptanceDeploymentObservation['checks']
  for (const key of deploymentChecks) checks[key] = readEnum(value.checks[key], ['passed', 'failed', 'pending'] as const, `deployment-${key}`)
  let rollbackEvidence: AiDailyAcceptanceDeploymentObservation['rollbackEvidence'] = null
  if (value.rollbackEvidence !== null) {
    if (!isRecord(value.rollbackEvidence)) throw new Error('acceptance-rollback-evidence-reference-invalid')
    assertExactKeys(value.rollbackEvidence, ['evidenceId', 'recordHash', 'status'], 'rollback-evidence-reference')
    rollbackEvidence = {
      evidenceId: readIdentifier(value.rollbackEvidence.evidenceId, 'rollback-evidence-id'),
      recordHash: readHash(value.rollbackEvidence.recordHash, 'rollback-evidence-record-hash'),
      status: readEnum(value.rollbackEvidence.status, ['passed'] as const, 'rollback-evidence-status'),
    }
  }
  return {
    observedBy: readNullableActor(value.observedBy, 'observed-by'),
    observedAt: value.observedAt === null ? null : readIsoDate(value.observedAt, 'observed-at'),
    checks,
    rollbackEvidence,
  }
}

function emptyDeploymentChecks(): AiDailyAcceptanceDeploymentObservation['checks'] {
  return {
    publicFeed: 'pending',
    detailPage: 'pending',
    etag304: 'pending',
    withdrawn410: 'pending',
    mobile: 'pending',
  }
}

function readIdentifier(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/u.test(value)) throw new Error(`acceptance-${label}-invalid`)
  return value
}

function readNullableIdentifier(value: unknown, label: string) {
  return value === null ? null : readIdentifier(value, label)
}

function readSafeActor(value: unknown, label: string) {
  const text = readSafeText(value, label, 120)
  if (/[\\/]|https?:|@/iu.test(text)) throw new Error(`acceptance-${label}-invalid`)
  return text
}

function readNullableActor(value: unknown, label: string) {
  return value === null ? null : readSafeActor(value, label)
}

function readSafeText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength || /[\r\n]/u.test(value)) throw new Error(`acceptance-${label}-invalid`)
  return value.trim()
}

function readLowSensitivityText(value: unknown, label: string, maxLength: number) {
  const text = readSafeText(value, label, maxLength)
  if (/(?:https?:|postgres(?:ql)?:|bearer\s|api[_-]?key|access[_-]?token|secret|password|database[_-]?url|-----begin)/iu.test(text)) {
    throw new Error(`acceptance-${label}-sensitive`)
  }
  return text
}

function readHash(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) throw new Error(`acceptance-${label}-invalid`)
  return value
}

function readIsoDate(value: unknown, label: string) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error(`acceptance-${label}-invalid`)
  return new Date(value).toISOString()
}

function readEditionDate(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error(`acceptance-${label}-invalid`)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`acceptance-${label}-invalid`)
  return value
}

function readEnum<T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new Error(`acceptance-${label}-invalid`)
  return value as T[number]
}

function readNullableEnum<T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] | null {
  return value === null ? null : readEnum(value, allowed, label)
}

function readExitCode(value: unknown) {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < -1 || value > 255) {
    throw new Error('acceptance-export-exit-code-invalid')
  }
  return value
}

function readStringArray(value: unknown, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxLength || !value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 200)) {
    throw new Error('acceptance-exported-files-invalid')
  }
  return [...value] as string[]
}

function isSafeRepoPath(value: string) {
  return !value.includes('..') && !value.startsWith('/') && !/^[A-Za-z]:[\\/]/u.test(value) && /^[./A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/u.test(value)
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  const allowedSet = new Set(allowed)
  if (Object.keys(value).some((key) => !allowedSet.has(key))) throw new Error(`acceptance-${label}-unknown-field`)
  if (allowed.some((key) => !(key in value))) throw new Error(`acceptance-${label}-missing-field`)
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
