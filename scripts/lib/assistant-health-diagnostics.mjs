import { classifyNetworkFailure, NETWORK_FAILURE_KINDS } from './network-diagnostics.mjs'

export const ASSISTANT_HEALTH_MAX_ATTEMPTS = 5
export const ASSISTANT_HEALTH_MAX_BYTES = 16 * 1024
const proxyErrors = new Set([
  'public-assistant-upstream-not-configured',
  'public-assistant-upstream-invalid-response',
  'public-assistant-upstream-response-too-large',
  'public-assistant-upstream-timeout',
  'public-assistant-upstream-unreachable',
])
const responseTypes = new Set(['json', 'html', 'other', 'none'])
const failureKinds = new Set(['none', ...NETWORK_FAILURE_KINDS, 'http_status', 'invalid_json', 'empty_response', 'response_too_large', 'invalid_health'])

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readHealthBody(response) {
  const reader = response.body?.getReader()
  if (!reader) return ''
  try {
    const tooLarge = () => Object.assign(new Error('health response too large'), { code: 'HEALTH_BODY_TOO_LARGE' })
    if (Number(response.headers.get('content-length')) > ASSISTANT_HEALTH_MAX_BYTES) throw tooLarge()
    const chunks = []
    let length = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > ASSISTANT_HEALTH_MAX_BYTES) throw tooLarge()
      chunks.push(Buffer.from(value))
    }
    return Buffer.concat(chunks).toString('utf8')
  } finally {
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

// Health has a small fixed payload. Keep this limit separate from opt-in chat.
export async function requestAssistantHealth(url, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()
  let status = 0
  let contentType = ''
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'biau-main-site-synthetic/1.0', Accept: 'application/json' },
    })
    status = response.status
    contentType = response.headers.get('content-type') || ''
    const body = await readHealthBody(response)
    let json = null
    let parseError = ''
    if (!body.trim()) parseError = 'empty-response'
    else {
      try { json = JSON.parse(body) } catch { parseError = 'invalid-json' }
    }
    return { ok: response.ok, status, durationMs: Date.now() - startedAt, contentType, json, parseError, error: '' }
  } catch (error) {
    const failureKind = controller.signal.aborted ? 'timeout'
      : error?.code === 'HEALTH_BODY_TOO_LARGE' ? 'response_too_large' : classifyNetworkFailure(error)
    return { ok: false, status, durationMs: Date.now() - startedAt, contentType, json: null, parseError: '', error: failureKind, failureKind }
  } finally {
    clearTimeout(timeout)
  }
}

export function describeAssistantHealth(response) {
  const mediaType = String(response.contentType ?? '').split(';', 1)[0].trim().toLowerCase()
  const responseType = response.parseError === 'empty-response' ? 'none'
    : mediaType === 'application/json' || mediaType.endsWith('+json') ? 'json'
      : ['text/html', 'application/xhtml+xml'].includes(mediaType) ? 'html'
        : !mediaType && !response.parseError && response.json !== null && response.json !== undefined ? 'json'
          : response.status === 0 && !mediaType ? 'none' : 'other'
  const proxyError = isRecord(response.json) && proxyErrors.has(response.json.error) ? response.json.error : null
  const failureKind = [...NETWORK_FAILURE_KINDS, 'response_too_large'].includes(response.failureKind) ? response.failureKind
    : !response.ok ? response.status ? 'http_status' : 'network_error'
      : response.parseError === 'empty-response' ? 'empty_response'
        : response.parseError ? 'invalid_json'
          : !isRecord(response.json) || response.json.ok !== true || proxyError ? 'invalid_health' : 'none'
  const issues = []
  if (response.status >= 300) issues.push(`assistant health returned HTTP ${response.status}`)
  if (NETWORK_FAILURE_KINDS.includes(failureKind)) issues.push(`assistant health request failed: ${failureKind}`)
  if (failureKind === 'response_too_large') issues.push(`assistant health response exceeded ${ASSISTANT_HEALTH_MAX_BYTES} bytes`)
  if (response.parseError === 'empty-response') issues.push('assistant health returned an empty response')
  else if (response.parseError) {
    issues.push(responseType === 'html'
      ? 'assistant health returned HTML instead of JSON; check upstream readiness and edge routing'
      : 'assistant health returned non-JSON response')
  }
  if (failureKind === 'invalid_health') issues.push(response.json?.ok === true
    ? 'assistant health payload contains an error' : 'assistant health payload missing ok=true')
  if (proxyError) issues.push(`assistant health proxy reported ${proxyError}`)
  return { failureKind, responseType, proxyError, issues }
}

// Reconstruct the artifact projection. Never copy raw issues or extra payload
// fields, and never infer success from missing diagnostics in legacy reports.
export function projectAssistantHealthAttempts(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, ASSISTANT_HEALTH_MAX_ATTEMPTS).filter((item) => isRecord(item)
    && Number.isInteger(item.attempt) && item.attempt >= 1 && item.attempt <= ASSISTANT_HEALTH_MAX_ATTEMPTS
    && Number.isInteger(item.httpStatus) && (item.httpStatus === 0 || item.httpStatus >= 100 && item.httpStatus <= 599)
    && Number.isSafeInteger(item.durationMs) && item.durationMs >= 0
  ).map((item) => ({
    attempt: item.attempt,
    httpStatus: item.httpStatus,
    durationMs: item.durationMs,
    failureKind: failureKinds.has(item.failureKind) ? item.failureKind : null,
    responseType: responseTypes.has(item.responseType) ? item.responseType : null,
    proxyError: proxyErrors.has(item.proxyError) ? item.proxyError : null,
  }))
}
