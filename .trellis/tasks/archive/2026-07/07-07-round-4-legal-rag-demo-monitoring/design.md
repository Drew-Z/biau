# Legal RAG demo and monitoring design

## Scope

This child task verifies and improves the public-safe monitoring story for Legal RAG. It may touch the Legal RAG repository for local validation and the BIAU Port repository for synthetic/status/reporting fixes. Production credentials, platform restarts, and dashboard configuration remain manual gates.

## Boundaries

- Do not publish real admin credentials, model provider details, database URLs, Render dashboard links, or private endpoint diagnostics.
- Do not run a model liveness probe. Legal RAG validation can use deterministic local tests/evals and public-safe sample questions/contracts.
- Public status must report the latest evidence by layer:
  - Web entry reachability.
  - API health reachability.
  - Auth/demo gate state.
  - Protected RAG QA, contract review, and quality panel synthetic status.
  - Platform/metrics/tracing plan.

## Current Evidence

- Local code supports the intended protected demo shape and public-safe dataset flow.
- `apps/api` tests/evals pass locally without secrets.
- Existing `public/status/legal-rag-synthetic.json` previously recorded a credentialed `open-demo` success, but the refreshed report is intentionally non-credentialed and records protected checks as credential-gated.
- `site:status` L0 Web entry and Legal API health are currently online after an earlier timeout/connection-refused window; entry reachability should not be treated as proof that protected RAG/contract review flows are available.

## Technical Design

1. Improve Legal RAG synthetic diagnostics:
   - Classify fetch failures as `timeout`, `dns_error`, `tls_error`, `connection_error`, or `network_error`.
   - Treat configured-base network failures as `offline`, not `unchecked`.
   - Keep missing-base preserve behavior so local unconfigured runs do not erase the last real report.

2. Refresh public status:
   - Generate `public/status/legal-rag-synthetic.json` from the public API base without credentials to record current API health status.
   - Regenerate `public/status/site-status.json` so `/status` shows Web entry reachability separately from API/protected synthetic checks.
   - Update `src/data/statusTargets.ts` and manual gates only if static copy needs to reflect the new separation.

3. Validate Legal RAG locally:
   - Use existing repo scripts for unit tests, validate, RAG eval, review eval, and builds as needed.
   - Avoid reading private `.env` values; use example/env shape only.

## Rollback

- Revert `scripts/check-legal-rag-synthetic.mjs` if classification changes break report generation.
- Regenerate status JSON from the previous report if a transient public outage produces an unwanted release snapshot.
- Keep manual gates for platform checks instead of trying to patch production credentials from the repository.
