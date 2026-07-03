import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/xunqiu-synthetic.json')
const DEFAULT_TIMEOUT_MS = 12_000
const CHECK_IDS = ['xunqiu-backend-health', 'xunqiu-compat-api', 'xunqiu-apk-gate']
const COMPAT_ENDPOINTS = [
  {
    name: 'tweets',
    path: '/apis/tweet/upToDateList?login_user_id=1&count=2',
  },
  {
    name: 'videos',
    path: '/apis/video/getVideosByPage?login_user_id=1&count=2',
  },
  {
    name: 'team',
    path: '/apis/team/index?login_user_id=1&teamId=1',
  },
  {
    name: 'pitches',
    path: '/api/v1/pitches?count=2',
  },
]

function parseArgs(argv) {
  const args = {
    strict: process.env.XUNQIU_SYNTHETIC_STRICT === '1',
    timeoutMs: Number(process.env.XUNQIU_SYNTHETIC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
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

async function requestJson(baseUrl, path, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'biau-xunqiu-synthetic/1.0',
      },
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

function checkFromResponse(id, response, ok, summary, fallbackIssue = '') {
  const issue = ok ? '' : response.error || issueFromResponse(response, fallbackIssue)
  return {
    id,
    status: statusFromResponse(response, ok),
    httpStatus: response.status,
    durationMs: response.durationMs,
    checkedAt: new Date().toISOString(),
    summary,
    issues: issue ? [issue] : [],
  }
}

function mergeStatuses(results) {
  if (results.some((result) => result.status === 'offline')) return 'offline'
  if (results.some((result) => result.status === 'degraded')) return 'degraded'
  if (results.every((result) => result.status === 'online')) return 'online'
  return 'unchecked'
}

function compatCheckFromResults(results) {
  const status = mergeStatuses(results)
  const durationMs = results.reduce((total, result) => total + result.durationMs, 0)
  const httpStatus = results.find((result) => result.status !== 'online')?.httpStatus ?? results[0]?.httpStatus ?? 0
  const issues = results.flatMap((result) => result.issues)
  const onlineCount = results.filter((result) => result.status === 'online').length

  return {
    id: 'xunqiu-compat-api',
    status,
    httpStatus,
    durationMs,
    checkedAt: new Date().toISOString(),
    summary:
      status === 'online'
        ? 'Compatibility APIs returned expected legacy status envelopes'
        : `Compatibility APIs checked ${onlineCount}/${results.length} endpoints successfully`,
    issues,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = normalizeBaseUrl(process.env.XUNQIU_SYNTHETIC_API_BASE_URL)
  const checkedAt = new Date().toISOString()
  const checks = []

  if (!baseUrl) {
    checks.push(...CHECK_IDS.map((id) => emptyCheck(id, 'XUNQIU_SYNTHETIC_API_BASE_URL is not configured')))
    await writeReport({ checkedAt, apiBaseConfigured: false, checks })
    console.log('Xunqiu synthetic report generated without API base URL; all live checks are unchecked.')
    return
  }

  const health = await requestJson(baseUrl, '/actuator/health', args.timeoutMs)
  const healthOk = health.ok && health.json?.status === 'UP'
  checks.push(
    checkFromResponse(
      'xunqiu-backend-health',
      health,
      healthOk,
      healthOk ? 'Backend health returned status=UP' : 'Backend health did not confirm status=UP',
    ),
  )

  const compatResults = []
  for (const endpoint of COMPAT_ENDPOINTS) {
    const response = await requestJson(baseUrl, endpoint.path, args.timeoutMs)
    const ok = response.ok && response.json?.status === 0
    compatResults.push(
      checkFromResponse(
        endpoint.name,
        response,
        ok,
        ok ? `${endpoint.name} compatibility endpoint returned status=0` : `${endpoint.name} compatibility endpoint failed`,
        `${endpoint.name} compatibility endpoint did not return status=0`,
      ),
    )
  }
  checks.push(compatCheckFromResults(compatResults))
  checks.push(emptyCheck('xunqiu-apk-gate', 'APK release gate requires a separate release artifact check'))

  await writeReport({ checkedAt, apiBaseConfigured: true, checks })
  console.log(
    `Xunqiu synthetic report generated: online=${checks.filter((check) => check.status === 'online').length} unchecked=${checks.filter((check) => check.status === 'unchecked').length} offline=${checks.filter((check) => check.status === 'offline').length}`,
  )

  if (args.strict && checks.some((check) => check.status === 'offline')) process.exitCode = 1
}

async function writeReport(report) {
  const payload = {
    checkedAt: report.checkedAt,
    apiBaseConfigured: report.apiBaseConfigured,
    hasCredentials: false,
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
