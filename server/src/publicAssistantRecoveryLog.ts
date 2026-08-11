import type {
  ProviderDiagnostic,
  PublicAssistantRecoveryFailureClass,
  PublicAssistantRecoveryMeta,
} from './types.js'

export type PublicAssistantOperationalFailureClass =
  | PublicAssistantRecoveryFailureClass
  | 'access_denied'
  | 'rate_limited'
  | 'model_unavailable'
  | 'request_rejected'
  | 'provider_unavailable'
  | 'relay_unreachable'
  | 'relay_invalid_response'
  | 'relay_response_too_large'

export type PublicAssistantRecoveryDurationBucket =
  | 'under_1s'
  | '1s_to_5s'
  | '5s_to_15s'
  | '15s_to_30s'
  | '30s_or_more'

export interface PublicAssistantRecoveryLogRecord {
  event: 'public-assistant-recovery'
  state: 'recovered' | 'degraded'
  failure_class: PublicAssistantOperationalFailureClass
  failure_origin: 'configuration' | 'public_api' | 'relay_upstream' | 'network' | 'response'
  http_status_class?: `${number}xx`
  attempts: 1 | 2 | 3
  duration_bucket: PublicAssistantRecoveryDurationBucket
}

export function buildPublicAssistantRecoveryLogRecord(input: {
  recovery?: PublicAssistantRecoveryMeta
  diagnostic?: ProviderDiagnostic
  failureClass?: PublicAssistantRecoveryFailureClass
  durationMs: number
}): PublicAssistantRecoveryLogRecord | null {
  if (!input.recovery || input.recovery.state === 'none') return null
  return {
    event: 'public-assistant-recovery',
    state: input.recovery.state,
    failure_class: classifyOperationalFailure(input.diagnostic, input.failureClass),
    failure_origin: classifyFailureOrigin(input.diagnostic, input.failureClass),
    ...httpStatusClass(input.diagnostic?.httpStatus),
    attempts: normalizeAttempts(input.recovery.attempts),
    duration_bucket: recoveryDurationBucket(input.durationMs),
  }
}

function classifyFailureOrigin(
  diagnostic?: ProviderDiagnostic,
  fallback?: PublicAssistantRecoveryFailureClass,
): PublicAssistantRecoveryLogRecord['failure_origin'] {
  if (fallback === 'not_configured') return 'configuration'
  if (fallback === 'empty' || fallback === 'invalid') return 'response'
  if (diagnostic?.relayFailure) return 'relay_upstream'
  if (diagnostic?.kind === 'network_error' || diagnostic?.kind === 'timeout') return 'network'
  if (diagnostic?.kind === 'empty_response' || diagnostic?.kind === 'invalid_response') return 'response'
  return 'public_api'
}

function httpStatusClass(status: number | undefined) {
  if (!Number.isInteger(status) || status! < 100 || status! > 599) return {}
  return { http_status_class: `${Math.floor(status! / 100)}xx` as `${number}xx` }
}

export function logPublicAssistantRecovery(input: Parameters<typeof buildPublicAssistantRecoveryLogRecord>[0]) {
  const record = buildPublicAssistantRecoveryLogRecord(input)
  if (!record) return
  console.warn(JSON.stringify(record))
}

export function classifyOperationalFailure(
  diagnostic?: ProviderDiagnostic,
  fallback: PublicAssistantRecoveryFailureClass = 'upstream',
): PublicAssistantOperationalFailureClass {
  if (diagnostic?.relayFailure === 'upstream_unreachable') return 'relay_unreachable'
  if (diagnostic?.relayFailure === 'invalid_response') return 'relay_invalid_response'
  if (diagnostic?.relayFailure === 'response_too_large') return 'relay_response_too_large'
  if (diagnostic?.relayFailure === 'timeout') return 'timeout'
  if (diagnostic?.kind === 'timeout') return 'timeout'
  if (diagnostic?.kind === 'network_error') return 'network'
  if (diagnostic?.kind !== 'http_status') return fallback
  const status = diagnostic.httpStatus ?? 0
  if (status === 401 || status === 403) return 'access_denied'
  if (status === 429) return 'rate_limited'
  if (status === 404 || status === 405) return 'model_unavailable'
  if (status === 400 || status === 409 || status === 422) return 'request_rejected'
  if (status >= 500 && status <= 599) return 'provider_unavailable'
  return 'upstream'
}

function normalizeAttempts(value: number): 1 | 2 | 3 {
  if (value === 2 || value === 3) return value
  return 1
}

function recoveryDurationBucket(durationMs: number): PublicAssistantRecoveryDurationBucket {
  const safeDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0
  if (safeDuration < 1_000) return 'under_1s'
  if (safeDuration < 5_000) return '1s_to_5s'
  if (safeDuration < 15_000) return '5s_to_15s'
  if (safeDuration < 30_000) return '15s_to_30s'
  return '30s_or_more'
}
