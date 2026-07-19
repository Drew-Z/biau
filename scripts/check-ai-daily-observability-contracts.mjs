import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const categories = ['config', 'provider', 'evidence', 'quality', 'infrastructure', 'stale-content']
const expectedSeverity = {
  config: 'critical',
  provider: 'critical',
  evidence: 'warning',
  quality: 'warning',
  infrastructure: 'critical',
  'stale-content': 'warning',
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function panelsOverlap(left, right) {
  return !(
    left.x + left.w <= right.x ||
    right.x + right.w <= left.x ||
    left.y + left.h <= right.y ||
    right.y + right.h <= left.y
  )
}

async function main() {
  const [dashboardText, alertsText, packageText, suiteText] = await Promise.all([
    readFile(resolve(repoRoot, 'observability/ai-daily-grafana-dashboard.json'), 'utf8'),
    readFile(resolve(repoRoot, 'observability/ai-daily-prometheus-alerts.yml'), 'utf8'),
    readFile(resolve(repoRoot, 'package.json'), 'utf8'),
    readFile(resolve(repoRoot, 'scripts/check-ai-daily-contracts.mjs'), 'utf8'),
  ])
  const dashboard = JSON.parse(dashboardText)
  const alerts = parseYaml(alertsText)
  const packageJson = JSON.parse(packageText)

  assert(dashboard.uid === 'biau-ai-daily-operations', 'dashboard uid should remain stable')
  assert(Array.isArray(dashboard.panels) && dashboard.panels.length >= 13, 'dashboard should contain the overview, six category panels, and six operational panels')
  assert(new Set(dashboard.panels.map((panel) => panel?.id)).size === dashboard.panels.length, 'dashboard panel ids should be unique')
  assert(new Set(dashboard.panels.map((panel) => panel?.title)).size === dashboard.panels.length, 'dashboard panel titles should be unique')
  for (const panel of dashboard.panels) {
    assert(Number.isInteger(panel?.id) && panel.id > 0, 'dashboard panel ids should be positive integers')
    assert(typeof panel?.title === 'string' && panel.title.length > 0, `dashboard panel ${panel?.id ?? 'unknown'} should have a title`)
    assert(panel?.datasource?.type === 'prometheus' && panel.datasource.uid === '${DS_PROMETHEUS}', `dashboard panel ${panel.id} should use the Prometheus input`)
    const grid = panel?.gridPos
    assert(grid && [grid.x, grid.y, grid.w, grid.h].every(Number.isInteger), `dashboard panel ${panel.id} should have an integer grid position`)
    assert(grid.x >= 0 && grid.y >= 0 && grid.w > 0 && grid.h > 0 && grid.x + grid.w <= 24, `dashboard panel ${panel.id} should remain inside the 24-column grid`)
    assert(Array.isArray(panel.targets) && panel.targets.length > 0, `dashboard panel ${panel.id} should have targets`)
    assert(new Set(panel.targets.map((target) => target?.refId)).size === panel.targets.length, `dashboard panel ${panel.id} target refIds should be unique`)
    for (const target of panel.targets) {
      assert(typeof target?.expr === 'string' && target.expr.trim().length > 0, `dashboard panel ${panel.id} targets should have PromQL`)
      assert(typeof target?.refId === 'string' && /^[A-Z]$/u.test(target.refId), `dashboard panel ${panel.id} targets should have bounded refIds`)
    }
  }
  for (let leftIndex = 0; leftIndex < dashboard.panels.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < dashboard.panels.length; rightIndex += 1) {
      const left = dashboard.panels[leftIndex]
      const right = dashboard.panels[rightIndex]
      assert(!panelsOverlap(left.gridPos, right.gridPos), `dashboard panels ${left.id} and ${right.id} should not overlap`)
    }
  }
  const dashboardExpressions = dashboard.panels.flatMap((panel) => (Array.isArray(panel.targets) ? panel.targets.map((target) => target?.expr) : []))
  assert(dashboardExpressions.includes('sum by (category) (biau_ai_daily_failure_signals)'), 'dashboard should include the grouped category overview')
  for (const expression of [
    'sum by (health) (biau_ai_daily_sources_total)',
    'biau_ai_daily_work_items_ready_backlog',
    'biau_ai_daily_work_items_expired_leases',
    '(biau_ai_daily_latest_run_freshness_age_seconds / 60) and on() (biau_ai_daily_latest_run_freshness_available == 1)',
    '(biau_ai_daily_latest_run_end_to_end_lag_seconds / 60) and on() (biau_ai_daily_latest_run_end_to_end_lag_available == 1)',
    'sum by (provider_role) (biau_ai_daily_provider_role_events_total)',
    'sum by (status) (biau_ai_daily_issues_total)',
    'biau_ai_daily_public_flash_items_active',
    '(biau_ai_daily_public_flash_age_seconds / 60) and on() (biau_ai_daily_public_flash_available == 1)',
    'sum by (kind) (biau_ai_daily_retention_due_total)',
  ]) {
    assert(dashboardExpressions.includes(expression), `dashboard should include ${expression}`)
  }
  assert(packageJson.scripts?.['ai-daily:observability-contract-check'], 'package script should expose the observability contract check')
  assert(suiteText.includes("'ai-daily:observability-contract-check'"), 'the deterministic AI Daily suite should run the observability contract check')

  assert(Array.isArray(alerts?.groups) && alerts.groups.length === 1, 'alert rules should contain one production group')
  const [alertGroup] = alerts.groups
  assert(alertGroup?.name === 'biau-ai-daily-production', 'alert group name should remain stable')
  assert(alertGroup?.interval === '1m', 'alert group interval should remain one minute')
  const alertRules = Array.isArray(alertGroup?.rules) ? alertGroup.rules : []
  assert(alertRules.length === categories.length + 1, `alert rules should contain six failure-category rules and one snapshot availability rule`)
  assert(new Set(alertRules.map((rule) => rule?.alert)).size === alertRules.length, 'alert names should be unique')

  const snapshotUnavailable = alertRules.find((rule) => rule?.alert === 'BiauAiDailyOperationsSnapshotUnavailable')
  assert(snapshotUnavailable, 'alert rules should include the operations snapshot availability rule')
  assert(snapshotUnavailable.expr === 'biau_ai_daily_operations_snapshot_up == 0 or absent(biau_ai_daily_operations_snapshot_up)', 'snapshot availability alert should fail closed when the collector reports unavailable or the series is missing')
  assert(snapshotUnavailable.for === '5m', 'snapshot availability alert should use the infrastructure critical delay')
  assert(snapshotUnavailable.labels?.category === 'infrastructure', 'snapshot availability alert should use the infrastructure category')
  assert(snapshotUnavailable.labels?.severity === 'critical', 'snapshot availability alert should be critical')

  for (const category of categories) {
    assert(dashboardExpressions.includes(`max(biau_ai_daily_failure_signals{category="${category}"})`), `dashboard should include ${category}`)
    const rule = alertRules.find((candidate) => candidate?.expr === `biau_ai_daily_failure_signals{category="${category}"} > 0`)
    assert(rule, `alert rules should include ${category}`)
    assert(rule.labels?.category === category, `alert rule should label ${category}`)
    assert(rule.labels?.severity === expectedSeverity[category], `alert rule should assign the expected ${category} severity`)
    assert(typeof rule.annotations?.summary === 'string' && rule.annotations.summary.length > 0, `alert rule should describe ${category}`)
  }

  const publicSafeText = `${dashboardText}\n${alertsText}`.toLowerCase()
  for (const forbidden of ['https://', 'http://', 'authorization', 'database_url', 'provider_id', 'run_id', 'issue_id', 'source_url', 'sk-']) {
    assert(!publicSafeText.includes(forbidden), `observability assets must not include ${forbidden}`)
  }

  console.log('AI Daily observability contract check passed')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
