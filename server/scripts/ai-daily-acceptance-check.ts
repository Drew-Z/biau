import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  approveAiDailyModelEvaluationProposal,
  createAiDailyModelEvaluationProposal,
} from '../src/aiDailyModelArtifacts.js'
import {
  createAiDailyAcceptanceManifest,
  createAiDailyAcceptanceRecordHash,
  evaluateAiDailyAcceptanceManifest,
  sealAiDailyAcceptanceManifest,
  type AiDailyAcceptanceManifest,
} from '../src/aiDailyAcceptance.js'
import {
  createAiDailyRollbackEvidenceManifest,
  sealAiDailyRollbackEvidenceManifest,
  type AiDailyRollbackEvidenceManifest,
} from '../src/aiDailyRollback.js'
import {
  buildAiDailyModelEvaluationCaseDescriptors,
  aiDailyModelEvaluationCaseSetId,
} from '../src/aiDailyModelEvaluationCaseSet.js'
import {
  createAiDailyEvaluationCaseSetHash,
  type AiDailyEvaluationCaseDescriptor,
  type AiDailyModelEvaluationCandidateInput,
} from '../src/aiDailyModelEvaluation.js'
import { createAiDailyGenerationPayloadHash, type AiDailyQualityCaseResult } from '../src/aiDailyGeneration.js'

const editionDate = '2026-07-20'
const evaluationGeneratedAt = '2026-07-20T01:00:00.000Z'
const reviewAt = '2026-07-20T02:00:00.000Z'
const issueId = 'issue-2026-07-20'
const runId = 'run-2026-07-20-1'
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

type SealedRollbackEvidence = AiDailyRollbackEvidenceManifest & { recordHash: string }

const candidates = buildCandidates()
const proposal = createAiDailyModelEvaluationProposal({
  selectionId: 'acceptance-selection-v1',
  generatedAt: evaluationGeneratedAt,
  candidates,
})
const bundle = approveAiDailyModelEvaluationProposal({
  proposal,
  review: {
    reviewedAt: reviewAt,
    reviewedBy: 'offline-editor',
    notes: 'Offline acceptance contract fixture only.',
  },
})
const rollbackEvidence = createSealedRollbackEvidence('acceptance-fixture-v1')

const initialManifest = createAiDailyAcceptanceManifest({
  acceptanceId: 'acceptance-fixture-v1',
  editionDate,
  proposal,
  bundle,
  createdAt: '2026-07-20T02:05:00.000Z',
})
const initialResult = evaluate({ manifest: initialManifest, proposal, bundle, rollbackEvidence: undefined })
assert.equal(initialResult.evidenceVerified, true)
assert.equal(initialResult.readyToSeal, false)
assert.ok(initialResult.issues.includes('live-edition-required'))
assert.ok(initialResult.issues.includes('acceptance-rollback-evidence-required'))
assert.equal(initialResult.gates.rollback, 'missing')

const completeManifest = complete(initialManifest, rollbackEvidence)
const completeResult = evaluate({ manifest: completeManifest, proposal, bundle })
assert.equal(completeResult.issues.length, 0, completeResult.issues.join(', '))
assert.equal(completeResult.readyToSeal, true)
assert.equal(completeResult.sealed, false)

const sealedManifest = sealAiDailyAcceptanceManifest({ manifest: completeManifest, proposal, bundle, rollbackEvidence })
assert.ok(sealedManifest.recordHash)
const sealedResult = evaluate({ manifest: sealedManifest, proposal, bundle, requireSealed: true })
assert.equal(sealedResult.issues.length, 0, sealedResult.issues.join(', '))
assert.equal(sealedResult.sealed, true)

const unverifiedSealed = evaluateAiDailyAcceptanceManifest({ manifest: sealedManifest, rollbackEvidence })
assert.equal(unverifiedSealed.ok, true)
if (unverifiedSealed.ok) assert.equal(unverifiedSealed.sealed, false)
const unverifiedRequireSealed = evaluateAiDailyAcceptanceManifest({ manifest: sealedManifest, rollbackEvidence, requireSealed: true })
assert.equal(unverifiedRequireSealed.ok, true)
if (unverifiedRequireSealed.ok) {
  assert.equal(unverifiedRequireSealed.sealed, false)
  assert.ok(unverifiedRequireSealed.issues.includes('acceptance-artifacts-required'))
}

const rehashedEvidence = {
  ...sealedManifest,
  evaluation: { ...sealedManifest.evaluation, selectionId: 'forged-selection' },
  recordHash: null,
}
const rehashedEvidenceResult = evaluateAiDailyAcceptanceManifest({
  manifest: { ...rehashedEvidence, recordHash: createAiDailyAcceptanceRecordHash(rehashedEvidence) },
  proposal,
  bundle,
  rollbackEvidence,
  requireSealed: true,
})
assert.equal(rehashedEvidenceResult.ok, true)
if (rehashedEvidenceResult.ok) {
  assert.equal(rehashedEvidenceResult.sealed, false)
  assert.ok(rehashedEvidenceResult.issues.includes('acceptance-evaluation-evidence-mismatch'))
}

const rehashedGate = {
  ...sealedManifest,
  deployment: { ...sealedManifest.deployment, checks: { ...sealedManifest.deployment.checks, mobile: 'failed' } },
  recordHash: null,
}
const rehashedGateResult = evaluateAiDailyAcceptanceManifest({
  manifest: { ...rehashedGate, recordHash: createAiDailyAcceptanceRecordHash(rehashedGate) },
  proposal,
  bundle,
  rollbackEvidence,
  requireSealed: true,
})
assert.equal(rehashedGateResult.ok, true)
if (rehashedGateResult.ok) {
  assert.equal(rehashedGateResult.sealed, false)
  assert.ok(rehashedGateResult.issues.includes('deployment-observation-incomplete'))
}

const tamperedRecord = evaluate({
  manifest: {
    ...sealedManifest,
    deployment: { ...sealedManifest.deployment, checks: { ...sealedManifest.deployment.checks, publicFeed: 'failed' } },
  },
  proposal,
  bundle,
  requireSealed: true,
})
assert.ok(tamperedRecord.issues.includes('acceptance-record-hash-mismatch'))
assert.ok(tamperedRecord.issues.includes('deployment-observation-incomplete'))

const fixtureRun = evaluate({
  manifest: { ...completeManifest, liveEdition: { ...completeManifest.liveEdition, profile: 'FIXTURE' } },
  proposal,
  bundle,
})
assert.ok(fixtureRun.issues.includes('live-edition-profile-not-production'))

const incompleteLiveRun = evaluate({
  manifest: { ...completeManifest, liveEdition: { ...completeManifest.liveEdition, status: 'FAILED' } },
  proposal,
  bundle,
})
assert.ok(incompleteLiveRun.issues.includes('live-edition-not-completed'))

const issueMismatch = evaluate({
  manifest: { ...completeManifest, studio: { ...completeManifest.studio, issueId: 'different-issue' } },
  proposal,
  bundle,
})
assert.ok(issueMismatch.issues.includes('studio-issue-mismatch'))

const runMismatch = evaluate({
  manifest: { ...completeManifest, studio: { ...completeManifest.studio, runId: 'different-run' } },
  proposal,
  bundle,
})
assert.ok(runMismatch.issues.includes('studio-run-mismatch'))

const dateMismatch = evaluate({
  manifest: { ...completeManifest, studio: { ...completeManifest.studio, editionDate: '2026-07-21' } },
  proposal,
  bundle,
})
assert.ok(dateMismatch.issues.includes('studio-edition-date-mismatch'))

const incompleteChecklist = evaluate({
  manifest: {
    ...completeManifest,
    studio: {
      ...completeManifest.studio,
      checklist: { ...completeManifest.studio.checklist!, safetyChecked: false },
    },
  },
  proposal,
  bundle,
})
assert.ok(incompleteChecklist.issues.includes('studio-review-checklist-incomplete'))

const draftVersionMismatch = evaluate({
  manifest: { ...completeManifest, publishExport: { ...completeManifest.publishExport, draftUpdatedAt: '2026-07-20T03:00:00.000Z' } },
  proposal,
  bundle,
})
assert.ok(draftVersionMismatch.issues.includes('publish-export-version-mismatch'))

const exportDraftMismatch = evaluate({
  manifest: {
    ...completeManifest,
    publishExport: { ...completeManifest.publishExport, draftId: 'different-draft' },
  },
  proposal,
  bundle,
})
assert.ok(exportDraftMismatch.issues.includes('publish-export-draft-mismatch'))

const exportFailure = evaluate({
  manifest: {
    ...completeManifest,
    publishExport: {
      ...completeManifest.publishExport,
      checks: { ...completeManifest.publishExport.checks!, status: 'failed', results: [{ command: 'npm.cmd run build', exitCode: 1 }] },
    },
  },
  proposal,
  bundle,
})
assert.ok(exportFailure.issues.includes('publish-export-checks-not-passed'))
assert.ok(exportFailure.issues.includes('publish-export-command-failed'))

const incompleteDeployment = evaluate({
  manifest: {
    ...completeManifest,
    deployment: { ...completeManifest.deployment, checks: { ...completeManifest.deployment.checks, mobile: 'pending' } },
  },
  proposal,
  bundle,
})
assert.ok(incompleteDeployment.issues.includes('deployment-observation-incomplete'))

const missingDeploymentObserver = evaluate({
  manifest: {
    ...completeManifest,
    deployment: { ...completeManifest.deployment, observedBy: null },
  },
  proposal,
  bundle,
})
assert.ok(missingDeploymentObserver.issues.includes('deployment-observation-required'))

const missingRollbackEvidence = evaluate({
  manifest: completeManifest,
  proposal,
  bundle,
  rollbackEvidence: undefined,
})
assert.ok(missingRollbackEvidence.issues.includes('acceptance-rollback-evidence-required'))
assert.equal(missingRollbackEvidence.gates.rollback, 'missing')

const missingRollbackReference = evaluate({
  manifest: {
    ...completeManifest,
    deployment: { ...completeManifest.deployment, rollbackEvidence: null },
  },
  proposal,
  bundle,
})
assert.ok(missingRollbackReference.issues.includes('acceptance-rollback-evidence-reference-required'))
assert.equal(missingRollbackReference.gates.rollback, 'missing')

const mismatchedRollbackEvidence = createSealedRollbackEvidence('acceptance-other')
const rollbackBindingMismatch = evaluate({
  manifest: completeManifest,
  proposal,
  bundle,
  rollbackEvidence: mismatchedRollbackEvidence,
})
assert.ok(rollbackBindingMismatch.issues.includes('acceptance-rollback-evidence-binding-mismatch'))
assert.equal(rollbackBindingMismatch.gates.rollback, 'failed')

const tamperedRollbackEvidence = {
  ...rollbackEvidence,
  actions: { ...rollbackEvidence.actions, publicFeedDisabled: 'failed' as const },
}
const rollbackTamper = evaluate({
  manifest: completeManifest,
  proposal,
  bundle,
  rollbackEvidence: tamperedRollbackEvidence,
})
assert.ok(rollbackTamper.issues.includes('acceptance-rollback-evidence-not-sealed'))
assert.equal(rollbackTamper.gates.rollback, 'failed')

const rollbackReferenceMismatch = evaluate({
  manifest: {
    ...completeManifest,
    deployment: {
      ...completeManifest.deployment,
      rollbackEvidence: {
        ...completeManifest.deployment.rollbackEvidence!,
        recordHash: '0'.repeat(64),
      },
    },
  },
  proposal,
  bundle,
})
assert.ok(rollbackReferenceMismatch.issues.includes('acceptance-rollback-evidence-reference-mismatch'))
assert.equal(rollbackReferenceMismatch.gates.rollback, 'failed')

const malformedRollbackEvidence = evaluate({
  manifest: completeManifest,
  proposal,
  bundle,
  rollbackEvidence: { ...rollbackEvidence, endpoint: 'not-allowed' },
})
assert.ok(malformedRollbackEvidence.issues.includes('acceptance-rollback-evidence-invalid'))
assert.equal(malformedRollbackEvidence.gates.rollback, 'failed')

const tamperedProposal = evaluate({
  manifest: completeManifest,
  proposal: { ...proposal, proposalHash: '0'.repeat(64) },
  bundle,
})
assert.ok(tamperedProposal.issues.some((issue) => issue.includes('invalid-ai-daily-model-evaluation-proposal-hash')))

const tamperedBundle = evaluate({
  manifest: completeManifest,
  proposal,
  bundle: { ...bundle, bundleHash: '0'.repeat(64) },
})
assert.ok(tamperedBundle.issues.some((issue) => issue.includes('invalid-ai-daily-model-approval-bundle-hash')))

const alternateProposal = createAiDailyModelEvaluationProposal({
  selectionId: 'acceptance-selection-other',
  generatedAt: evaluationGeneratedAt,
  candidates,
})
const alternateBundle = approveAiDailyModelEvaluationProposal({
  proposal: alternateProposal,
  review: { reviewedAt: reviewAt, reviewedBy: 'offline-editor', notes: 'Alternate fixture.' },
})
const selectionMismatch = evaluate({ manifest: completeManifest, proposal, bundle: alternateBundle })
assert.ok(selectionMismatch.issues.includes('acceptance-selection-id-mismatch'))

const candidateMismatch = buildCandidates('changed')
const candidateMismatchProposal = createAiDailyModelEvaluationProposal({
  selectionId: 'acceptance-selection-changed',
  generatedAt: evaluationGeneratedAt,
  candidates: candidateMismatch,
})
const candidateMismatchBundle = approveAiDailyModelEvaluationProposal({
  proposal: candidateMismatchProposal,
  review: { reviewedAt: reviewAt, reviewedBy: 'offline-editor', notes: 'Changed candidate fixture.' },
})
const candidateMismatchResult = evaluate({ manifest: completeManifest, proposal, bundle: candidateMismatchBundle })
assert.ok(candidateMismatchResult.issues.includes('acceptance-candidate-records-mismatch'))

const sensitiveManifest = evaluateAiDailyAcceptanceManifest({
  manifest: {
    ...completeManifest,
    publishExport: { ...completeManifest.publishExport, target: 'https://private.example.invalid/export' },
  },
  proposal,
  bundle,
})
assert.equal(sensitiveManifest.ok, false)
if (!sensitiveManifest.ok) assert.ok(sensitiveManifest.issues.includes('acceptance-export-target-sensitive'))

const sensitiveCommandManifest = evaluateAiDailyAcceptanceManifest({
  manifest: {
    ...completeManifest,
    publishExport: {
      ...completeManifest.publishExport,
      checks: {
        ...completeManifest.publishExport.checks!,
        results: [{ command: 'export --api-key=sk-not-allowed', exitCode: 0 }],
      },
    },
  },
  proposal,
  bundle,
})
assert.equal(sensitiveCommandManifest.ok, false)
if (!sensitiveCommandManifest.ok) assert.ok(sensitiveCommandManifest.issues.includes('acceptance-export-command-sensitive'))

const impossibleDate = evaluateAiDailyAcceptanceManifest({
  manifest: { ...completeManifest, editionDate: '2026-02-30' },
  proposal,
  bundle,
})
assert.equal(impossibleDate.ok, false)
if (!impossibleDate.ok) assert.ok(impossibleDate.issues.includes('acceptance-edition-date-invalid'))

const oldSchema = evaluateAiDailyAcceptanceManifest({
  manifest: { ...completeManifest, schemaVersion: 'ai-daily-acceptance-v1' },
  proposal,
  bundle,
})
assert.equal(oldSchema.ok, false)
if (!oldSchema.ok) assert.equal(oldSchema.error, 'invalid-ai-daily-acceptance-manifest')

await runCliRoundTrip()

console.log('AI Daily acceptance contract passed (networkCalls=0, providerCalls=0, gates=6, rollbackCases=6, cliRoundTrip=1)')

function evaluate(input: Parameters<typeof evaluateAiDailyAcceptanceManifest>[0]) {
  const result = evaluateAiDailyAcceptanceManifest({ rollbackEvidence, ...input, requireArtifacts: true })
  assert.equal(result.ok, true, result.ok ? undefined : result.issues.join(', '))
  if (!result.ok) throw new Error(result.issues.join(', '))
  return result
}

function complete(
  manifest: AiDailyAcceptanceManifest,
  evidence = createSealedRollbackEvidence(manifest.acceptanceId, manifest.editionDate),
): AiDailyAcceptanceManifest {
  return {
    ...manifest,
    liveEdition: {
      issueId,
      runId,
      editionDate,
      profile: 'PRODUCTION',
      status: 'COMPLETED',
      completedAt: '2026-07-20T03:00:00.000Z',
    },
    studio: {
      issueId,
      runId,
      editionDate,
      draftId: 'draft-2026-07-20',
      draftUpdatedAt: '2026-07-20T04:00:00.000Z',
      reviewId: 'review-2026-07-20',
      draftStatus: 'APPROVED',
      reviewStatus: 'APPROVED',
      checklist: { sourceChecked: true, safetyChecked: true, publicReady: true },
    },
    publishExport: {
      publishExportId: 'export-2026-07-20',
      draftId: 'draft-2026-07-20',
      reviewId: 'review-2026-07-20',
      draftUpdatedAt: '2026-07-20T04:00:00.000Z',
      target: 'public-feed',
      exportedFiles: ['src/data/aiDaily/2026-07-20.json'],
      checks: { status: 'passed', exportedAt: '2026-07-20T04:30:00.000Z', results: [{ command: 'npm.cmd run build', exitCode: 0 }] },
    },
    deployment: {
      observedBy: 'offline-observer',
      observedAt: '2026-07-20T05:00:00.000Z',
      checks: { publicFeed: 'passed', detailPage: 'passed', etag304: 'passed', withdrawn410: 'passed', mobile: 'passed' },
      rollbackEvidence: {
        evidenceId: evidence.evidenceId,
        recordHash: evidence.recordHash,
        status: 'passed',
      },
    },
  }
}

function createSealedRollbackEvidence(
  acceptanceId: string,
  boundEditionDate = editionDate,
): SealedRollbackEvidence {
  const acceptanceBinding = { acceptanceId, editionDate: boundEditionDate, issueId, runId }
  const initial = createAiDailyRollbackEvidenceManifest({
    evidenceId: `rollback-${acceptanceId}`,
    recordedBy: 'offline-observer',
    recordedAt: '2026-07-20T04:45:00.000Z',
    acceptanceBinding,
    reason: 'acceptance-drill',
  })
  const completed: AiDailyRollbackEvidenceManifest = {
    ...initial,
    preconditions: {
      databaseBackupRecorded: true,
      previousRenderRevisionRecorded: true,
      migrationNames: [
        '20260718010000_ai_daily_generation_runner',
        '20260719020000_ai_daily_public_feed_index',
      ],
    },
    actions: {
      ingestCronPaused: 'passed',
      editorialCronPaused: 'passed',
      productionGenerationDisabled: 'passed',
      publicFeedDisabled: 'passed',
    },
    preservation: {
      studioManualEditingAvailable: 'passed',
      studioReviewAvailable: 'passed',
      offlineExportAvailable: 'passed',
      databaseHistoryPreserved: 'passed',
      destructiveMutationPerformed: false,
    },
    decision: { ...initial.decision, status: 'passed' },
  }
  const sealed = sealAiDailyRollbackEvidenceManifest({ manifest: completed, expectedBinding: acceptanceBinding })
  if (!sealed.recordHash) throw new Error('rollback-fixture-record-hash-required')
  return sealed as SealedRollbackEvidence
}

function buildCandidates(suffix = 'base'): AiDailyModelEvaluationCandidateInput[] {
  return (['extractor', 'composer', 'verifier'] as const).flatMap((role) => [
    buildCandidate(role, `primary-${suffix}`, `${role}-domain-primary-${suffix}`, 900),
    buildCandidate(role, `fallback-${suffix}`, `${role}-domain-fallback-${suffix}`, 1_200),
  ])
}

function buildCandidate(
  role: 'extractor' | 'composer' | 'verifier',
  candidateSuffix: string,
  failureDomainRef: string,
  p95LatencyMs: number,
): AiDailyModelEvaluationCandidateInput {
  const caseDescriptors = buildAiDailyModelEvaluationCaseDescriptors(role)
  const cases = buildCases(caseDescriptors)
  return {
    candidateId: `${role}-${candidateSuffix}`,
    role,
    profile: 'business-evaluation',
    providerRef: `${role}-provider-${candidateSuffix}`,
    failureDomainRef,
    modelIdentifier: `contract/${role}-${candidateSuffix}`,
    caseSetId: aiDailyModelEvaluationCaseSetId(role),
    caseSetHash: createAiDailyEvaluationCaseSetHash(caseDescriptors),
    caseDescriptors,
    promptVersion: 'ai-daily-prompt-v2',
    generationSchemaVersion: 'ai-daily-generation-v2',
    evaluatedAt: '2026-07-20T00:00:00.000Z',
    cases,
    performance: {
      attemptCount: cases.length,
      medianLatencyMs: 700,
      p95LatencyMs,
      averageInputTokens: 1_200,
      averageOutputTokens: 500,
    },
    executionEvidence: {
      mode: 'business-evaluation',
      evaluationRunId: `acceptance-fixture-${role}-${candidateSuffix}`,
      evaluatorVersion: 'acceptance-fixture-v1',
      completedCaseCount: cases.length,
      modelCallCount: 1,
      resultSetHash: createAiDailyGenerationPayloadHash(cases),
    },
  }
}

function buildCases(descriptors: readonly AiDailyEvaluationCaseDescriptor[]): AiDailyQualityCaseResult[] {
  return descriptors.map((descriptor) => ({
    id: descriptor.id,
    category: descriptor.category.includes(':')
      ? descriptor.category.slice(descriptor.category.indexOf(':') + 1) as AiDailyQualityCaseResult['category']
      : descriptor.category as AiDailyQualityCaseResult['category'],
    negativeTags: [...descriptor.negativeTags],
    criticalFactualErrors: 0,
    citedVerifiableClaims: 4,
    verifiableClaims: 4,
    validCitationBindings: 4,
    citationBindings: 4,
    editorOutcome: 'accepted',
    chineseEditorialScore: 4.5,
  }))
}

async function runCliRoundTrip() {
  const directory = await mkdtemp(resolve(repoRoot, 'server/data/.acceptance-check-'))
  const outsideDirectory = await mkdtemp(resolve(tmpdir(), 'biau-acceptance-outside-'))
  try {
    const proposalPath = resolve(directory, 'proposal.local.json')
    const bundlePath = resolve(directory, 'bundle.local.json')
    const manifestPath = resolve(directory, 'acceptance.local.json')
    const rollbackPath = resolve(directory, 'rollback.local.json')
    await writeFile(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`, 'utf8')
    await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')

    runCli([
      'init',
      '--acceptance-id', 'acceptance-cli-fixture',
      '--edition-date', editionDate,
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
      '--out', repoRelative(manifestPath),
    ])
    const initialized = JSON.parse(await readFile(manifestPath, 'utf8')) as AiDailyAcceptanceManifest
    const cliRollbackEvidence = createSealedRollbackEvidence(initialized.acceptanceId, initialized.editionDate)
    await writeFile(rollbackPath, `${JSON.stringify(cliRollbackEvidence, null, 2)}\n`, 'utf8')
    await writeFile(manifestPath, `${JSON.stringify(complete(initialized, cliRollbackEvidence), null, 2)}\n`, 'utf8')

    runCliJsonFailure([
      'check',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--rollback', repoRelative(rollbackPath),
    ], 'acceptance-artifact-pair-required')
    runCliFailure([
      'seal',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--rollback', repoRelative(rollbackPath),
    ], 'acceptance-artifact-pair-required')

    const check = runCli([
      'check',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
      '--rollback', repoRelative(rollbackPath),
    ])
    assert.equal(check.readyToSeal, true)
    assert.equal(check.sealed, false)

    runCli([
      'seal',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
      '--rollback', repoRelative(rollbackPath),
    ])
    runCli([
      'seal',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
      '--rollback', repoRelative(rollbackPath),
    ])
    const sealed = runCli([
      'check',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
      '--rollback', repoRelative(rollbackPath),
      '--require-sealed',
    ])
    assert.equal(sealed.sealed, true)
    assert.equal(sealed.issues.length, 0)

    runCliFailure(['check', '--unknown', 'value'], 'unknown-option:unknown')
    runCliFailure(['check', '--manifest', '../outside.local.json'], 'path-outside-repository:manifest')
    runCliFailure(['check', '--require-sealed=false'], 'invalid-option-value:require-sealed')
    const outsideLink = resolve(directory, 'outside-link')
    await symlink(outsideDirectory, outsideLink, process.platform === 'win32' ? 'junction' : 'dir')
    runCliFailure(
      ['check', '--manifest', `${repoRelative(outsideLink)}/manifest.local.json`],
      'path-outside-repository:manifest',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
    await rm(outsideDirectory, { recursive: true, force: true })
  }
}

function runCli(args: string[]) {
  const result = spawnCli(args)
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return JSON.parse(result.stdout) as Record<string, unknown>
}

function runCliFailure(args: string[], expected: string) {
  const result = spawnCli(args)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'))
}

function runCliJsonFailure(args: string[], expectedIssue: string) {
  const result = spawnCli(args)
  assert.notEqual(result.status, 0)
  const payload = JSON.parse(result.stdout) as { issues?: unknown }
  assert.ok(Array.isArray(payload.issues) && payload.issues.includes(expectedIssue), result.stdout)
}

function spawnCli(args: string[]) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const npmArgs = ['--silent', 'run', 'ai-daily:acceptance', '--', ...args]
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', [npmCommand, ...npmArgs].join(' ')], { cwd: repoRoot, encoding: 'utf8' })
    : spawnSync(npmCommand, npmArgs, { cwd: repoRoot, encoding: 'utf8' })
  return {
    status: result.status,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
  }
}

function repoRelative(path: string) {
  return relative(repoRoot, path).replaceAll('\\', '/')
}
