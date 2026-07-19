import {
  aiDailyFailureCategories,
  classifyAiDailyFailureCategory,
  emptyAiDailyOperationsSnapshot,
  renderAiDailyOperationsPrometheus,
  toAiDailyOperationsDiagnostics,
} from '../src/aiDailyOperations.js'
import { assert, assertEqual } from './ai-daily-check-helpers.js'

const now = new Date('2026-07-19T08:00:00.000Z')
const healthy = toAiDailyOperationsDiagnostics(emptyAiDailyOperationsSnapshot(now))
assertEqual(healthy.status, 'healthy', 'empty operations snapshot should remain healthy')
assertEqual(healthy.alerts.length, 0, 'empty operations snapshot should have no alerts')
assertEqual(aiDailyFailureCategories.join(','), 'config,provider,evidence,quality,infrastructure,stale-content', 'failure categories should remain stable')
for (const [raw, expected] of [
  ['config_error', 'config'],
  ['ai-daily-provider-http-429', 'provider'],
  ['evidence_rejected', 'evidence'],
  ['schema_invalid', 'quality'],
  ['ai-daily-provider-timeout', 'infrastructure'],
  ['freshness_stale', 'stale-content'],
] as const) {
  assertEqual(classifyAiDailyFailureCategory(raw), expected, `${raw} should map to ${expected}`)
}
assertEqual(classifyAiDailyFailureCategory('private-provider-name'), null, 'unknown dynamic categories should not become labels')

const degraded = toAiDailyOperationsDiagnostics({
  ...emptyAiDailyOperationsSnapshot(now),
  sources: {
    enabled: 3,
    maxLagMs: 90_000,
    byHealth: { UNKNOWN: 0, HEALTHY: 1, DEGRADED: 1, FAILING: 1 },
  },
  runs: {
    ...emptyAiDailyOperationsSnapshot(now).runs,
    byStatus: { QUEUED: 0, RUNNING: 1, COMPLETED: 2, COMPLETED_WITH_GAPS: 1, FAILED_CONFIG: 1, FAILED: 1, CANCELLED: 0 },
    activeByStage: {
      COLLECT: 0,
      DISCOVER: 0,
      FETCH: 0,
      DEDUPE: 0,
      GROUP: 0,
      RANK: 0,
      PROMOTE: 0,
      EXTRACT_FACTS: 0,
      COMPOSE: 1,
      VERIFY: 0,
      VALIDATE: 0,
      DRAFT: 0,
    },
    latest: { status: 'FAILED', stage: 'COMPOSE', endToEndLagMs: 120_000, pipelineFreshnessAt: now.toISOString() },
  },
  workItems: {
    byStatus: { PENDING: 2, LEASED: 1, RETRY_WAIT: 1, SUCCEEDED: 3, FAILED: 1, CANCELLED: 0 },
    readyBacklog: 3,
    expiredLeases: 1,
  },
  events: {
    byOutcome: { persisted: 2, succeeded: 4, failed: 1, 'schema-rejected': 1, 'quality-rejected': 2, other: 0 },
    byProviderRole: { primary: 5, fallback: 2, stable: 1, signal: 0, manual: 0, other: 0 },
  },
  failures: {
    observationWindowHours: 24,
    staleAfterMs: 10_800_000,
    byCategory: { config: 1, provider: 2, evidence: 3, quality: 4, infrastructure: 5, 'stale-content': 1 },
  },
  publicFeed: {
    activeApproved: 2,
    latestApprovedAt: '2026-07-19T07:59:00.000Z',
    ageMs: 60_000,
  },
  retention: { expiredEvidence: 4, expiredFlashItems: 1 },
})
assertEqual(degraded.status, 'degraded', 'operational alerts should degrade the snapshot')
for (const code of ['source-failing', 'lease-expired', 'work-backlog', 'run-failed', 'quality-rejected', 'retention-due']) {
  assert(degraded.alerts.some((alert) => alert.code === code), `operations diagnostics should include ${code}`)
}
for (const category of aiDailyFailureCategories) {
  assert(degraded.alerts.some((alert) => alert.code === `failure-${category}`), `operations diagnostics should include failure-${category}`)
}

const metrics = renderAiDailyOperationsPrometheus(degraded)
for (const expected of [
  'biau_ai_daily_operations_snapshot_up 1',
  'biau_ai_daily_sources_total{health="failing"} 1',
  'biau_ai_daily_active_runs_total{stage="compose"} 1',
  'biau_ai_daily_latest_run_end_to_end_lag_seconds 120.000',
  'biau_ai_daily_latest_run_end_to_end_lag_available 1',
  'biau_ai_daily_latest_run_freshness_age_seconds 0.000',
  'biau_ai_daily_latest_run_freshness_available 1',
  'biau_ai_daily_issues_total{status="review_needed"} 0',
  'biau_ai_daily_work_items_expired_leases 1',
  'biau_ai_daily_run_events_total{outcome="quality-rejected"} 2',
  'biau_ai_daily_provider_role_events_total{provider_role="fallback"} 2',
  'biau_ai_daily_failure_signals{category="config"} 1',
  'biau_ai_daily_failure_signals{category="provider"} 2',
  'biau_ai_daily_failure_signals{category="evidence"} 3',
  'biau_ai_daily_failure_signals{category="quality"} 4',
  'biau_ai_daily_failure_signals{category="infrastructure"} 5',
  'biau_ai_daily_failure_signals{category="stale-content"} 1',
  'biau_ai_daily_public_flash_age_seconds 60.000',
  'biau_ai_daily_public_flash_available 1',
  'biau_ai_daily_retention_due_total{kind="evidence"} 4',
  'biau_ai_daily_alerts_total{code="lease-expired",severity="critical"} 1',
]) {
  assert(metrics.includes(expected), `operations metrics should include ${expected}`)
}

for (const forbidden of [
  'token',
  'authorization',
  'database_url',
  'provider_id',
  'run_id',
  'issue_id',
  'source_url',
  'https://',
  'sk-',
]) {
  assert(!metrics.toLowerCase().includes(forbidden), `operations metrics must not include ${forbidden}`)
}

const emptyMetrics = renderAiDailyOperationsPrometheus(healthy)
for (const expected of [
  'biau_ai_daily_latest_run_end_to_end_lag_available 0',
  'biau_ai_daily_latest_run_freshness_available 0',
  'biau_ai_daily_public_flash_available 0',
]) {
  assert(emptyMetrics.includes(expected), `empty operations metrics should include ${expected}`)
}

const unavailable = renderAiDailyOperationsPrometheus(null)
assertEqual(
  unavailable.trim(),
  '# HELP biau_ai_daily_operations_snapshot_up Whether the AI Daily operations snapshot was available.\n# TYPE biau_ai_daily_operations_snapshot_up gauge\nbiau_ai_daily_operations_snapshot_up 0',
  'unavailable snapshot should fail closed without diagnostics',
)

console.log('AI Daily operations check passed')
