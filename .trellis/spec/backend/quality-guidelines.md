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
