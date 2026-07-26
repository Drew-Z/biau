# Public research assistant implementation

## Ordered work

- [x] Add public assistant request/answer/evidence/run types, bounded environment configuration, and a Responses-only single-model adapter.
- [x] Implement the public-only LangGraph with conditional routing, public tool registry, evidence grading, one recovery loop, cancellation, and public-safe metadata.
- [x] Upgrade Qdrant public sync/retrieval to versioned dense+sparse hybrid, RRF, real optional reranking, and truthful health/diagnostics.
- [x] Add Exa discovery plus SSRF-safe original-page fetching, extraction, canonicalization, prompt-injection isolation, and deterministic fixtures.
- [x] Add Brave Search as the default pure-search adapter, retain Exa as optional, and synchronize deterministic fixtures plus deployment contracts.
- [x] Switch the default to Tavily Basic Search without generated answers, retain Brave/Exa adapters, and update local fixtures plus deployment contracts.
- [x] Add anonymous session/turn/feedback/aggregate persistence, 30-day retention, coverage-gap projection, rate limiting, and low-sensitive metrics.
- [x] Replace the public chat API and make Cloudflare Functions a thin proxy; preserve explicit browser-local degradation.
- [x] Rework the widget for scope selection, multi-turn context, progress, precise citations, suggestions, retry/copy/feedback, accessibility, and mobile layouts.
- [x] Add publication-triggered versioned public knowledge sync and retain manual recovery sync.
- [x] Add provider Responses streaming, Express SSE progress/result transport, Cloudflare byte-stream forwarding, browser decoding, explicit unsupported-route fallback, and deterministic cross-layer fixtures.
- [ ] Run local and approved deployed acceptance, then remove Operator/internal RAG pages, routes, tools, tables, service configuration, scripts, and stale documentation. (Code, schema, configuration, docs, and reviewed retirement SQL are complete; production SQL, Render service, and internal Qdrant deletion remain manual gates.)
- [ ] Update backend/frontend specs, deployment/runbook/manual gates, commit, push `main`, and archive the Trellis task. (Specs, deployment contract, and local validation are complete; archive waits for the production retirement gates.)

## Validation

- `npm.cmd run prisma:generate`
- `npm.cmd run prisma:validate`
- `npm.cmd run assistant:index`
- `npm.cmd run assistant:kg-check`
- `npm.cmd run assistant:rag-smoke`
- `npm.cmd run assistant:public-agent-check`
- Run public model/API/persistence/rate-limit/web/sync, hybrid retrieval, Cloudflare proxy, and UI contract checks.
- `npm.cmd run assistant:service-modes-smoke`
- `npm.cmd run server:build`
- `npm.cmd run server:smoke`
- `npm.cmd run cf-assistant:smoke`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:ui`
- `npm.cmd run performance:check`
- `npm.cmd run docs:deployment-check`
- `git diff --check`

No validation command may ping, diagnose, catalog-probe, or otherwise test a live model/search/reranker channel. A real external research call requires an explicit user-approved business question.

## Local acceptance (2026-07-26)

- Public graph, Responses adapter, API projection, persistence/retention, IP-scoped rate limiting, web evidence safety, publication sync, dense+sparse hybrid retrieval, and Qdrant active-alias fallback fixtures pass.
- Server service modes, the public Cloudflare facade, Studio export, Prisma validation/generation, server build/smoke, lint, production build, performance budgets, deployment contract, and the then-current 19-route desktop/mobile UI checks passed.
- No live model, search, embedding, Qdrant, or reranker request was sent.
- Next gate: deploy the public service migration, RAG service, and Cloudflare thin proxy; then run one user-approved real research question plus feedback and sync acceptance. Operator/internal-RAG retirement remains blocked on that deployed acceptance by design.

## Deployed acceptance (2026-07-26)

- Cloudflare Pages production now carries the server-only `PUBLIC_ASSISTANT_API_BASE_URL` and a 55-second proxy budget; same-origin health and chat requests reach the public Render service.
- Cloudflare production now contains only `NODE_VERSION`, `PUBLIC_ASSISTANT_API_BASE_URL`, `PUBLIC_ASSISTANT_PROXY_TIMEOUT_MS`, and `VITE_STUDIO_API_BASE_URL`; legacy model, internal-assistant, and browser-direct public-assistant variables are absent. Preview intentionally carries only `NODE_VERSION`.
- The approved Agentic RAG web-research question returns HTTP 200 over the preferred SSE route with `ready`, six bounded `progress` events, one verified `result`, and `done`.
- The terminal result is `answered` with `mode=model` and `route=web`; it retains two fetched original-page citations, maps five claims to known citation IDs, and reports no unknown citation ID.
- The request persists its anonymous session/turn data, accepts feedback, fetches allowed public HTTPS evidence, and completes in about 22 seconds without exposing raw provider JSON or model deltas.
- Forced-web query cleanup removed temporal/request boilerplate, so Tavily now discovers Agentic RAG sources instead of pages about the Chinese phrase “截止 / 截至”.
- Public knowledge sync, Cloudflare byte-stream forwarding, the configured model, search, public RAG, and persistence paths all passed the approved business-flow acceptance. No liveness-only or catalog-probe request was sent.
- The replacement acceptance gate is therefore satisfied and R10 Operator/internal-RAG retirement may proceed. The Render Operator service and external internal Qdrant collection remain manual deletion gates until the public-only code and destructive migration are deployed and verified.

## Streaming local acceptance (2026-07-26)

- Standard Responses SSE, relay chat-shaped SSE, idle-timeout activity reset, provider-error cancellation, bounded browser decoding, explicit legacy-route fallback, Express progress/result events, and Cloudflare byte-stream forwarding pass deterministic fixtures.
- `server:build`, all public assistant model/agent/API/persistence/rate-limit/web/sync/hybrid/service-mode checks, `server:smoke`, `cf-assistant:smoke`, `lint`, `build`, deployment docs, performance budgets, and the then-current 19-route two-viewport UI suite passed without live provider calls.
- Next gate: deploy Render and Cloudflare, use the already approved Agentic RAG research question once, and require a verified `answered` or evidence-bounded `partial` terminal result before Operator/internal-RAG retirement.

## R10 public-only retirement acceptance (2026-07-26)

- Removed the Operator browser routes, Cloudflare facade, Vite proxy, LangGraph/tools/memory/auth runtime, internal knowledge API, Operator-specific scripts, service definition, environment variables, Prisma models, and stale product documentation.
- Reduced the production boundary to Public, Studio, and public-only RAG. Internal scope returns `400 unsupported-scope`; the retired generic sync route returns `404`; public alias dense+sparse RRF and deterministic reranking remain covered.
- Added reviewed PostgreSQL preflight/apply/verify scripts outside `prisma/migrations/`. They require database/user fingerprints and an explicit confirmation phrase, use a 12-table/7-enum allowlist, reject cross-boundary dependencies, protect `PublicAssistant*`, and never use `CASCADE`.
- Removed dead Operator workspace CSS while preserving Studio's shared form/status classes and all public-assistant styles. The final UI suite passes for 17 current routes across desktop and mobile viewports.
- Prisma format/validate/generate, all public assistant contracts, public-only RAG/service-mode smoke, server/Cloudflare/Studio/AI Daily checks, docs checks, lint, build, performance budget, UI checks, and `git diff --check` pass without live provider calls.
- Remaining manual gates: deploy the public-only revision, run Operator PostgreSQL preflight/apply/verify against the confirmed former Operator database, observe Public/Studio/RAG, then delete the Render Operator service and internal Qdrant collection separately.

## R10 production PostgreSQL retirement acceptance (2026-07-26)

- Created a custom-format backup of the target `public` schema and proved it by restoring into an isolated PostgreSQL 17 database; protected Public Assistant and Studio row counts matched production before retirement.
- Corrected the enum dependency guard to inspect real relation kinds instead of treating target-table indexes as external enum consumers. Production preflight then passed with zero active non-self connections and zero cross-boundary foreign keys.
- Executed the explicitly approved allowlisted transaction: all 12 retired Operator/member/private-chat/internal-knowledge tables and 7 dedicated enums were removed without `CASCADE`.
- Production `verify.sql` passed. Public Assistant persistence remained `8` sessions, `8` turns, `1` feedback record, and `2` aggregates; Studio retained `2` hidden drafts and AI Daily retained its existing empty issue state.
- Cloudflare/Public, Studio, and public-only RAG health endpoints returned HTTP 200 after retirement. The RAG public collection remained ready with 27 documents and 53 chunks.
- Remaining retirement gates are limited to deleting the suspended Render Operator service and the obsolete internal Qdrant collection. Supabase Data API grants/RLS hardening is tracked separately because it changes database access policy rather than retired data.

## Review and rollback points

- Keep the existing public response fields additive until the new widget is deployed; remove legacy fields only in the final cleanup.
- Do not delete Operator tables or the Render Operator service before public persistence, deployed chat, feedback, and RAG acceptance pass.
- Do not switch the Qdrant alias until the replacement collection passes dimension, count, hybrid-query, and citation fixtures.
- Treat `.codex-patch-test` as a user-owned untracked file; do not edit, delete, or commit it.
