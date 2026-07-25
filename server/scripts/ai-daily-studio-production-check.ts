import {
  aiDailyIngestionConfigVersion,
  summarizeAiDailyIngestionCohort,
} from '../src/aiDailyIngestionRunner.js'
import { summarizeAiDailySelectionAuthorizationIssues } from '../src/aiDailyStudioProduction.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const issueId = 'issue-fixture'
const evidence = [{ sourceTier: 'TIER_1' }, { sourceTier: 'TIER_2' }]
const authority = (overrides: Partial<{
  runId: string
  issueId: string | null
  profile: string
  status: string
  configVersion: string
}> = {}) => ({
  runId: 'selection-run',
  issueId,
  profile: 'DEGRADED',
  status: 'COMPLETED',
  configVersion: aiDailyIngestionConfigVersion,
  ...overrides,
})

assertEqual(
  summarizeAiDailySelectionAuthorizationIssues({
    issueId,
    evidence,
    selectionAuthorities: [authority(), authority()],
  }).length,
  0,
  'one current completed selection run authorizes production evidence',
)

const missing = summarizeAiDailySelectionAuthorizationIssues({ issueId, evidence, selectionAuthorities: [] })
assert(missing.includes('selection-ingestion-authority-missing'), 'missing selection authority is rejected')

const stale = summarizeAiDailySelectionAuthorizationIssues({
  issueId,
  evidence,
  selectionAuthorities: [authority({ configVersion: 'ai-daily-ingestion-runner-v5' }), authority()],
})
assert(stale.includes('selection-ingestion-config-stale'), 'stale selection config is rejected')

const incomplete = summarizeAiDailySelectionAuthorizationIssues({
  issueId,
  evidence,
  selectionAuthorities: [authority({ status: 'COMPLETED_WITH_GAPS' }), authority()],
})
assert(incomplete.includes('selection-ingestion-run-not-ready'), 'incomplete selection run is rejected')

const mixed = summarizeAiDailySelectionAuthorizationIssues({
  issueId,
  evidence,
  selectionAuthorities: [authority(), authority({ runId: 'other-selection-run' })],
})
assert(mixed.includes('selection-ingestion-authority-mixed'), 'mixed selection decision runs are rejected')

const invalid = summarizeAiDailySelectionAuthorizationIssues({
  issueId,
  evidence,
  selectionAuthorities: [authority({ issueId: 'other-issue' }), authority({ profile: 'FIXTURE' })],
})
assert(invalid.includes('selection-ingestion-authority-invalid'), 'cross-issue or non-ingestion authority is rejected')

const cohort = summarizeAiDailyIngestionCohort([
  {
    startedAt: new Date('2026-07-25T18:30:00.000Z'),
    lastTier1CollectedAt: null,
    lastCollectedAt: new Date('2026-07-25T18:31:00.000Z'),
    lastDiscoveredAt: new Date('2026-07-25T18:32:00.000Z'),
    lastFetchedAt: new Date('2026-07-25T18:33:00.000Z'),
  },
  {
    startedAt: new Date('2026-07-25T18:50:00.000Z'),
    lastTier1CollectedAt: new Date('2026-07-25T18:55:00.000Z'),
    lastCollectedAt: new Date('2026-07-25T18:55:00.000Z'),
    lastDiscoveredAt: null,
    lastFetchedAt: new Date('2026-07-25T18:56:00.000Z'),
  },
])
assertEqual(cohort.startedAt?.toISOString(), '2026-07-25T18:30:00.000Z', 'cohort keeps earliest run start')
assertEqual(
  cohort.lastTier1CollectedAt?.toISOString(),
  '2026-07-25T18:55:00.000Z',
  'feed-only run contributes the latest tier 1 checkpoint',
)
assertEqual(
  cohort.lastDiscoveredAt?.toISOString(),
  '2026-07-25T18:32:00.000Z',
  'discovery-only run contributes the latest discovery checkpoint',
)
assertEqual(cohort.lastFetchedAt?.toISOString(), '2026-07-25T18:56:00.000Z', 'cohort keeps latest evidence fetch')

console.log('AI Daily Studio production gate check passed')
