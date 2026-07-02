const DEFAULT_BASE_URL = 'https://biau.playlab.eu.cc'
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_LINKS = 80

const coreRoutes = [
  { label: 'home', path: '/', kind: 'page' },
  { label: 'projects', path: '/projects', kind: 'page' },
  { label: 'blog', path: '/blog', kind: 'page' },
  { label: 'assistant', path: '/assistant', kind: 'page' },
  { label: 'legal rag detail', path: '/projects/legal-rag', kind: 'page' },
  { label: 'erp detail', path: '/projects/ozon-erp', kind: 'page' },
  { label: 'playlab detail', path: '/projects/biau-playlab', kind: 'page' },
  { label: 'xunqiu detail', path: '/projects/xunqiu', kind: 'page' },
  { label: 'legal rag article', path: '/blog/legal-rag-review', kind: 'page' },
  { label: 'sitemap', path: '/sitemap.xml', kind: 'sitemap' },
  { label: 'robots', path: '/robots.txt', kind: 'robots' },
]

function parseArgs(argv) {
  const args = {
    base: process.env.SITE_MONITOR_BASE || DEFAULT_BASE_URL,
    json: process.env.SITE_MONITOR_FORMAT === 'json',
    checkLinks: process.env.SITE_MONITOR_CHECK_LINKS === '1',
    checkExternal: process.env.SITE_MONITOR_CHECK_EXTERNAL === '1',
    timeoutMs: Number(process.env.SITE_MONITOR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    maxLinks: Number(process.env.SITE_MONITOR_MAX_LINKS || DEFAULT_MAX_LINKS),
  }

  const readValue = (index) => argv[index + 1] ?? ''
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--json') {
      args.json = true
      continue
    }
    if (item === '--check-links') {
      args.checkLinks = true
      continue
    }
    if (item === '--check-external') {
      args.checkExternal = true
      args.checkLinks = true
      continue
    }
    if (item === '--base') {
      args.base = readValue(index)
      index += 1
      continue
    }
    if (item.startsWith('--base=')) {
      args.base = item.slice('--base='.length)
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
    if (item === '--max-links') {
      args.maxLinks = Number(readValue(index))
      index += 1
      continue
    }
    if (item.startsWith('--max-links=')) {
      args.maxLinks = Number(item.slice('--max-links='.length))
    }
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) args.timeoutMs = DEFAULT_TIMEOUT_MS
  if (!Number.isFinite(args.maxLinks) || args.maxLinks <= 0) args.maxLinks = DEFAULT_MAX_LINKS
  args.base = normalizeBaseUrl(args.base)
  return args
}

function normalizeBaseUrl(value) {
  const raw = String(value || DEFAULT_BASE_URL).trim()
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, '')
}

function absoluteUrl(base, path) {
  return new URL(path, `${base}/`).toString()
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
        'User-Agent': 'biau-site-monitor/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
      },
    })
    const body = await response.text()
    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type') || '',
      body,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      durationMs: Date.now() - startedAt,
      contentType: '',
      body: '',
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function textIncludesAll(text, needles) {
  return needles.every((needle) => text.includes(needle))
}

function checkBody(route, response, base) {
  const issues = []
  const body = response.body || ''

  if (!response.ok) {
    issues.push(`HTTP ${response.status || 'request failed'}${response.error ? `: ${response.error}` : ''}`)
    return issues
  }

  if (route.kind === 'page') {
    if (!response.contentType.includes('text/html')) issues.push(`expected html content-type, got ${response.contentType || 'missing'}`)
    if (!/<title>[\s\S]+<\/title>/i.test(body)) issues.push('missing <title>')
    if (!/<meta\s+name=["']description["']/i.test(body)) issues.push('missing meta description')
    if (!/<link\s+[^>]*rel=["']canonical["']/i.test(body)) issues.push('missing canonical link')
    return issues
  }

  if (route.kind === 'sitemap') {
    const requiredLocs = ['/', '/projects', '/blog'].map((path) => absoluteUrl(base, path))
    if (!body.includes('<urlset')) issues.push('missing urlset')
    if (!textIncludesAll(body, requiredLocs)) issues.push('missing one of core sitemap locs: /, /projects, /blog')
    return issues
  }

  if (route.kind === 'robots') {
    if (!/User-agent:\s*\*/i.test(body)) issues.push('missing wildcard user-agent')
    if (!/Sitemap:\s*https?:\/\/[^\s]+\/sitemap\.xml/i.test(body)) issues.push('missing sitemap reference')
  }

  return issues
}

function extractLinks(html, pageUrl, base) {
  const links = []
  const baseOrigin = new URL(base).origin
  for (const match of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/gi)) {
    const raw = match[1].trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue
    if (/^javascript:/i.test(raw)) continue

    let url
    try {
      url = new URL(raw, pageUrl)
    } catch {
      continue
    }

    if (!['http:', 'https:'].includes(url.protocol)) continue
    links.push({
      url: url.toString(),
      sameOrigin: url.origin === baseOrigin,
    })
  }
  return links
}

function uniqueByUrl(items) {
  const seen = new Set()
  const result = []
  for (const item of items) {
    const withoutHash = item.url.replace(/#.*$/, '')
    if (seen.has(withoutHash)) continue
    seen.add(withoutHash)
    result.push({ ...item, url: withoutHash })
  }
  return result
}

async function checkRoutes(args) {
  const pageResponses = []
  const checks = []

  for (const route of coreRoutes) {
    const url = absoluteUrl(args.base, route.path)
    const response = await fetchWithTimeout(url, args.timeoutMs)
    const issues = checkBody(route, response, args.base)
    checks.push({
      type: route.kind,
      label: route.label,
      url,
      status: response.status,
      durationMs: response.durationMs,
      ok: issues.length === 0,
      issues,
    })
    if (route.kind === 'page') pageResponses.push({ route, url, response })
  }

  return { checks, pageResponses }
}

async function checkDiscoveredLinks(args, pageResponses) {
  if (!args.checkLinks) return []

  const discovered = uniqueByUrl(
    pageResponses.flatMap(({ url, response }) => extractLinks(response.body, url, args.base)),
  )
    .filter((link) => args.checkExternal || link.sameOrigin)
    .slice(0, args.maxLinks)

  const checks = []
  for (const link of discovered) {
    const response = await fetchWithTimeout(link.url, args.timeoutMs)
    const ok = response.ok
    checks.push({
      type: link.sameOrigin ? 'same-origin-link' : 'external-link',
      label: link.sameOrigin ? 'same-origin link' : 'external link',
      url: link.url,
      status: response.status,
      durationMs: response.durationMs,
      ok,
      issues: ok ? [] : [`HTTP ${response.status || 'request failed'}${response.error ? `: ${response.error}` : ''}`],
    })
  }
  return checks
}

function printMarkdown(result) {
  const failed = result.checks.filter((check) => !check.ok)
  console.log(`# Site monitor: ${result.base}`)
  console.log('')
  console.log(`- checkedAt: ${result.checkedAt}`)
  console.log(`- checks: ${result.checks.length}`)
  console.log(`- failed: ${failed.length}`)
  console.log(`- link checks: ${result.options.checkLinks ? 'enabled' : 'disabled'}`)
  console.log(`- external checks: ${result.options.checkExternal ? 'enabled' : 'disabled'}`)
  console.log('')
  console.log('| status | type | target | ms | issue |')
  console.log('|---|---|---|---:|---|')
  for (const check of result.checks) {
    const status = check.ok ? 'PASS' : 'FAIL'
    const issue = check.issues.length > 0 ? check.issues.join('; ') : ''
    console.log(`| ${status} | ${check.type} | ${check.url} | ${check.durationMs} | ${issue} |`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const routeResult = await checkRoutes(args)
  const linkChecks = await checkDiscoveredLinks(args, routeResult.pageResponses)
  const checks = [...routeResult.checks, ...linkChecks]
  const result = {
    ok: checks.every((check) => check.ok),
    base: args.base,
    checkedAt: new Date().toISOString(),
    options: {
      checkLinks: args.checkLinks,
      checkExternal: args.checkExternal,
      timeoutMs: args.timeoutMs,
      maxLinks: args.maxLinks,
    },
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printMarkdown(result)
  }

  if (!result.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
