# Qdrant RAG adapter design

## Architecture

```text
Public Assistant API
  -> RAG Orchestrator /v1/retrieve scope=public
  -> Qdrant collection biau_public_chunks

Internal Assistant API
  -> RAG Orchestrator /v1/retrieve scope=internal
  -> Qdrant collections biau_public_chunks + biau_internal_chunks

RAG Orchestrator /v1/sync
  -> generated public knowledge bundle
  -> embedding provider or deterministic local embedding
  -> Qdrant points upsert into biau_public_chunks
```

## Qdrant Collection Contract

The user-created collections use:

```text
vector size: 4096
distance: Cosine
datatype: float32
```

Qdrant points use a deterministic UUID derived from chunk id as the point id, because Qdrant point ids are not arbitrary free-form strings. The original chunk id is stored in payload and remains the public contract used by retrieval results:

```json
{
  "id": "<deterministic uuid from chunk id>",
  "vector": [0.0],
  "payload": {
    "scope": "public",
    "documentId": "...",
    "chunkId": "...",
    "title": "...",
    "summary": "...",
    "href": "...",
    "tags": ["..."],
    "sourceType": "project",
    "projectId": "...",
    "section": "...",
    "text": "...",
    "contentHash": "..."
  }
}
```

## Provider Selection

- `RAG_STORE_PROVIDER=qdrant` enables the Qdrant adapter.
- If Qdrant config is incomplete, retrieval/sync returns `null` and the orchestrator falls back to local retrieval.
- Existing Supabase pgvector code stays available for compatibility but is no longer the recommended final vector path.

## Embeddings

- Production target: `qwen3-embedding-8b`, `EMBEDDING_DIMENSION=4096`.
- If embedding provider env is incomplete, use deterministic local embeddings only for local checks. The adapter must not try to upsert vectors with a dimension that differs from `EMBEDDING_DIMENSION`.
- No model or embedding liveness calls are allowed unless the user approves a real task.

## Retrieval

Qdrant vector retrieval should:

- Embed the query.
- Query only `biau_public_chunks` for public scope.
- Query public + internal collections for internal scope.
- Convert Qdrant scores and payload into `RagRetrieveResponse`.
- Apply local keyword/entity retrieval as a grounding signal and fallback when Qdrant has no results.
- Return citations deduplicated by document id.

## Health

Health should report:

- store: `qdrant`
- vector readiness based on collection availability and point counts
- chunk count from public/internal collection counts
- no raw URL or secret values

## API References

Use Qdrant REST API concepts:

- Collections contain points.
- Points include vectors and payload.
- Upsert inserts or overwrites points by id.
- Query/search returns scored nearest neighbors.
