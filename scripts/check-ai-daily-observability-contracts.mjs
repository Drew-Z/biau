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
  assert(Array.isArray(dashboard.panels) && dashboard.panels.length >= 7, 'dashboard should contain the overview and six category panels')
  const dashboardExpressions = dashboard.panels.flatMap((panel) => (Array.isArray(panel.targets) ? panel.targets.map((target) => target?.expr) : []))
  assert(dashboardExpressions.includes('sum by (category) (biau_ai_daily_failure_signals)'), 'dashboard should include the grouped category overview')
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
