# Internal Assistant Agentic Workspace Polish Implementation Plan

## Steps

1. Read relevant specs and current task docs.
2. Inspect assistant frontend files, server route files, env parsing, smoke scripts, and package scripts.
3. Pick the smallest useful improvement after inspection.
4. Implement narrowly.
5. Run focused validation:
   - `npm.cmd run assistant:service-modes-smoke` for route-boundary work.
   - `npm.cmd run server:smoke` for internal chat/backend contract work.
   - `npm.cmd run lint`
   - `npm.cmd run build`
   - `npm.cmd run check:ui` for visible assistant UI work.
   - `git diff --check`
   - targeted sensitive scan.
6. Commit and push on `main` if checks pass.

## Rollback

Rollback is reverting the small code or doc change from this child task. Avoid schema changes unless inspection proves they are necessary and fully validated.

## Execution Record

- Inspected:
  - `server/src/app.ts`
  - `server/src/agentOrchestrator.ts`
  - `server/src/agentTypes.ts`
  - `server/src/types.ts`
  - `server/scripts/smoke.ts`
  - `server/scripts/service-modes-smoke.ts`
  - `src/data/assistant.ts`
  - `src/pages/AssistantPage.tsx`
- Chosen improvement: harden frontend Agent answer metadata normalization and add a local safety regression check.
- Added `scripts/check-assistant-meta-normalizers.ts`.
- Added package script `assistant:meta-check`.
- Wired `assistant:meta-check` into `scripts/verify.mjs`.
- Validation:
  - First `assistant:meta-check` failed because the test expected the normalizer to drop a same-id safe artifact with an extra ignored field; adjusted the assertion to match the intended safe-projection behavior.
  - `npm.cmd run assistant:meta-check` passed.
  - `npm.cmd run verify` passed, including `assistant:meta-check`, `server:smoke`, `cf-assistant:smoke`, `build`, `project-details:check`, preview startup, and `check:ui`.
- No live provider/model liveness test was run.
