# Public assistant Render egress diagnostics

## Goal

Classify production generation recovery failures safely and preserve bounded same-channel fallback behavior.

## Requirements

- Classify final public-assistant generation recovery failures into a bounded, public-safe operational category suitable for Render logs.
- Preserve the existing public response contract and never expose exact upstream status, provider/model identity, endpoint, prompt, request/session identifiers, or raw errors.
- Keep logs sparse: emit one fixed recovery event only when a request ends recovered or degraded, with bounded attempts and a coarse latency bucket.
- Map access denial, rate limiting, model unavailability, timeout, configuration, and generic upstream failures deterministically; cancelled and blocked flows must not emit recovery logs.
- Keep independent-model fallback behavior bounded and allow model-specific failures to advance within the configured first-channel model list.
- Do not call a live model from deterministic checks. Production acceptance may use only the previously approved real poem request after deployment.

## Acceptance Criteria

- [x] Deterministic model/agent checks cover the safe failure-category mapping and same-channel model fallback decision.
- [x] Recovery logging contains only a fixed event name, safe failure class, attempts in the documented range, and a coarse latency bucket.
- [x] Public JSON/SSE response and persisted snapshot contracts remain unchanged and do not gain internal diagnostics.
- [x] `assistant:public-model-check`, `assistant:public-agent-check`, `server:build`, `lint`, and `build` pass.
- [x] Deployment documentation/spec records how to interpret `access_denied`, `rate_limited`, `model_unavailable`, and generic `upstream` without exposing sensitive details.
- [ ] After deployment, one approved real request identifies whether Render egress is denied, rate limited, model unavailable, or failing generically.

## Notes

- Scope is limited to the public assistant backend and deterministic checks.
- Do not modify the `learn` project or print its private channel configuration.
