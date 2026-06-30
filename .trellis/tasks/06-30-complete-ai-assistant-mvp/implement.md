# Complete AI Assistant MVP Implementation Plan

## Execution Guardrails

- Keep this task in `planning` until the user reviews these artifacts and approves implementation.
- Before editing code in Phase 2, load `trellis-before-dev` and the relevant `.trellis/spec/frontend` / `.trellis/spec/backend` guidance.
- Treat the current dirty working tree as user-owned unless a change is clearly part of this assistant MVP. Do not reset, overwrite, or format unrelated files.
- Do not read, write, or commit real `.env` files. Use only `.env.example`, docs, and explicit environment variable names.
- Keep this as an MVP. Do not add private knowledge ingestion, vector search, streaming, password auth, OAuth, full member management, or persisted history browsing.
- Codex is running this task inline, so `implement.jsonl` / `check.jsonl` sub-agent manifests are not the implementation gate for this session.

## Likely Work Area

- Frontend routes and assistant surfaces:
  - `src/App.tsx`
  - `src/components/PublicAssistantWidget.tsx`
  - `src/pages/AssistantPage.tsx`
  - `src/pages/AssistantAdminPage.tsx`
  - `src/data/assistant.ts`
  - `src/styles/flow-pages.css`
- Backend/API and smoke coverage:
  - `server/src/app.ts`
  - `server/src/auth.ts`
  - `server/src/db.ts`
  - `server/src/knowledge.ts`
  - `server/src/model.ts`
  - `server/scripts/smoke.ts`
  - `prisma/schema.prisma`
- Knowledge, env, and docs:
  - `scripts/generate-assistant-knowledge.ts`
  - `server/data/public-knowledge.json`
  - `.env.example`
  - `README.md`
  - `docs/deployment.md`
  - `scripts/verify.mjs`

## Ordered Checklist

### 1. Preflight

- Re-run `git status --short` and inspect only files that overlap this task.
- Re-read current assistant frontend/backend files before making edits.
- Confirm package scripts still include `assistant:index`, `prisma:validate`, `server:build`, `server:smoke`, `lint`, `build`, and `verify`.
- If implementation discovers a requirement conflict, return to Phase 1 and update `prd.md` / `design.md` before continuing.

### 2. Backend Contract Hardening

- Ensure `/health` and `/chat/public` work without `DATABASE_URL` or `OPENAI_API_KEY`.
- Keep database-required routes behind explicit safe failures with stable JSON errors:
  - `/auth/redeem-invite`
  - `/chat/internal`
  - `/admin/summary`
  - `/admin/invites`
- Verify invite redemption returns a bearer token plus basic member data and increments invite usage safely.
- Verify `/chat/internal` accepts an optional current `sessionId`, persists current-session messages when a database is available, and returns the active `sessionId` without adding session-list APIs.
- Verify admin token checks use `ADMIN_TOKEN` and that admin summary/invite creation responses match `design.md`.
- Add or adjust smoke coverage for no-secret public paths and protected/database-required failure paths when needed.
- Avoid Prisma schema changes unless a concrete defect blocks the accepted MVP contracts.

### 3. Public Assistant UI

- Preserve local fallback mode when `VITE_CHAT_API_BASE_URL` is missing.
- Keep API mode calling `/chat/public` when the API base URL is configured.
- Improve low-confidence and no-hit copy so the assistant says site content is still being organized and points to relevant public pages.
- Keep answer grounding visible through citations, suggestions, or explicit insufficient-content states.
- Avoid broad visual redesign; stay within existing assistant component styling.

### 4. Internal Assistant UI

- Add invite redemption to `/assistant` when no member token exists:
  - code input
  - display name input
  - `/auth/redeem-invite` call
  - save `biau-assistant-member-token`
  - save basic `biau-assistant-member` when useful
- Show basic member status and a clear local reset/clear-token action.
- Use `/chat/internal` with `Authorization: Bearer <member-token>` when API base URL and token are present.
- Save and reuse `biau-assistant-session-id` for the current chat session when the API returns one.
- Keep local fallback behavior useful when the backend, token, database, or model provider is unavailable.
- Make `401` and `503` states plain: missing/invalid token, missing database, or unavailable API.
- Relabel demo sessions as examples/templates or simplify them so users do not mistake them for persisted history.

### 5. Hidden Admin Page

- Add manual admin token entry, local save, and clear behavior using `biau-assistant-admin-token`.
- Fetch `GET /admin/summary` with the stored bearer token and show loading/success/error states.
- Add minimal invite creation for code, label, role, daily quota, and max uses through `POST /admin/invites`.
- Show useful success/error feedback after invite creation.
- Keep the page owner-only and lightweight; do not add member pagination, deletion, disabling, exports, analytics dashboards, or history browsing.

### 6. Knowledge, Copy, Env, And Docs

- Regenerate public assistant knowledge with `npm.cmd run assistant:index`.
- Confirm generated knowledge contains only sanitized public project/blog/site data.
- Sync `.env.example`, `README.md`, and `docs/deployment.md` with the final MVP flow:
  - frontend `VITE_CHAT_API_BASE_URL`
  - backend `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ADMIN_TOKEN`
  - local fallback behavior
  - invite redemption
  - hidden admin token usage
  - no private knowledge ingestion in this MVP
- Keep docs honest about limitations: current-session chat only, no full history UI, and public-site knowledge boundary.

### 7. Validation

Run split checks first so failures are easy to isolate:

```bash
npm.cmd run assistant:index
npm.cmd run prisma:validate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
```

Then attempt the full integration gate:

```bash
npm.cmd run verify
```

If `verify` fails because preview/UI tooling cannot run in the current environment, record the exact failing command, exit code, and observed error. Do not replace a concrete build, lint, type, API, or smoke failure with a generic environment excuse.

## Review Gates

- Before `task.py start`: user reviews `prd.md`, `design.md`, and this `implement.md`.
- After backend changes: run targeted backend checks before broad frontend work when practical.
- After frontend changes: manually inspect the public widget, `/assistant`, and `/assistant/admin` behavior in local preview if the environment allows.
- Before finish: run the split validation commands and attempt `npm.cmd run verify`.
- After successful checks: use `trellis-check`, then perform Phase 3 spec update and commit flow.

## Rollback And Risk Points

- Frontend assistant pages/widgets are the easiest rollback point: revert assistant-specific UI changes while keeping generated knowledge/docs only if still accurate.
- Backend route contract changes must be kept small because frontend and smoke tests depend on stable JSON error codes.
- LocalStorage token storage is acceptable only for this MVP hidden/internal workflow; do not present it as production-grade auth.
- Thin public blog/project content can make answers low-confidence; prefer explicit limitation copy over invented detail.
- Database-required paths must keep safe `503` behavior when `DATABASE_URL` is absent.
- Generated knowledge diffs should be reviewed for accidental private or sensitive content before finishing.
