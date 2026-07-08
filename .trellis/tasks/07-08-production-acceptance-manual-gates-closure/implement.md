# Production Acceptance And Manual Gates Closure Implementation Plan

## Phase 1: Planning Closure

- [x] Create Trellis parent task.
- [x] Record current known facts and correct stale screenshot state.
- [x] Write `prd.md`, `design.md`, and `implement.md`.
- [x] Ask the user for the first manual acceptance choice, with a recommended default.
- [x] After user approval, run `task.py start` before implementation or production acceptance tracking changes.

## Phase 2: Studio Acceptance Slice

Recommended first slice.

1. [x] Guide the user to open `/studio`.
2. [x] User enters Studio token in the browser; Codex does not request or print it.
3. [x] Verify low-sensitive results:
   - API base configured.
   - Database online.
   - Draft list refresh works.
   - Source pool list refresh works.
   - AI Daily issue list/detail works.
4. [x] If production frontend bundle misses `VITE_STUDIO_API_BASE_URL`, guide Cloudflare Pages variable update and redeploy.
5. [ ] If results change docs/status truth, update runbook or status copy.

Current low-sensitive production check:

- Local `studio:smoke` passed without live model calls, external fetches, or tracked draft output.
- Production Studio API checked through the current frontend fallback base: `health` returned `200`, service `biau-content-studio-api`, database `true`, database role `studio-dedicated`.
- Production lists returned `200`: content drafts `1`, source items `0`, AI Daily issues `0`, publish exports `0`.
- After Cloudflare Pages redeploy, the live `studioApi` chunk includes the dedicated Studio API origin and no longer points `VITE_STUDIO_API_BASE_URL` at the RAG Orchestrator.
- Dedicated Studio API check passed: `health` returned `200`, service `biau-content-studio-api`, database `true`, database role `studio-dedicated`; lists returned `200`: content drafts `1`, source items `0`, AI Daily issues `0`, publish exports `0`.
- First dedicated Studio health request took about 53 seconds, likely Render cold start; follow-up list requests returned in milliseconds to a few seconds.
- Follow-up production read-only API check after UI polish returned `200` for health, drafts, source items, AI Daily issues, and publish exports. Low-sensitive counts at that time: drafts `2`, sources `3`, issues `1`, publish exports `0`; first health request again showed Render cold start behavior at about 58 seconds.
- `/studio` UI was polished so AI Daily issue creation uses a readable existing-source picker, selected-source summary, and collapsed advanced source-id fallback. The separate source creation card now reads as "新增来源" and no longer doubles as the primary issue source selector.
- UI overflow follow-up completed: Studio now has scoped width/min-width/overflow-wrap safeguards, a `1180px` responsive breakpoint before the three-column layout gets cramped, safer button/source picker wrapping, and a `check:ui` Studio visible-overflow guard.

Validation:

```powershell
npm.cmd run studio:smoke
npm.cmd run docs:manual-gates-check
npm.cmd run lint
npm.cmd run build
```

## Phase 3: First AI Daily Issue To Draft

1. [x] Use Studio to create or confirm public-safe source items.
2. [x] Create AI Daily issue.
3. [x] Fill brief JSON with summary, publicAngle, keySignals, and toVerify.
4. [x] Convert issue to content draft.
5. [x] Confirm draft is `ai-daily`, `hidden`, `review-needed`, and `aiAssistance: none`.
6. Only after human review, create publish export.
7. Export locally or through CI and review Git diff before commit.

Current low-sensitive production acceptance:

- Used the user-provided temporary Studio token for development acceptance only; no token value is stored in files.
- Created 3 public-safe source items.
- Created AI Daily issue `cmrc3qokb00033lhrr6o0cq0x` with 3 selected sources.
- Converted the issue to draft `cmrc3qqly00043lhr19orhgmy`, slug `ai-daily-2026-07-08`.
- Draft result: column `ai-daily`, status `review-needed`, visibility `hidden`, `aiAssistance=none`.
- No model call, external fetch, public publish, or Git-tracked content export was performed.
- UI follow-up discovered during acceptance: `/studio` source workflow is visually cramped and confusing; users can mistake the source creation form for source selection. Improve layout/copy so source creation and issue source selection are clearer.
- UI follow-up completed: issue creation now appears before the source creation card, source selection is by existing source title, selected sources are visible before creating an issue, and manual source-id editing is under an advanced disclosure.
- UI overflow follow-up completed: natural `/studio` DOM scan is clean across desktop, 1024px narrow desktop, and mobile; `check:ui` now fails if visible Studio descendants overflow their parent or viewport.
- Final local validation for this UI overflow slice passed: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, and `npm.cmd run studio:smoke`. `check:ui` covered 13 routes across desktop and mobile against local preview on `127.0.0.1:5174`.
- Studio workbench visual follow-up completed after production screenshot review: the first fix prevented overflow but did not solve the page-level design problem. Root cause was that `/studio` inherited public showcase `page-hero` and dense three-column card composition. The Studio route now uses a compact workbench hero, toolbar-like token controls, a two-column desktop editor layout, one-column mobile side stack, and `check:ui` visual assertions for hero size, grid density, and token action wrapping.

Validation:

```powershell
npm.cmd run studio:ai-daily-brief-check
npm.cmd run studio:smoke
npm.cmd run blog:check
npm.cmd run blog:knowledge-check
npm.cmd run assistant:index
npm.cmd run lint
npm.cmd run build
```

## Phase 4: Project Credentialed Checks

Legal RAG:

- Use low-privilege demo credentials only.
- Run or guide `legal-rag:synthetic` after credentials exist.
- Keep protected checks `unchecked` until credentialed evidence exists.

ERP:

- Confirm registration state from production bootstrap.
- Use low-privilege demo credentials for login smoke.
- Plugin/sync checks require demo fixture or demo shop, not real store credentials.

Xunqiu:

- Configure `XUNQIU_SYNTHETIC_API_BASE_URL` only in the user's environment or CI.
- Run backend health and compat API checks.
- Keep APK gate planned unless a formal public release is approved.

Pet:

- Do not expose debug APK as public release.
- Wait for release APK/AAB, signing, SHA-256, scan/regression evidence, version notes, rollback note, and user approval.

Validation:

```powershell
npm.cmd run legal-rag:synthetic
npm.cmd run erp:synthetic
npm.cmd run xunqiu:synthetic
npm.cmd run pet:synthetic
npm.cmd run reliability:check
npm.cmd run site:status
npm.cmd run status:contract
```

## Phase 5: Observability And Analytics

1. Guide user through Cloudflare Analytics and Search Console first.
2. Ask user to choose Umami or Plausible before adding any analytics adapter.
3. Keep Prometheus/Grafana/Sentry/Langfuse as explicit follow-up choices.
4. If implemented, store only public-safe env names and adapter shape in repo.

Validation:

```powershell
npm.cmd run docs:observability-check
npm.cmd run docs:manual-gates-check
npm.cmd run lint
npm.cmd run build
```

## Phase 6: Content And Project Detail Refinements

Possible Codex-verifiable slices:

- Improve knowledge posts with sources, knowledge points, scenarios, and concrete technical explanations.
- Improve project detail visuals with real screenshots, flow diagrams, and demonstration paths.
- Improve assistant trace/citation/self-check UX without unapproved model tests.

Validation:

```powershell
npm.cmd run project-details:check
npm.cmd run blog:check
npm.cmd run blog:knowledge-check
npm.cmd run assistant:index
npm.cmd run check:ui
```

## Commit And Finish

For each completed slice:

1. Review `git diff`.
2. Run the minimum relevant checks plus `lint` and `build` for `src/` changes.
3. Commit with a focused message.
4. Push `origin main` when on `main` and checks pass.
5. Update task notes and manual gates with low-sensitive evidence.
