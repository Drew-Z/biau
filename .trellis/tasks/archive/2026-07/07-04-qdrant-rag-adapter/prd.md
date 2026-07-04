# Qdrant RAG adapter implementation

## Goal

Implement the final vector-store path for the BIAU Port RAG Orchestrator using Qdrant Cloud collections created by the user: `biau_public_chunks` and `biau_internal_chunks`. The Orchestrator should support scoped sync/retrieve through Qdrant while preserving safe local fallback and never exposing secrets.

## Background

- The user created a Qdrant free cluster named `biau-rag-vector`.
- The user created two green Qdrant collections:
  - `biau_public_chunks`
  - `biau_internal_chunks`
- Both collections are configured as dense vector collections with dimension `4096` and metric `Cosine`.
- The user saved the Qdrant API key locally and must not paste it into chat or commit it.
- Current code already has service modes (`ASSISTANT_SERVICE_MODE=public|internal|rag`), RAG auth keys, local retrieval, and a Supabase pgvector implementation.
- Current code does not yet read or use `QDRANT_URL`, `QDRANT_API_KEY`, or Qdrant collection variables.
- The user forbids model liveness checks, provider pings, doctor/diagnose commands, and artificial tiny prompts. Any real model validation must use a user-approved real task.

## Requirements

- R1. Add server-only Qdrant configuration variables:
  - `QDRANT_URL`
  - `QDRANT_API_KEY`
  - `QDRANT_PUBLIC_COLLECTION`
  - `QDRANT_INTERNAL_COLLECTION`
  - `EMBEDDING_DIMENSION`
- R2. Enable `RAG_STORE_PROVIDER=qdrant` in `ASSISTANT_SERVICE_MODE=rag`.
- R3. Implement Qdrant health reporting without leaking endpoint or key values.
- R4. Implement sync from `server/data/public-knowledge-v2.json` into `biau_public_chunks`.
- R5. Implement retrieval from Qdrant for `scope=public` and `scope=internal`.
- R6. Public scope must only query `biau_public_chunks`.
- R7. Internal scope may query both public and internal collections when internal collection has data, while preserving citations and chunk boundaries.
- R8. Use OpenAI-compatible embedding calls only when `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, and a non-local `EMBEDDING_MODEL` are configured.
- R9. Keep deterministic local retrieval as test/fallback behavior when Qdrant or embedding config is unavailable.
- R10. Update deployment docs and `.env.example` to describe Qdrant as the selected final vector store.
- R11. Do not commit or print real API keys, endpoints, database URLs, passwords, or model relay URLs.

## Acceptance Criteria

- [ ] `RAG_STORE_PROVIDER=qdrant` activates Qdrant health/sync/retrieve code paths.
- [ ] Qdrant config can be absent locally without breaking existing local tests.
- [ ] Sync returns diagnostics for public documents/chunks and does not require live model calls when embedding config is absent.
- [ ] Retrieve falls back safely when Qdrant is not configured, fails, or returns no useful context.
- [ ] Public retrieval never queries the internal collection.
- [ ] Docs list Render variables for Qdrant without real secrets.
- [ ] Validation passes without live model/provider tests.

## Out Of Scope

- Creating or managing Qdrant clusters from code.
- Running live Qdrant, embedding, reranker, or model tests against user credentials.
- Uploading internal private documents.
- Replacing member/session storage with Qdrant.
