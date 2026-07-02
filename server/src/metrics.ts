import type express from 'express'

interface HttpMetricLabels {
  method: string
  route: string
  status_class: string
}

type MetricLabels = HttpMetricLabels & { le?: string }

interface HistogramState {
  count: number
  sum: number
  buckets: Map<number, number>
}

const startedAt = Date.now()
const durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
const requestCounts = new Map<string, { labels: HttpMetricLabels; value: number }>()
const requestDurations = new Map<string, { labels: HttpMetricLabels; state: HistogramState }>()

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
    for (const bucket of durationBuckets) {
      lines.push(
        `biau_assistant_api_http_request_duration_seconds_bucket${formatLabels({ ...item.labels, le: String(bucket) })} ${item.state.buckets.get(bucket) ?? 0}`,
      )
    }
    lines.push(
      `biau_assistant_api_http_request_duration_seconds_bucket${formatLabels({ ...item.labels, le: '+Inf' })} ${item.state.count}`,
      `biau_assistant_api_http_request_duration_seconds_sum${formatLabels(item.labels)} ${item.state.sum.toFixed(6)}`,
      `biau_assistant_api_http_request_duration_seconds_count${formatLabels(item.labels)} ${item.state.count}`,
    )
  }

  return `${lines.join('\n')}\n`
}

function recordHttpRequest(labels: HttpMetricLabels, durationSeconds: number) {
  const key = metricKey(labels)
  const counter = requestCounts.get(key) ?? { labels, value: 0 }
  counter.value += 1
  requestCounts.set(key, counter)

  const histogram =
    requestDurations.get(key) ?? {
      labels,
      state: {
        count: 0,
        sum: 0,
        buckets: new Map(durationBuckets.map((bucket) => [bucket, 0])),
      },
    }
  histogram.state.count += 1
  histogram.state.sum += durationSeconds
  for (const bucket of durationBuckets) {
    if (durationSeconds <= bucket) {
      histogram.state.buckets.set(bucket, (histogram.state.buckets.get(bucket) ?? 0) + 1)
    }
  }
  requestDurations.set(key, histogram)
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

function metricKey(labels: HttpMetricLabels) {
  return `${labels.method}\t${labels.route}\t${labels.status_class}`
}

function formatLabels(labels: MetricLabels) {
  return `{${Object.entries(labels)
    .map(([key, value]) => `${key}="${escapeLabelValue(value)}"`)
    .join(',')}}`
}

function escapeLabelValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"')
}
