# PRD: Trellis Task And Manual Gate Closure

## Goal

Restore a truthful, low-noise project state by archiving work that is already complete, separating durable manual gates from implementation tasks, and removing stale Trellis session-commit warnings.

## Background

- The repository is clean and `main` is synchronized with the implementation and archive commits from the latest mobile work.
- Three tasks are marked `completed` but remain under `.trellis/tasks/`.
- `07-08-production-acceptance-manual-gates-closure` has all 24 checklist items complete but remains `in_progress`; unresolved production actions are already maintained in `docs/manual-gates.md`.
- `.trellis/workspace/` is intentionally ignored, while `add_session.py` still attempts an automatic Git commit and prints a warning after every session record.
- Live credentials, model calls, production migrations, APK approvals, and platform-console actions remain human-only gates.

## Requirements

1. Archive the three completed implementation tasks after confirming their task metadata and validation records are complete.
2. Close and archive the production-acceptance coordination task if all implementation checklist items are complete and every remaining human action is represented in `docs/manual-gates.md`.
3. Consolidate the manual queue so completed or obsolete setup instructions are not presented as current work.
4. Preserve unresolved gates for Internal Assistant restart persistence, Studio review/export, Legal RAG credentials, ERP demo fixtures, Xunqiu/Pet release approval, analytics selection, and observability policy.
5. Configure Trellis session recording to stop attempting Git commits for intentionally ignored local workspace journals, without broadly unignoring `.trellis/` or force-adding runtime state.
6. Do not perform live model calls, credentialed production checks, cloud-console changes, production migrations, or release approvals.

## Acceptance Criteria

- No task with `status=completed` remains unarchived.
- The 24/24 production-acceptance coordination task is archived only after its unresolved human work is represented in the durable manual ledger.
- `docs/manual-gates.md` contains one current, ordered human queue without already-completed migration/setup steps being presented as required work.
- Trellis session recording no longer attempts an auto-commit for ignored workspace journals.
- `npm.cmd run docs:manual-gates-check`, relevant documentation checks, and `git diff --check` pass.
- No sensitive value or production endpoint is added to Git.

## Out Of Scope

- Executing any manual gate.
- Product UI or backend feature changes.
- Changing model providers, database providers, deployment accounts, analytics providers, or release policy.
