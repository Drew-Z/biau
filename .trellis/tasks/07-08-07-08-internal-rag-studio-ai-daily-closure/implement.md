# Internal RAG Sync And Studio AI Daily Closure Implementation Plan

## Checklist

1. [x] Reconfirm current task state, git status, and production-safe health endpoints.
2. [x] Inspect internal admin RAG management UI/routes and Studio/AI Daily pages for existing diagnostics.
3. [x] Identify whether the current empty internal collection is an operational action only or needs a code/docs improvement.
4. [x] Implement the smallest safe improvement.
5. [x] Run targeted validation:
   - `npm.cmd run docs:manual-gates-check`
   - `npm.cmd run project-details:check` if status/project wording changes
   - relevant assistant/studio smoke scripts for code changes
   - `npm.cmd run lint` and `npm.cmd run build` if frontend/backend code changes
6. [x] Update this task with results and remaining manual gates.
7. [ ] Commit and push if files changed and checks pass.

## Results

- Production-safe health baseline was rechecked before implementation:
  - main `/api/health` and public assistant `/health` returned `ok=true`.
  - internal assistant `/health` returned `database=true` and model configured.
  - RAG Orchestrator `/health` returned Qdrant public collection with 50 chunks and internal collection with 0 points.
  - Studio unauthenticated health returned `missing-studio-token`, which is the expected token gate.
- `src/pages/AssistantAdminPage.tsx` now explains RAG readiness by public/internal collection state, so a public-ready vector store no longer hides an empty internal collection.
- Added `docs/internal-rag-studio-ai-daily-runbook.md` with browser-side steps for internal RAG sync, Studio acceptance, AI Daily issue conversion, and static export.
- Linked the new runbook from `docs/manual-gates.md`.

## Validation

- `npm.cmd run docs:manual-gates-check` passed.
- `npm.cmd run assistant:admin-check` passed.
- `npm.cmd run studio:ai-daily-brief-check` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed. Vite printed existing ineffective dynamic import warnings only.
- `npm.cmd run check:ui` passed for 13 routes across 2 viewports after starting local preview on `127.0.0.1:5174`; the preview process was stopped afterward.
- `git diff --check` passed.
- Changed-file sensitive scan found no secret-like values.

## Remaining Manual Gates

- User opens `/assistant/admin`, enters `ADMIN_TOKEN`, refreshes RAG status, and triggers internal knowledge sync only after at least one internal document is `REVIEWED` or `ACTIVE`.
- User confirms internal collection changes from `empty · 0 chunks` to `ready · <n> chunks` after sync.
- User opens `/studio`, enters `STUDIO_ADMIN_TOKEN`, verifies Studio health/draft/source/AI Daily issue lists.
- User creates or verifies the first real AI Daily issue, converts it only to `hidden + review-needed + aiAssistance:none`, and reviews before static export.
- Any model-assisted AI Daily drafting remains a separately approved business task.

## Manual Gates To Preserve

- Browser entry of `ADMIN_TOKEN` or `STUDIO_ADMIN_TOKEN`.
- Production Render/Cloudflare/Aiven/Qdrant environment variable changes.
- Internal knowledge sync if it requires admin-token browser action.
- First real AI Daily source/issue/draft acceptance.
- Any real model-assisted drafting or rewriting.

## Expected User Runbook Output

The final answer should include exact, low-sensitive steps for:

- checking `/assistant/admin` RAG status,
- triggering internal knowledge sync,
- confirming internal collection count changes,
- opening `/studio` with token,
- creating or checking the first AI Daily issue,
- exporting only reviewed public content.
