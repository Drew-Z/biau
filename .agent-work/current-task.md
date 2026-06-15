# Current Task

Date: 2026-06-15
Repo: /home/zhang/workspace/blog-semi
Branch: main
Controller: Codex
Builder: Codex

## Goal

Continue showcase asset coverage inside WSL by adding a desensitized Legal RAG workflow diagram and using it on the Legal RAG case detail page.

## Scope

- Create a public-safe Legal RAG flow diagram covering import, chunking, embedding, retrieval, rerank, answer, citations, and contract review.
- Add the Legal RAG flow diagram to `/cases/legal-rag` as an additional evidence image.
- Preserve existing Legal RAG screenshots and other case image mappings.
- Update `docs/showcase-assets.md` to reflect the Legal RAG flow coverage.
- Verify route rendering, image loading, lint, build, and sensitive wording scan in WSL.

## Non-goals

- Do not copy real contracts, client names, legal documents, model keys, database URLs, vector-store data, prompts, or private API endpoints.
- Do not modify `~/workspace/reference-projects`.
- Do not add new projects.
- Do not redesign the whole case-detail layout.
- Do not push before verification.

## Allowed Paths

- `src/App.tsx`
- `docs/showcase-assets.md`
- `public/images/projects/showcase/legal-rag-flow.svg`
- `.agent-work/*`

## Acceptance Criteria

- [x] `/cases/legal-rag` shows the existing three screenshots plus the new Legal RAG flow diagram.
- [x] The new Legal RAG diagram is public-safe and path-free.
- [x] Existing case image routes still work.
- [x] No horizontal overflow appears on desktop/mobile checks.
- [x] Public text does not introduce `面试` / `作品集` wording or sensitive credentials/endpoints.
- [x] `npm run lint` and `npm run build` pass in WSL.

## Verification Plan

- Browser-check `/cases/legal-rag` at desktop and mobile widths.
- Run a quick image regression for existing case image routes.
- Run `npm run lint`.
- Run `npm run build`.
- Run a sensitive/public wording scan over `src`, `docs`, `public`, and active `.agent-work` files.
- Commit only after the evidence is clean.
