# Check Notes

## 2026-07-07

- Ran `npm.cmd run studio:smoke`.
  - Result: passed.
  - Scope: Studio sample export dry run, project detail plan sample, status detail plan sample, and offline AI Daily draft sample.
  - Safety: no model calls, no external fetches, no production database required, and no tracked `content-drafts/` smoke artifact was left behind.
- Added `docs/studio-ai-daily-production-readiness.md`.
  - Records current closure state, service/database boundaries, production acceptance order, and manual gates.
  - Clarifies that `biau-internal-assistant-api` uses `DATABASE_URL` for member/session data while both internal assistant and Studio API must share the same `STUDIO_DATABASE_URL` for content drafts.
- Linked the readiness record from:
  - `docs/content-studio.md`
  - `docs/ai-daily-pipeline.md`
  - `docs/deployment.md`
- Updated the parent manual gate queue with Studio / AI Daily production verification steps.
- Re-ran `npm.cmd run studio:smoke` after documentation changes.
  - Result: passed.
- Ran `git diff --check`.
  - Result: passed; Git reported line-ending warnings only.
- Ran a sensitive scan over changed Studio/AI Daily docs and task files.
  - Result: no real secret-like values matched.
