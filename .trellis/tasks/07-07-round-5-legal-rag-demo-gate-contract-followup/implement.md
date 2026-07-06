# Legal RAG Demo Gate Contract Followup Implementation Plan

## Steps

1. [x] Inspect Legal RAG repo rules, README, scripts, and git state.
2. [x] Inspect current main-site `legal-rag-synthetic.json`, status data, and `status:contract`.
3. [x] Add the smallest contract guard for credential-gated protected checks.
4. [x] Run `status:contract` and `verify`.
5. [x] Update this task with results and manual gates.
6. [ ] Commit and push `blog-semi`.

## Result

- `scripts/check-status-contract.ts` now validates `legal-rag-synthetic.json` demo gate fields.
- When `hasCredentials=false` or demo access is credential-required, protected Legal RAG checks (`legal-rag-qa`, `legal-rag-contract-review`, `legal-rag-observability`) cannot be marked `online`.
- When a future low-permission demo is explicitly `open-demo`, protected checks must be `online`, preventing stale gated status data from pretending the demo is complete.
- `scripts/check-ui.mjs` no longer uses `networkidle` as the default route readiness signal; it waits for React root attachment and Suspense fallback removal, avoiding false `verify` failures on Studio/status routes.

## Validation

- `npm.cmd run status:contract` passed.
- `npm.cmd run check:ui` passed after stabilizing route readiness.
- `npm.cmd run verify` passed.

## Manual Gates

- Provide and approve a low-permission Legal RAG public demo account before running credentialed `legal-rag:synthetic`.
- Re-run Legal RAG QA, contract review, and observability checks only with approved demo credentials and public-safe sample data.
- Do not publish real admin credentials, model provider details, vector/database URLs, backend private routes, or production monitoring links.

## Rollback

Revert the status contract change and task notes. Do not alter Legal RAG production config or credentials.
