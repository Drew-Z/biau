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
}): Promise<ResponsesApiResult> {
  if (!input.channel.apiKey || !input.channel.baseUrl || !input.channel.model) {
    return { content: null, failure: 'not_configured' }
  }

  const endpoints = responsesEndpoints(input.channel.baseUrl)
  let diagnostic: ProviderDiagnostic | undefined
  for (const [index, endpoint] of endpoints.entries()) {
    const attempt = await requestEndpoint({ ...input, endpoint })
    diagnostic = { ...attempt.diagnostic, attemptedEndpoints: index + 1 }
    if (attempt.response?.ok) {
      const json = await attempt.response.json().catch(() => null)
      const content = readResponsesContent(json)
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
    if (!attempt.response || ![404, 405].includes(attempt.response.status)) break
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
}) {
  const abort = new AbortController()
  let diagnosticKind: ProviderDiagnosticKind = 'network_error'
  const onAbort = () => abort.abort()
  input.signal?.addEventListener('abort', onAbort, { once: true })
  const timeout = setTimeout(() => {
    diagnosticKind = 'timeout'
    abort.abort()
  }, input.timeoutMs)
  try {
    const response = await fetch(input.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.channel.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.channel.model,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: input.system }] },
          { role: 'user', content: [{ type: 'input_text', text: input.user }] },
        ],
      }),
      signal: abort.signal,
    })
    return {
      response,
      diagnostic: {
        kind: 'http_status' as const,
        httpStatus: response.status,
        attemptedEndpoints: 0,
        timeoutMs: input.timeoutMs,
      },
    }
  } catch {
    return {
      response: null,
      diagnostic: {
        kind: diagnosticKind,
        attemptedEndpoints: 0,
        timeoutMs: input.timeoutMs,
      },
    }
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', onAbort)
  }
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
