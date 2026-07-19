import { createHash } from 'node:crypto'
import {
  aiDailyGenerationRoles,
  evaluateAiDailyQualityReport,
  type AiDailyGenerationRole,
  type AiDailyQualityCaseResult,
  type AiDailyQualityReport,
} from './aiDailyGeneration.js'

export const aiDailyModelEvaluationSchemaVersion = 'ai-daily-model-evaluation-v1'
export const aiDailyModelEvaluationProfiles = ['fixture-contract', 'business-evaluation'] as const
export type AiDailyModelEvaluationProfile = (typeof aiDailyModelEvaluationProfiles)[number]

export interface AiDailyEvaluationCaseDescriptor {
  id: string
  category: string
  version: string
}

export interface AiDailyModelEvaluationPerformance {
  attemptCount: number
  medianLatencyMs: number
  p95LatencyMs: number
  averageInputTokens: number | null
  averageOutputTokens: number | null
}

export interface AiDailyModelEvaluationExecutionEvidence {
  mode: AiDailyModelEvaluationProfile
  evaluationRunId: string
  evaluatorVersion: string
  completedCaseCount: number
  modelCallCount: number
  resultSetHash: string | null
}

export interface AiDailyModelEvaluationCandidateInput {
  candidateId: string
  role: AiDailyGenerationRole
  profile: AiDailyModelEvaluationProfile
  providerRef: string
  failureDomainRef: string
  modelIdentifier: string
  caseSetId: string
  caseSetHash: string
  caseDescriptors: readonly AiDailyEvaluationCaseDescriptor[]
  promptVersion: string
  generationSchemaVersion: string
  evaluatedAt: string
  cases: AiDailyQualityCaseResult[]
  performance: AiDailyModelEvaluationPerformance
  executionEvidence: AiDailyModelEvaluationExecutionEvidence
}

export interface AiDailyModelEvaluationCandidateRecord {
  schemaVersion: typeof aiDailyModelEvaluationSchemaVersion
  candidateId: string
  role: AiDailyGenerationRole
  profile: AiDailyModelEvaluationProfile
  providerRef: string
  failureDomainRef: string
  modelIdentifier: string
  caseSetId: string
  caseSetHash: string
  caseIds: string[]
  promptVersion: string
  generationSchemaVersion: string
  evaluatedAt: string
  performance: AiDailyModelEvaluationPerformance
  executionEvidence: AiDailyModelEvaluationExecutionEvidence
  report: AiDailyQualityReport
  acceptanceBasisPoints: number
  eligible: boolean
  rejectionCodes: string[]
  recordHash: string
}

export type AiDailyModelEvaluationCandidateResult =
  | { ok: true; record: AiDailyModelEvaluationCandidateRecord }
  | { ok: false; error: 'invalid-ai-daily-model-evaluation-candidate'; issues: string[] }

export interface AiDailyModelRoleSelection {
  role: AiDailyGenerationRole
  profile: AiDailyModelEvaluationProfile | null
  caseSetId: string | null
  caseSetHash: string | null
  promptVersion: string | null
  generationSchemaVersion: string | null
  primaryCandidateId: string | null
  fallbackCandidateIds: string[]
  redundancy: 'full' | 'reduced_redundancy' | 'unavailable'
  blockingGaps: string[]
  warnings: string[]
}

export interface AiDailyModelEvaluationSelectionRecord {
  schemaVersion: typeof aiDailyModelEvaluationSchemaVersion
  selectionId: string
  generatedAt: string
  candidateSetHash: string
  roles: AiDailyModelRoleSelection[]
  approvalEligible: boolean
  blockingGaps: string[]
  warnings: string[]
  approval: {
    status: 'pending'
    reviewedAt: null
    reviewedBy: null
    notes: string
  }
  recordHash: string
}

export interface AiDailyApprovedModelEvaluationSelection extends Omit<AiDailyModelEvaluationSelectionRecord, 'approval' | 'recordHash'> {
  approval: {
    status: 'approved'
    reviewedAt: string
    reviewedBy: string
    notes: string
  }
  recordHash: string
}

export type AiDailyModelEvaluationApprovalResult =
  | { ok: true; record: AiDailyApprovedModelEvaluationSelection }
  | { ok: false; error: 'ai-daily-model-evaluation-approval-rejected'; issues: string[] }

export function createAiDailyEvaluationCaseSetHash(cases: readonly AiDailyEvaluationCaseDescriptor[]) {
  const normalized = normalizeCaseDescriptors(cases)
  return sha256(stableJson(normalized))
}

export function evaluateAiDailyModelCandidate(
  input: AiDailyModelEvaluationCandidateInput,
): AiDailyModelEvaluationCandidateResult {
  const issues: string[] = []
  const candidateId = readSlug(input.candidateId, 'candidate-id', issues)
  if (!aiDailyGenerationRoles.includes(input.role)) issues.push('role-invalid')
  if (!aiDailyModelEvaluationProfiles.includes(input.profile)) issues.push('profile-invalid')
  const providerRef = readSlug(input.providerRef, 'provider-ref', issues)
  const failureDomainRef = readSlug(input.failureDomainRef, 'failure-domain-ref', issues)
  const modelIdentifier = readModelIdentifier(input.modelIdentifier, issues)
  const caseSetId = readSlug(input.caseSetId, 'case-set-id', issues)
  if (!/^[a-f0-9]{64}$/u.test(input.caseSetHash)) issues.push('case-set-hash-invalid')
  const promptVersion = readVersion(input.promptVersion, 'prompt-version', issues)
  const generationSchemaVersion = readVersion(input.generationSchemaVersion, 'generation-schema-version', issues)
  if (Number.isNaN(Date.parse(input.evaluatedAt))) issues.push('evaluated-at-invalid')
  const normalizedDescriptors = readCaseDescriptors(input.caseDescriptors, issues)
  const measuredCaseIds = validateQualityCases(input.cases, issues)
  const descriptorCaseIds = normalizedDescriptors?.map((item) => item.id) ?? []
  if (descriptorCaseIds.join('\n') !== measuredCaseIds.join('\n')) issues.push('case-set-membership-mismatch')
  if (normalizedDescriptors && input.caseSetHash !== sha256(stableJson(normalizedDescriptors))) {
    issues.push('case-set-hash-mismatch')
  }
  const performance = validatePerformance(input.performance, issues)
  const executionEvidence = validateExecutionEvidence(input.executionEvidence, input.profile, measuredCaseIds.length, issues)
  if (!candidateId || !providerRef || !failureDomainRef || !modelIdentifier || !caseSetId || !promptVersion || !generationSchemaVersion || !performance || !executionEvidence || issues.length > 0) {
    return invalidCandidate(issues)
  }

  const report = evaluateAiDailyQualityReport(input.cases)
  const acceptanceBasisPoints = Math.round(report.minorEditAcceptance * 10_000)
  const base = {
    schemaVersion: aiDailyModelEvaluationSchemaVersion as typeof aiDailyModelEvaluationSchemaVersion,
    candidateId,
    role: input.role,
    profile: input.profile,
    providerRef,
    failureDomainRef,
    modelIdentifier,
    caseSetId,
    caseSetHash: input.caseSetHash,
    caseIds: measuredCaseIds,
    promptVersion,
    generationSchemaVersion,
    evaluatedAt: new Date(input.evaluatedAt).toISOString(),
    performance,
    executionEvidence,
    report,
    acceptanceBasisPoints,
    eligible: report.passed,
    rejectionCodes: [...report.gaps],
  }
  return { ok: true, record: { ...base, recordHash: sha256(stableJson(base)) } }
}

export function selectAiDailyModelEvaluation(input: {
  selectionId: string
  generatedAt: string
  candidates: AiDailyModelEvaluationCandidateRecord[]
}): AiDailyModelEvaluationSelectionRecord {
  const selectionId = requireSlug(input.selectionId, 'selection-id')
  if (Number.isNaN(Date.parse(input.generatedAt))) throw new Error('invalid-ai-daily-model-evaluation-generated-at')
  if (input.candidates.some((candidate) => candidate.recordHash !== sha256(stableJson(omitRecordHash(candidate))))) {
    throw new Error('invalid-ai-daily-model-evaluation-record-hash')
  }
  const duplicateIds = duplicateValues(input.candidates.map((candidate) => candidate.candidateId))
  if (duplicateIds.length > 0) throw new Error('duplicate-ai-daily-model-evaluation-candidate-id')

  const candidateSetHash = sha256(stableJson(input.candidates
    .map((candidate) => ({ candidateId: candidate.candidateId, recordHash: candidate.recordHash }))
    .sort((left, right) => compareText(left.candidateId, right.candidateId))))
  const roles = aiDailyGenerationRoles.map((role) => selectRole(role, input.candidates.filter((candidate) => candidate.role === role)))
  const blockingGaps = roles.flatMap((selection) => selection.blockingGaps.map((gap) => `${selection.role}:${gap}`))
  const warnings = roles.flatMap((selection) => selection.warnings.map((warning) => `${selection.role}:${warning}`))
  const approvalEligible = blockingGaps.length === 0
  const base = {
    schemaVersion: aiDailyModelEvaluationSchemaVersion as typeof aiDailyModelEvaluationSchemaVersion,
    selectionId,
    generatedAt: new Date(input.generatedAt).toISOString(),
    candidateSetHash,
    roles,
    approvalEligible,
    blockingGaps,
    warnings,
    approval: {
      status: 'pending' as const,
      reviewedAt: null,
      reviewedBy: null,
      notes: approvalEligible
        ? 'Measured role selection is ready for explicit human approval.'
        : 'Selection is not eligible for production approval.',
    },
  }
  return { ...base, recordHash: sha256(stableJson(base)) }
}

export function approveAiDailyModelEvaluation(
  selection: AiDailyModelEvaluationSelectionRecord,
  review: { reviewedAt: string; reviewedBy: string; notes: string },
): AiDailyModelEvaluationApprovalResult {
  const issues: string[] = []
  if (selection.recordHash !== sha256(stableJson(omitRecordHash(selection)))) issues.push('selection-record-hash-invalid')
  if (!selection.approvalEligible) issues.push('selection-not-approval-eligible')
  if (selection.roles.some((role) => role.profile !== 'business-evaluation')) issues.push('fixture-selection-cannot-be-approved')
  const reviewedBy = readSafeText(review.reviewedBy, 'reviewed-by', 160, issues)
  const notes = readSafeText(review.notes, 'review-notes', 500, issues)
  if (Number.isNaN(Date.parse(review.reviewedAt))) issues.push('reviewed-at-invalid')
  if (!reviewedBy || !notes || issues.length > 0) {
    return { ok: false, error: 'ai-daily-model-evaluation-approval-rejected', issues: unique(issues) }
  }
  const base = {
    ...omitRecordHash(selection),
    approval: {
      status: 'approved' as const,
      reviewedAt: new Date(review.reviewedAt).toISOString(),
      reviewedBy,
      notes,
    },
  }
  return { ok: true, record: { ...base, recordHash: sha256(stableJson(base)) } }
}

function selectRole(role: AiDailyGenerationRole, candidates: AiDailyModelEvaluationCandidateRecord[]): AiDailyModelRoleSelection {
  const blockingGaps: string[] = []
  const warnings: string[] = []
  if (candidates.length === 0) {
    return {
      role,
      profile: null,
      caseSetId: null,
      caseSetHash: null,
      promptVersion: null,
      generationSchemaVersion: null,
      primaryCandidateId: null,
      fallbackCandidateIds: [],
      redundancy: 'unavailable',
      blockingGaps: ['no-candidates'],
      warnings,
    }
  }

  const profiles = unique(candidates.map((candidate) => candidate.profile))
  const caseSets = unique(candidates.map((candidate) => `${candidate.caseSetId}:${candidate.caseSetHash}`))
  const promptVersions = unique(candidates.map((candidate) => candidate.promptVersion))
  const schemaVersions = unique(candidates.map((candidate) => candidate.generationSchemaVersion))
  const invalidExecutionEvidence = candidates.some((candidate) => !isValidExecutionEvidence(candidate.executionEvidence, candidate.profile, candidate.caseIds.length))
  if (profiles.length !== 1) blockingGaps.push('profile-mismatch')
  if (caseSets.length !== 1) blockingGaps.push('case-set-mismatch')
  if (promptVersions.length !== 1) blockingGaps.push('prompt-version-mismatch')
  if (schemaVersions.length !== 1) blockingGaps.push('generation-schema-version-mismatch')
  if (invalidExecutionEvidence) blockingGaps.push('execution-evidence-invalid')
  if (profiles[0] === 'fixture-contract') blockingGaps.push('fixture-contract-only')

  const eligible = candidates.filter((candidate) => candidate.eligible).sort(compareCandidates)
  const primary = eligible[0] ?? null
  if (!primary) blockingGaps.push('no-eligible-primary')
  const fallbackCandidateIds = primary
    ? eligible
        .slice(1)
        .filter((candidate) =>
          primary.acceptanceBasisPoints - candidate.acceptanceBasisPoints >= 0 &&
          primary.acceptanceBasisPoints - candidate.acceptanceBasisPoints <= 500 &&
          candidate.failureDomainRef !== primary.failureDomainRef,
        )
        .map((candidate) => candidate.candidateId)
    : []
  const qualifiedSameDomainFallback = primary
    ? eligible.slice(1).some((candidate) =>
        primary.acceptanceBasisPoints - candidate.acceptanceBasisPoints >= 0 &&
        primary.acceptanceBasisPoints - candidate.acceptanceBasisPoints <= 500 &&
        candidate.failureDomainRef === primary.failureDomainRef,
      )
    : false
  if (primary && fallbackCandidateIds.length === 0) {
    warnings.push(qualifiedSameDomainFallback ? 'fallback-shares-primary-failure-domain' : 'no-qualified-fallback')
  }
  const [caseSetId = null, caseSetHash = null] = caseSets.length === 1 ? caseSets[0].split(':') : []
  return {
    role,
    profile: profiles.length === 1 ? profiles[0] : null,
    caseSetId,
    caseSetHash,
    promptVersion: promptVersions.length === 1 ? promptVersions[0] : null,
    generationSchemaVersion: schemaVersions.length === 1 ? schemaVersions[0] : null,
    primaryCandidateId: primary?.candidateId ?? null,
    fallbackCandidateIds,
    redundancy: primary ? fallbackCandidateIds.length > 0 ? 'full' : 'reduced_redundancy' : 'unavailable',
    blockingGaps: unique(blockingGaps),
    warnings: unique(warnings),
  }
}

function compareCandidates(left: AiDailyModelEvaluationCandidateRecord, right: AiDailyModelEvaluationCandidateRecord) {
  return (
    right.acceptanceBasisPoints - left.acceptanceBasisPoints ||
    compareScaled(right.report.averageChineseEditorialScore, left.report.averageChineseEditorialScore, 1_000) ||
    compareScaled(right.report.citationCoverage, left.report.citationCoverage, 10_000) ||
    compareScaled(right.report.citationPrecision, left.report.citationPrecision, 10_000) ||
    left.performance.p95LatencyMs - right.performance.p95LatencyMs ||
    compareText(left.candidateId, right.candidateId)
  )
}

function validateQualityCases(cases: AiDailyQualityCaseResult[], issues: string[]) {
  if (!Array.isArray(cases)) {
    issues.push('cases-array-required')
    return []
  }
  const caseIds: string[] = []
  for (const [index, item] of cases.entries()) {
    const path = `cases[${index}]`
    if (!item || typeof item !== 'object') {
      issues.push(`${path}.object-required`)
      continue
    }
    const id = readSlug(item.id, `${path}.id`, issues)
    if (id) caseIds.push(id)
    if (!isIntegerBetween(item.criticalFactualErrors, 0, 1_000_000)) issues.push(`${path}.critical-factual-errors-invalid`)
    if (!isIntegerBetween(item.citedVerifiableClaims, 0, 1_000_000)) issues.push(`${path}.cited-verifiable-claims-invalid`)
    if (!isIntegerBetween(item.verifiableClaims, 0, 1_000_000)) issues.push(`${path}.verifiable-claims-invalid`)
    if (!isIntegerBetween(item.validCitationBindings, 0, 1_000_000)) issues.push(`${path}.valid-citation-bindings-invalid`)
    if (!isIntegerBetween(item.citationBindings, 0, 1_000_000)) issues.push(`${path}.citation-bindings-invalid`)
    if (item.citedVerifiableClaims > item.verifiableClaims) issues.push(`${path}.citation-coverage-counts-invalid`)
    if (item.validCitationBindings > item.citationBindings) issues.push(`${path}.citation-precision-counts-invalid`)
    if (!['accepted', 'minor-edit', 'major-edit', 'rejected'].includes(item.editorOutcome)) issues.push(`${path}.editor-outcome-invalid`)
    if (!Number.isFinite(item.chineseEditorialScore) || item.chineseEditorialScore < 0 || item.chineseEditorialScore > 5) {
      issues.push(`${path}.chinese-editorial-score-invalid`)
    }
  }
  const sorted = [...caseIds].sort(compareText)
  if (new Set(sorted).size !== sorted.length) issues.push('case-id-duplicate')
  return sorted
}

function validatePerformance(value: AiDailyModelEvaluationPerformance, issues: string[]) {
  if (!value || typeof value !== 'object') {
    issues.push('performance-object-required')
    return null
  }
  if (!isIntegerBetween(value.attemptCount, 1, 1_000_000)) issues.push('performance-attempt-count-invalid')
  if (!isIntegerBetween(value.medianLatencyMs, 0, 3_600_000)) issues.push('performance-median-latency-invalid')
  if (!isIntegerBetween(value.p95LatencyMs, 0, 3_600_000)) issues.push('performance-p95-latency-invalid')
  if (value.p95LatencyMs < value.medianLatencyMs) issues.push('performance-latency-order-invalid')
  if (!isNullableIntegerBetween(value.averageInputTokens, 0, 10_000_000)) issues.push('performance-input-tokens-invalid')
  if (!isNullableIntegerBetween(value.averageOutputTokens, 0, 10_000_000)) issues.push('performance-output-tokens-invalid')
  if (issues.some((issue) => issue.startsWith('performance-'))) return null
  return { ...value }
}

function readCaseDescriptors(values: readonly AiDailyEvaluationCaseDescriptor[], issues: string[]) {
  if (!Array.isArray(values)) {
    issues.push('case-descriptors-array-required')
    return null
  }
  try {
    return normalizeCaseDescriptors(values)
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'case-descriptors-invalid')
    return null
  }
}

function normalizeCaseDescriptors(values: readonly AiDailyEvaluationCaseDescriptor[]) {
  const normalized = values.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('case-descriptor-object-required')
    return {
      id: requireSlug(item.id, 'case-id'),
      category: requireText(item.category, 'case-category', 120),
      version: requireText(item.version, 'case-version', 80),
    }
  }).sort((left, right) => compareText(left.id, right.id))
  if (new Set(normalized.map((item) => item.id)).size !== normalized.length) {
    throw new Error('duplicate-ai-daily-evaluation-case-id')
  }
  return normalized
}

function validateExecutionEvidence(
  value: AiDailyModelEvaluationExecutionEvidence,
  profile: AiDailyModelEvaluationProfile,
  caseCount: number,
  issues: string[],
) {
  if (!value || typeof value !== 'object') {
    issues.push('execution-evidence-object-required')
    return null
  }
  if (value.mode !== profile) issues.push('profile-execution-mode-mismatch')
  const evaluationRunId = readSlug(value.evaluationRunId, 'evaluation-run-id', issues)
  const evaluatorVersion = readVersion(value.evaluatorVersion, 'evaluator-version', issues)
  if (!isIntegerBetween(value.completedCaseCount, 0, 1_000_000) || value.completedCaseCount !== caseCount) {
    issues.push('execution-completed-case-count-invalid')
  }
  if (!isIntegerBetween(value.modelCallCount, 0, 1_000_000)) issues.push('execution-model-call-count-invalid')
  if (profile === 'fixture-contract' && value.modelCallCount !== 0) issues.push('fixture-model-calls-not-allowed')
  if (profile === 'business-evaluation' && value.modelCallCount < 1) issues.push('business-model-call-evidence-required')
  if (profile === 'fixture-contract' && value.resultSetHash !== null) issues.push('fixture-result-set-hash-not-allowed')
  if (profile === 'business-evaluation' && !isHash(value.resultSetHash)) issues.push('business-result-set-hash-required')
  if (!evaluationRunId || !evaluatorVersion || issues.some((issue) => issue.startsWith('execution-') || issue.startsWith('profile-execution-') || issue.startsWith('fixture-') || issue.startsWith('business-'))) {
    return null
  }
  return {
    mode: profile,
    evaluationRunId,
    evaluatorVersion,
    completedCaseCount: value.completedCaseCount,
    modelCallCount: value.modelCallCount,
    resultSetHash: value.resultSetHash,
  }
}

function isValidExecutionEvidence(value: AiDailyModelEvaluationExecutionEvidence, profile: AiDailyModelEvaluationProfile, caseCount: number) {
  if (!value || value.mode !== profile || value.completedCaseCount !== caseCount) return false
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.evaluationRunId)) return false
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/u.test(value.evaluatorVersion)) return false
  if (!isIntegerBetween(value.modelCallCount, 0, 1_000_000)) return false
  if (profile === 'fixture-contract') return value.modelCallCount === 0 && value.resultSetHash === null
  return value.modelCallCount > 0 && isHash(value.resultSetHash)
}

function readSlug(value: unknown, path: string, issues: string[]) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) || value.length > 120) {
    issues.push(`${path}-invalid`)
    return null
  }
  return value
}

function readVersion(value: unknown, path: string, issues: string[]) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/u.test(value)) {
    issues.push(`${path}-invalid`)
    return null
  }
  return value
}

function readModelIdentifier(value: unknown, issues: string[]) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/u.test(value) ||
    value.includes('://') ||
    /(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9]{8,}/u.test(value) ||
    /^bearer:/iu.test(value) ||
    /(?:^|[./-])(?:localhost|127\.0\.0\.1|0\.0\.0\.0|metadata\.google\.internal)(?:$|[./:-])/iu.test(value) ||
    containsSensitiveEvaluationText(value)
  ) {
    issues.push('model-identifier-invalid')
    return null
  }
  return value
}

function readText(value: unknown, path: string, maxLength: number, issues: string[]) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    issues.push(`${path}-invalid`)
    return null
  }
  return value.trim()
}

function readSafeText(value: unknown, path: string, maxLength: number, issues: string[]) {
  const text = readText(value, path, maxLength, issues)
  if (text && containsSensitiveEvaluationText(text)) {
    issues.push(`${path}-sensitive`)
    return null
  }
  return text
}

function containsSensitiveEvaluationText(value: string) {
  return (
    /https?:\/\/\S+/iu.test(value) ||
    /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/\S+/iu.test(value) ||
    /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/iu.test(value) ||
    /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/u.test(value) ||
    /(?:api[_-]?key|secret|password|database[_-]?url)\s*[:=]/iu.test(value) ||
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/u.test(value)
  )
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)
}

function requireSlug(value: string, label: string) {
  const issues: string[] = []
  const result = readSlug(value, label, issues)
  if (!result) throw new Error(`invalid-ai-daily-evaluation-${label}`)
  return result
}

function requireText(value: string, label: string, maxLength: number) {
  const issues: string[] = []
  const result = readText(value, label, maxLength, issues)
  if (!result) throw new Error(`invalid-ai-daily-evaluation-${label}`)
  return result
}

function isIntegerBetween(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function isNullableIntegerBetween(value: unknown, min: number, max: number) {
  return value === null || isIntegerBetween(value, min, max)
}

function compareScaled(left: number, right: number, scale: number) {
  return Math.round(left * scale) - Math.round(right * scale)
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return [...duplicates].sort(compareText)
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

function invalidCandidate(issues: string[]): AiDailyModelEvaluationCandidateResult {
  return { ok: false, error: 'invalid-ai-daily-model-evaluation-candidate', issues: unique(issues) }
}

function omitRecordHash<T extends { recordHash: string }>(value: T): Omit<T, 'recordHash'> {
  const { recordHash, ...rest } = value
  void recordHash
  return rest
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}
