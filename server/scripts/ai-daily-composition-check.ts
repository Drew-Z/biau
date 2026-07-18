import {
  type AiDailyStructuredGenerationProvider,
  runAiDailyGeneration,
} from '../src/aiDailyGeneration.js'
import {
  buildAiDailyGenerationEvidenceFixture,
  buildAiDailyGenerationProvidersFixture,
} from '../src/aiDailyGenerationFixtures.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const evidence = buildAiDailyGenerationEvidenceFixture(10, 'composition')
const valid = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture(),
  extractionBatchMaxItems: 4,
})
assertEqual(valid.status, 'VALID', 'evidence-bound fixture composition')
assert(valid.callCount >= 4 && valid.callCount <= 7, `normal call budget should stay within 4-7, received ${valid.callCount}`)
assert(valid.composition?.events.every((event) => event.claimIds.length > 0), 'every event binds stored claims')

const contradicted = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({ verifier: { verifierVerdict: 'contradicted' } }),
  extractionBatchMaxItems: 4,
})
assertEqual(contradicted.status, 'REJECTED', 'contradicted high-risk claims cannot create a valid revision')
assert(contradicted.findings.some((finding) => finding.code === 'verifier-contradicted'), 'contradiction finding')

const editorialReview = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({ composer: { sensationalComposer: true } }),
  extractionBatchMaxItems: 4,
})
assertEqual(editorialReview.status, 'NEEDS_EDITOR_REVIEW', 'non-critical wording finding remains reviewable')
assert(editorialReview.findings.some((finding) => finding.code === 'sensational-wording'), 'wording finding')

const hallucinatedComposition = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({
    composer: { hallucinatedComposer: true },
    verifier: { verifierCompositionVerdict: 'contradicted' },
  }),
  extractionBatchMaxItems: 4,
})
assertEqual(hallucinatedComposition.status, 'REJECTED', 'independent verifier rejects unsupported composition text')
assert(
  hallucinatedComposition.findings.some((finding) => finding.code === 'composition-verifier-contradicted'),
  'composition contradiction finding',
)

const duplicateVerifierReview = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({ verifier: { duplicateVerifierReview: true } }),
  extractionBatchMaxItems: 4,
})
assertEqual(duplicateVerifierReview.status, 'REJECTED', 'duplicate verifier reviews fail closed')
assert(
  duplicateVerifierReview.attempts.some((attempt) => attempt.role === 'verifier' && attempt.outcome === 'schema-rejected'),
  'duplicate verifier review schema rejection',
)

const duplicateVerifierBlockReview = await runAiDailyGeneration({
  evidence,
  providers: buildAiDailyGenerationProvidersFixture({ verifier: { duplicateVerifierBlockReview: true } }),
  extractionBatchMaxItems: 4,
})
assertEqual(duplicateVerifierBlockReview.status, 'REJECTED', 'duplicate composition block reviews fail closed')
assert(
  duplicateVerifierBlockReview.attempts.some((attempt) => attempt.role === 'verifier' && attempt.outcome === 'schema-rejected'),
  'duplicate composition block review schema rejection',
)

const unknownEvidenceExtractor: AiDailyStructuredGenerationProvider = {
  id: 'unknown-evidence-extractor',
  role: 'extractor',
  slot: 'primary',
  qualityScore: 100,
  async generate() {
    return {
      claims: [{
        claimId: 'claim-unknown',
        text: 'This claim cites evidence outside the pack.',
        claimType: 'release',
        evidenceIds: ['missing-evidence'],
        directSupport: true,
        conflictingEvidenceIds: [],
        uncertainty: 'low',
      }],
    }
  },
}
const unknownEvidence = await runAiDailyGeneration({
  evidence,
  providers: {
    ...buildAiDailyGenerationProvidersFixture(),
    extractor: { primary: unknownEvidenceExtractor, minimumQualityScore: 80 },
  },
})
assertEqual(unknownEvidence.status, 'REJECTED', 'unknown evidence IDs fail closed after one repair attempt')

console.log('AI Daily composition check passed')
