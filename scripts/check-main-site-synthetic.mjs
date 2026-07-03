import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/blog-semi-synthetic.json')
const DEFAULT_BASE_URL = 'https://biau.playlab.eu.cc'
const DEFAULT_TIMEOUT_MS = 12_000
const CHECK_ID = 'blog-semi-public-routes'

const targets = [
  { label: 'home', path: '/', kind: 'page', critical: true },
  { label: 'projects', path: '/projects', kind: 'page', critical: true },
  { label: 'blog', path: '/blog', kind: 'page', critical: true },
  { label: 'assistant', path: '/assistant', kind: 'page', critical: true },
  { label: 'status', path: '/status', kind: 'page', critical: true },
  { label: 'sitemap', path: '/sitemap.xml', kind: 'sitemap', critical: false },
  { label: 'robots', path: '/robots.txt', kind: 'robots', critical: false },
]

function parseArgs(argv) {
  const args = {
    baseUrl: normalizeBaseUrl(process.env.MAIN_SITE_SYNTHETIC_BASE_URL || process.env.SITE_STATUS_BASE_URL || DEFAULT_BASE_URL),
    timeoutMs: Number(process.env.MAIN_SITE_SYNTHETIC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    strict: process.env.MAIN_SITE_SYNTHETIC_STRICT === '1',
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

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'biau-main-site-synthetic/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
      },
    })
    const body = await response.text().catch(() => '')
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type') || '',
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

function validateTarget(target, response, baseUrl) {
  const issues = []

  if (!response.ok) {
    issues.push(`${target.label}: HTTP ${response.status || 'request failed'}${response.error ? ` (${response.error})` : ''}`)
    return issues
  }

  if (target.kind === 'page') {
    if (!response.contentType.includes('text/html')) issues.push(`${target.label}: expected HTML response`)
    if (!/<title>[\s\S]+<\/title>/i.test(response.body)) issues.push(`${target.label}: missing title`)
    if (!/<meta\s+name=["']description["']/i.test(response.body)) issues.push(`${target.label}: missing meta description`)
    return issues
  }

  if (target.kind === 'sitemap') {
    if (!response.body.includes('<urlset')) issues.push('sitemap: missing urlset')
    for (const path of ['/', '/projects', '/blog']) {
      if (!response.body.includes(absoluteUrl(baseUrl, path))) issues.push(`sitemap: missing ${path}`)
    }
    return issues
  }

  if (target.kind === 'robots') {
    if (!/User-agent:\s*\*/i.test(response.body)) issues.push('robots: missing wildcard user-agent')
    if (!/Sitemap:\s*https?:\/\/[^\s]+\/sitemap\.xml/i.test(response.body)) issues.push('robots: missing sitemap reference')
  }

  return issues
}

function statusFromResults(results) {
  const criticalFailed = results.some((result) => result.target.critical && result.issues.length > 0)
  if (criticalFailed) return 'offline'
  const optionalFailed = results.some((result) => result.issues.length > 0)
  return optionalFailed ? 'degraded' : 'online'
}

function httpStatusFromResults(results) {
  const failed = results.find((result) => result.issues.length > 0)
  if (failed) return failed.response.status
  return results[0]?.response.status ?? 0
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const checkedAt = new Date().toISOString()
  const results = []

  for (const target of targets) {
    const response = await fetchWithTimeout(absoluteUrl(args.baseUrl, target.path), args.timeoutMs)
    results.push({
      target,
      response,
      issues: validateTarget(target, response, args.baseUrl),
    })
  }

  const status = statusFromResults(results)
  const passed = results.filter((result) => result.issues.length === 0).length
  const issues = results.flatMap((result) => result.issues)
  const payload = {
    checkedAt,
    baseConfigured: true,
    ok: status !== 'offline',
    checks: [
      {
        id: CHECK_ID,
        status,
        httpStatus: httpStatusFromResults(results),
        durationMs: results.reduce((total, result) => total + result.response.durationMs, 0),
        checkedAt,
        summary: `${passed}/${results.length} public routes returned expected responses`,
        issues,
      },
    ],
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`Main-site synthetic report generated: ${status} (${passed}/${results.length} routes passed).`)

  if (args.strict && status === 'offline') process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
