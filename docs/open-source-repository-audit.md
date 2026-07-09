# Open-Source Repository Audit

This file tracks the multi-repository README and deployment packaging work for the BIAU Port ecosystem. It records evidence from source files and local validation, not stale README claims.

## Status Table

| Repository | Status | Current Slice | Verification | Manual Gates |
| --- | --- | --- | --- | --- |
| `D:\workspace4Cursor\legal-rag` | First slice complete | README rewritten as a normal open-source project; Docker web build args aligned with public demo hint env variables; stale GitHub README screenshots removed in follow-up commit `c3785d2`; `README.zh-CN.md` added; GitHub description, homepage, and topics updated on 2026-07-09; Apache-2.0 license added and remote default branch normalized to `main` at commit `fd34e11`. | `npm.cmd run typecheck`; `npm.cmd --workspace apps/api run test:unit`; `npm.cmd --workspace apps/api run validate`; `npm.cmd --workspace apps/api run evaluate`; `npm.cmd --workspace apps/api run evaluate:review`; `npm.cmd run build`; `docker compose -f docker-compose.prod.yml config`; follow-up `typecheck`; license follow-up `git diff --check`. | Decide whether to publish public demo credentials; production pgvector/model validation requires user-owned env; regenerate and review screenshots before embedding them in the README again; keep both README languages in sync. |
| `D:\workspace4Cursor\blog-semi` | First slice complete | Root README rewritten as an open-source entry point covering the main site, LangGraph internal assistant, Studio, AI Daily, four-service deployment boundary, RAG Orchestrator, checks, and public-safe rules. Follow-up removed inline README screenshot grid, added `README.zh-CN.md`, replaced stale screenshots with route links plus the `docs/showcase-assets.md` asset ledger, moved local-only agent/Trellis history out of Git tracking, updated GitHub description/homepage/topics on 2026-07-09, and added Apache-2.0 license. | README link/image/sensitive-shape checks; `npm.cmd run docs:manual-gates-check`; `npm.cmd run docs:deployment-check`; `git diff --check` only reported LF/CRLF normalization warnings. Hidden-tooling audit kept `.github/workflows/`, `.agents/skills/`, `.codex/`, `.claude/`, reusable Trellis specs/scripts/current tasks, and removed `.agent-work/`, `.trellis/workspace/`, `.trellis/tasks/archive/` from public tracking. | Optional deploy buttons; production provider secrets stay platform-only; regenerate and review current screenshots before embedding them on the GitHub README page. |
| `D:\workspace4Cursor\erp` | First slice complete | README rewritten as an open-source-style entry point; Docker Compose defaults changed to mock/false Ozon writes; fixed SFTP host/username removed from `deploy:upload`; `README.zh-CN.md` added. Committed and pushed on `codex/ozon-plugin-parity` at `3dc9652`. Repository remains private by user decision and is not treated as public open-source yet. | `python -m py_compile scripts\upload_sftp.py`; `docker compose config`; `npm.cmd pkg get scripts.deploy:upload`; `npm.cmd run test`; `npm.cmd run build`; `git diff --check` only reported LF/CRLF normalization warnings. | Keep `ozon-erp` private for now; choose license before any future public release; decide demo account policy; real Ozon/SFTP/database/JWT/encryption secrets stay platform-only; keep both README languages in sync. |
| `D:\workspace4Codex\xunqiu` / `D:\workspace4Codex\xunqiu-backend-modern` | First slice complete | Static showcase README and Spring Boot backend README rewritten; backend `.env.example` added; old backend IP and fixed historical Render URL removed from public docs/config; smoke script parameterized; `README.zh-CN.md` added to both repositories; public showcase GitHub description/homepage/topics updated on 2026-07-09; public showcase Apache-2.0 license added at commit `64ef06c`. Backend repository remains private. | Showcase file/link checks and `git diff --check`; backend `mvn test`, `mvn -DskipTests package`, local jar smoke, Docker build, and sensitive-shape scan. PostgreSQL Testcontainers test skipped because the Java Docker client could not detect a valid Docker environment. | Confirm whether backend should stay private or later become public; confirm public APK download/release policy and SHA-256; fill Render `APP_PUBLIC_BASE_URL`; keep R2/database/signing secrets platform-only; add production auth/rate-limit/CORS before real production use; keep both README languages in sync. |
| `D:\workspace4Cursor\pet` | Showcase sub-slice complete | `gamer/pet-app-showcase-site/README.md` rewritten as a static showcase/download-status entry; `pet-app-showcase-site/README.zh-CN.md` added; broader Pet implementation repos left untouched because multiple worktrees are already dirty. Commit `30d6118` on `gamer` branch `cursor-windows-migration`; GitHub description/homepage/topics updated on 2026-07-09; Apache-2.0 license added to default `main` at `1fb7516`; draft PR [Drew-Z/gamer#2](https://github.com/Drew-Z/gamer/pull/2) tracks the broader `cursor-windows-migration` branch. | Showcase file checks, local href check, `git diff --check -- pet-app-showcase-site/README.md`, and focused sensitive scan; PR branch is mergeable but intentionally draft because it includes API/observability/pagination implementation beyond README packaging. | Resolve/commit dirty Pet worktrees before full README packaging; review and update PR #2 before merge; approve screenshots; public APK needs reproducible build, signing policy, SHA-256, release notes, regression evidence, and human approval. |
| `D:\workspace4Cursor\game` | First slice complete | `blog/README.md` rewritten as a normal open-source entry for the Astro Playlab static site, game case pages, devlogs, public articles, and separate Godot Web playable hosting. Follow-up removed stale README image embeds from `space-war`, regenerated current `docs/media/*.png`, packaged `spacewar II`, added Chinese README entry points for Playlab, Space War, and Spacewar II, updated public GitHub description/homepage/topics on 2026-07-09, and aligned public licenses: Playlab `b76e215`, Space War already Apache-2.0, Spacewar II `3e3d40e`. | Playlab `npm run verify`; Space War screenshot capture and Godot project-load check; Spacewar II smoke and screenshot capture; `git diff --check`; focused sensitive-shape scans; license follow-up `git diff --check`. | Review public screenshots/videos/playable links; keep Cloudflare/R2 credentials and local Godot export paths out of public docs; run live `deploy:check` only intentionally; review GitHub social preview images manually. |

## GitHub Repository Metadata Follow-up

On 2026-07-09, public GitHub repository landing metadata was updated with `gh repo edit` for:

- `Drew-Z/biau`: description, homepage `https://biau.playlab.eu.cc`, and current React/Vite/Semi/assistant/content-studio topics.
- `Drew-Z/legal-rag`: description, homepage `https://legal-rag-web.onrender.com`, and contract-review / hybrid-search / evaluation topics.
- `Drew-Z/gamer`: description, homepage `https://biau.playlab.eu.cc/pet-app-showcase/`, and Android / Kotlin / community API / admin review topics.
- `Drew-Z/xunqiu`: description, homepage `https://xunqiu.playlab.eu.cc/`, and static showcase / Android migration / football topics.
- `Drew-Z/blog`: description, homepage `https://games.playlab.eu.cc`, and Astro / Godot / Playlab / Cloudflare topics.
- `Drew-Z/space-impact`: description, homepage `https://play.playlab.eu.cc/space-war/index.html`, and Godot arcade shooter topics.
- `Drew-Z/spacewar-II`: description, homepage `https://play.playlab.eu.cc/spacewar-ii/index.html`, and Godot prototype topics.

No repository visibility was changed. `Drew-Z/ozon-erp` remains private by user decision and should not be treated as a public open-source project until explicitly approved. `Drew-Z/xunqiu-backend-modern` also remains private because backend exposure and production-security posture need a separate decision.

Completed GitHub-side follow-up:

- Public repositories now use Apache-2.0 where GitHub-side packaging is complete: `biau`, `legal-rag`, `gamer`, `xunqiu`, `blog`, `space-impact`, and `spacewar-II`.
- `Drew-Z/legal-rag` now has remote `main` as the default branch.
- `Drew-Z/gamer` has draft PR [#2](https://github.com/Drew-Z/gamer/pull/2) from `cursor-windows-migration` to `main`; it is intentionally draft because the branch includes implementation changes beyond the showcase docs.

Remaining GitHub-side gates:

- Keep `Drew-Z/ozon-erp` private until the maintainer explicitly approves a public release.
- Decide whether `Drew-Z/xunqiu-backend-modern` should stay private or later receive a public backend release pass.
- Regenerate and manually approve current social preview images/screenshots before embedding them in README landing pages again.

## Legal RAG Audit Notes

Evidence inspected:

- `AGENTS.md`
- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `.github/workflows/ci.yml`
- `apps/api/.env.example`
- `apps/web/.env.example`
- `.env.docker.example`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `docker-compose.prod.yml`
- `docker-compose.yml`
- `apps/api/src/app.ts`
- `apps/api/src/config/env.ts`
- `apps/web/src/App.vue`
- `docs/architecture.md`
- `docs/deploy-render-supabase.md`
- `CONTEXT.md`
- `docs/assets/screenshots/*`

Confirmed stack:

- Web: Vue 3, Vite, TypeScript.
- API: Express 5, TypeScript, Node 24.
- Shared package: workspace TypeScript domain/API types.
- RAG: deterministic local mock path plus OpenAI-compatible chat/embedding path.
- Vector store: in-memory adapter or PostgreSQL + pgvector.
- Deployment: Docker API, static web build, optional Docker Compose with pgvector PostgreSQL.
- Quality: API validation, RAG eval, contract-review eval, quality panel, trends, CI workflow.

Fixes made in the Legal RAG slice:

- Removed old demo-only positioning from the README and reframed it as a reusable legal-document RAG workbench.
- Replaced concrete old Render demo URLs with provider-neutral deployment guidance and placeholders.
- Added a public-safe README structure: preview, what it does, features, architecture, quick start, configuration, Docker Compose, deployment, project structure, API, testing, roadmap, security, license.
- Documented that `VITE_*` variables are public and that public demo credentials must be low-privilege and revocable.
- Added Docker web build args for `VITE_API_BASE_URL` and `VITE_PUBLIC_DEMO_*` values, then passed them from `docker-compose.prod.yml`.
- Follow-up removed stale README-embedded screenshots and reframed `docs/assets/screenshots/*` as review artifacts that should be regenerated before being placed on the GitHub landing page again.

Known manual gates:

- Apache-2.0 license now exists on the public default branch.
- Public demo credentials must be explicitly approved and rotated by the maintainer.
- `validate:pgvector` requires a safe local/production PostgreSQL + embedding configuration and was not run in this slice.
- GitHub repository description/topics and default branch are configured; optional deploy buttons remain an account-side decision.
- `README.zh-CN.md` is now part of the public docs surface and should stay aligned with setup, deployment, and security changes.

## Xunqiu Audit Notes

Evidence inspected:

- Showcase `README.md`, `index.html`, `docs.html`, `_headers`, `.gitignore`, `docs/technical/*`, `assets/*`, and `downloads/latest-xunqiu64.apk`.
- Backend `README.md`, `pom.xml`, `Dockerfile`, `render.yaml`, `.gitignore`, `docs/render-deploy-checklist.md`, `scripts/smoke-test.ps1`, Spring configuration files, Flyway migrations, controllers, services, and tests.
- Android 64-bit README as evidence only; `xunqiu-android64` was not a committable git repository in this slice.

Confirmed stack:

- Showcase: pure static HTML/CSS site intended for Cloudflare Pages, with no build step.
- Backend: Spring Boot 3.3.6, Java 17, Maven, PostgreSQL/H2, Flyway, AWS SDK S3 client for optional Cloudflare R2, Docker, Render Blueprint.
- Android integration: 64-bit client points to the modern backend through a configurable `xunqiuApiBaseUrl`; legacy Android builds keep their own separate backend configuration.

Fixes made in the Xunqiu slice:

- Rewrote the showcase README with preview, architecture, quick start, Cloudflare Pages deployment, APK boundary, security, roadmap, and license notes.
- Rewrote the backend README with features, architecture, quick start, configuration, Docker, Render, API surface, testing, Android integration, security, roadmap, and license notes.
- Added backend `.env.example` with blank values only.
- Rewrote the backend Render checklist to remove local absolute paths and old backend addresses.
- Changed `render.yaml` so `APP_PUBLIC_BASE_URL` must be filled by the deployer rather than using a fixed historical Render URL.
- Parameterized the backend smoke script's demo phone and SHA1 password hash.

Known manual gates:

- The public Xunqiu showcase repository now has an Apache-2.0 license file; backend license/public-release status remains gated while `xunqiu-backend-modern` stays private.
- APK public-download status, SHA-256, release notes, and official signing policy still need maintainer approval.
- Render `APP_PUBLIC_BASE_URL` and optional R2 variables must be filled in the platform dashboard.
- Production readiness still requires auth, rate limits, stricter CORS, backups, logging/audit policy, and separation of demo seed data.
- PostgreSQL Testcontainers could not run in this Windows session because the Java Docker client did not detect a valid Docker environment, although Docker CLI image build succeeded.
- Both Xunqiu repositories now have `README.zh-CN.md`; keep the language variants aligned.

## Pet Audit Notes

Evidence inspected:

- Pet workspace root `README.md` and `SDLC-INDEX.md`.
- `gamer/AGENTS.md`, `gamer/README.md`, `gamer/package.json`, and `gamer/docs/agents/domain.md`.
- `gamer/pet-app-showcase-site/README.md`, `index.html`, `styles.css`, `favicon.svg`, and `assets/*`.
- Relevant `gamer` docs/code references around Android APK, package download gates, human review, and public API boundaries.

Confirmed stack:

- Pet is a multi-repository workspace, not a single root git repo.
- `gamer/` owns Android app, Community API, Admin Review, app-facing packages, and the static Pet App showcase page.
- `fantasy-pet-rule/` owns the server-side generation worker, app API contract, QA, package gates, and private adapter/runtime concerns.
- `pet-app-showcase-site/` is a pure static HTML/CSS page with public-safe Android screenshots and a disabled APK download state.

Fixes made in the Pet showcase slice:

- Rewrote `pet-app-showcase-site/README.md` into an open-source style static showcase entry.
- Added preview, purpose, features, architecture, quick start, static deployment, assets, APK download policy, testing, security, roadmap, and public links.
- Preserved the public APK gate and documented that no debug/internal APK should be exposed as a release.

Known manual gates:

- The broader Pet workspace currently has several dirty implementation/documentation worktrees. Full README packaging should wait until those changes are committed or explicitly assigned.
- No license decision is recorded for the public Pet repositories.
- Public APK requires reproducible build, signing policy, SHA-256, release notes, regression evidence, and human approval.
- Screenshots should be reapproved after the next Android UI polish pass.
- Private worker routes, model/provider endpoints, tokens, raw run artifacts, signing files, and live logs must remain out of public docs.
- `pet-app-showcase-site/README.zh-CN.md` was added without touching unrelated dirty root workspace changes.

## Game / Playlab Audit Notes

Evidence inspected:

- `D:\workspace4Cursor\game\blog\AGENTS.md`
- `D:\workspace4Cursor\game\blog\README.md`
- `D:\workspace4Cursor\game\blog\package.json`
- `D:\workspace4Cursor\game\blog\astro.config.mjs`
- `D:\workspace4Cursor\game\blog\.env.example`
- `D:\workspace4Cursor\game\blog\docs\cloudflare-pages.md`
- `D:\workspace4Cursor\game\blog\docs\deploy-guide.md`
- `D:\workspace4Cursor\game\blog\docs\r2-play-upload.md`
- `D:\workspace4Cursor\game\blog\docs\godot-export-playbook.md`
- `D:\workspace4Cursor\game\blog\src\content\config.ts`
- `D:\workspace4Cursor\game\blog\tools\audit_site_content.mjs`
- `D:\workspace4Cursor\game\blog\tools\audit_dist_links.mjs`
- `D:\workspace4Cursor\game\blog\tools\check_public_endpoints.mjs`
- `D:\workspace4Cursor\game\blog\tools\deploy_pages.mjs`

Confirmed stack:

- Astro 5 static site.
- Content collections for games, devlogs, published articles, and article workbench entries.
- Public assets under `public/images/`, `public/videos/`, and `public/games/`.
- Cloudflare Pages is the preferred static host.
- Godot Web playable exports are staged and uploaded separately from the Astro `dist/` build.

Fixes made in the Game / Playlab slice:

- Rewrote `blog/README.md` into a full open-source style entry point.
- Added preview, features, architecture, quick start, content model, deployment, Godot Web playable workflow, scripts, testing, security, roadmap, and license gate notes.
- Documented the current six game slugs and the separation between static site hosting and playable export hosting.
- Avoided private credentials, local paths, and unverified one-click deployment claims.
- Follow-up removed stale GitHub README screenshot embeds from `space-war`, regenerated its current `docs/media/*.png` assets with the local Godot capture script, and fixed a strict integer inference warning that blocked capture under Godot 4.6.
- Follow-up packaged `spacewar II` as an open-source README entry and made its screenshot capture output configurable instead of pointing at a local BIAU Playlab path.

Known manual gates:

- Public Playlab and Spacewar II repositories now include Apache-2.0 license files; Space War already used Apache-2.0.
- GitHub repository descriptions, homepages, and topics are configured for the public game repositories.
- Public screenshots, videos, posters, and playable links should be reviewed before broad promotion.
- Live endpoint checks through `npm run deploy:check` should be run only when the public host is expected to be reachable.
- A tracked-file cleanup scan found no common generated/cache folders such as `node_modules`, `dist`, `build`, `target`, `.godot`, `.astro`, `.vite`, `coverage`, or `deploy/r2-play` in the packaged repositories. Do not delete files in bulk without a focused per-repository audit.
- The `blog-semi` hidden tooling follow-up keeps reusable assistant/Trellis configuration but removes local-only process history from public tracking; future repository cleanup should follow the same evidence-backed pattern.
- Cross-repository prevention now exists in all packaged repos: local AI/session artifacts and Trellis runtime/history paths are ignored, while reusable workflow assets, CI, `.env.example`, `.dockerignore`, and `.gitignore` remain public-safe tracked files.
