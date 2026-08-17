import { createAiDailyGenerationPayloadHash } from '../src/aiDailyGeneration.js'
import {
  buildAiDailyGenerationEvidenceFixture,
  buildAiDailyGenerationProvidersFixture,
} from '../src/aiDailyGenerationFixtures.js'
import {
  AiDailyGenerationRunnerInterruptedError,
  aiDailyGenerationRunnerCheckpointSchemaVersion,
  runAiDailyGenerationWorkflow,
  type AiDailyGenerationProjection,
  type AiDailyGenerationRunnerCheckpoint,
  type AiDailyGenerationRunnerStage,
  type AiDailyGenerationRunnerStore,
} from '../src/aiDailyGenerationRunner.js'

class FixtureRunnerStore implements AiDailyGenerationRunnerStore {
  readonly checkpoints = new Map<string, Map<AiDailyGenerationRunnerStage, AiDailyGenerationRunnerCheckpoint>>()
  readonly projections = new Map<string, AiDailyGenerationProjection>()
  projectCalls = 0
  protectedDraftId: string | null = null

  async listCheckpoints(runId: string) {
    return [...(this.checkpoints.get(runId)?.values() ?? [])]
  }

  async saveCheckpoint(runId: string, stage: AiDailyGenerationRunnerStage, payload: unknown) {
    const runCheckpoints = this.checkpoints.get(runId) ?? new Map()
    const existing = runCheckpoints.get(stage)
    if (existing) {
      if (createAiDailyGenerationPayloadHash(existing.payload) !== createAiDailyGenerationPayloadHash(payload)) {
        throw new Error('ai-daily-checkpoint-conflict')
      }
      return
    }
    runCheckpoints.set(stage, { stage, payload, schemaVersion: aiDailyGenerationRunnerCheckpointSchemaVersion })
    this.checkpoints.set(runId, runCheckpoints)
  }

  async project(input: { generationKey: string; result: { status: 'VALID' | 'NEEDS_EDITOR_REVIEW' | 'REJECTED' } }) {
    this.projectCalls += 1
    const existing = this.projections.get(input.generationKey)
    if (existing) return { ...existing, reused: true }
    const projection: AiDailyGenerationProjection =
      input.result.status === 'REJECTED'
        ? {
            revisionId: `revision-${this.projections.size + 1}`,
            validationStatus: 'REJECTED',
            applyState: 'DISCARDED',
            draftId: this.protectedDraftId,
            draftCreated: false,
            reused: false,
          }
        : input.result.status === 'NEEDS_EDITOR_REVIEW'
          ? {
              revisionId: `revision-${this.projections.size + 1}`,
              validationStatus: 'NEEDS_EDITOR_REVIEW',
              applyState: 'PENDING',
              draftId: this.protectedDraftId,
              draftCreated: false,
              reused: false,
            }
          : this.protectedDraftId
            ? {
                revisionId: `revision-${this.projections.size + 1}`,
                validationStatus: 'VALID',
                applyState: 'BLOCKED',
                draftId: this.protectedDraftId,
                draftCreated: false,
                reused: false,
              }
            : {
                revisionId: `revision-${this.projections.size + 1}`,
                validationStatus: 'VALID',
                applyState: 'APPLIED',
                draftId: 'draft-fixture-1',
                draftCreated: true,
                reused: false,
              }
    if (projection.draftCreated) this.protectedDraftId = projection.draftId
    this.projections.set(input.generationKey, projection)
    return projection
  }
}

async function main() {
  const evidence = buildAiDailyGenerationEvidenceFixture(10, 'runner')
  const providers = buildAiDailyGenerationProvidersFixture()
  const happyStore = new FixtureRunnerStore()
  const startedAt = Date.now()
  const happy = await runAiDailyGenerationWorkflow({
    runId: 'run-happy',
    evidence,
    providers,
    store: happyStore,
    deadlineAt: new Date(Date.now() + 15 * 60_000),
  })
  expectEqual(happy.result.status, 'VALID', 'happy runner status')
  if (happy.result.callCount < 4 || happy.result.callCount > 7) {
    throw new Error(`normal edition must remain within 4-7 calls, received ${happy.result.callCount}`)
  }
  expectEqual(happy.projection.applyState, 'APPLIED', 'first valid revision projection')
  expectEqual(happy.executedStages.join(','), 'EXTRACT_FACTS,COMPOSE,VERIFY,VALIDATE,DRAFT', 'complete stage order')
  if (Date.now() - startedAt >= 15 * 60_000) throw new Error('fixture generation exceeded the 15 minute review-ready SLO')

  const replay = await runAiDailyGenerationWorkflow({
    runId: 'run-happy',
    evidence,
    providers,
    store: happyStore,
  })
  expectEqual(replay.executedStages.length, 0, 'checkpoint replay should execute no stages')
  expectEqual(happyStore.projectCalls, 1, 'checkpoint replay should not project twice')

  const resumeStore = new FixtureRunnerStore()
  await expectInterruption(
    () =>
      runAiDailyGenerationWorkflow({
        runId: 'run-resume',
        evidence,
        providers,
        store: resumeStore,
        stopAfterStage: 'COMPOSE',
      }),
    'COMPOSE',
  )
  const resumed = await runAiDailyGenerationWorkflow({ runId: 'run-resume', evidence, providers, store: resumeStore })
  expectEqual(resumed.resumedStages.join(','), 'EXTRACT_FACTS,COMPOSE', 'resume checkpoint prefix')
  expectEqual(resumed.executedStages.join(','), 'VERIFY,VALIDATE,DRAFT', 'resume remaining stages')
  expectEqual(resumed.result.callCount, happy.result.callCount, 'resume should preserve prior provider attempts')

  const legacyAttemptStore = new FixtureRunnerStore()
  await expectInterruption(
    () =>
      runAiDailyGenerationWorkflow({
        runId: 'run-legacy-attempt',
        evidence,
        providers,
        store: legacyAttemptStore,
        stopAfterStage: 'EXTRACT_FACTS',
      }),
    'EXTRACT_FACTS',
  )
  const legacyAttemptCheckpoint = legacyAttemptStore.checkpoints.get('run-legacy-attempt')?.get('EXTRACT_FACTS')
  if (!legacyAttemptCheckpoint) throw new Error('missing legacy attempt fixture checkpoint')
  const legacyAttemptPayload = structuredClone(legacyAttemptCheckpoint.payload) as {
    attempts: Array<Record<string, unknown>>
  }
  for (const attempt of legacyAttemptPayload.attempts) {
    delete attempt.responseShape
    delete attempt.streamCompletion
    delete attempt.lengthBucket
    delete attempt.jsonShape
    attempt.unknownProviderField = 'drop-me'
  }
  legacyAttemptCheckpoint.payload = legacyAttemptPayload
  const legacyAttemptResume = await runAiDailyGenerationWorkflow({
    runId: 'run-legacy-attempt',
    evidence,
    providers,
    store: legacyAttemptStore,
  })
  const restoredLegacyAttempt = legacyAttemptResume.result.attempts[0]
  expectEqual(restoredLegacyAttempt?.responseShape, null, 'legacy response shape should restore as null')
  expectEqual(restoredLegacyAttempt?.streamCompletion, null, 'legacy completion shape should restore as null')
  expectEqual(restoredLegacyAttempt?.lengthBucket, null, 'legacy length bucket should restore as null')
  expectEqual(restoredLegacyAttempt?.jsonShape, null, 'legacy JSON shape should restore as null')
  if (restoredLegacyAttempt && 'unknownProviderField' in restoredLegacyAttempt) {
    throw new Error('legacy checkpoint restoration must drop unknown provider fields')
  }

  const invalidCategoryStore = new FixtureRunnerStore()
  await expectInterruption(
    () =>
      runAiDailyGenerationWorkflow({
        runId: 'run-invalid-error-category',
        evidence,
        providers,
        store: invalidCategoryStore,
        stopAfterStage: 'EXTRACT_FACTS',
      }),
    'EXTRACT_FACTS',
  )
  const invalidCategoryCheckpoint = invalidCategoryStore.checkpoints
    .get('run-invalid-error-category')
    ?.get('EXTRACT_FACTS')
  if (!invalidCategoryCheckpoint) throw new Error('missing invalid error category fixture checkpoint')
  const invalidCategoryPayload = structuredClone(invalidCategoryCheckpoint.payload) as {
    attempts: Array<{ errorCategory: unknown; responseShape?: unknown }>
  }
  if (!invalidCategoryPayload.attempts[0]) throw new Error('missing invalid error category fixture attempt')
  invalidCategoryPayload.attempts[0].errorCategory = 'provider_unbounded_dynamic_error'
  invalidCategoryCheckpoint.payload = invalidCategoryPayload
  await expectFailure(
    () =>
      runAiDailyGenerationWorkflow({
        runId: 'run-invalid-error-category',
        evidence,
        providers,
        store: invalidCategoryStore,
      }),
    'ai-daily-checkpoint-schema-invalid',
  )
  invalidCategoryPayload.attempts[0].errorCategory = null
  invalidCategoryPayload.attempts[0].responseShape = 'provider-response-leak'
  invalidCategoryCheckpoint.payload = invalidCategoryPayload
  await expectFailure(
    () =>
      runAiDailyGenerationWorkflow({
        runId: 'run-invalid-error-category',
        evidence,
        providers,
        store: invalidCategoryStore,
      }),
    'ai-daily-checkpoint-schema-invalid',
  )

  const reviewStore = new FixtureRunnerStore()
  const review = await runAiDailyGenerationWorkflow({
    runId: 'run-review',
    evidence,
    providers: buildAiDailyGenerationProvidersFixture({ composer: { sensationalComposer: true } }),
    store: reviewStore,
  })
  expectEqual(review.result.status, 'NEEDS_EDITOR_REVIEW', 'editable finding status')
  expectEqual(review.projection.applyState, 'PENDING', 'editable finding revision state')
  expectEqual(review.projection.draftId, null, 'editable finding must not create a draft')

  const rejectedStore = new FixtureRunnerStore()
  const rejected = await runAiDailyGenerationWorkflow({
    runId: 'run-rejected',
    evidence,
    providers: buildAiDailyGenerationProvidersFixture({ verifier: { verifierVerdict: 'contradicted' } }),
    store: rejectedStore,
  })
  expectEqual(rejected.result.status, 'REJECTED', 'critical finding status')
  expectEqual(rejected.projection.applyState, 'DISCARDED', 'rejected revision state')
  expectEqual(rejected.projection.draftId, null, 'rejected revision must not create a draft')
  expectEqual(
    rejected.result.attempts.filter((attempt) => attempt.role === 'composer').length,
    2,
    'persistent quality rejection must use exactly one composer repair attempt',
  )
  expectEqual(
    rejected.result.attempts.filter((attempt) => attempt.role === 'verifier').length,
    2,
    'persistent quality rejection must use exactly one verifier recheck',
  )

  const repairedStore = new FixtureRunnerStore()
  const repairProviders = buildAiDailyGenerationProvidersFixture({
    verifier: {
      verifierVerdict: 'contradicted',
      verifierCompositionVerdict: 'insufficient',
      verifierVerdictAfterQualityRepair: 'entailed',
      verifierCompositionVerdictAfterQualityRepair: 'entailed',
    },
  })
  const repairComposer = repairProviders.composer.primary
  const observedComposerPayloads: Array<Record<string, unknown>> = []
  repairProviders.composer.primary = {
    ...repairComposer,
    async generate(request) {
      observedComposerPayloads.push(request.payload as Record<string, unknown>)
      return repairComposer.generate(request)
    },
  }
  const repaired = await runAiDailyGenerationWorkflow({
    runId: 'run-quality-repaired',
    evidence,
    providers: repairProviders,
    store: repairedStore,
  })
  expectEqual(repaired.result.status, 'VALID', 'bounded quality repair status')
  expectEqual(repaired.result.callCount, happy.result.callCount + 2, 'bounded quality repair call budget')
  expectEqual(observedComposerPayloads.length, 2, 'initial and repair composer payload count')
  const initialEvidenceContext = observedComposerPayloads[0]?.evidence
  if (!Array.isArray(initialEvidenceContext) || typeof initialEvidenceContext[0] !== 'object' || !initialEvidenceContext[0]) {
    throw new Error('composer payload must include bounded evidence context')
  }
  const firstEvidenceContext = initialEvidenceContext[0] as Record<string, unknown>
  for (const field of ['evidenceId', 'sourceKind', 'sourceTier', 'publisher', 'publisherDomain', 'publishedAt', 'excerpt']) {
    if (!Object.hasOwn(firstEvidenceContext, field)) throw new Error(`composer evidence context missing ${field}`)
  }
  for (const forbidden of ['url', 'canonicalUrl', 'contentHash', 'locator']) {
    if (Object.hasOwn(firstEvidenceContext, forbidden)) throw new Error(`composer evidence context exposed ${forbidden}`)
  }
  if (!observedComposerPayloads[1]?.qualityRepair) throw new Error('repair composer payload must include qualityRepair')
  const repairedVerifyPayload = repairedStore.checkpoints.get('run-quality-repaired')?.get('VERIFY')?.payload as
    | Record<string, unknown>
    | undefined
  expectEqual(repairedVerifyPayload?.qualityRepairAttempted, true, 'VERIFY checkpoint quality repair marker')
  if (!repairedVerifyPayload?.composition) throw new Error('VERIFY checkpoint must retain the final repaired composition')
  const repairedReplay = await runAiDailyGenerationWorkflow({
    runId: 'run-quality-repaired',
    evidence,
    providers,
    store: repairedStore,
  })
  expectEqual(repairedReplay.result.status, 'VALID', 'quality-repaired checkpoint replay status')
  expectEqual(repairedReplay.executedStages.length, 0, 'quality-repaired checkpoint replay must make no calls')

  const legacyVerifyStore = new FixtureRunnerStore()
  await expectInterruption(
    () => runAiDailyGenerationWorkflow({
      runId: 'run-legacy-verify',
      evidence,
      providers,
      store: legacyVerifyStore,
      stopAfterStage: 'VERIFY',
    }),
    'VERIFY',
  )
  const legacyVerifyCheckpoint = legacyVerifyStore.checkpoints.get('run-legacy-verify')?.get('VERIFY')
  if (!legacyVerifyCheckpoint) throw new Error('missing legacy VERIFY fixture checkpoint')
  const legacyVerifyPayload = structuredClone(legacyVerifyCheckpoint.payload) as Record<string, unknown>
  delete legacyVerifyPayload.composition
  delete legacyVerifyPayload.qualityRepairAttempted
  legacyVerifyCheckpoint.payload = legacyVerifyPayload
  const legacyVerifyReplay = await runAiDailyGenerationWorkflow({
    runId: 'run-legacy-verify',
    evidence,
    providers,
    store: legacyVerifyStore,
  })
  expectEqual(legacyVerifyReplay.result.status, 'VALID', 'legacy VERIFY checkpoint compatibility')
  expectEqual(legacyVerifyReplay.executedStages.join(','), 'VALIDATE,DRAFT', 'legacy VERIFY resume stages')

  const protectedStore = new FixtureRunnerStore()
  const firstProtected = await runAiDailyGenerationWorkflow({
    runId: 'run-protected-1',
    evidence,
    providers,
    store: protectedStore,
  })
  const secondProtected = await runAiDailyGenerationWorkflow({
    runId: 'run-protected-2',
    evidence: buildAiDailyGenerationEvidenceFixture(10, 'runner-new-evidence'),
    providers,
    store: protectedStore,
  })
  expectEqual(firstProtected.projection.draftCreated, true, 'first valid revision should create hidden draft')
  expectEqual(secondProtected.projection.applyState, 'BLOCKED', 'rerun should protect existing draft')
  expectEqual(secondProtected.projection.draftId, firstProtected.projection.draftId, 'rerun draft identity')

  await expectFailure(
    () =>
      runAiDailyGenerationWorkflow({
        runId: 'run-expired',
        evidence,
        providers,
        store: new FixtureRunnerStore(),
        deadlineAt: new Date('2026-07-18T00:00:00.000Z'),
        now: () => new Date('2026-07-18T00:00:01.000Z'),
      }),
    'ai-daily-generation-deadline-exceeded',
  )
  await happyStore.saveCheckpoint('run-conflict', 'EXTRACT_FACTS', { value: 1 })
  await expectFailure(
    () => happyStore.saveCheckpoint('run-conflict', 'EXTRACT_FACTS', { value: 2 }),
    'ai-daily-checkpoint-conflict',
  )

  console.log('AI Daily runner check passed with durable resume, deadline, and protected-draft fixtures')
}

async function expectInterruption(action: () => Promise<unknown>, stage: AiDailyGenerationRunnerStage) {
  try {
    await action()
  } catch (error) {
    if (error instanceof AiDailyGenerationRunnerInterruptedError && error.stage === stage) return
    throw error
  }
  throw new Error(`expected runner interruption after ${stage}`)
}

async function expectFailure(action: () => Promise<unknown>, expected: string) {
  try {
    await action()
  } catch (error) {
    if (error instanceof Error && error.message.includes(expected)) return
    throw error
  }
  throw new Error(`expected failure containing ${expected}`)
}

function expectEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
