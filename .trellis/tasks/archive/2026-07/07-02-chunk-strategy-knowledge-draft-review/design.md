# Chunk Strategy Knowledge Draft Review Design

## Mode Gate

- Writing mode: Codex-only scaffold/review
- Model strategy: Codex evidence refresh and editorial revision
- Model channel: none
- Live model calls: none
- Publishing: out of scope

## Evidence Sources

- `content-drafts/02-chunk-strategy-public.md`
- `content-drafts/01-rag-overview-public.md`
- `content-drafts/03-embedding-vector-search-public.md`
- `src/data/blogShared.ts`
- `D:/workspace4Cursor/legal-rag/apps/api/src/chunks/splitter.ts`
- `D:/workspace4Cursor/legal-rag/apps/api/src/documents/text.ts`
- `D:/workspace4Cursor/legal-rag/apps/api/src/citations/citations.ts`
- `D:/workspace4Cursor/legal-rag/apps/api/src/rag/rag-service.ts`
- `D:/workspace4Cursor/legal-rag/apps/web/src/components/QaView.vue`

## Revision Shape

Keep the article as a Knowledge Notes draft. Add public-safe precision:

- `page` is currently a chunk-index estimate, not real parsed PDF pagination.
- quote is compacted and truncated for citation readability.
- chunk quality must be checked from ingestion through UI citation click.
- diagnostics and refusal behavior make bad chunking easier to locate.

## Safety Boundary

Do not include private URLs, credentials, model relay details, database strings, exact production health claims, private documents, or customer data.
