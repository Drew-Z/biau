import type express from 'express'
import { env } from './env.js'
import type { PublicAssistantRecoveryFailureClass, PublicAssistantRoute, PublicAssistantStatus } from './types.js'

interface HttpMetricLabels {
  [key: string]: string
  method: string
  route: string
  status_class: string
}

type MetricLabels = Record<string, string>

interface HistogramState {
  count: number
  sum: number
  buckets: Map<number, number>
}

const startedAt = Date.now()
const durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15, 20, 30, 45]
const modelDurationBuckets = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15, 20, 30, 45]
const firstActivityBuckets = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20]
const requestCounts = new Map<string, { labels: HttpMetricLabels; value: number }>()
const requestDurations = new Map<string, { labels: HttpMetricLabels; state: HistogramState }>()
const publicAssistantRuns = new Map<string, { labels: MetricLabels; value: number }>()
const publicAssistantModelAttempts = new Map<string, { labels: MetricLabels; value: number }>()
const publicAssistantModelDurations = new Map<string, { labels: MetricLabels; state: HistogramState }>()
const publicAssistantFirstActivity = new Map<string, { labels: MetricLabels; state: HistogramState }>()

const publicRoutes = new Set<PublicAssistantRoute>(['direct', 'site', 'web', 'combined'])
const publicOutcomes = new Set<PublicAssistantStatus>(['answered', 'partial', 'uncertain', 'degraded', 'blocked'])
const attemptOutcomes = new Set(['success', 'failure', 'cancelled'] as const)
const failureClasses = new Set<PublicAssistantRecoveryFailureClass | 'none'>([
  'none', 'not_configured', 'timeout', 'network', 'upstream', 'empty', 'invalid',
])

export function createMetricsMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    if (req.path === '/metrics') {
      next()
      return
    }

    const started = process.hrtime.bigint()
    res.on('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - started) / 1_000_000_000
      const labels = {
        method: normalizeMethod(req.method),
        route: readRouteLabel(req),
        status_class: readStatusClass(res.statusCode),
      }
      recordHttpRequest(labels, durationSeconds)
    })

    next()
  }
}

export function renderPrometheusMetrics() {
  const lines = [
    '# HELP biau_assistant_api_started_timestamp_seconds Unix timestamp when the assistant API process started.',
    '# TYPE biau_assistant_api_started_timestamp_seconds gauge',
    `biau_assistant_api_started_timestamp_seconds ${Math.floor(startedAt / 1000)}`,
    '# HELP biau_assistant_api_uptime_seconds Assistant API process uptime in seconds.',
    '# TYPE biau_assistant_api_uptime_seconds gauge',
    `biau_assistant_api_uptime_seconds ${Math.max(0, (Date.now() - startedAt) / 1000).toFixed(3)}`,
    '# HELP biau_assistant_api_http_requests_total Total HTTP requests handled by method, route template, and status class.',
    '# TYPE biau_assistant_api_http_requests_total counter',
  ]

  for (const item of requestCounts.values()) {
    lines.push(`biau_assistant_api_http_requests_total${formatLabels(item.labels)} ${item.value}`)
  }

  lines.push(
    '# HELP biau_assistant_api_http_request_duration_seconds HTTP request duration in seconds by method, route template, and status class.',
    '# TYPE biau_assistant_api_http_request_duration_seconds histogram',
  )

  for (const item of requestDurations.values()) {
    renderHistogram(lines, 'biau_assistant_api_http_request_duration_seconds', item.labels, item.state, durationBuckets)
  }

  lines.push(
    '# HELP biau_public_assistant_runs_total Completed public assistant runs by route and public outcome.',
    '# TYPE biau_public_assistant_runs_total counter',
  )
  renderCounters(lines, 'biau_public_assistant_runs_total', publicAssistantRuns)
  lines.push(
    '# HELP biau_public_assistant_model_attempts_total Public assistant model attempts by bounded outcome and safe failure class.',
    '# TYPE biau_public_assistant_model_attempts_total counter',
  )
  renderCounters(lines, 'biau_public_assistant_model_attempts_total', publicAssistantModelAttempts)
  lines.push(
    '# HELP biau_public_assistant_model_attempt_duration_seconds Public assistant model attempt duration in seconds.',
    '# TYPE biau_public_assistant_model_attempt_duration_seconds histogram',
  )
  for (const item of publicAssistantModelDurations.values()) {
    renderHistogram(lines, 'biau_public_assistant_model_attempt_duration_seconds', item.labels, item.state, modelDurationBuckets)
  }
  lines.push(
    '# HELP biau_public_assistant_model_first_activity_seconds Time to first provider activity for public assistant model attempts.',
    '# TYPE biau_public_assistant_model_first_activity_seconds histogram',
  )
  for (const item of publicAssistantFirstActivity.values()) {
    renderHistogram(lines, 'biau_public_assistant_model_first_activity_seconds', item.labels, item.state, firstActivityBuckets)
  }

  return `${lines.join('\n')}\n`
}

export function recordPublicAssistantRun(route: PublicAssistantRoute, outcome: PublicAssistantStatus) {
  if (!env.metricsEnabled || !publicRoutes.has(route) || !publicOutcomes.has(outcome)) return
  incrementCounter(publicAssistantRuns, { route, outcome })
}

export function recordPublicAssistantModelAttempt(input: {
  outcome: 'success' | 'failure' | 'cancelled'
  failureClass?: PublicAssistantRecoveryFailureClass
  durationMs: number
  firstActivityMs?: number
}) {
  if (!env.metricsEnabled || !attemptOutcomes.has(input.outcome)) return
  const failureClass = input.failureClass ?? 'none'
  if (!failureClasses.has(failureClass)) return
  const labels = { outcome: input.outcome, failure_class: failureClass }
  incrementCounter(publicAssistantModelAttempts, labels)
  observeHistogram(publicAssistantModelDurations, labels, Math.max(0, input.durationMs) / 1_000, modelDurationBuckets)
  if (input.firstActivityMs !== undefined) {
    observeHistogram(publicAssistantFirstActivity, labels, Math.max(0, input.firstActivityMs) / 1_000, firstActivityBuckets)
  }
}

export function resetMetricsForTests() {
  requestCounts.clear()
  requestDurations.clear()
  publicAssistantRuns.clear()
  publicAssistantModelAttempts.clear()
  publicAssistantModelDurations.clear()
  publicAssistantFirstActivity.clear()
}

function recordHttpRequest(labels: HttpMetricLabels, durationSeconds: number) {
  incrementCounter(requestCounts, labels)
  observeHistogram(requestDurations, labels, durationSeconds, durationBuckets)
}

function readRouteLabel(req: express.Request) {
  const routePath = req.route?.path
  if (typeof routePath === 'string') return routePath
  if (Array.isArray(routePath)) return routePath.join('|')
  return 'unmatched'
}

function readStatusClass(statusCode: number) {
  if (!Number.isFinite(statusCode)) return 'unknown'
  return `${Math.floor(statusCode / 100)}xx`
}

function normalizeMethod(method: string) {
  const normalized = method.trim().toUpperCase()
  return /^[A-Z]+$/.test(normalized) ? normalized : 'UNKNOWN'
}

function incrementCounter(
  store: Map<string, { labels: MetricLabels; value: number }>,
  labels: MetricLabels,
) {
  const key = metricKey(labels)
  const counter = store.get(key) ?? { labels, value: 0 }
  counter.value += 1
  store.set(key, counter)
}

function observeHistogram(
  store: Map<string, { labels: MetricLabels; state: HistogramState }>,
  labels: MetricLabels,
  value: number,
  buckets: number[],
) {
  if (!Number.isFinite(value)) return
  const key = metricKey(labels)
  const histogram = store.get(key) ?? {
    labels,
    state: { count: 0, sum: 0, buckets: new Map(buckets.map((bucket) => [bucket, 0])) },
  }
  histogram.state.count += 1
  histogram.state.sum += value
  for (const bucket of buckets) {
    if (value <= bucket) histogram.state.buckets.set(bucket, (histogram.state.buckets.get(bucket) ?? 0) + 1)
  }
  store.set(key, histogram)
}

function renderCounters(
  lines: string[],
  name: string,
  store: Map<string, { labels: MetricLabels; value: number }>,
) {
  for (const item of store.values()) lines.push(`${name}${formatLabels(item.labels)} ${item.value}`)
}

function renderHistogram(
  lines: string[],
  name: string,
  labels: MetricLabels,
  state: HistogramState,
  buckets: number[],
) {
  for (const bucket of buckets) {
    lines.push(`${name}_bucket${formatLabels({ ...labels, le: String(bucket) })} ${state.buckets.get(bucket) ?? 0}`)
  }
  lines.push(
    `${name}_bucket${formatLabels({ ...labels, le: '+Inf' })} ${state.count}`,
    `${name}_sum${formatLabels(labels)} ${state.sum.toFixed(6)}`,
    `${name}_count${formatLabels(labels)} ${state.count}`,
  )
}

function metricKey(labels: MetricLabels) {
  return Object.entries(labels).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('\t')
}

function formatLabels(labels: MetricLabels) {
  return `{${Object.entries(labels)
    .map(([key, value]) => `${key}="${escapeLabelValue(value)}"`)
    .join(',')}}`
}

function escapeLabelValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"')
}
