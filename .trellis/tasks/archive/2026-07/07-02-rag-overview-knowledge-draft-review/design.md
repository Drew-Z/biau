# RAG Overview Knowledge Draft Review Design

## Mode Gate

- Writing mode: Codex-only scaffold/review
- Model strategy: Codex evidence refresh and editorial revision
- Model channel: none
- Live model calls: none
- Publishing: out of scope

## Evidence Sources

- `content-drafts/01-rag-overview-public.md`
- `content-drafts/02-chunk-strategy-public.md`
- `content-drafts/03-embedding-vector-search-public.md`
- `src/data/blogShared.ts`
- `D:/workspace4Cursor/legal-rag/docs/architecture.md`
- `D:/workspace4Cursor/legal-rag/apps/api/src/rag/rag-service.ts`
- `D:/workspace4Cursor/legal-rag/apps/web/scripts/e2e-smoke.mjs`

## Revision Shape

Keep the article as a Knowledge Notes draft. Add only public-safe facts:

- RAG answer source can be model, fallback, or refusal.
- Query path uses vector and keyword candidates, merge/filter/rerank, answerability, citations, diagnostics.
- Demo smoke checks health, auth, public dataset seed, RAG query, and Web rendering.
- Publishing still needs human review and optional image decision.

## Safety Boundary

Do not include private URLs, credentials, model relay details, database strings, exact production health claims, private documents, or customer data.
