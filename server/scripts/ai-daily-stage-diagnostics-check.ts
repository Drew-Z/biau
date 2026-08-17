import { type AddressInfo } from 'node:net'
import type { Prisma, PrismaClient } from '@prisma/client'
import { createApp } from '../src/app.js'
import { env } from '../src/env.js'
import {
  composeAiDailyFacts,
  extractAiDailyFacts,
  type AiDailyGenerationProviders,
  type AiDailyStructuredGenerationProvider,
} from '../src/aiDailyGeneration.js'
import {
  buildAiDailyGenerationEvidenceFixture,
  buildAiDailyGenerationProvidersFixture,
} from '../src/aiDailyGenerationFixtures.js'
import {
  AiDailyStageDiagnosticError,
  inspectAiDailyStageDiagnosticReadiness,
  runAiDailyStageDiagnostic,
} from '../src/aiDailyStageDiagnostics.js'
import { aiDailyIngestionConfigVersion } from '../src/aiDailyIngestionRunner.js'
import type { AiDailyGenerationExecution } from '../src/aiDailyGenerationExecution.js'

const issueId = 'stage-diagnostic-issue'
const revisionId = 'stage-diagnostic-revision'
const issueUpdatedAt = new Date('2026-08-17T10:00:00.000Z')
const evidence = buildAiDailyGenerationEvidenceFixture(8, 'stage-diagnostic')

const revisionProviders = buildAiDailyGenerationProvidersFixture()
const extractedRevision = await extractAiDailyFacts({ evidence, providers: revisionProviders })
if (!extractedRevision.ok) throw new Error('stage diagnostic fixture claims must be valid')
const composedRevision = await composeAiDailyFacts({
  evidence,
  claims: extractedRevision.claims,
  providers: revisionProviders,
})
if (!composedRevision.ok) throw new Error('stage diagnostic fixture composition must be valid')
const revisionContent = {
  claims: extractedRevision.claims,
  composition: composedRevision.composition,
} as unknown as Prisma.JsonValue

const databaseReads = { issue: 0, revision: 0 }
const prisma = {
  aiDailyIssue: {
    async findUnique() {
      databaseReads.issue += 1
      return { id: issueId, updatedAt: issueUpdatedAt, latestGeneratedRevisionId: revisionId }
    },
  },
  aiDailyGeneratedRevision: {
    async findUnique() {
      databaseReads.revision += 1
      return { issueId, contentJson: revisionContent }
    },
  },
} as unknown as PrismaClient

const evidencePack = {
  issueId,
  date: '2026-08-17',
  selectionVersion: 1,
  evidenceVersion: 1,
  evidence,
  selectionAuthorities: evidence.map(() => ({
    runId: 'stage-diagnostic-ingestion-run',
    issueId,
    profile: 'DEGRADED',
    status: 'COMPLETED',
    configVersion: aiDailyIngestionConfigVersion,
  })),
  gaps: [],
}

const originalEnv = {
  assistantServiceMode: env.assistantServiceMode,
  studioAdminToken: env.studioAdminToken,
  studioDatabaseUrl: env.studioDatabaseUrl,
  aiDailyStageDiagnosticsEnabled: env.aiDailyStageDiagnosticsEnabled,
  aiDailyProductionGenerationEnabled: env.aiDailyProductionGenerationEnabled,
  aiDailyBusinessEvaluationEnabled: env.aiDailyBusinessEvaluationEnabled,
}

try {
  env.aiDailyStageDiagnosticsEnabled = false
  env.aiDailyProductionGenerationEnabled = false
  env.aiDailyBusinessEvaluationEnabled = false
  const disabled = await inspectAiDailyStageDiagnosticReadiness(async () => fixtureExecution())
  assert(disabled.status === 'disabled' && disabled.enabled === false, 'diagnostics must fail closed')

  env.aiDailyStageDiagnosticsEnabled = true
  const ready = await inspectAiDailyStageDiagnosticReadiness(async () => fixtureExecution())
  assert(ready.status === 'ready' && ready.enabled === true, 'fixture execution should make readiness ready')
  const misconfigured = await inspectAiDailyStageDiagnosticReadiness(async () => {
    throw new Error('invalid-ai-daily-model-runtime:fixture')
  })
  assert(misconfigured.status === 'misconfigured' && misconfigured.issue === 'model-runtime-invalid', 'misconfiguration must be fixed-category')
  env.aiDailyProductionGenerationEnabled = true
  const productionActive = await inspectAiDailyStageDiagnosticReadiness(async () => fixtureExecution())
  assert(productionActive.status === 'misconfigured' && productionActive.issue === 'stage-diagnostics-production-active', 'diagnostics must not overlap production')
  env.aiDailyProductionGenerationEnabled = false

  await assertRejectsCode(
    runAiDailyStageDiagnostic(
      prisma,
      { issueId, role: 'extractor', expectedIssueUpdatedAt: new Date('2026-08-17T09:59:59.000Z') },
      dependencies(fixtureExecution()),
    ),
    'ai-daily-stage-diagnostics-issue-version-conflict',
  )
  await assertRejectsCode(
    runAiDailyStageDiagnostic(
      prisma,
      { issueId, role: 'extractor', expectedIssueUpdatedAt: issueUpdatedAt },
      {
        ...dependencies(fixtureExecution()),
        loadEvidencePack: async () => ({ ...evidencePack, gaps: ['fixture-gap'] }),
      },
    ),
    'ai-daily-stage-diagnostics-evidence-not-ready',
  )
  const revisionlessPrisma = {
    aiDailyIssue: {
      async findUnique() {
        return { id: issueId, updatedAt: issueUpdatedAt, latestGeneratedRevisionId: null }
      },
    },
  } as unknown as PrismaClient
  await assertRejectsCode(
    runAiDailyStageDiagnostic(
      revisionlessPrisma,
      { issueId, role: 'composer', expectedIssueUpdatedAt: issueUpdatedAt },
      dependencies(fixtureExecution()),
    ),
    'ai-daily-stage-diagnostics-revision-required',
  )

  for (const role of ['extractor', 'composer', 'verifier'] as const) {
    const calls: Array<{ role: string; slot: string; repair: boolean }> = []
    const execution = fixtureExecution(trackProviders(buildAiDailyGenerationProvidersFixture(), calls))
    const result = await runAiDailyStageDiagnostic(
      prisma,
      { issueId, role, expectedIssueUpdatedAt: issueUpdatedAt },
      dependencies(execution),
    )
    assert(result.status === 'succeeded', `${role} fixture diagnostic should succeed`)
    assert(result.providerCalls === 1 && calls.length === 1, `${role} diagnostic must make one provider call`)
    assert(calls[0]?.role === role && calls[0]?.slot === 'primary' && calls[0]?.repair === false, `${role} must use only the primary first call`)
    assertLowSensitive(result)
  }

  const invalidCalls: Array<{ role: string; slot: string; repair: boolean }> = []
  const invalidProviders = trackProviders(buildAiDailyGenerationProvidersFixture({
    extractor: { invalidBeforeRepair: true },
    extractorFallbacks: [{}],
  }), invalidCalls)
  const invalid = await runAiDailyStageDiagnostic(
    prisma,
    { issueId, role: 'extractor', expectedIssueUpdatedAt: issueUpdatedAt },
    dependencies(fixtureExecution(invalidProviders)),
  )
  assert(invalid.status === 'failed' && invalid.errorCategory === 'schema_invalid', 'invalid first output must fail without repair')
  assert(invalid.providerCalls === 1 && invalidCalls.length === 1, 'schema failure must not call repair or fallback')
  assert(invalidCalls[0]?.slot === 'primary' && invalidCalls[0]?.repair === false, 'only primary first call is allowed')

  let releaseProvider: (() => void) | null = null
  let markStarted: (() => void) | null = null
  const providerStarted = new Promise<void>((resolve) => { markStarted = resolve })
  const providerGate = new Promise<void>((resolve) => { releaseProvider = resolve })
  const delayedProviders = buildAiDailyGenerationProvidersFixture()
  const delayedPrimary = delayedProviders.extractor.primary
  delayedProviders.extractor.primary = {
    ...delayedPrimary,
    async generate(request) {
      markStarted?.()
      await providerGate
      return delayedPrimary.generate(request)
    },
  }
  const first = runAiDailyStageDiagnostic(
    prisma,
    { issueId, role: 'extractor', expectedIssueUpdatedAt: issueUpdatedAt },
    dependencies(fixtureExecution(delayedProviders)),
  )
  await providerStarted
  await assertRejectsCode(
    runAiDailyStageDiagnostic(
      prisma,
      { issueId, role: 'extractor', expectedIssueUpdatedAt: issueUpdatedAt },
      dependencies(fixtureExecution()),
    ),
    'ai-daily-stage-diagnostics-busy',
  )
  releaseProvider?.()
  assert((await first).status === 'succeeded', 'first single-flight diagnostic should complete')

  await checkProtectedRoute()
  assert(databaseReads.issue >= 5, 'diagnostic should read the current issue')
  assert(databaseReads.revision >= 2, 'composer and verifier should read the latest revision')
  console.log(JSON.stringify({
    ok: true,
    externalProviderCalls: 0,
    databaseWrites: 0,
    rolesChecked: 3,
    singleFlight: true,
    schemaRepairCalls: 0,
    fallbackCalls: 0,
  }, null, 2))
} finally {
  env.assistantServiceMode = originalEnv.assistantServiceMode
  env.studioAdminToken = originalEnv.studioAdminToken
  env.studioDatabaseUrl = originalEnv.studioDatabaseUrl
  env.aiDailyStageDiagnosticsEnabled = originalEnv.aiDailyStageDiagnosticsEnabled
  env.aiDailyProductionGenerationEnabled = originalEnv.aiDailyProductionGenerationEnabled
  env.aiDailyBusinessEvaluationEnabled = originalEnv.aiDailyBusinessEvaluationEnabled
}

function fixtureExecution(
  providers: AiDailyGenerationProviders = buildAiDailyGenerationProvidersFixture(),
): AiDailyGenerationExecution {
  return {
    profile: 'PRODUCTION',
    providers,
    configVersion: 'stage-diagnostic-fixture-v1',
    modelIdentifier: 'fixture-only',
  }
}

function dependencies(execution: AiDailyGenerationExecution) {
  return {
    resolveExecution: async () => execution,
    loadEvidencePack: async () => evidencePack,
    now: () => new Date('2026-08-17T10:00:00.000Z'),
    clockMs: () => 1_000,
  }
}

function trackProviders(
  providers: AiDailyGenerationProviders,
  calls: Array<{ role: string; slot: string; repair: boolean }>,
): AiDailyGenerationProviders {
  const wrap = (provider: AiDailyStructuredGenerationProvider): AiDailyStructuredGenerationProvider => ({
    ...provider,
    async generate(request) {
      calls.push({ role: request.role, slot: provider.slot, repair: Boolean(request.repair) })
      return provider.generate(request)
    },
  })
  const wrapRole = (role: keyof AiDailyGenerationProviders) => ({
    ...providers[role],
    primary: wrap(providers[role].primary),
    fallbacks: providers[role].fallbacks?.map(wrap),
  })
  return {
    extractor: wrapRole('extractor'),
    composer: wrapRole('composer'),
    verifier: wrapRole('verifier'),
  }
}

async function checkProtectedRoute() {
  env.assistantServiceMode = 'studio'
  env.studioAdminToken = 'stage-diagnostic-route-token'
  env.studioDatabaseUrl = ''
  env.aiDailyStageDiagnosticsEnabled = false
  const server = createApp().listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const address = server.address() as AddressInfo
  const endpoint = `http://127.0.0.1:${address.port}/studio/api/ai-daily/issues/${issueId}/stage-diagnostics`
  try {
    const unauthorized = await postJson(endpoint, {})
    assert(unauthorized.status === 401, 'stage diagnostic route must require Studio bearer auth')
    const invalid = await postJson(endpoint, {}, 'stage-diagnostic-route-token')
    assert(invalid.status === 400, 'stage diagnostic route must reject invalid bodies')
    const disabled = await postJson(endpoint, {
      role: 'extractor',
      expectedIssueUpdatedAt: issueUpdatedAt.toISOString(),
      confirmation: 'RUN_APPROVED_STAGE_DIAGNOSTIC',
    }, 'stage-diagnostic-route-token')
    assert(disabled.status === 503, 'disabled diagnostic route must fail before database access')
    const payload = await disabled.json() as { error?: string }
    assert(payload.error === 'ai-daily-stage-diagnostics-disabled', 'disabled route must return fixed error code')
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    env.aiDailyStageDiagnosticsEnabled = true
  }
}

async function postJson(url: string, body: unknown, token?: string) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

function assertLowSensitive(value: unknown) {
  const serialized = JSON.stringify(value)
  for (const forbidden of ['providerId', 'modelIdentifier', 'endpoint', 'apiKey', 'prompt', 'rawOutput', 'previousOutput']) {
    assert(!serialized.includes(forbidden), `diagnostic result must omit ${forbidden}`)
  }
}

async function assertRejectsCode(promise: Promise<unknown>, code: string) {
  try {
    await promise
  } catch (error) {
    assert(error instanceof AiDailyStageDiagnosticError && error.code === code, `expected ${code}`)
    return
  }
  throw new Error(`expected rejection ${code}`)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
