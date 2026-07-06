# Internal Assistant Controlled Studio Draft Write Implementation Plan

## Planning Gate

- [x] User consented to creating a Trellis task.
- [x] Archived completed continuous-improvement parent task.
- [x] Created task `07-06-07-06-internal-assistant-studio-draft-write`.
- [x] Inspected current Agent runtime, Studio API, Prisma schema, Studio draft utilities, and frontend Agent diagnostics.
- [x] Wrote PRD, design, and implementation plan.

## Implementation Checklist

1. Load required specs before editing:
   - `.trellis/spec/backend/index.md`
   - `.trellis/spec/backend/agentic-workspace.md`
   - `.trellis/spec/backend/database-guidelines.md`
   - `.trellis/spec/backend/error-handling.md`
   - `.trellis/spec/frontend/state-management.md`
   - `.trellis/spec/frontend/type-safety.md`
   - `.trellis/spec/frontend/component-guidelines.md`
2. Extend safe Agent artifact types:
   - `server/src/types.ts`: add `AgentToolArtifact`.
   - `server/src/agentTypes.ts`: allow tool payload/trace artifacts.
   - `server/src/app.ts`: sanitize artifacts before persisting/loading.
3. Add server-side draft builder:
   - Either inside `server/src/agentTools.ts` or a narrow `server/src/agentStudioDrafts.ts`.
   - Build `ContentDraft` create data without importing frontend page modules.
   - Support columns: `knowledge`, `project-notes`, `resources`, `ai-daily`, `build-log`.
   - Generate safe slug and bounded collision suffix.
   - Detect sensitive values before write.
4. Upgrade `studio.draft` execution:
   - Use `getStudioPrisma()` from `server/src/db.ts`.
   - Missing Studio DB -> plan-only degraded payload.
   - Successful create -> return safe artifact summary.
   - Prisma duplicate/validation failure -> bounded retry or safe degraded summary.
   - Do not create `ContentReview`, `PublishExport`, public data files, or admin changes.
5. Improve Agent answer composition:
   - Include created draft summary in context blocks.
   - Ensure model/fallback answer says the draft is hidden and review-needed.
6. Extend frontend normalizers:
   - `src/data/assistant.ts`: normalize `tools[].artifacts`.
7. Upgrade `/assistant` inspector:
   - `src/pages/AssistantPage.tsx`: show created Studio draft artifact under the relevant tool.
8. Add no-live smoke coverage:
   - `server/scripts/smoke.ts`: use a mock/stub Studio Prisma shape or local no-DB path to assert safe degraded behavior and artifact sanitization.
   - If feasible without real DB, add a direct builder test path for draft create data.
9. Update specs if a durable contract changes:
   - `.trellis/spec/backend/agentic-workspace.md`
   - `.trellis/spec/frontend/state-management.md`

## Validation Commands

Run before implementation is considered complete:

```powershell
npm.cmd run prisma:validate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run studio:smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

No live model/provider/RAG/production diagnostics are allowed.

## Sensitive Scan

Before commit, scan changed files for:

- `sk-` style keys;
- bearer/admin/studio/member tokens;
- database URLs;
- model/RAG/Qdrant/Supabase/embedding endpoints;
- raw draft payload dumps;
- raw prompts/provider responses;
- private document bodies or local absolute paths.

## Risk Points

- Accidentally using the assistant database instead of Studio database for `ContentDraft`.
- Returning raw draft body or Prisma JSON in tool trace.
- Creating publish/export/review records from normal chat.
- Making duplicate slug errors surface as `/chat/internal` 500.
- Importing frontend UI modules into server build.
- Letting non-draft requests create hidden drafts unexpectedly.

## Rollback Points

- Keep `studio.draft` plan-only fallback easy to restore.
- Keep Studio API routes untouched.
- Keep created draft artifact optional so older messages and frontend states remain valid.

## Review Gate

After this plan is reviewed, run:

```powershell
python ./.trellis/scripts/task.py start ./.trellis/tasks/07-06-07-06-internal-assistant-studio-draft-write
```

Then load `trellis-before-dev` and implement inline.
