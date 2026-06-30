# Enhance Legal RAG Project Page Implementation Plan

## Guardrails

- Stay in planning until the user reviews `prd.md`, `design.md`, and this plan and approves `task.py start`.
- Before code edits in Phase 2, load `trellis-before-dev` and relevant frontend specs.
- Do not edit `D:\workspace4Cursor\legal-rag`; use it as read-only evidence.
- Do not commit secrets, login credentials, raw private paths, or unsafe deployment details.
- Do not rewrite blog posts in this child task.
- Preserve unrelated dirty files: `AGENTS.md`, `.agents/`, `.codex/`, and `docs/agents/codex-workflow.md`.

## Ordered Checklist

### 1. Evidence Audit

- Re-check Legal RAG evidence beyond README:
  - package/workspace scripts
  - API route file
  - RAG service
  - contract review service
  - Dockerfile / deployment docs
  - architecture docs / ADRs
  - eval fixtures
  - screenshot assets
- Write only claims supported by code/config/docs/eval evidence.
- If README and code disagree, prefer code/config and avoid overstating the claim.

### 2. Content Model

- Add a reusable optional project-detail content model in `src/data/portfolio.ts`.
- Add Legal RAG structured detail content:
  - visitor-oriented overview
  - workbench workflow
  - architecture / RAG pipeline
  - contract review design
  - quality / evaluation / deployment evidence
  - limitations
  - future optimization direction
- Add assistant-facing project context if needed so generated knowledge improves without bloating visible copy.

### 3. Detail Page Rendering

- Update `src/pages/ProjectDetailPage.tsx` to render generic `project.detailContent` sections.
- Keep the existing header, highlights, stack, links, related projects, and custom Ozon/Xunqiu sections working.
- Prefer a small local renderer/helper over broad component restructuring unless the file becomes hard to read.

### 4. Styling

- Reuse `detail-body`, `detail-block`, `detail-block-wide`, `detail-highlights`, `blog-post-body-text`, `link-badge`, and existing project-detail styles.
- Add only minimal reusable CSS for project case-study sections if current classes cannot express the layout.
- Check mobile text wrapping and avoid nested card structures.

### 5. Assistant Knowledge

- Update `scripts/generate-assistant-knowledge.ts` so Legal RAG enhanced context is reflected in `server/data/public-knowledge.json`.
- Keep output shape backward-compatible.
- Update `src/data/assistant.ts` local fallback knowledge if generator and frontend would otherwise diverge.

### 6. Validation

Run:

```bash
npm.cmd run assistant:index
npm.cmd run lint
npm.cmd run build
npm.cmd run verify
```

If a check fails, fix the issue and rerun the relevant command. If `verify` fails for environment-specific preview/tooling reasons, record exact evidence.

## Review Before Start

Before starting implementation, confirm:

- Legal RAG presentation direction is visitor-readable technical case study.
- Multi-source evidence rule is accepted.
- The reusable project-detail content model is acceptable for future child tasks.
- Blog content remains out of scope.

## Rollback Points

- Data-only rollback: revert Legal RAG `detailContent` / assistant context additions.
- Rendering rollback: remove generic detail renderer while keeping data untouched.
- Knowledge rollback: revert generator/local fallback changes and regenerate `server/data/public-knowledge.json`.
