# Chatus and Anchor site integration

## Goal

Integrate Chatus and Anchor into the BIAU Port home and project catalog, replace Anchor's broken web-demo route with a bilingual interactive static demo, and preserve source-verified implementation and interview knowledge for Chatus, Anchor, the public assistant, and AI Daily.

## Confirmed Facts

- Anchor already has the `anchor-learning` portfolio record; it must be corrected rather than duplicated.
- Anchor's Cloudflare output is `web/landing`, while the placeholder demo currently lives outside that tree, so production `/app/index.html` falls back to the landing page.
- Chatus is an invite-only private workspace. Its public login may be linked, but the private repository, access codes, providers, members, and operations data must not be exposed.
- The existing AI Daily production-operations slice is committed on `main`; `.codex-patch-test` is an unrelated user-owned untracked file and remains untouched.

## Requirements

- Rename the local Anchor checkout from `duoduo` to `anchor` and update stale documentation paths and repository URLs without migrating persistent technical identifiers.
- Publish a dependency-light bilingual Anchor landing page and `/app/` demo with browser-language default, explicit language control, and persistent locale.
- Provide three local demo datasets with at least four questions each, source citations, feedback, progress, reset, and clearly scripted tutor guidance. The demo must make no AI or backend request.
- Add Chatus and Anchor to the main-site home, project catalog/detail content, status metadata, sitemap, SEO, and public-assistant knowledge.
- Supply privacy-reviewed project visuals: a cover plus at least three in-body visuals per project, including runtime UI and architecture/data-flow evidence.
- Add repository-only technical dossiers for Chatus, Anchor, the public assistant, and AI Daily plus cross-project patterns, an evidence register, and at least 120 interview Q&A items in total.
- Preserve truthful delivery state: Anchor web demo is not the full Flutter application; Chatus is invite-only; AI Daily generation remains disabled after bounded provider failures.

## Acceptance Criteria

- [x] `D:/workspace4Cursor/learn/anchor` is the active clean checkout and stale `cd duoduo` / obsolete repository links are corrected.
- [x] Anchor `/`, `/app/`, and `/app/index.html` return the intended distinct pages in local and production checks.
- [x] Both Anchor surfaces switch completely between Chinese and English, persist the choice, update document metadata, and remain keyboard accessible.
- [x] Every demo dataset can be selected and completed; answers, explanations, citations, progress, tutor hints, reset, and recovery work without external data calls.
- [x] Chatus and Anchor appear on the home page and project catalog with accurate links, boundaries, SEO, status metadata, and assistant knowledge.
- [x] Both project detail records pass the image and narrative evidence gate with sanitized PNG/WebP assets.
- [x] `docs/project-notes/` contains the required eight documents, all required sections, evidence labels, and at least 120 Q&A items.
- [x] Anchor browser checks pass at desktop, tablet, and mobile viewports; main-site docs, assistant, project, sitemap, status, link, lint, build, and UI gates pass.
- [x] Anchor is deployed and smoke-tested before the main-site external link is released.

## Out of Scope

- Full Flutter Web support, backend APIs, login, upload, live AI, analytics, or cloud sync for the Anchor demo.
- Chatus guest enablement, source publication, production configuration changes, or deployment.
- Android package-id, database-name, secure-storage-key, environment-variable, and persisted export-name migration.
- Publishing the long-form technical dossiers or interview bank as public blog posts.
