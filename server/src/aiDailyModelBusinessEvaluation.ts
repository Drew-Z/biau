import {
  aiDailyGenerationPromptVersion,
  aiDailyGenerationSchemaVersion,
  collectAiDailyCompositionReviewTargets,
  composeAiDailyFacts,
  createAiDailyGenerationPayloadHash,
  extractAiDailyFacts,
  verifyAiDailyComposition,
  type AiDailyAtomicClaim,
  type AiDailyComposition,
  type AiDailyGenerationProviders,
  type AiDailyGenerationRole,
  type AiDailyQualityCaseResult,
  type AiDailyStructuredGenerationProvider,
} from './aiDailyGeneration.js'
import {
  buildAiDailyGenerationProvidersFixture,
  buildAiDailyQualityFixtureDefinitions,
  type AiDailyQualityFixtureDefinition,
} from './aiDailyGenerationFixtures.js'
import {
  createAiDailyEvaluationCaseSetHash,
  type AiDailyEvaluationCaseDescriptor,
  type AiDailyModelEvaluationCandidateInput,
} from './aiDailyModelEvaluation.js'
import { createAiDailyOpenAiCompatibleProvider } from './aiDailyModelProvider.js'
import type { AiDailyModelRuntimeChannel, AiDailyModelRuntimeCandidate } from './aiDailyModelRuntime.js'

export const aiDailyBusinessEvaluatorVersion = 'ai-daily-business-evaluator-v1'
const caseVersion = 'business-v1'

export async function evaluateAiDailyBusinessCandidate(input: {
  candidate: AiDailyModelRuntimeCandidate
  channel: AiDailyModelRuntimeChannel
  evaluationRunId: string
  evaluatedAt: string
  onProgress?: (progress: { candidateId: string; role: AiDailyGenerationRole; completed: number; total: number }) => void
}): Promise<AiDailyModelEvaluationCandidateInput> {
  const definitions = buildAiDailyQualityFixtureDefinitions()
  const descriptors = createCaseDescriptors(input.candidate.role, definitions)
  const provider = createAiDailyOpenAiCompatibleProvider({
    candidate: input.candidate,
    channel: input.channel,
    slot: 'primary',
    qualityScore: 100,
  })
  const cases: AiDailyQualityCaseResult[] = []
  const latencies: number[] = []
  let modelCallCount = 0
  for (const [index, definition] of definitions.entries()) {
    const startedAt = Date.now()
    const measured = await evaluateRoleCase(input.candidate.role, provider, definition, index)
    latencies.push(Date.now() - startedAt)
    modelCallCount += measured.callCount
    cases.push({ ...measured.result, id: descriptors[index].id })
    input.onProgress?.({
      candidateId: input.candidate.candidateId,
      role: input.candidate.role,
      completed: index + 1,
      total: definitions.length,
    })
  }
  const sortedLatencies = [...latencies].sort((left, right) => left - right)
  return {
    candidateId: input.candidate.candidateId,
    role: input.candidate.role,
    profile: 'business-evaluation',
    providerRef: input.channel.providerRef,
    failureDomainRef: input.channel.failureDomainRef,
    modelIdentifier: input.channel.modelIdentifier,
    caseSetId: `ai-daily-${input.candidate.role}-business-v1`,
    caseSetHash: createAiDailyEvaluationCaseSetHash(descriptors),
    caseDescriptors: descriptors,
    promptVersion: aiDailyGenerationPromptVersion,
    generationSchemaVersion: aiDailyGenerationSchemaVersion,
    evaluatedAt: input.evaluatedAt,
    cases,
    performance: {
      attemptCount: Math.max(1, modelCallCount),
      medianLatencyMs: percentile(sortedLatencies, 0.5),
      p95LatencyMs: percentile(sortedLatencies, 0.95),
      averageInputTokens: null,
      averageOutputTokens: null,
    },
    executionEvidence: {
      mode: 'business-evaluation',
      evaluationRunId: input.evaluationRunId,
      evaluatorVersion: aiDailyBusinessEvaluatorVersion,
      completedCaseCount: cases.length,
      modelCallCount,
      resultSetHash: createAiDailyGenerationPayloadHash(cases),
    },
  }
}

function createCaseDescriptors(role: AiDailyGenerationRole, definitions: AiDailyQualityFixtureDefinition[]): AiDailyEvaluationCaseDescriptor[] {
  return definitions.map((definition) => ({
    id: `${role}-${definition.id}`,
    category: `${role}:${definition.category}`,
    version: caseVersion,
  }))
}

async function evaluateRoleCase(
  role: AiDailyGenerationRole,
  provider: AiDailyStructuredGenerationProvider,
  definition: AiDailyQualityFixtureDefinition,
  index: number,
) {
  if (role === 'extractor') return evaluateExtractorCase(provider, definition)
  if (role === 'composer') return evaluateComposerCase(provider, definition)
  return evaluateVerifierCase(provider, definition, index)
}

async function evaluateExtractorCase(provider: AiDailyStructuredGenerationProvider, definition: AiDailyQualityFixtureDefinition) {
  const providers = replaceProvider('extractor', provider)
  const output = await extractAiDailyFacts({ evidence: definition.evidence, providers })
  const callCount = output.attempts.reduce((sum, attempt) => sum + attempt.calls, 0)
  if (!output.ok) return { callCount, result: failedCase() }
  const evidenceById = new Map(definition.evidence.map((item) => [item.evidenceId, item]))
  const citedEvidenceIds = new Set<string>()
  let citationBindings = 0
  let validCitationBindings = 0
  let criticalFactualErrors = 0
  for (const claim of output.claims) {
    for (const evidenceId of claim.evidenceIds) {
      citationBindings += 1
      const evidence = evidenceById.get(evidenceId)
      if (evidence && claimBindingSupported(claim.text, `${evidence.title}\n${evidence.quote}`) && claim.directSupport) {
        validCitationBindings += 1
        citedEvidenceIds.add(evidenceId)
      } else {
        criticalFactualErrors += 1
      }
    }
  }
  const chineseEditorialScore = scoreChineseText(output.claims.map((claim) => claim.text).join('\n'))
  const coverage = citedEvidenceIds.size / Math.max(1, definition.evidence.length)
  return {
    callCount,
    result: qualityCase({
      criticalFactualErrors,
      citedVerifiableClaims: citedEvidenceIds.size,
      verifiableClaims: definition.evidence.length,
      validCitationBindings,
      citationBindings,
      chineseEditorialScore,
      coverage,
    }),
  }
}

async function evaluateComposerCase(provider: AiDailyStructuredGenerationProvider, definition: AiDailyQualityFixtureDefinition) {
  const fixtureProviders = buildAiDailyGenerationProvidersFixture()
  const extracted = await extractAiDailyFacts({ evidence: definition.evidence, providers: fixtureProviders })
  if (!extracted.ok) throw new Error('ai-daily-business-evaluation-fixture-extractor-failed')
  const output = await composeAiDailyFacts({ claims: extracted.claims, providers: replaceProvider('composer', provider) })
  const callCount = output.attempts.reduce((sum, attempt) => sum + attempt.calls, 0)
  if (!output.ok) return { callCount, result: failedCase() }
  const knownClaims = new Set(extracted.claims.map((claim) => claim.claimId))
  const blocks = collectAiDailyCompositionReviewTargets(output.composition)
  const usedClaims = new Set(blocks.flatMap((block) => block.claimIds))
  const citationBindings = blocks.reduce((sum, block) => sum + block.claimIds.length, 0)
  const validCitationBindings = blocks.reduce(
    (sum, block) => sum + block.claimIds.filter((claimId) => knownClaims.has(claimId)).length,
    0,
  )
  const compositionText = blocks.map((block) => block.text).join('\n')
  let criticalFactualErrors = invalidNumberBindings(blocks, extracted.claims)
  if (/https?:\/\//iu.test(compositionText)) criticalFactualErrors += 1
  const chineseEditorialScore = scoreChineseText(compositionText)
  const coverage = usedClaims.size / Math.max(1, extracted.claims.length)
  return {
    callCount,
    result: qualityCase({
      criticalFactualErrors,
      citedVerifiableClaims: usedClaims.size,
      verifiableClaims: extracted.claims.length,
      validCitationBindings,
      citationBindings,
      chineseEditorialScore,
      coverage,
    }),
  }
}

async function evaluateVerifierCase(
  provider: AiDailyStructuredGenerationProvider,
  definition: AiDailyQualityFixtureDefinition,
  index: number,
) {
  const fixtureProviders = buildAiDailyGenerationProvidersFixture()
  const extracted = await extractAiDailyFacts({ evidence: definition.evidence, providers: fixtureProviders })
  if (!extracted.ok) throw new Error('ai-daily-business-evaluation-fixture-extractor-failed')
  const composed = await composeAiDailyFacts({ claims: extracted.claims, providers: fixtureProviders })
  if (!composed.ok) throw new Error('ai-daily-business-evaluation-fixture-composer-failed')
  const scenario = createVerifierScenario(extracted.claims, composed.composition, index)
  const output = await verifyAiDailyComposition({
    evidence: definition.evidence,
    claims: scenario.claims,
    composition: scenario.composition,
    providers: replaceProvider('verifier', provider),
  })
  const callCount = output.attempts.reduce((sum, attempt) => sum + attempt.calls, 0)
  if (!output.ok) return { callCount, result: failedCase() }
  const expectedClaimIds = new Set(scenario.expectedNonEntailedClaimIds)
  const expectedBlockIds = new Set(scenario.expectedNonEntailedBlockIds)
  let correct = 0
  let total = 0
  let validCitationBindings = 0
  let citationBindings = 0
  let criticalFactualErrors = 0
  for (const review of output.reviews) {
    total += 1
    const expectedNonEntailed = expectedClaimIds.has(review.claimId)
    const verdictCorrect = expectedNonEntailed ? review.verdict !== 'entailed' : review.verdict === 'entailed'
    if (verdictCorrect) correct += 1
    else criticalFactualErrors += 1
    citationBindings += Math.max(1, review.supportingEvidenceIds.length)
    if (verdictCorrect && (expectedNonEntailed || review.supportingEvidenceIds.length > 0)) {
      validCitationBindings += Math.max(1, review.supportingEvidenceIds.length)
    }
  }
  for (const review of output.blockReviews) {
    total += 1
    const expectedNonEntailed = expectedBlockIds.has(review.blockId)
    const verdictCorrect = expectedNonEntailed ? review.verdict !== 'entailed' : review.verdict === 'entailed'
    if (verdictCorrect) correct += 1
    else criticalFactualErrors += 1
    citationBindings += Math.max(1, review.supportingClaimIds.length)
    if (verdictCorrect && (expectedNonEntailed || review.supportingClaimIds.length > 0)) {
      validCitationBindings += Math.max(1, review.supportingClaimIds.length)
    }
  }
  const coverage = correct / Math.max(1, total)
  const chineseEditorialScore = coverage >= 0.99 ? 5 : coverage >= 0.95 ? 4.5 : coverage >= 0.85 ? 4 : 3
  return {
    callCount,
    result: qualityCase({
      criticalFactualErrors,
      citedVerifiableClaims: correct,
      verifiableClaims: total,
      validCitationBindings,
      citationBindings,
      chineseEditorialScore,
      coverage,
    }),
  }
}

function replaceProvider(role: AiDailyGenerationRole, provider: AiDailyStructuredGenerationProvider): AiDailyGenerationProviders {
  const providers = buildAiDailyGenerationProvidersFixture()
  if (role === 'extractor') return { ...providers, extractor: { ...providers.extractor, primary: provider, fallbacks: [] } }
  if (role === 'composer') return { ...providers, composer: { ...providers.composer, primary: provider, fallbacks: [] } }
  return { ...providers, verifier: { ...providers.verifier, primary: provider, fallbacks: [] } }
}

function createVerifierScenario(claims: AiDailyAtomicClaim[], composition: AiDailyComposition, index: number) {
  const nextClaims = claims.map((claim) => ({ ...claim, evidenceIds: [...claim.evidenceIds], conflictingEvidenceIds: [...claim.conflictingEvidenceIds] }))
  const nextComposition = cloneComposition(composition)
  const expectedNonEntailedClaimIds: string[] = []
  const expectedNonEntailedBlockIds: string[] = []
  if (index % 3 === 1 && nextClaims[0]) {
    nextClaims[0].text = `${nextClaims[0].text} 未经证据支持的性能提升为 999%。`
    expectedNonEntailedClaimIds.push(nextClaims[0].claimId)
  }
  if (index % 3 === 2 && nextComposition.events[0]) {
    nextComposition.events[0].factSummary.text = `${nextComposition.events[0].factSummary.text} 该系统已经完全取代所有人工审核。`
    expectedNonEntailedBlockIds.push(`event:${nextComposition.events[0].eventId}:fact-summary`)
  }
  return { claims: nextClaims, composition: nextComposition, expectedNonEntailedClaimIds, expectedNonEntailedBlockIds }
}

function cloneComposition(value: AiDailyComposition): AiDailyComposition {
  return {
    title: value.title,
    subtitle: value.subtitle,
    introduction: { text: value.introduction.text, claimIds: [...value.introduction.claimIds] },
    events: value.events.map((event) => ({
      ...event,
      claimIds: [...event.claimIds],
      factSummary: { text: event.factSummary.text, claimIds: [...event.factSummary.claimIds] },
      whyItMatters: { text: event.whyItMatters.text, claimIds: [...event.whyItMatters.claimIds] },
    })),
    trends: value.trends.map((trend) => ({ text: trend.text, claimIds: [...trend.claimIds] })),
  }
}

function invalidNumberBindings(blocks: Array<{ text: string; claimIds: string[] }>, claims: AiDailyAtomicClaim[]) {
  const claimsById = new Map(claims.map((claim) => [claim.claimId, claim]))
  let errors = 0
  for (const block of blocks) {
    const supportedNumbers = new Set(block.claimIds.flatMap((claimId) => numberTokens(claimsById.get(claimId)?.text ?? '')))
    for (const token of numberTokens(block.text)) {
      if (!supportedNumbers.has(token)) errors += 1
    }
  }
  return errors
}

function claimBindingSupported(claimText: string, evidenceText: string) {
  const evidenceNumbers = new Set(numberTokens(evidenceText))
  if (numberTokens(claimText).some((token) => !evidenceNumbers.has(token))) return false
  const tokens = evidenceText.toLowerCase().match(/[\p{Script=Han}]{2,}|[a-z][a-z0-9._-]{2,}/giu) ?? []
  return tokens.some((token) => claimText.toLowerCase().includes(token.toLowerCase()))
}

function numberTokens(value: string) {
  return value.match(/\d+(?:\.\d+)?%?/gu) ?? []
}

function scoreChineseText(value: string) {
  const text = value.trim()
  if (!text) return 0
  let score = 5
  const hanCount = (text.match(/[\p{Script=Han}]/gu) ?? []).length
  const letterCount = (text.match(/[A-Za-z]/gu) ?? []).length
  if (hanCount < 20) score -= 1.5
  if (letterCount > hanCount * 0.8) score -= 0.5
  if (/(史上最|绝对|彻底|颠覆一切|best ever|revolutionary)/iu.test(text)) score -= 1
  if (/https?:\/\//iu.test(text)) score -= 2
  return Math.max(0, Math.min(5, Math.round(score * 10) / 10))
}

function qualityCase(input: {
  criticalFactualErrors: number
  citedVerifiableClaims: number
  verifiableClaims: number
  validCitationBindings: number
  citationBindings: number
  chineseEditorialScore: number
  coverage: number
}): Omit<AiDailyQualityCaseResult, 'id'> {
  const precision = input.citationBindings === 0 ? 0 : input.validCitationBindings / input.citationBindings
  const editorOutcome = input.criticalFactualErrors > 0 || precision < 1
    ? 'rejected'
    : input.coverage >= 0.98 && input.chineseEditorialScore >= 4.5
      ? 'accepted'
      : input.coverage >= 0.9 && input.chineseEditorialScore >= 4
        ? 'minor-edit'
        : 'major-edit'
  return {
    criticalFactualErrors: input.criticalFactualErrors,
    citedVerifiableClaims: input.citedVerifiableClaims,
    verifiableClaims: input.verifiableClaims,
    validCitationBindings: input.validCitationBindings,
    citationBindings: input.citationBindings,
    chineseEditorialScore: input.chineseEditorialScore,
    editorOutcome,
  }
}

function failedCase(): Omit<AiDailyQualityCaseResult, 'id'> {
  return {
    criticalFactualErrors: 1,
    citedVerifiableClaims: 0,
    verifiableClaims: 1,
    validCitationBindings: 0,
    citationBindings: 1,
    editorOutcome: 'rejected',
    chineseEditorialScore: 0,
  }
}

function percentile(sorted: number[], ratio: number) {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0
}
