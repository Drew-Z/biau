import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

function readAlertBlocks(text) {
  const blocks = []
  let current = null
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s+- alert:\s*([A-Za-z0-9_-]+)\s*$/u)
    if (match) {
      if (current) blocks.push(current)
      current = { name: match[1], lines: [] }
    }
    if (current) current.lines.push(line)
  }
  if (current) blocks.push(current)
  return blocks
}

async function main() {
  const [dashboardText, alertsText, packageText, suiteText] = await Promise.all([
    readFile(resolve(repoRoot, 'observability/ai-daily-grafana-dashboard.json'), 'utf8'),
    readFile(resolve(repoRoot, 'observability/ai-daily-prometheus-alerts.yml'), 'utf8'),
    readFile(resolve(repoRoot, 'package.json'), 'utf8'),
    readFile(resolve(repoRoot, 'scripts/check-ai-daily-contracts.mjs'), 'utf8'),
  ])
  const dashboard = JSON.parse(dashboardText)
  const packageJson = JSON.parse(packageText)

  assert(dashboard.uid === 'biau-ai-daily-operations', 'dashboard uid should remain stable')
  assert(Array.isArray(dashboard.panels) && dashboard.panels.length >= 7, 'dashboard should contain the overview and six category panels')
  const dashboardExpressions = dashboard.panels.flatMap((panel) => (Array.isArray(panel.targets) ? panel.targets.map((target) => target?.expr) : []))
  assert(dashboardExpressions.includes('sum by (category) (biau_ai_daily_failure_signals)'), 'dashboard should include the grouped category overview')
  assert(packageJson.scripts?.['ai-daily:observability-contract-check'], 'package script should expose the observability contract check')
  assert(suiteText.includes("'ai-daily:observability-contract-check'"), 'the deterministic AI Daily suite should run the observability contract check')

  const alertBlocks = readAlertBlocks(alertsText)
  assert(alertBlocks.length === categories.length, `alert rules should contain exactly ${categories.length} rules`)
  assert(new Set(alertBlocks.map((block) => block.name)).size === alertBlocks.length, 'alert names should be unique')

  for (const category of categories) {
    assert(dashboardExpressions.includes(`max(biau_ai_daily_failure_signals{category="${category}"})`), `dashboard should include ${category}`)
    const block = alertBlocks.find((candidate) => candidate.lines.some((line) => line.includes(`category: ${category}`)))
    assert(block, `alert rules should include ${category}`)
    assert(block.lines.some((line) => line.includes(`expr: biau_ai_daily_failure_signals{category="${category}"} > 0`)), `alert expression should bind ${category}`)
    assert(block.lines.some((line) => line.includes(`severity: ${expectedSeverity[category]}`)), `alert rule should assign the expected ${category} severity`)
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
