import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/erp-synthetic.json')
const DEFAULT_TIMEOUT_MS = 12_000
const CHECK_IDS = ['ozon-erp-health', 'ozon-erp-auth', 'ozon-erp-plugin-sync']
const REGISTRATION_STATUS = {
  OPEN: 'open',
  CLOSED_BY_ENV: 'closed-by-env',
  DEPLOY_STALE: 'deploy-stale',
  BLOCKED: 'blocked',
  UNCHECKED: 'unchecked',
}

function parseArgs(argv) {
  const args = {
    strict: process.env.ERP_SYNTHETIC_STRICT === '1',
    timeoutMs: Number(process.env.ERP_SYNTHETIC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  }

  const readValue = (index) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--strict') {
      args.strict = true
      continue
    }
    if (item === '--timeout') {
      args.timeoutMs = Number(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--timeout=')) {
      args.timeoutMs = Number(item.slice('--timeout='.length))
    }
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) args.timeoutMs = DEFAULT_TIMEOUT_MS
  return args
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, '')
}

function emptyCheck(id, summary, issues = []) {
  return {
    id,
    status: 'unchecked',
    httpStatus: 0,
    durationMs: 0,
    checkedAt: new Date().toISOString(),
    summary,
    issues,
  }
}

function statusFromResponse(response, ok) {
  if (ok) return 'online'
  if ([401, 403, 404, 405, 408, 409, 425, 429].includes(response.status)) return 'degraded'
  if (response.status > 0) return 'offline'
  return 'unchecked'
}

function issueFromResponse(response, fallback = '') {
  if (response.ok) return fallback
  if (fallback) return fallback
  if (response.status === 401 || response.status === 403) return 'requires authentication'
  if (response.status === 429) return 'rate limited'
  if (response.status >= 500) return `server returned HTTP ${response.status}`
  return response.status > 0 ? `HTTP ${response.status}` : 'request failed'
}

async function requestJson(baseUrl, path, options, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'biau-erp-synthetic/1.0',
    ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options?.headers ?? {}),
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    const json = await response.json().catch(() => null)
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      json,
      error: '',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      json: null,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function dataFromWrappedResponse(response) {
  if (!response.json || typeof response.json !== 'object') return null
  const payload = response.json
  if ('data' in payload && payload.data && typeof payload.data === 'object') return payload.data
  return payload
}

function checkFromResponse(id, response, ok, summary, fallbackIssue = '', statusOverride = '') {
  const issue = fallbackIssue || (ok ? '' : response.error || issueFromResponse(response, fallbackIssue))
  return {
    id,
    status: statusOverride || statusFromResponse(response, ok),
    httpStatus: response.status,
    durationMs: response.durationMs,
    checkedAt: new Date().toISOString(),
    summary,
    issues: issue ? [issue] : [],
  }
}

function hasLoginShape(data) {
  if (!data || typeof data !== 'object') return false
  const token = typeof data.token === 'string' && data.token.length > 0
  const refreshToken = typeof data.refreshToken === 'string' && data.refreshToken.length > 0
  const user = data.user
  const role = user && typeof user === 'object' && typeof user.role === 'string' && user.role.length > 0
  return token && refreshToken && role
}

function normalizeCommit(value) {
  return String(value || '').trim().toLowerCase()
}

function commitMatches(liveCommit, expectedCommit) {
  const live = normalizeCommit(liveCommit)
  const expected = normalizeCommit(expectedCommit)
  if (!live || !expected) return false
  return live.startsWith(expected) || expected.startsWith(live)
}

function registrationStatusSummary(status) {
  switch (status) {
    case REGISTRATION_STATUS.OPEN:
      return 'Auth bootstrap reports registrationEnabled=true.'
    case REGISTRATION_STATUS.DEPLOY_STALE:
      return 'Auth bootstrap still reports registrationEnabled=false, and the live commit does not match the expected registration-open commit.'
    case REGISTRATION_STATUS.CLOSED_BY_ENV:
      return 'Auth bootstrap reports registrationEnabled=false without a stale-deployment signal.'
    case REGISTRATION_STATUS.BLOCKED:
      return 'ERP health or auth bootstrap could not confirm the production registration state.'
    default:
      return 'ERP registration state was not checked.'
  }
}

function resolveRegistrationStatus({ apiBaseConfigured, healthOk, bootstrapOk, registrationEnabled, liveCommit, expectedCommit }) {
  if (!apiBaseConfigured) return REGISTRATION_STATUS.UNCHECKED
  if (!healthOk || !bootstrapOk) return REGISTRATION_STATUS.BLOCKED
  if (registrationEnabled === true) return REGISTRATION_STATUS.OPEN
  if (expectedCommit && !commitMatches(liveCommit, expectedCommit)) return REGISTRATION_STATUS.DEPLOY_STALE
  return REGISTRATION_STATUS.CLOSED_BY_ENV
}

function registrationIssue(status, liveCommit, expectedCommit) {
  if (status === REGISTRATION_STATUS.DEPLOY_STALE) {
    const live = liveCommit || 'unknown'
    const expected = expectedCommit || 'latest registration-open commit'
    return `deployment is stale; live commit ${live} does not match expected ${expected}`
  }
  if (status === REGISTRATION_STATUS.CLOSED_BY_ENV) {
    return 'production registration is currently closed by environment or policy'
  }
  if (status === REGISTRATION_STATUS.BLOCKED) {
    return 'registration state could not be confirmed'
  }
  return ''
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = normalizeBaseUrl(process.env.ERP_SYNTHETIC_API_BASE_URL)
  const expectedCommit = normalizeCommit(process.env.ERP_SYNTHETIC_EXPECTED_COMMIT)
  const username = String(process.env.ERP_SYNTHETIC_USERNAME || '').trim()
  const password = String(process.env.ERP_SYNTHETIC_PASSWORD || '')
  const hasCredentials = Boolean(username && password)
  const checkedAt = new Date().toISOString()
  const checks = []

  if (!baseUrl) {
    checks.push(...CHECK_IDS.map((id) => emptyCheck(id, 'ERP_SYNTHETIC_API_BASE_URL is not configured')))
    await writeReport({
      checkedAt,
      apiBaseConfigured: false,
      hasCredentials,
      registrationEnabled: null,
      registrationStatus: REGISTRATION_STATUS.UNCHECKED,
      expectedCommitConfigured: Boolean(expectedCommit),
      liveCommit: '',
      checks,
    })
    console.log('ERP synthetic report generated without API base URL; all live checks are unchecked.')
    return
  }

  const health = await requestJson(baseUrl, '/api/health', {}, args.timeoutMs)
  const healthData = dataFromWrappedResponse(health)
  const healthOk = health.ok && healthData?.status === 'ok'
  const liveCommit = typeof healthData?.gitCommit === 'string' ? healthData.gitCommit : ''
  checks.push(
    checkFromResponse(
      'ozon-erp-health',
      health,
      healthOk,
      healthOk ? 'API health returned status=ok' : 'API health did not confirm status=ok',
    ),
  )

  const bootstrap = await requestJson(baseUrl, '/api/auth/bootstrap', {}, args.timeoutMs)
  const bootstrapData = dataFromWrappedResponse(bootstrap)
  const bootstrapOk =
    bootstrap.ok &&
    typeof bootstrapData?.needsSetup === 'boolean' &&
    typeof bootstrapData?.registrationEnabled === 'boolean'
  const registrationEnabled = bootstrapOk ? bootstrapData.registrationEnabled === true : null
  const registrationStatus = resolveRegistrationStatus({
    apiBaseConfigured: true,
    healthOk,
    bootstrapOk,
    registrationEnabled,
    liveCommit,
    expectedCommit,
  })
  const registrationClosedIssue =
    bootstrapOk && registrationEnabled === false ? registrationIssue(registrationStatus, liveCommit, expectedCommit) : ''
  const registrationSummary = bootstrapOk
    ? `Auth bootstrap returned registrationEnabled=${registrationEnabled ? 'true' : 'false'}; registrationStatus=${registrationStatus}`
    : 'Auth bootstrap payload is incomplete'

  if (!hasCredentials) {
    checks.push(
      checkFromResponse(
        'ozon-erp-auth',
        bootstrap,
        bootstrapOk && registrationEnabled === true,
        registrationSummary,
        registrationClosedIssue,
        bootstrapOk && registrationEnabled === false ? 'degraded' : '',
      ),
    )
    checks.push(emptyCheck('ozon-erp-plugin-sync', 'Credentials are required before plugin or sync smoke checks'))
    await writeReport({
      checkedAt,
      apiBaseConfigured: true,
      hasCredentials,
      registrationEnabled,
      registrationStatus,
      expectedCommitConfigured: Boolean(expectedCommit),
      liveCommit,
      checks,
    })
    console.log('ERP health and auth bootstrap checked; login-dependent checks skipped because credentials are not configured.')
    if (args.strict && checks.some((check) => check.status === 'offline')) process.exitCode = 1
    return
  }

  const login = await requestJson(
    baseUrl,
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
    args.timeoutMs,
  )
  const loginData = dataFromWrappedResponse(login)
  const loginOk = login.ok && hasLoginShape(loginData)
  const authOk = bootstrapOk && loginOk && registrationEnabled === true
  const authIssue = registrationClosedIssue || (loginOk ? 'auth bootstrap failed before login smoke' : 'authentication failed or login payload is incomplete')
  checks.push(
    checkFromResponse(
      'ozon-erp-auth',
      login,
      authOk,
      authOk
        ? 'Auth bootstrap returned registrationEnabled=true and login returned expected low-sensitive structures'
        : `Auth bootstrap/login checked; registrationEnabled=${registrationEnabled === true ? 'true' : 'false'}`,
      authIssue,
      bootstrapOk && loginOk && registrationEnabled === false ? 'degraded' : '',
    ),
  )
  checks.push(
    emptyCheck(
      'ozon-erp-plugin-sync',
      loginOk
        ? 'Login succeeded; plugin and sync smoke checks require a future low-sensitive fixture'
        : 'Plugin and sync smoke checks skipped because login smoke did not pass',
      loginOk ? [] : ['login smoke did not pass'],
    ),
  )

  await writeReport({
    checkedAt,
    apiBaseConfigured: true,
    hasCredentials,
    registrationEnabled,
    registrationStatus,
    expectedCommitConfigured: Boolean(expectedCommit),
    liveCommit,
    checks,
  })
  console.log(
    `ERP synthetic report generated: online=${checks.filter((check) => check.status === 'online').length} unchecked=${checks.filter((check) => check.status === 'unchecked').length} offline=${checks.filter((check) => check.status === 'offline').length}`,
  )

  if (args.strict && checks.some((check) => check.status === 'offline')) process.exitCode = 1
}

async function writeReport(report) {
  const payload = {
    checkedAt: report.checkedAt,
    apiBaseConfigured: report.apiBaseConfigured,
    hasCredentials: report.hasCredentials,
    registrationEnabled: typeof report.registrationEnabled === 'boolean' ? report.registrationEnabled : null,
    registrationStatus: report.registrationStatus,
    registrationSummary: registrationStatusSummary(report.registrationStatus),
    expectedCommitConfigured: report.expectedCommitConfigured === true,
    liveCommit: report.liveCommit || null,
    ok: report.checks.every((check) => check.status !== 'offline'),
    checks: report.checks,
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
