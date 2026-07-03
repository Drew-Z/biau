import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/pet-gamer-synthetic.json')
const DEFAULT_BASE_URL = 'https://biau.playlab.eu.cc'
const DEFAULT_TIMEOUT_MS = 12_000
const CHECK_ID = 'pet-showcase'

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
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      contentType: '',
      body: '',
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function validateShowcasePage(response) {
  const issues = []

  if (!response.ok) {
    issues.push(`showcase page: HTTP ${response.status || 'request failed'}${response.error ? ` (${response.error})` : ''}`)
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

  return issues
}

function validateScreenshot(path, response) {
  if (!response.ok) {
    return [`${path}: HTTP ${response.status || 'request failed'}${response.error ? ` (${response.error})` : ''}`]
  }
  if (response.contentType && !response.contentType.startsWith('image/')) {
    return [`${path}: expected image response`]
  }
  return []
}

function statusFromIssues(issues) {
  return issues.length === 0 ? 'online' : 'offline'
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
  const payload = {
    checkedAt,
    baseConfigured: true,
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
