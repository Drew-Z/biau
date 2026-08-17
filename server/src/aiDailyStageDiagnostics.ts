import type { Prisma, PrismaClient } from '@prisma/client'
import {
  composeAiDailyFacts,
  extractAiDailyFacts,
  normalizeCompositionOutput,
  normalizeFactExtractionOutput,
  summarizeAiDailyGenerationEvidenceReadinessIssues,
  verifyAiDailyComposition,
  type AiDailyGenerationProviderAttempt,
  type AiDailyGenerationProviderErrorCategory,
  type AiDailyGenerationProviderResponseDiagnostics,
  type AiDailyGenerationRole,
} from './aiDailyGeneration.js'
import {
  classifyAiDailyProductionConfigurationError,
  resolveAiDailyApprovedGenerationExecution,
  type AiDailyGenerationExecution,
  type AiDailyProductionConfigurationIssue,
} from './aiDailyGenerationExecution.js'
import { loadAiDailyGenerationEvidencePack } from './aiDailyRepository.js'
import { summarizeAiDailySelectionAuthorizationIssues } from './aiDailyStudioProduction.js'
import { env } from './env.js'

export const aiDailyStageDiagnosticConfirmation = 'RUN_APPROVED_STAGE_DIAGNOSTIC'

export type AiDailyStageDiagnosticDurationBucket = 'under-5s' | 'under-30s' | 'under-120s' | '120s-or-more'

export type AiDailyStageDiagnosticReadinessIssue =
  | 'stage-diagnostics-disabled'
  | 'stage-diagnostics-production-active'
  | AiDailyProductionConfigurationIssue

export type AiDailyStageDiagnosticReadiness =
  | { status: 'disabled'; enabled: false; issue: 'stage-diagnostics-disabled' }
  | { status: 'misconfigured'; enabled: true; issue: AiDailyStageDiagnosticReadinessIssue }
  | { status: 'ready'; enabled: true; issue: null }

export interface AiDailyStageDiagnosticResult {
  role: AiDailyGenerationRole
  status: 'succeeded' | 'failed'
  errorCategory: AiDailyGenerationProviderErrorCategory | null
  providerCalls: 0 | 1
  durationBucket: AiDailyStageDiagnosticDurationBucket
  responseDiagnostics: AiDailyGenerationProviderResponseDiagnostics
}

export class AiDailyStageDiagnosticError extends Error {
  constructor(
    readonly code:
      | 'ai-daily-stage-diagnostics-disabled'
      | 'ai-daily-stage-diagnostics-production-active'
      | 'ai-daily-stage-diagnostics-configuration-invalid'
      | 'ai-daily-stage-diagnostics-busy'
      | 'ai-daily-stage-diagnostics-issue-not-found'
      | 'ai-daily-stage-diagnostics-issue-version-conflict'
      | 'ai-daily-stage-diagnostics-evidence-not-ready'
      | 'ai-daily-stage-diagnostics-revision-required'
      | 'ai-daily-stage-diagnostics-revision-invalid',
    readonly details: { issue?: AiDailyProductionConfigurationIssue; issues?: string[] } = {},
  ) {
    super(code)
    this.name = 'AiDailyStageDiagnosticError'
  }
}

interface AiDailyStageDiagnosticDependencies {
  resolveExecution?: () => Promise<AiDailyGenerationExecution>
  loadEvidencePack?: typeof loadAiDailyGenerationEvidencePack
  now?: () => Date
  clockMs?: () => number
}

let stageDiagnosticInFlight = false

export async function inspectAiDailyStageDiagnosticReadiness(
  resolveExecution: () => Promise<AiDailyGenerationExecution> = resolveAiDailyApprovedGenerationExecution,
): Promise<AiDailyStageDiagnosticReadiness> {
  if (!env.aiDailyStageDiagnosticsEnabled) {
    return { status: 'disabled', enabled: false, issue: 'stage-diagnostics-disabled' }
  }
  if (env.aiDailyProductionGenerationEnabled || env.aiDailyBusinessEvaluationEnabled) {
    return { status: 'misconfigured', enabled: true, issue: 'stage-diagnostics-production-active' }
  }
  try {
    await resolveExecution()
    return { status: 'ready', enabled: true, issue: null }
  } catch (error) {
    return {
      status: 'misconfigured',
      enabled: true,
      issue: classifyAiDailyProductionConfigurationError(error),
    }
  }
}

export async function runAiDailyStageDiagnostic(
  prisma: PrismaClient,
  input: {
    issueId: string
    role: AiDailyGenerationRole
    expectedIssueUpdatedAt: Date
  },
  dependencies: AiDailyStageDiagnosticDependencies = {},
): Promise<AiDailyStageDiagnosticResult> {
  if (!env.aiDailyStageDiagnosticsEnabled) {
    throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-disabled')
  }
  if (env.aiDailyProductionGenerationEnabled || env.aiDailyBusinessEvaluationEnabled) {
    throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-production-active')
  }
  if (stageDiagnosticInFlight) {
    throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-busy')
  }

  stageDiagnosticInFlight = true
  const clockMs = dependencies.clockMs ?? Date.now
  const startedAt = clockMs()
  try {
    const issue = await prisma.aiDailyIssue.findUnique({
      where: { id: input.issueId },
      select: { id: true, updatedAt: true, latestGeneratedRevisionId: true },
    })
    if (!issue) throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-issue-not-found')
    if (issue.updatedAt.getTime() !== input.expectedIssueUpdatedAt.getTime()) {
      throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-issue-version-conflict')
    }

    let execution: AiDailyGenerationExecution
    try {
      execution = await (dependencies.resolveExecution ?? resolveAiDailyApprovedGenerationExecution)()
    } catch (error) {
      throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-configuration-invalid', {
        issue: classifyAiDailyProductionConfigurationError(error),
      })
    }

    const now = (dependencies.now ?? (() => new Date()))()
    const evidencePack = await (dependencies.loadEvidencePack ?? loadAiDailyGenerationEvidencePack)(
      prisma,
      issue.id,
      now,
    )
    const evidenceIssues = [
      ...summarizeAiDailySelectionAuthorizationIssues(evidencePack),
      ...summarizeAiDailyGenerationEvidenceReadinessIssues(evidencePack),
    ]
    if (evidenceIssues.length > 0) {
      throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-evidence-not-ready', {
        issues: [...new Set(evidenceIssues)],
      })
    }

    let stageResult: { ok: boolean; attempts: AiDailyGenerationProviderAttempt[] }
    if (input.role === 'extractor') {
      stageResult = await extractAiDailyFacts({
        evidence: takeDiagnosticEvidenceBatch(evidencePack.evidence),
        providers: execution.providers,
        extractionBatchMaxItems: 6,
        extractionBatchMaxChars: 18_000,
        allowSchemaRepair: false,
        allowFallbacks: false,
      })
    } else {
      if (!issue.latestGeneratedRevisionId) {
        throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-revision-required')
      }
      const revision = await prisma.aiDailyGeneratedRevision.findUnique({
        where: { id: issue.latestGeneratedRevisionId },
        select: { issueId: true, contentJson: true },
      })
      if (!revision || revision.issueId !== issue.id) {
        throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-revision-required')
      }
      const revisionInput = normalizeDiagnosticRevisionInput(revision.contentJson, evidencePack.evidence)
      if (!revisionInput) {
        throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-revision-invalid')
      }
      stageResult = input.role === 'composer'
        ? await composeAiDailyFacts({
            evidence: evidencePack.evidence,
            claims: revisionInput.claims,
            providers: execution.providers,
            allowSchemaRepair: false,
            allowFallbacks: false,
          })
        : revisionInput.composition
          ? await verifyAiDailyComposition({
              evidence: evidencePack.evidence,
              claims: revisionInput.claims,
              composition: revisionInput.composition,
              providers: execution.providers,
              allowSchemaRepair: false,
              allowFallbacks: false,
            })
          : (() => {
              throw new AiDailyStageDiagnosticError('ai-daily-stage-diagnostics-revision-invalid')
            })()
    }

    return summarizeDiagnosticResult(input.role, stageResult, clockMs() - startedAt)
  } finally {
    stageDiagnosticInFlight = false
  }
}

function takeDiagnosticEvidenceBatch<T extends { quote: string }>(evidence: T[]) {
  const selected: T[] = []
  let chars = 0
  for (const item of evidence) {
    if (selected.length >= 6 || (selected.length > 0 && chars + item.quote.length > 18_000)) break
    selected.push(item)
    chars += item.quote.length
  }
  return selected
}

function normalizeDiagnosticRevisionInput(
  value: Prisma.JsonValue,
  evidence: Parameters<typeof normalizeFactExtractionOutput>[1] extends Map<string, infer T> ? T[] : never,
) {
  if (!isRecord(value)) return null
  const evidenceById = new Map(evidence.map((item) => [item.evidenceId, item]))
  const claims = normalizeFactExtractionOutput({ claims: value.claims }, evidenceById)
  if (!claims.ok) return null
  const composition = normalizeCompositionOutput(
    value.composition,
    new Set(claims.value.claims.map((claim) => claim.claimId)),
  )
  return {
    claims: claims.value.claims,
    composition: composition.ok ? composition.value : null,
  }
}

function summarizeDiagnosticResult(
  role: AiDailyGenerationRole,
  result: { ok: boolean; attempts: AiDailyGenerationProviderAttempt[] },
  durationMs: number,
): AiDailyStageDiagnosticResult {
  const providerCalls = result.attempts.reduce((sum, attempt) => sum + attempt.calls, 0)
  if (providerCalls > 1 || result.attempts.length > 1) {
    throw new Error('ai-daily-stage-diagnostics-call-budget-exceeded')
  }
  const attempt = result.attempts[0]
  return {
    role,
    status: result.ok ? 'succeeded' : 'failed',
    errorCategory: result.ok ? null : attempt?.errorCategory ?? 'provider_error',
    providerCalls: providerCalls as 0 | 1,
    durationBucket: toDurationBucket(durationMs),
    responseDiagnostics: {
      responseShape: attempt?.responseShape ?? null,
      streamCompletion: attempt?.streamCompletion ?? null,
      lengthBucket: attempt?.lengthBucket ?? null,
      jsonShape: attempt?.jsonShape ?? null,
    },
  }
}

function toDurationBucket(durationMs: number): AiDailyStageDiagnosticDurationBucket {
  if (durationMs < 5_000) return 'under-5s'
  if (durationMs < 30_000) return 'under-30s'
  if (durationMs < 120_000) return 'under-120s'
  return '120s-or-more'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
