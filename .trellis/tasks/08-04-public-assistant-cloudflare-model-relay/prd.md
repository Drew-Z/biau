# Public assistant Cloudflare model relay

## Goal

Route approved Responses model requests through an authenticated fixed-upstream Cloudflare relay while keeping Agent and RAG on Render.

## Requirements

- Keep LangGraph planning, hybrid RAG, web research, verification, persistence, rate limiting, and response projection on the Render public-assistant service.
- Add one Cloudflare Pages Function that relays only OpenAI-compatible Responses requests to one fixed approved upstream channel.
- Require a server-only shared bearer token using timing-safe comparison; browser cookies, authorization, forwarding headers, and arbitrary upstream URLs must never pass through.
- Restrict generation to the approved first-channel model allowlist and reject missing/unknown models before any upstream request.
- Bound request size, response size, total relay time, streaming cancellation, JSON/SSE content types, and upstream error projection.
- Preserve Responses JSON and SSE compatibility needed by the existing planner and answer adapter.
- Keep all upstream URL/key and relay token values in Cloudflare/Render secrets; no real value may enter source, docs, Vite variables, logs, or test fixtures.
- Do not call a live model from deterministic checks. After deployment, use the previously approved real poem request once and delete the temporary session.

## Acceptance Criteria

- [x] Missing/invalid relay auth, invalid content type/body/model, oversized input, unavailable config, timeout, network failure, invalid upstream content type, and oversized upstream response return stable bounded errors.
- [x] The relay forwards only the fixed upstream endpoint, generated upstream bearer credential, JSON body, and negotiated JSON/SSE `Accept` header.
- [x] Successful SSE remains streamed and cancellable; successful JSON remains bounded; raw upstream error bodies are never returned.
- [x] Cloudflare fixture checks prove that browser credentials and arbitrary endpoints/models cannot cross the boundary.
- [x] `.env.example`, deployment docs, manual gates, code-spec, and deployment checks describe the same secret/config contract.
- [x] Existing public assistant, Cloudflare proxy, lint, server build, and production build checks pass without live provider calls.
- [ ] Cloudflare production secrets and Render relay variables are applied without exposing values, both deployments succeed, and one approved request returns a model answer rather than fallback.

## Notes

- Approved model IDs: `grok-4.5`, `grok-4.20-0309`, and `grok-chat-fast`.
- The `learn` project remains read-only and supplies only the already-approved private upstream pair during secret configuration.
- Production revision `507a9a5a` is live on Cloudflare Pages and Render. The unauthenticated relay boundary returned the expected `401` without contacting a model.
- The single approved poem request on 2026-08-04 ended `degraded/fallback` after three bounded attempts and its temporary session was deleted. Render classified the result as generic `upstream`; the final acceptance criterion remains open and no automatic retry is allowed.
- Diagnostic revision `69042d4a` is live on Render with `request_rejected` / `provider_unavailable` log classification. Render and Cloudflare health pass, the redacted health reports the model channel configured, and the unauthenticated relay boundary still returns `401`; no second model request was made.
