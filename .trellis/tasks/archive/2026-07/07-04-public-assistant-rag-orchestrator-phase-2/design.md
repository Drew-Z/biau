# Public Assistant RAG Orchestrator Phase 2 Design

## Summary

一期已经把公开助手从扁平搜索推进到本地 Agentic Hybrid RAG：公开知识 V2、chunks、entities、relations、intent routing、实体扩展和确定性 rerank 都已存在。二期不再继续把复杂检索逻辑塞进前端或 Cloudflare Function，而是新增一个 server-side RAG Orchestrator，把向量检索、关键词检索、实体关系扩展、rerank、self-check 和质量评测拆成可独立演进的层。

推荐路线：

```text
Public Assistant UI
  -> /api/chat/public
  -> server-side RAG adapter
       -> local Agentic Hybrid fallback
       -> optional RAG Orchestrator API
            -> query router / rewrite
            -> hybrid retrieval
                 -> vector store
                 -> keyword index
                 -> metadata filters
                 -> entity relation graph
            -> reranker
            -> sufficiency / citation check
            -> generator context
  -> Mimo model generation
  -> answer + citations + low-sensitive meta
```

## Boundaries

### Main Site

- Owns public UI, current assistant contracts, citation rendering and fallback.
- Continues to expose `POST /api/chat/public` and `GET /api/health`.
- Reads only server-side `ASSISTANT_RAG_*` variables for Orchestrator calls.
- Never exposes RAG API key, database URL, embedding key or reranker key to the browser.

### RAG Orchestrator

- Owns ingestion, indexing, retrieval, rerank, sufficiency check and diagnostics.
- Consumes public knowledge export from this repository.
- Returns evidence context and public citation metadata, not private internals.
- Can start as in-repo Node/TypeScript service code, then deploy as a separate Render service when production credentials are ready.
- During the in-repo mock phase, the Orchestrator router is mounted under the current assistant API's `/rag` prefix (`/rag/health`, `/rag/v1/retrieve`, `/rag/v1/sync`) so it does not replace the existing assistant `/health`. The same router can later be mounted at the root of a standalone Orchestrator service.

### Storage Providers

- First recommended storage: Supabase Postgres + pgvector.
- Backup storage: Render Postgres + pgvector if keeping API and DB close matters more.
- Cloudflare Vectorize / AI Search: optional if Cloudflare-native operations become the priority.
- Neo4j/Aura: future graph-native upgrade only after real questions require deep traversal.

## HTTP Contract

### `GET /health`

Returns low-sensitive readiness:

Current in-repo mock mount: `GET /rag/health`.

```json
{
  "ok": true,
  "service": "biau-rag-orchestrator",
  "store": "local|supabase|render-postgres|cloudflare-vectorize|neo4j",
  "vectorReady": true,
  "keywordReady": true,
  "rerankerReady": false,
  "lastSyncAt": "2026-07-04T00:00:00.000Z"
}
```

No private endpoint, database URL, key fingerprint, table name that reveals infrastructure, or model relay URL should appear.

### `POST /v1/retrieve`

Input:

Current in-repo mock mount: `POST /rag/v1/retrieve`.

```json
{
  "query": "Legal RAG 怎么体验？",
  "scope": "public",
  "limit": 6,
  "locale": "zh-CN"
}
```

Output:

```json
{
  "intent": "demo-access",
  "citations": [
    {
      "id": "project:legal-rag",
      "title": "Legal RAG",
      "summary": "...",
      "href": "/projects/legal-rag",
      "tags": ["rag", "legal"]
    }
  ],
  "chunks": [
    {
      "id": "chunk:project:legal-rag:demo",
      "documentId": "project:legal-rag",
      "text": "...",
      "score": 0.86,
      "reason": "vector+keyword+entity"
    }
  ],
  "meta": {
    "retrievalMode": "hybrid",
    "candidateCount": 18,
    "reranked": true,
    "sufficient": true,
    "fallbackReason": null
  }
}
```

### `POST /v1/chat/public`

Optional convenience endpoint. It may produce answer context or a full answer, but the main site should preserve the existing response shape:

```json
{
  "answer": "...",
  "citations": [],
  "meta": {
    "mode": "rag-orchestrated",
    "model": "mimo-v2.5-pro",
    "provider": "mimo-compatible",
    "citationCount": 3
  }
}
```

### `POST /v1/sync`

Accepts generated public knowledge V2 or fetches it from a known public artifact. Requires a sync token in production. Local/mock sync can read `server/data/public-knowledge-v2.json`.

Current in-repo mock mount: `POST /rag/v1/sync`, implemented as local readonly sync status until a real external store is approved.

## Data Model

The existing V2 export is the source of truth:

```text
documents -> chunks -> embeddings
documents -> entities -> relations
documents/chunks -> metadata filters
```

Additional Orchestrator tables or collections should be provider-neutral:

- `rag_documents`
- `rag_chunks`
- `rag_entities`
- `rag_relations`
- `rag_embeddings`
- `rag_sync_runs`
- `rag_eval_runs`

The schema must store public data only.

## Retrieval Pipeline

1. Normalize and classify query.
2. Generate deterministic query terms and optional rewrite variants.
3. Run parallel retrieval:
   - vector search over chunk embeddings;
   - keyword/BM25 or exact token search;
   - metadata filter by project, source type, status kind or tag;
   - entity/relation expansion from known graph.
4. Merge candidates and dedupe by document/chunk.
5. Rerank:
   - deterministic first;
   - model/API reranker only when configured;
   - fallback on timeout or provider failure.
6. Build answer context under a citation budget.
7. Run sufficiency check:
   - enough public evidence -> answer;
   - weak evidence -> conservative answer with uncertainty;
   - no evidence -> refuse to invent.

## Reranker Strategy

Start with a deterministic reranker so tests remain stable:

- exact title/project match;
- tag/source-type match;
- chunk/document freshness;
- entity relation distance;
- status/demo intent boost;
- citation diversity.

Later provider-backed reranker contract:

```text
RERANKER_PROVIDER=
RERANKER_BASE_URL=
RERANKER_API_KEY=
RERANKER_MODEL=
RERANKER_TIMEOUT_MS=3000
```

These variables stay server-side only and are not required for local validation.

## Self-Check Strategy

Self-check has deterministic and optional model-backed layers.

Deterministic checks:

- At least one public citation for factual answers.
- Target project/route appears in citations for project-specific questions.
- Answer does not contain raw private env names, API keys, tokens, relay URLs or database URLs.
- Answer avoids raw path dumps and "来源：" style source logs.
- Unsupported questions trigger refusal or uncertainty.

Optional model-backed checks:

- Claim-citation consistency review.
- Answer helpfulness scoring.
- Query rewrite improvement.

Model-backed checks are disabled in default tests and require user-approved real tasks for live validation.

## Environment Contract

Main site / Cloudflare / Express:

```text
ASSISTANT_RAG_API_BASE_URL=
ASSISTANT_RAG_API_KEY=
ASSISTANT_RAG_TIMEOUT_MS=3000
```

Orchestrator service:

```text
RAG_STORE_PROVIDER=local
RAG_SYNC_TOKEN=
RAG_ALLOWED_ORIGINS=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

EMBEDDING_PROVIDER=
EMBEDDING_BASE_URL=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=
EMBEDDING_DIMENSIONS=

RERANKER_PROVIDER=
RERANKER_BASE_URL=
RERANKER_API_KEY=
RERANKER_MODEL=
```

Only placeholder names belong in committed docs. Real values stay in platform secrets or local private env files.

## Evaluation

Create a deterministic evaluation harness before connecting production storage:

- Input: fixed public assistant questions.
- Expected: citation IDs, refusal expectation, sensitive-output prohibition, answer style checks.
- Output: JSON report with pass/fail and low-sensitive diagnostics.

This gives a baseline before and after external vector search, reranker, or self-check changes.

## Rollout

1. Local/mock Orchestrator contract and eval harness.
2. Main-site adapter behind `ASSISTANT_RAG_API_BASE_URL`.
3. Supabase/Render schema and sync script, without committing secrets.
4. Embedding adapter and reranker adapter behind env.
5. Production deployment only after user configures platform secrets.
6. Add status page check only after `/health` is deployed and user approves production checks.

## Rollback

- If Orchestrator fails, main site uses local Agentic Hybrid fallback.
- If vector store fails, use keyword/entity fallback.
- If reranker fails, use deterministic rerank.
- If model generation fails, use conservative public-knowledge answer.
- If eval degrades, keep the old local retrieval path as default and leave Orchestrator disabled.
