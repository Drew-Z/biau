# Internal Assistant Agentic Workspace Polish Implementation Plan

## Steps

1. [x] Inspect existing internal assistant/admin/studio pages and server routes.
2. [x] Inspect Prisma schema, assistant server scripts, and existing smoke/contract checks.
3. [x] Identify the smallest high-value final-shape readiness gap.
4. [x] Implement the selected improvement.
5. [x] Run focused validation.
6. [x] Run broader validation if routes/server contracts changed.
7. [x] Update task notes and parent manual gates if needed.
8. [ ] Commit and push.

## Validation Candidates

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run server:build`
- `npm.cmd run server:smoke`
- relevant assistant/admin/studio scripts found during audit
- `npm.cmd run check:ui`
- `npm.cmd run verify` if broad
- `git diff --check`
- targeted sensitive-value scan

## Rollback

Revert the selected small slice and task notes.

## Result

- Added `summarizeAssistantKnowledgeOps()` to derive internal knowledge operational readiness from normalized documents and the last sync run.
- Tightened sync diagnostic normalization to an allowlist so frontend state drops unexpected simple fields such as provider/base URL or key-like diagnostics.
- Updated `/assistant/admin` knowledge tab to show all docs, sync-eligible docs, first-sync backlog, stale eligible docs, synced eligible docs, last sync status, accepted flag, issue count, and low-sensitive diagnostic fields.
- Added `scripts/check-assistant-admin-knowledge-ops.ts` and `npm.cmd run assistant:admin-check`.
- Added `assistant:admin-check` to `scripts/verify.mjs`.

## Validation

- `npm.cmd run assistant:admin-check` ✅
- `npm.cmd run assistant:meta-check` ✅
- `npm.cmd run lint` ✅
- `npm.cmd run server:build` ✅
- `npm.cmd run server:smoke` ✅
- `npm.cmd run assistant:service-modes-smoke` ✅
- `npm.cmd run build` ✅
- `npm.cmd run verify` ✅
- `git diff --check` ✅
- Targeted sensitive-value scan ✅

## Manual Gates

- No new manual gate from this slice.
- Production verification still requires user-managed Render env, real admin/member tokens, and a meaningful business task before any real model call.
