# Backend Logging Guidelines

## Current Logging Stack

The backend currently uses Node console logging, not a structured logging library. Keep logging sparse and operational until the project adopts a dedicated logger.

Existing examples:

- `server/src/index.ts` logs the listening port on startup.
- `server/src/app.ts` logs unexpected server errors in the final error middleware.
- `server/scripts/smoke.ts` logs `Assistant API smoke passed` after checks succeed.

## What to Log

Log operational lifecycle events and unexpected failures:

- Server startup and selected port.
- Smoke/verification success messages.
- Unexpected exceptions caught by the final error middleware.

If adding background jobs or deployment scripts, log start/end/failure at a level suitable for local debugging and deployment logs.

If a public-assistant recovery event must be logged, allow only a fixed event name, safe failure class, bounded attempt count, and coarse duration bucket. Do not make every attempt a default per-request log.

### Public-assistant recovery event

`logPublicAssistantRecovery()` emits at most one JSON record after a request finishes in `recovered` or `degraded` state:

```json
{"event":"public-assistant-recovery","state":"degraded","failure_class":"access_denied","attempts":1,"duration_bucket":"1s_to_5s"}
```

- `state` is only `recovered` or `degraded`.
- `attempts` is bounded to `1`, `2`, or `3`.
- `duration_bucket` is one of `under_1s`, `1s_to_5s`, `5s_to_15s`, `15s_to_30s`, or `30s_or_more`; exact latency is forbidden.
- `failure_class` may use the public recovery classes plus `access_denied`, `rate_limited`, and `model_unavailable`.
- `access_denied` means the upstream rejected the configured credential or deployment origin. Check the server-side credential pairing and provider egress policy without logging either value.
- `rate_limited` means the provider rejected the real request because of quota or rate policy. The application may continue only according to the bounded retry contract.
- `model_unavailable` means the selected Responses endpoint/model route was not available. Confirm the configured model ID against an approved catalog read; do not probe models with prompts.
- `upstream` intentionally groups all remaining HTTP/provider failures. Diagnose it with provider-side dashboards or an approved real task, never by widening production logs.

The mapper may inspect exact status in memory, but the record must never contain that status. Successful one-attempt requests and blocked/cancelled requests do not emit this recovery event.

## What Not to Log

This is a public-site project with explicit data-safety rules. Never log:

- API keys, bearer tokens, invite codes, token hashes, signing paths, or certificates.
- Real database URLs, internal hosts, SSH hosts, private IPs, or connection strings.
- Full request bodies for chat, admin, invite, auth, or future upload endpoints.
- Raw customer/company names or exact sensitive business metrics.
- Public-assistant questions, session/request identifiers, provider/model/endpoint identity, exact upstream status, raw response bodies, or raw exception text from recovery attempts.

## Error Logging

Use `console.error(error)` only at centralized boundaries, as in the final Express error middleware. Avoid duplicating the same exception in both route handlers and middleware.

## Avoid

- Do not introduce a new logging library unless the backend grows enough to need structured fields, transports, or redaction.
- Do not add noisy per-request logs for public chat or health checks.
- Do not log sanitized-looking fallback values if they were derived from real secrets; omit the value entirely.
