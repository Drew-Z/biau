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
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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

const initialManifest = createAiDailyAcceptanceManifest({
  acceptanceId: 'acceptance-fixture-v1',
  editionDate,
  proposal,
  bundle,
  createdAt: '2026-07-20T02:05:00.000Z',
})
const initialResult = evaluate({ manifest: initialManifest, proposal, bundle })
assert.equal(initialResult.evidenceVerified, true)
assert.equal(initialResult.readyToSeal, false)
assert.ok(initialResult.issues.includes('live-edition-required'))

const completeManifest = complete(initialManifest)
const completeResult = evaluate({ manifest: completeManifest, proposal, bundle })
assert.equal(completeResult.issues.length, 0, completeResult.issues.join(', '))
assert.equal(completeResult.readyToSeal, true)
assert.equal(completeResult.sealed, false)

const sealedManifest = sealAiDailyAcceptanceManifest({ manifest: completeManifest, proposal, bundle })
assert.ok(sealedManifest.recordHash)
const sealedResult = evaluate({ manifest: sealedManifest, proposal, bundle, requireSealed: true })
assert.equal(sealedResult.issues.length, 0, sealedResult.issues.join(', '))
assert.equal(sealedResult.sealed, true)

const unverifiedSealed = evaluateAiDailyAcceptanceManifest({ manifest: sealedManifest })
assert.equal(unverifiedSealed.ok, true)
if (unverifiedSealed.ok) assert.equal(unverifiedSealed.sealed, false)
const unverifiedRequireSealed = evaluateAiDailyAcceptanceManifest({ manifest: sealedManifest, requireSealed: true })
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

const draftVersionMismatch = evaluate({
  manifest: { ...completeManifest, publishExport: { ...completeManifest.publishExport, draftUpdatedAt: '2026-07-20T03:00:00.000Z' } },
  proposal,
  bundle,
})
assert.ok(draftVersionMismatch.issues.includes('publish-export-version-mismatch'))

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
  manifest: { ...completeManifest, schemaVersion: 'ai-daily-acceptance-v0' },
  proposal,
  bundle,
})
assert.equal(oldSchema.ok, false)
if (!oldSchema.ok) assert.equal(oldSchema.error, 'invalid-ai-daily-acceptance-manifest')

await runCliRoundTrip()

console.log('AI Daily acceptance contract passed (providerCalls=0, gates=5, tamperCases=12, cliRoundTrip=1)')

function evaluate(input: Parameters<typeof evaluateAiDailyAcceptanceManifest>[0]) {
  const result = evaluateAiDailyAcceptanceManifest({ ...input, requireArtifacts: true })
  assert.equal(result.ok, true, result.ok ? undefined : result.issues.join(', '))
  if (!result.ok) throw new Error(result.issues.join(', '))
  return result
}

function complete(manifest: AiDailyAcceptanceManifest): AiDailyAcceptanceManifest {
  return {
    ...manifest,
    liveEdition: {
      issueId: 'issue-2026-07-20',
      runId: 'run-2026-07-20-1',
      editionDate,
      profile: 'PRODUCTION',
      status: 'COMPLETED',
      completedAt: '2026-07-20T03:00:00.000Z',
    },
    studio: {
      issueId: 'issue-2026-07-20',
      runId: 'run-2026-07-20-1',
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
      rollbackReady: true,
    },
  }
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
    await writeFile(manifestPath, `${JSON.stringify(complete(initialized), null, 2)}\n`, 'utf8')

    const check = runCli([
      'check',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
    ])
    assert.equal(check.readyToSeal, true)
    assert.equal(check.sealed, false)

    runCli([
      'seal',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
    ])
    runCli([
      'seal',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
    ])
    const sealed = runCli([
      'check',
      '--manifest', repoRelative(manifestPath),
      '--proposal', repoRelative(proposalPath),
      '--bundle', repoRelative(bundlePath),
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
