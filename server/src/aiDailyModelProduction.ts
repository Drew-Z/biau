import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AiDailyGenerationProviders, AiDailyGenerationRole } from './aiDailyGeneration.js'
import {
  aiDailyModelApprovalBundleSchemaVersion,
  getAiDailyModelApprovalBasis,
  validateAiDailyModelApprovalArtifact,
  type AiDailyModelApprovalArtifact,
  type AiDailyModelApprovalBundle,
  type AiDailyModelManualSelectionBundle,
} from './aiDailyModelArtifacts.js'
import { buildAiDailyProvidersFromCandidates } from './aiDailyModelProvider.js'
import {
  resolveAiDailyRuntimeCandidate,
  type AiDailyModelRuntimeConfig,
} from './aiDailyModelRuntime.js'

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
export const defaultAiDailyModelApprovalFile = path.resolve(moduleDirectory, '../data/ai-daily-model-approval.v1.json')

export async function loadAiDailyModelApprovalBundle(
  filePath = defaultAiDailyModelApprovalFile,
  expectedBundleHash = '',
) {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf8')
  } catch {
    throw new Error('ai-daily-model-approval-bundle-missing')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('invalid-ai-daily-model-approval-bundle-json')
  }
  const bundle = validateAiDailyModelApprovalArtifact(parsed)
  if (expectedBundleHash && bundle.bundleHash !== expectedBundleHash) {
    throw new Error('ai-daily-model-approval-bundle-drift')
  }
  return bundle
}

export function buildAiDailyProductionProviders(input: {
  runtime: AiDailyModelRuntimeConfig
  bundle: AiDailyModelApprovalArtifact
}): AiDailyGenerationProviders {
  if (input.bundle.schemaVersion !== aiDailyModelApprovalBundleSchemaVersion) {
    return buildManualSelectionProviders(input.runtime, input.bundle)
  }
  return buildMeasuredEvaluationProviders(input.runtime, input.bundle)
}

function buildMeasuredEvaluationProviders(
  runtime: AiDailyModelRuntimeConfig,
  bundle: AiDailyModelApprovalBundle,
): AiDailyGenerationProviders {
  const records = new Map(bundle.candidateRecords.map((record) => [record.candidateId, record]))
  const candidates: Array<{
    candidate: ReturnType<typeof requireRuntimeCandidate>['candidate']
    channel: ReturnType<typeof requireRuntimeCandidate>['channel']
    slot: 'primary' | 'fallback'
    qualityScore: number
  }> = []
  for (const roleSelection of bundle.selection.roles) {
    const role = roleSelection.role
    if (!roleSelection.primaryCandidateId) throw new Error(`ai-daily-${role}-approved-primary-missing`)
    candidates.push(resolveApprovedCandidate(runtime, records, role, roleSelection.primaryCandidateId, 'primary'))
    for (const candidateId of roleSelection.fallbackCandidateIds) {
      candidates.push(resolveApprovedCandidate(runtime, records, role, candidateId, 'fallback'))
    }
  }
  return buildAiDailyProvidersFromCandidates({ candidates })
}

function buildManualSelectionProviders(
  runtime: AiDailyModelRuntimeConfig,
  bundle: AiDailyModelManualSelectionBundle,
): AiDailyGenerationProviders {
  const candidates = bundle.selection.roles.map((roleSelection) => {
    const runtimeCandidate = requireRuntimeCandidate(runtime, roleSelection.candidateId)
    if (runtimeCandidate.candidate.role !== roleSelection.role) {
      throw new Error(`ai-daily-${roleSelection.role}-approved-candidate-mismatch`)
    }
    if (
      roleSelection.providerRef !== runtimeCandidate.channel.providerRef ||
      roleSelection.failureDomainRef !== runtimeCandidate.channel.failureDomainRef ||
      roleSelection.modelIdentifier !== runtimeCandidate.channel.modelIdentifier
    ) {
      throw new Error(`ai-daily-${roleSelection.role}-runtime-channel-drift`)
    }
    return {
      ...runtimeCandidate,
      slot: 'primary' as const,
      qualityScore: 100,
    }
  })
  return buildAiDailyProvidersFromCandidates({ candidates })
}

export function summarizeAiDailyModelApprovalBundle(bundle: AiDailyModelApprovalArtifact) {
  if (bundle.schemaVersion !== aiDailyModelApprovalBundleSchemaVersion) {
    return {
      selectionBasis: getAiDailyModelApprovalBasis(bundle),
      bundleHash: bundle.bundleHash,
      selectionId: bundle.selection.selectionId,
      selectionRecordHash: bundle.selection.recordHash,
      approvedAt: bundle.selection.approval.reviewedAt,
      roles: bundle.selection.roles.map((role) => ({
        role: role.role,
        primaryCandidateId: role.candidateId,
        fallbackCandidateIds: [] as string[],
        redundancy: role.redundancy,
      })),
    }
  }
  return {
    selectionBasis: getAiDailyModelApprovalBasis(bundle),
    bundleHash: bundle.bundleHash,
    selectionId: bundle.selection.selectionId,
    selectionRecordHash: bundle.selection.recordHash,
    approvedAt: bundle.selection.approval.reviewedAt,
    roles: bundle.selection.roles.map((role) => ({
      role: role.role,
      primaryCandidateId: role.primaryCandidateId,
      fallbackCandidateIds: role.fallbackCandidateIds,
      redundancy: role.redundancy,
    })),
  }
}

function resolveApprovedCandidate(
  runtime: AiDailyModelRuntimeConfig,
  records: Map<string, AiDailyModelApprovalBundle['candidateRecords'][number]>,
  role: AiDailyGenerationRole,
  candidateId: string,
  slot: 'primary' | 'fallback',
) {
  const runtimeCandidate = requireRuntimeCandidate(runtime, candidateId)
  const record = records.get(candidateId)
  if (!record || record.role !== role || runtimeCandidate.candidate.role !== role) {
    throw new Error(`ai-daily-${role}-approved-candidate-mismatch`)
  }
  if (
    record.providerRef !== runtimeCandidate.channel.providerRef ||
    record.failureDomainRef !== runtimeCandidate.channel.failureDomainRef ||
    record.modelIdentifier !== runtimeCandidate.channel.modelIdentifier
  ) {
    throw new Error(`ai-daily-${role}-runtime-channel-drift`)
  }
  return {
    ...runtimeCandidate,
    slot,
    qualityScore: 100,
  }
}

function requireRuntimeCandidate(runtime: AiDailyModelRuntimeConfig, candidateId: string) {
  const resolved = resolveAiDailyRuntimeCandidate(runtime, candidateId)
  if (!resolved) throw new Error('ai-daily-approved-candidate-runtime-missing')
  return resolved
}
