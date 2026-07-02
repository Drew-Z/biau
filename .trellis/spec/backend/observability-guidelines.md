# Backend Observability Guidelines

## Scope

Use this guide before adding metrics endpoints, Prometheus instrumentation, OpenTelemetry exporters, RUM hooks, Sentry, ARMS, Grafana, or alerting integration.

## Current Contract

The assistant API exposes a default-off Prometheus endpoint:

- `METRICS_ENABLED=false` by default.
- `GET /metrics` returns `404 { "error": "metrics-disabled" }` unless explicitly enabled.
- `METRICS_ENABLED=true`, `1`, `yes`, or `on` enables Prometheus text output.
- `/health` remains public and independent of metrics.

## Safe Metrics

Allowed labels are low-cardinality and low-sensitivity:

- `method`
- `route` as an Express route template, not full URL.
- `status_class` such as `2xx`, `4xx`, or `5xx`.
- Histogram `le`.

Allowed metrics include:

- process start timestamp.
- process uptime.
- HTTP request counters.
- HTTP request duration histograms.

## Prohibited Metrics Data

Never include these in metrics, logs, traces, tags, or labels:

- IP addresses, User-Agent, cookies, raw headers, or Authorization values.
- Invite codes, bearer tokens, admin tokens, token hashes, or signing material.
- Member id, session id, message id, customer/user names, or exact private business counts.
- Chat message text, assistant prompt text, model responses, citations as raw JSON, or uploaded document content.
- Database URLs, model provider endpoints, provider names derived from private config, or cloud dashboard URLs.
- Full URL query strings or dynamic path ids that can create high-cardinality labels.

## Rollout Rules

- Keep new observability integrations default-off unless the task explicitly includes a production rollout gate.
- Do not add real provider DSNs, site IDs, API keys, scrape URLs, or dashboard links to the repository.
- Document real provider setup as a human gate.
- Prefer a minimal local smoke check before adding dashboards or alerts.
- Prometheus/Grafana should observe backend services first; static frontend traffic should use Cloudflare/Search Console/Plausible/Umami.

## Validation

After changing metrics or observability code:

```powershell
npm.cmd run server:build
npm.cmd run server:smoke
$env:METRICS_ENABLED='true'; npm.cmd run server:smoke; Remove-Item Env:\METRICS_ENABLED
npm.cmd run lint
npm.cmd run build
```

Also run a sensitive scan on changed files and manually inspect hits that mention token, key, bearer, database URL, private IP, or connection strings.
