# Public RAG pgvector recovery

## Goal

Restore the production public assistant knowledge path by replacing the failed Qdrant endpoint with the repository's existing Supabase pgvector store, then publish and verify the current public knowledge corpus without performing model liveness probes.

## Background

- The production Qdrant endpoint fails during TLS negotiation from both local and Render environments; the failure is not caused by sync credentials or embedding dimensions.
- The active public-assistant Supabase project is healthy and is already the public assistant persistence database.
- The database has no `rag_*` tables, so the RAG schema can be added without migrating existing RAG rows.
- The generated public corpus contains 29 documents, 58 chunks, 157 entities, and 220 relations.
- Production embeddings use `qwen3-embedding-8b` with 4096 dimensions.
- Supabase documents that pgvector HNSW indexes on `vector` support at most 2000 dimensions. The current 58-chunk corpus therefore uses exact cosine search on `vector(4096)` instead of an invalid ANN index.
- Existing public assistant persistence tables `PublicAssistantRequest`, `PublicAssistantAnswerRevision`, and `PublicAssistantBranch` currently lack RLS. That pre-existing issue is security follow-up work and is not changed in this recovery because enabling RLS without compatible policies could alter live behavior.

## Requirements

- Use `RAG_STORE_PROVIDER=supabase` and the existing server-only direct Postgres connection contract.
- Store embeddings as exactly 4096-dimensional vectors and reject incompatible embedding output through the existing dimension contract.
- Enable RLS on every new `rag_*` table. Do not grant browser/Data API access and do not create `anon` or `authenticated` policies.
- Keep public sync authenticated by `RAG_SYNC_TOKEN` and public retrieval authenticated by `RAG_PUBLIC_API_KEY`.
- Keep endpoints, credentials, database URLs, and model-provider details out of logs, source files, and user-visible diagnostics.
- Preserve the local deterministic fallback and the unused Qdrant adapter for rollback/compatibility; production configuration and documentation must no longer depend on Qdrant.
- Do not trigger AI Daily generation, create a Cron job, or perform model ping/doctor/diagnose requests.
- Deployment and synchronization must remain reversible by restoring the previous Render environment values/revision.

## Acceptance Criteria

- [ ] The committed SQL creates the required extensions and six `rag_*` tables, stores `rag_chunks.embedding` as `extensions.vector(4096)`, omits an ANN vector index, and enables RLS on every new table.
- [ ] Render Blueprint, environment examples, deployment docs, README, deployment checks, and backend specifications identify Supabase pgvector as the production RAG store and require `RAG_DATABASE_URL`.
- [ ] Relevant RAG contracts, deployment contract, server TypeScript build, lint, frontend build, and whitespace checks pass locally without real model calls.
- [ ] The additive schema migration is applied to the active public-assistant Supabase project, and post-migration inspection confirms the tables, 4096-dimensional vector column, RLS, and absence of public policies.
- [ ] The Render RAG service is configured with `RAG_STORE_PROVIDER=supabase` and a server-only database connection, then deploys the intended Git commit successfully.
- [ ] The authenticated public sync succeeds and `/health` reports `store=supabase-pgvector`, `vectorReady=true`, `documentCount=29`, `chunkCount=58`, and a non-null `lastSyncAt`.
- [ ] A real public-assistant business question uses the deployed RAG route and returns relevant public evidence; this request is an acceptance task, not a model liveness probe.
- [ ] The existing non-RLS public assistant tables are reported as a separate manual/security follow-up rather than silently modified.

## Out Of Scope

- Deleting the Qdrant adapter or historical Qdrant tests.
- Changing the embedding model or reducing its dimensions.
- Adding ANN indexing before corpus scale and measured latency justify it.
- Enabling RLS on existing public assistant persistence tables without a dedicated compatibility design.
- Resuming AI Daily production generation.
