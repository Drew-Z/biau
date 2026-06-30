# Enhance Legal RAG Project Page

## Goal

Enhance the BIAU Port Legal RAG project page so it presents the project as a visitor-readable, evidence-backed AI/RAG case study with implementation, architecture, technology stack, demo flow, quality/evaluation, current limitations, and future optimization direction.

## Parent Task

Parent: `06-30-improve-assistant-public-knowledge`

This child owns the Legal RAG deliverable. The parent task owns cross-project requirements, child-task mapping, and final integration review.

## User Value

- Visitors can understand that Legal RAG is a deployed full-stack RAG workbench, not just a conceptual chatbot.
- The public assistant can cite a richer Legal RAG project page when users ask about RAG, contract review, citations, pgvector, or AI quality evaluation.
- Internal teammates can use the page as a reference structure for future AI project write-ups: implementation, architecture, verification, limitations, and roadmap.

## Source Evidence

Primary source project: `D:\workspace4Cursor\legal-rag`

Confirmed evidence:

- `README.md` describes Legal RAG as a deployed full-stack legal-document RAG and contract-risk review workbench.
- Online demo endpoints are documented:
  - Web: `https://legal-rag-web.onrender.com`
  - API health: `https://legal-rag-api-9bki.onrender.com/api/health`
- The 5-minute demo path covers login, public-safe dataset initialization, RAG Q&A with citations/diagnostics, contract review, and quality panel.
- `docs/assets/screenshots/` includes screenshots for knowledge base, RAG citations/diagnostics, contract review, and quality panel.
- Technology stack:
  - Web: Vue 3, TypeScript, Vite.
  - API: Node.js, Express, TypeScript.
  - Shared package for request/response types.
  - Vector store: memory adapter or PostgreSQL + pgvector.
  - Model: mock provider or OpenAI-compatible chat/embedding providers.
  - Database: PostgreSQL with project spaces, documents, chunks, vectors, quality trends, and audit logs.
- `docs/architecture.md` documents the RAG pipeline:
  - text/TXT/PDF/DOCX/public dataset input
  - clean text
  - project-scoped SHA-256 dedupe
  - section-aware chunking
  - embedding provider
  - memory or pgvector storage
  - query rewrite
  - vector + keyword recall
  - candidate merge/filter/rerank
  - grounded answer or refusal
  - citations + diagnostics
- `docs/architecture.md` documents the contract review flow:
  - deterministic legal-risk rules recall payment, delivery, breach liability, IP, and dispute-resolution risks.
  - optional chat model may improve explanations only for recalled risks.
  - schema validation is required before model text can replace rule text.
  - invalid/unavailable model output falls back to rule results.
- `docs/adr/0002-provider-and-vector-store-adapters.md` confirms the adapter decision: local demos use mock/memory, hosted demos use OpenAI-compatible providers and pgvector.
- `docs/adr/0006-rule-first-contract-review.md` confirms contract review stays rule-first for stability, explainability, citations, and deterministic evaluation.
- `CONTEXT.md` defines domain terms: project space, ingestion job, chunk, citation, diagnostics, contract risk, quality report, evaluation run, audit log.
- `docs/demo-script.md` documents public-demo safety: do not expose login password, model key, database string, Render/Supabase environment variables, or backend console.
- Cross-checks beyond README:
  - Root `package.json` confirms a workspace monorepo with `apps/*` and `packages/*`, plus build/typecheck scripts.
  - `apps/api/package.json` confirms Express, pg, PDF/DOCX parsing dependencies, `validate`, `validate:pgvector`, `evaluate`, and `evaluate:review` scripts.
  - `apps/web/package.json` confirms Vue 3, Vite, TypeScript, and a Playwright smoke script.
  - `apps/api/Dockerfile` confirms the API container builds shared types and API output, copies datasets, and exposes port 4000.
  - `apps/api/src/app.ts` confirms routes for health, auth, quality reports, evaluation reports, audit logs, project spaces, ingestion jobs, documents, RAG query, and contract review.
  - `apps/api/src/rag/rag-service.ts` confirms query rewrite, vector + keyword recall, candidate merge/filter/rerank, answerability checks, citations, diagnostics, and refusal/fallback behavior.
  - `apps/api/src/review/review-service.ts` confirms deterministic rules for payment, delivery, breach liability, IP, dispute resolution, and termination, with optional model-assisted explanations.
  - `apps/web/src/components/` confirms separate UI views for knowledge, Q&A, contract review, quality, login, sidebar, and topbar.
  - `eval/rag-eval-set.json` and `eval/contract-review-eval-set.json` confirm dedicated RAG and contract-review evaluation fixtures.

Evidence rule:

- Do not rely on `README.md` alone because project READMEs can lag behind implementation.
- Cross-check claims against source code, package/workspace config, deployment files, docs, ADRs, scripts, tests/eval fixtures, screenshots, and current BIAU Port links before writing public page copy.
- If a claim is found only in README and not supported elsewhere, either avoid it or frame it as documented intent rather than current implementation.

Current BIAU Port state:

- `src/data/portfolio.ts` has a Legal RAG entry with concise `summary`, `role`, `stack`, and `highlights`.
- `src/pages/ProjectDetailPage.tsx` renders Legal RAG through the generic detail layout only. Unlike `ozon-erp` and `xunqiu`, it does not yet have a dedicated long-form project article section.
- `scripts/generate-assistant-knowledge.ts` currently turns the project summary and tags into public knowledge. A richer project page/data model should make assistant answers more useful.

## Requirements

- R1 Evidence-backed content: every concrete claim about implementation, architecture, deployment, evaluation, or roadmap must be backed by inspected source files or clearly framed as future direction.
- R2 Public safety: do not include demo login credentials, model keys, database URLs, provider secrets, Render/Supabase dashboard details, private local paths, or raw internal-only instructions in public UI copy.
- R3 Project page depth: the Legal RAG page should cover:
  - current deployed/demo status
  - product problem and user workflow
  - RAG pipeline
  - contract review flow
  - architecture and deployment shape
  - technology stack
  - quality/evaluation mechanisms
  - limitations and future optimization direction
- R4 Visitor-readable case study: the main presentation should first explain the product problem, demo story, and practical value in visitor-friendly language, then provide technical architecture and evaluation depth further down the page.
- R5 Maintainable data model: new Legal RAG detail content should live in typed project data or a reusable project-detail content model, not as one-off hard-coded copy if the implementation discovers other child tasks will need the same structure.
- R6 Assistant compatibility: generated public knowledge must remain compatible with current assistant citation rendering and API response shape.
- R7 Visual consistency: the page should follow existing `ProjectDetailPage` and `flow-pages.css` patterns, without a broad redesign.
- R8 Validation: implementation must run at least `npm.cmd run assistant:index`, `npm.cmd run lint`, `npm.cmd run build`, and attempt `npm.cmd run verify` unless blocked with concrete evidence.

## Out Of Scope

- Editing the `D:\workspace4Cursor\legal-rag` source project.
- Adding private knowledge ingestion or vector search to BIAU Port.
- Adding Legal RAG credentials, private database details, or provider secrets.
- Rewriting Legal RAG blog posts.
- Building a CMS or admin editor for project pages.
- Redesigning all project pages in this child task.
- Changing assistant backend contracts unless a small backward-compatible generated-knowledge extension is required.

## Acceptance Criteria

- [ ] Legal RAG project page includes a dedicated richer section or structured content equivalent to explain implementation, architecture, RAG flow, contract review, evaluation, limitations, and roadmap.
- [ ] Page copy is clearly derived from source evidence and does not expose secrets or unsafe operational details.
- [ ] Project data / detail content is maintainable enough to reuse for the next child tasks if they need similar dimensions.
- [ ] Generated public knowledge reflects the improved Legal RAG project content.
- [ ] Public assistant answers about RAG / contract review can cite Legal RAG with richer context than the previous generic summary.
- [ ] Existing routes and generic project detail behavior keep working.
- [ ] Required validation commands run or blockers are recorded with exact failures.

## Open Questions

None. The first version should lean toward a visitor-readable technical case study: product value and demo story first, architecture and evaluation depth below.
