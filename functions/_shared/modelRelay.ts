import { readBoundedTextBody } from './boundedBody'

export interface ModelRelayEnv {
  MODEL_RELAY_SHARED_TOKEN?: string
  MODEL_RELAY_UPSTREAM_BASE_URL?: string
  MODEL_RELAY_UPSTREAM_API_KEY?: string
  MODEL_RELAY_FALLBACK_UPSTREAM_BASE_URL?: string
  MODEL_RELAY_FALLBACK_UPSTREAM_API_KEY?: string
  MODEL_RELAY_ALLOWED_MODELS?: string
  MODEL_RELAY_TIMEOUT_MS?: string
}

interface ModelRelayDependencies {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  scheduleTimeout?(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>
  cancelTimeout?(handle: ReturnType<typeof setTimeout>): void
}

type RelayFailure =
  | 'provider_rejected'
  | 'upstream_unreachable'
  | 'invalid_response'
  | 'response_too_large'
  | 'timeout'

export type ModelRelayChannel = 'primary' | 'fallback'

const MAX_REQUEST_BYTES = 512_000
const MAX_RESPONSE_BYTES = 512_000
const MAX_ALLOWED_MODELS = 3
const MAX_MODEL_LENGTH = 160
const MIN_SHARED_TOKEN_LENGTH = 32
const ALLOWED_REQUEST_FIELDS = new Set(['model', 'stream', 'max_output_tokens', 'text', 'input'])

export async function relayResponsesRequest(
  request: Request,
  env: ModelRelayEnv,
  dependencies: ModelRelayDependencies = { fetch },
  channel: ModelRelayChannel = 'primary',
) {
  const config = resolveRelayConfig(env, channel)
  if (!config) return relayJson({ error: 'model-relay-not-configured' }, 503)
  if (!await authorized(request.headers.get('Authorization'), config.sharedToken)) {
    return relayJson({ error: 'model-relay-unauthorized' }, 401)
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
    return relayJson({ error: 'model-relay-json-required' }, 415)
  }

  const requestBody = await readBoundedTextBody(request.body, MAX_REQUEST_BYTES)
  if (!requestBody.ok) return relayJson({ error: 'model-relay-request-too-large' }, 413)
  const payload = parseRelayPayload(requestBody.text, config.allowedModels)
  if (!payload) return relayJson({ error: 'model-relay-invalid-request' }, 400)

  const controller = new AbortController()
  let timedOut = false
  const onCallerAbort = () => controller.abort(request.signal.reason)
  request.signal.addEventListener('abort', onCallerAbort, { once: true })
  if (request.signal.aborted) controller.abort(request.signal.reason)
  const timeout = (dependencies.scheduleTimeout ?? setTimeout)(() => {
    timedOut = true
    controller.abort()
  }, config.timeoutMs)
  let streamHandedOff = false
  const cancelTimeout = dependencies.cancelTimeout ?? clearTimeout
  const cleanup = () => {
    cancelTimeout(timeout)
    request.signal.removeEventListener('abort', onCallerAbort)
  }

  try {
    const upstream = await dependencies.fetch(config.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.upstreamApiKey}`,
        'Content-Type': 'application/json',
        Accept: payload.stream ? 'text/event-stream, application/json' : 'application/json',
      },
      body: requestBody.text,
      signal: controller.signal,
    })
    const contentType = upstream.headers.get('Content-Type')?.toLowerCase() ?? ''
    if (!upstream.ok) {
      await upstream.body?.cancel().catch(() => undefined)
      return relayJson(
        { error: 'model-relay-upstream-rejected' },
        upstream.status >= 400 && upstream.status <= 599 ? upstream.status : 502,
        'provider_rejected',
      )
    }

    if (payload.stream && contentType.includes('text/event-stream') && upstream.body) {
      streamHandedOff = true
      return new Response(createBoundedRelayStream(upstream.body, controller, cleanup), {
        status: upstream.status,
        headers: relayHeaders('text/event-stream; charset=utf-8', 'no-cache, no-store'),
      })
    }
    if (!contentType.includes('application/json')) {
      await upstream.body?.cancel().catch(() => undefined)
      return relayJson({ error: 'model-relay-upstream-invalid-response' }, 502, 'invalid_response')
    }
    const responseBody = await readBoundedTextBody(upstream.body, MAX_RESPONSE_BYTES)
    if (!responseBody.ok) {
      return relayJson({ error: 'model-relay-upstream-response-too-large' }, 502, 'response_too_large')
    }
    return new Response(responseBody.text, {
      status: upstream.status,
      headers: relayHeaders('application/json; charset=utf-8'),
    })
  } catch (error) {
    if (timedOut) return relayJson({ error: 'model-relay-upstream-timeout' }, 504, 'timeout')
    if (request.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return relayJson({ error: 'model-relay-request-cancelled' }, 499)
    }
    return relayJson({ error: 'model-relay-upstream-unreachable' }, 502, 'upstream_unreachable')
  } finally {
    if (!streamHandedOff) cleanup()
  }
}

function resolveRelayConfig(env: ModelRelayEnv, channel: ModelRelayChannel) {
  const sharedToken = env.MODEL_RELAY_SHARED_TOKEN?.trim() ?? ''
  const upstreamApiKey = (channel === 'fallback'
    ? env.MODEL_RELAY_FALLBACK_UPSTREAM_API_KEY
    : env.MODEL_RELAY_UPSTREAM_API_KEY)?.trim() ?? ''
  const endpoint = responsesEndpoint(channel === 'fallback'
    ? env.MODEL_RELAY_FALLBACK_UPSTREAM_BASE_URL
    : env.MODEL_RELAY_UPSTREAM_BASE_URL)
  const allowedModels = parseAllowedModels(env.MODEL_RELAY_ALLOWED_MODELS)
  if (sharedToken.length < MIN_SHARED_TOKEN_LENGTH || !upstreamApiKey || !endpoint || allowedModels.size === 0) return null
  return {
    sharedToken,
    upstreamApiKey,
    endpoint,
    allowedModels,
    timeoutMs: readBoundedInteger(env.MODEL_RELAY_TIMEOUT_MS, 50_000, 5_000, 55_000),
  }
}

function responsesEndpoint(value: string | undefined) {
  const normalized = value?.trim().replace(/\/+$/u, '') ?? ''
  if (!normalized) return null
  try {
    const endpoint = normalized.endsWith('/responses')
      ? new URL(normalized)
      : normalized.endsWith('/v1')
        ? new URL(`${normalized}/responses`)
        : new URL(`${normalized}/responses`)
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) return null
    return endpoint.toString()
  } catch {
    return null
  }
}

function parseAllowedModels(value: string | undefined) {
  const models = [...new Set((value ?? '').split(',').map((item) => item.trim()).filter(Boolean))]
  if (models.length === 0 || models.length > MAX_ALLOWED_MODELS || models.some((model) => model.length > MAX_MODEL_LENGTH)) {
    return new Set<string>()
  }
  return new Set(models)
}

function parseRelayPayload(value: string, allowedModels: Set<string>) {
  let payload: unknown
  try {
    payload = JSON.parse(value) as unknown
  } catch {
    return null
  }
  if (!isRecord(payload) || Object.keys(payload).some((key) => !ALLOWED_REQUEST_FIELDS.has(key))) return null
  if (typeof payload.model !== 'string' || !allowedModels.has(payload.model)) return null
  if (typeof payload.stream !== 'boolean' || !Array.isArray(payload.input) || payload.input.length === 0 || payload.input.length > 16) {
    return null
  }
  if (payload.max_output_tokens !== undefined && (
    !Number.isInteger(payload.max_output_tokens) || Number(payload.max_output_tokens) < 1 || Number(payload.max_output_tokens) > 8_192
  )) return null
  if (payload.text !== undefined && !isRecord(payload.text)) return null
  return { stream: payload.stream }
}

async function authorized(header: string | null, expected: string) {
  const presented = header?.match(/^Bearer\s+(.+)$/iu)?.[1]?.trim() ?? ''
  if (!presented) return false
  const encoder = new TextEncoder()
  const [presentedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(presented)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  const left = new Uint8Array(presentedDigest)
  const right = new Uint8Array(expectedDigest)
  let difference = left.length ^ right.length
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return difference === 0
}

function createBoundedRelayStream(
  source: ReadableStream<Uint8Array>,
  upstreamAbort: AbortController,
  cleanup: () => void,
) {
  const reader = source.getReader()
  let bytesRead = 0
  let closed = false
  const finish = () => {
    if (closed) return
    closed = true
    cleanup()
  }
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          finish()
          controller.close()
          return
        }
        bytesRead += value.byteLength
        if (bytesRead > MAX_RESPONSE_BYTES) {
          upstreamAbort.abort()
          await reader.cancel('model-relay-upstream-response-too-large').catch(() => undefined)
          finish()
          controller.error(new Error('model-relay-upstream-response-too-large'))
          return
        }
        controller.enqueue(value)
      } catch (error) {
        finish()
        controller.error(error)
      }
    },
    async cancel(reason) {
      upstreamAbort.abort()
      await reader.cancel(reason).catch(() => undefined)
      finish()
    },
  })
}

function relayJson(payload: unknown, status: number, relayFailure?: RelayFailure) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: relayHeaders('application/json; charset=utf-8', 'no-store', relayFailure),
  })
}

function relayHeaders(contentType: string, cacheControl = 'no-store', relayFailure?: RelayFailure) {
  return {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'X-Accel-Buffering': 'no',
    ...(relayFailure ? { 'X-BIAU-Relay-Failure': relayFailure } : {}),
  }
}

function readBoundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
