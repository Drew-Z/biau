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
  readme: {
    label: 'README.md',
    path: resolve(repoRoot, 'README.md'),
  },
  readmeZh: {
    label: 'README.zh-CN.md',
    path: resolve(repoRoot, 'README.zh-CN.md'),
  },
  statusTargets: {
    label: 'src/data/statusTargets.ts',
    path: resolve(repoRoot, 'src/data/statusTargets.ts'),
  },
  portfolio: {
    label: 'src/data/portfolio.ts',
    path: resolve(repoRoot, 'src/data/portfolio.ts'),
  },
  assistantData: {
    label: 'src/data/assistant.ts',
    path: resolve(repoRoot, 'src/data/assistant.ts'),
  },
  assistantKnowledge: {
    label: 'src/data/assistantKnowledge.ts',
    path: resolve(repoRoot, 'src/data/assistantKnowledge.ts'),
  },
  publicAssistantSpec: {
    label: '.trellis/spec/backend/public-research-assistant.md',
    path: resolve(repoRoot, '.trellis/spec/backend/public-research-assistant.md'),
  },
  publicAssistantNote: {
    label: 'docs/project-notes/public-assistant.md',
    path: resolve(repoRoot, 'docs/project-notes/public-assistant.md'),
  },
  siteStatus: {
    label: 'public/status/site-status.json',
    path: resolve(repoRoot, 'public/status/site-status.json'),
  },
  publicKnowledge: {
    label: 'server/data/public-knowledge.json',
    path: resolve(repoRoot, 'server/data/public-knowledge.json'),
  },
  publicKnowledgeV2: {
    label: 'server/data/public-knowledge-v2.json',
    path: resolve(repoRoot, 'server/data/public-knowledge-v2.json'),
  },
}

const serviceContracts = [
  {
    name: 'biau-public-assistant-api',
    mode: 'public',
    requiredEnv: [
      'DATABASE_URL',
      'TRUST_PROXY',
      'ASSISTANT_MODEL_BASE_URL',
      'ASSISTANT_MODEL_API_KEY',
      'ASSISTANT_MODEL_PROTOCOL',
      'ASSISTANT_MODEL_STRUCTURED_OUTPUTS_MODE',
      'ASSISTANT_RAG_API_BASE_URL',
      'ASSISTANT_RAG_API_KEY',
      'PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS',
      'PUBLIC_ASSISTANT_ANSWER_TIMEOUT_MS',
      'PUBLIC_ASSISTANT_VISION_TIMEOUT_MS',
      'PUBLIC_ASSISTANT_DIRECT_MAX_OUTPUT_TOKENS',
      'PUBLIC_ASSISTANT_RATE_LIMIT',
      'PUBLIC_ASSISTANT_RATE_WINDOW_MS',
      'PUBLIC_ASSISTANT_RETENTION_DAYS',
      'PUBLIC_ASSISTANT_OPERATIONS_TOKEN',
      'PUBLIC_WEB_SEARCH_PROVIDER',
      'PUBLIC_WEB_SEARCH_BASE_URL',
      'PUBLIC_WEB_SEARCH_API_KEY',
      'PUBLIC_WEB_SEARCH_TIMEOUT_MS',
      'PUBLIC_WEB_SEARCH_MAX_RESULTS',
      'PUBLIC_WEB_FETCH_MAX_PAGES',
    ],
    expectedEnv: {
      TRUST_PROXY: 'true',
      ASSISTANT_MODEL_PROTOCOL: 'responses',
      ASSISTANT_MODEL_STRUCTURED_OUTPUTS_MODE: 'off',
      ASSISTANT_MODEL_PROVIDER: 'cloudflare-model-relay',
      ASSISTANT_MODEL_NAME: 'grok-4.5',
      PUBLIC_ASSISTANT_REQUEST_TIMEOUT_MS: '45000',
      PUBLIC_ASSISTANT_ANSWER_TIMEOUT_MS: '20000',
      PUBLIC_ASSISTANT_VISION_TIMEOUT_MS: '12000',
      PUBLIC_ASSISTANT_DIRECT_MAX_OUTPUT_TOKENS: '800',
      PUBLIC_ASSISTANT_RATE_LIMIT: '20',
      PUBLIC_ASSISTANT_RATE_WINDOW_MS: '60000',
      PUBLIC_ASSISTANT_RETENTION_DAYS: '30',
      PUBLIC_WEB_SEARCH_PROVIDER: 'tavily',
      PUBLIC_WEB_SEARCH_BASE_URL: 'https://api.tavily.com',
      PUBLIC_WEB_SEARCH_TIMEOUT_MS: '8000',
      PUBLIC_WEB_SEARCH_MAX_RESULTS: '5',
      PUBLIC_WEB_FETCH_MAX_PAGES: '3',
    },
    forbiddenEnv: [
      'ASSISTANT_MODEL_FALLBACK_BASE_URL',
      'ASSISTANT_MODEL_FALLBACK_API_KEY',
      'ASSISTANT_MODEL_FALLBACK_MODELS',
      'ASSISTANT_MODEL_FALLBACK_PROVIDER',
      'ASSISTANT_VISION_MODEL',
    ],
    requiredStart: 'npm run prisma:migrate && npm run server:start',
    requiredHealth: '/health',
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
      'AI_DAILY_PRODUCTION_GENERATION_ENABLED',
      'METRICS_ENABLED',
      'AI_DAILY_OPERATIONS_METRICS_ENABLED',
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
      METRICS_ENABLED: 'false',
      AI_DAILY_OPERATIONS_METRICS_ENABLED: 'false',
    },
    requiredStart: 'npm run prisma:migrate:studio && npm run server:start',
  },
  {
    name: 'biau-rag-orchestrator',
    mode: 'rag',
    requiredEnv: ['RAG_DATABASE_URL', 'RAG_PUBLIC_API_KEY', 'RAG_SYNC_TOKEN', 'EMBEDDING_BASE_URL', 'EMBEDDING_API_KEY', 'EMBEDDING_MODEL', 'EMBEDDING_DIMENSION'],
    expectedEnv: {
      RAG_STORE_PROVIDER: 'supabase',
      EMBEDDING_DIMENSION: '4096',
    },
    requiredHealth: '/health',
  },
]

const stalePhrases = [
  'four Web Services',
  'four-service',
  '四服务边界',
  '四个 Render Web Service',
  'public, internal, and rag',
  'public, internal, studio, and rag',
  'public/internal/studio/rag',
  'public, operator, studio, and rag',
  'public/operator/studio/rag',
  'biau-internal-assistant-api',
  'ASSISTANT_SERVICE_MODE=internal',
  'ASSISTANT_SERVICE_MODE=operator',
  'RAG_INTERNAL_API_KEY',
  'QDRANT_INTERNAL_COLLECTION',
  'CF_ACCESS_TEAM_DOMAIN',
]

const staleProductionTruthPhrases = [
  'store=qdrant',
  'Qdrant public alias readiness',
  'RAG Orchestrator 使用 Qdrant public alias',
  '后续仍需完成旧 Operator-only',
  '先备份并退役旧 Operator-only',
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

  for (const retired of ['biau-operator-api', 'ASSISTANT_SERVICE_MODE\n        value: operator', 'RAG_INTERNAL_API_KEY', 'QDRANT_INTERNAL_COLLECTION']) {
    if (renderText.includes(retired)) issues.push(`${files.render.label} 仍包含已退休部署项：${retired}`)
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
    if (service.requiredHealth && !block.includes(`healthCheckPath: ${service.requiredHealth}`)) {
      issues.push(`${service.name} 的 Health Check Path 应为：${service.requiredHealth}`)
    }

    for (const envKey of service.requiredEnv) {
      if (!block.includes(`key: ${envKey}`)) issues.push(`${service.name} 缺少 env：${envKey}`)
    }

    for (const [envKey, expectedValue] of Object.entries(service.expectedEnv ?? {})) {
      if (extractEnvValue(block, envKey) !== expectedValue) {
        issues.push(`${service.name} 的 ${envKey} 应显式设置为 ${expectedValue}`)
      }
    }

    for (const envKey of service.forbiddenEnv ?? []) {
      if (block.includes(`key: ${envKey}`)) {
        issues.push(`${service.name} 当前 Blueprint 不应强制设置可选 env：${envKey}`)
      }
    }

    if (!['public', 'studio'].includes(service.mode) && block.includes('key: TRUST_PROXY')) {
      issues.push(`${service.name} 不应设置 TRUST_PROXY；该代理信任配置只属于接收公开代理流量的服务。`)
    }
  }

  return issues
}

async function main() {
  const [
    render,
    envExample,
    deployment,
    manualGates,
    backendSpec,
    readme,
    readmeZh,
    statusTargets,
    portfolio,
    assistantData,
    assistantKnowledge,
    publicAssistantSpec,
    publicAssistantNote,
    siteStatus,
    publicKnowledge,
    publicKnowledgeV2,
  ] = await Promise.all([
    readFile(files.render.path, 'utf8'),
    readFile(files.envExample.path, 'utf8'),
    readFile(files.deployment.path, 'utf8'),
    readFile(files.manualGates.path, 'utf8'),
    readFile(files.backendSpec.path, 'utf8'),
    readFile(files.readme.path, 'utf8'),
    readFile(files.readmeZh.path, 'utf8'),
    readFile(files.statusTargets.path, 'utf8'),
    readFile(files.portfolio.path, 'utf8'),
    readFile(files.assistantData.path, 'utf8'),
    readFile(files.assistantKnowledge.path, 'utf8'),
    readFile(files.publicAssistantSpec.path, 'utf8'),
    readFile(files.publicAssistantNote.path, 'utf8'),
    readFile(files.siteStatus.path, 'utf8'),
    readFile(files.publicKnowledge.path, 'utf8'),
    readFile(files.publicKnowledgeV2.path, 'utf8'),
  ])

  const issues = [
    ...checkRenderBlueprint(render),
    ...collectMissing(files.envExample.label, envExample, [
      'three Web Services',
      'public, studio, and rag',
      'TRUST_PROXY=false',
      'PUBLIC_ASSISTANT_API_BASE_URL=',
      'PUBLIC_ASSISTANT_PROXY_TIMEOUT_MS=55000',
      'MODEL_RELAY_SHARED_TOKEN=',
      'MODEL_RELAY_UPSTREAM_BASE_URL=',
      'MODEL_RELAY_UPSTREAM_API_KEY=',
      'MODEL_RELAY_ALLOWED_MODELS=grok-4.5',
      'MODEL_RELAY_TIMEOUT_MS=50000',
      'PUBLIC_ASSISTANT_ANSWER_TIMEOUT_MS=20000',
      'ASSISTANT_MODEL_STRUCTURED_OUTPUTS_MODE=off',
      'ASSISTANT_MODEL_FALLBACK_BASE_URL=',
      'ASSISTANT_MODEL_FALLBACK_API_KEY=',
      'ASSISTANT_MODEL_FALLBACK_MODELS=',
      'ASSISTANT_MODEL_FALLBACK_PROVIDER=',
      'ASSISTANT_VISION_MODEL=',
      'PUBLIC_ASSISTANT_VISION_TIMEOUT_MS=12000',
      'PUBLIC_ASSISTANT_DIRECT_MAX_OUTPUT_TOKENS=800',
      'PUBLIC_ASSISTANT_RETENTION_DAYS=30',
      'PUBLIC_WEB_SEARCH_PROVIDER=tavily',
      'PUBLIC_WEB_SEARCH_BASE_URL=https://api.tavily.com',
      'RAG_STORE_PROVIDER=supabase',
      'RAG_DATABASE_URL=',
      'AI_DAILY_PUBLIC_WINDOW_HOURS=72',
      'AI_DAILY_PUBLIC_STALE_MINUTES=180',
      'AI_DAILY_PUBLIC_RATE_LIMIT=60',
      'AI_DAILY_PUBLIC_RATE_WINDOW_MS=60000',
      'AI_DAILY_MODEL_APPROVAL_FILE=',
      'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=',
      'METRICS_ENABLED=false',
      'AI_DAILY_OPERATIONS_METRICS_ENABLED=false',
    ]),
    ...collectMissing(files.deployment.label, deployment, [
      '三个 Render Web Service',
      'biau-public-assistant-api',
      'biau-content-studio-api',
      'biau-rag-orchestrator',
      'ASSISTANT_SERVICE_MODE=public',
      'ASSISTANT_SERVICE_MODE=studio',
      'ASSISTANT_SERVICE_MODE=rag',
      'npm run prisma:migrate:studio && npm run server:start',
      'STUDIO_DATABASE_URL=<内容工作台 Studio 数据库 URL>',
      'VITE_AI_DAILY_API_BASE_URL',
      'PUBLIC_ASSISTANT_API_BASE_URL',
      'PUBLIC_ASSISTANT_PROXY_TIMEOUT_MS=55000',
      'MODEL_RELAY_SHARED_TOKEN',
      'MODEL_RELAY_UPSTREAM_BASE_URL',
      'MODEL_RELAY_ALLOWED_MODELS=grok-4.5',
      'POST /api/model-relay/responses',
      'POST /api/model-relay/fallback/responses',
      'PUBLIC_ASSISTANT_ANSWER_TIMEOUT_MS=20000',
      '当前生产只启用已通过获批古诗生成任务的 `grok-4.5` Responses 主通道',
      '`ASSISTANT_VISION_MODEL` 留空',
      'PUBLIC_ASSISTANT_VISION_TIMEOUT_MS=12000',
      'Planner 只使用主通道',
      '`/health` 只检查是否至少存在一套完整配置',
      'DATABASE_URL=<公开助手匿名 session、turn、feedback 和 aggregate 数据库 URL>',
      'PUBLIC_ASSISTANT_RETENTION_DAYS=30',
      'PUBLIC_WEB_SEARCH_PROVIDER=tavily',
      'PUBLIC_WEB_SEARCH_BASE_URL=https://api.tavily.com',
      'RAG_STORE_PROVIDER=supabase',
      'RAG_DATABASE_URL=<公开助手 Supabase PostgreSQL server-only URL>',
      'PUBLIC_RAG_API_BASE_URL',
      'public-rag-sync.yml',
      'AI_DAILY_PUBLIC_CORS_ORIGINS',
      'AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json',
      'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH=<ai-daily:model-select-approve 或 model-approve 输出的 bundleHash>',
      'AI_DAILY_OPERATIONS_METRICS_ENABLED=true',
      'Render Secret File',
      'Editorial Cron',
      'Secret Files 不会在 Render 服务之间自动共享',
      'scripts/operations/postgres/operator-retirement/preflight.sql',
      '最后人工删除 Render Operator 服务',
    ]),
    ...collectMissing(files.manualGates.label, manualGates, [
      'Render 三服务边界',
      'public/studio/rag',
      'Public assistant Cloudflare model relay rollout',
      'Operator PostgreSQL 退役',
      '/etc/secrets/ai-daily-model-approval.v1.json',
      'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH',
    ]),
    ...collectMissing(files.backendSpec.label, backendSpec, [
      'Render final shape is one repository deployed as three Web Services',
      '`ASSISTANT_SERVICE_MODE=public`',
      '`ASSISTANT_SERVICE_MODE=studio`',
      '`ASSISTANT_SERVICE_MODE=rag`',
      'Studio API mode',
      '`RAG_SYNC_TOKEN` authorizes versioned public knowledge sync',
      'Production RAG uses server-only Supabase pgvector',
      'generated `site-status` / public-knowledge projections',
      '`AI_DAILY_MODEL_APPROVAL_FILE`',
      '`AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH`',
    ]),
    ...collectMissing(files.readme.label, readme, ['server-only Supabase pgvector', 'Qdrant adapter remains available only for compatibility and rollback tests']),
    ...collectMissing(files.readmeZh.label, readmeZh, ['生产 RAG 使用服务端 Supabase pgvector', '可选 Qdrant 适配器只保留给兼容与回滚测试']),
    ...collectMissing(files.statusTargets.label, statusTargets, ['Supabase pgvector readiness', 'store=supabase-pgvector']),
    ...collectMissing(files.portfolio.label, portfolio, ['RAG Orchestrator 生产存储使用 Supabase pgvector', 'Operator/internal-RAG 退役已经完成']),
    ...collectMissing(files.assistantData.label, assistantData, ['Supabase pgvector 公开 RAG', 'Operator/internal-RAG 退役已经完成']),
    ...collectMissing(files.assistantKnowledge.label, assistantKnowledge, ['Supabase pgvector 公开 RAG', 'Operator/internal-RAG 退役已经完成']),
    ...collectMissing(files.publicAssistantSpec.label, publicAssistantSpec, [
      'Production site retrieval uses public-only Supabase pgvector evidence',
      'The optional Qdrant adapter may still use a validated versioned collection and alias switch, but it is not the production store',
    ]),
    ...collectMissing(files.publicAssistantNote.label, publicAssistantNote, ['生产存储使用 server-only Supabase pgvector', 'Qdrant 适配器只保留给确定性测试或回滚兼容']),
    ...collectMissing(files.siteStatus.label, siteStatus, ['Supabase pgvector readiness', 'store=supabase-pgvector']),
    ...collectMissing(files.publicKnowledge.label, publicKnowledge, ['Supabase pgvector', 'Operator/internal-RAG 退役已经完成']),
    ...collectMissing(files.publicKnowledgeV2.label, publicKnowledgeV2, ['Supabase pgvector', 'Operator/internal-RAG 退役已经完成']),
    ...collectPresent(files.envExample.label, envExample, stalePhrases),
    ...collectPresent(files.deployment.label, deployment, stalePhrases),
    ...collectPresent(files.manualGates.label, manualGates, stalePhrases),
    ...collectPresent(files.backendSpec.label, backendSpec, stalePhrases),
    ...[
      [files.envExample, envExample],
      [files.readme, readme],
      [files.readmeZh, readmeZh],
      [files.deployment, deployment],
      [files.manualGates, manualGates],
      [files.statusTargets, statusTargets],
      [files.portfolio, portfolio],
      [files.assistantData, assistantData],
      [files.assistantKnowledge, assistantKnowledge],
      [files.publicAssistantSpec, publicAssistantSpec],
      [files.publicAssistantNote, publicAssistantNote],
      [files.siteStatus, siteStatus],
      [files.publicKnowledge, publicKnowledge],
      [files.publicKnowledgeV2, publicKnowledgeV2],
    ].flatMap(([file, text]) => collectPresent(file.label, text, staleProductionTruthPhrases)),
  ]

  if (issues.length > 0) {
    console.error(`部署契约检查失败，共 ${issues.length} 个问题：`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  console.log('部署契约检查通过：Render Blueprint、环境示例、部署文档和 code-spec 的三服务 public-only 边界保持一致。')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
