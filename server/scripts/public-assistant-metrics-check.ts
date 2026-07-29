import assert from 'node:assert/strict'
import type express from 'express'
import { env } from '../src/env.js'
import {
  createMetricsMiddleware,
  recordPublicAssistantModelAttempt,
  recordPublicAssistantRun,
  renderPrometheusMetrics,
  resetMetricsForTests,
} from '../src/metrics.js'

const originalMetricsEnabled = env.metricsEnabled

try {
  env.metricsEnabled = true
  resetMetricsForTests()

  let finish: (() => void) | undefined
  const middleware = createMetricsMiddleware()
  middleware(
    { path: '/chat/public', method: 'POST', route: { path: '/chat/public' } } as express.Request,
    {
      statusCode: 200,
      on(event: string, listener: () => void) {
        if (event === 'finish') finish = listener
        return this
      },
    } as express.Response,
    () => undefined,
  )
  finish?.()

  recordPublicAssistantRun('direct', 'answered')
  recordPublicAssistantRun('web', 'degraded')
  recordPublicAssistantModelAttempt({ outcome: 'success', durationMs: 19_500, firstActivityMs: 750 })
  recordPublicAssistantModelAttempt({ outcome: 'failure', failureClass: 'timeout', durationMs: 30_500 })
  recordPublicAssistantRun('private-route' as never, 'answered')
  recordPublicAssistantModelAttempt({ outcome: 'failure', failureClass: 'raw-provider-error' as never, durationMs: 1 })

  const metrics = renderPrometheusMetrics()
  for (const expected of [
    'biau_public_assistant_runs_total{route="direct",outcome="answered"} 1',
    'biau_public_assistant_runs_total{route="web",outcome="degraded"} 1',
    'biau_public_assistant_model_attempts_total{outcome="success",failure_class="none"} 1',
    'biau_public_assistant_model_attempts_total{outcome="failure",failure_class="timeout"} 1',
    'biau_public_assistant_model_attempt_duration_seconds_bucket{outcome="success",failure_class="none",le="20"} 1',
    'biau_public_assistant_model_attempt_duration_seconds_bucket{outcome="failure",failure_class="timeout",le="45"} 1',
    'biau_public_assistant_model_first_activity_seconds_count{outcome="success",failure_class="none"} 1',
    'biau_assistant_api_http_request_duration_seconds_bucket{method="POST",route="/chat/public",status_class="2xx",le="45"} 1',
  ]) {
    assert(metrics.includes(expected), `metrics output should include ${expected}`)
  }

  for (const forbidden of [
    'private-route',
    'raw-provider-error',
    'provider=',
    'model=',
    'endpoint=',
    'request_id=',
    'session_id=',
    'message_id=',
    'token=',
    'prompt=',
  ]) {
    assert(!metrics.toLowerCase().includes(forbidden), `metrics output must not include ${forbidden}`)
  }

  env.metricsEnabled = false
  resetMetricsForTests()
  recordPublicAssistantRun('direct', 'answered')
  assert(!renderPrometheusMetrics().includes('biau_public_assistant_runs_total{'), 'disabled metrics must not collect runs')

  console.log('Public assistant bounded metrics contracts passed.')
} finally {
  resetMetricsForTests()
  env.metricsEnabled = originalMetricsEnabled
}
