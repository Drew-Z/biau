# Public Assistant Engineering Dossier

## Executive Summary

The BIAU Port public assistant is an anonymous, public-only research surface embedded as a lazy floating widget. It can answer from sanitized site knowledge, fetched public web pages, or both, while returning claim-linked citations and a bounded public response contract. [source-verified] Evidence: E-PA-001, E-PA-002.

Its key property is evidence promotion: a search result is only a lead. A web URL becomes citation evidence only after an SSRF-safe fetch of the original HTTPS page succeeds. Site evidence comes from a public-only retrieval projection. [source-verified] Evidence: E-PA-003.

## Product Boundary

- Anonymous and read-only; no private account or Studio surface is exposed.
- Modes are `auto`, `site`, and `web`.
- Input, history, response size, and session retention are bounded.
- Provider identity, model name, endpoint, prompt, graph internals, raw errors, and private citations are never part of the public payload.
- Browser-local fallback is explicitly labeled as degraded and is not presented as a model answer.

[source-verified] Evidence: E-PA-001, E-PA-005.

## Architecture

The browser widget sends the current question, recent bounded history, mode, anonymous session ID, and current-page context. Same-origin Cloudflare Pages Functions act as size-limited, timeout-aware thin proxies for JSON, SSE, and feedback routes. The public server runs a LangGraph state machine and persists low-sensitivity turns when a database is available. [source-verified] Evidence: E-PA-002, E-PA-004, E-PA-006.

Site research uses public-only Qdrant data with dense and sparse retrieval fused by reciprocal-rank fusion and optional reranking. Web research uses search for discovery, then safe original-page retrieval. Both routes can run in parallel when the plan requires them.

## Core Implementation

- `src/components/PublicAssistantWidget.tsx` owns modes, bounded history, page context, stream progress, fallback, citations, suggestions, copy/retry, and feedback UI.
- `src/utils/publicAssistantApi.ts` validates JSON and SSE events and filters public citation URLs before rendering.
- `functions/_shared/assistant.ts` implements the same-origin Cloudflare proxy bounds for request size, response size, timeout, cancellation, and stream forwarding.
- `server/src/publicAssistantAgent.ts` compiles the LangGraph nodes and conditional edges.
- `server/src/publicAssistantModel.ts` owns the separate concise direct and evidence-bound generation profiles.
- `server/src/responsesApi.ts` owns provider-neutral Responses JSON/SSE/chat-relay decoding, output bounds, timing, cancellation, and optional JSON Schema emission.
- `server/src/publicAssistantProjection.ts` is the only internal-to-public recovery/diagnostic projection boundary.
- `server/src/publicAssistantPersistence.ts` owns optional anonymous session, turn, feedback, retention, and aggregation persistence.
- `server/src/metrics.ts` owns default-off, low-cardinality HTTP and public-assistant model-path metrics.

[source-verified] Evidence: E-PA-002, E-PA-004, E-PA-005, E-PA-006.

## Core Data Flow

1. `input_guard` blocks or normalizes unsafe input.
2. Deterministic direct intent uses a concise no-evidence request profile; other requests enter `plan` for site, web, or combined research.
3. `research` runs selected evidence channels and retains a bounded set.
4. `grade_evidence` measures support and gaps.
5. `rewrite` may retry research once.
6. `generate` creates a draft answer and claims through one initial model attempt and at most two budget-aware retries inside a shared absolute deadline.
7. `verify_claims` links claims to acceptable citations.
8. A final rewrite may downgrade unsupported language.
9. `finalize` emits the public allowlisted result.

[source-verified] Evidence: E-PA-002, E-PA-003.

## Reliability And Failure Handling

The browser prefers SSE but does not blindly replay failed streams. JSON fallback is limited to explicit legacy or unsupported-stream statuses; malformed, incomplete, timed-out, rate-limited, or failed streams are terminal for that attempt. Cancellation propagates through the same-origin proxy. [source-verified] Evidence: E-PA-004, E-PA-005.

Evidence/query rewrite is bounded to one cycle and remains separate from generation recovery. Generation retries only transient or repairable failures, uses abortable 200/400ms backoff, and never resets the absolute request deadline. Public metadata exposes only `none`, `recovered`, or `degraded`, an attempt count from one to three, and a fixed safe failure class. If support remains insufficient, the graph returns partial or uncertain language instead of fabricating certainty. Database absence does not block answering; it only removes optional persistence. [source-verified] Evidence: E-PA-002, E-PA-006.

## Trade-Offs

- Claim-level evidence improves auditability but adds retrieval, grading, and verification latency and can intentionally produce an uncertain answer.
- Parallel site/web research reduces wall-clock latency but requires bounded evidence sets, cancellation, and independent failure handling.
- SSE gives progress and cancellation, but malformed or incomplete streams must be terminal; replaying automatically could duplicate cost or cross rate-limit boundaries.
- Optional persistence keeps the assistant usable without a database, but removes feedback history and long-lived product insight when storage is unavailable.

[source-verified] Evidence: E-PA-002, E-PA-004, E-PA-005, E-PA-006.

## Security And Privacy

- Web fetch rejects unsafe destinations and only promotes fetched public HTTPS pages.
- Citation projection filters internal items, credentials, unsafe schemes, and disallowed site paths.
- IP addresses support in-process rate limiting but are not persisted as user identity.
- Anonymous sessions, turns, and feedback expire after 30 days; long-lived aggregation stores low-sensitivity topic fingerprints and counters.
- Pages proxies cap request, JSON response, and stream sizes.

[source-verified] Evidence: E-PA-003, E-PA-004, E-PA-006.

## Verification

The check matrix covers direct/site/web/combined routing, follow-up and edit/resend, graph and public payload contracts, all six safe degradation classes, bounded recovery, cancellation, prompt injection, secret seeking, citation integrity, Branch/Revision continuity, old snapshot hydration, Responses JSON/SSE/chat-relay/schema behavior, metrics, web fetch safety, hybrid retrieval, persistence, rate limits, Cloudflare proxy behavior, knowledge generation, Qdrant sync, service modes, and UI flows. Fixtures never resolve a real provider endpoint; live acceptance requires one explicit approved business question after deployment. [source-verified] Evidence: E-PA-005, E-PA-008.

## Delivery Status

The repository records successful production acceptance for deployed public chat, feedback, anonymous persistence, and public knowledge synchronization. This is a historical production observation, not an assertion that the service is healthy at the moment these notes are read. [production-observed] Evidence: E-PA-007.

## Code Entrypoints

- Browser widget: `src/components/PublicAssistantWidget.tsx`.
- Browser payload/SSE decoder: `src/utils/publicAssistantApi.ts`.
- Cloudflare proxy: `functions/_shared/assistant.ts` and `functions/api/chat/public*`.
- LangGraph runtime: `server/src/publicAssistantAgent.ts`.
- Public HTTP routes: `server/src/app.ts`.
- Anonymous persistence: `server/src/publicAssistantPersistence.ts`.
- Deployment projection: `render.yaml`.

[source-verified] Evidence: E-PA-002, E-PA-004, E-PA-005, E-PA-006, E-PA-009.

## Evidence

Primary evidence: E-PA-001 through E-PA-009. The backend specification is the contract index; code and check scripts are used to confirm individual execution paths.

## Interview Focus

Expect questions about search leads versus evidence, claim-level verification, SSE terminal semantics, graceful no-database behavior, dense+sparse fusion, SSRF defense, public payload allowlisting, bounded retries, anonymous retention, and why frontend fallback must be labeled separately from model output.
