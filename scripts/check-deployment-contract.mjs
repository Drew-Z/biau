import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const files = {
  render: {
    label: 'render.yaml',
    path: resolve(repoRoot, 'render.yaml'),
  },
  envExample: {
    label: '.env.example',
    path: resolve(repoRoot, '.env.example'),
  },
  deployment: {
    label: 'docs/deployment.md',
    path: resolve(repoRoot, 'docs/deployment.md'),
  },
  manualGates: {
    label: 'docs/manual-gates.md',
    path: resolve(repoRoot, 'docs/manual-gates.md'),
  },
  backendSpec: {
    label: '.trellis/spec/backend/quality-guidelines.md',
    path: resolve(repoRoot, '.trellis/spec/backend/quality-guidelines.md'),
  },
}

const serviceContracts = [
  {
    name: 'biau-public-assistant-api',
    mode: 'public',
    requiredEnv: ['ASSISTANT_MODEL_BASE_URL', 'ASSISTANT_MODEL_API_KEY', 'ASSISTANT_RAG_API_BASE_URL', 'ASSISTANT_RAG_API_KEY'],
  },
  {
    name: 'biau-operator-api',
    mode: 'operator',
    requiredEnv: [
      'DATABASE_URL',
      'STUDIO_DATABASE_URL',
      'OPERATOR_SERVICE_TOKEN',
      'OPERATOR_OWNER_ID',
      'OPERATOR_OWNER_EMAILS',
      'ASSISTANT_RAG_API_BASE_URL',
      'ASSISTANT_RAG_API_KEY',
      'RAG_SYNC_TOKEN',
    ],
    requiredStart: 'npm run prisma:migrate && npm run prisma:migrate:studio && npm run server:start',
  },
  {
    name: 'biau-content-studio-api',
    mode: 'studio',
    requiredEnv: [
      'STUDIO_DATABASE_URL',
      'STUDIO_ADMIN_TOKEN',
      'TRUST_PROXY',
      'AI_DAILY_PUBLIC_CORS_ORIGINS',
      'AI_DAILY_PUBLIC_WINDOW_HOURS',
      'AI_DAILY_PUBLIC_STALE_MINUTES',
      'AI_DAILY_PUBLIC_RATE_LIMIT',
      'AI_DAILY_PUBLIC_RATE_WINDOW_MS',
      'AI_DAILY_MODEL_RUNTIME_JSON',
      'AI_DAILY_MODEL_APPROVAL_FILE',
      'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH',
      'AI_DAILY_BUSINESS_EVALUATION_ENABLED',
      'AI_DAILY_MODEL_EVALUATION_APPROVAL_ID',
      'AI_DAILY_PRODUCTION_GENERATION_ENABLED',
    ],
    expectedEnv: {
      TRUST_PROXY: 'true',
      AI_DAILY_PUBLIC_FEED_ENABLED: 'false',
      AI_DAILY_PUBLIC_WINDOW_HOURS: '72',
      AI_DAILY_PUBLIC_STALE_MINUTES: '180',
      AI_DAILY_PUBLIC_RATE_LIMIT: '60',
      AI_DAILY_PUBLIC_RATE_WINDOW_MS: '60000',
      AI_DAILY_MODEL_APPROVAL_FILE: '/etc/secrets/ai-daily-model-approval.v1.json',
      AI_DAILY_BUSINESS_EVALUATION_ENABLED: 'false',
      AI_DAILY_PRODUCTION_GENERATION_ENABLED: 'false',
    },
    requiredStart: 'npm run prisma:migrate:studio && npm run server:start',
  },
  {
    name: 'biau-rag-orchestrator',
    mode: 'rag',
    requiredEnv: ['QDRANT_URL', 'QDRANT_API_KEY', 'RAG_PUBLIC_API_KEY', 'RAG_INTERNAL_API_KEY', 'RAG_SYNC_TOKEN', 'EMBEDDING_BASE_URL', 'EMBEDDING_API_KEY'],
  },
]

const stalePhrases = [
  'three Web Services',
  'three service',
  '三服务边界',
  '三个 Render Web Service',
  'public, internal, and rag',
  'public, internal, studio, and rag',
  'public/internal/studio/rag',
  'biau-internal-assistant-api',
  'ASSISTANT_SERVICE_MODE=internal',
]

function collectMissing(label, text, needles) {
  const issues = []
  for (const needle of needles) {
    if (!text.includes(needle)) issues.push(`${label} 缺少关键内容：${needle}`)
  }
  return issues
}

function collectPresent(label, text, needles) {
  const issues = []
  for (const needle of needles) {
    if (text.includes(needle)) issues.push(`${label} 仍包含旧部署描述：${needle}`)
  }
  return issues
}

function extractServiceBlock(renderText, serviceName) {
  const nameIndex = renderText.indexOf(`    name: ${serviceName}`)
  if (nameIndex < 0) return ''
  const serviceStart = renderText.lastIndexOf('\n  - type: web', nameIndex)
  const start = serviceStart < 0 ? nameIndex : serviceStart + 1
  const next = renderText.indexOf('\n  - type: web', nameIndex + 1)
  return renderText.slice(start, next < 0 ? renderText.length : next)
}

function extractEnvValue(block, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const match = block.match(new RegExp(`- key: ${escapedKey}\\r?\\n\\s+value:\\s*["']?([^"'\\r\\n]+)["']?`, 'u'))
  return match?.[1]?.trim() ?? null
}

function checkRenderBlueprint(renderText) {
  const issues = []
  const serviceCount = (renderText.match(/^\s{4}name: /gmu) ?? []).length
  if (serviceCount !== serviceContracts.length) {
    issues.push(`${files.render.label} 应包含 ${serviceContracts.length} 个 Render web service，当前解析到 ${serviceCount} 个。`)
  }

  for (const service of serviceContracts) {
    const block = extractServiceBlock(renderText, service.name)
    if (!block) {
      issues.push(`${files.render.label} 缺少服务：${service.name}`)
      continue
    }

    if (!block.includes('type: web')) issues.push(`${service.name} 缺少 type: web`)
    if (!block.includes('runtime: node')) issues.push(`${service.name} 缺少 runtime: node`)
    if (!block.includes('NODE_VERSION')) issues.push(`${service.name} 缺少 NODE_VERSION`)
    if (!block.includes('ASSISTANT_SERVICE_MODE')) issues.push(`${service.name} 缺少 ASSISTANT_SERVICE_MODE`)
    if (!block.includes(`value: ${service.mode}`)) issues.push(`${service.name} 的 ASSISTANT_SERVICE_MODE 不是 ${service.mode}`)
    if (service.requiredStart && !block.includes(`startCommand: ${service.requiredStart}`)) {
      issues.push(`${service.name} 的 Start Command 应为：${service.requiredStart}`)
    }

    for (const envKey of service.requiredEnv) {
      if (!block.includes(`key: ${envKey}`)) issues.push(`${service.name} 缺少 env：${envKey}`)
    }

    for (const [envKey, expectedValue] of Object.entries(service.expectedEnv ?? {})) {
      if (extractEnvValue(block, envKey) !== expectedValue) {
        issues.push(`${service.name} 的 ${envKey} 应显式设置为 ${expectedValue}`)
      }
    }

    if (service.mode !== 'studio' && block.includes('key: TRUST_PROXY')) {
      issues.push(`${service.name} 不应设置 TRUST_PROXY；该代理信任配置仅属于 Studio public feed 服务。`)
    }
  }

  return issues
}

async function main() {
  const [render, envExample, deployment, manualGates, backendSpec] = await Promise.all([
    readFile(files.render.path, 'utf8'),
    readFile(files.envExample.path, 'utf8'),
    readFile(files.deployment.path, 'utf8'),
    readFile(files.manualGates.path, 'utf8'),
    readFile(files.backendSpec.path, 'utf8'),
  ])

  const issues = [
    ...checkRenderBlueprint(render),
    ...collectMissing(files.envExample.label, envExample, [
      'four Web Services',
      'public, operator, studio, and rag',
      'OPERATOR_SERVICE_TOKEN',
      'CF_ACCESS_TEAM_DOMAIN',
      'TRUST_PROXY=false',
      'AI_DAILY_PUBLIC_WINDOW_HOURS=72',
      'AI_DAILY_PUBLIC_STALE_MINUTES=180',
      'AI_DAILY_PUBLIC_RATE_LIMIT=60',
      'AI_DAILY_PUBLIC_RATE_WINDOW_MS=60000',
      'AI_DAILY_MODEL_APPROVAL_FILE=',
      'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=',
    ]),
    ...collectMissing(files.deployment.label, deployment, [
      '四个 Render Web Service',
      'biau-operator-api',
      'biau-content-studio-api',
      'ASSISTANT_SERVICE_MODE=operator',
      'ASSISTANT_SERVICE_MODE=studio',
      'npm run prisma:migrate:studio && npm run server:start',
      'OPERATOR_SERVICE_TOKEN',
      'CF_ACCESS_TEAM_DOMAIN',
      'STUDIO_DATABASE_URL=<内容工作台 Studio 数据库 URL，需与 biau-operator-api 相同>',
      'VITE_AI_DAILY_API_BASE_URL',
      'AI_DAILY_PUBLIC_CORS_ORIGINS',
      'AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json',
      'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=<ai-daily:model-approve 输出的 bundleHash>',
      'Render Secret File',
      'Editorial Cron',
      'Secret Files 不会在 Render 服务之间自动共享',
    ]),
    ...collectMissing(files.manualGates.label, manualGates, [
      'Render 四服务边界',
      'public/operator/studio/rag',
      'Cloudflare Access',
      '/etc/secrets/ai-daily-model-approval.v1.json',
      'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH',
    ]),
    ...collectMissing(files.backendSpec.label, backendSpec, [
      'Render final shape is one repository deployed as four Web Services',
      '`ASSISTANT_SERVICE_MODE=operator`',
      '`ASSISTANT_SERVICE_MODE=studio`',
      'Studio API mode',
      'Production split-database deployments must set `STUDIO_DATABASE_URL`',
      '`biau-operator-api` also needs `RAG_SYNC_TOKEN`',
      '`AI_DAILY_MODEL_APPROVAL_FILE`',
      '`AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`',
    ]),
    ...collectPresent(files.envExample.label, envExample, stalePhrases),
    ...collectPresent(files.deployment.label, deployment, stalePhrases),
    ...collectPresent(files.manualGates.label, manualGates, stalePhrases),
    ...collectPresent(files.backendSpec.label, backendSpec, stalePhrases),
  ]

  if (issues.length > 0) {
    console.error(`部署契约检查失败，共 ${issues.length} 个问题：`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log('部署契约检查通过：Render Blueprint、环境示例、部署文档和 code-spec 的四服务边界保持一致。')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
