import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { reliabilityProjects } from '../src/data/statusTargets.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const files = {
  ledger: {
    label: 'docs/manual-gates.md',
    path: resolve(repoRoot, 'docs/manual-gates.md'),
  },
  observability: {
    label: 'docs/observability-strategy.md',
    path: resolve(repoRoot, 'docs/observability-strategy.md'),
  },
  monitoring: {
    label: 'docs/site-monitoring.md',
    path: resolve(repoRoot, 'docs/site-monitoring.md'),
  },
  studioReadiness: {
    label: 'docs/studio-ai-daily-production-readiness.md',
    path: resolve(repoRoot, 'docs/studio-ai-daily-production-readiness.md'),
  },
  runbook: {
    label: 'docs/internal-rag-studio-ai-daily-runbook.md',
    path: resolve(repoRoot, 'docs/internal-rag-studio-ai-daily-runbook.md'),
  },
}

const ledgerNeedles = [
  '# Manual Gates Ledger',
  '## BIAU 平台门禁',
  '## Operator 安全边界',
  '## Content Studio / AI Daily',
  '## 关联项目门禁',
  '## 访问分析与可观测性',
  '## 当前人工队列',
  '禁止 ping、doctor、空 prompt 和无意义测活',
  'hidden + review-needed',
  'Plausible 或 Umami 二选一',
  'Cloudflare Access',
]

const ledgerLinks = [
  './observability-strategy.md',
  './site-monitoring.md',
  './studio-ai-daily-production-readiness.md',
  './deployment.md',
]

const studioRunbookNeedles = [
  '## 3. 验收 Operator draft-write',
  '## 4. Studio 审核',
  'hidden + review-needed',
  '创建 Publish Export',
  '最后人工检查 Git diff',
  '不要把 Operator service token、Studio token、数据库 URL、模型 key、RAG token、Access 配置或私有地址写入聊天和仓库',
]

interface LedgerCoverage {
  label: string
  needles: string[]
}

const statusProjectLedgerCoverage = {
  'blog-semi': {
    label: 'BIAU Port 主站',
    needles: ['Cloudflare Access application 与 policy', 'Operator 真实模型验收', 'Prometheus / Grafana / ARMS'],
  },
  'legal-rag': {
    label: 'Legal RAG 法律机器人',
    needles: ['Legal RAG', 'credentialed synthetic', '合同审查'],
  },
  'ozon-erp': {
    label: 'Ozon ERP',
    needles: ['ERP', '生产注册策略'],
  },
  xunqiu: {
    label: '寻球',
    needles: ['Xunqiu', '正式 APK', 'SHA-256'],
  },
  'pet-gamer': {
    label: 'Pet / Gamer',
    needles: ['Pet', 'pet:synthetic', '正式 release'],
  },
  'biau-playlab': {
    label: 'BIAU Playlab / Game',
    needles: ['BIAU Playlab', 'playlab:synthetic', '公开入口'],
  },
} satisfies Record<string, LedgerCoverage>

const secretPatterns = [
  { label: 'secret-like key', pattern: /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/u },
  { label: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/iu },
  { label: 'database url', pattern: /\b(?:postgres|postgresql|mysql|mongodb):\/\/[^\s)]+/iu },
  { label: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
  { label: 'local absolute path', pattern: /[A-Za-z]:\\[^\s)]+/u },
  { label: 'assignment-shaped api key', pattern: /\bapi[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{8,}/iu },
  { label: 'assignment-shaped password', pattern: /\bpassword\s*[:=]\s*[^\s`'"]{6,}/iu },
]

function collectMissing(label: string, text: string, needles: string[]) {
  const issues: string[] = []
  for (const needle of needles) {
    if (!text.includes(needle)) issues.push(`${label} 缺少关键内容：${needle}`)
  }
  return issues
}

function scanSecrets(label: string, text: string) {
  const issues: string[] = []
  for (const { label: patternLabel, pattern } of secretPatterns) {
    if (pattern.test(text)) issues.push(`${label} contains ${patternLabel}`)
  }
  return issues
}

function checkStatusProjectLedgerCoverage(ledger: string) {
  const issues: string[] = []
  if (reliabilityProjects.length === 0) {
    issues.push('src/data/statusTargets.ts 未导出任何 reliabilityProjects。')
    return issues
  }

  const projectIds = new Set(reliabilityProjects.map((project) => project.id))
  for (const project of reliabilityProjects) {
    const coverage = statusProjectLedgerCoverage[project.id as keyof typeof statusProjectLedgerCoverage]
    if (!coverage) {
      issues.push(`${project.title} (${project.id}) 缺少 manual-gates ledger 覆盖映射。`)
      continue
    }

    for (const needle of coverage.needles) {
      if (!ledger.includes(needle)) {
        issues.push(`${project.title} (${project.id}) 的人工门禁总账缺少覆盖内容：${needle}`)
      }
    }
  }

  for (const [projectId, coverage] of Object.entries(statusProjectLedgerCoverage)) {
    if (!projectIds.has(projectId)) {
      issues.push(`${coverage.label} (${projectId}) 的 manual-gates 覆盖映射已经不对应任何 reliabilityProjects 项。`)
    }
  }

  return issues
}

async function main() {
  const [ledger, observability, monitoring, studioReadiness, runbook] = await Promise.all([
    readFile(files.ledger.path, 'utf8'),
    readFile(files.observability.path, 'utf8'),
    readFile(files.monitoring.path, 'utf8'),
    readFile(files.studioReadiness.path, 'utf8'),
    readFile(files.runbook.path, 'utf8'),
  ])

  const issues = [
    ...collectMissing(files.ledger.label, ledger, ledgerNeedles),
    ...collectMissing(files.ledger.label, ledger, ledgerLinks),
    ...scanSecrets(files.ledger.label, ledger),
    ...checkStatusProjectLedgerCoverage(ledger),
    ...collectMissing(files.runbook.label, runbook, studioRunbookNeedles),
    ...scanSecrets(files.runbook.label, runbook),
  ]

  for (const file of [files.observability, files.monitoring, files.studioReadiness, files.runbook]) {
    const text =
      file === files.observability
        ? observability
        : file === files.monitoring
          ? monitoring
          : file === files.studioReadiness
            ? studioReadiness
            : runbook
    if (!text.includes('manual-gates.md')) issues.push(`${file.label} 缺少 docs/manual-gates.md 导航。`)
  }

  if (issues.length > 0) {
    console.error(`人工门禁总账检查失败，共 ${issues.length} 个问题：`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log('人工门禁总账检查通过：分类、交叉链接和低敏边界均存在。')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
