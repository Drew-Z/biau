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
- Studio review workflow clarity follow-up completed: `/studio` now shows a first-screen review guide explaining where to click drafts, where content and preview live, and which actions approve or create publish exports. The guide also exposes current draft state and anchors to edit/preview, and `check:ui` now treats a missing review guide as a regression.
- Studio API connection diagnosis follow-up completed: production frontend points at `https://biau-content-studio-api-pq7d.onrender.com`, and direct health/CORS checks showed the backend and database are reachable. The confusing `无法连接 Studio API` screenshot is most consistent with a browser-side fetch exception such as a malformed saved token/header value. `requestStudioApi` now rejects header-unsafe token characters before fetch and reports either `invalid-token-format` or `studio-network-error` with actionable copy instead of collapsing everything into the same catch message.
- Studio API diagnosis follow-up 2 completed: direct production API checks with the local Studio token succeeded for health, drafts, source items, AI Daily issues, and publish exports (`200` responses; low-sensitive counts: drafts `2`, sources `3`, issues `1`, exports `0`). A live bundle scan showed the dedicated Studio API URL is present, but the current deployed `StudioPage` / `StudioAiDailyIssuePage` chunks still contain page-level `无法连接 Studio API` catches. Those catches now route through the shared client-exception explainer so a real token mismatch stays visible as `401 / token 缺失或不匹配` and frontend exceptions no longer look like API connectivity failures.
- User confirmed the production Studio page refresh is now successful after the diagnostic deployment. Studio is no longer treated as a connection blocker; remaining Studio work is human review, publish export creation, and static export diff review.
- Reliability suite follow-up completed while user rested: `npm.cmd run reliability:check -- --timeout 20000 --step-timeout 140000` passed with 7 passed, 0 failed, 1 skipped. The skipped step is Legal RAG credentialed synthetic because the local `LEGAL_RAG_API_BASE_URL` gate is not configured. Fresh public status artifacts were generated for main site, Pet showcase, Playlab, reliability suite, and aggregated site status.
- Manual gate docs updated to reflect the current queue: Studio is connected; Legal RAG needs low-privilege demo credentials; ERP plugin/sync needs demo fixture/shop; Xunqiu backend and APK gates need human configuration/approval; Pet APK remains gated until formal release evidence exists.
- Project detail visual polish completed: in-body visual captions now separate visitor-facing caption text from source links, and `check:ui` asserts source links render through the dedicated project visual source-link class. This improves case-study readability without changing project facts or adding unverified assets.
- Project detail visual density follow-up completed: the lighter game case-study pages now have at least three in-body visuals each. Tetris, Next Spacewar, intespace, Raiden, and Spacewar II gained additional public-safe screenshots or workflow diagrams, and `project-details:check` now reports all 12 projects at `3+` body visuals without changing gated release claims.
- Status overview manual-gate visibility completed: reliability project cards now show counts for `人工 gate` and `后续接入`, and `check:ui` asserts the summary cells exist for every reliability project so users can see where manual work remains before opening a detail route.
- Status detail manual checklist follow-up completed: `/status/:projectId` now renders `人工 gate` and `后续接入` as counted, numbered checklist panels with long-text wrapping, and `check:ui` asserts Legal RAG detail checklist counts against the merged status payload.
- Fresh reliability evidence refresh completed after Studio connection was confirmed: `npm.cmd run reliability:check -- --timeout 20000 --step-timeout 140000` passed with 7 passed, 0 failed, 1 skipped, regenerating public status snapshots without live assistant chat or model testing. The skipped item remains Legal RAG credentialed synthetic until low-privilege demo credentials are configured.
- Manual gate queue follow-up completed: `docs/manual-gates.md` now includes a wake-up processing order for Studio review/export, Legal RAG demo credentials, ERP demo/fixture checks, Xunqiu/Pet release gates, and analytics/observability choices, with explicit low-sensitive success standards.
- Render service-boundary drift fixed: `render.yaml`, `.env.example`, `docs/deployment.md`, `docs/manual-gates.md`, and backend code-spec now describe the current four-service shape (`public`, `internal`, `studio`, `rag`), including Studio service migration, shared `STUDIO_DATABASE_URL` boundaries, and internal `RAG_SYNC_TOKEN` needs for admin knowledge sync.
- Deployment contract guard added: `npm.cmd run docs:deployment-check` now validates that Render Blueprint, `.env.example`, deployment docs, manual gates, and backend code-spec all stay aligned on the four-service production boundary; `verify` runs this check before manual-gates validation.
- Observability docs guard wired into full verify: existing `npm.cmd run docs:observability-check` now runs inside `npm.cmd run verify`, keeping Cloudflare/Search Console/Umami/Plausible/Prometheus/Langfuse strategy aligned with manual gates.
- ERP related-project sync completed: validated the ERP web build on branch `codex/ozon-plugin-parity` and pushed the existing `fix(web): preserve biau port auth bridge` commit so the BIAU Port auth bridge fix is no longer local-only.
- ERP related-project quality check completed: root `npm.cmd test` passed API 153/153 tests and shared 4/4 tests; root `npm.cmd run build` passed API type build, extension WXT build, web build, shared build, and extension release metadata checks. The ERP repo remained clean after build. Production login smoke and plugin/sync verification still require a low-privilege demo account and fixture/shop gate.
- Legal RAG related-project low-sensitive check completed: branch `codex/project-quality-dashboard` is clean, and local `npm.cmd run typecheck` plus `npm.cmd run build` both passed without production credentials. Credentialed Legal RAG workflow checks remain gated on low-privilege demo credentials.
- Legal RAG offline quality check completed: `npm.cmd --workspace apps/api run test:unit` passed 30/30 tests, `validate` passed, RAG eval passed 50/50, and contract review eval passed 5/5. These are mock/memory or fixture-backed checks and do not replace credentialed production demo verification.
- Xunqiu backend related-project check completed: backend `main` is clean; `mvn test` passed with 11 tests, 0 failures, 1 Docker/Testcontainers-dependent PostgreSQL test skipped in the local environment, and `mvn -DskipTests package` produced the Spring Boot jar successfully.
- Xunqiu Android64 local check completed: the Android64 directory is not a Git repo, so changes were kept local and recorded here. Release signing was moved to environment/local Gradle property names, README documents the required variable names, `:app:compileDebugJavaWithJavac` passed, and `:app:assembleDebug` produced a debug APK of about 8 MB. This is not a formal release artifact; release signing, checksum, scan/regression evidence, and approval remain manual gates.
- Pet/Gamer related-project low-sensitive check completed: `D:\workspace4Cursor\pet\gamer` is on branch `cursor-windows-migration` with pre-existing WIP files, so no cleanup/commit was attempted. `npm.cmd test` passed with 278 tests, 0 failures, 0 skipped; `git diff --check` reported only LF/CRLF conversion warnings on existing modified files. APK public download remains gated on a formal release artifact, signing, checksum, scan/regression evidence, version notes, rollback note, and user approval.
- Pet/Gamer Android debug check completed: `gradlew.bat testDebugUnitTest --console=plain` and `gradlew.bat assembleDebug --console=plain` both passed in the Android community app. The only APK artifact confirmed in that path is `app-debug.apk` at about 19 MB, so it remains internal/debug evidence and must not be exposed as a public release download.
- BIAU Playlab related-project check completed: `D:\workspace4Cursor\game\blog` is clean on `main`; `npm run verify` passed content audit, Astro production build, dist link audit, JSON-LD audit, and legacy redirect audit. `npm run deploy:check` passed 21/21 public endpoints across `games.playlab.eu.cc`, `play.playlab.eu.cc`, and BIAU Port project entry routes.
- Xunqiu showcase related-project check completed: `D:\workspace4Codex\xunqiu\xunqiu-showcase-site` is clean on `main`; a local static reference scan checked 3 HTML files and 21 relative refs with 0 missing. Public HEAD checks returned `200` for the showcase home, docs page, and the current APK path. This confirms route reachability only; formal APK release evidence and approval remain manual gates.
- Public link manifest check slice completed: added `npm.cmd run public-links:check` to collect homepage and project-detail links from `src/data/hero.ts` and `src/data/portfolio.ts`, then verify them with low-sensitive HEAD/GET checks. The first run found the Xunqiu backend GitHub link returned `404`; BIAU Port now points visitors to the public backend validation document instead. After the fix, `public-links:check` passed 34/34 links.
- Public link reliability integration completed: `public-links:check` now supports `--write-status public/status/public-links-synthetic.json`, generating a low-sensitive synthetic snapshot with link counts, aggregate status, duration, and issue classes only. `reliability:check` runs this step before `site:status`, and the BIAU Port `/status` project now shows `blog-semi-public-links` as a first-class reliability check.
- Xunqiu showcase follow-up: pushed `fix: replace private backend repo links` to the showcase repository so its own buttons point at public backend validation docs instead of the visitor-invisible GitHub repo. A follow-up live HTML check confirmed the public home and docs pages now show the backend validation doc link instead of the old GitHub URL.
- Pet and Playlab synthetic refresh completed: ERP and Xunqiu preserved existing reports because local production base URL gates are not configured; `pet:synthetic` regenerated the Pet showcase report with 4/4 screenshots passing and APK gate still `debug-only`; `playlab:synthetic` regenerated Playlab report with web/mobile online, 6/6 playable pages and 36/36 resources passing. `site:status` and `status:contract` passed after the refresh.
- Knowledge post quality slice completed: `static-site-release-verification` was expanded from a thin checklist into a knowledge-first article covering release verification layers, resource fingerprints, content safety, external link checks, low-sensitive status snapshots, failure classification, and manual gates. `blog:knowledge-check` now reports this post as `kp=6, scenarios=5, checklist=7, sections=11, takeaways=4`; assistant knowledge and sitemap were regenerated.
- Knowledge post quality slice completed: `public-content-governance` was expanded into a reusable governance note covering public/private content layers, redaction matrices, low-sensitive evidence, manual gates, status language, release checks, versioning, and assistant index boundaries. `blog:knowledge-check` now reports this post as `kp=7, scenarios=5, checklist=7, sections=11, takeaways=4`; assistant knowledge and sitemap were regenerated.
- Knowledge post quality slice completed: `content-modeling-project-site` was expanded from a short information-architecture note into a concrete content-modeling guide covering entity boundaries, summary indexes, runtime loaders, curation metadata, project associations, generated artifacts, audit scripts, and Studio/CMS migration boundaries. `blog:knowledge-check` now reports this post as `kp=7, scenarios=5, checklist=7, sections=11, takeaways=4`; assistant knowledge and sitemap were regenerated.
- Blog column visibility follow-up completed: `/blog` now always shows all public column categories, including `AI 日报` and `资源分享` before their first public post, with per-column counts and a clear unpublished empty state. `check:ui` now asserts the empty columns remain visible so AI Daily does not look like it disappeared while its hidden draft waits for human review/export.
- Project note quality slice completed: `game-showcase-standard` was expanded from a short checklist into a fuller Playlab case note covering gameplay modeling, Web trial contracts, screenshot evidence, version maturity, six-game routing, link/resource checks, public evidence boundaries, and follow-up observability.
- Sitemap route generation bug fixed: `scripts/generate-sitemap.mjs` now imports structured `projects` data instead of regex-scanning `src/data/portfolio.ts`, preventing nested `visual.id` values from becoming fake `/projects/<visual-id>` URLs. The frontend quality spec now records this route-list convention.
- Project note quality slice completed: `xunqiu-android64-rebuild` was expanded from a short migration principle note into a fuller Xunqiu case note covering 64-bit client migration, old API compatibility, Spring Boot 3 backend modernization, stage APK boundaries, validation evidence, public-safe evidence references, and release-gate follow-ups.
- Project note quality slice completed: `ozon-erp-architecture` was expanded from a short ERP architecture checklist into a fuller case note covering business objects, registration/login boundaries, worker jobs, browser-plugin ingress, PendingAction/AuditLog safety, low-privilege demo gates, evidence boundaries, and follow-up fixture/smoke work.
- Public assistant retrieval follow-up completed: after the Ozon article added demo-related vocabulary, the local demo-access query could return too few project citations in the default window. `searchAssistantKnowledge` now keeps at least two project citations for demo-access questions when project candidates exist, preserving useful blog/status context without weakening `assistant:kg-check` or `assistant:eval`.
- Project note quality slice completed: `pet-workspace-pipeline` was expanded from a short generation-pipeline note into a fuller WIP case note covering Android App, Community API, Admin Review, pet.zip/package contract, human review, synthetic APK gate, low-sensitive test evidence, and release-gate follow-ups without exposing private deployment or generation details.

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
