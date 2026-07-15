interface OperatorFacadeEnv {
  OPERATOR_API_BASE_URL?: string
  OPERATOR_SERVICE_TOKEN?: string
  OPERATOR_OWNER_ID?: string
  OPERATOR_DISPLAY_NAME?: string
  OPERATOR_OWNER_EMAILS?: string
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
}

interface PagesContext {
  request: Request
  env: OperatorFacadeEnv
  params: {
    path?: string | string[]
  }
}

interface AccessJwtHeader {
  alg?: string
  kid?: string
}

interface AccessJwtPayload {
  aud?: string | string[]
  email?: string
  exp?: number
  iat?: number
  iss?: string
  nbf?: number
  sub?: string
}

interface JsonWebKeySet {
  keys?: JsonWebKey[]
}

const FORWARDED_METHODS = new Set(['GET', 'POST', 'PATCH'])
const FACADE_TIMEOUT_MS = 25000

export async function onRequest(context: PagesContext) {
  const { request, env } = context
  if (!FORWARDED_METHODS.has(request.method)) {
    return jsonResponse({ error: 'operator-method-not-allowed' }, 405, { Allow: 'GET, POST, PATCH' })
  }

  const configuration = readConfiguration(env)
  if (!configuration.ok) {
    return jsonResponse({ error: configuration.error }, 503)
  }

  const jwt = request.headers.get('Cf-Access-Jwt-Assertion')?.trim() ?? ''
  if (!jwt) return jsonResponse({ error: 'operator-access-required' }, 401)

  const identity = await verifyAccessJwt(jwt, configuration.value).catch(() => null)
  if (!identity) return jsonResponse({ error: 'operator-access-invalid' }, 401)
  if (!configuration.value.ownerEmails.includes(identity.email)) {
    return jsonResponse({ error: 'operator-owner-not-allowed' }, 403)
  }

  const target = buildTargetUrl(configuration.value.apiBaseUrl, context.params.path, request.url)
  if (!target) return jsonResponse({ error: 'operator-path-invalid' }, 400)

  const headers = new Headers()
  headers.set('Authorization', `Bearer ${configuration.value.serviceToken}`)
  headers.set('Accept', 'application/json')
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Biau-Operator-Id', configuration.value.ownerId)
  headers.set('X-Biau-Operator-Email', identity.email)
  headers.set('X-Biau-Operator-Name', configuration.value.displayName)
  const contentType = request.headers.get('Content-Type')
  if (contentType) headers.set('Content-Type', contentType)

  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), FACADE_TIMEOUT_MS)
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : request.body,
      redirect: 'manual',
      signal: abort.signal,
    })
    return proxyResponse(upstream)
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError'
    console.error(JSON.stringify({ event: 'operator_facade_error', kind: timedOut ? 'timeout' : 'upstream_unreachable' }))
    return jsonResponse({ error: timedOut ? 'operator-upstream-timeout' : 'operator-upstream-unreachable' }, timedOut ? 504 : 502)
  } finally {
    clearTimeout(timeout)
  }
}

function readConfiguration(env: OperatorFacadeEnv) {
  const apiBaseUrl = normalizeUrl(env.OPERATOR_API_BASE_URL)
  const serviceToken = env.OPERATOR_SERVICE_TOKEN?.trim() ?? ''
  const ownerId = env.OPERATOR_OWNER_ID?.trim() ?? ''
  const displayName = env.OPERATOR_DISPLAY_NAME?.trim().slice(0, 80) || '站长'
  const ownerEmails = readCsv(env.OPERATOR_OWNER_EMAILS)
  const teamOrigin = normalizeUrl(env.CF_ACCESS_TEAM_DOMAIN)
  const audiences = readCsv(env.CF_ACCESS_AUD)

  if (!apiBaseUrl || !serviceToken || !ownerId || ownerEmails.length === 0 || !teamOrigin || audiences.length === 0) {
    return { ok: false as const, error: 'operator-facade-not-configured' }
  }

  return {
    ok: true as const,
    value: { apiBaseUrl, serviceToken, ownerId, displayName, ownerEmails, teamOrigin, audiences },
  }
}

async function verifyAccessJwt(
  token: string,
  configuration: {
    teamOrigin: string
    audiences: string[]
  },
) {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const header = decodeJson<AccessJwtHeader>(parts[0])
  const payload = decodeJson<AccessJwtPayload>(parts[1])
  if (!header || header.alg !== 'RS256' || !header.kid || !payload) return null

  const now = Math.floor(Date.now() / 1000)
  if (!payload.exp || payload.exp <= now) return null
  if (payload.nbf && payload.nbf > now + 30) return null
  if (payload.iat && payload.iat > now + 30) return null
  if (payload.iss !== configuration.teamOrigin) return null
  if (!hasExpectedAudience(payload.aud, configuration.audiences)) return null

  const email = payload.email?.trim().toLowerCase() ?? ''
  if (!email) return null

  const certsResponse = await fetch(`${configuration.teamOrigin}/cdn-cgi/access/certs`, {
    headers: { Accept: 'application/json' },
  })
  if (!certsResponse.ok) return null
  const keySet = (await certsResponse.json().catch(() => null)) as JsonWebKeySet | null
  const jwk = keySet?.keys?.find((key) => key.kid === header.kid)
  if (!jwk) return null

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  )
  return verified ? { email, subject: payload.sub ?? '' } : null
}

function buildTargetUrl(apiBaseUrl: string, pathValue: string | string[] | undefined, requestUrl: string) {
  const segments = (Array.isArray(pathValue) ? pathValue : [pathValue ?? ''])
    .flatMap((value) => value.split('/'))
    .map((value) => value.trim())
    .filter(Boolean)

  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) return null

  const target = new URL(apiBaseUrl)
  const basePath = target.pathname.replace(/\/+$/, '')
  target.pathname = `${basePath}/operator/${segments.map(encodeURIComponent).join('/')}`
  target.search = new URL(requestUrl).search
  return target.toString()
}

function proxyResponse(upstream: Response) {
  const headers = new Headers()
  const contentType = upstream.headers.get('Content-Type')
  if (contentType) headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'no-store, private')
  headers.set('X-Content-Type-Options', 'nosniff')
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T
  } catch {
    return null
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const decoded = atob(padded)
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

function hasExpectedAudience(value: string | string[] | undefined, expected: string[]) {
  const audiences = Array.isArray(value) ? value : value ? [value] : []
  return audiences.some((audience) => expected.includes(audience))
}

function normalizeUrl(value: string | undefined) {
  const raw = value?.trim().replace(/\/+$/, '') ?? ''
  if (!raw) return ''
  try {
    const url = new URL(/^https?:\/\//iu.test(raw) ? raw : `https://${raw}`)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function readCsv(value: string | undefined) {
  return Array.from(new Set((value ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)))
}

function jsonResponse(payload: unknown, status: number, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      ...(extraHeaders ?? {}),
    },
  })
}
