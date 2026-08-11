import type {
  ProviderDiagnostic,
  ProviderDiagnosticKind,
  ProviderRelayFailureKind,
  ProviderRelayOriginKind,
  PublicAssistantRecoveryFailureClass,
} from './types.js'

export interface ResponsesApiChannel {
  apiKey: string
  baseUrl: string
  model: string
  provider?: string
}

export interface ResponsesApiResult {
  content: string | null
  diagnostic?: ProviderDiagnostic
  failure?: 'not_configured' | 'provider_error' | 'empty_response' | 'invalid_response'
  failureClass?: PublicAssistantRecoveryFailureClass
  durationMs: number
  firstActivityMs?: number
}

export interface ResponsesJsonSchema {
  name: string
  schema: Record<string, unknown>
  strict?: boolean
}

export type ResponsesUserContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail?: 'auto' | 'low' | 'high' }

interface ResponsesEndpointResult {
  ok: boolean
  content: string
  httpStatus: number | null
  diagnostic: ProviderDiagnostic
  durationMs: number
  firstActivityMs?: number
  invalidResponse: boolean
}

export async function requestResponsesText(input: {
  channel: ResponsesApiChannel
  system: string
  user: string
  timeoutMs: number
  signal?: AbortSignal
  stream?: boolean
  maxOutputTokens?: number
  jsonSchema?: ResponsesJsonSchema
  userContent?: ResponsesUserContentPart[]
}): Promise<ResponsesApiResult> {
  const startedAt = Date.now()
  if (!input.channel.apiKey || !input.channel.baseUrl || !input.channel.model) {
    return { content: null, failure: 'not_configured', failureClass: 'not_configured', durationMs: 0 }
  }

  const endpoints = responsesEndpoints(input.channel.baseUrl)
  let diagnostic: ProviderDiagnostic | undefined
  let firstActivityMs: number | undefined
  for (const [index, endpoint] of endpoints.entries()) {
    const attempt = await requestEndpoint({ ...input, endpoint })
    firstActivityMs ??= attempt.firstActivityMs === undefined
      ? undefined
      : Math.max(0, Date.now() - startedAt - attempt.durationMs + attempt.firstActivityMs)
    diagnostic = { ...attempt.diagnostic, attemptedEndpoints: index + 1 }
    if (attempt.invalidResponse) {
      return {
        content: null,
        failure: 'invalid_response',
        failureClass: 'invalid',
        durationMs: Math.max(0, Date.now() - startedAt),
        ...(firstActivityMs === undefined ? {} : { firstActivityMs }),
        diagnostic,
      }
    }
    if (attempt.ok) {
      const content = attempt.content.trim()
      if (!content) {
        return {
          content: null,
          failure: 'empty_response',
          failureClass: 'empty',
          durationMs: Math.max(0, Date.now() - startedAt),
          ...(firstActivityMs === undefined ? {} : { firstActivityMs }),
          diagnostic: {
            kind: 'empty_response',
            attemptedEndpoints: index + 1,
            timeoutMs: input.timeoutMs,
          },
        }
      }
      if (content.length > MAX_RESPONSES_TEXT_CHARS) {
        return {
          content: null,
          failure: 'invalid_response',
          failureClass: 'invalid',
          durationMs: Math.max(0, Date.now() - startedAt),
          ...(firstActivityMs === undefined ? {} : { firstActivityMs }),
          diagnostic,
        }
      }
      return {
        content,
        diagnostic,
        durationMs: Math.max(0, Date.now() - startedAt),
        ...(firstActivityMs === undefined ? {} : { firstActivityMs }),
      }
    }
    if (!attempt.httpStatus || ![404, 405].includes(attempt.httpStatus)) break
  }
  return {
    content: null,
    failure: 'provider_error',
    failureClass: providerFailureClass(diagnostic),
    durationMs: Math.max(0, Date.now() - startedAt),
    ...(firstActivityMs === undefined ? {} : { firstActivityMs }),
    diagnostic,
  }
}

export function parseStructuredResponse(value: string): unknown | null {
  const normalized = value.replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  try {
    return JSON.parse(normalized) as unknown
  } catch {
    const candidate = findBalancedJson(normalized)
    if (!candidate) return null
    try {
      return JSON.parse(candidate) as unknown
    } catch {
      return null
    }
  }
}

export function responsesEndpoints(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/u, '')
  if (!normalized) return []
  if (normalized.endsWith('/responses')) return [normalized]
  if (normalized.endsWith('/v1')) return [`${normalized}/responses`]
  return [...new Set([`${normalized}/responses`, `${normalized}/v1/responses`])]
}

async function requestEndpoint(input: {
  channel: ResponsesApiChannel
  endpoint: string
  system: string
  user: string
  timeoutMs: number
  signal?: AbortSignal
  stream?: boolean
  maxOutputTokens?: number
  jsonSchema?: ResponsesJsonSchema
  userContent?: ResponsesUserContentPart[]
}): Promise<ResponsesEndpointResult> {
  const startedAt = Date.now()
  let firstActivityMs: number | undefined
  const abort = new AbortController()
  let diagnosticKind: ProviderDiagnosticKind = 'network_error'
  let responseStatus: number | undefined
  let relayOrigin: ProviderRelayOriginKind | undefined
  const onAbort = () => abort.abort()
  input.signal?.addEventListener('abort', onAbort, { once: true })
  if (input.signal?.aborted) abort.abort()
  let timeout: ReturnType<typeof setTimeout> | undefined
  const armTimeout = () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      diagnosticKind = 'timeout'
      abort.abort()
    }, input.timeoutMs)
  }
  armTimeout()
  try {
    const response = await fetch(input.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.channel.apiKey}`,
        'Content-Type': 'application/json',
        Accept: input.stream ? 'text/event-stream, application/json' : 'application/json',
      },
      body: JSON.stringify({
        model: input.channel.model,
        stream: input.stream === true,
        ...(input.maxOutputTokens ? { max_output_tokens: input.maxOutputTokens } : {}),
        ...(input.jsonSchema ? {
          text: {
            format: {
              type: 'json_schema',
              name: input.jsonSchema.name,
              strict: input.jsonSchema.strict !== false,
              schema: input.jsonSchema.schema,
            },
          },
        } : {}),
        input: [
          { role: 'system', content: [{ type: 'input_text', text: input.system }] },
          { role: 'user', content: input.userContent ?? [{ type: 'input_text', text: input.user }] },
        ],
      }),
      signal: abort.signal,
    })
    firstActivityMs = Math.max(0, Date.now() - startedAt)
    responseStatus = response.status
    relayOrigin = readRelayOrigin(response.headers, input.channel)
    if (!response.ok) {
      const relayFailure = relayOrigin === 'pages_function'
        ? readRelayFailure(response.headers.get('X-BIAU-Relay-Failure'))
        : undefined
      await response.body?.cancel().catch(() => undefined)
      return {
        ok: false,
        content: '',
        httpStatus: response.status,
        diagnostic: {
          kind: 'http_status' as const,
          httpStatus: response.status,
          ...(relayFailure ? { relayFailure } : {}),
          ...(relayOrigin ? { relayOrigin } : {}),
          attemptedEndpoints: 0,
          timeoutMs: input.timeoutMs,
        },
        durationMs: Math.max(0, Date.now() - startedAt),
        firstActivityMs,
        invalidResponse: false,
      }
    }
    const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
    const content = input.stream && contentType.includes('text/event-stream')
      ? await readResponsesStreamContent(response.body, () => {
        firstActivityMs ??= Math.max(0, Date.now() - startedAt)
        armTimeout()
      })
      : readResponsesContent(await response.json().catch(() => null))
    return {
      ok: true,
      content,
      httpStatus: response.status,
      diagnostic: {
        kind: 'http_status' as const,
        httpStatus: response.status,
        ...(relayOrigin ? { relayOrigin } : {}),
        attemptedEndpoints: 0,
        timeoutMs: input.timeoutMs,
      },
      durationMs: Math.max(0, Date.now() - startedAt),
      firstActivityMs,
      invalidResponse: false,
    }
  } catch (error) {
    input.signal?.throwIfAborted()
    const invalidResponse = error instanceof Error && error.message === 'responses-stream-too-large'
    const observedDiagnosticKind = readDiagnosticKind()
    const kind: ProviderDiagnosticKind = observedDiagnosticKind === 'timeout'
      ? 'timeout'
      : responseStatus
        ? 'http_status'
        : 'network_error'
    return {
      ok: false,
      content: '',
      httpStatus: responseStatus ?? null,
      diagnostic: {
        kind,
        ...(kind === 'http_status' ? { httpStatus: responseStatus } : {}),
        ...(kind === 'http_status' && relayOrigin ? { relayOrigin } : {}),
        attemptedEndpoints: 0,
        timeoutMs: input.timeoutMs,
      },
      durationMs: Math.max(0, Date.now() - startedAt),
      ...(firstActivityMs === undefined ? {} : { firstActivityMs }),
      invalidResponse,
    }
  } finally {
    if (timeout) clearTimeout(timeout)
    input.signal?.removeEventListener('abort', onAbort)
  }

  function readDiagnosticKind(): ProviderDiagnosticKind {
    return diagnosticKind
  }
}

const RELAY_FAILURES = new Set<ProviderRelayFailureKind>([
  'provider_rejected',
  'upstream_unreachable',
  'invalid_response',
  'response_too_large',
  'timeout',
])

function readRelayFailure(value: string | null): ProviderRelayFailureKind | undefined {
  const normalized = value?.trim().toLowerCase() as ProviderRelayFailureKind | undefined
  return normalized && RELAY_FAILURES.has(normalized) ? normalized : undefined
}

function readRelayOrigin(headers: Headers, channel: ResponsesApiChannel): ProviderRelayOriginKind | undefined {
  if (!expectsBiauRelay(channel)) return undefined
  return headers.get('X-BIAU-Relay-Origin')?.trim().toLowerCase() === 'pages_function'
    ? 'pages_function'
    : 'edge'
}

function expectsBiauRelay(channel: ResponsesApiChannel) {
  if (channel.provider === 'cloudflare-model-relay') return true
  try {
    return /\/api\/model-relay(?:\/fallback)?$/u.test(new URL(channel.baseUrl).pathname.replace(/\/+$/u, ''))
  } catch {
    return false
  }
}

const MAX_RESPONSES_STREAM_BYTES = 512_000
const MAX_RESPONSES_TEXT_CHARS = 64_000

function providerFailureClass(diagnostic: ProviderDiagnostic | undefined): PublicAssistantRecoveryFailureClass {
  if (diagnostic?.kind === 'timeout') return 'timeout'
  if (diagnostic?.kind === 'network_error') return 'network'
  return 'upstream'
}

export async function readResponsesStreamContent(
  body: ReadableStream<Uint8Array> | null,
  onActivity: () => void = () => undefined,
) {
  if (!body) return ''
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const fragments = new Map<string, string>()
  let completed = ''
  let buffer = ''
  let bytesRead = 0

  const consumeFrame = (frame: string) => {
    const lines = frame.split(/\r?\n/u)
    const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() ?? ''
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim()
    if (!data || data === '[DONE]') return
    let payload: unknown
    try {
      payload = JSON.parse(data) as unknown
    } catch {
      return
    }
    if (!isRecord(payload)) return
    const type = typeof payload.type === 'string' ? payload.type : eventName
    const key = streamFragmentKey(payload)
    if (type === 'response.output_text.delta') {
      const delta = readTextValue(payload.delta)
      if (delta) fragments.set(key, `${fragments.get(key) ?? ''}${delta}`)
      return
    }
    if (type === 'response.output_text.done') {
      const text = readTextValue(payload.text)
      if (text) fragments.set(key, text)
      return
    }
    if (type === 'response.completed' && isRecord(payload.response)) {
      completed = readResponsesContent(payload.response) || completed
      return
    }
    if (type === 'error' || type === 'response.failed' || type === 'response.error') {
      throw new Error('responses-stream-provider-error')
    }

    const firstChoice = Array.isArray(payload.choices) ? payload.choices.find(isRecord) : null
    const delta = firstChoice && isRecord(firstChoice.delta) ? readMessageDelta(firstChoice.delta.content) : ''
    if (delta) {
      fragments.set('relay-choice', `${fragments.get('relay-choice') ?? ''}${delta}`)
      return
    }
    completed = readResponsesContent(payload) || completed
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      if (bytesRead > MAX_RESPONSES_STREAM_BYTES) throw new Error('responses-stream-too-large')
      onActivity()
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split(/\r?\n\r?\n/u)
      buffer = frames.pop() ?? ''
      frames.forEach(consumeFrame)
    }
    buffer += decoder.decode()
    if (buffer.trim()) consumeFrame(buffer)
  } catch (error) {
    await reader.cancel('responses-stream-decoder-stopped').catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
  return (completed || [...fragments.values()].join('')).trim()
}

function streamFragmentKey(value: Record<string, unknown>) {
  const outputIndex = typeof value.output_index === 'number' ? value.output_index : 0
  const contentIndex = typeof value.content_index === 'number' ? value.content_index : 0
  const itemId = typeof value.item_id === 'string' ? value.item_id : 'message'
  return `${outputIndex}:${contentIndex}:${itemId}`
}

export function readResponsesContent(value: unknown) {
  if (!isRecord(value)) return ''
  if (typeof value.output_text === 'string' && value.output_text.trim()) return value.output_text.trim()
  const responsesContent = Array.isArray(value.output)
    ? value.output
      .filter(isRecord)
      .filter((item) => item.type === 'message' && item.role === 'assistant' && Array.isArray(item.content))
      .flatMap((item) => item.content as unknown[])
      .filter(isRecord)
      .filter((item) => item.type === 'output_text')
      .map((item) => readTextValue(item.text))
      .join('')
      .trim()
    : ''
  if (responsesContent) return responsesContent

  const firstChoice = Array.isArray(value.choices) ? value.choices.find(isRecord) : null
  const message = firstChoice && isRecord(firstChoice.message) ? firstChoice.message : null
  return message ? readMessageContent(message.content) : ''
}

function readMessageContent(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (!Array.isArray(value)) return ''
  return value
    .filter(isRecord)
    .filter((item) => item.type === 'text' || item.type === 'output_text')
    .map((item) => readTextValue(item.text))
    .join('')
    .trim()
}

function readMessageDelta(value: unknown) {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  return value
    .filter(isRecord)
    .filter((item) => item.type === 'text' || item.type === 'output_text')
    .map((item) => readTextValue(item.text))
    .join('')
}

function readTextValue(value: unknown) {
  if (typeof value === 'string') return value
  return isRecord(value) && typeof value.value === 'string' ? value.value : ''
}

function findBalancedJson(value: string) {
  const objectStart = value.indexOf('{')
  const arrayStart = value.indexOf('[')
  const start = objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart)
  if (start < 0) return ''
  const opening = value[start]
  const closing = opening === '{' ? '}' : ']'
  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = start; index < value.length; index += 1) {
    const char = value[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') quoted = true
    else if (char === opening) depth += 1
    else if (char === closing && --depth === 0) return value.slice(start, index + 1)
  }
  return ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
