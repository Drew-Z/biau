# Public RAG pgvector recovery design

## Architecture

The three-service boundary remains unchanged. `biau-public-assistant-api` calls the authenticated `biau-rag-orchestrator`; only the orchestrator connects directly to the Supabase Postgres database. Browser clients never receive the RAG database URL, publication token, or retrieval API key.

The production store selection changes from `qdrant` to `supabase`. Existing routing in `ragOrchestrator.ts` selects `ragPostgresStore.ts` when `RAG_STORE_PROVIDER=supabase` and `RAG_DATABASE_URL` is configured. Local fallback and the Qdrant adapter remain compiled but are not part of production configuration.

## Data Model

The additive schema owns six public-knowledge tables:

- `rag_documents`
- `rag_chunks`
- `rag_entities`
- `rag_relations`
- `rag_sync_runs`
- `rag_eval_runs`

`rag_chunks.embedding` is `extensions.vector(4096)`, matching the approved production embedding contract. Keyword, metadata, entity, and relation indexes remain. The schema deliberately omits HNSW/IVFFlat because pgvector cannot ANN-index a 4096-dimensional `vector`, and exact search is appropriate for 58 chunks.

All six tables enable RLS with no browser-facing policies. The orchestrator uses a server-only direct Postgres connection. No Supabase Data API grant is required.

## Sync And Retrieval

The existing `/v1/sync/public` transaction upserts the generated corpus and prunes stale public rows. Every chunk receives a 4096-dimensional embedding. Health reads bounded counts and the last completed sync timestamp.

Retrieval continues to combine keyword/metadata candidates, exact cosine vector candidates, and entity/relation expansion before deterministic merging and citation selection. A vector-provider failure degrades only the vector candidate branch; keyword/entity retrieval remains available.

## Deployment

1. Commit and push schema/config/documentation changes.
2. Apply the additive SQL migration to Supabase.
3. Copy the already configured public assistant database URL into the RAG service as `RAG_DATABASE_URL` without exposing it in output.
4. Set `RAG_STORE_PROVIDER=supabase` on the RAG service.
5. Deploy the committed revision.
6. Trigger the existing GitHub public RAG sync workflow and verify health/counts.

## Rollback

Application rollback is independent from the additive database schema. Restore the previous Render revision and provider variables to return to the prior local/Qdrant behavior. The empty or populated `rag_*` tables can remain inert; destructive cleanup is not part of rollback.

## Security Notes

The new tables are closed to Data API roles by RLS and lack public policies. Existing non-RLS assistant persistence tables are not changed in this task because their policy design must preserve live anonymous persistence behavior.
