# Main site verification diagnostics implementation plan

## 1. Shared diagnostics contracts

- Add `scripts/lib/network-diagnostics.mjs` with bounded nested error-code extraction and fixed issue kinds.
- Add `scripts/lib/status-output.mjs` with explicit flag parsing, allowed-root validation and atomic JSON writes.
- Add `scripts/lib/verification-progress.mjs` with group/context timing and failure reporting.
- Add `scripts/lib/ui-network-guard.mjs` so smoke/full share one deterministic request boundary.
- Add `scripts/check-verification-diagnostics.mjs` fixtures for network categories, HTTP 403/404/500, redacted public projection and path rejection.
- Register `verification:diagnostics-check` in `package.json`.

Rollback point: shared modules and fixture command are independently removable before consumers migrate.

## 2. Public link diagnostics

- Replace text-only `classifyIssueKind` with structured `issueKind` from the shared network module.
- Preserve detailed local CLI diagnostics while ensuring `buildStatusPayload` consumes only fixed categories/counts/templates.
- Keep 200-399 success, 403/404 failure, and retry only for transient network/5xx classes.
- Extend diagnostics fixtures to assert 403 never passes or becomes a network category.

## 3. Explicit status writes

- Migrate main-site, Legal RAG, ERP, Xunqiu, Pet and Playlab synthetic scripts to the shared `--write-status` contract.
- Migrate `generate-site-status.ts` and `check-reliability-suite.mjs` to default no-write behavior.
- Add explicit publish npm aliases for workflows that intentionally update committed snapshots.
- Make reliability suite use a unique temporary status directory for child outputs, clean it in `finally`, and publish only after a complete successful projection.
- Preserve existing strict exit behavior independently of write mode.

Risky files: every synthetic currently reads/writes a stable public path; verify baseline reads remain read-only and output path changes do not alter status calculations.

Rollback point: each writer can temporarily retain its old path behind explicit `--write-status`; never restore implicit writes.

## 4. UI smoke progress and isolation

- Install shared progress output in `check-ui-smoke.mjs` for each route/viewport.
- Add a reusable local-network guard before navigation.
- Keep existing five-route, three-viewport, CSS chunk, loading-flash and overflow assertions.
- Verify smoke creates no status files and sends no external requests.

## 5. Full UI progress and isolation

- Add the same local-network guard to every page created by `check-ui.mjs` without changing fixture ordering.
- Add named progress groups around existing top-level blocks; do not delete or weaken assertions.
- Preserve the 17-route × 2-viewport matrix and every existing assistant/background/Studio/AI Daily check.
- Print current group/context for unhandled failures and final per-group timing summary.

Risky file: `scripts/check-ui.mjs` is large and sequential. Prefer additive wrappers and mechanical page-factory replacement over moving assertion bodies.

Rollback point: progress calls and page factory can be removed without touching assertions.

## 6. Contracts and documentation

- Update frontend quality specs with UI network isolation and progress requirements.
- Update backend/observability or deployment docs with explicit status publication semantics.
- Update task acceptance checkboxes only after final validation.

## 7. Validation

Run in order:

```powershell
npm.cmd run verification:diagnostics-check
npm.cmd run lint
npm.cmd run build
npm.cmd run status:contract
npm.cmd run check:ui:smoke
npm.cmd run check:ui
npm.cmd run performance:check
git diff --check
```

Additional assertions:

- Hash or diff `public/status/*` before and after default synthetic/reliability checks; expect no changes.
- Run one explicit write against a controlled temporary path and validate atomic JSON output.
- Confirm no fixture invokes a deployed API, model, search or embedding service.
- Record full UI group timings in the task notes/journal for future slow-group work.

## Verification record

- `verification:diagnostics-check`, `lint`, `build`, `status:contract`, `docs:deployment-check`, `performance:check`, `check:ui:smoke`, full `check:ui`, and `git diff --check` passed.
- Full UI retained 17 routes across desktop/mobile and completed 40 progress units in about 444 seconds.
- Largest full groups: `catalog-projects` about 206 seconds, `public-assistant` about 78 seconds, `studio-mobile` about 54 seconds, `flow-intro` about 30 seconds.
- A default reliability run with controlled skips completed through OS-temp projections, and SHA-256 hashes for every `public/status/*` file were unchanged before/after.
- No live model, search, embedding, or production assistant prompt was sent.
