# Improve Assistant Public Knowledge Content

## Goal

Improve the public project pages that power the public assistant and internal assistant fallback so project answers become more complete, better grounded, and clearer about implementation, architecture, technology choices, limitations, and future iteration direction without adding private knowledge ingestion.

## User Value

- Site visitors can ask the public assistant about showcased projects and receive better project-level citations instead of generic summaries.
- Internal teammates can use the internal assistant as a practical collaboration entry point for project analysis, content planning, and iteration thinking while still staying within the public sanitized knowledge boundary.
- The project owner can improve answer quality by maintaining site content and generated knowledge metadata, without introducing a backend CMS or private RAG system yet.

## Background And Current State

This task follows the completed assistant MVP:

- `18b181b feat: complete assistant mvp`
- `aa6ecb8 docs: capture assistant mvp contracts`

Confirmed facts from the repository:

- `src/data/portfolio.ts` defines 12 public projects with `title`, `summary`, `category`, `status`, `role`, `stack`, `highlights`, and links.
- `src/data/blog.ts` defines 96 blog summaries. 79 are in the `AI 应用知识库` series, so assistant retrieval can easily surface many similar-looking article summaries.
- `scripts/generate-assistant-knowledge.ts` currently generates one knowledge item per project and one per blog post using only title, summary/detail, href, and tags.
- `src/data/assistant.ts` builds the frontend local fallback knowledge from the same project/blog data and exposes `publicAssistantSuggestions` / `internalAssistantSuggestions`.
- `server/src/knowledge.ts` performs lightweight keyword scoring over `title`, `summary`, and `tags`.
- `src/pages/ProjectDetailPage.tsx` currently renders a generic detail layout for most projects and has custom long-form sections only for `ozon-erp` and `xunqiu`.
- Existing `ozon-erp` detail content already covers current state, modules, deployment/verification, and site entry behavior.
- Existing `xunqiu` detail content already covers old/new split, modern backend scope, deployment/verification, and engineering trade-offs.
- `legal-rag`, `pet-workspace`, game projects, `blog-semi`, and `biau-playlab` currently rely mostly on generic project metadata in `src/data/portfolio.ts`.
- The previous MVP explicitly decided that public and internal assistants use sanitized public site knowledge only. Private/internal knowledge ingestion, vector search, full history browsing, and private document parsing remain out of scope.
- The user has noted that current website blog/project documentation is not good enough yet and may be optimized later.
- The user decided this task should focus on project pages first, based on these source projects:
  - `D:\workspace4Codex\xunqiu`
  - `D:\workspace4Codex\xunqiu-backend-modern`
  - `D:\workspace4Cursor\erp`
  - `D:\workspace4Cursor\game`
  - `D:\workspace4Cursor\legal-rag`
  - `D:\workspace4Cursor\pet`
- Blog improvements are intentionally deferred to a later task.
- `pet` can temporarily show its current work-in-progress state because it is still expected to continue evolving.
- The other listed projects are considered deployed / mostly complete showcase projects, but their visible shortcomings and future optimization direction can still be documented.
- Source directory survey:
  - `D:\workspace4Cursor\legal-rag` contains `README.md`, `CONTEXT.md`, `docs/`, app packages, eval, samples, and deployment docs.
  - `D:\workspace4Cursor\erp` contains `README.md`, `apps/`, `packages/`, `docs/`, deployment material, and existing production-oriented handoff notes.
  - `D:\workspace4Codex\xunqiu-backend-modern` contains a Spring Boot backend with `README.md`, `pom.xml`, `render.yaml`, `docs/`, and smoke/deploy scripts.
  - `D:\workspace4Codex\xunqiu` contains old/new app workspaces, Android 64-bit assets, backend-modern copy, showcase site, docs, and release/deploy material.
  - `D:\workspace4Cursor\game` contains six game project directories plus a blog/content site directory.
  - `D:\workspace4Cursor\pet` contains PRDs, architecture, API/data model, roadmap, verification reports, and multiple implementation workspaces.

## Problem Statement

The assistant pipeline is technically working, but the project content it retrieves is not yet rich enough for project-level question answering. Existing project entries are valid public content, but they lack a clearer evidence-backed presentation of implementation, architecture, technology stack, product scope, current limitations, and future roadmap.

## Recommended Direction

Start with project-page content enhancement rather than rewriting blog posts.

Recommended MVP for this task:

- Treat this task as the parent planning / integration task. Implementation happens in child tasks that can be reviewed and verified independently.
- Inspect the listed project repositories as evidence sources before writing public copy. Do not rely on README files alone because they can be outdated; cross-check claims against code, package/workspace config, deployment files, docs, ADRs, scripts, tests/eval fixtures, screenshots, and current BIAU Port links.
- For each in-scope project, enhance project-page content across multiple dimensions where evidence supports it:
  - implementation status
  - architecture
  - technology stack
  - core workflows
  - deployed/demo entry points
  - current limitations
  - future optimization direction
- Keep generated assistant knowledge compatible with the current assistant API unless a small backward-compatible extension is needed.
- Improve assistant suggestions and low-confidence behavior only if project-page changes expose obvious gaps.
- Avoid broad blog rewrites in this task.

## Child Task Map

- `06-30-enhance-legal-rag-project-page`: Enhance the Legal RAG project page based on `D:\workspace4Cursor\legal-rag`, including implementation, architecture, contract review flow, deployment/evaluation evidence, limitations, and productionization direction.
- `06-30-enhance-xunqiu-project-page`: Enhance the Xunqiu project page based on `D:\workspace4Codex\xunqiu` and `D:\workspace4Codex\xunqiu-backend-modern`, including old/new app split, Android 64-bit client, Spring Boot backend, Render/R2/PostgreSQL deployment, limitations, and mobile/backend iteration direction.
- `06-30-enhance-erp-project-page`: Enhance the Ozon ERP project page based on `D:\workspace4Cursor\erp`, including admin backend, API, Prisma, queues, browser plugin, real-write boundary, deployment, operations limitations, and future direction.
- `06-30-enhance-game-and-pet-project-pages`: Enhance game and pet project pages based on `D:\workspace4Cursor\game` and `D:\workspace4Cursor\pet`; game projects are treated as deployed showcase items, while `pet` should show current work-in-progress state and future optimization direction.

Execution order:

1. Legal RAG first because it is the strongest AI/RAG reference and directly improves assistant answers about AI capability.
2. Xunqiu second because it spans mobile app plus modern backend and has a clear deployed product story.
3. ERP third because it already has some custom content but can be normalized into the shared project detail model.
4. Game + pet last because it covers multiple smaller showcase entries and one still-evolving project.

## Requirements

- R1 Public boundary: all content and generated knowledge must remain public, sanitized, and safe to commit.
- R2 Assistant usefulness: common public assistant questions about projects should return grounded, specific answer material with useful project-page citations.
- R3 Internal fallback usefulness: the internal assistant fallback should help teammates with content planning and delivery thinking while clearly staying inside public knowledge.
- R4 Knowledge generation: `assistant:index` should continue generating deterministic public knowledge from repo-owned project/blog data, with project-page improvements reflected in generated project knowledge.
- R5 Compatibility: existing `/chat/public`, `/chat/internal`, frontend local fallback, and citation rendering should continue to work.
- R6 Content maintainability: any new project-detail metadata should live in typed, obvious data modules or existing project data files, not scattered inside UI components.
- R7 Data safety: do not add real secrets, private customer data, internal URLs, exact sensitive metrics, or unsanitized private context.
- R8 Verification: changes must pass `npm.cmd run assistant:index`, `npm.cmd run lint`, `npm.cmd run build`, and final `npm.cmd run verify` when implementation completes.
- R9 Source evidence: project-page claims should be based on inspected source projects, existing docs, deployed links already in the site, or clearly marked future direction.
- R10 Cross-checking: if a claim is found only in a source README and not supported by code/config/docs/deploy/test evidence, avoid it or mark it as documented intent rather than current implementation.

## Out Of Scope

- Private/internal knowledge-source ingestion.
- Vector database, embeddings, pgvector, semantic reranking, or full RAG admin.
- CMS or backend editing workflows.
- Rewriting all 96 blog posts in this task.
- Broad blog index/content optimization.
- Full project-detail page redesign.
- Session history browsing or account/admin expansion.

## Acceptance Criteria

- [x] Parent task owns the source requirement set, child-task map, shared public-data boundary, and final integration review.
- [x] Each child task has its own planning artifact with source evidence, scope, acceptance criteria, and validation plan before implementation starts.
- [x] Child implementations collectively improve project-page content for the selected source projects across implementation, architecture, stack, limitations, and future direction where applicable.
- [x] Final integration confirms generated public knowledge reflects improved project-page data while staying public and sanitized.
- [x] Final integration confirms public/internal assistant fallback behavior remains consistent with the improved project knowledge.
- [x] Final integration confirms existing assistant API and frontend citation flows remain compatible.
- [x] Final validation includes `npm.cmd run assistant:index`, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run verify`, or any blocker is recorded with concrete evidence.

## Final Integration Review

- Completed child tasks: Legal RAG, Xunqiu, Ozon ERP, Game + Pet.
- Project-page content now uses the shared `detailContent` / `assistantContext` model for the major showcased projects instead of bespoke UI-only writing.
- Generated public knowledge was refreshed from `src/data/portfolio.ts` and includes the new Legal RAG, Xunqiu, ERP, Biau Playlab, game, and pet summaries.
- The public-data boundary remains intact: content is visitor-readable and avoids private credentials, exact private deployment details, provider secrets, database connection strings, and local source paths.
- Final validation on 2026-06-30 passed: `npm.cmd run assistant:index`, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run verify`. The build still reports only the known non-fatal Vite `INEFFECTIVE_DYNAMIC_IMPORT` warnings.

## Open Questions

None. The task is split into child tasks by project family to keep review and verification smaller.
