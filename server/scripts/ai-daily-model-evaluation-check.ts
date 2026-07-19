import assert from 'node:assert/strict'
import {
  approveAiDailyModelEvaluation,
  createAiDailyEvaluationCaseSetHash,
  evaluateAiDailyModelCandidate,
  selectAiDailyModelEvaluation,
  type AiDailyEvaluationCaseDescriptor,
  type AiDailyModelEvaluationCandidateInput,
  type AiDailyModelEvaluationCandidateRecord,
  type AiDailyModelEvaluationProfile,
} from '../src/aiDailyModelEvaluation.js'
import {
  aiDailyModelEvaluationCaseSetId,
  buildAiDailyModelEvaluationCaseDescriptors,
  createAiDailyModelEvaluationCaseContractVersion,
  loadAiDailyModelEvaluationCaseSet,
} from '../src/aiDailyModelEvaluationCaseSet.js'
import {
  composeAiDailyFacts,
  createAiDailyGenerationPayloadHash,
  extractAiDailyFacts,
  type AiDailyGenerationRole,
  type AiDailyQualityCaseResult,
} from '../src/aiDailyGeneration.js'
import {
  buildAiDailyGenerationProvidersFixture,
  buildAiDailyQualityFixtureDefinitions,
} from '../src/aiDailyGenerationFixtures.js'
import {
  createAiDailyComposerEvaluationScenario,
  createAiDailyExtractorEvaluationScenario,
  createAiDailyVerifierEvaluationScenario,
} from '../src/aiDailyModelBusinessEvaluation.js'
import { aiDailyQualityNegativeTags, type AiDailyQualityCategory } from '../src/aiDailyQualityContract.js'

const baseDescriptors: AiDailyEvaluationCaseDescriptor[] = Array.from({ length: 40 }, (_, index) => ({
  id: `case-${String(index + 1).padStart(2, '0')}`,
  category: ['official-release', 'multi-source', 'numeric', 'correction', 'chinese-source', 'low-evidence'][index % 6] ?? 'official-release',
  negativeTags: [
    aiDailyQualityNegativeTags[index % aiDailyQualityNegativeTags.length]!,
    aiDailyQualityNegativeTags[(index + 3) % aiDailyQualityNegativeTags.length]!,
  ].sort(),
  version: 'v1',
}))
function descriptorsForRole(role: AiDailyGenerationRole) {
  return baseDescriptors.map((item) => ({ ...item, category: `${role}:${item.category}` }))
}
const descriptors = descriptorsForRole('composer')
const changedDescriptors = descriptors.map((item, index) => index === 0 ? { ...item, version: 'v2' } : item)
const changedExtractorDescriptors = descriptorsForRole('extractor').map((item, index) => index === 0 ? { ...item, version: 'v2' } : item)
const goldenCaseSet = loadAiDailyModelEvaluationCaseSet()
assert.equal(goldenCaseSet.cases.length, 30, 'golden case-set must keep the approved minimum case count')
assert.equal(goldenCaseSet.requiredNegativeTags.length, 8, 'golden case-set must cover every required negative slice')
const goldenContractVersion = createAiDailyModelEvaluationCaseContractVersion(goldenCaseSet)
assert.notEqual(
  goldenContractVersion,
  createAiDailyModelEvaluationCaseContractVersion({
    caseVersion: goldenCaseSet.caseVersion,
    cases: goldenCaseSet.cases.map((item, index) => index === 0 ? { ...item, scenario: `${item.scenario} changed` } : item),
  }),
  'golden contract version must change when a scenario changes',
)
assert.notEqual(
  goldenContractVersion,
  createAiDailyModelEvaluationCaseContractVersion({
    caseVersion: goldenCaseSet.caseVersion,
    cases: goldenCaseSet.cases.map((item, index) => index === 0 ? { ...item, editorOutcome: 'major-edit' as const } : item),
  }),
  'golden contract version must change when an expected editor outcome changes',
)
assert.notEqual(
  goldenContractVersion,
  createAiDailyModelEvaluationCaseContractVersion({
    caseVersion: goldenCaseSet.caseVersion,
    cases: goldenCaseSet.cases.map((item, index) => index === 0 ? { ...item, chineseEditorialScore: item.chineseEditorialScore - 0.1 } : item),
  }),
  'golden contract version must change when an expected editorial score changes',
)
assert.ok(
  buildAiDailyModelEvaluationCaseDescriptors('composer').every((descriptor) => descriptor.version === goldenContractVersion),
  'role descriptors must carry the complete golden contract fingerprint',
)
const fixtureDefinitions = buildAiDailyQualityFixtureDefinitions()
const fixtureProviders = buildAiDailyGenerationProvidersFixture()
const fixtureClaims = await extractAiDailyFacts({ evidence: fixtureDefinitions[0]!.evidence, providers: fixtureProviders })
assert.equal(fixtureClaims.ok, true, 'verifier scenario contract needs deterministic claims')
if (!fixtureClaims.ok) throw new Error('ai-daily-verifier-scenario-claims-missing')
const fixtureComposition = await composeAiDailyFacts({ claims: fixtureClaims.claims, providers: fixtureProviders })
assert.equal(fixtureComposition.ok, true, 'verifier scenario contract needs deterministic composition')
if (!fixtureComposition.ok) throw new Error('ai-daily-verifier-scenario-composition-missing')
for (const definition of fixtureDefinitions) {
  const extractorScenario = createAiDailyExtractorEvaluationScenario(definition)
  assert.deepEqual(
    [...extractorScenario.exercisedNegativeTags].sort(),
    [...definition.negativeTags].sort(),
    `${definition.id} extractor scenario must exercise every declared negative tag`,
  )
  const composerScenario = createAiDailyComposerEvaluationScenario(fixtureClaims.claims, definition)
  assert.deepEqual(
    [...composerScenario.exercisedNegativeTags].sort(),
    [...definition.negativeTags].sort(),
    `${definition.id} composer scenario must exercise every declared negative tag`,
  )
  const scenario = createAiDailyVerifierEvaluationScenario(
    fixtureClaims.claims,
    fixtureComposition.composition,
    definition,
  )
  assert.deepEqual(
    [...scenario.exercisedNegativeTags].sort(),
    [...definition.negativeTags].sort(),
    `${definition.id} must exercise every declared negative tag`,
  )
}
const caseSetHash = createAiDailyEvaluationCaseSetHash(descriptors)
const reversedHash = createAiDailyEvaluationCaseSetHash([...descriptors].reverse())
assert.equal(caseSetHash, reversedHash, 'case-set hash must not depend on input order')
assert.equal(
  caseSetHash,
  createAiDailyEvaluationCaseSetHash(descriptors.map((item, index) => index === 0
    ? { ...item, negativeTags: [...item.negativeTags].reverse() }
    : item)),
  'case-set hash must canonicalize negative-tag order',
)
assert.notEqual(
  caseSetHash,
  createAiDailyEvaluationCaseSetHash(descriptors.map((item, index) => index === 0 ? { ...item, version: 'v2' } : item)),
  'case-set hash must change when a case contract changes',
)

function buildCases(caseDescriptors: AiDailyEvaluationCaseDescriptor[], acceptedCount: number, chineseEditorialScore = 4.5): AiDailyQualityCaseResult[] {
  return caseDescriptors.map((descriptor, index) => ({
    id: descriptor.id,
    category: descriptor.category.includes(':')
      ? descriptor.category.slice(descriptor.category.indexOf(':') + 1) as AiDailyQualityCategory
      : descriptor.category as AiDailyQualityCategory,
    negativeTags: [...descriptor.negativeTags],
    criticalFactualErrors: 0,
    citedVerifiableClaims: 4,
    verifiableClaims: 4,
    validCitationBindings: 4,
    citationBindings: 4,
    editorOutcome: index < acceptedCount ? 'accepted' : 'major-edit',
    chineseEditorialScore,
  }))
}

function buildCandidate(input: {
  candidateId: string
  role: AiDailyGenerationRole
  acceptedCount: number
  profile?: AiDailyModelEvaluationProfile
  caseHash?: string
  caseSetId?: string
  caseDescriptors?: AiDailyEvaluationCaseDescriptor[]
  failureDomainRef?: string
  executionMode?: AiDailyModelEvaluationProfile
  p95LatencyMs?: number
  cases?: AiDailyQualityCaseResult[]
}): AiDailyModelEvaluationCandidateRecord {
  const profile = input.profile ?? 'fixture-contract'
  const caseDescriptors = input.caseDescriptors ?? (
    profile === 'business-evaluation'
      ? buildAiDailyModelEvaluationCaseDescriptors(input.role)
      : descriptorsForRole(input.role)
  )
  const cases = input.cases ?? buildCases(caseDescriptors, input.acceptedCount)
  const candidate: AiDailyModelEvaluationCandidateInput = {
    candidateId: input.candidateId,
    role: input.role,
    profile,
    providerRef: `${input.role}-channel`,
    failureDomainRef: input.failureDomainRef ?? input.candidateId,
    modelIdentifier: `contract/${input.candidateId}`,
    caseSetId: input.caseSetId ?? (
      profile === 'business-evaluation'
        ? aiDailyModelEvaluationCaseSetId(input.role)
        : `ai-daily-golden-v2-${input.role}`
    ),
    caseSetHash: input.caseHash ?? createAiDailyEvaluationCaseSetHash(caseDescriptors),
    caseDescriptors,
    promptVersion: 'ai-daily-prompt-v2',
    generationSchemaVersion: 'ai-daily-generation-v2',
    evaluatedAt: '2026-07-19T00:00:00.000Z',
    cases,
    performance: {
      attemptCount: cases.length,
      medianLatencyMs: 900,
      p95LatencyMs: input.p95LatencyMs ?? 1_500,
      averageInputTokens: 1_200,
      averageOutputTokens: 500,
    },
    executionEvidence: {
      mode: input.executionMode ?? profile,
      evaluationRunId: profile === 'fixture-contract' ? 'fixture-contract-v1' : `recorded-${input.candidateId}`,
      evaluatorVersion: 'ai-daily-evaluator-v1',
      completedCaseCount: cases.length,
      modelCallCount: profile === 'fixture-contract' ? 0 : 1,
      resultSetHash: profile === 'fixture-contract' ? null : createAiDailyGenerationPayloadHash(cases),
    },
  }
  const result = evaluateAiDailyModelCandidate(candidate)
  assert.equal(result.ok, true, result.ok ? undefined : result.issues.join(', '))
  if (!result.ok) throw new Error(result.issues.join(', '))
  return result.record
}

function selectionFor(candidates: AiDailyModelEvaluationCandidateRecord[]) {
  return selectAiDailyModelEvaluation({
    selectionId: 'fixture-selection-v1',
    generatedAt: '2026-07-19T01:00:00.000Z',
    candidates,
  })
}

const fixtureCandidates = [
  buildCandidate({ candidateId: 'extractor-primary', role: 'extractor', acceptedCount: 38 }),
  buildCandidate({ candidateId: 'extractor-fallback', role: 'extractor', acceptedCount: 36 }),
  buildCandidate({ candidateId: 'composer-primary', role: 'composer', acceptedCount: 38, failureDomainRef: 'composer-domain-primary' }),
  buildCandidate({ candidateId: 'composer-fallback-five-points', role: 'composer', acceptedCount: 36, failureDomainRef: 'composer-domain-fallback' }),
  buildCandidate({ candidateId: 'composer-fallback-too-far', role: 'composer', acceptedCount: 35 }),
  buildCandidate({ candidateId: 'composer-below-floor', role: 'composer', acceptedCount: 33, failureDomainRef: 'composer-domain-primary' }),
  buildCandidate({ candidateId: 'verifier-primary', role: 'verifier', acceptedCount: 37 }),
  buildCandidate({ candidateId: 'verifier-fallback', role: 'verifier', acceptedCount: 35 }),
]
const fixtureSelection = selectionFor(fixtureCandidates)
assert.equal(fixtureSelection.approvalEligible, false, 'fixture evaluation must not be approval-eligible')
assert.ok(fixtureSelection.blockingGaps.every((gap) => gap.endsWith('fixture-contract-only')))
assert.equal(fixtureSelection.approval.status, 'pending')
const composerSelection = fixtureSelection.roles.find((role) => role.role === 'composer')
assert.equal(composerSelection?.primaryCandidateId, 'composer-primary')
assert.deepEqual(composerSelection?.fallbackCandidateIds, ['composer-fallback-five-points'])
assert.equal(composerSelection?.redundancy, 'full')
assert.ok(!composerSelection?.fallbackCandidateIds.includes('composer-fallback-too-far'))
assert.ok(!composerSelection?.fallbackCandidateIds.includes('composer-below-floor'))

const sameDomainFallback = buildCandidate({
  candidateId: 'composer-same-domain',
  role: 'composer',
  acceptedCount: 37,
  failureDomainRef: 'composer-domain-primary',
})
const sameDomainSelection = selectionFor([
  fixtureCandidates.find((candidate) => candidate.candidateId === 'composer-primary')!,
  sameDomainFallback,
])
const sameDomainRole = sameDomainSelection.roles.find((role) => role.role === 'composer')
assert.deepEqual(sameDomainRole?.fallbackCandidateIds, [])
assert.equal(sameDomainRole?.redundancy, 'reduced_redundancy')
assert.ok(sameDomainRole?.warnings.includes('fallback-shares-primary-failure-domain'))

const weakNegativeSliceCases = buildCases(descriptors, 40)
for (const item of weakNegativeSliceCases.filter((candidate) => candidate.negativeTags.includes('scope-inflation')).slice(0, 3)) {
  item.editorOutcome = 'major-edit'
}
const weakNegativeSliceCandidate = buildCandidate({
  candidateId: 'composer-weak-negative-slice',
  role: 'composer',
  acceptedCount: 40,
  cases: weakNegativeSliceCases,
})
assert.ok(weakNegativeSliceCandidate.report.minorEditAcceptance >= 0.85, 'global acceptance should still pass in the slice regression')
assert.equal(weakNegativeSliceCandidate.eligible, false, 'a weak negative slice must block eligibility')
assert.ok(
  weakNegativeSliceCandidate.rejectionCodes.includes('negative-slice-acceptance-below-floor:scope-inflation'),
  'negative slice failure must remain visible instead of being averaged away',
)

const shuffledSelection = selectionFor([...fixtureCandidates].reverse())
assert.deepEqual(shuffledSelection.roles, fixtureSelection.roles, 'selection must not depend on candidate input order')
assert.equal(shuffledSelection.candidateSetHash, fixtureSelection.candidateSetHash, 'candidate-set hash must be stable')
assert.equal(shuffledSelection.recordHash, fixtureSelection.recordHash, 'selection record hash must be stable')

const fixtureApproval = approveAiDailyModelEvaluation(fixtureSelection, {
  reviewedAt: '2026-07-19T02:00:00.000Z',
  reviewedBy: 'editor',
  notes: 'Contract-only fixture must remain unapproved.',
})
assert.equal(fixtureApproval.ok, false)
if (!fixtureApproval.ok) assert.ok(fixtureApproval.issues.includes('fixture-selection-cannot-be-approved'))

const businessCandidates = fixtureCandidates.map((candidate) => buildCandidate({
  candidateId: `business-${candidate.candidateId}`,
  role: candidate.role,
  acceptedCount: Math.round(candidate.report.minorEditAcceptance * 30),
  profile: 'business-evaluation',
  p95LatencyMs: candidate.performance.p95LatencyMs,
}))
const businessSelection = selectAiDailyModelEvaluation({
  selectionId: 'business-selection-v1',
  generatedAt: '2026-07-19T01:00:00.000Z',
  candidates: businessCandidates,
})
assert.equal(businessSelection.approvalEligible, true, 'business-shaped measured records may reach the human approval gate')
assert.equal(businessSelection.approval.status, 'pending', 'selection must never auto-approve')
const approved = approveAiDailyModelEvaluation(businessSelection, {
  reviewedAt: '2026-07-19T02:00:00.000Z',
  reviewedBy: 'editor',
  notes: 'Explicit human approval state-machine fixture.',
})
assert.equal(approved.ok, true)
if (approved.ok) assert.equal(approved.record.approval.status, 'approved')

const tamperedBusinessDescriptors = buildAiDailyModelEvaluationCaseDescriptors('composer')
const originalBusinessCases = buildCases(tamperedBusinessDescriptors, tamperedBusinessDescriptors.length)
const tamperedBusinessCases = originalBusinessCases.map((item, index) => index === 0
  ? { ...item, chineseEditorialScore: item.chineseEditorialScore - 0.1 }
  : item)
const tamperedBusinessCandidate = evaluateAiDailyModelCandidate({
  candidateId: 'business-tampered-result-set',
  role: 'composer',
  profile: 'business-evaluation',
  providerRef: 'composer-channel',
  failureDomainRef: 'business-tampered-result-set',
  modelIdentifier: 'contract/business-tampered-result-set',
  caseSetId: aiDailyModelEvaluationCaseSetId('composer'),
  caseSetHash: createAiDailyEvaluationCaseSetHash(tamperedBusinessDescriptors),
  caseDescriptors: tamperedBusinessDescriptors,
  promptVersion: 'ai-daily-prompt-v2',
  generationSchemaVersion: 'ai-daily-generation-v2',
  evaluatedAt: '2026-07-19T00:00:00.000Z',
  cases: tamperedBusinessCases,
  performance: {
    attemptCount: tamperedBusinessCases.length,
    medianLatencyMs: 900,
    p95LatencyMs: 1_500,
    averageInputTokens: 1_200,
    averageOutputTokens: 500,
  },
  executionEvidence: {
    mode: 'business-evaluation',
    evaluationRunId: 'recorded-business-tampered-result-set',
    evaluatorVersion: 'ai-daily-evaluator-v1',
    completedCaseCount: tamperedBusinessCases.length,
    modelCallCount: tamperedBusinessCases.length,
    resultSetHash: createAiDailyGenerationPayloadHash(originalBusinessCases),
  },
})
assert.equal(tamperedBusinessCandidate.ok, false)
if (!tamperedBusinessCandidate.ok) {
  assert.ok(tamperedBusinessCandidate.issues.includes('business-result-set-hash-mismatch'))
}

const relabeledFixtureInput: AiDailyModelEvaluationCandidateInput = {
  candidateId: 'relabeled-fixture',
  role: 'composer',
  profile: 'business-evaluation',
  providerRef: 'composer-channel',
  failureDomainRef: 'relabeled-fixture',
  modelIdentifier: 'contract/relabeled-fixture',
  caseSetId: 'ai-daily-golden-v2-composer',
  caseSetHash,
  caseDescriptors: descriptors,
  promptVersion: 'ai-daily-prompt-v2',
  generationSchemaVersion: 'ai-daily-generation-v2',
  evaluatedAt: '2026-07-19T00:00:00.000Z',
  cases: buildCases(descriptors, 38),
  performance: { attemptCount: 40, medianLatencyMs: 900, p95LatencyMs: 1_500, averageInputTokens: 1_200, averageOutputTokens: 500 },
  executionEvidence: {
    mode: 'fixture-contract',
    evaluationRunId: 'fixture-contract-v1',
    evaluatorVersion: 'ai-daily-evaluator-v1',
    completedCaseCount: 40,
    modelCallCount: 0,
    resultSetHash: null,
  },
}
const relabeledFixture = evaluateAiDailyModelCandidate(relabeledFixtureInput)
assert.equal(relabeledFixture.ok, false)
if (!relabeledFixture.ok) assert.ok(relabeledFixture.issues.includes('profile-execution-mode-mismatch'))

const mismatchedCandidate = buildCandidate({
  candidateId: 'extractor-other-case-set',
  role: 'extractor',
  acceptedCount: 38,
  caseHash: createAiDailyEvaluationCaseSetHash(changedExtractorDescriptors),
  caseDescriptors: changedExtractorDescriptors,
  caseSetId: 'ai-daily-golden-v2-extractor',
})
const mismatchSelection = selectionFor([...fixtureCandidates, mismatchedCandidate])
assert.ok(mismatchSelection.blockingGaps.includes('extractor:case-set-mismatch'))

const missingRoleSelection = selectionFor(fixtureCandidates.filter((candidate) => candidate.role !== 'verifier'))
assert.ok(missingRoleSelection.blockingGaps.includes('verifier:no-candidates'))

const belowMinimumCases = evaluateAiDailyModelCandidate({
  candidateId: 'short-case-set',
  role: 'composer',
  profile: 'fixture-contract',
  providerRef: 'composer-channel',
  failureDomainRef: 'short-case-set',
  modelIdentifier: 'contract/short-case-set',
  caseSetId: 'short-case-set',
  caseSetHash: createAiDailyEvaluationCaseSetHash(descriptors.slice(0, 29)),
  caseDescriptors: descriptors.slice(0, 29),
  promptVersion: 'ai-daily-prompt-v2',
  generationSchemaVersion: 'ai-daily-generation-v2',
  evaluatedAt: '2026-07-19T00:00:00.000Z',
  cases: buildCases(descriptors.slice(0, 29), 29).slice(0, 29),
  performance: { attemptCount: 29, medianLatencyMs: 900, p95LatencyMs: 1_500, averageInputTokens: 1_200, averageOutputTokens: 500 },
  executionEvidence: {
    mode: 'fixture-contract',
    evaluationRunId: 'fixture-contract-v1',
    evaluatorVersion: 'ai-daily-evaluator-v1',
    completedCaseCount: 29,
    modelCallCount: 0,
    resultSetHash: null,
  },
})
assert.equal(belowMinimumCases.ok, true)
if (belowMinimumCases.ok) {
  assert.equal(belowMinimumCases.record.eligible, false)
  assert.ok(belowMinimumCases.record.rejectionCodes.includes('minimum-quality-cases-not-met'))
}

const invalidModelIdentifier = evaluateAiDailyModelCandidate({
  candidateId: 'invalid-model-id',
  role: 'composer',
  profile: 'fixture-contract',
  providerRef: 'composer-channel',
  failureDomainRef: 'invalid-model-id',
  modelIdentifier: 'https://private.example.invalid/v1',
  caseSetId: 'ai-daily-golden-v2-composer',
  caseSetHash,
  caseDescriptors: descriptors,
  promptVersion: 'ai-daily-prompt-v2',
  generationSchemaVersion: 'ai-daily-generation-v2',
  evaluatedAt: '2026-07-19T00:00:00.000Z',
  cases: buildCases(descriptors, 38),
  performance: { attemptCount: 40, medianLatencyMs: 900, p95LatencyMs: 1_500, averageInputTokens: 1_200, averageOutputTokens: 500 },
  executionEvidence: {
    mode: 'fixture-contract',
    evaluationRunId: 'fixture-contract-v1',
    evaluatorVersion: 'ai-daily-evaluator-v1',
    completedCaseCount: 40,
    modelCallCount: 0,
    resultSetHash: null,
  },
})
assert.equal(invalidModelIdentifier.ok, false)
if (!invalidModelIdentifier.ok) assert.ok(invalidModelIdentifier.issues.includes('model-identifier-invalid'))

const hashMismatch = evaluateAiDailyModelCandidate({
  candidateId: 'hash-mismatch',
  role: 'composer',
  profile: 'fixture-contract',
  providerRef: 'composer-channel',
  failureDomainRef: 'hash-mismatch',
  modelIdentifier: 'contract/hash-mismatch',
  caseSetId: 'ai-daily-golden-v2-composer',
  caseSetHash: createAiDailyEvaluationCaseSetHash(changedDescriptors),
  caseDescriptors: descriptors,
  promptVersion: 'ai-daily-prompt-v2',
  generationSchemaVersion: 'ai-daily-generation-v2',
  evaluatedAt: '2026-07-19T00:00:00.000Z',
  cases: buildCases(descriptors, 38),
  performance: { attemptCount: 40, medianLatencyMs: 900, p95LatencyMs: 1_500, averageInputTokens: 1_200, averageOutputTokens: 500 },
  executionEvidence: {
    mode: 'fixture-contract',
    evaluationRunId: 'fixture-contract-v1',
    evaluatorVersion: 'ai-daily-evaluator-v1',
    completedCaseCount: 40,
    modelCallCount: 0,
    resultSetHash: null,
  },
})
assert.equal(hashMismatch.ok, false)
if (!hashMismatch.ok) assert.ok(hashMismatch.issues.includes('case-set-hash-mismatch'))

const tamperedCandidate = { ...fixtureCandidates[0], acceptanceBasisPoints: 10_000 }
assert.throws(
  () => selectionFor([tamperedCandidate, ...fixtureCandidates.slice(1)]),
  /invalid-ai-daily-model-evaluation-record-hash/u,
)

const sensitiveReview = approveAiDailyModelEvaluation(businessSelection, {
  reviewedAt: '2026-07-19T02:00:00.000Z',
  reviewedBy: 'editor',
  notes: 'api_key=[redacted]',
})
assert.equal(sensitiveReview.ok, false)
if (!sensitiveReview.ok) assert.ok(sensitiveReview.issues.includes('review-notes-sensitive'))

const serialized = JSON.stringify({ fixtureSelection, businessSelection })
for (const deniedKey of ['"prompt"', '"rawOutput"', '"evidence"', '"endpoint"', '"apiKey"', '"errorMessage"']) {
  assert.ok(!serialized.includes(deniedKey), `low-sensitive record must not contain ${deniedKey}`)
}

console.log('AI Daily model evaluation contract passed (goldenCases=30, fixtureCases=40, negativeSlices=8, threeRoles=3, providerCalls=0)')
