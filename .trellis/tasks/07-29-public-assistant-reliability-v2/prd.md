# Public Assistant Reliability And Response Optimization

## Goal

Bring the deployed BIAU Port public assistant from a working product baseline to
a diagnosable, budget-aware, lower-latency final form. Direct requests should use
a purpose-built generation path; transient model failures should recover within
one bounded run; degraded responses should explain the safe failure class; and
operators should be able to observe latency and failure trends without exposing
provider identity, prompts, user content, credentials, or private infrastructure.

## Background

- The production public assistant is anonymous, public-only, read-only, and uses
  one configured Responses-compatible generation model.
- A user-approved production request, `生成一首古诗词`, completed successfully on
  2026-07-29 with `route=direct`, `status=answered`, and `durationMs=19972`.
  The model is usable, but the observed latency is high for a simple direct task.
- An earlier direct request returned a model fallback that was incorrectly
  presented as evidence insufficiency. Commit `70d55305` corrected the public
  state to `degraded` and changed the service copy to `回答服务已降级`.
- The current provider adapter asks for JSON through prompt instructions and
  parses the returned text. It does not yet have a route-specific direct prompt,
  a provider-capability-gated JSON Schema request, or public-safe recovery
  metadata.
- Current Prometheus output observes HTTP status and total request duration only;
  the largest finite latency bucket is 10 seconds and does not describe the
  model attempt, recovery, or failure class.
- A separate worktree contains an uncommitted retry draft. It is not part of this
  task baseline and must not be copied or overwritten blindly. This task owns a
  reviewed implementation from `origin/main` in
  `D:\workspace4Cursor\blog-semi-public-assistant-optimization`.

## Requirements

### R1. Preserve The Public Product Boundary

- Keep the assistant anonymous, public-only, read-only, and limited to one
  configured generation model.
- Keep raw model deltas server-side until sensitive-output and claim/citation
  checks pass. Do not stream unverified text to the browser.
- Never expose provider/model identity, endpoints, prompts, raw response bodies,
  keys, internal citations, database details, raw errors, or graph traces.
- Keep database and model-provider absence as explicit degradation rather than a
  server crash. Preserve session, revision, branch, feedback, cancellation,
  rate-limit, and 30-day retention contracts.

### R2. Add Budget-Aware Model Recovery

- Make one initial generation attempt and at most two retries inside the existing
  absolute public-request deadline.
- Retry only transient or repairable classes: timeout, network failure, HTTP
  408/425/429/5xx, empty response, and invalid structured output.
- Do not retry missing configuration, policy blocks, caller cancellation,
  non-retryable 4xx, or a request with insufficient remaining budget.
- Backoff and retry waits must be abortable. Cancellation and client disconnect
  must stop the current attempt and all future attempts.
- Record the final attempt count and whether recovery succeeded without exposing
  provider identity.

### R3. Optimize The Direct Route

- Use a dedicated concise system contract for `route=direct`; do not send web
  evidence instructions, citation rules, or an empty evidence payload that the
  direct task does not need.
- Keep direct claims empty and preserve the existing safety guard.
- Add a bounded direct-output limit through the shared Responses adapter. The
  default must be suitable for short creative, greeting, translation, and
  rewriting requests without truncating ordinary answers.
- Keep research routes on the full evidence-bound prompt and claim/citation
  verification path.

### R4. Add Compatible Structured Output Support

- Extend the provider-neutral Responses request with an optional JSON Schema
  output contract owned by the adapter rather than by UI or route code.
- Gate schema emission through an explicit server-side capability setting;
  browser code and committed examples must never contain provider details.
- When schema mode is off, preserve the existing prompt-plus-parser contract.
  Unsupported schema mode must fail with a safe class and must not silently
  switch protocols or endpoints.
- Add fixture coverage for Responses JSON, Responses SSE, chat-shaped relay
  compatibility, schema success, unsupported schema, empty output, invalid
  output, cancellation, and bounded size.

### R5. Expose A Public-Safe Recovery Contract

- Add a bounded optional recovery projection to the public answer metadata and
  persisted display snapshot:
  - state: `none | recovered | degraded`
  - attempts: integer from 1 through 3
  - failure class when relevant: `not_configured | timeout | network | upstream |
    empty | invalid`
- Keep this projection backward-compatible with stored version-1 display
  snapshots. Older snapshots without recovery metadata must render normally.
- Frontend normalization must own the unknown-to-typed boundary. Components must
  not cast raw payload fields.
- A recovered answer may show `已自动恢复 · N 次尝试`; a degraded answer may show
  concise Chinese copy for the safe failure class. Do not show HTTP status,
  endpoint, provider, or model.

### R6. Improve Waiting And Retry UX

- Add a public-safe `recovering` progress stage with concise copy such as
  `回答服务波动，正在重新尝试…`.
- Preserve one status announcement channel; progress repaints must not create an
  accessibility announcement storm.
- Keep the stop command authoritative during attempts and retry backoff.
- Show elapsed waiting time only when it helps long-running requests, without
  shifting the composer or message layout.
- Preserve desktop compact/fullscreen behavior, mobile fullscreen behavior,
  focus restoration, safe-area spacing, and 320/390/430 containment.

### R7. Add Low-Sensitivity Model Metrics

- Keep `/metrics` default-off and independent from `/health`.
- Extend request-duration buckets to represent 15, 20, 30, and 45 second runs.
- Add bounded counters/histograms for public-assistant route, terminal outcome,
  safe failure class, attempt count, model-attempt duration, and time to first
  provider activity.
- Labels must use fixed enums only. Never use request/session/message IDs, user
  text, citations, provider/model identity, endpoint, exact external status code,
  or arbitrary error strings.
- Deterministic checks must verify metric names, bounded labels, bucket behavior,
  and absence of sensitive fields.

### R8. Establish A Quality And Regression Evaluation Set

- Add curated deterministic fixtures for direct, site, web, combined, follow-up,
  edit/resend, evidence insufficiency, provider degradation, prompt injection,
  secret seeking, cancellation, and recovery.
- Assert route choice, claim/citation integrity, public-safe metadata, no raw
  provider leakage, branch/revision continuity, and bounded output.
- Live model/search checks remain explicit business acceptance tasks only. No
  ordinary test, health endpoint, scheduled monitor, or deployment check may
  send a model prompt.

### R9. Triage Dependency Security Without Forced Breakage

- Re-run audit against the official npm registry because the configured mirror
  does not implement the audit endpoint.
- Apply compatible patch/minor upgrades and lockfile fixes where the affected
  runtime path is used.
- Do not run `npm audit fix --force`. For advisories that are unreachable in this
  Vite/Express deployment or have no compatible fix, record the exact rationale
  and follow-up instead of hiding the result.
- Run the complete public-assistant and site build checks after dependency
  changes in a separate commit slice.

### R10. Keep Performance Proportional

- The production assistant chunk baseline is approximately 158,809 bytes raw,
  lazy-loaded, and served immutable. Do not perform a speculative component
  rewrite solely to reduce this already-lazy chunk.
- Keep the chunk lazy and prevent material regression. Split history, Markdown,
  or code-rendering support only if measurements show a meaningful first-open
  improvement and UI checks remain complete.

### R11. Make Free-Instance Cold Starts Explicit And Safe

- Opening the assistant must start a side-effect-free `/health` warm-up before
  any chat generation or persisted-session restore request is sent.
- A failed warm-up may automatically retry `/health` exactly once. The retry
  wait and both health requests must share one abortable lifecycle.
- While warming, keep the composer editable and preserve its draft, but disable
  send, suggested questions, regeneration, and other generation mutations.
- Persisted-session restore must wait until warm-up is ready so a cold instance
  does not receive competing health and history requests.
- A final warm-up failure must present a public-safe retry action. A 504 during
  warm-up means the assistant service is still starting, not that the model is
  unavailable.
- Never automatically replay a chat request, create a Revision, or consume model
  budget as part of warm-up. Do not add cron or third-party keep-alive traffic.

## Acceptance Criteria

- [ ] A direct fixture uses the concise direct request contract and never includes
      evidence/citation instructions or evidence payloads.
- [ ] Transient failure fixtures recover in at most three attempts; permanent
      failures, cancellation, and insufficient remaining budget do not retry.
- [ ] Retry delay and in-flight provider work stop on the same abort signal.
- [ ] Public answer and history projections round-trip the safe recovery metadata
      and continue to accept older snapshots without it.
- [ ] Degraded UI distinguishes timeout, network, upstream, empty, invalid, and
      not-configured classes without exposing private provider diagnostics.
- [ ] Recovery progress, stop, retry, history, edit/resend, branch, revision,
      feedback, desktop/fullscreen, and mobile focus contracts pass fixtures.
- [ ] Structured output mode passes local fixture coverage and can be disabled
      without changing route behavior or public response shape.
- [ ] Metrics include extended latency buckets and bounded public-assistant model
      outcomes; a sensitive-field scan finds no user/provider/credential labels.
- [ ] The curated evaluation set covers every route and failure boundary in R8.
- [ ] A cold-start UI fixture returns 504 then 200 from `/health`, observes
      exactly two health requests and zero chat requests while warming, preserves
      an editable draft, enables send only after readiness, and starts persisted
      history restore only after the successful health response.
- [ ] Compatible dependency fixes are applied, or residual advisories have a
      written reachability/fix rationale. No forced major downgrade is used.
- [ ] `assistant:public-agent-check`, `assistant:public-model-check`,
      `assistant:public-api-check`, `assistant:public-persistence-check`,
      `assistant:public-rate-limit-check`, `assistant:public-web-check`,
      `assistant:public-conversation-check`, `cf-assistant:smoke`, `server:build`,
      `lint`, `build`, and a dedicated-port `check:ui` pass.
- [ ] Production rollout deploys only the static site and
      `biau-public-assistant-api`; Studio and RAG Orchestrator are not restarted.
- [ ] After deployment, `/health` is verified without a model call. Exactly one
      user-approved business request may verify the model path, and its temporary
      session is deleted after acceptance.

## Out Of Scope

- Reintroducing the retired internal assistant or member authentication.
- Switching the configured generation model, search provider, vector database,
  embedding model, or reranker.
- Multiple generation models or cross-model routing.
- Raw token streaming before public verification.
- A new analytics, tracing, or hosted LLM-observability vendor account.
- Database schema migrations unrelated to the backward-compatible display
  snapshot metadata.

## Manual Gates

- Enable schema output mode in production only after the configured relay is
  confirmed to support the chosen Responses JSON Schema shape through a real
  approved business task.
- Enable production Prometheus scraping or import dashboards only after the
  operator chooses a monitoring destination. Code and fixtures remain default-off.
- Any additional live model/search acceptance beyond the single approved release
  question requires explicit approval.

## Open Questions

None block planning. The default decisions above prioritize verified final
answers, one-model compatibility, bounded recovery, and low-sensitive operations.
