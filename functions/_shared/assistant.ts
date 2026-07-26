export interface AssistantEnv {
  PUBLIC_ASSISTANT_API_BASE_URL?: string
  PUBLIC_ASSISTANT_PROXY_TIMEOUT_MS?: string
}

const MAX_REQUEST_BYTES = 32_000
const MAX_RESPONSE_BYTES = 256_000

export function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init?.headers ?? {}),
    },
  })
}

export async function proxyAssistantRequest(request: Request, env: AssistantEnv, upstreamPath: string) {
  const upstreamUrl = buildUpstreamUrl(env.PUBLIC_ASSISTANT_API_BASE_URL, upstreamPath)
  if (!upstreamUrl) {
    return jsonResponse({ error: 'public-assistant-upstream-not-configured' }, { status: 503 })
  }

  const method = request.method.toUpperCase()
  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = request.headers.get('Content-Type')?.toLowerCase() ?? ''
    if (!contentType.includes('application/json')) {
      return jsonResponse({ error: 'public-assistant-json-required' }, { status: 415 })
    }
    body = await request.text()
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ error: 'public-assistant-request-too-large' }, { status: 413 })
    }
  }

  const controller = new AbortController()
  const timeoutMs = readBoundedInteger(env.PUBLIC_ASSISTANT_PROXY_TIMEOUT_MS, 55_000, 5_000, 60_000)
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(upstreamUrl, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body,
      signal: controller.signal,
    })
    const responseContentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
    if (!responseContentType.includes('application/json')) {
      return jsonResponse({ error: 'public-assistant-upstream-invalid-response' }, { status: 502 })
    }
    const responseBody = await response.text()
    if (new TextEncoder().encode(responseBody).byteLength > MAX_RESPONSE_BYTES) {
      return jsonResponse({ error: 'public-assistant-upstream-response-too-large' }, { status: 502 })
    }
    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...(response.headers.get('Retry-After') ? { 'Retry-After': response.headers.get('Retry-After') as string } : {}),
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return jsonResponse({ error: 'public-assistant-upstream-timeout' }, { status: 504 })
    }
    return jsonResponse({ error: 'public-assistant-upstream-unreachable' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}

function buildUpstreamUrl(rawBaseUrl: string | undefined, upstreamPath: string) {
  const normalizedBaseUrl = rawBaseUrl?.trim().replace(/\/+$/u, '')
  if (!normalizedBaseUrl || !upstreamPath.startsWith('/')) return null
  try {
    const parsed = new URL(`${normalizedBaseUrl}${upstreamPath}`)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function readBoundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}
