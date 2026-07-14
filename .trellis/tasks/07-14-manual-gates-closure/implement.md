# Implementation Plan

- [x] Reconcile `docs/manual-gates.md`, readiness, deployment, monitoring, runbook, archived tasks, and current Qdrant evidence into the four-state classification.
- [x] Fix successful Internal Knowledge sync timestamp bookkeeping and add focused regression coverage for pending/stale/synchronized states.
- [x] Update the durable ledger to remove completed setup, separate optional observability work, and retain one ordered current human queue.
- [x] Run safe local and public synthetic checks without live assistant chat or model probes; use results to close agent-verifiable items.
- [x] Run focused backend/admin/UI/documentation checks, then full lint/build or `verify` as appropriate.
- [x] Commit and push the implementation closure.
- [x] Guide the user through the first human gate: decide whether the currently public Xunqiu stage APK must be withdrawn until formal release approval.
- [x] Guide the user through Internal Assistant post-restart memory persistence after the APK policy is truthful.
- [ ] After each user-confirmed gate, verify low-sensitive evidence, update the ledger, commit/push, and present the next single gate.

## Validation Commands

```powershell
npm.cmd run assistant:admin-check
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
