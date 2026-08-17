import {
  classifyAiDailyRiskClaims,
  evaluateAiDailyQualityReport,
  isAiDailyContentQualityRepairableFindingCode,
  runAiDailyGeneration,
  validateAiDailyComposition,
} from '../src/aiDailyGeneration.js'
import {
  buildAiDailyGenerationProvidersFixture,
  buildAiDailyQualityFixtureDefinitions,
} from '../src/aiDailyGenerationFixtures.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const definitions = buildAiDailyQualityFixtureDefinitions()
for (const code of [
  'composition-verifier-insufficient',
  'composition-verifier-contradicted',
  'official-evidence-required',
  'verifier-insufficient',
  'verifier-contradicted',
  'trend-independent-sources-required',
]) {
  assert(isAiDailyContentQualityRepairableFindingCode(code), `repairable quality finding: ${code}`)
}
assert(
  !isAiDailyContentQualityRepairableFindingCode('composition-review-missing'),
  'structural validation findings must not trigger content repair',
)
assertEqual(definitions.length, 30, 'evidence-labeled quality case count')
const cases = []
for (const definition of definitions) {
  const result = await runAiDailyGeneration({
    evidence: definition.evidence,
    providers: buildAiDailyGenerationProvidersFixture(),
  })
  assertEqual(result.status, 'VALID', `${definition.id} should pass deterministic generation gates`)
  assert(result.composition, `${definition.id} should produce a composition`)
  const evidenceById = new Map(definition.evidence.map((item) => [item.evidenceId, item]))
  const requiredReviewClaimIds = new Set(classifyAiDailyRiskClaims(result.claims, evidenceById, result.composition))
  const validation = validateAiDailyComposition({
    evidence: definition.evidence,
    claims: result.claims,
    composition: result.composition,
    reviews: result.reviews,
    blockReviews: result.blockReviews,
    requiredReviewClaimIds,
  })
  cases.push({
    id: definition.id,
    category: definition.category,
    negativeTags: [...definition.negativeTags],
    criticalFactualErrors: validation.findings.filter((finding) => finding.severity === 'critical').length,
    ...validation.metrics,
    editorOutcome: definition.editorOutcome,
    chineseEditorialScore: definition.chineseEditorialScore,
  })
}
const report = evaluateAiDailyQualityReport(cases)
assert(report.passed, `quality floor gaps: ${report.gaps.join(',')}`)
assertEqual(report.criticalFactualErrors, 0, 'critical factual errors')
assertEqual(report.citationPrecision, 1, 'citation precision')
assert(report.citationCoverage >= 0.98, 'citation coverage')
assert(report.minorEditAcceptance >= 0.85, 'minor-edit acceptance')
assert(report.averageChineseEditorialScore >= 4, 'Chinese editorial score')
assert(report.categorySlices.every((slice) => slice.caseCount >= 4), 'category slice coverage')
assert(report.negativeSlices.every((slice) => slice.caseCount >= 3), 'negative slice coverage')
assert(report.negativeSlices.every((slice) => slice.minorEditAcceptance >= 0.8), 'negative slice acceptance')
assert(report.negativeSlices.every((slice) => slice.citationPrecision === 1), 'negative slice citation precision')

const trendDefinition = definitions[0]
assert(trendDefinition, 'trend corroboration fixture required')
const trendResult = await runAiDailyGeneration({
  evidence: trendDefinition.evidence,
  providers: buildAiDailyGenerationProvidersFixture(),
})
assert(trendResult.composition, 'trend corroboration composition required')
const trendClaimId = trendResult.composition.trends[0]?.claimIds[0]
assert(trendClaimId, 'trend corroboration claim required')
const singleSourceTrendComposition = {
  ...trendResult.composition,
  trends: [{ text: '单一来源不足以支撑跨事件趋势判断。', claimIds: [trendClaimId] }],
}
const trendEvidenceById = new Map(trendDefinition.evidence.map((item) => [item.evidenceId, item]))
const singleSourceTrendValidation = validateAiDailyComposition({
  evidence: trendDefinition.evidence,
  claims: trendResult.claims,
  composition: singleSourceTrendComposition,
  reviews: trendResult.reviews,
  blockReviews: trendResult.blockReviews.map((review) => review.blockId === 'composition:trend:1'
    ? { ...review, supportingClaimIds: [trendClaimId] }
    : review),
  requiredReviewClaimIds: new Set(classifyAiDailyRiskClaims(
    trendResult.claims,
    trendEvidenceById,
    singleSourceTrendComposition,
  )),
})
assert(
  singleSourceTrendValidation.findings.some((finding) => finding.code === 'trend-independent-sources-required'),
  'trend blocks require evidence from at least two independent domains',
)

const releaseClaim = trendResult.claims.find((claim) => claim.claimType === 'release')
assert(releaseClaim, 'official evidence fixture requires a release claim')
const claimedOfficialEvidence = trendDefinition.evidence.map((item) => releaseClaim.evidenceIds.includes(item.evidenceId)
  ? { ...item, sourceKind: 'primary_media' as const }
  : item)
const claimedOfficialEvidenceById = new Map(claimedOfficialEvidence.map((item) => [item.evidenceId, item]))
const officialRoleValidation = validateAiDailyComposition({
  evidence: claimedOfficialEvidence,
  claims: trendResult.claims,
  composition: trendResult.composition,
  reviews: trendResult.reviews,
  blockReviews: trendResult.blockReviews,
  requiredReviewClaimIds: new Set(classifyAiDailyRiskClaims(
    trendResult.claims,
    claimedOfficialEvidenceById,
    trendResult.composition,
  )),
})
assert(
  officialRoleValidation.findings.some((finding) => (
    finding.code === 'official-evidence-required' && finding.claimId === releaseClaim.claimId
  )),
  'a tier label cannot replace the official source role for high-risk claims',
)

const repairedQualityResult = await runAiDailyGeneration({
  evidence: trendDefinition.evidence,
  providers: buildAiDailyGenerationProvidersFixture({
    verifier: {
      verifierVerdict: 'contradicted',
      verifierCompositionVerdict: 'insufficient',
      verifierVerdictAfterQualityRepair: 'entailed',
      verifierCompositionVerdictAfterQualityRepair: 'entailed',
    },
  }),
})
assertEqual(repairedQualityResult.status, 'VALID', 'one bounded verifier-driven quality repair should recover')
assertEqual(
  repairedQualityResult.attempts.filter((attempt) => attempt.role === 'composer').length,
  2,
  'quality repair composer attempt count',
)
assertEqual(
  repairedQualityResult.attempts.filter((attempt) => attempt.role === 'verifier').length,
  2,
  'quality repair verifier attempt count',
)

const nonOfficialEvidence = trendDefinition.evidence.map((item) => ({
  ...item,
  sourceKind: 'primary_media' as const,
}))
const nonOfficialResult = await runAiDailyGeneration({
  evidence: nonOfficialEvidence,
  providers: buildAiDailyGenerationProvidersFixture(),
})
assertEqual(nonOfficialResult.status, 'REJECTED', 'quality repair must not waive official evidence')
assert(
  nonOfficialResult.findings.some((finding) => finding.code === 'official-evidence-required'),
  'official evidence finding must survive an unsuccessful bounded repair',
)
assertEqual(
  nonOfficialResult.attempts.filter((attempt) => attempt.role === 'composer').length,
  2,
  'failed official-evidence repair must stop after one composer repair',
)

console.log(`AI Daily quality check passed with ${report.caseCount} evidence-labeled cases and ${report.negativeSlices.length} negative slices`)
