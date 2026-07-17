import {
  deduplicateAiDailyCandidates,
  groupAiDailyCandidates,
  lexicalSimilarity,
} from '../src/aiDailyIngestion.js'
import { buildAiDailyEvidenceCandidateFixture } from '../src/aiDailyIngestionFixtures.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const representative = buildAiDailyEvidenceCandidateFixture({
  index: 1,
  tier: 'TIER_1',
  topic: 'models',
  title: 'OpenAI releases reasoning model API',
})
const canonicalDuplicate = {
  ...buildAiDailyEvidenceCandidateFixture({ index: 2, title: 'Mirrored reasoning model announcement', topic: 'models' }),
  canonicalUrl: representative.canonicalUrl,
  canonicalKey: representative.canonicalKey,
}
const contentDuplicate = buildAiDailyEvidenceCandidateFixture({
  index: 3,
  title: 'Syndicated model release coverage',
  topic: 'models',
  contentHash: representative.contentHash,
})
const titleDuplicate = {
  ...buildAiDailyEvidenceCandidateFixture({ index: 4, title: representative.title, topic: 'models' }),
  contentHash: 'different-content-hash',
}
const lexicalDuplicate = buildAiDailyEvidenceCandidateFixture({
  index: 5,
  title: 'OpenAI releases reasoning model API today',
  topic: 'models',
  contentHash: 'another-content-hash',
})
const separate = buildAiDailyEvidenceCandidateFixture({
  index: 6,
  title: 'Vector database adds hybrid retrieval filters',
  topic: 'retrieval',
})

const deduped = deduplicateAiDailyCandidates([
  separate,
  lexicalDuplicate,
  titleDuplicate,
  contentDuplicate,
  canonicalDuplicate,
  representative,
])
const byId = new Map(deduped.map((entry) => [entry.candidate.id, entry]))
assertEqual(byId.get(canonicalDuplicate.id)?.duplicateReason, 'canonical-url', 'canonical URL dedupe first')
assertEqual(byId.get(contentDuplicate.id)?.duplicateReason, 'content-hash', 'content hash dedupe second')
assertEqual(byId.get(titleDuplicate.id)?.duplicateReason, 'title-fingerprint', 'title fingerprint dedupe third')
assertEqual(byId.get(lexicalDuplicate.id)?.duplicateReason, 'lexical-similarity', 'lexical dedupe fourth')
assert(lexicalSimilarity(representative.title, lexicalDuplicate.title) >= 0.82, 'lexical fixture threshold')

const clusters = groupAiDailyCandidates(deduped)
assertEqual(clusters.length, 2, 'dedupe precedes event grouping')
const modelCluster = clusters.find((cluster) => cluster.topic === 'models')
assertEqual(modelCluster?.members.length, 5, 'cluster retains duplicate member audit trail')
assert((modelCluster?.corroboratingDomains.length ?? 0) >= 2, 'cluster retains corroborating domains')

console.log('AI Daily dedupe check passed')
