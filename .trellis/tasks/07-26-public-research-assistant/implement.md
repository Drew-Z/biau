# Public research assistant implementation

## Ordered work

- [x] Add public assistant request/answer/evidence/run types, bounded environment configuration, and a Responses-only single-model adapter.
- [x] Implement the public-only LangGraph with conditional routing, public tool registry, evidence grading, one recovery loop, cancellation, and public-safe metadata.
- [x] Upgrade Qdrant public sync/retrieval to versioned dense+sparse hybrid, RRF, real optional reranking, and truthful health/diagnostics.
- [x] Add Exa discovery plus SSRF-safe original-page fetching, extraction, canonicalization, prompt-injection isolation, and deterministic fixtures.
- [x] Add anonymous session/turn/feedback/aggregate persistence, 30-day retention, coverage-gap projection, rate limiting, and low-sensitive metrics.
- [x] Replace the public chat API and make Cloudflare Functions a thin proxy; preserve explicit browser-local degradation.
- [x] Rework the widget for scope selection, multi-turn context, progress, precise citations, suggestions, retry/copy/feedback, accessibility, and mobile layouts.
- [x] Add publication-triggered versioned public knowledge sync and retain manual recovery sync.
- [ ] Run local and approved deployed acceptance, then remove Operator/internal RAG pages, routes, tools, tables, service configuration, scripts, and stale documentation.
- [ ] Update backend/frontend specs, deployment/runbook/manual gates, commit, push `main`, and archive the Trellis task. (Specs and deployment contract updated; commit/deployed acceptance/retirement/archive remain.)

## Validation

- `npm.cmd run prisma:generate`
- `npm.cmd run prisma:validate`
- `npm.cmd run assistant:index`
- `npm.cmd run assistant:kg-check`
- `npm.cmd run assistant:rag-smoke`
- `npm.cmd run assistant:agent-contract`
- Add and run public graph, web-research security, hybrid retrieval, persistence/retention, Cloudflare proxy, and UI contract checks.
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
- Server service modes, public/Operator Cloudflare facades, Studio export, Prisma validation/generation, server build/smoke, lint, production build, performance budgets, deployment contract, and 19-route desktop/mobile UI checks pass.
- No live model, search, embedding, Qdrant, or reranker request was sent.
- Next gate: deploy the public service migration, RAG service, and Cloudflare thin proxy; then run one user-approved real research question plus feedback and sync acceptance. Operator/internal-RAG retirement remains blocked on that deployed acceptance by design.

## Review and rollback points

- Keep the existing public response fields additive until the new widget is deployed; remove legacy fields only in the final cleanup.
- Do not delete Operator tables or the Render Operator service before public persistence, deployed chat, feedback, and RAG acceptance pass.
- Do not switch the Qdrant alias until the replacement collection passes dimension, count, hybrid-query, and citation fixtures.
- Treat `.codex-patch-test` as a user-owned untracked file; do not edit, delete, or commit it.
