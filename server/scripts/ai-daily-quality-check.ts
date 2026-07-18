import {
  classifyAiDailyRiskClaims,
  evaluateAiDailyQualityReport,
  runAiDailyGeneration,
  validateAiDailyComposition,
} from '../src/aiDailyGeneration.js'
import {
  buildAiDailyGenerationProvidersFixture,
  buildAiDailyQualityFixtureDefinitions,
} from '../src/aiDailyGenerationFixtures.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const definitions = buildAiDailyQualityFixtureDefinitions()
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

console.log(`AI Daily quality check passed with ${report.caseCount} evidence-labeled cases`)
