# Check Notes

## 2026-07-07

- Ran `npm.cmd run site:status -- --timeout 20000`.
  - Result: generated `public/status/site-status.json`.
  - Summary: `online=4 degraded=0 offline=1 unchecked=0`.
  - Finding: `legal-rag-entry` is currently `offline` with low-sensitive `issueKind=network_error`; a direct local probe previously showed an `ETIMEDOUT` class, so this is recorded as a platform/network manual gate.
- Ran `npm.cmd run reliability:check`.
  - Result: generated `public/status/reliability-suite.json`.
  - Summary: `passed=6 failed=1 skipped=1`.
  - Expected failure: `site-status` reports the current Legal RAG public workbench entry reachability failure.
  - Expected skip: `legal-rag` synthetic is skipped locally because `LEGAL_RAG_API_BASE_URL` is not configured; the existing credentialed synthetic report is preserved and still records the protected functional flow as online.
- Ran `npm.cmd run lint`.
  - Result: passed.
- Ran `npm.cmd run build`.
  - Result: passed. Vite/Rolldown emitted existing dynamic-import/plugin timing warnings only.
- Ran `npm.cmd run check:ui`.
  - Result: passed for 12 routes across 2 viewports.
- Ran `git diff --check`.
  - Result: passed; Git reported line-ending warnings only.
- Ran a sensitive scan over changed task/spec/script/status files.
  - Result: only policy text and placeholder examples matched; no real secrets, database URLs, bearer tokens, provider endpoints, or passwords were found.

