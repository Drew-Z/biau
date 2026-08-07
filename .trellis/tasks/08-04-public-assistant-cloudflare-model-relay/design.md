# Public assistant Cloudflare model relay design

## Boundary

The public assistant remains a Render-hosted Agentic RAG service. Cloudflare Pages adds a narrow server-to-server egress adapter:

```text
Browser -> Cloudflare public chat proxy -> Render Agent/RAG
                                      -> authenticated Cloudflare model relay
                                           -> fixed approved Responses upstream
```

The relay is not a second assistant service. It owns no prompt, planning, retrieval, conversation, database, or provider-selection policy.

## Route and environment contract

Routes: `POST /api/model-relay/responses` and `POST /api/model-relay/fallback/responses`

Cloudflare server-only bindings:

- `MODEL_RELAY_SHARED_TOKEN`: authenticates Render.
- `MODEL_RELAY_UPSTREAM_BASE_URL`: fixed HTTPS Responses-compatible base.
- `MODEL_RELAY_UPSTREAM_API_KEY`: upstream bearer credential.
- `MODEL_RELAY_FALLBACK_UPSTREAM_BASE_URL`: second fixed HTTPS Responses-compatible base.
- `MODEL_RELAY_FALLBACK_UPSTREAM_API_KEY`: second upstream bearer credential.
- `MODEL_RELAY_ALLOWED_MODELS`: comma-separated allowlist, bounded to three values.
- `MODEL_RELAY_TIMEOUT_MS`: optional bounded total/idle relay timeout.

Render uses the primary relay route for the existing channel and the fallback relay route for the independent `grok-channel` provider, uses the shared token for both routes, retains `responses` protocol, and keeps `grok-4.5` as the bounded fallback model.

## Request flow

1. Reject non-POST calls at the route boundary.
2. Require JSON and a bounded body.
3. Compare the bearer token to the configured shared token using SHA-256 digests and a constant-work byte loop.
4. Parse an object body and require an allowlisted `model`; preserve the bounded body without accepting any caller-supplied URL.
5. Build exactly one endpoint from the configured fixed base and issue an upstream POST with a fresh header allowlist.
6. For non-2xx responses, cancel the upstream body and return only a stable JSON error with the same status plus a fixed-enum relay failure header.
7. For successful SSE, wrap and stream the body with byte, cancellation, and timeout bounds.
8. For successful JSON, read only within the byte limit and return the body with no-store headers.

## Failure and privacy behavior

- Configuration failure returns `503 model-relay-not-configured`.
- Authentication failure returns `401 model-relay-unauthorized`.
- Invalid/unknown input returns stable `400`/`413`/`415` errors before fetch.
- Timeout/network/invalid upstream responses return stable `504`/`502` errors.
- Exact provider body, upstream URL/key, relay token, model catalog, prompt text, and request identifiers are never logged.
- Render remains the only layer that maps exact upstream status to a safe operational recovery class.

## Rollout and rollback

Deploy code first with no relay bindings; both routes fail closed and existing Render configuration remains unchanged. Then set primary and fallback Cloudflare secrets, deploy Pages, point Render primary/fallback model bases at the two relay routes, and redeploy only the public API. Rollback restores the previous Render model variables and previous Pages deployment; no data migration is involved.
