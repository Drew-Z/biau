import { createHash } from 'node:crypto'
import {
  approveAiDailyModelEvaluation,
  evaluateAiDailyModelCandidate,
  selectAiDailyModelEvaluation,
  type AiDailyApprovedModelEvaluationSelection,
  type AiDailyModelEvaluationCandidateInput,
  type AiDailyModelEvaluationCandidateRecord,
  type AiDailyModelEvaluationSelectionRecord,
} from './aiDailyModelEvaluation.js'
import {
  aiDailyGenerationRoles,
  type AiDailyGenerationRole,
} from './aiDailyGeneration.js'
import {
  resolveAiDailyRuntimeCandidate,
  type AiDailyModelRuntimeConfig,
} from './aiDailyModelRuntime.js'

export const aiDailyModelEvaluationProposalSchemaVersion = 'ai-daily-model-evaluation-proposal-v2'
export const aiDailyModelApprovalBundleSchemaVersion = 'ai-daily-model-approval-bundle-v2'
export const aiDailyModelManualSelectionProposalSchemaVersion = 'ai-daily-model-manual-selection-proposal-v1'
export const aiDailyModelManualSelectionBundleSchemaVersion = 'ai-daily-model-manual-selection-bundle-v1'
export const aiDailyModelManualSelectionRecordSchemaVersion = 'ai-daily-model-manual-selection-v1'

const manualSelectionPendingNote = 'Static role mapping awaits explicit human approval and first-edition Studio review.'

export type AiDailyModelSelectionBasis = 'measured-evaluation' | 'manual-static-selection'

export interface AiDailyModelEvaluationProposal {
  schemaVersion: typeof aiDailyModelEvaluationProposalSchemaVersion
  generatedAt: string
  candidateInputs: AiDailyModelEvaluationCandidateInput[]
  candidateRecords: AiDailyModelEvaluationCandidateRecord[]
  selection: AiDailyModelEvaluationSelectionRecord
  proposalHash: string
}

export interface AiDailyModelApprovalBundle {
  schemaVersion: typeof aiDailyModelApprovalBundleSchemaVersion
  approvedAt: string
  candidateRecords: AiDailyModelEvaluationCandidateRecord[]
  selection: AiDailyApprovedModelEvaluationSelection
  bundleHash: string
}

export interface AiDailyModelManualSelectionRole {
  role: AiDailyGenerationRole
  candidateId: string
  providerRef: string
  failureDomainRef: string
  modelIdentifier: string
  redundancy: 'reduced_redundancy'
}

interface AiDailyModelManualSelectionRecordBase {
  schemaVersion: typeof aiDailyModelManualSelectionRecordSchemaVersion
  selectionId: string
  generatedAt: string
  roles: AiDailyModelManualSelectionRole[]
  redundancy: 'reduced_redundancy'
  reducedRedundancyAcknowledged: true
  recordHash: string
}

export interface AiDailyPendingModelManualSelectionRecord extends AiDailyModelManualSelectionRecordBase {
  approval: { status: 'pending'; reviewedAt: null; reviewedBy: null; notes: string }
}

export interface AiDailyApprovedModelManualSelectionRecord extends AiDailyModelManualSelectionRecordBase {
  approval: { status: 'approved'; reviewedAt: string; reviewedBy: string; notes: string }
}

export type AiDailyModelManualSelectionRecord =
  | AiDailyPendingModelManualSelectionRecord
  | AiDailyApprovedModelManualSelectionRecord

export interface AiDailyModelManualSelectionProposal {
  schemaVersion: typeof aiDailyModelManualSelectionProposalSchemaVersion
  generatedAt: string
  selection: AiDailyPendingModelManualSelectionRecord
  proposalHash: string
}

export interface AiDailyModelManualSelectionBundle {
  schemaVersion: typeof aiDailyModelManualSelectionBundleSchemaVersion
  approvedAt: string
  selection: AiDailyApprovedModelManualSelectionRecord
  bundleHash: string
}

export type AiDailyModelProposal = AiDailyModelEvaluationProposal | AiDailyModelManualSelectionProposal
export type AiDailyModelApprovalArtifact = AiDailyModelApprovalBundle | AiDailyModelManualSelectionBundle

export function createAiDailyModelManualSelectionProposal(input: {
  selectionId: string
  generatedAt: string
  runtime: AiDailyModelRuntimeConfig
  candidateIds: Record<AiDailyGenerationRole, string>
  acknowledgeReducedRedundancy: boolean
}): AiDailyModelManualSelectionProposal {
  if (input.acknowledgeReducedRedundancy !== true) {
    throw new Error('ai-daily-model-manual-selection-reduced-redundancy-acknowledgement-required')
  }
  const selectionId = requireManualSlug(input.selectionId, 'selection-id')
  const generatedAt = requireIsoDate(input.generatedAt, 'manual-selection-generated-at')
  const roles = aiDailyGenerationRoles.map((role) => {
    const candidateId = requireManualSlug(input.candidateIds[role], `${role}-candidate-id`)
    const resolved = resolveAiDailyRuntimeCandidate(input.runtime, candidateId)
    if (!resolved) throw new Error(`ai-daily-${role}-manual-candidate-runtime-missing`)
    if (resolved.candidate.role !== role) throw new Error(`ai-daily-${role}-manual-candidate-role-mismatch`)
    return {
      role,
      candidateId,
      providerRef: requireManualSlug(resolved.channel.providerRef, `${role}-provider-ref`),
      failureDomainRef: requireManualSlug(resolved.channel.failureDomainRef, `${role}-failure-domain-ref`),
      modelIdentifier: requireManualModelIdentifier(resolved.channel.modelIdentifier, `${role}-model-identifier`),
      redundancy: 'reduced_redundancy' as const,
    }
  })
  const selectionBase = {
    schemaVersion: aiDailyModelManualSelectionRecordSchemaVersion as typeof aiDailyModelManualSelectionRecordSchemaVersion,
    selectionId,
    generatedAt,
    roles,
    redundancy: 'reduced_redundancy' as const,
    reducedRedundancyAcknowledged: true as const,
    approval: {
      status: 'pending' as const,
      reviewedAt: null,
      reviewedBy: null,
      notes: manualSelectionPendingNote,
    },
  }
  const selection: AiDailyPendingModelManualSelectionRecord = {
    ...selectionBase,
    recordHash: hashArtifact(selectionBase),
  }
  const base = {
    schemaVersion: aiDailyModelManualSelectionProposalSchemaVersion as typeof aiDailyModelManualSelectionProposalSchemaVersion,
    generatedAt,
    selection,
  }
  return { ...base, proposalHash: hashArtifact(base) }
}

export function validateAiDailyModelManualSelectionProposal(value: unknown): AiDailyModelManualSelectionProposal {
  if (!isRecord(value) || value.schemaVersion !== aiDailyModelManualSelectionProposalSchemaVersion) {
    throw new Error('invalid-ai-daily-model-manual-selection-proposal')
  }
  assertExactKeys(value, ['schemaVersion', 'generatedAt', 'selection', 'proposalHash'], 'manual-selection-proposal')
  const generatedAt = requireIsoDate(value.generatedAt, 'manual-selection-proposal-generated-at')
  const selection = validatePendingManualSelectionRecord(value.selection)
  if (selection.generatedAt !== generatedAt) {
    throw new Error('invalid-ai-daily-model-manual-selection-proposal-generated-at')
  }
  const base = {
    schemaVersion: aiDailyModelManualSelectionProposalSchemaVersion as typeof aiDailyModelManualSelectionProposalSchemaVersion,
    generatedAt,
    selection,
  }
  if (value.proposalHash !== hashArtifact(base)) {
    throw new Error('invalid-ai-daily-model-manual-selection-proposal-hash')
  }
  return { ...base, proposalHash: value.proposalHash as string }
}

export function approveAiDailyModelManualSelectionProposal(input: {
  proposal: AiDailyModelManualSelectionProposal
  review: { reviewedAt: string; reviewedBy: string; notes: string }
  acknowledgeReducedRedundancy: boolean
}): AiDailyModelManualSelectionBundle {
  if (input.acknowledgeReducedRedundancy !== true) {
    throw new Error('ai-daily-model-manual-selection-reduced-redundancy-acknowledgement-required')
  }
  const proposal = validateAiDailyModelManualSelectionProposal(input.proposal)
  const reviewedAt = requireIsoDate(input.review.reviewedAt, 'manual-selection-reviewed-at')
  const reviewedBy = requireSafeManualText(input.review.reviewedBy, 'manual-selection-reviewed-by', 160)
  const notes = requireSafeManualText(input.review.notes, 'manual-selection-review-notes', 500)
  const { approval: pendingApproval, recordHash: pendingHash, ...selectionFields } = proposal.selection
  void pendingApproval
  void pendingHash
  const selectionBase = {
    ...selectionFields,
    approval: {
      status: 'approved' as const,
      reviewedAt,
      reviewedBy,
      notes,
    },
  }
  const selection: AiDailyApprovedModelManualSelectionRecord = {
    ...selectionBase,
    recordHash: hashArtifact(selectionBase),
  }
  const base = {
    schemaVersion: aiDailyModelManualSelectionBundleSchemaVersion as typeof aiDailyModelManualSelectionBundleSchemaVersion,
    approvedAt: reviewedAt,
    selection,
  }
  return { ...base, bundleHash: hashArtifact(base) }
}

export function validateAiDailyModelManualSelectionBundle(value: unknown): AiDailyModelManualSelectionBundle {
  if (!isRecord(value) || value.schemaVersion !== aiDailyModelManualSelectionBundleSchemaVersion) {
    throw new Error('invalid-ai-daily-model-manual-selection-bundle')
  }
  assertExactKeys(value, ['schemaVersion', 'approvedAt', 'selection', 'bundleHash'], 'manual-selection-bundle')
  const approvedAt = requireIsoDate(value.approvedAt, 'manual-selection-bundle-approved-at')
  const selection = validateApprovedManualSelectionRecord(value.selection)
  if (selection.approval.reviewedAt !== approvedAt) {
    throw new Error('invalid-ai-daily-model-manual-selection-bundle-approved-at')
  }
  const base = {
    schemaVersion: aiDailyModelManualSelectionBundleSchemaVersion as typeof aiDailyModelManualSelectionBundleSchemaVersion,
    approvedAt,
    selection,
  }
  if (value.bundleHash !== hashArtifact(base)) {
    throw new Error('invalid-ai-daily-model-manual-selection-bundle-hash')
  }
  return { ...base, bundleHash: value.bundleHash as string }
}

export function validateAiDailyModelProposal(value: unknown): AiDailyModelProposal {
  if (isRecord(value) && value.schemaVersion === aiDailyModelEvaluationProposalSchemaVersion) {
    return validateAiDailyModelEvaluationProposal(value)
  }
  if (isRecord(value) && value.schemaVersion === aiDailyModelManualSelectionProposalSchemaVersion) {
    return validateAiDailyModelManualSelectionProposal(value)
  }
  throw new Error('invalid-ai-daily-model-proposal')
}

export function validateAiDailyModelApprovalArtifact(value: unknown): AiDailyModelApprovalArtifact {
  if (isRecord(value) && value.schemaVersion === aiDailyModelApprovalBundleSchemaVersion) {
    return validateAiDailyModelApprovalBundle(value)
  }
  if (isRecord(value) && value.schemaVersion === aiDailyModelManualSelectionBundleSchemaVersion) {
    return validateAiDailyModelManualSelectionBundle(value)
  }
  throw new Error('invalid-ai-daily-model-approval-artifact')
}

export function getAiDailyModelProposalBasis(proposal: AiDailyModelProposal): AiDailyModelSelectionBasis {
  return proposal.schemaVersion === aiDailyModelEvaluationProposalSchemaVersion
    ? 'measured-evaluation'
    : 'manual-static-selection'
}

export function getAiDailyModelApprovalBasis(artifact: AiDailyModelApprovalArtifact): AiDailyModelSelectionBasis {
  return artifact.schemaVersion === aiDailyModelApprovalBundleSchemaVersion
    ? 'measured-evaluation'
    : 'manual-static-selection'
}

export function createAiDailyModelEvaluationProposal(input: {
  selectionId: string
  generatedAt: string
  candidates: AiDailyModelEvaluationCandidateInput[]
}): AiDailyModelEvaluationProposal {
  const candidateRecords = input.candidates.map((candidate) => {
    const evaluated = evaluateAiDailyModelCandidate(candidate)
    if (!evaluated.ok) throw new Error(`invalid-ai-daily-model-evaluation-candidate:${evaluated.issues.join(',')}`)
    return evaluated.record
  })
  const selection = selectAiDailyModelEvaluation({
    selectionId: input.selectionId,
    generatedAt: input.generatedAt,
    candidates: candidateRecords,
  })
  const base = {
    schemaVersion: aiDailyModelEvaluationProposalSchemaVersion as typeof aiDailyModelEvaluationProposalSchemaVersion,
    generatedAt: new Date(input.generatedAt).toISOString(),
    candidateInputs: input.candidates,
    candidateRecords,
    selection,
  }
  return { ...base, proposalHash: hashArtifact(base) }
}

export function validateAiDailyModelEvaluationProposal(value: unknown): AiDailyModelEvaluationProposal {
  if (!isRecord(value) || value.schemaVersion !== aiDailyModelEvaluationProposalSchemaVersion) {
    throw new Error('invalid-ai-daily-model-evaluation-proposal')
  }
  if (
    !Array.isArray(value.candidateInputs) ||
    !value.candidateInputs.every(isRecord) ||
    !Array.isArray(value.candidateRecords) ||
    !value.candidateRecords.every(isRecord) ||
    !isRecord(value.selection)
  ) {
    throw new Error('invalid-ai-daily-model-evaluation-proposal')
  }
  const selectionId = typeof value.selection.selectionId === 'string' ? value.selection.selectionId : ''
  const generatedAt = typeof value.generatedAt === 'string' ? value.generatedAt : ''
  const recreated = createAiDailyModelEvaluationProposal({
    selectionId,
    generatedAt,
    candidates: value.candidateInputs as unknown as AiDailyModelEvaluationCandidateInput[],
  })
  if (value.proposalHash !== recreated.proposalHash || !sameJson(value.candidateRecords, recreated.candidateRecords) || !sameJson(value.selection, recreated.selection)) {
    throw new Error('invalid-ai-daily-model-evaluation-proposal-hash')
  }
  return recreated
}

export function approveAiDailyModelEvaluationProposal(input: {
  proposal: AiDailyModelEvaluationProposal
  review: { reviewedAt: string; reviewedBy: string; notes: string }
}): AiDailyModelApprovalBundle {
  const proposal = validateAiDailyModelEvaluationProposal(input.proposal)
  const approval = approveAiDailyModelEvaluation(proposal.selection, input.review)
  if (!approval.ok) throw new Error(`ai-daily-model-evaluation-approval-rejected:${approval.issues.join(',')}`)
  const base = {
    schemaVersion: aiDailyModelApprovalBundleSchemaVersion as typeof aiDailyModelApprovalBundleSchemaVersion,
    approvedAt: approval.record.approval.reviewedAt,
    candidateRecords: proposal.candidateRecords,
    selection: approval.record,
  }
  return { ...base, bundleHash: hashArtifact(base) }
}

export function validateAiDailyModelApprovalBundle(value: unknown): AiDailyModelApprovalBundle {
  if (!isRecord(value) || value.schemaVersion !== aiDailyModelApprovalBundleSchemaVersion) {
    throw new Error('invalid-ai-daily-model-approval-bundle')
  }
  if (
    !Array.isArray(value.candidateRecords) ||
    !value.candidateRecords.every(isRecord) ||
    !isRecord(value.selection) ||
    !isRecord(value.selection.approval)
  ) {
    throw new Error('invalid-ai-daily-model-approval-bundle')
  }
  const records = value.candidateRecords as unknown as AiDailyModelEvaluationCandidateRecord[]
  const approvedSelection = value.selection as unknown as AiDailyApprovedModelEvaluationSelection
  const pending = selectAiDailyModelEvaluation({
    selectionId: approvedSelection.selectionId,
    generatedAt: approvedSelection.generatedAt,
    candidates: records,
  })
  const approval = approveAiDailyModelEvaluation(pending, {
    reviewedAt: approvedSelection.approval.reviewedAt,
    reviewedBy: approvedSelection.approval.reviewedBy,
    notes: approvedSelection.approval.notes,
  })
  if (!approval.ok || !sameJson(approval.record, approvedSelection)) {
    throw new Error('invalid-ai-daily-model-approval-selection')
  }
  const base = {
    schemaVersion: aiDailyModelApprovalBundleSchemaVersion as typeof aiDailyModelApprovalBundleSchemaVersion,
    approvedAt: approval.record.approval.reviewedAt,
    candidateRecords: records,
    selection: approval.record,
  }
  if (value.bundleHash !== hashArtifact(base)) throw new Error('invalid-ai-daily-model-approval-bundle-hash')
  return { ...base, bundleHash: value.bundleHash as string }
}

function validatePendingManualSelectionRecord(value: unknown): AiDailyPendingModelManualSelectionRecord {
  const normalized = normalizeManualSelectionRecord(value, 'pending')
  if (normalized.approval.status !== 'pending') {
    throw new Error('invalid-ai-daily-model-manual-selection-pending-status')
  }
  return normalized as AiDailyPendingModelManualSelectionRecord
}

function validateApprovedManualSelectionRecord(value: unknown): AiDailyApprovedModelManualSelectionRecord {
  const normalized = normalizeManualSelectionRecord(value, 'approved')
  if (normalized.approval.status !== 'approved') {
    throw new Error('invalid-ai-daily-model-manual-selection-approved-status')
  }
  return normalized as AiDailyApprovedModelManualSelectionRecord
}

function normalizeManualSelectionRecord(
  value: unknown,
  expectedStatus: 'pending' | 'approved',
): AiDailyModelManualSelectionRecord {
  if (!isRecord(value) || value.schemaVersion !== aiDailyModelManualSelectionRecordSchemaVersion) {
    throw new Error('invalid-ai-daily-model-manual-selection-record')
  }
  assertExactKeys(value, [
    'schemaVersion',
    'selectionId',
    'generatedAt',
    'roles',
    'redundancy',
    'reducedRedundancyAcknowledged',
    'approval',
    'recordHash',
  ], 'manual-selection-record')
  if (!Array.isArray(value.roles) || value.roles.length !== aiDailyGenerationRoles.length) {
    throw new Error('invalid-ai-daily-model-manual-selection-roles')
  }
  const roles = value.roles.map((item, index) => normalizeManualSelectionRole(item, aiDailyGenerationRoles[index]))
  if (value.redundancy !== 'reduced_redundancy' || value.reducedRedundancyAcknowledged !== true) {
    throw new Error('invalid-ai-daily-model-manual-selection-redundancy')
  }
  if (!isRecord(value.approval)) throw new Error('invalid-ai-daily-model-manual-selection-approval')
  assertExactKeys(value.approval, ['status', 'reviewedAt', 'reviewedBy', 'notes'], 'manual-selection-approval')
  if (value.approval.status !== expectedStatus) {
    throw new Error('invalid-ai-daily-model-manual-selection-approval-status')
  }

  const approval = expectedStatus === 'pending'
    ? normalizePendingManualApproval(value.approval)
    : normalizeApprovedManualApproval(value.approval)
  const base = {
    schemaVersion: aiDailyModelManualSelectionRecordSchemaVersion as typeof aiDailyModelManualSelectionRecordSchemaVersion,
    selectionId: requireManualSlug(value.selectionId, 'manual-selection-id'),
    generatedAt: requireIsoDate(value.generatedAt, 'manual-selection-record-generated-at'),
    roles,
    redundancy: 'reduced_redundancy' as const,
    reducedRedundancyAcknowledged: true as const,
    approval,
  }
  if (value.recordHash !== hashArtifact(base)) {
    throw new Error('invalid-ai-daily-model-manual-selection-record-hash')
  }
  return { ...base, recordHash: value.recordHash as string } as AiDailyModelManualSelectionRecord
}

function normalizeManualSelectionRole(value: unknown, expectedRole: AiDailyGenerationRole): AiDailyModelManualSelectionRole {
  if (!isRecord(value)) throw new Error('invalid-ai-daily-model-manual-selection-role')
  assertExactKeys(
    value,
    ['role', 'candidateId', 'providerRef', 'failureDomainRef', 'modelIdentifier', 'redundancy'],
    'manual-selection-role',
  )
  if (value.role !== expectedRole || value.redundancy !== 'reduced_redundancy') {
    throw new Error(`invalid-ai-daily-model-manual-selection-${expectedRole}-role`)
  }
  return {
    role: expectedRole,
    candidateId: requireManualSlug(value.candidateId, `${expectedRole}-candidate-id`),
    providerRef: requireManualSlug(value.providerRef, `${expectedRole}-provider-ref`),
    failureDomainRef: requireManualSlug(value.failureDomainRef, `${expectedRole}-failure-domain-ref`),
    modelIdentifier: requireManualModelIdentifier(value.modelIdentifier, `${expectedRole}-model-identifier`),
    redundancy: 'reduced_redundancy',
  }
}

function normalizePendingManualApproval(value: Record<string, unknown>) {
  if (
    value.status !== 'pending' ||
    value.reviewedAt !== null ||
    value.reviewedBy !== null ||
    value.notes !== manualSelectionPendingNote
  ) {
    throw new Error('invalid-ai-daily-model-manual-selection-pending-approval')
  }
  return {
    status: 'pending' as const,
    reviewedAt: null,
    reviewedBy: null,
    notes: manualSelectionPendingNote,
  }
}

function normalizeApprovedManualApproval(value: Record<string, unknown>) {
  return {
    status: 'approved' as const,
    reviewedAt: requireIsoDate(value.reviewedAt, 'manual-selection-reviewed-at'),
    reviewedBy: requireSafeManualText(value.reviewedBy, 'manual-selection-reviewed-by', 160),
    notes: requireSafeManualText(value.notes, 'manual-selection-review-notes', 500),
  }
}

export function createAiDailyModelArtifactHash(value: unknown) {
  return hashArtifact(value)
}

function requireManualSlug(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) || value.length > 120) {
    throw new Error(`invalid-ai-daily-model-manual-selection-${label}`)
  }
  return value
}

function requireManualModelIdentifier(value: unknown, label: string) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/u.test(value) ||
    value.includes('://') ||
    /(?:^|[^A-Za-z0-9])(?:sk|pk|rk)-[A-Za-z0-9_-]{8,}/u.test(value) ||
    /^bearer:/iu.test(value) ||
    containsSensitiveArtifactText(value)
  ) {
    throw new Error(`invalid-ai-daily-model-manual-selection-${label}`)
  }
  return value
}

function requireIsoDate(value: unknown, label: string) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`invalid-ai-daily-model-${label}`)
  }
  return new Date(value).toISOString()
}

function requireSafeManualText(value: unknown, label: string, maxLength: number) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.trim().length > maxLength ||
    /[\r\n]/u.test(value) ||
    containsSensitiveArtifactText(value)
  ) {
    throw new Error(`invalid-ai-daily-model-${label}`)
  }
  return value.trim()
}

function containsSensitiveArtifactText(value: string) {
  return (
    /https?:\/\/\S+/iu.test(value) ||
    /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/\S+/iu.test(value) ||
    /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/iu.test(value) ||
    /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/u.test(value) ||
    /(?:api[_-]?key|secret|password|database[_-]?url)\s*[:=]/iu.test(value) ||
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/u.test(value)
  )
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], label: string) {
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key)) || keys.some((key) => !(key in value))) {
    throw new Error(`invalid-ai-daily-model-${label}-fields`)
  }
}

function hashArtifact(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

function sameJson(left: unknown, right: unknown) {
  return stableJson(left) === stableJson(right)
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
