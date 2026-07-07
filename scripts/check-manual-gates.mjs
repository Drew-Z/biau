import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
}

const ledgerNeedles = [
  '# Manual Gates Ledger',
  '## Git / Repository Publishing',
  '## Cloud And Deployment Platforms',
  '## Databases And Production Migrations',
  '## Model Providers And Live AI Tasks',
  '## Internal Assistant / RAG / Studio',
  '## AI Daily And Blog Publication',
  '## Project Demo And Credentialed Checks',
  '## APK / Mobile Release',
  '## Observability And Analytics',
  '## 当前人工队列摘要',
  '不能用 ping、doctor live、测活 prompt',
  'hidden + review-needed',
  '公开下载批准',
  'Plausible 或 Umami 二选一',
]

const ledgerLinks = [
  './observability-strategy.md',
  './site-monitoring.md',
  './studio-ai-daily-production-readiness.md',
  './deployment.md',
]

const secretPatterns = [
  { label: 'secret-like key', pattern: /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/u },
  { label: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/iu },
  { label: 'database url', pattern: /\b(?:postgres|postgresql|mysql|mongodb):\/\/[^\s)]+/iu },
  { label: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
  { label: 'local absolute path', pattern: /[A-Za-z]:\\[^\s)]+/u },
  { label: 'assignment-shaped api key', pattern: /\bapi[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{8,}/iu },
  { label: 'assignment-shaped password', pattern: /\bpassword\s*[:=]\s*[^\s`'"]{6,}/iu },
]

function collectMissing(label, text, needles) {
  const issues = []
  for (const needle of needles) {
    if (!text.includes(needle)) issues.push(`${label} 缺少关键内容：${needle}`)
  }
  return issues
}

function scanSecrets(label, text) {
  const issues = []
  for (const { label: patternLabel, pattern } of secretPatterns) {
    if (pattern.test(text)) issues.push(`${label} contains ${patternLabel}`)
  }
  return issues
}

async function main() {
  const [ledger, observability, monitoring, studioReadiness] = await Promise.all([
    readFile(files.ledger.path, 'utf8'),
    readFile(files.observability.path, 'utf8'),
    readFile(files.monitoring.path, 'utf8'),
    readFile(files.studioReadiness.path, 'utf8'),
  ])

  const issues = [
    ...collectMissing(files.ledger.label, ledger, ledgerNeedles),
    ...collectMissing(files.ledger.label, ledger, ledgerLinks),
    ...scanSecrets(files.ledger.label, ledger),
  ]

  for (const file of [files.observability, files.monitoring, files.studioReadiness]) {
    const text =
      file === files.observability ? observability : file === files.monitoring ? monitoring : studioReadiness
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
