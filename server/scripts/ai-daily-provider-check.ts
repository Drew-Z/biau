import { runAiDailyGeneration } from '../src/aiDailyGeneration.js'
import {
  buildAiDailyGenerationEvidenceFixture,
  buildAiDailyGenerationProvidersFixture,
} from '../src/aiDailyGenerationFixtures.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const evidence = buildAiDailyGenerationEvidenceFixture(8, 'provider')
const repaired = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({ extractor: { invalidBeforeRepair: true } }),
  extractionBatchMaxItems: 8,
})
assertEqual(repaired.status, 'VALID', 'one schema repair may recover the primary provider')
assertEqual(repaired.attempts.find((attempt) => attempt.role === 'extractor')?.calls, 2, 'bounded extractor repair count')

const fallback = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({
    composer: { throwAlways: true },
    composerFallbacks: [{ qualityScore: 90 }],
  }),
  extractionBatchMaxItems: 8,
})
assertEqual(fallback.status, 'VALID', 'qualified composer fallback')
assertEqual(
  fallback.attempts.filter((attempt) => attempt.role === 'composer').map((attempt) => attempt.outcome).join(','),
  'failed,succeeded',
  'ordered composer fallback attempts',
)

const belowFloor = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({
    composer: { throwAlways: true },
    composerFallbacks: [{ qualityScore: 60 }],
  }),
  extractionBatchMaxItems: 8,
})
assertEqual(belowFloor.status, 'REJECTED', 'below-floor fallback cannot report success')
const qualityRejected = belowFloor.attempts.find((attempt) => attempt.outcome === 'quality-rejected')
assert(qualityRejected?.calls === 0, 'below-floor fallback is rejected without a provider call')

const repairFailure = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({
    extractor: { invalidBeforeRepair: true, throwOnRepair: true },
    extractorFallbacks: [{ qualityScore: 90 }],
  }),
  extractionBatchMaxItems: 8,
})
assertEqual(repairFailure.status, 'VALID', 'qualified fallback may recover after a failed repair call')
assertEqual(
  repairFailure.attempts.filter((attempt) => attempt.role === 'extractor').map((attempt) => attempt.calls).join(','),
  '2,1',
  'repair failure must count both primary calls before fallback',
)

console.log('AI Daily provider check passed')
