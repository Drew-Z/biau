export const NETWORK_FAILURE_KINDS = Object.freeze([
  'timeout',
  'dns_error',
  'tls_error',
  'connection_error',
  'network_error',
])

export const PUBLIC_ISSUE_KINDS = Object.freeze([...NETWORK_FAILURE_KINDS, 'http_status'])

const timeoutCodes = new Set(['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'])
const dnsCodes = new Set(['ENOTFOUND', 'EAI_AGAIN'])
const tlsCodes = new Set([
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
])
const connectionCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'UND_ERR_SOCKET'])

function normalizeCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

export function collectErrorCodes(error, maxDepth = 3) {
  const codes = []
  const visited = new Set()
  let current = error

  for (let depth = 0; depth < maxDepth && current && typeof current === 'object'; depth += 1) {
    if (visited.has(current)) break
    visited.add(current)
    const code = normalizeCode(current.code)
    if (code) codes.push(code)
    current = current.cause
  }

  return codes
}

export function classifyNetworkFailure(error) {
  if (!error || typeof error !== 'object') return 'network_error'

  const name = typeof error.name === 'string' ? error.name : ''
  const codes = collectErrorCodes(error)
  if (name === 'AbortError' || name === 'TimeoutError' || codes.some((code) => timeoutCodes.has(code))) return 'timeout'
  if (codes.some((code) => dnsCodes.has(code))) return 'dns_error'
  if (codes.some((code) => tlsCodes.has(code))) return 'tls_error'
  if (codes.some((code) => connectionCodes.has(code))) return 'connection_error'
  return 'network_error'
}

export function classifyHttpResult(status) {
  const normalizedStatus = Number.isFinite(status) ? Number(status) : 0
  const ok = normalizedStatus >= 200 && normalizedStatus < 400
  return { ok, issueKind: ok ? '' : 'http_status' }
}

export function shouldRetryNetworkResult(status, issueKind) {
  if (['timeout', 'dns_error', 'connection_error', 'network_error'].includes(issueKind)) return true
  return status >= 500
}

export function normalizePublicIssueKinds(values) {
  return Array.from(new Set(values.filter((value) => PUBLIC_ISSUE_KINDS.includes(value)))).sort()
}

export function buildPublicFailureSummary(failedCount, issueKinds, nextCommand) {
  const count = Number.isFinite(failedCount) ? Math.max(0, Math.trunc(failedCount)) : 0
  const kinds = normalizePublicIssueKinds(issueKinds)
  const classes = kinds.length > 0 ? kinds.join(', ') : 'network_error'
  return `${count} public project links failed; issue classes: ${classes}. Run ${nextCommand} for details.`
}
