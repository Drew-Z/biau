# Qdrant RAG adapter implementation plan

## Checklist

1. Update config/types.
   - Add Qdrant env variables to `server/src/env.ts`.
   - Add `qdrant` sync mode type support.
   - Add `.env.example` variables.

2. Extract reusable embedding helpers.
   - Reuse existing OpenAI-compatible embedding behavior.
   - Add dimension validation via `EMBEDDING_DIMENSION`.
   - Keep deterministic fallback for local checks.

3. Add Qdrant store module.
   - Health: read collection metadata/counts.
   - Sync: upsert public knowledge chunks into `QDRANT_PUBLIC_COLLECTION`.
   - Retrieve: query public/internal collections by scope.
   - Convert payload to citations/chunks.
   - Return `null` on incomplete config or provider errors so local fallback remains safe.

4. Wire orchestrator provider selection.
   - Prefer Qdrant when `RAG_STORE_PROVIDER=qdrant`.
   - Preserve existing Supabase pgvector compatibility.
   - Keep local fallback.

5. Update docs.
   - Render RAG Orchestrator variables use Qdrant.
   - Supabase is now for member/session/database needs, not the primary vector store.

6. Validate.
   - No live Qdrant or model tests.
   - Run deterministic/local smoke and build/lint.

## Validation Commands

```bash
npm.cmd run assistant:index
npm.cmd run assistant:kg-check
npm.cmd run assistant:rag-smoke
npm.cmd run assistant:rag-sync-local
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
git diff --check
```

## Manual Gates

- User fills `QDRANT_URL`, `QDRANT_API_KEY`, Qdrant collection names, and embedding variables in Render.
- User approves any live sync/retrieve check against Qdrant.
- User approves any real embedding/model validation task.

## Rollback

- Clear `RAG_STORE_PROVIDER=qdrant` or set it to `local`.
- Clear `ASSISTANT_RAG_API_BASE_URL` from assistant APIs to bypass Orchestrator.
- Keep local deterministic retrieval as fallback.
