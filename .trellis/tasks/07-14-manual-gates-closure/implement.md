# Implementation Plan

- [x] Reconcile `docs/manual-gates.md`, readiness, deployment, monitoring, runbook, archived tasks, and current Qdrant evidence into the four-state classification.
- [x] Fix successful Internal Knowledge sync timestamp bookkeeping and add focused regression coverage for pending/stale/synchronized states.
- [x] Update the durable ledger to remove completed setup, separate optional observability work, and retain one ordered current human queue.
- [x] Run safe local and public synthetic checks without live assistant chat or model probes; use results to close agent-verifiable items.
- [x] Run focused backend/admin/UI/documentation checks, then full lint/build or `verify` as appropriate.
- [x] Commit and push the implementation closure.
- [x] Guide the user through the first human gate: decide whether the currently public Xunqiu stage APK must be withdrawn until formal release approval.
- [x] Guide the user through Internal Assistant post-restart memory persistence after the APK policy is truthful.
- [x] Audit the production Studio review queue, record `needs-changes` for both non-publishable drafts, and verify no Publish Export was created.
- [x] Align `planned` reliability status with the public overview attention state, remove obsolete Operator setup steps from public assistant/project facts, and regenerate public knowledge snapshots.
- [x] Make the Studio `needs-changes` queue operable: distinguish drafts awaiting edits, support resubmission, document the five-step review flow, and cover the mobile UI with deterministic checks.
- [x] Harden Studio approval and Publish Export gates: require the complete review checklist, re-check the latest approved review before export, expose the runnable local export command, and remove completed platform setup from active documentation gates.
- [x] Prevent stale Operator session and chat responses from replacing the latest selected conversation, with a delayed-response browser regression check.
- [x] Complete the Studio draft lifecycle: explicit initial submission/resubmission, approval invalidation after terminal-state edits, archive/read-only behavior, browser-observed optimistic state guards, empty-patch rejection, and deterministic desktop/mobile UI coverage.
- [x] Bind Publish Export execution to the exact draft version and approved review, deterministically select the latest review, serialize callbacks through the bound draft row, restore target files after rejected callbacks, and make a passed export immutable.
- [x] Deploy the Publish Export version-binding migration to the Studio service and verify low-sensitive protected reads before processing the production drafts.
- [ ] Rewrite or archive the `needs-changes` Studio drafts, approve one evidence-complete revision, and create the first Publish Export.
- [ ] After each user-confirmed gate, verify low-sensitive evidence, update the ledger, commit/push, and present the next single gate.

## Validation Commands

```powershell
npm.cmd run operator:knowledge-check
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run check:ui
npm.cmd run docs:manual-gates-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

Use `npm.cmd run reliability:check` only without credentialed/live-chat opt-ins unless the user explicitly approves a concrete production task.

## Risk Controls

- Never inspect `.env*` or print platform variables.
- Never paste user tokens into commands that may be logged or committed.
- Do not treat an unavailable credentialed synthetic as a product failure; retain it as a human gate.
- Do not mark APK or public-download gates complete from debug builds.
- Review `git status --short` before staging so unrelated user work is not included.
