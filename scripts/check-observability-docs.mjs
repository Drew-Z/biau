import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const files = {
  strategy: {
    label: 'docs/observability-strategy.md',
    path: resolve(repoRoot, 'docs/observability-strategy.md'),
  },
  monitoring: {
    label: 'docs/site-monitoring.md',
    path: resolve(repoRoot, 'docs/site-monitoring.md'),
  },
  manualGates: {
    label: 'docs/manual-gates.md',
    path: resolve(repoRoot, 'docs/manual-gates.md'),
  },
}

const strategyNeedles = [
  'Cloudflare Web Analytics / Pages Analytics + Search Console / Webmaster + Plausible 或 Umami 二选一',
  'Assistant API 工程指标',
  'Langfuse、Helicone、Phoenix 或 OpenTelemetry GenAI',
  'docs/site-monitoring.md',
  'docs/manual-gates.md',
  '| CDN / 基础访问 |',
  '| AI 助手质量 |',
  '| ARMS |',
  '| Grafana Faro |',
  'Plausible + Umami 同时接入同一个站点',
  '静态主站第一阶段就上 Prometheus',
  '人工 Gate',
  '把 `/metrics` 暴露到生产 scrape',
]

const monitoringNeedles = [
  '| Cloudflare Web Analytics / Pages Analytics |',
  '| Search Console / Webmaster |',
  '| Umami 或 Plausible |',
  '| Prometheus / Grafana / ARMS |',
  '推荐第一阶段组合是：Cloudflare + Search Console + Plausible 或 Umami 二选一 + `site:monitor`',
  'docs/manual-gates.md',
  '同一个站点同时接 Plausible 和 Umami 会重复采集',
  '多服务链路复杂后再接 OpenTelemetry',
  'AI 助手调用量稳定后再评估 Langfuse、Helicone、Phoenix 或 OpenTelemetry GenAI',
]

const manualGateNeedles = [
  '## 访问分析与可观测性',
  'Cloudflare Analytics / Search Console / Webmaster',
  'Plausible 或 Umami 二选一',
  'Prometheus / Grafana / ARMS',
]

function collectMissing(label, text, needles) {
  const issues = []
  for (const needle of needles) {
    if (!text.includes(needle)) issues.push(`${label} 缺少关键内容：${needle}`)
  }
  return issues
}

async function main() {
  const [strategy, monitoring, manualGates] = await Promise.all([
    readFile(files.strategy.path, 'utf8'),
    readFile(files.monitoring.path, 'utf8'),
    readFile(files.manualGates.path, 'utf8'),
  ])

  const issues = [
    ...collectMissing(files.strategy.label, strategy, strategyNeedles),
    ...collectMissing(files.monitoring.label, monitoring, monitoringNeedles),
    ...collectMissing(files.manualGates.label, manualGates, manualGateNeedles),
  ]

  if (!strategy.includes('docs/site-monitoring.md') || !monitoring.includes('docs/observability-strategy.md')) {
    issues.push('站点监察文档和可观测性策略文档缺少互相导航。')
  }

  if (issues.length > 0) {
    console.error(`可观测性文档检查失败，共 ${issues.length} 个问题：`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log('可观测性文档检查通过：关键工具边界、推荐路线和人工 gate 均存在。')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
