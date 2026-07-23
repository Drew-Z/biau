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
  type AiDailyGenerationEvidence,
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
import { aiDailyModelEvaluationCaseSetId } from './aiDailyModelEvaluationCaseSet.js'
import { createAiDailyResponsesProvider } from './aiDailyModelProvider.js'
import type { AiDailyModelRuntimeChannel, AiDailyModelRuntimeCandidate } from './aiDailyModelRuntime.js'
import {
  aiDailyVerifierBlockNegativeTags,
  aiDailyVerifierClaimNegativeTags,
  type AiDailyQualityNegativeTag,
} from './aiDailyQualityContract.js'

export const aiDailyBusinessEvaluatorVersion = 'ai-daily-business-evaluator-v3'
const caseVersion = 'business-v2'

export async function evaluateAiDailyBusinessCandidate(input: {
  candidate: AiDailyModelRuntimeCandidate
  channel: AiDailyModelRuntimeChannel
  evaluationRunId: string
  evaluatedAt: string
  onProgress?: (progress: { candidateId: string; role: AiDailyGenerationRole; completed: number; total: number }) => void
}): Promise<AiDailyModelEvaluationCandidateInput> {
  const definitions = buildAiDailyQualityFixtureDefinitions()
  const descriptors = createCaseDescriptors(input.candidate.role, definitions)
  const provider = createAiDailyResponsesProvider({
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
    const measured = await evaluateRoleCase(input.candidate.role, provider, definition)
    if (stableTagList(measured.exercisedNegativeTags) !== stableTagList(definition.negativeTags)) {
      throw new Error(`ai-daily-business-evaluation-negative-tags-not-exercised:${definition.id}`)
    }
    latencies.push(Date.now() - startedAt)
    modelCallCount += measured.callCount
    cases.push({
      ...measured.result,
      id: descriptors[index].id,
      category: definition.category,
      negativeTags: [...definition.negativeTags],
    })
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
    caseSetId: aiDailyModelEvaluationCaseSetId(input.candidate.role),
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
    negativeTags: [...definition.negativeTags],
    version: definition.version || caseVersion,
  }))
}

async function evaluateRoleCase(
  role: AiDailyGenerationRole,
  provider: AiDailyStructuredGenerationProvider,
  definition: AiDailyQualityFixtureDefinition,
) {
  if (role === 'extractor') return evaluateExtractorCase(provider, definition)
  if (role === 'composer') return evaluateComposerCase(provider, definition)
  return evaluateVerifierCase(provider, definition)
}

async function evaluateExtractorCase(provider: AiDailyStructuredGenerationProvider, definition: AiDailyQualityFixtureDefinition) {
  const scenario = createAiDailyExtractorEvaluationScenario(definition)
  const providers = replaceProvider('extractor', provider)
  const output = await extractAiDailyFacts({ evidence: scenario.evidence, providers })
  const callCount = output.attempts.reduce((sum, attempt) => sum + attempt.calls, 0)
  if (!output.ok) return { callCount, result: failedCase(), exercisedNegativeTags: scenario.exercisedNegativeTags }
  const evidenceById = new Map(scenario.evidence.map((item) => [item.evidenceId, item]))
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
  const coverage = citedEvidenceIds.size / Math.max(1, scenario.evidence.length)
  return {
    callCount,
    exercisedNegativeTags: scenario.exercisedNegativeTags,
    result: qualityCase({
      criticalFactualErrors,
      citedVerifiableClaims: citedEvidenceIds.size,
      verifiableClaims: scenario.evidence.length,
      validCitationBindings,
      citationBindings,
      chineseEditorialScore,
      coverage,
    }),
  }
}

async function evaluateComposerCase(provider: AiDailyStructuredGenerationProvider, definition: AiDailyQualityFixtureDefinition) {
  const fixtureProviders = buildAiDailyGenerationProvidersFixture()
  const evidenceScenario = createAiDailyExtractorEvaluationScenario(definition)
  const extracted = await extractAiDailyFacts({ evidence: evidenceScenario.evidence, providers: fixtureProviders })
  if (!extracted.ok) throw new Error('ai-daily-business-evaluation-fixture-extractor-failed')
  const scenario = createAiDailyComposerEvaluationScenario(extracted.claims, definition)
  const output = await composeAiDailyFacts({ claims: scenario.claims, providers: replaceProvider('composer', provider) })
  const callCount = output.attempts.reduce((sum, attempt) => sum + attempt.calls, 0)
  if (!output.ok) return { callCount, result: failedCase(), exercisedNegativeTags: scenario.exercisedNegativeTags }
  const knownClaims = new Set(scenario.claims.map((claim) => claim.claimId))
  const blocks = collectAiDailyCompositionReviewTargets(output.composition)
  const usedClaims = new Set(blocks.flatMap((block) => block.claimIds))
  const citationBindings = blocks.reduce((sum, block) => sum + block.claimIds.length, 0)
  const validCitationBindings = blocks.reduce(
    (sum, block) => sum + block.claimIds.filter((claimId) => knownClaims.has(claimId)).length,
    0,
  )
  const compositionText = blocks.map((block) => block.text).join('\n')
  let criticalFactualErrors = invalidNumberBindings(blocks, scenario.claims)
  if (/https?:\/\//iu.test(compositionText)) criticalFactualErrors += 1
  const chineseEditorialScore = scoreChineseText(compositionText)
  const coverage = usedClaims.size / Math.max(1, scenario.claims.length)
  return {
    callCount,
    exercisedNegativeTags: scenario.exercisedNegativeTags,
    result: qualityCase({
      criticalFactualErrors,
      citedVerifiableClaims: usedClaims.size,
      verifiableClaims: scenario.claims.length,
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
) {
  const fixtureProviders = buildAiDailyGenerationProvidersFixture()
  const evidenceScenario = createAiDailyExtractorEvaluationScenario(definition)
  const extracted = await extractAiDailyFacts({ evidence: evidenceScenario.evidence, providers: fixtureProviders })
  if (!extracted.ok) throw new Error('ai-daily-business-evaluation-fixture-extractor-failed')
  const composed = await composeAiDailyFacts({ claims: extracted.claims, providers: fixtureProviders })
  if (!composed.ok) throw new Error('ai-daily-business-evaluation-fixture-composer-failed')
  const scenario = createAiDailyVerifierEvaluationScenario(extracted.claims, composed.composition, definition)
  const output = await verifyAiDailyComposition({
    evidence: evidenceScenario.evidence,
    claims: scenario.claims,
    composition: scenario.composition,
    providers: replaceProvider('verifier', provider),
  })
  const callCount = output.attempts.reduce((sum, attempt) => sum + attempt.calls, 0)
  if (!output.ok) return { callCount, result: failedCase(), exercisedNegativeTags: scenario.exercisedNegativeTags }
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
    exercisedNegativeTags: scenario.exercisedNegativeTags,
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

export function createAiDailyExtractorEvaluationScenario(definition: AiDailyQualityFixtureDefinition) {
  const evidence = definition.evidence.map((item) => ({ ...item, locator: { ...item.locator } }))
  const exercisedNegativeTags: AiDailyQualityNegativeTag[] = []
  for (const [index, tag] of definition.negativeTags.entries()) {
    const targetIndex = index % evidence.length
    const target = evidence[targetIndex]
    if (!target) continue
    evidence[targetIndex] = applyExtractorChallenge(target, tag, index)
    exercisedNegativeTags.push(tag)
  }
  return { evidence, exercisedNegativeTags }
}

export function createAiDailyComposerEvaluationScenario(
  claims: AiDailyAtomicClaim[],
  definition: AiDailyQualityFixtureDefinition,
) {
  const nextClaims = cloneClaims(claims)
  const exercisedNegativeTags: AiDailyQualityNegativeTag[] = []
  for (const [index, tag] of definition.negativeTags.entries()) {
    const target = nextClaims[index % nextClaims.length]
    if (!target) continue
    applyComposerChallenge(target, tag, index)
    exercisedNegativeTags.push(tag)
  }
  return { claims: nextClaims, exercisedNegativeTags }
}

function applyExtractorChallenge(
  evidence: AiDailyGenerationEvidence,
  tag: AiDailyQualityNegativeTag,
  index: number,
): AiDailyGenerationEvidence {
  const challenge = extractorChallengeText(tag, index)
  if (tag === 'low-evidence-restraint') {
    return {
      ...evidence,
      sourceTier: 'TIER_3',
      sourceKind: 'secondary_media',
      quote: `${challenge}${evidence.quote}`,
    }
  }
  return { ...evidence, quote: `${challenge}${evidence.quote}` }
}

function extractorChallengeText(tag: AiDailyQualityNegativeTag, index: number) {
  if (tag === 'citation-source-match') return '来源归属边界：本条只归属于当前发布者，不能改写为其他来源声明。'
  if (tag === 'correction-boundary') return '更正边界：此前关于全面上线的表述已撤回，当前仅限受控测试。'
  if (tag === 'date-entity-alignment') return `日期实体边界：本条只适用于项目 ${index + 1} 在 2026 年 7 月 18 日的状态。`
  if (tag === 'duplicate-attribution') return '归因边界：这是一条单一来源观察，不代表多个独立来源一致。'
  if (tag === 'low-evidence-restraint') return '证据等级边界：该线索未经官方确认，只能作为有限背景观察。'
  if (tag === 'numeric-integrity') return `数字边界：公开记录为 ${81 + index} 分，不支持额外增幅或替代数值。`
  if (tag === 'scope-inflation') return `范围边界：观察仅覆盖 ${index + 1} 个受控样本，不能外推到所有用户。`
  return '事实边界：证据未涉及定价、全面可用性或自主替代人工。'
}

function applyComposerChallenge(claim: AiDailyAtomicClaim, tag: AiDailyQualityNegativeTag, index: number) {
  if (tag === 'citation-source-match') claim.text = `来源归属必须保持不变。${claim.text}`
  else if (tag === 'correction-boundary') claim.text = `更正后的受控范围优先于旧说法。${claim.text}`
  else if (tag === 'date-entity-alignment') claim.text = `${claim.text} 该记录仅对应项目 ${index + 1} 与 2026 年 7 月 18 日。`
  else if (tag === 'duplicate-attribution') claim.text = `这是单一来源观察，不代表多源一致。${claim.text}`
  else if (tag === 'numeric-integrity') claim.text = `${claim.text} 经核验的限定值为 ${81 + index} 分。`
  else if (tag === 'low-evidence-restraint') {
    claim.text = `有限证据，仅可保留不确定性。${claim.text}`
    claim.directSupport = false
    claim.uncertainty = 'high'
  } else if (tag === 'scope-inflation') {
    claim.text = `结论仅限受控样本，不可外推所有用户。${claim.text}`
    claim.uncertainty = 'high'
  } else {
    claim.text = `证据未支持定价、全面可用性或替代人工。${claim.text}`
    claim.directSupport = false
    claim.uncertainty = 'high'
  }
}

export function createAiDailyVerifierEvaluationScenario(
  claims: AiDailyAtomicClaim[],
  composition: AiDailyComposition,
  definition: AiDailyQualityFixtureDefinition,
) {
  const nextClaims = claims.map((claim) => ({ ...claim, evidenceIds: [...claim.evidenceIds], conflictingEvidenceIds: [...claim.conflictingEvidenceIds] }))
  const nextComposition = cloneComposition(composition)
  const expectedNonEntailedClaimIds: string[] = []
  const expectedNonEntailedBlockIds: string[] = []
  const exercisedNegativeTags: AiDailyQualityNegativeTag[] = []
  let claimIndex = 0
  let blockIndex = 0
  for (const tag of definition.negativeTags) {
    if (aiDailyVerifierClaimNegativeTags.includes(tag)) {
      const claim = nextClaims[claimIndex]
      if (!claim) continue
      mutateVerifierClaim(nextClaims, claimIndex, tag)
      expectedNonEntailedClaimIds.push(claim.claimId)
      exercisedNegativeTags.push(tag)
      claimIndex += 1
      continue
    }
    if (aiDailyVerifierBlockNegativeTags.includes(tag)) {
      const event = nextComposition.events[blockIndex]
      if (!event) continue
      event.factSummary.text = `${event.factSummary.text}${verifierBlockSuffix(tag)}`
      expectedNonEntailedBlockIds.push(`event:${event.eventId}:fact-summary`)
      exercisedNegativeTags.push(tag)
      blockIndex += 1
    }
  }
  return {
    claims: nextClaims,
    composition: nextComposition,
    expectedNonEntailedClaimIds,
    expectedNonEntailedBlockIds,
    exercisedNegativeTags,
  }
}

function mutateVerifierClaim(claims: AiDailyAtomicClaim[], index: number, tag: AiDailyQualityNegativeTag) {
  const claim = claims[index]
  if (!claim) return
  if (tag === 'citation-source-match') {
    const alternate = claims[(index + 1) % claims.length]
    if (alternate && alternate.claimId !== claim.claimId) claim.evidenceIds = [...alternate.evidenceIds]
    return
  }
  if (tag === 'correction-boundary') {
    claim.text = `${claim.text} 此前更正已经撤回。`
    return
  }
  if (tag === 'date-entity-alignment') {
    claim.text = `${claim.text} 该更新发生于 2035 年 12 月 31 日。`
    return
  }
  if (tag === 'numeric-integrity') {
    claim.text = `${claim.text} 未经证据支持的性能提升为 999%。`
    return
  }
  claim.text = `${claim.text} 该系统已经实现完全自主运行。`
}

function verifierBlockSuffix(tag: AiDailyQualityNegativeTag) {
  if (tag === 'duplicate-attribution') return ' 所有独立来源均完全一致。'
  if (tag === 'low-evidence-restraint') return ' 该能力已经正式全面上线。'
  return ' 该系统已经完全取代所有人工审核。'
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

function cloneClaims(claims: AiDailyAtomicClaim[]) {
  return claims.map((claim) => ({
    ...claim,
    evidenceIds: [...claim.evidenceIds],
    conflictingEvidenceIds: [...claim.conflictingEvidenceIds],
  }))
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
}): Omit<AiDailyQualityCaseResult, 'id' | 'category' | 'negativeTags'> {
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

function failedCase(): Omit<AiDailyQualityCaseResult, 'id' | 'category' | 'negativeTags'> {
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

function stableTagList(tags: readonly AiDailyQualityNegativeTag[]) {
  return [...tags].sort().join('\n')
}
