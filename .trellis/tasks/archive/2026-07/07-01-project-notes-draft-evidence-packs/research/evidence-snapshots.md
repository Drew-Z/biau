# Evidence Snapshots

## Scope

This task prepares private draft evidence packs for the first batch of `project-notes` articles. It does not publish posts, change public blog curation, update assistant knowledge, or edit project detail pages.

Secret-like files were intentionally not read: `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`, `*.p12`, SSH material, signing files, database connection strings, model relay credentials, and deployment account details.

## External References

The user asked whether similar content-generation or blog-generation skills/projects could be borrowed from. I used `smart-search` as a discovery layer and fetched representative pages for method-level comparison.

Commands and evidence files:

- `smart-search search "AI blog content generation pipeline skill evidence based technical blog workflow GitHub" --validation balanced --extra-sources 2 --timeout 180 --format json --output C:/tmp/smart-search-evidence/blog-pipeline-20260701/01-blog-generation-pipeline-search.json`
- `smart-search search "static site blog content pipeline markdown frontmatter AI drafting review workflow open source" --validation balanced --extra-sources 2 --timeout 180 --format json --output C:/tmp/smart-search-evidence/blog-pipeline-20260701/02-static-site-content-workflow-search.json`
- `smart-search fetch "https://github.com/AgriciDaniel/claude-blog" --format markdown --output C:/tmp/smart-search-evidence/blog-pipeline-20260701/03-claude-blog-fetch.md`
- `smart-search fetch "https://github.com/Abdulbasit110/Blog-writer-multi-agent/" --format markdown --output C:/tmp/smart-search-evidence/blog-pipeline-20260701/04-blog-writer-multi-agent-fetch.md`
- `smart-search fetch "https://github.com/Glad-Labs/poindexter" --format markdown --output C:/tmp/smart-search-evidence/blog-pipeline-20260701/05-poindexter-fetch.md`
- `smart-search context7-docs "/websites/astro_build_en" "content collections schema markdown frontmatter" --format json`

Useful method-level patterns:

- `AgriciDaniel/claude-blog` is a blog skill suite with command routing, sub-skills, templates, review gates, fact checking, visual checks, and a delivery contract. Borrow the idea of separate brief/review/factcheck gates, not the SEO-heavy default tone.
- `Abdulbasit110/Blog-writer-multi-agent` shows a simpler planner/writer/editor agent split. Borrow the role separation when a future model-assisted draft needs more than Codex plus one writer model.
- `Glad-Labs/poindexter` shows a heavier autonomous content pipeline with research, writing, QA rejection, local-first model routing, plugins, and publishing adapters. Borrow the hard QA and swappable provider ideas, not the autonomous publishing posture.
- Astro content collections documentation reinforces a useful long-term direction: typed frontmatter/schema validation for Markdown content. The current React data pipeline already uses TypeScript data objects, so Markdown drafts should stay as staging artifacts until reviewed.

Recommendation for this repo:

- Keep the current `blog-content-pipeline` skill. It already matches the safer pattern: evidence pack first, model strategy second, review gates before public curation.
- Do not import an external blog automation stack wholesale. The site needs project-safe technical case notes, not an SEO autopilot.
- For high-value posts, use Codex to collect evidence, one strong content model to draft or rewrite, then Codex for fact checking and data ingestion. Use multi-model comparison only when the writing direction is disputed or the post is important enough to justify the overhead.
- Default model calls should be serial. Parallel model calls should only happen across separate relays when there is a deliberate comparison task.

## Legal RAG

Project root: `D:\workspace4Cursor\legal-rag`

Evidence sources:

- `package.json`
- `apps/api/src`
- `apps/web/src`
- `packages/shared/src/types.ts`
- `eval/contract-review-eval-set.json`
- `eval/rag-eval-set.json`
- `docs/architecture.md`
- `docs/demo-script.md`
- `docs/deploy-render-supabase.md`
- `docs/adr/*`
- `docs/assets/screenshots/*`
- `D:\workspace4Cursor\blog-semi\src\data\portfolio.ts`

Safe public facts:

- Workspace monorepo with API, Web, shared package, eval fixtures, docs, and deployment notes.
- API modules cover audit, auth, chunks, citations, datasets, documents, embeddings, evaluation, ingestion, model providers, quality, RAG, review, store, and vector store boundaries.
- Web app is a Vue-based interface with API clients, components, data, and app modules.
- The project includes RAG and contract review evaluation fixtures plus architecture/demo/deploy documentation.
- The main site already presents it as an already deployed legal-document RAG and contract-review workbench.
- Follow-up directions can focus on stronger permissions, more sanitized datasets, evaluation trends, OCR, reranking, CI, and reproducible deployment.

Uncertain or stale facts:

- Exact production provider, vector-store mode, data size, usage volume, and current availability need live verification before public claims.
- README or older docs may lag behind code and project-page data.

Forbidden/private details:

- Do not expose credentials, private endpoints, deployment dashboards, database URLs, model keys, private accounts, or legal advice claims.
- Do not imply it gives formal legal advice.

## Ozon ERP

Project root: `D:\workspace4Cursor\erp`

Evidence sources:

- `package.json`
- `apps/api`
- `apps/web`
- `apps/extension`
- `packages/shared`
- `scripts`
- `docs`
- `docker-compose*.yml`
- `Dockerfile`
- `D:\workspace4Cursor\blog-semi\src\data\portfolio.ts`

Safe public facts:

- Workspace monorepo with API, Web, Chrome extension, shared package, scripts, docs, Docker, and compose assets.
- Root scripts include separate dev flows, build, test, Prisma generation, release helpers, and security audit routines.
- API contains Prisma schema, routes, services, shared libraries, and worker boundaries.
- Web app contains Vue routes, services, stores, and views for an operations dashboard.
- Extension is WXT / Chrome MV3-based and has packaged output artifacts.
- Shared package includes Ozon, profit, release, and tests.
- Docs cover field parity, launch readiness, plugin parity, database backup/migration, deploy, and security audit topics.
- Follow-up directions can focus on safer release checklists, field parity drift, plugin packaging hygiene, audit trails, backup drills, and public documentation.

Uncertain or stale facts:

- Exact online entry health, store count, business metrics, and data volume require verification outside this draft task.
- Release artifacts in `.output` may include historical packages and should not be treated as the current build without checking timestamps and release notes.

Forbidden/private details:

- Root deploy scripts included host/user-like deployment details; public drafts must only say generic deploy or SFTP staging scripts exist.
- Do not publish store credentials, cookies, seller tokens, deployment hostnames, IPs, accounts, database URLs, or private business metrics.

## Xunqiu

Project roots:

- `D:\workspace4Codex\xunqiu`
- `D:\workspace4Codex\xunqiu-backend-modern`

Evidence sources:

- `D:\workspace4Codex\xunqiu` root directory inventory
- `D:\workspace4Codex\xunqiu\xunqiu-android64`
- `D:\workspace4Codex\xunqiu\xunqiu-android64\docs\ANDROID64_LEGACY_ENTRY_MATRIX.md`
- `D:\workspace4Codex\xunqiu\xunqiu-android64\docs\TEST_MATRIX.md`
- `D:\workspace4Codex\xunqiu-backend-modern\pom.xml`
- `D:\workspace4Codex\xunqiu-backend-modern\src\main`
- `D:\workspace4Codex\xunqiu-backend-modern\src\test`
- `D:\workspace4Codex\xunqiu-backend-modern\src\main\resources\db\migration`
- `D:\workspace4Codex\xunqiu-backend-modern\scripts\smoke-test.ps1`
- `D:\workspace4Codex\xunqiu-backend-modern\docs\render-deploy-checklist.md`
- `D:\workspace4Codex\xunqiu-backend-modern\render.yaml`
- `D:\workspace4Codex\xunqiu-backend-modern\Dockerfile`
- `D:\workspace4Cursor\blog-semi\src\data\portfolio.ts`

Safe public facts:

- The workspace contains historical Android/iOS/backend pieces, rehabilitation/server folders, a modern backend, Android 64-bit client work, showcase site, docs, deploy, release, and tooling folders.
- Android 64-bit work has legacy-entry and test-matrix documentation.
- Modern backend uses Spring Boot 3.3.6, Java 17, JPA, Security, Validation, Web, Flyway PostgreSQL, AWS SDK S3-compatible storage, H2, and Testcontainers.
- Modern backend includes main/test source, database migrations, smoke test script, Render deployment checklist, Render config, and Dockerfile.
- The main site positions it as a mobile migration and modern backend rebuilding case.
- Follow-up directions can focus on real-device regression, old WebView/native replacement, permissions/audit, media governance, monitoring/deployment, and video playback upgrades.

Uncertain or stale facts:

- Exact live service health, APK availability, and feature parity require separate live verification.
- Older app/server folders should be treated as historical evidence unless current code and tests confirm their role.

Forbidden/private details:

- Do not read or expose `jdbc.properties`, `local.properties`, `.env*`, signing files, private app keys, R2 credentials, database URLs, deployment accounts, or third-party service credentials.
- Do not claim high-side-effect features such as payment, IM, push, maps, or real exchange are fully production-enabled unless verified.

## Playlab Games

Project root: `D:\workspace4Cursor\game`

Main site root: `D:\workspace4Cursor\game\blog`

Evidence sources:

- `D:\workspace4Cursor\game` root directory inventory
- `D:\workspace4Cursor\game\blog\package.json`
- `D:\workspace4Cursor\game\blog\src\content\games`
- `D:\workspace4Cursor\game\blog\src\content\devlogs`
- `D:\workspace4Cursor\game\blog\scripts`
- `D:\workspace4Cursor\game\blog\src\content\articles`
- `D:\workspace4Cursor\blog-semi\src\data\portfolio.ts`

Safe public facts:

- Game workspace includes multiple Godot/game folders such as Tetris, Next Spacewar, intespace, Raiden prototype, space-war, and Spacewar II.
- Main games site is Astro 5-based and has scripts for content audit, build, distribution audit, verification, play export/check, and deployment checks.
- Content collections include game entries and devlogs for Playlab unification, web-playable intake, showcase finishing, responsive Tetris baseline, and touch controls.
- Tools cover audits, endpoint checks, R2-style play export/upload, and rendering scripts.
- Existing article/archive content contains older or non-public-quality writing; project-notes should not treat all article files as polished public material.
- Follow-up directions can focus on blog/article cleanup, per-game version records, mobile adaptation notes, performance evidence, automated export, and multi-site content alignment.

Uncertain or stale facts:

- Individual game maturity varies; each game should keep its own maturity label instead of claiming all are complete products.
- Live endpoint status and playable package freshness require separate verification.

Forbidden/private details:

- Do not quote low-quality archive text as public messaging.
- Do not expose storage credentials, deploy tokens, private buckets, or unpublished package internals.

## Pet Workspace

Project root: `D:\workspace4Cursor\pet`

Main workspace: `D:\workspace4Cursor\pet\gamer`

Evidence sources:

- `D:\workspace4Cursor\pet\PRD*.md`
- `D:\workspace4Cursor\pet\ARCHITECTURE.md`
- `D:\workspace4Cursor\pet\DATA-MODEL.md`
- `D:\workspace4Cursor\pet\TEST-STRATEGY.md`
- `D:\workspace4Cursor\pet\ROADMAP.md`
- `D:\workspace4Cursor\pet\OPTIMIZATION-ROADMAP.md`
- `D:\workspace4Cursor\pet\gamer\package.json`
- `D:\workspace4Cursor\pet\gamer\apps\admin-review`
- `D:\workspace4Cursor\pet\gamer\apps\android-community`
- `D:\workspace4Cursor\pet\gamer\packages\community-contracts`
- `D:\workspace4Cursor\pet\gamer\packages\pet-package-spec`
- `D:\workspace4Cursor\pet\gamer\packages\pet-runtime`
- `D:\workspace4Cursor\pet\gamer\services\community-api`
- `D:\workspace4Cursor\pet\gamer\services\pet-generator`
- `D:\workspace4Cursor\pet\gamer\docs`
- `D:\workspace4Cursor\blog-semi\src\data\portfolio.ts`

Safe public facts:

- This project is WIP/current work, not a finished public platform.
- The workspace includes Android community app, admin review, community contracts, pet package/runtime packages, Community API, pet generator service, and extensive docs.
- Community API tests and modules cover routes, rate limits, metrics, SLA, logging, PostgreSQL/migrations, and operational preflight/smoke/audit scripts.
- Pet generator includes adapter, worker, state source, and Supabase sync tests.
- Docs cover observability, rate limiting, SLA configuration, traceability, Community API, human review flow, and mobile community UI direction.
- Follow-up directions can focus on persistence, authentication/tenant boundaries, download permissions, worker pooling, queue visibility, dynamic SLA, ops panels, real-device E2E, and quality reports.

Uncertain or stale facts:

- Current deployment status, model provider routing, Android device coverage, and production readiness must remain tentative.
- Some docs describe target architecture and should not be described as fully shipped without code/test evidence.

Forbidden/private details:

- Do not expose model/provider endpoints, keys, worker commands, private operation scripts, deployment hosts, storage URLs, database strings, or review-only data.
- Do not package the project as a finished public AI pet product.

## Blog Semi

Project root: `D:\workspace4Cursor\blog-semi`

Evidence sources:

- `package.json`
- `src/data/blogShared.ts`
- `src/data/blogCuration.ts`
- `src/data/blogContent.ts`
- `src/data/portfolio.ts`
- `scripts/generate-blog-draft.mjs`
- `scripts/check-public-blog.mjs`
- `scripts/audit-blog-catalog.ts`
- `scripts/verify.mjs`
- `.agents/skills/blog-content-pipeline/SKILL.md`
- `.agents/skills/blog-content-pipeline/references/templates.md`
- `.trellis/tasks/archive/2026-07/07-01-first-build-log-post`

Safe public facts:

- Main site is a React, Vite, TypeScript, and Semi Design product/solution showcase.
- Blog system currently has five columns: Knowledge Notes, Project Notes, Resource Picks, AI Daily, and Build Log.
- Public blog visibility is controlled through curated public data, while draft files stay under `content-drafts`.
- Draft generator supports evidence-first scaffolds and an explicit `--generate` path for model-assisted writing.
- Public blog checker supports both old structured drafts and newer evidence-pack drafts.
- Follow-up directions can focus on better draft schema validation, typed Markdown ingestion if needed, public assistant alignment, blog cleanup, and stronger review gates.

Uncertain or stale facts:

- Whether the site should move from TypeScript blog objects to Markdown collections should be a future design task.
- Old blog cleanup is not part of this draft-evidence task.

Forbidden/private details:

- Do not write model relay URLs, API keys, local secret paths, private deployment details, or unpublished assistant internals into public posts.
- Do not publish draft-only evidence packs without review.
