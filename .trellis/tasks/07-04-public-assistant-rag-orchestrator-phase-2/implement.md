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

Status: first local baseline complete. `npm.cmd run assistant:eval` currently passes 9/9 deterministic cases with `modelCalls=0`.

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

Status: local/mock contract complete under the current assistant API prefix:
`GET /rag/health`, `POST /rag/v1/retrieve`, and `POST /rag/v1/sync`.
The router can be reused later as a root router for a standalone Orchestrator service.

- [x] Add in-repo Orchestrator module or service scaffold.
- [x] Implement local store adapter reading `server/data/public-knowledge-v2.json`.
- [x] Implement routes or callable functions for:
  - [x] `GET /health` contract, mounted locally as `GET /rag/health`
  - [x] `POST /v1/retrieve` contract, mounted locally as `POST /rag/v1/retrieve`
  - [ ] optional `POST /v1/chat/public`
  - [x] `POST /v1/sync` contract, mounted locally as `POST /rag/v1/sync`
- [x] Keep response compatible with existing citation shape.
- [x] Add tests/smoke using local/mock adapters only.

Validation:

```powershell
npm.cmd run server:build
npm.cmd run assistant:rag-smoke
npm.cmd run server:smoke
npm.cmd run assistant:eval
```

### 3. Main-Site RAG Adapter

Status: server-side adapter complete for both Express and Cloudflare Pages Function paths.
`ASSISTANT_RAG_API_BASE_URL` is still optional; when absent or failing, public chat falls back to local Agentic Hybrid retrieval.

- [x] Implement server-side adapter for `ASSISTANT_RAG_API_BASE_URL`.
- [x] Apply timeout and fallback to local Agentic Hybrid retrieval.
- [x] Use low-sensitive diagnostics:
  - [x] retrieval mode;
  - [x] HTTP status class;
  - [x] timeout;
  - [x] fallback reason;
  - [x] citation count.
- [x] Update both Express API and Cloudflare Function paths.
- [x] Keep Orchestrator config server-side only; front-end response remains `{ answer, citations, meta }`.
- [x] Feed Orchestrator chunks into the model prompt as hidden grounding context while exposing only public citation cards.

Validation:

```powershell
npm.cmd run cf-assistant:smoke
npm.cmd run server:smoke
npm.cmd run assistant:eval
```

### 4. Storage Schema And Sync

Status: provider-neutral Postgres/pgvector schema template and local readonly sync plan are complete.

- [x] Add provider-neutral schema documentation or SQL for:
  - [x] documents;
  - [x] chunks;
  - [x] entities;
  - [x] relations;
  - [x] embeddings;
  - [x] sync runs;
  - [x] eval runs.
- [x] Prefer Supabase Postgres + pgvector for first external store.
- [x] Keep Render Postgres + pgvector as an alternate.
- [x] Do not commit real connection strings or service role keys.
- [x] Add sync script that can run locally against mock/local store first.

Validation:

```powershell
npm.cmd run assistant:index
npm.cmd run assistant:rag-sync-local
npm.cmd run assistant:eval
```

### 5. Embedding And Vector Retrieval Adapter

Status: local deterministic adapter interfaces are complete. External embedding/vector providers remain manual-gated.

- [x] Add embedding provider interface.
- [x] Add vector store interface.
- [x] Support local deterministic embedding/mock adapter for tests.
- [ ] Add Supabase pgvector adapter only after schema is ready and user approves credentials/resources.
- [x] Keep provider errors non-fatal and fallback to keyword/entity retrieval.

Validation:

```powershell
npm.cmd run assistant:eval
npm.cmd run server:build
npm.cmd run lint
```

### 6. Reranker Adapter

Status: deterministic chunk reranker is active in the local/mock Orchestrator. Provider-backed reranker remains manual-gated.

- [x] Keep deterministic reranker as baseline.
- [ ] Add optional provider-backed reranker interface after production provider choice.
- [x] Do not call live reranker during ordinary validation.
- [ ] Add eval comparison fields:
  - [ ] before rerank top citation;
  - [ ] after rerank top citation;
  - [ ] citation diversity.

Validation:

```powershell
npm.cmd run assistant:eval
npm.cmd run server:smoke
```

### 7. Self-Check And Corrective Path

Status: deterministic self-check is active for model answers in both Express and Cloudflare public chat paths.

- [x] Add deterministic checks for citation sufficiency and unsafe output.
- [ ] Add optional model-backed self-check contract but keep disabled by default.
- [x] If evidence is weak, answer with uncertainty instead of inventing facts.
- [x] If evidence is missing, refuse and suggest relevant public pages.
- [x] If model output prints raw routes, source logs, provider env names, database URLs, bearer tokens, or secret-looking values, return fallback with `self_check_failed`.

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
npm.cmd run assistant:rag-smoke
npm.cmd run assistant:rag-sync-local
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
