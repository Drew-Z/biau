# Implementation Plan

- [x] Audit the four remaining active task directories against their task status, implementation checklists, and recorded validation.
- [x] Compare every unresolved production gate with `docs/manual-gates.md`; add or update only missing current items.
- [x] Remove stale or completed actions from the recommended human queue while preserving low-sensitive completion evidence.
- [x] Set Trellis `session_auto_commit: false` while keeping `.trellis/workspace/` local-only.
- [x] Run `npm.cmd run docs:manual-gates-check`, relevant documentation checks, and `git diff --check`.
- [x] Commit and push the ledger/configuration closure.
- [x] Archive the three completed tasks and the completed 24/24 production-acceptance coordination task.
- [x] Archive this closure task, record the session locally, and push archive commits.

## Risk Controls

- Never archive based on checklist count alone; confirm remaining actions are represented in the durable ledger.
- If an ignored archive destination must be tracked, stage only the validated exact task archive path; never force-add archive roots, wildcards, Trellis runtime, workspace, backups, or temporary files.
- Do not execute credentialed checks or live model calls while validating documentation.
- Review `git status --short` before every commit so unrelated work is not included.
