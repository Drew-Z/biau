# Design

## Architecture

Cloudflare Pages will serve static frontend assets and same-domain public assistant functions:

```text
Browser widget -> /api/health
Browser widget -> /api/chat/public
Pages Function -> server/data/public-knowledge.json
Pages Function -> ASSISTANT_MODEL_* runtime env -> OpenAI-compatible relay
```

The existing Express API remains available for local development, internal assistant, database-backed invite/member flows, admin routes, and Render deployment.

## Files

- `functions/api/health.ts`: Cloudflare Pages health endpoint.
- `functions/api/chat/public.ts`: Cloudflare Pages public chat endpoint.
- `functions/_shared/assistant.ts`: shared public knowledge search, fallback answer, model request helpers.
- `scripts/check-cloudflare-assistant-functions.mjs`: local Node smoke that imports the function handlers and invokes them with mock Request/env objects.
- `.env.example` and `docs/deployment.md`: deployment contract.

## Contracts

- Function env keys:
  - `ASSISTANT_MODEL_BASE_URL`
  - `ASSISTANT_MODEL_API_KEY`
  - `ASSISTANT_MODEL_NAME`
  - `ASSISTANT_MODEL_PROVIDER`
- API payload remains compatible with `ChatResponse`: `{ answer, citations, meta }`.
- `meta.mode` is `model` or `fallback`.
- `meta.reason` uses existing values: `not_configured`, `provider_error`, `empty_response`, `no_public_context`.
- CORS is not required for same-domain `/api`, but JSON responses stay generic and safe.

## Safety

- Do not log request bodies, keys, provider URLs, raw provider errors, or prompt text.
- Do not call the model when public knowledge returns zero citations.
- Keep model request body minimal for relay compatibility: `model` and `messages` only.
- Accept `/v1`, root, or full `/chat/completions` base URLs using the same endpoint normalization behavior as `server/src/model.ts`.

## Rollback

- Removing `functions/` returns the site to static-only behavior.
- Frontend can still point `VITE_CHAT_API_BASE_URL` at an external Render API.
