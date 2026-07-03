import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/blog-semi-synthetic.json')
const DEFAULT_BASE_URL = 'https://biau.playlab.eu.cc'
const DEFAULT_TIMEOUT_MS = 12_000
const ROUTE_CHECK_ID = 'blog-semi-public-routes'
const ASSISTANT_CHECK_ID = 'blog-semi-public-assistant'
const sitemapRequiredPaths = ['/', '/projects', '/blog', '/status', '/pet-app-showcase/']

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

function normalizeSitemapPath(path) {
  if (path === '/') return '/'
  return path.replace(/\/+$/, '')
}

function sitemapContainsPath(body, path, baseUrl) {
  if (body.includes(absoluteUrl(baseUrl, path))) return true
  const expectedPath = normalizeSitemapPath(path)
  const locs = Array.from(body.matchAll(/<loc>([^<]+)<\/loc>/gi), (match) => match[1])

  return locs.some((loc) => {
    try {
      const url = new URL(loc)
      return normalizeSitemapPath(url.pathname) === expectedPath
    } catch {
      return false
    }
  })
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

async function requestJsonWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      ...options,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'biau-main-site-synthetic/1.0',
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
    })
    const body = await response.text().catch(() => '')
    let json = null
    let parseError = ''
    if (body.trim()) {
      try {
        json = JSON.parse(body)
      } catch {
        parseError = 'invalid-json'
      }
    } else {
      parseError = 'empty-response'
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type') || '',
      json,
      parseError,
      error: '',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      contentType: '',
      json: null,
      parseError: '',
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
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
    for (const path of sitemapRequiredPaths) {
      if (!sitemapContainsPath(response.body, path, baseUrl)) issues.push(`sitemap: missing ${path}`)
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

function validateHealthResponse(response) {
  const issues = []
  if (!response.ok) {
    issues.push(`assistant health returned HTTP ${response.status || 'request failed'}`)
    if (response.error) issues.push('assistant health request failed')
    return issues
  }

  if (response.parseError) {
    issues.push('assistant health returned non-JSON response')
    return issues
  }

  if (!isRecord(response.json) || response.json.ok !== true) {
    issues.push('assistant health payload missing ok=true')
  }

  return issues
}

function validateChatResponse(response) {
  const issues = []
  let mode = ''
  let reason = ''

  if (!response.ok) {
    issues.push(`assistant chat returned HTTP ${response.status || 'request failed'}`)
    if (response.error) issues.push('assistant chat request failed')
    return { issues, mode, reason }
  }

  if (response.parseError) {
    issues.push('assistant chat returned non-JSON response')
    return { issues, mode, reason }
  }

  const payload = response.json
  if (!isRecord(payload)) {
    issues.push('assistant chat payload is not an object')
    return { issues, mode, reason }
  }

  if (typeof payload.answer !== 'string' || payload.answer.trim().length === 0) {
    issues.push('assistant chat payload missing answer')
  }

  if (!Array.isArray(payload.citations)) {
    issues.push('assistant chat payload missing citations array')
  } else if (payload.citations.length === 0) {
    issues.push('assistant chat payload returned no public citations')
  }

  const meta = isRecord(payload.meta) ? payload.meta : null
  if (!meta) {
    issues.push('assistant chat payload missing meta')
    return { issues, mode, reason }
  }

  if (meta.mode === 'model' || meta.mode === 'fallback') {
    mode = meta.mode
  } else {
    issues.push('assistant chat meta has invalid mode')
  }

  if (typeof meta.reason === 'string') reason = meta.reason

  return { issues, mode, reason }
}

function firstProblemStatus(...responses) {
  const problem = responses.find((response) => !response.ok || response.parseError)
  return problem?.status ?? responses[0]?.status ?? 0
}

async function validateAssistantApi(baseUrl, timeoutMs, checkedAt) {
  const health = await requestJsonWithTimeout(absoluteUrl(baseUrl, '/api/health'), timeoutMs)
  const chat = await requestJsonWithTimeout(absoluteUrl(baseUrl, '/api/chat/public'), timeoutMs, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'RAG 项目' }),
  })

  const healthIssues = validateHealthResponse(health)
  const chatValidation = validateChatResponse(chat)
  const issues = [...healthIssues, ...chatValidation.issues]
  let status = 'offline'
  let summary = 'Public assistant API did not return valid health/chat JSON'

  if (issues.length === 0 && chatValidation.mode === 'model') {
    status = 'online'
    summary = 'Public assistant API returned a model answer with public citations'
  } else if (issues.length === 0 && chatValidation.mode === 'fallback') {
    status = 'degraded'
    summary = chatValidation.reason
      ? `Public assistant API returned fallback answer (${chatValidation.reason})`
      : 'Public assistant API returned fallback answer'
  }

  return {
    id: ASSISTANT_CHECK_ID,
    status,
    httpStatus: firstProblemStatus(health, chat),
    durationMs: health.durationMs + chat.durationMs,
    checkedAt,
    summary,
    issues,
  }
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
  const routeCheck = {
    id: ROUTE_CHECK_ID,
    status,
    httpStatus: httpStatusFromResults(results),
    durationMs: results.reduce((total, result) => total + result.response.durationMs, 0),
    checkedAt,
    summary: `${passed}/${results.length} public routes returned expected responses`,
    issues,
  }
  const assistantCheck = await validateAssistantApi(args.baseUrl, args.timeoutMs, checkedAt)
  const payload = {
    checkedAt,
    baseConfigured: true,
    ok: routeCheck.status !== 'offline' && assistantCheck.status !== 'offline',
    checks: [routeCheck, assistantCheck],
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(
    `Main-site synthetic report generated: routes=${routeCheck.status} (${passed}/${results.length}), assistant=${assistantCheck.status}.`,
  )

  if (args.strict && payload.checks.some((check) => check.status === 'offline')) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
