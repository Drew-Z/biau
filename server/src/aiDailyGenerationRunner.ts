import { Prisma, type PrismaClient } from '@prisma/client'
import {
  composeAiDailyFacts,
  collectAiDailyCompositionReviewTargets,
  createAiDailyGenerationPayloadHash,
  createRejectedAiDailyGeneration,
  extractAiDailyFacts,
  finalizeAiDailyGeneration,
  normalizeCompositionOutput,
  normalizeFactExtractionOutput,
  normalizeVerifierOutput,
  verifyAiDailyComposition,
  type AiDailyAtomicClaim,
  type AiDailyClaimReview,
  type AiDailyComposition,
  type AiDailyCompositionBlockReview,
  type AiDailyGenerationEvidence,
  type AiDailyGenerationProviderAttempt,
  type AiDailyGenerationProviders,
  type AiDailyGenerationResult,
} from './aiDailyGeneration.js'
import { evaluateAiDailyLease } from './aiDailyDomain.js'
import {
  completeAiDailyGenerationRun,
  completeAiDailyWorkItem,
  listAiDailyGenerationCheckpoints,
  loadAiDailyGenerationEvidencePack,
  persistAiDailyGenerationOutcome,
  recordAiDailyEvidenceGap,
  saveAiDailyGenerationCheckpoint,
} from './aiDailyRepository.js'

export const aiDailyGenerationRunnerStages = ['EXTRACT_FACTS', 'COMPOSE', 'VERIFY', 'VALIDATE', 'DRAFT'] as const
export type AiDailyGenerationRunnerStage = (typeof aiDailyGenerationRunnerStages)[number]
export const aiDailyGenerationRunnerCheckpointSchemaVersion = 'ai-daily-generation-checkpoint-v2'

export interface AiDailyGenerationRunnerCheckpoint {
  stage: AiDailyGenerationRunnerStage
  payload: unknown
  schemaVersion: string
}

export interface AiDailyGenerationProjection {
  revisionId: string
  validationStatus: AiDailyGenerationResult['status']
  applyState: 'PENDING' | 'APPLIED' | 'BLOCKED' | 'DISCARDED'
  draftId: string | null
  draftCreated: boolean
  reused: boolean
}

export interface AiDailyGenerationRunnerStore {
  listCheckpoints(runId: string): Promise<AiDailyGenerationRunnerCheckpoint[]>
  saveCheckpoint(runId: string, stage: AiDailyGenerationRunnerStage, payload: unknown): Promise<void>
  project(input: {
    runId: string
    generationKey: string
    result: AiDailyGenerationResult
    evidence: AiDailyGenerationEvidence[]
  }): Promise<AiDailyGenerationProjection>
}

export interface AiDailyGenerationRunnerResult {
  result: AiDailyGenerationResult
  projection: AiDailyGenerationProjection
  generationKey: string
  resumedStages: AiDailyGenerationRunnerStage[]
  executedStages: AiDailyGenerationRunnerStage[]
}

export class AiDailyGenerationRunnerInterruptedError extends Error {
  constructor(readonly stage: AiDailyGenerationRunnerStage) {
    super(`ai-daily-generation-interrupted-after:${stage}`)
  }
}

export async function runAiDailyGenerationWorkflow(input: {
  runId: string
  evidence: AiDailyGenerationEvidence[]
  providers: AiDailyGenerationProviders
  store: AiDailyGenerationRunnerStore
  deadlineAt?: Date | null
  now?: () => Date
  stopAfterStage?: AiDailyGenerationRunnerStage
  extractionBatchMaxItems?: number
  extractionBatchMaxChars?: number
}): Promise<AiDailyGenerationRunnerResult> {
  const now = input.now ?? (() => new Date())
  const evidenceHash = createAiDailyGenerationPayloadHash(input.evidence)
  const storedCheckpoints = await input.store.listCheckpoints(input.runId)
  if (storedCheckpoints.some((checkpoint) => checkpoint.schemaVersion !== aiDailyGenerationRunnerCheckpointSchemaVersion)) {
    throw new Error('ai-daily-checkpoint-schema-version-unsupported')
  }
  const checkpoints = new Map(storedCheckpoints.map((checkpoint) => [checkpoint.stage, checkpoint]))
  const resumedStages: AiDailyGenerationRunnerStage[] = []
  const executedStages: AiDailyGenerationRunnerStage[] = []
  const allAttempts: AiDailyGenerationProviderAttempt[] = []

  let claims: AiDailyAtomicClaim[] = []
  let composition: AiDailyComposition | null = null
  let reviews: AiDailyClaimReview[] = []
  let blockReviews: AiDailyCompositionBlockReview[] = []
  let requiredReviewClaimIds: string[] = []
  let rejectedCode: string | null = null

  const extractionCheckpoint = checkpoints.get('EXTRACT_FACTS')
  if (extractionCheckpoint) {
    const restored = readExtractionCheckpoint(extractionCheckpoint.payload, input.evidence, evidenceHash)
    claims = restored.claims
    allAttempts.push(...restored.attempts)
    rejectedCode = restored.failureCode
    resumedStages.push('EXTRACT_FACTS')
  } else {
    assertBeforeDeadline(input.deadlineAt, now())
    const extracted = await extractAiDailyFacts({
      evidence: input.evidence,
      providers: input.providers,
      extractionBatchMaxItems: input.extractionBatchMaxItems,
      extractionBatchMaxChars: input.extractionBatchMaxChars,
    })
    allAttempts.push(...extracted.attempts)
    if (extracted.ok) claims = extracted.claims
    else rejectedCode = extracted.code
    await saveStage(input, 'EXTRACT_FACTS', {
      evidenceHash,
      ok: extracted.ok,
      claims: extracted.ok ? extracted.claims : [],
      failureCode: extracted.ok ? null : extracted.code,
      attempts: extracted.attempts,
    })
    executedStages.push('EXTRACT_FACTS')
  }

  if (!rejectedCode) {
    const compositionCheckpoint = checkpoints.get('COMPOSE')
    if (compositionCheckpoint) {
      const restored = readCompositionCheckpoint(compositionCheckpoint.payload, claims)
      composition = restored.composition
      allAttempts.push(...restored.attempts)
      rejectedCode = restored.failureCode
      resumedStages.push('COMPOSE')
    } else {
      assertBeforeDeadline(input.deadlineAt, now())
      const composed = await composeAiDailyFacts({ claims, providers: input.providers })
      allAttempts.push(...composed.attempts)
      if (composed.ok) composition = composed.composition
      else rejectedCode = composed.code
      await saveStage(input, 'COMPOSE', {
        ok: composed.ok,
        composition: composed.ok ? composed.composition : null,
        failureCode: composed.ok ? null : composed.code,
        attempts: composed.attempts,
      })
      executedStages.push('COMPOSE')
    }
  }

  if (!rejectedCode && composition) {
    const verificationCheckpoint = checkpoints.get('VERIFY')
    if (verificationCheckpoint) {
      const restored = readVerificationCheckpoint(
        verificationCheckpoint.payload,
        claims,
        input.evidence,
        composition,
      )
      reviews = restored.reviews
      blockReviews = restored.blockReviews
      requiredReviewClaimIds = restored.requiredReviewClaimIds
      allAttempts.push(...restored.attempts)
      rejectedCode = restored.failureCode
      resumedStages.push('VERIFY')
    } else {
      assertBeforeDeadline(input.deadlineAt, now())
      const verified = await verifyAiDailyComposition({
        evidence: input.evidence,
        claims,
        composition,
        providers: input.providers,
      })
      allAttempts.push(...verified.attempts)
      requiredReviewClaimIds = verified.requiredReviewClaimIds
      if (verified.ok) {
        reviews = verified.reviews
        blockReviews = verified.blockReviews
      }
      else rejectedCode = verified.code
      await saveStage(input, 'VERIFY', {
        ok: verified.ok,
        reviews: verified.ok ? verified.reviews : [],
        blockReviews: verified.ok ? verified.blockReviews : [],
        requiredReviewClaimIds: verified.requiredReviewClaimIds,
        failureCode: verified.ok ? null : verified.code,
        attempts: verified.attempts,
      })
      executedStages.push('VERIFY')
    }
  }

  const result = rejectedCode
    ? createRejectedAiDailyGeneration({ code: rejectedCode, attempts: allAttempts, claims, composition })
    : finalizeAiDailyGeneration({
        evidence: input.evidence,
        claims,
        composition: requireComposition(composition),
        reviews,
        blockReviews,
        requiredReviewClaimIds,
        attempts: allAttempts,
      })
  const validationPayload = {
    evidenceHash,
    resultHash: createAiDailyGenerationPayloadHash(result),
    status: result.status,
    findings: result.findings,
    callCount: result.callCount,
  }
  const validateCheckpoint = checkpoints.get('VALIDATE')
  if (validateCheckpoint) {
    if (createAiDailyGenerationPayloadHash(validateCheckpoint.payload) !== createAiDailyGenerationPayloadHash(validationPayload)) {
      throw new Error('ai-daily-checkpoint-validation-mismatch')
    }
    resumedStages.push('VALIDATE')
  } else {
    assertBeforeDeadline(input.deadlineAt, now())
    await saveStage(input, 'VALIDATE', validationPayload)
    executedStages.push('VALIDATE')
  }

  const generationKey = createAiDailyGenerationPayloadHash({ runId: input.runId, evidenceHash, result })
  const draftCheckpoint = checkpoints.get('DRAFT')
  if (draftCheckpoint) {
    resumedStages.push('DRAFT')
    return {
      result,
      projection: readDraftCheckpoint(draftCheckpoint.payload, generationKey, result.status),
      generationKey,
      resumedStages,
      executedStages,
    }
  }

  assertBeforeDeadline(input.deadlineAt, now())
  const projection = await input.store.project({ runId: input.runId, generationKey, result, evidence: input.evidence })
  await saveStage(input, 'DRAFT', { generationKey, projection })
  executedStages.push('DRAFT')
  return { result, projection, generationKey, resumedStages, executedStages }
}

export function createPrismaAiDailyGenerationRunnerStore(input: {
  prisma: PrismaClient
  runId: string
  issueId: string
  workItemId: string
  leaseToken: string
  modelIdentifier: string
  createdBy: string
  now?: () => Date
}): AiDailyGenerationRunnerStore {
  return {
    async listCheckpoints(runId) {
      const checkpoints = await listAiDailyGenerationCheckpoints(input.prisma, runId)
      return checkpoints.map((checkpoint) => ({
        stage: checkpoint.stage as AiDailyGenerationRunnerStage,
        payload: checkpoint.payloadJson,
        schemaVersion: checkpoint.schemaVersion,
      }))
    },
    async saveCheckpoint(runId, stage, payload) {
      await saveAiDailyGenerationCheckpoint(input.prisma, {
        runId,
        stage,
        payload: toInputJson(payload),
        schemaVersion: aiDailyGenerationRunnerCheckpointSchemaVersion,
        workItemId: input.workItemId,
        leaseToken: input.leaseToken,
        now: input.now?.(),
      })
    },
    async project({ runId, generationKey, result, evidence }) {
      if (runId !== input.runId) throw new Error('ai-daily-generation-run-mismatch')
      const projected = await persistAiDailyGenerationOutcome(input.prisma, {
        generationKey,
        runId,
        issueId: input.issueId,
        result,
        evidence,
        modelIdentifier: input.modelIdentifier,
        createdBy: input.createdBy,
        workItemId: input.workItemId,
        leaseToken: input.leaseToken,
        now: input.now?.(),
      })
      return {
        revisionId: projected.revision.id,
        validationStatus: projected.revision.validationStatus,
        applyState: projected.revision.applyState,
        draftId: projected.draftId,
        draftCreated: projected.draftCreated,
        reused: projected.reused,
      }
    },
  }
}

export async function executeAiDailyGenerationWork(input: {
  prisma: PrismaClient
  workItemId: string
  leaseToken: string
  providers: AiDailyGenerationProviders
  workerId: string
  modelIdentifier: string
  now?: () => Date
  stopAfterStage?: AiDailyGenerationRunnerStage
}) {
  const now = input.now ?? (() => new Date())
  const workItem = await input.prisma.aiDailyWorkItem.findUnique({ where: { id: input.workItemId } })
  if (!workItem || workItem.kind !== 'EXTRACT_FACTS' || !workItem.runId) throw new Error('ai-daily-generation-work-invalid')
  const lease = evaluateAiDailyLease({
    currentLeaseToken: workItem.leaseToken,
    currentLeaseExpiresAt: workItem.leaseExpiresAt,
    providedLeaseToken: input.leaseToken,
    now: now(),
  })
  if (!lease.ok) throw new Error(lease.error)
  const run = await input.prisma.aiDailyRun.findUnique({ where: { id: workItem.runId } })
  if (!run?.issueId) throw new Error('ai-daily-generation-run-issue-required')

  try {
    const pack = await loadAiDailyGenerationEvidencePack(input.prisma, run.issueId, now())
    const minimumGaps = [...pack.gaps]
    if (pack.evidence.length < 3) minimumGaps.push('minimum-selected-evidence-not-met')
    if (!pack.evidence.some((item) => item.sourceTier === 'TIER_1')) minimumGaps.push('tier1-evidence-missing')
    if (workItem.freshnessTargetAt && workItem.freshnessTargetAt.getTime() <= now().getTime()) {
      minimumGaps.push('review-ready-freshness-target-missed')
    }
    if (minimumGaps.length > 0) {
      await saveAiDailyGenerationCheckpoint(input.prisma, {
        runId: run.id,
        stage: 'VALIDATE',
        payload: { status: 'NEEDS_MORE_EVIDENCE', gaps: [...new Set(minimumGaps)] },
        workItemId: workItem.id,
        leaseToken: input.leaseToken,
        now: now(),
      })
      await recordAiDailyEvidenceGap(input.prisma, {
        issueId: run.issueId,
        gaps: [...new Set(minimumGaps)],
        runId: run.id,
        workItemId: workItem.id,
        leaseToken: input.leaseToken,
        now: now(),
      })
      await completeAiDailyWorkItem(input.prisma, {
        workItemId: workItem.id,
        leaseToken: input.leaseToken,
        result: 'succeeded',
        now: now(),
        metadataJson: { outcome: 'NEEDS_MORE_EVIDENCE' },
      })
      await completeAiDailyGenerationRun(input.prisma, { runId: run.id, status: 'COMPLETED_WITH_GAPS', now: now() })
      return { outcome: 'NEEDS_MORE_EVIDENCE' as const, gaps: [...new Set(minimumGaps)] }
    }

    const result = await runAiDailyGenerationWorkflow({
      runId: run.id,
      evidence: pack.evidence,
      providers: input.providers,
      store: createPrismaAiDailyGenerationRunnerStore({
        prisma: input.prisma,
        runId: run.id,
        issueId: run.issueId,
        workItemId: workItem.id,
        leaseToken: input.leaseToken,
        modelIdentifier: input.modelIdentifier,
        createdBy: input.workerId,
        now,
      }),
      deadlineAt: workItem.deadlineAt,
      now,
      stopAfterStage: input.stopAfterStage,
    })
    await completeAiDailyWorkItem(input.prisma, {
      workItemId: workItem.id,
      leaseToken: input.leaseToken,
      result: 'succeeded',
      now: now(),
      metadataJson: { status: result.result.status, revisionId: result.projection.revisionId },
    })
    await completeAiDailyGenerationRun(input.prisma, {
      runId: run.id,
      status: result.result.status === 'REJECTED' ? 'COMPLETED_WITH_GAPS' : 'COMPLETED',
      now: now(),
    })
    return { outcome: result.result.status, ...result }
  } catch (error) {
    if (error instanceof AiDailyGenerationRunnerInterruptedError) throw error
    const failureAt = now()
    const current = await input.prisma.aiDailyWorkItem.findUnique({ where: { id: workItem.id } })
    if (
      current?.status === 'LEASED' &&
      current.leaseToken === input.leaseToken &&
      current.leaseExpiresAt &&
      current.leaseExpiresAt.getTime() > failureAt.getTime()
    ) {
      const retryable =
        current.attemptCount < current.maxAttempts &&
        (!current.deadlineAt || current.deadlineAt.getTime() > failureAt.getTime())
      await completeAiDailyWorkItem(input.prisma, {
        workItemId: current.id,
        leaseToken: input.leaseToken,
        result: retryable ? 'retryable-failed' : 'failed',
        now: failureAt,
        retryAt: new Date(failureAt.getTime() + 30_000),
        errorCategory: classifyRunnerError(error),
      })
      if (!retryable) {
        await completeAiDailyGenerationRun(input.prisma, {
          runId: run.id,
          status: 'FAILED',
          errorCategory: classifyRunnerError(error),
          now: failureAt,
        })
      }
    }
    throw error
  }
}

async function saveStage(
  input: {
    runId: string
    store: AiDailyGenerationRunnerStore
    stopAfterStage?: AiDailyGenerationRunnerStage
  },
  stage: AiDailyGenerationRunnerStage,
  payload: unknown,
) {
  await input.store.saveCheckpoint(input.runId, stage, payload)
  if (input.stopAfterStage === stage) throw new AiDailyGenerationRunnerInterruptedError(stage)
}

function readExtractionCheckpoint(payload: unknown, evidence: AiDailyGenerationEvidence[], evidenceHash: string) {
  const record = requireRecord(payload)
  if (record.evidenceHash !== evidenceHash) throw new Error('ai-daily-checkpoint-evidence-mismatch')
  const attempts = readAttempts(record.attempts)
  const failureCode = readFailureCode(record.failureCode)
  if (failureCode) return { claims: [] as AiDailyAtomicClaim[], attempts, failureCode }
  const normalized = normalizeFactExtractionOutput(
    { claims: record.claims },
    new Map(evidence.map((item) => [item.evidenceId, item])),
  )
  if (!normalized.ok) throw new Error('ai-daily-checkpoint-schema-invalid')
  return { claims: normalized.value.claims, attempts, failureCode: null }
}

function readCompositionCheckpoint(payload: unknown, claims: AiDailyAtomicClaim[]) {
  const record = requireRecord(payload)
  const attempts = readAttempts(record.attempts)
  const failureCode = readFailureCode(record.failureCode)
  if (failureCode) return { composition: null, attempts, failureCode }
  const normalized = normalizeCompositionOutput(record.composition, new Set(claims.map((claim) => claim.claimId)))
  if (!normalized.ok) throw new Error('ai-daily-checkpoint-schema-invalid')
  return { composition: normalized.value, attempts, failureCode: null }
}

function readVerificationCheckpoint(
  payload: unknown,
  claims: AiDailyAtomicClaim[],
  evidence: AiDailyGenerationEvidence[],
  composition: AiDailyComposition,
) {
  const record = requireRecord(payload)
  const attempts = readAttempts(record.attempts)
  const requiredReviewClaimIds = readStringArray(record.requiredReviewClaimIds)
  const failureCode = readFailureCode(record.failureCode)
  if (failureCode) {
    return {
      reviews: [] as AiDailyClaimReview[],
      blockReviews: [] as AiDailyCompositionBlockReview[],
      requiredReviewClaimIds,
      attempts,
      failureCode,
    }
  }
  const compositionBlocks = collectAiDailyCompositionReviewTargets(composition)
  const normalized = normalizeVerifierOutput(
    { reviews: record.reviews, blockReviews: record.blockReviews },
    new Set(requiredReviewClaimIds),
    new Map(evidence.map((item) => [item.evidenceId, item])),
    new Map(compositionBlocks.map((block) => [block.blockId, block])),
  )
  if (!normalized.ok || requiredReviewClaimIds.some((id) => !claims.some((claim) => claim.claimId === id))) {
    throw new Error('ai-daily-checkpoint-schema-invalid')
  }
  return {
    reviews: normalized.value.reviews,
    blockReviews: normalized.value.blockReviews,
    requiredReviewClaimIds,
    attempts,
    failureCode: null,
  }
}

function readDraftCheckpoint(
  payload: unknown,
  generationKey: string,
  validationStatus: AiDailyGenerationResult['status'],
): AiDailyGenerationProjection {
  const record = requireRecord(payload)
  if (record.generationKey !== generationKey) throw new Error('ai-daily-checkpoint-generation-key-mismatch')
  const projection = requireRecord(record.projection)
  if (
    typeof projection.revisionId !== 'string' ||
    !['VALID', 'NEEDS_EDITOR_REVIEW', 'REJECTED'].includes(String(projection.validationStatus)) ||
    projection.validationStatus !== validationStatus ||
    !['PENDING', 'APPLIED', 'BLOCKED', 'DISCARDED'].includes(String(projection.applyState)) ||
    (projection.draftId !== null && typeof projection.draftId !== 'string')
  ) {
    throw new Error('ai-daily-checkpoint-schema-invalid')
  }
  return {
    revisionId: projection.revisionId,
    validationStatus: projection.validationStatus as AiDailyGenerationResult['status'],
    applyState: projection.applyState as AiDailyGenerationProjection['applyState'],
    draftId: projection.draftId as string | null,
    draftCreated: projection.draftCreated === true,
    reused: projection.reused === true,
  }
}

function readAttempts(value: unknown): AiDailyGenerationProviderAttempt[] {
  if (!Array.isArray(value)) throw new Error('ai-daily-checkpoint-schema-invalid')
  return value.map((item) => {
    const record = requireRecord(item)
    if (
      typeof record.providerId !== 'string' ||
      !['extractor', 'composer', 'verifier'].includes(String(record.role)) ||
      !['primary', 'fallback'].includes(String(record.slot)) ||
      !['succeeded', 'failed', 'schema-rejected', 'quality-rejected'].includes(String(record.outcome)) ||
      typeof record.calls !== 'number'
    ) {
      throw new Error('ai-daily-checkpoint-schema-invalid')
    }
    return record as unknown as AiDailyGenerationProviderAttempt
  })
}

function readFailureCode(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || value.length === 0 || value.length > 160) throw new Error('ai-daily-checkpoint-schema-invalid')
  return value
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('ai-daily-checkpoint-schema-invalid')
  }
  return [...new Set(value as string[])]
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('ai-daily-checkpoint-schema-invalid')
  return value as Record<string, unknown>
}

function requireComposition(value: AiDailyComposition | null) {
  if (!value) throw new Error('ai-daily-composition-required')
  return value
}

function assertBeforeDeadline(deadlineAt: Date | null | undefined, now: Date) {
  if (deadlineAt && deadlineAt.getTime() <= now.getTime()) throw new Error('ai-daily-generation-deadline-exceeded')
}

function classifyRunnerError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('deadline')) return 'deadline-exceeded'
  if (message.includes('checkpoint')) return 'checkpoint-error'
  if (message.includes('lease')) return 'lease-error'
  if (message.includes('provider')) return 'provider-error'
  return 'generation-runner-error'
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}
