import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/pet-gamer-synthetic.json')
const DEFAULT_BASE_URL = 'https://biau.playlab.eu.cc'
const DEFAULT_TIMEOUT_MS = 12_000
const CHECK_ID = 'pet-showcase'
const APK_GATE_CHECK_ID = 'pet-apk-gate'
const DEFAULT_ANDROID_ARTIFACT_ROOT = resolve(
  repoRoot,
  '..',
  'pet',
  'gamer',
  'apps',
  'android-community',
  'app',
  'build',
  'outputs',
)

const showcasePath = '/pet-app-showcase/'
const screenshotPaths = [
  '/images/projects/showcase/android-main.png',
  '/images/projects/showcase/android-hatch.png',
  '/images/projects/showcase/android-community.png',
  '/images/projects/showcase/android-profile.png',
]

function parseArgs(argv) {
  const args = {
    baseUrl: normalizeBaseUrl(
      process.env.PET_SHOWCASE_SYNTHETIC_BASE_URL || process.env.SITE_STATUS_BASE_URL || DEFAULT_BASE_URL,
    ),
    timeoutMs: Number(process.env.PET_SHOWCASE_SYNTHETIC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    artifactRoot: String(process.env.PET_ANDROID_ARTIFACT_ROOT || DEFAULT_ANDROID_ARTIFACT_ROOT).trim(),
    strict: process.env.PET_SHOWCASE_SYNTHETIC_STRICT === '1',
  }

  const readValue = (index) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--strict') {
      args.strict = true
      continue
    }
    if (item === '--base') {
      args.baseUrl = normalizeBaseUrl(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--base=')) {
      args.baseUrl = normalizeBaseUrl(item.slice('--base='.length))
      continue
    }
    if (item === '--timeout') {
      args.timeoutMs = Number(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--timeout=')) {
      args.timeoutMs = Number(item.slice('--timeout='.length))
      continue
    }
    if (item === '--artifact-root') {
      args.artifactRoot = String(readValue(index) || '').trim()
      index += 1
      continue
    }
    if (item.startsWith('--artifact-root=')) {
      args.artifactRoot = String(item.slice('--artifact-root='.length) || '').trim()
    }
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) args.timeoutMs = DEFAULT_TIMEOUT_MS
  return args
}

function normalizeBaseUrl(value) {
  const raw = String(value || DEFAULT_BASE_URL).trim()
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, '')
}

function absoluteUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString()
}

async function fetchWithTimeout(url, timeoutMs, accept) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'biau-pet-showcase-synthetic/1.0',
        Accept: accept || '*/*',
      },
    })
    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('text/') ? await response.text().catch(() => '') : ''
    if (!body) await response.arrayBuffer().catch(() => null)
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      contentType,
      body,
      error: '',
      errorKind: '',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      contentType: '',
      body: '',
      error: error instanceof Error ? error.message : String(error),
      errorKind: classifyFetchError(error),
    }
  } finally {
    clearTimeout(timeout)
  }
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

function issueFromResponse(label, response) {
  if (response.status > 0) return `${label}: HTTP ${response.status}`
  return `${label}: request failed: ${response.errorKind || 'network_error'}`
}

function validateShowcasePage(response) {
  const issues = []

  if (!response.ok) {
    issues.push(issueFromResponse('showcase page', response))
    return issues
  }

  if (!response.contentType.includes('text/html')) issues.push('showcase page: expected HTML response')

  const requiredText = [
    'AI 桌宠社区 App 展示与下载状态',
    '/projects/pet-workspace',
    'APK 待公开构建',
    '公开 APK 前置条件',
    '<link rel="canonical" href="https://biau.playlab.eu.cc/pet-app-showcase/"',
  ]

  for (const text of requiredText) {
    if (!response.body.includes(text)) issues.push(`showcase page: missing ${text}`)
  }

  if (/<a\b[^>]*href=["'][^"']+\.apk(?:[?#][^"']*)?["']/i.test(response.body)) {
    issues.push('showcase page: APK download href is present before release approval')
  }

  return issues
}

function validateScreenshot(path, response) {
  if (!response.ok) {
    return [issueFromResponse(path, response)]
  }
  if (response.contentType && !response.contentType.startsWith('image/')) {
    return [`${path}: expected image response`]
  }
  return []
}

function statusFromIssues(issues) {
  return issues.length === 0 ? 'online' : 'offline'
}

async function listApkArtifacts(root) {
  const artifacts = []
  if (!root) return artifacts

  async function walk(dir) {
    let entries = []
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }
      if (!entry.isFile() || !/\.(apk|aab)$/i.test(entry.name)) continue
      const fileStat = await stat(fullPath).catch(() => null)
      const normalized = fullPath.replace(/\\/g, '/').toLowerCase()
      const buildType = normalized.includes('/release/') ? 'release' : normalized.includes('/debug/') ? 'debug' : 'unknown'
      artifacts.push({
        fileName: entry.name,
        buildType,
        sizeBytes: fileStat?.size ?? 0,
        updatedAt: fileStat?.mtime ? fileStat.mtime.toISOString() : '',
      })
    }
  }

  await walk(root)
  return artifacts.sort((left, right) => left.fileName.localeCompare(right.fileName))
}

function summarizeApkGate(artifacts) {
  const releaseArtifacts = artifacts.filter((artifact) => artifact.buildType === 'release')
  const debugArtifacts = artifacts.filter((artifact) => artifact.buildType === 'debug')
  const unknownArtifacts = artifacts.filter((artifact) => artifact.buildType === 'unknown')

  return {
    status: releaseArtifacts.length > 0 ? 'release-candidate-found' : debugArtifacts.length > 0 ? 'debug-only' : 'no-artifact',
    releaseCandidateCount: releaseArtifacts.length,
    debugArtifactCount: debugArtifacts.length,
    unknownArtifactCount: unknownArtifacts.length,
    publicDownloadApproved: false,
    summary:
      releaseArtifacts.length > 0
        ? 'Release-like APK/AAB artifacts exist locally, but public download still needs signing, checksum, regression evidence, and human approval.'
        : debugArtifacts.length > 0
          ? 'Only debug APK artifacts were found locally; public download remains gated.'
          : 'No APK/AAB artifacts were found in the configured Android artifact output root.',
    artifacts: artifacts.map((artifact) => ({
      fileName: artifact.fileName,
      buildType: artifact.buildType,
      sizeBytes: artifact.sizeBytes,
      updatedAt: artifact.updatedAt,
    })),
  }
}

function apkGateCheck(apkGate, checkedAt) {
  return {
    id: APK_GATE_CHECK_ID,
    status: apkGate.publicDownloadApproved ? 'online' : 'unchecked',
    httpStatus: 0,
    durationMs: 0,
    checkedAt,
    summary: apkGate.summary,
    issues: apkGate.publicDownloadApproved
      ? []
      : ['formal public APK release is not approved; signing, checksum, scan/regression evidence, rollback note, and human approval are required'],
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const checkedAt = new Date().toISOString()
  const page = await fetchWithTimeout(
    absoluteUrl(args.baseUrl, showcasePath),
    args.timeoutMs,
    'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  )
  const screenshotResults = []

  for (const path of screenshotPaths) {
    const response = await fetchWithTimeout(absoluteUrl(args.baseUrl, path), args.timeoutMs, 'image/avif,image/webp,image/png,image/*,*/*;q=0.8')
    screenshotResults.push({ path, response, issues: validateScreenshot(path, response) })
  }

  const issues = [...validateShowcasePage(page), ...screenshotResults.flatMap((result) => result.issues)]
  const status = statusFromIssues(issues)
  const passedScreenshots = screenshotResults.filter((result) => result.issues.length === 0).length
  const apkGate = summarizeApkGate(await listApkArtifacts(args.artifactRoot))
  const payload = {
    checkedAt,
    baseConfigured: true,
    apkGate,
    ok: status === 'online',
    checks: [
      {
        id: CHECK_ID,
        status,
        httpStatus: page.status,
        durationMs: page.durationMs + screenshotResults.reduce((total, result) => total + result.response.durationMs, 0),
        checkedAt,
        summary:
          status === 'online'
            ? `Pet App showcase page and ${passedScreenshots}/${screenshotPaths.length} screenshots returned expected responses`
            : `Pet App showcase check found ${issues.length} issue(s)`,
        issues,
      },
      apkGateCheck(apkGate, checkedAt),
    ],
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`Pet showcase synthetic report generated: ${status} (${passedScreenshots}/${screenshotPaths.length} screenshots passed).`)

  if (args.strict && status !== 'online') process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
