import { access, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { constants } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const renderApprovalFilePath = '/etc/secrets/ai-daily-model-approval.v1.json'

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function extractRenderServiceBlock(yaml, serviceName) {
  const lines = yaml.split(/\r?\n/u)
  const start = lines.findIndex((line) => line.trim() === `name: ${serviceName}`)
  if (start < 0) return ''
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  - type:\s*\S+/u.test(lines[index])) {
      end = index
      break
    }
  }
  return lines.slice(start, end).join('\n')
}

function parseRenderEnvValues(serviceBlock) {
  const values = new Map()
  const lines = serviceBlock.split(/\r?\n/u)
  let currentKey = ''
  for (const line of lines) {
    const keyMatch = line.match(/^\s+- key:\s*(\S+)\s*$/u)
    if (keyMatch) {
      currentKey = keyMatch[1]
      continue
    }
    const valueMatch = line.match(/^\s+value:\s*"?([^"\r\n]+)"?\s*$/u)
    if (currentKey && valueMatch) {
      values.set(currentKey, valueMatch[1].trim())
      currentKey = ''
    }
  }
  return values
}

function isPostgresUrl(value) {
  try {
    const parsed = new URL(value)
    return (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') && Boolean(parsed.hostname && parsed.pathname !== '/')
  } catch {
    return false
  }
}

function isHttpsOriginList(value) {
  const origins = String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
  if (origins.length === 0) return false
  return origins.every((origin) => {
    try {
      const parsed = new URL(origin)
      return parsed.protocol === 'https:' && parsed.origin === origin.replace(/\/+$/u, '') && parsed.pathname === '/'
    } catch {
      return false
    }
  })
}

function isTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0))
    return true
  } catch {
    return false
  }
}

function invalidProductionKeys(source) {
  const invalid = []
  if (source.ASSISTANT_SERVICE_MODE?.trim().toLowerCase() !== 'studio') invalid.push('ASSISTANT_SERVICE_MODE')
  if (!isPostgresUrl(source.STUDIO_DATABASE_URL?.trim() || '')) invalid.push('STUDIO_DATABASE_URL')
  const token = source.STUDIO_ADMIN_TOKEN?.trim() || ''
  if (token.length < 16 || /^(?:change-me|replace|qwer1234)$/iu.test(token)) invalid.push('STUDIO_ADMIN_TOKEN')
  if (!isHttpsOriginList(source.AI_DAILY_PUBLIC_CORS_ORIGINS)) invalid.push('AI_DAILY_PUBLIC_CORS_ORIGINS')
  if (!isTimeZone(source.AI_DAILY_TIME_ZONE?.trim() || '')) invalid.push('AI_DAILY_TIME_ZONE')
  if (!/^(?:true|false|1|0|yes|no|on|off)$/iu.test(source.AI_DAILY_PUBLIC_FEED_ENABLED?.trim() || '')) {
    invalid.push('AI_DAILY_PUBLIC_FEED_ENABLED')
  }
  for (const key of ['AI_DAILY_BUSINESS_EVALUATION_ENABLED', 'AI_DAILY_PRODUCTION_GENERATION_ENABLED']) {
    if (!/^(?:true|false|1|0|yes|no|on|off)$/iu.test(source[key]?.trim() || '')) invalid.push(key)
  }
  if (!isAbsolute(source.AI_DAILY_MODEL_APPROVAL_FILE?.trim() || '')) invalid.push('AI_DAILY_MODEL_APPROVAL_FILE')
  if (!/^[a-f0-9]{64}$/u.test(source.AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH?.trim() || '')) {
    invalid.push('AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH')
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/u.test(source.AI_DAILY_MODEL_EVALUATION_APPROVAL_ID?.trim() || '')) {
    invalid.push('AI_DAILY_MODEL_EVALUATION_APPROVAL_ID')
  }
  if (!/^(?:true|1|yes|on)$/iu.test(source.TRUST_PROXY?.trim() || '')) invalid.push('TRUST_PROXY')
  return invalid
}

function parseArgs(argv) {
  return { strict: argv.includes('--strict'), json: argv.includes('--json') }
}

function check(id, label, ok, detail, status = ok ? 'pass' : 'fail') {
  return { id, label, ok, status, detail }
}

function runOfflineContract(script) {
  const result = runOfflineCommand(script)
  return result.status === 0 && !result.error && !result.signal
}

function runOfflineCommand(script, scriptArgs = []) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const npmArgs = ['--silent', 'run', script, ...(scriptArgs.length > 0 ? ['--', ...scriptArgs] : [])]
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', [npmCommand, ...npmArgs].join(' ')], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120_000,
      })
    : spawnSync(npmCommand, npmArgs, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
        timeout: 120_000,
      })
  return result
}

async function fileExists(relativePath) {
  try {
    await access(resolve(repoRoot, relativePath), constants.F_OK)
    return true
  } catch {
    return false
  }
}

function parseJsonOutput(value) {
  const text = String(value || '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const [packageText, envExample, renderYaml, pipelineDoc, runnerSource, manifestText] = await Promise.all([
    readFile(resolve(repoRoot, 'package.json'), 'utf8'),
    readFile(resolve(repoRoot, '.env.example'), 'utf8'),
    readFile(resolve(repoRoot, 'render.yaml'), 'utf8'),
    readFile(resolve(repoRoot, 'docs/ai-daily-pipeline.md'), 'utf8'),
    readFile(resolve(repoRoot, 'server/scripts/ai-daily-runner.ts'), 'utf8'),
    readFile(resolve(repoRoot, 'server/data/ai-daily-source-manifest.v1.json'), 'utf8'),
  ])
  const packageJson = JSON.parse(packageText)
  const scripts = packageJson.scripts ?? {}
  const results = []

  const requiredScripts = [
    'ai-daily:ingest-tick',
    'ai-daily:editorial-tick',
    'ai-daily:run',
    'ai-daily:compose',
    'ai-daily:resume',
    'ai-daily:contracts-check',
    'ai-daily:manifest-check',
    'ai-daily:model-evaluation-check',
    'ai-daily:model-runtime-check',
    'ai-daily:model-approval-check',
    'ai-daily:model-evaluate',
    'ai-daily:model-approve',
    'ai-daily:acceptance',
    'ai-daily:acceptance-check',
    'ai-daily:observability-contract-check',
  ]
  const missingScripts = requiredScripts.filter((name) => typeof scripts[name] !== 'string')
  results.push(
    check(
      'runner-scripts',
      'Durable runner commands',
      missingScripts.length === 0,
      missingScripts.length === 0 ? `${requiredScripts.length} commands declared` : `missing ${missingScripts.join(', ')}`,
    ),
  )

  let curationManifest = null
  try {
    curationManifest = JSON.parse(manifestText)
  } catch {
    curationManifest = null
  }
  const curationSources = Array.isArray(curationManifest?.sources) ? curationManifest.sources : []
  const curationQueryGroups = Array.isArray(curationManifest?.queryGroups) ? curationManifest.queryGroups : []
  const curationShapeOk =
    curationManifest?.schemaVersion === 'ai-daily-source-curation-v1' &&
    curationSources.length >= 30 &&
    curationSources.length <= 80 &&
    curationQueryGroups.length >= 4
  const curationPendingSafe =
    curationManifest?.readiness !== 'pending-human-review' ||
    (curationSources.every((source) => source?.enabled === false) && curationQueryGroups.every((group) => group?.enabled === false))
  const curationContractOk = runOfflineContract('ai-daily:manifest-check')
  const curationReady = curationShapeOk && curationPendingSafe && curationContractOk
  const curationIsApproved = curationReady && curationManifest.readiness === 'approved'
  const enabledSourceCount = curationSources.filter((source) => source?.enabled === true).length
  const enabledQueryGroupCount = curationQueryGroups.filter((group) => group?.enabled === true).length
  results.push(
    check(
      'source-curation-manifest',
      'Versioned source and query-group curation',
      curationReady,
      curationReady
        ? curationIsApproved
          ? `${enabledSourceCount}/${curationSources.length} approved sources and ${enabledQueryGroupCount}/${curationQueryGroups.length} approved query groups enabled`
          : `${curationSources.length} source candidates and ${curationQueryGroups.length} query groups recorded; manual review remains`
        : curationContractOk
          ? 'manifest is missing, malformed, outside the source-count bounds, or enables pending candidates'
          : 'manifest contract check failed; run npm.cmd run ai-daily:manifest-check for details',
      curationIsApproved ? 'pass' : curationReady ? 'manual-gate' : 'fail',
    ),
  )

  const modelEvaluationContractOk =
    runOfflineContract('ai-daily:model-evaluation-check') &&
    runOfflineContract('ai-daily:model-runtime-check')
  results.push(
    check(
      'model-evaluation-contract',
      'Offline three-role model evaluation contract',
      modelEvaluationContractOk,
      modelEvaluationContractOk
        ? 'Golden case-set, category/negative-slice floors, three-role evaluation, tamper detection, explicit bundle hash, and runtime drift contracts passed with local/loopback fixtures'
        : 'model evaluation contract failed; run npm.cmd run ai-daily:model-evaluation-check for details',
    ),
  )

  const acceptanceContractOk = runOfflineContract('ai-daily:acceptance-check')
  results.push(
    check(
      'acceptance-manifest-contract',
      'Offline acceptance manifest contract',
      acceptanceContractOk,
      acceptanceContractOk
        ? 'Proposal, approval bundle, production edition, Studio review, export, deployment, and tamper bindings pass with zero provider calls'
        : 'Acceptance manifest contract failed; run npm.cmd run ai-daily:acceptance-check for details',
    ),
  )

  const acceptanceRecordPath = 'server/data/ai-daily-acceptance.local.json'
  const acceptanceRecordExists = await fileExists(acceptanceRecordPath)
  const acceptanceRecordCommand = acceptanceRecordExists
    ? runOfflineCommand('ai-daily:acceptance', ['check', '--require-sealed'])
    : null
  const acceptanceRecordPayload = acceptanceRecordCommand ? parseJsonOutput(acceptanceRecordCommand.stdout) : null
  const acceptanceReady = acceptanceRecordCommand?.status === 0 && acceptanceRecordPayload?.ok === true
  const acceptanceManualIssues = new Set([
    'acceptance-artifacts-required',
    'acceptance-artifact-pair-required',
    'acceptance-artifact-pair-incomplete',
    'live-edition-required',
    'studio-review-required',
    'publish-export-required',
    'deployment-observation-required',
    'acceptance-record-hash-required',
    'acceptance-not-ready',
  ])
  const acceptanceIssues = Array.isArray(acceptanceRecordPayload?.issues) ? acceptanceRecordPayload.issues : []
  const acceptanceRecordInvalid = acceptanceRecordExists && (!acceptanceRecordPayload || acceptanceIssues.some((issue) => !acceptanceManualIssues.has(issue)))
  results.push(
    check(
      'first-edition-acceptance-record',
      'First production edition acceptance record',
      acceptanceReady,
      acceptanceReady
        ? 'Sealed acceptance manifest verifies the approved artifacts and all five post-generation gates'
        : acceptanceRecordInvalid
          ? 'Acceptance manifest exists but is invalid or tampered; run npm.cmd run ai-daily:acceptance -- check for details'
          : 'manual gate: complete the approved live edition, Studio review/export, deployment observation, and seal the local acceptance manifest',
      acceptanceReady ? 'pass' : acceptanceRecordInvalid ? 'fail' : 'manual-gate',
    ),
  )

  const modelDeliveryKeys = [
    'AI_DAILY_MODEL_RUNTIME_JSON',
    'AI_DAILY_MODEL_APPROVAL_FILE',
    'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH',
  ]
  const configuredModelDeliveryKeys = modelDeliveryKeys.filter((key) => hasValue(process.env[key]))
  const modelDeliveryConfigured = configuredModelDeliveryKeys.length === modelDeliveryKeys.length
  const modelDeliveryValid = modelDeliveryConfigured && runOfflineContract('ai-daily:model-approval-check')
  const modelDeliveryStatus = configuredModelDeliveryKeys.length === 0
    ? 'manual-gate'
    : modelDeliveryValid
      ? 'pass'
      : 'fail'
  results.push(
    check(
      'model-approval-delivery',
      'Production approval bundle delivery',
      modelDeliveryValid,
      modelDeliveryValid
        ? 'Configured approval file, expected bundle hash, and runtime channel identities agree; no provider call was made'
        : configuredModelDeliveryKeys.length === 0
          ? 'manual gate: create and upload the approved Render Secret File, then configure its path and bundle hash'
          : modelDeliveryConfigured
            ? 'configured approval delivery is invalid; run npm.cmd run ai-daily:model-approval-check for the stable failure category'
            : `partial approval delivery configuration; missing ${modelDeliveryKeys.filter((key) => !configuredModelDeliveryKeys.includes(key)).join(', ')}`,
      modelDeliveryStatus,
    ),
  )

  const requiredEnvKeys = [
    'AI_DAILY_TIME_ZONE',
    'AI_DAILY_PUBLIC_CORS_ORIGINS',
    'AI_DAILY_PUBLIC_WINDOW_HOURS',
    'AI_DAILY_PUBLIC_STALE_MINUTES',
    'AI_DAILY_PUBLIC_RATE_LIMIT',
    'AI_DAILY_PUBLIC_RATE_WINDOW_MS',
    'AI_DAILY_PUBLIC_FEED_ENABLED',
    'AI_DAILY_MODEL_RUNTIME_JSON',
    'AI_DAILY_MODEL_APPROVAL_FILE',
    'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH',
    'AI_DAILY_BUSINESS_EVALUATION_ENABLED',
    'AI_DAILY_MODEL_EVALUATION_APPROVAL_ID',
    'AI_DAILY_PRODUCTION_GENERATION_ENABLED',
  ]
  const missingEnvKeys = requiredEnvKeys.filter((key) => !new RegExp(`^${key}=`, 'mu').test(envExample))
  results.push(
    check(
      'env-inventory',
      'Repository environment inventory',
      missingEnvKeys.length === 0,
      missingEnvKeys.length === 0 ? `${requiredEnvKeys.length} public/runtime keys documented` : `missing ${missingEnvKeys.join(', ')}`,
    ),
  )

  const studioService = extractRenderServiceBlock(renderYaml, 'biau-content-studio-api')
  const studioEnv = parseRenderEnvValues(studioService)
  const requiredRenderKeys = [
    'AI_DAILY_PUBLIC_CORS_ORIGINS',
    'STUDIO_DATABASE_URL',
    'AI_DAILY_TIME_ZONE',
    'AI_DAILY_PUBLIC_FEED_ENABLED',
    'AI_DAILY_MODEL_RUNTIME_JSON',
    'AI_DAILY_MODEL_APPROVAL_FILE',
    'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH',
    'AI_DAILY_BUSINESS_EVALUATION_ENABLED',
    'AI_DAILY_MODEL_EVALUATION_APPROVAL_ID',
    'AI_DAILY_PRODUCTION_GENERATION_ENABLED',
  ]
  const missingRenderKeys = requiredRenderKeys.filter((key) => !studioService.includes(`- key: ${key}`))
  const renderContractOk =
    studioService.length > 0 &&
    studioEnv.get('ASSISTANT_SERVICE_MODE') === 'studio' &&
    studioEnv.get('AI_DAILY_TIME_ZONE') === 'Asia/Shanghai' &&
    studioEnv.get('AI_DAILY_PUBLIC_FEED_ENABLED') === 'false' &&
    studioEnv.get('AI_DAILY_MODEL_APPROVAL_FILE') === renderApprovalFilePath &&
    studioEnv.get('AI_DAILY_BUSINESS_EVALUATION_ENABLED') === 'false' &&
    studioEnv.get('AI_DAILY_PRODUCTION_GENERATION_ENABLED') === 'false' &&
    missingRenderKeys.length === 0
  results.push(
    check(
      'studio-deployment-contract',
      'Studio deployment contract',
      renderContractOk,
      renderContractOk ? 'Studio service is explicit and public feed is fail-closed by default' : `missing or invalid ${missingRenderKeys.join(', ') || 'Studio service values'}`,
    ),
  )

  const observabilityContractOk = runOfflineContract('ai-daily:observability-contract-check')
  results.push(
    check(
      'operations-observability-contract',
      'AI Daily dashboard and alert contract',
      observabilityContractOk,
      observabilityContractOk
        ? 'Six fixed failure categories are covered by repository dashboard and alert assets'
        : 'AI Daily dashboard or alert contract failed; run npm.cmd run ai-daily:observability-contract-check for details',
    ),
  )

  const cronDocumented =
    pipelineDoc.includes('| Ingest Cron | `*/15 * * * *` |') &&
    pipelineDoc.includes('| Editorial Cron | `0 * * * *` |') &&
    pipelineDoc.includes('deadline 必须短于调度间隔') &&
    pipelineDoc.includes('AI_DAILY_MODEL_APPROVAL_FILE=/etc/secrets/ai-daily-model-approval.v1.json') &&
    pipelineDoc.includes('只在 Studio 上传文件不能让 Editorial Cron 读取它')
  results.push(
    check(
      'cron-runbook',
      'Render Cron runbook',
      cronDocumented,
      cronDocumented ? 'UTC schedules and deadline rule documented' : 'Cron schedule/deadline documentation is incomplete',
    ),
  )

  const cronBlueprintPresent = /^  - type:\s*cron\s*$/imu.test(renderYaml)
  results.push(
    check(
      'cron-platform-gate',
      'Render Cron blueprint',
      cronBlueprintPresent,
      cronBlueprintPresent ? 'Cron services are declared in render.yaml' : 'manual gate: keep Cron disabled until live provider and approval gates are complete',
      cronBlueprintPresent ? 'pass' : 'manual-gate',
    ),
  )

  const liveEditorialProviderImplemented =
    runnerSource.includes("process.argv.includes('--live')") &&
    runnerSource.includes('buildAiDailyProductionProviders') &&
    runnerSource.includes("profile: 'PRODUCTION'")
  results.push(
    check(
      'editorial-provider-gate',
      'Production editorial provider path',
      liveEditorialProviderImplemented,
      liveEditorialProviderImplemented
        ? 'Production provider path is implemented and remains fail-closed behind --live, approval bundle, and environment enablement'
        : 'manual gate: production provider path is missing',
      liveEditorialProviderImplemented ? 'pass' : 'manual-gate',
    ),
  )

  const migrationFiles = [
    'prisma/migrations/20260718010000_ai_daily_generation_runner/migration.sql',
    'prisma/migrations/20260719020000_ai_daily_public_feed_index/migration.sql',
  ]
  const missingMigrations = []
  for (const migration of migrationFiles) {
    if (!(await fileExists(migration))) missingMigrations.push(migration)
  }
  results.push(
    check(
      'migrations',
      'AI Daily migration artifacts',
      missingMigrations.length === 0,
      missingMigrations.length === 0 ? `${migrationFiles.length} migration artifacts present` : `missing ${missingMigrations.join(', ')}`,
    ),
  )

  const rollbackDocumented =
    pipelineDoc.includes('暂停两个 Cron') &&
    /AI_DAILY_PUBLIC_FEED_ENABLED[^\n]{0,80}(?:false|关闭)/u.test(pipelineDoc) &&
    pipelineDoc.includes('保留 Studio 手动编辑和离线导出路径')
  results.push(
    check(
      'rollback',
      'Non-destructive rollback',
      rollbackDocumented,
      rollbackDocumented ? 'Cron/public-feed disable path is documented' : 'rollback instructions are incomplete',
    ),
  )

  const productionKeys = [
    'ASSISTANT_SERVICE_MODE',
    'STUDIO_DATABASE_URL',
    'STUDIO_ADMIN_TOKEN',
    'AI_DAILY_PUBLIC_CORS_ORIGINS',
    'AI_DAILY_TIME_ZONE',
    'AI_DAILY_PUBLIC_FEED_ENABLED',
    'AI_DAILY_MODEL_RUNTIME_JSON',
    'AI_DAILY_MODEL_APPROVAL_FILE',
    'AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH',
    'AI_DAILY_MODEL_EVALUATION_APPROVAL_ID',
    'AI_DAILY_BUSINESS_EVALUATION_ENABLED',
    'AI_DAILY_PRODUCTION_GENERATION_ENABLED',
    'TRUST_PROXY',
  ]
  const configuredKeys = productionKeys.filter((key) => hasValue(process.env[key]))
  const missingProductionKeys = productionKeys.filter((key) => !hasValue(process.env[key]))
  const invalidConfiguredKeys = invalidProductionKeys(process.env).filter((key) => !missingProductionKeys.includes(key))
  const environmentReady = missingProductionKeys.length === 0 && invalidConfiguredKeys.length === 0
  results.push(
    check(
      'local-environment',
      'Current process environment',
      environmentReady,
      environmentReady
        ? `${configuredKeys.length}/${productionKeys.length} production keys are configured`
        : `${configuredKeys.length}/${productionKeys.length} production keys configured; missing ${missingProductionKeys.join(', ') || 'none'}; invalid ${invalidConfiguredKeys.join(', ') || 'none'}`,
      environmentReady ? 'pass' : 'manual-gate',
    ),
  )

  const structuralFailures = results.filter((item) => item.status === 'fail')
  const strictFailures = args.strict ? results.filter((item) => item.status === 'manual-gate') : []
  const report = {
    checkedAt: new Date().toISOString(),
    networkCalls: 0,
    strict: args.strict,
    ok: structuralFailures.length === 0 && strictFailures.length === 0,
    results,
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('AI Daily production readiness (offline)')
    for (const item of results) console.log(`${item.status === 'pass' ? '[pass]' : item.status === 'manual-gate' ? '[gate]' : '[fail]'} ${item.label}: ${item.detail}`)
    console.log(`Network calls: ${report.networkCalls}`)
    console.log(`Result: ${report.ok ? 'ready for the next gate' : 'blocked by repository/strict checks'}`)
  }

  if (!report.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
