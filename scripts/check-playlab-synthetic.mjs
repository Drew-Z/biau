import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'public/status/biau-playlab-synthetic.json')
const DEFAULT_BASE_URL = 'https://games.playlab.eu.cc'
const DEFAULT_TIMEOUT_MS = 12_000
const WEB_BUILDS_CHECK_ID = 'biau-playlab-web-builds'
const MOBILE_HINTS_CHECK_ID = 'biau-playlab-mobile-hints'
const MAX_PLAYABLE_URLS = 8
const MAX_RESOURCE_URLS = 48

const pageTargets = [
  {
    key: 'home',
    path: '/',
    requiredText: ['BIAU Playlab', 'BIAU Port', '泊岸', '试玩'],
  },
  {
    key: 'games',
    path: '/games/',
    requiredText: ['游戏作品', 'BIAU Playlab', 'First Tetris', '立即试玩'],
  },
  {
    key: 'first-tetris',
    path: '/games/first-tetris/',
    requiredText: ['Game First Tetris', 'BIAU Playlab', '试玩', 'GitHub'],
  },
]

const mobileHintTerms = ['移动', '触屏', '触控', '多端', '键盘']

function parseArgs(argv) {
  const args = {
    baseUrl: normalizeBaseUrl(process.env.PLAYLAB_SYNTHETIC_BASE_URL || DEFAULT_BASE_URL),
    timeoutMs: Number(process.env.PLAYLAB_SYNTHETIC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    strict: process.env.PLAYLAB_SYNTHETIC_STRICT === '1',
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

function sanitizeIssue(value) {
  return String(value || '')
    .replace(/https?:\/\/[^\s)]+/giu, '[url]')
    .replace(/[A-Za-z]:\\[^\s)]+/gu, '[path]')
    .replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{8,}\b/gu, '[secret]')
    .replace(/\bBearer\s+[A-Za-z0-9._-]+/giu, 'Bearer [secret]')
    .slice(0, 220)
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

function issueFromResponse(label, response, noun) {
  if (response.status > 0) return `${label}: ${noun} returned HTTP ${response.status}`
  return `${label}: ${noun} request failed: ${response.errorKind || 'network_error'}`
}

async function fetchText(url, timeoutMs, accept = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8') {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'biau-playlab-synthetic/1.0',
        Accept: accept,
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
      errorKind: '',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      contentType: '',
      body: '',
      error: sanitizeIssue(error instanceof Error ? error.message : String(error)),
      errorKind: classifyFetchError(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchResource(url, timeoutMs) {
  const head = await fetchResourceMethod(url, timeoutMs, 'HEAD')
  if (head.ok || ![0, 405, 501].includes(head.status)) return head
  return fetchResourceMethod(url, timeoutMs, 'GET')
}

async function fetchResourceMethod(url, timeoutMs, method) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'biau-playlab-synthetic/1.0',
        Accept: '*/*',
        ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}),
      },
    })
    if (method === 'GET') await response.arrayBuffer().catch(() => null)
    return {
      ok: response.ok || response.status === 206,
      status: response.status,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type') || '',
      error: '',
      errorKind: '',
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      contentType: '',
      error: sanitizeIssue(error instanceof Error ? error.message : String(error)),
      errorKind: classifyFetchError(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function validatePage(target, response) {
  const issues = []

  if (!response.ok) {
    issues.push(issueFromResponse(target.key, response, 'page'))
    return issues
  }

  if (!response.contentType.includes('text/html')) issues.push(`${target.key}: expected HTML response`)
  for (const text of target.requiredText) {
    if (!response.body.includes(text)) issues.push(`${target.key}: missing ${text}`)
  }
  return issues
}

function normalizePlayableUrl(baseUrl, href) {
  try {
    const url = new URL(href, `${baseUrl}/`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    if (!url.pathname.endsWith('/index.html')) return ''
    if (url.hostname !== 'play.playlab.eu.cc' && url.hostname !== new URL(baseUrl).hostname) return ''
    url.hash = ''
    url.search = ''
    return url.toString()
  } catch {
    return ''
  }
}

function playableLabel(url) {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    return segments.length >= 2 ? segments[segments.length - 2] : parsed.hostname
  } catch {
    return 'playable'
  }
}

function resourceLabel(url) {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    return segments.slice(-2).join('/') || 'resource'
  } catch {
    return 'resource'
  }
}

function discoverPlayableUrls(baseUrl, pages) {
  const urls = new Set()
  for (const page of pages) {
    if (!page.response.ok) continue
    for (const match of page.response.body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
      const normalized = normalizePlayableUrl(baseUrl, match[1])
      if (normalized) urls.add(normalized)
    }
  }
  return [...urls].slice(0, MAX_PLAYABLE_URLS)
}

function discoverHtmlResources(pageUrl, html) {
  const urls = new Set()

  for (const match of html.matchAll(/(?:href|src)=["']([^"']+\.(?:js|wasm|pck|png|ico)(?:[?#][^"']*)?)["']/gi)) {
    urls.add(normalizeResourceUrl(pageUrl, match[1]))
  }

  const executable = html.match(/"executable"\s*:\s*"([^"]+)"/i)?.[1]
  if (executable) {
    for (const extension of ['js', 'wasm', 'pck', 'png']) {
      urls.add(normalizeResourceUrl(pageUrl, `${executable}.${extension}`))
    }
  }

  for (const match of html.matchAll(/"([^"]+\.(?:wasm|pck|js|png|ico))"\s*:/gi)) {
    urls.add(normalizeResourceUrl(pageUrl, match[1]))
  }

  return [...urls].filter(Boolean)
}

function normalizeResourceUrl(pageUrl, value) {
  try {
    const url = new URL(value, pageUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    if (url.hostname !== new URL(pageUrl).hostname) return ''
    url.hash = ''
    url.search = ''
    return url.toString()
  } catch {
    return ''
  }
}

function validatePlayablePage(label, response) {
  const issues = []
  if (!response.ok) {
    issues.push(issueFromResponse(label, response, 'playable page'))
    return issues
  }
  if (!response.contentType.includes('text/html')) issues.push(`${label}: playable page expected HTML response`)
  if (!response.body.includes('Godot') && !response.body.includes('Engine(')) issues.push(`${label}: playable page missing Godot boot script evidence`)
  if (!response.body.includes('canvas')) issues.push(`${label}: playable page missing canvas evidence`)
  return issues
}

function validateResource(label, response) {
  if (response.ok) return []
  return [issueFromResponse(label, response, 'resource')]
}

function statusFromWebIssues(coreIssues, playableUrlCount, playableIssues, resourceIssues) {
  if (coreIssues.length > 0) return 'offline'
  if (playableUrlCount === 0) return 'unchecked'
  if (playableIssues.length > 0 || resourceIssues.length > 0) return 'degraded'
  return 'online'
}

function statusFromMobileHints(pageIssues, foundTerms) {
  if (pageIssues.length > 0) return 'unchecked'
  return foundTerms.length >= 3 ? 'online' : 'degraded'
}

function firstProblemStatus(results) {
  const problem = results.find((result) => result.issues.length > 0)
  return problem?.response?.status ?? results[0]?.response?.status ?? 0
}

async function checkPlayableBuilds(baseUrl, timeoutMs, pages, checkedAt) {
  const playableUrls = discoverPlayableUrls(baseUrl, pages)
  const playableResults = []
  const resourceResults = []

  for (const url of playableUrls) {
    const label = playableLabel(url)
    const response = await fetchText(url, timeoutMs)
    const issues = validatePlayablePage(label, response)
    playableResults.push({ label, response, issues })

    if (!response.ok) continue
    for (const resourceUrl of discoverHtmlResources(url, response.body)) {
      if (resourceResults.length >= MAX_RESOURCE_URLS) break
      const resourceResponse = await fetchResource(resourceUrl, timeoutMs)
      const resourceIssues = validateResource(`${label}/${resourceLabel(resourceUrl)}`, resourceResponse)
      resourceResults.push({ label: resourceLabel(resourceUrl), response: resourceResponse, issues: resourceIssues })
    }
  }

  const coreIssues = pages.flatMap((page) => page.issues)
  const playableIssues = playableResults.flatMap((result) => result.issues)
  const resourceIssues = resourceResults.flatMap((result) => result.issues)
  const status = statusFromWebIssues(coreIssues, playableUrls.length, playableIssues, resourceIssues)
  const playablePassed = playableResults.filter((result) => result.issues.length === 0).length
  const resourcesPassed = resourceResults.filter((result) => result.issues.length === 0).length
  const durationMs =
    pages.reduce((total, page) => total + page.response.durationMs, 0) +
    playableResults.reduce((total, result) => total + result.response.durationMs, 0) +
    resourceResults.reduce((total, result) => total + result.response.durationMs, 0)
  const issues = [...coreIssues, ...playableIssues, ...resourceIssues].map(sanitizeIssue)

  return {
    check: {
      id: WEB_BUILDS_CHECK_ID,
      status,
      httpStatus: firstProblemStatus([...pages, ...playableResults, ...resourceResults]) || 0,
      durationMs,
      checkedAt,
      summary:
        playableUrls.length > 0
          ? `${pages.length - coreIssues.length}/${pages.length} public pages, ${playablePassed}/${playableUrls.length} playable pages, ${resourcesPassed}/${resourceResults.length} discovered resources responded`
          : `${pages.length - coreIssues.length}/${pages.length} public pages responded; no playable index links discovered`,
      issues,
    },
    playableUrlCount: playableUrls.length,
    playablePageCount: playableResults.length,
    playablePagePassed: playablePassed,
    resourceCount: resourceResults.length,
    resourcePassed: resourcesPassed,
  }
}

function checkMobileHints(pages, checkedAt) {
  const pageIssues = pages.flatMap((page) => page.issues)
  const combinedBody = pages.map((page) => page.response.body).join('\n')
  const foundTerms = mobileHintTerms.filter((term) => combinedBody.includes(term))
  const missingTerms = mobileHintTerms.filter((term) => !foundTerms.includes(term))
  const status = statusFromMobileHints(pageIssues, foundTerms)
  const issues =
    status === 'online'
      ? []
      : [
          ...pageIssues,
          ...(missingTerms.length > 0
            ? [`mobile hint evidence is thin; missing terms: ${missingTerms.join(', ')}`]
            : ['mobile hint evidence could not be confirmed']),
        ].map(sanitizeIssue)

  return {
    id: MOBILE_HINTS_CHECK_ID,
    status,
    httpStatus: firstProblemStatus(pages) || pages[0]?.response.status || 0,
    durationMs: pages.reduce((total, page) => total + page.response.durationMs, 0),
    checkedAt,
    summary: `Found ${foundTerms.length}/${mobileHintTerms.length} mobile/control hint terms in public Playlab pages`,
    issues,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const checkedAt = new Date().toISOString()
  const pages = []

  for (const target of pageTargets) {
    const response = await fetchText(absoluteUrl(args.baseUrl, target.path), args.timeoutMs)
    pages.push({
      target,
      response,
      issues: validatePage(target, response),
    })
  }

  const webBuilds = await checkPlayableBuilds(args.baseUrl, args.timeoutMs, pages, checkedAt)
  const mobileHints = checkMobileHints(pages, checkedAt)
  const checks = [webBuilds.check, mobileHints]
  const payload = {
    checkedAt,
    baseConfigured: true,
    ok: checks.every((check) => check.status !== 'offline'),
    playableSummary: {
      discoveredPlayablePages: webBuilds.playableUrlCount,
      checkedPlayablePages: webBuilds.playablePageCount,
      passedPlayablePages: webBuilds.playablePagePassed,
      checkedResources: webBuilds.resourceCount,
      passedResources: webBuilds.resourcePassed,
    },
    checks,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(
    `Playlab synthetic report generated: web=${webBuilds.check.status}, mobile=${mobileHints.status}, playable=${webBuilds.playablePagePassed}/${webBuilds.playablePageCount}, resources=${webBuilds.resourcePassed}/${webBuilds.resourceCount}.`,
  )

  if (args.strict && checks.some((check) => check.status === 'offline')) process.exitCode = 1
}

main().catch((error) => {
  console.error(sanitizeIssue(error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
})
