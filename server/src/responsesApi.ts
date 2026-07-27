import type { ProviderDiagnostic, ProviderDiagnosticKind } from './types.js'

export interface ResponsesApiChannel {
  apiKey: string
  baseUrl: string
  model: string
}

export interface ResponsesApiResult {
  content: string | null
  diagnostic?: ProviderDiagnostic
  failure?: 'not_configured' | 'provider_error' | 'empty_response' | 'invalid_response'
}

export async function requestResponsesText(input: {
  channel: ResponsesApiChannel
  system: string
  user: string
  timeoutMs: number
  signal?: AbortSignal
  stream?: boolean
}): Promise<ResponsesApiResult> {
  if (!input.channel.apiKey || !input.channel.baseUrl || !input.channel.model) {
    return { content: null, failure: 'not_configured' }
  }

  const endpoints = responsesEndpoints(input.channel.baseUrl)
  let diagnostic: ProviderDiagnostic | undefined
  for (const [index, endpoint] of endpoints.entries()) {
    const attempt = await requestEndpoint({ ...input, endpoint })
    diagnostic = { ...attempt.diagnostic, attemptedEndpoints: index + 1 }
    if (attempt.ok) {
      const content = attempt.content.trim()
      if (!content) {
        return {
          content: null,
          failure: 'empty_response',
          diagnostic: {
            kind: 'empty_response',
            attemptedEndpoints: index + 1,
            timeoutMs: input.timeoutMs,
          },
        }
      }
      return { content, diagnostic }
    }
    if (!attempt.httpStatus || ![404, 405].includes(attempt.httpStatus)) break
  }
  return { content: null, failure: 'provider_error', diagnostic }
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
}) {
  const abort = new AbortController()
  let diagnosticKind: ProviderDiagnosticKind = 'network_error'
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
        input: [
          { role: 'system', content: [{ type: 'input_text', text: input.system }] },
          { role: 'user', content: [{ type: 'input_text', text: input.user }] },
        ],
      }),
      signal: abort.signal,
    })
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      return {
        ok: false,
        content: '',
        httpStatus: response.status,
        diagnostic: {
          kind: 'http_status' as const,
          httpStatus: response.status,
          attemptedEndpoints: 0,
          timeoutMs: input.timeoutMs,
        },
      }
    }
    const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
    const content = input.stream && contentType.includes('text/event-stream')
      ? await readResponsesStreamContent(response.body, armTimeout)
      : readResponsesContent(await response.json().catch(() => null))
    return {
      ok: true,
      content,
      httpStatus: response.status,
      diagnostic: {
        kind: 'http_status' as const,
        httpStatus: response.status,
        attemptedEndpoints: 0,
        timeoutMs: input.timeoutMs,
      },
    }
  } catch {
    input.signal?.throwIfAborted()
    return {
      ok: false,
      content: '',
      httpStatus: null,
      diagnostic: {
        kind: diagnosticKind,
        attemptedEndpoints: 0,
        timeoutMs: input.timeoutMs,
      },
    }
  } finally {
    if (timeout) clearTimeout(timeout)
    input.signal?.removeEventListener('abort', onAbort)
  }
}

const MAX_RESPONSES_STREAM_BYTES = 512_000

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
