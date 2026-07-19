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

export const aiDailyModelEvaluationProposalSchemaVersion = 'ai-daily-model-evaluation-proposal-v2'
export const aiDailyModelApprovalBundleSchemaVersion = 'ai-daily-model-approval-bundle-v2'

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

export function createAiDailyModelArtifactHash(value: unknown) {
  return hashArtifact(value)
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
