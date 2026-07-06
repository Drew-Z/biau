import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/xunqiu-synthetic.json')
const DEFAULT_TIMEOUT_MS = 12_000
const forceUnconfiguredFlags = new Set(['--force-unconfigured', '--force'])
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
    artifactRoots: parseArtifactRoots(
      process.env.XUNQIU_APK_ARTIFACT_ROOTS || process.env.XUNQIU_APK_ARTIFACT_ROOT || '',
    ),
    forceUnconfigured: process.env.XUNQIU_SYNTHETIC_FORCE_UNCONFIGURED === '1',
  }

  const readValue = (index) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--strict') {
      args.strict = true
      continue
    }
    if (forceUnconfiguredFlags.has(item)) {
      args.forceUnconfigured = true
      continue
    }
    if (item === '--artifact-root') {
      args.artifactRoots.push(String(readValue(index) || '').trim())
      index += 1
      continue
    }
    if (item.startsWith('--artifact-root=')) {
      args.artifactRoots.push(String(item.slice('--artifact-root='.length) || '').trim())
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
  args.artifactRoots = args.artifactRoots.filter(Boolean)
  return args
}

function parseArtifactRoots(value) {
  return String(value || '')
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
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
  if (response.error && response.status === 0) return 'offline'
  if ([401, 403, 404, 405, 408, 409, 425, 429].includes(response.status)) return 'degraded'
  if (response.status > 0) return 'offline'
  return 'unchecked'
}

function issueFromResponse(response, fallback = '') {
  if (response.ok) return fallback
  if (fallback) return fallback
  if (response.errorKind) return `request failed: ${response.errorKind}`
  if (response.error) return 'request failed: network_error'
  if (response.status === 401 || response.status === 403) return 'requires authentication'
  if (response.status === 429) return 'rate limited'
  if (response.status >= 500) return `server returned HTTP ${response.status}`
  return response.status > 0 ? `HTTP ${response.status}` : 'request failed'
}

async function tryReadExistingReport() {
  try {
    return JSON.parse(await readFile(outputPath, 'utf8'))
  } catch {
    return null
  }
}

function summarizeExistingReport(report) {
  if (!report || !Array.isArray(report.checks)) return 'existing report'
  const counts = report.checks.reduce(
    (summary, check) => {
      if (check && typeof check.status === 'string' && check.status in summary) summary[check.status] += 1
      return summary
    },
    { online: 0, degraded: 0, offline: 0, unchecked: 0 },
  )
  const gate = report.apkGate?.status ? `, apkGate=${report.apkGate.status}` : ''
  return `online=${counts.online} degraded=${counts.degraded} offline=${counts.offline} unchecked=${counts.unchecked}${gate}`
}

function classifyFetchError(error) {
  if (!error || typeof error !== 'object') return 'network_error'
  const code =
    typeof error.code === 'string'
      ? error.code
      : error.cause && typeof error.cause === 'object'
        ? (error.cause.code ?? '')
        : ''

  if (error.name === 'AbortError' || code === 'ETIMEDOUT') return 'timeout'
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns_error'
  if (
    code === 'CERT_HAS_EXPIRED' ||
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
  ) {
    return 'tls_error'
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') return 'connection_error'
  return 'network_error'
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
      errorKind: '',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      json: null,
      error: error instanceof Error ? error.message : String(error),
      errorKind: classifyFetchError(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function checkFromResponse(id, response, ok, summary, fallbackIssue = '') {
  const issue = ok ? '' : issueFromResponse(response, fallbackIssue)
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

async function listApkArtifacts(roots) {
  const artifacts = []

  async function walk(dir, rootLabel) {
    let entries = []
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath, rootLabel)
        continue
      }
      if (!entry.isFile() || !/\.(apk|aab)$/i.test(entry.name)) continue
      const fileStat = await stat(fullPath).catch(() => null)
      const normalized = fullPath.replace(/\\/g, '/').toLowerCase()
      artifacts.push({
        fileName: entry.name,
        buildType: classifyArtifactBuildType(normalized),
        sizeBytes: fileStat?.size ?? 0,
        updatedAt: fileStat?.mtime ? fileStat.mtime.toISOString() : '',
        source: rootLabel,
      })
    }
  }

  for (const [index, root] of roots.entries()) {
    await walk(root, `artifact-root-${index + 1}`)
  }

  return artifacts.sort((left, right) => `${left.buildType}:${left.fileName}`.localeCompare(`${right.buildType}:${right.fileName}`))
}

function classifyArtifactBuildType(normalizedPath) {
  if (normalizedPath.includes('/debug/') || normalizedPath.includes('-debug')) return 'debug'
  if (normalizedPath.includes('/downloads/') || normalizedPath.includes('latest-xunqiu64') || normalizedPath.includes('stage')) {
    return 'stage'
  }
  if (normalizedPath.includes('/release/') || normalizedPath.includes('-release')) return 'release-like'
  return 'unknown'
}

function summarizeApkGate(artifacts, artifactRootsConfigured) {
  const stageArtifacts = artifacts.filter((artifact) => artifact.buildType === 'stage')
  const releaseLikeArtifacts = artifacts.filter((artifact) => artifact.buildType === 'release-like')
  const debugArtifacts = artifacts.filter((artifact) => artifact.buildType === 'debug')
  const unknownArtifacts = artifacts.filter((artifact) => artifact.buildType === 'unknown')
  const publicDownloadApproved = false
  const status = !artifactRootsConfigured
    ? 'not-configured'
    : stageArtifacts.length > 0
      ? 'stage-apk-found'
      : releaseLikeArtifacts.length > 0
        ? 'release-like-artifact-found'
        : debugArtifacts.length > 0
          ? 'debug-only'
          : artifacts.length > 0
            ? 'unknown-artifact-found'
            : 'no-artifact'

  return {
    status,
    publicDownloadApproved,
    stageArtifactCount: stageArtifacts.length,
    releaseLikeArtifactCount: releaseLikeArtifacts.length,
    debugArtifactCount: debugArtifacts.length,
    unknownArtifactCount: unknownArtifacts.length,
    summary: apkGateSummary(status),
    artifacts: artifacts.slice(0, 20).map((artifact) => ({
      fileName: artifact.fileName,
      buildType: artifact.buildType,
      sizeBytes: artifact.sizeBytes,
      updatedAt: artifact.updatedAt,
      source: artifact.source,
    })),
  }
}

function apkGateSummary(status) {
  if (status === 'not-configured') return 'APK artifact roots are not configured; public release remains gated.'
  if (status === 'stage-apk-found') return 'A stage APK was found; it may be shown as a stage package but is not a formal approved release.'
  if (status === 'release-like-artifact-found') return 'Release-like artifacts were found, but public download still needs signing, checksum, regression evidence, and approval.'
  if (status === 'debug-only') return 'Only debug APK artifacts were found; public download remains gated.'
  if (status === 'unknown-artifact-found') return 'APK/AAB artifacts were found but build type is unclear; public download remains gated.'
  return 'No APK/AAB artifacts were found in configured artifact roots.'
}

function apkGateCheck(apkGate) {
  const hasEvidence = apkGate.status !== 'not-configured'
  return {
    id: 'xunqiu-apk-gate',
    status: apkGate.publicDownloadApproved ? 'online' : hasEvidence ? 'unchecked' : 'unchecked',
    httpStatus: 0,
    durationMs: 0,
    checkedAt: new Date().toISOString(),
    summary: apkGate.summary,
    issues: apkGate.publicDownloadApproved ? [] : ['formal public APK release is not approved'],
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = normalizeBaseUrl(process.env.XUNQIU_SYNTHETIC_API_BASE_URL)
  const checkedAt = new Date().toISOString()
  const checks = []
  const artifactRootsConfigured = args.artifactRoots.length > 0
  const apkGate = summarizeApkGate(await listApkArtifacts(args.artifactRoots), artifactRootsConfigured)

  if (!baseUrl) {
    if (!artifactRootsConfigured && !args.forceUnconfigured) {
      const existingReport = await tryReadExistingReport()
      if (existingReport) {
        console.log(
          `Xunqiu API base URL and APK artifact roots are not configured; preserving existing report (${summarizeExistingReport(
            existingReport,
          )}). Use --force-unconfigured to regenerate unchecked output.`,
        )
        return
      }
    }

    checks.push(
      emptyCheck('xunqiu-backend-health', 'XUNQIU_SYNTHETIC_API_BASE_URL is not configured'),
      emptyCheck('xunqiu-compat-api', 'XUNQIU_SYNTHETIC_API_BASE_URL is not configured'),
      apkGateCheck(apkGate),
    )
    await writeReport({ checkedAt, apiBaseConfigured: false, apkGate, checks })
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
  checks.push(apkGateCheck(apkGate))

  await writeReport({ checkedAt, apiBaseConfigured: true, apkGate, checks })
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
    apkGate: report.apkGate,
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
