import { aiDailyIngestionConfigVersion } from '../src/aiDailyIngestionRunner.js'
import { summarizeAiDailyIngestionReadinessIssues } from '../src/aiDailyStudioProduction.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

assertEqual(
  summarizeAiDailyIngestionReadinessIssues({
    status: 'COMPLETED',
    configVersion: aiDailyIngestionConfigVersion,
  }).length,
  0,
  'current completed ingestion run is production eligible',
)

const missing = summarizeAiDailyIngestionReadinessIssues(null)
assertEqual(missing.length, 1, 'missing ingestion run has one stable issue')
assert(missing.includes('latest-ingestion-run-missing'), 'missing ingestion run is rejected')

const stale = summarizeAiDailyIngestionReadinessIssues({
  status: 'COMPLETED',
  configVersion: 'ai-daily-ingestion-runner-v5',
})
assertEqual(stale.length, 1, 'stale completed ingestion run has one stable issue')
assert(stale.includes('latest-ingestion-config-stale'), 'stale ingestion config is rejected')

for (const status of ['QUEUED', 'RUNNING', 'COMPLETED_WITH_GAPS', 'FAILED']) {
  const issues = summarizeAiDailyIngestionReadinessIssues({ status, configVersion: aiDailyIngestionConfigVersion })
  assert(
    issues.includes('latest-ingestion-run-not-ready'),
    `${status.toLowerCase()} ingestion run cannot authorize production generation`,
  )
}

const staleAndIncomplete = summarizeAiDailyIngestionReadinessIssues({
  status: 'COMPLETED_WITH_GAPS',
  configVersion: 'ai-daily-ingestion-runner-v5',
})
assertEqual(staleAndIncomplete.length, 2, 'stale incomplete ingestion reports both stable issues')

console.log('AI Daily Studio production gate check passed')
