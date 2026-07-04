# Backend Quality Guidelines

## Required Verification

Backend and full-project changes should pass the relevant commands from `package.json`:

```powershell
npm.cmd run prisma:validate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
```

For broad confidence before handoff, run:

```powershell
npm.cmd run verify
```

`verify` runs assistant knowledge generation, Prisma validation, lint, server build, smoke test, frontend build, blog check, preview startup, and UI checks.

## Smoke Test Contract

`server/scripts/smoke.ts` is the minimum backend behavior gate. It starts the Express app on an available localhost port and verifies:

- `/health` returns OK.
- `/chat/public` accepts `RAG 项目`, returns an answer plus citations array, and cites `project:legal-rag` so the test catches public-knowledge path or indexing regressions.
- `/chat/internal` rejects unauthenticated requests with `401`.

Do not break these behaviors when changing app middleware, auth, model fallback, or database guards.

## Environment Safety

Use `server/src/env.ts` as the single place for reading environment variables. Keep defaults non-sensitive and local-development friendly. The current public model fallback allows the assistant API to run without `OPENAI_API_KEY`.

Do not read `.env`, `.env.local`, `.env.*.local`, private key files, or SSH files into task context. Use `.env.example` when documenting expected shape.

## Scenario: Public Assistant Model Provider

### 1. Scope / Trigger

- Trigger: `/chat/public` adds or changes an OpenAI-compatible model provider, model fallback behavior, or model-related environment keys.

### 2. Signatures

- `POST /chat/public` accepts `{ message: string }`.
- The response remains `ChatResponse`: `{ answer, citations, meta }`.
- `meta.mode` is `'model' | 'fallback'`.
- `meta.reason` for fallback can be `'not_configured'`, `'provider_error'`, `'empty_response'`, or `'no_public_context'`.
- `meta.diagnostic`, when present, is low-sensitivity provider troubleshooting
  only: `{ kind, httpStatus?, attemptedEndpoints, timeoutMs }`.

### 3. Contracts

- Model environment keys are server-only: `ASSISTANT_MODEL_BASE_URL`, `ASSISTANT_MODEL_API_KEY`, `ASSISTANT_MODEL_NAME`, and `ASSISTANT_MODEL_PROVIDER`.
- Legacy `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and `OPENAI_MODEL` may remain supported, but new docs should prefer `ASSISTANT_MODEL_*`.
- The frontend only uses `VITE_CHAT_API_BASE_URL`; never expose model base URLs or API keys through Vite variables.
- Public-scope model calls must be grounded in public citations from `server/data/public-knowledge.json`.
- If public search returns zero citations, return fallback with `reason: 'no_public_context'` and do not call the provider.
- Cloudflare Pages can serve same-domain public assistant endpoints through `functions/api/health.ts` and `functions/api/chat/public.ts`. Keep these endpoints compatible with the same `ChatResponse` shape as the Express `/health` and `/chat/public` routes.
- OpenAI-compatible provider calls use a 20 second timeout. On provider fallback,
  `meta.diagnostic.kind` may be `timeout`, `network_error`, `http_status`, or
  `empty_response`. Do not include endpoint URLs, API keys, request bodies, raw
  provider responses, stack traces, or prompt text in `meta.diagnostic`.
- A live GLM/API key check is only meaningful after the deployed host proves that
  Pages Functions are active. `GET /api/health` must return JSON; if it returns
  the static site HTML, or `POST /api/chat/public` returns `404` / `405`, treat
  the blocker as missing or stale Cloudflare Pages Functions deployment, not as a
  model-provider or API-key failure.

### 4. Validation & Error Matrix

- Missing model key or base URL -> `meta.mode: 'fallback'`, `reason: 'not_configured'`.
- Live `/api/health` returns HTML instead of JSON -> deployment blocker:
  Cloudflare Pages is serving only the static app or an older build.
- Live `/api/chat/public` returns `404` / `405` while local
  `cf-assistant:smoke` passes -> deployment blocker: Functions are missing,
  disabled, or not included in the current Pages deployment.
- Provider network failure, non-OK response, or timeout -> `meta.mode: 'fallback'`, `reason: 'provider_error'`.
- Provider timeout -> `meta.diagnostic: { kind: 'timeout', attemptedEndpoints, timeoutMs: 20000 }`.
- Provider network failure -> `meta.diagnostic.kind: 'network_error'`.
- Provider non-OK response -> `meta.diagnostic.kind: 'http_status'` and only the numeric `httpStatus`.
- Provider returns no message content -> `meta.mode: 'fallback'`, `reason: 'empty_response'`.
- Provider returns an OK response with no message content -> `meta.diagnostic.kind: 'empty_response'`.
- Public question has no matching public citations -> `meta.mode: 'fallback'`, `reason: 'no_public_context'`.
- Public chat should not return raw provider errors, tokens, base URLs, stack traces, or prompt text.

### 5. Good/Base/Bad Cases

- Good: a GLM-compatible relay is configured in deployment env, `/chat/public` returns a concise model answer plus public citations, and the frontend labels it as model-enhanced without showing provider details.
- Base: no provider env is configured; `/chat/public` still answers from sanitized public knowledge.
- Bad: the browser bundle contains `ASSISTANT_MODEL_API_KEY`, a real relay URL, or a fallback path that calls the provider with no public context.

### 6. Tests Required

- `server:smoke` must cover configured OpenAI-compatible success, unconfigured fallback, provider failure fallback, `/health`, and protected internal auth behavior.
- `cf-assistant:smoke` must cover the Cloudflare Pages Function fallback, configured OpenAI-compatible success, and provider failure fallback.
- Provider failure smoke checks must assert `meta.diagnostic` exists and contains
  only low-sensitivity fields.
- `check:ui` should assert the public assistant opens in a concise default state before citations appear.
- Before asking a user to rotate or re-enter `ASSISTANT_MODEL_*`, verify the
  live deployment layer first: `/api/health` must return JSON from the Function,
  then `/api/chat/public` can be checked for `meta.mode`.
- Run `assistant:index`, `server:build`, `server:smoke`, `lint`, `build`, `prisma:validate`, `git diff --check`, and a sensitive-value scan after model-provider work.

### 7. Wrong vs Correct

#### Wrong

```ts
fetch(`${import.meta.env.VITE_ASSISTANT_MODEL_BASE_URL}/chat/completions`, {
  headers: { Authorization: `Bearer ${import.meta.env.VITE_ASSISTANT_MODEL_API_KEY}` },
})
```

This puts the model channel in the browser and risks exposing private credentials.

#### Correct

```ts
const response = await fetch(`${modelConfig.baseUrl}/chat/completions`, {
  headers: { Authorization: `Bearer ${modelConfig.apiKey}` },
})
```

The server reads private env, applies public-citation grounding, and returns only sanitized `ChatResponse` fields to the frontend.

## API Review Checklist

- Inputs are trimmed, required fields are checked, and strings stored as names/titles are length-capped.
- Protected routes verify bearer/admin tokens before database writes or reads.
- Database-required routes use `requireDatabase()` and get a 503 when no database is configured.
- Public routes still work without a database or model provider.
- Error responses use stable error codes and do not leak internals.
- Tokens and invite codes are hashed before persistence.

## Avoid

- Do not instantiate Prisma per request.
- Do not spread raw `req.body` into Prisma writes.
- Do not make lint pass by adding broad disables.
- Do not use destructive git commands or push without an explicit user request.

## Scenario: Public Assistant RAG Orchestrator Contract

### 1. Scope / Trigger

- Trigger: adding or changing the public assistant RAG Orchestrator, retrieval contract, local/mock RAG adapter, external RAG adapter, vector/reranker adapter, or RAG health/sync endpoints.
- The Orchestrator is a server-side boundary. Frontend code must keep calling the existing assistant API shape and must never connect directly to vector stores, graph databases, embedding providers, reranker providers, or model relay URLs.

### 2. Signatures

- Current in-repo mock mount:
  - `GET /rag/health`
  - `POST /rag/v1/retrieve`
  - `POST /rag/v1/sync`
- Main-site adapter:
  - `POST /chat/public` calls `ASSISTANT_RAG_API_BASE_URL` only when configured.
  - `functions/api/chat/public.ts` follows the same contract through `functions/_shared/assistant.ts`.
- Standalone future mount:
  - `GET /health`
  - `POST /v1/retrieve`
  - `POST /v1/sync`
- `npm.cmd run assistant:rag-smoke` starts the local Express app and validates the mock Orchestrator contract without calling live models or cloud resources.

### 3. Contracts

- Retrieve request: `{ query: string, scope?: "public", limit?: number, locale?: string }`.
- Missing or blank `query` -> `400 { error: "missing-query" }`.
- Non-public scope -> `400 { error: "unsupported-scope" }`.
- Retrieve response:
  - `intent`
  - `citations` in the same public citation shape used by `/chat/public`
  - `chunks` with `{ id, documentId, text, section, score, reason }`
  - `meta.retrievalMode`
  - `meta.store`
  - `meta.candidateCount`
  - `meta.reranked`
  - `meta.sufficient`
  - `meta.sufficiency`
  - `meta.fallbackReason`
  - `meta.citationCount`
  - `meta.expandedEntityCount`
  - `meta.modelCalls`
- Health response must stay low-sensitive: no provider endpoint, database URL, token fingerprint, table name, raw prompt, request body, or model relay detail.
- Local/mock sync is readonly and returns current knowledge counts; production sync tokens and external stores are manual-gated.
- Public chat keeps the response shape `{ answer, citations, meta }`. Retrieval diagnostics live under `meta.retrieval` and may include `source`, `retrievalMode`, `store`, `candidateCount`, `citationCount`, `sufficiency`, `fallbackReason`, `modelCalls`, and sanitized `diagnostic`.
- Adapter diagnostics must not include endpoint URLs, API keys, database URLs, raw prompts, request bodies, vector table names, stack traces, or provider payloads. Use `httpStatusClass`, `attemptedEndpoints`, and `timeoutMs` instead of leaking exact URLs or response bodies.

### 4. Validation & Error Matrix

- Valid public query -> `200` with citations, chunks, local retrieval diagnostics, and `modelCalls: 0`.
- Private credential request such as "后台密码" or "模型 key" -> `200` with no citations/chunks and `fallbackReason: "private-credential"`.
- Missing query -> `400 { error: "missing-query" }`.
- Unsupported scope -> `400 { error: "unsupported-scope" }`.
- External Orchestrator unavailable -> assistant must fall back to local Agentic Hybrid retrieval, not fail public chat. `meta.retrieval.source` should be `"local"` and `meta.retrieval.fallbackReason` should identify the sanitized adapter failure class such as `"network_error"`, `"timeout"`, `"http_status"`, or `"invalid_response"`.
- Vector/reranker unavailable in later phases -> Orchestrator must fall back to keyword/entity retrieval and deterministic rerank.

### 5. Good/Base/Bad Cases

- Good: `/rag/v1/retrieve` for Legal RAG cites `project:legal-rag`, returns at least one chunk, marks `retrievalMode: "local-agentic-hybrid"`, and reports `modelCalls: 0`.
- Base: no external RAG env exists; local/mock Orchestrator still passes `assistant:rag-smoke`.
- Good: with a configured mock `ASSISTANT_RAG_API_BASE_URL`, `/chat/public` uses Orchestrator citations/chunks for grounding while still returning only public citation cards to the browser.
- Bad: a route logs raw chat questions, request bodies, API keys, model provider URLs, database URLs, vector table names, or stack traces.
- Bad: a browser bundle reads `ASSISTANT_RAG_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, embedding keys, reranker keys, or direct vector database URLs.

### 6. Tests Required

- Run `npm.cmd run assistant:rag-smoke` after Orchestrator contract changes.
- Run `npm.cmd run assistant:eval` to keep the fixed public-question baseline green.
- Run `npm.cmd run server:smoke` to prove existing `/chat/public`, model fallback, mock Orchestrator success/fallback, and protected internal routes still work.
- Run `npm.cmd run cf-assistant:smoke` when Cloudflare Function behavior or shared public assistant retrieval changes; it should cover mock Orchestrator success/fallback without calling live providers.
- Run `npm.cmd run server:build`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`, and a sensitive scan over changed files.

### 7. Wrong vs Correct

#### Wrong

```typescript
app.post('/v1/retrieve', async (req, res) => {
  console.log(req.body)
  const result = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chunks`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' },
  })
  res.json(await result.json())
})
```

This leaks request bodies into logs, couples the route directly to one storage provider, and risks exposing provider-shaped payloads.

#### Correct

```typescript
router.post('/v1/retrieve', (req, res) => {
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : ''
  if (!query) {
    res.status(400).json({ error: 'missing-query' })
    return
  }
  res.json(retrieveRagContext({ query, scope: 'public' }))
})
```

The route validates public input, delegates retrieval to the Orchestrator boundary, and returns only the stable public contract.
