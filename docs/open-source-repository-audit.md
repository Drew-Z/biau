# Open-Source Repository Audit

This file tracks the multi-repository README and deployment packaging work for the BIAU Port ecosystem. It records evidence from source files and local validation, not stale README claims.

## Status Table

| Repository | Status | Current Slice | Verification | Manual Gates |
| --- | --- | --- | --- | --- |
| `D:\workspace4Cursor\legal-rag` | First slice complete | README rewritten as a normal open-source project; Docker web build args aligned with public demo hint env variables; committed and pushed on `codex/project-quality-dashboard` at `7d8470c`. | `npm.cmd run typecheck`; `npm.cmd --workspace apps/api run test:unit`; `npm.cmd --workspace apps/api run validate`; `npm.cmd --workspace apps/api run evaluate`; `npm.cmd --workspace apps/api run evaluate:review`; `npm.cmd run build`; `docker compose -f docker-compose.prod.yml config`. | Choose license; configure public repo description/topics; decide whether to publish public demo credentials; production pgvector/model validation requires user-owned env. |
| `D:\workspace4Cursor\blog-semi` | First slice complete | Root README rewritten as an open-source entry point covering the main site, LangGraph internal assistant, Studio, AI Daily, four-service deployment boundary, RAG Orchestrator, checks, and public-safe rules. | README link/image/sensitive-shape checks; `npm.cmd run docs:manual-gates-check`; `npm.cmd run docs:deployment-check`; `git diff --check` only reported LF/CRLF normalization warnings. | Choose license; configure GitHub repo metadata/topics/visibility; optional deploy buttons; production provider secrets stay platform-only. |
| `D:\workspace4Cursor\erp` | First slice complete | README rewritten as an open-source entry point; Docker Compose defaults changed to mock/false Ozon writes; fixed SFTP host/username removed from `deploy:upload`. Committed and pushed on `codex/ozon-plugin-parity` at `3dc9652`. | `python -m py_compile scripts\upload_sftp.py`; `docker compose config`; `npm.cmd pkg get scripts.deploy:upload`; `npm.cmd run test`; `npm.cmd run build`; `git diff --check` only reported LF/CRLF normalization warnings. | Choose license; configure public repo metadata; decide demo account policy; real Ozon/SFTP/database/JWT/encryption secrets stay platform-only. |
| `D:\workspace4Codex\xunqiu` / `D:\workspace4Codex\xunqiu-backend-modern` | First slice complete | Static showcase README and Spring Boot backend README rewritten; backend `.env.example` added; old backend IP and fixed historical Render URL removed from public docs/config; smoke script parameterized. Showcase commit `117d3ba`; backend commit `87a0f1b`. | Showcase file/link checks and `git diff --check`; backend `mvn test`, `mvn -DskipTests package`, local jar smoke, Docker build, and sensitive-shape scan. PostgreSQL Testcontainers test skipped because the Java Docker client could not detect a valid Docker environment. | Choose licenses; GitHub metadata; confirm public APK download/release policy and SHA-256; fill Render `APP_PUBLIC_BASE_URL`; keep R2/database/signing secrets platform-only; add production auth/rate-limit/CORS before real production use. |
| `D:\workspace4Cursor\pet` | Showcase sub-slice complete | `gamer/pet-app-showcase-site/README.md` rewritten as a static showcase/download-status entry; broader Pet implementation repos left untouched because multiple worktrees are already dirty. Commit `30d6118` on `gamer` branch `cursor-windows-migration`. | Showcase file checks, local href check, `git diff --check -- pet-app-showcase-site/README.md`, and focused sensitive scan. | Resolve/commit dirty Pet worktrees before full README packaging; choose licenses; approve screenshots; public APK needs reproducible build, signing policy, SHA-256, release notes, regression evidence, and human approval. |
| `D:\workspace4Cursor\game` | First slice complete | `blog/README.md` rewritten as a normal open-source entry for the Astro Playlab static site, game case pages, devlogs, public articles, and separate Godot Web playable hosting. Commit `f6cbb78` on `game/blog` branch `main`. | `npm run verify`; `git diff --check`; focused README sensitive-shape scan. `verify` ran content audit, Astro build, dist link audit, JSON-LD audit, and legacy redirect check. | Choose license; configure GitHub metadata; review public screenshots/videos/playable links; keep Cloudflare/R2 credentials and local Godot export paths out of public docs; run live `deploy:check` only intentionally. |

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

Known manual gates:

- No license file exists. A license should be chosen before presenting the repository as reusable open-source software.
- Public demo credentials must be explicitly approved and rotated by the maintainer.
- `validate:pgvector` requires a safe local/production PostgreSQL + embedding configuration and was not run in this slice.
- GitHub repository description/topics and optional deploy buttons require account-side changes.

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

- No license files exist yet.
- APK public-download status, SHA-256, release notes, and official signing policy still need maintainer approval.
- Render `APP_PUBLIC_BASE_URL` and optional R2 variables must be filled in the platform dashboard.
- Production readiness still requires auth, rate limits, stricter CORS, backups, logging/audit policy, and separation of demo seed data.
- PostgreSQL Testcontainers could not run in this Windows session because the Java Docker client did not detect a valid Docker environment, although Docker CLI image build succeeded.

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

Known manual gates:

- No standalone license file exists yet.
- GitHub repository description, topics, and visibility should be configured by the maintainer.
- Public screenshots, videos, posters, and playable links should be reviewed before broad promotion.
- Live endpoint checks through `npm run deploy:check` should be run only when the public host is expected to be reachable.
