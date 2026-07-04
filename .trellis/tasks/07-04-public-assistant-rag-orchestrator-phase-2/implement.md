# Public Assistant RAG Orchestrator Phase 2 Implementation Plan

## Current State

- Task is in `in_progress`.
- Phase 1 public assistant local MVP is complete.
- Mimo production model config is present according to low-sensitive `/api/health`.
- No external RAG Orchestrator, vector store, reranker provider or production eval exists yet.

## Recommended Execution Order

### 0. Planning Gate

- [x] Create this child task under `07-04-biau-port-continuous-improvement`.
- [x] Write `prd.md`.
- [x] Write `design.md`.
- [x] Write this `implement.md`.
- [x] Add manual actions for cloud resources and secrets.
- [x] Run `git diff --check`.
- [x] After user approves, start the task with `task.py start`.

### 1. Evaluation Harness First

Status: first local baseline complete.`npm.cmd run assistant:eval currently passes 9/9 deterministic cases with modelCalls=0.

Build quality measurement before adding more infrastructure.

- [x] Add an eval fixture for public assistant questions:
  - site overview;
  - demo-ready projects;
  - Legal RAG entry and login gate;
  - ERP registration/status;
  - Pet showcase and APK gate;
  - technology stack lookup;
  - status/reliability;
  - blog/knowledge accumulation;
  - unsupported/private-data request.
- [x] Add deterministic assertions:
  - required citation ids;
  - citation count;
  - expected refusal or uncertainty;
  - no raw paths/source logs in answer body;
  - no secrets/private endpoint patterns;
  - meta contains low-sensitive retrieval diagnostics.
- [x] Add script:

```powershell
npm.cmd run assistant:eval
```

Validation:

```powershell
npm.cmd run assistant:index
npm.cmd run assistant:kg-check
npm.cmd run assistant:eval
```

### 2. Orchestrator Contract With Local/Mock Adapter

- Add in-repo Orchestrator module or service scaffold.
- Implement local store adapter reading `server/data/public-knowledge-v2.json`.
- Implement routes or callable functions for:
  - `GET /health`
  - `POST /v1/retrieve`
  - optional `POST /v1/chat/public`
  - `POST /v1/sync`
- Keep response compatible with existing citation shape.
- Add tests/smoke using local/mock adapters only.

Validation:

```powershell
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:eval
```

### 3. Main-Site RAG Adapter

- Implement server-side adapter for `ASSISTANT_RAG_API_BASE_URL`.
- Apply timeout and fallback to local Agentic Hybrid retrieval.
- Use low-sensitive diagnostics:
  - retrieval mode;
  - HTTP status class;
  - timeout;
  - fallback reason;
  - citation count.
- Update both Express API and Cloudflare Function paths if feasible.
- Do not expose Orchestrator config to front-end code.

Validation:

```powershell
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
npm.cmd run assistant:eval
```

### 4. Storage Schema And Sync

- Add provider-neutral schema documentation or SQL for:
  - documents;
  - chunks;
  - entities;
  - relations;
  - embeddings;
  - sync runs;
  - eval runs.
- Prefer Supabase Postgres + pgvector for first external store.
- Keep Render Postgres + pgvector as an alternate.
- Do not commit real connection strings or service role keys.
- Add sync script that can run locally against mock/local store first.

Validation:

```powershell
npm.cmd run assistant:index
<local sync command>
npm.cmd run assistant:eval
```

### 5. Embedding And Vector Retrieval Adapter

- Add embedding provider interface.
- Add vector store interface.
- Support local deterministic embedding/mock adapter for tests.
- Add Supabase pgvector adapter only after schema is ready.
- Keep provider errors non-fatal and fallback to keyword/entity retrieval.

Validation:

```powershell
npm.cmd run assistant:eval
npm.cmd run server:build
npm.cmd run lint
```

### 6. Reranker Adapter

- Keep deterministic reranker as baseline.
- Add optional provider-backed reranker interface.
- Do not call live reranker during ordinary validation.
- Add eval comparison fields:
  - before rerank top citation;
  - after rerank top citation;
  - citation diversity.

Validation:

```powershell
npm.cmd run assistant:eval
npm.cmd run server:smoke
```

### 7. Self-Check And Corrective Path

- Add deterministic checks for citation sufficiency and unsafe output.
- Add optional model-backed self-check contract but keep disabled by default.
- If evidence is weak, answer with uncertainty instead of inventing facts.
- If evidence is missing, refuse and suggest relevant public pages.

Validation:

```powershell
npm.cmd run assistant:eval
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
```

### 8. Observability And Status Integration

- Add low-sensitive Orchestrator `/health`.
- Add status-page target only after Orchestrator is deployed or mockable.
- Do not display provider URLs, keys, database IDs or internal hostnames.

Validation:

```powershell
npm.cmd run site:status
npm.cmd run lint
npm.cmd run build
```

## Manual Gates

- User creates or approves Supabase / Render / Cloudflare / Neo4j resources.
- User configures private environment variables in deployment platforms.
- User approves any live model, embedding or reranker validation prompt.
- User confirms production Orchestrator deployment URL may be checked.

## Final Validation Before Commit

Minimum local gate for planning-only changes:

```powershell
git diff --check
```

Minimum implementation gate for code changes:

```powershell
npm.cmd run assistant:index
npm.cmd run assistant:kg-check
npm.cmd run assistant:eval
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
git diff --check
```

First implementation slice complete: `assistant:eval` exists and passes locally without live model calls.

## Rollback Points

- Keep `ASSISTANT_RAG_API_BASE_URL` empty to disable Orchestrator.
- Revert adapter wiring without changing public assistant UI.
- Keep local Agentic Hybrid retrieval as fallback.
- Disable vector or reranker providers independently if they degrade eval results.
