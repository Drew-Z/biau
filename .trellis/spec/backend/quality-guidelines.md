# Backend Quality Guidelines

## Required Verification

Choose the smallest relevant set during iteration, then run the full task gate before commit:

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:agent-contract
npm.cmd run assistant:agent-eval
npm.cmd run assistant:service-modes-smoke
npm.cmd run assistant:rag-smoke
npm.cmd run operator:facade-smoke
npm.cmd run operator:knowledge-check
npm.cmd run docs:deployment-check
npm.cmd run lint
npm.cmd run build
git diff --check
```

No deterministic check may send a real model liveness prompt.

## API Review Checklist

- Validate request bodies at the route boundary.
- Scope every persisted query to the authenticated owner or explicit public scope.
- Return stable JSON error codes; do not return stack traces or provider bodies.
- Bound arrays, strings, result counts, timeouts, and payload sizes.
- Normalize unknown JSON through shared serializers/decoders.
- Never return hashes, credentials, endpoints, raw prompts, private documents, request headers, or database details.
- Optional providers must degrade without breaking public health or deterministic tests.

## Operator Authentication

- Cloudflare Access protects `/operator`, `/operator/*`, and `/api/operator/*`.
- The facade verifies RS256 signature, issuer, audience, validity window, and owner email.
- The facade replaces browser authorization/identity headers with server-held `OPERATOR_SERVICE_TOKEN` and verified identity.
- Render validates both service credential and sanitized owner identity.
- The browser never stores member/admin/service tokens for Operator.
- Local Vite proxy may inject local-only credentials from `.env.local`; those values must not enter the bundle.

Required check: `npm.cmd run operator:facade-smoke`.

## Service Modes

Runtime modes:

- `ASSISTANT_SERVICE_MODE=public`
- `ASSISTANT_SERVICE_MODE=operator`
- `ASSISTANT_SERVICE_MODE=studio`
- `ASSISTANT_SERVICE_MODE=rag`
- empty/unknown local default: `all`

Mount contracts:

- Public API: `/health`, `/chat/public`; no Operator, Studio, admin, auth, or RAG routes.
- Operator API: `/health`, `/operator/*`; no public chat, legacy private chat/auth/admin, Studio API, or RAG HTTP routes.
- Studio API mode: `/health`, `/studio/api/*`; no chat, Operator, auth/admin, or RAG routes.
- RAG API: `/health`, `/v1/retrieve`, `/v1/sync`; no chat, Operator, Studio, auth, or admin routes.
- Local `all`: public routes, Operator routes, Studio routes under `/studio/api`, and local RAG under `/rag`.

`assistant:service-modes-smoke` must prove both positive mounts and negative 404 boundaries.

## Deployment Contract

Render final shape is one repository deployed as four Web Services:

- `biau-public-assistant-api` with `ASSISTANT_SERVICE_MODE=public`.
- `biau-operator-api` with `ASSISTANT_SERVICE_MODE=operator`.
- `biau-content-studio-api` with `ASSISTANT_SERVICE_MODE=studio`.
- `biau-rag-orchestrator` with `ASSISTANT_SERVICE_MODE=rag`.

Production split-database deployments must set `STUDIO_DATABASE_URL` on both `biau-content-studio-api` and `biau-operator-api` so `studio.draft` and Studio review use one content database. Operator `DATABASE_URL` remains a separate owner-workspace database.

AI Daily production deployments must mount the human-approved model bundle as the Render Secret File `/etc/secrets/ai-daily-model-approval.v1.json`, set `AI_DAILY_MODEL_APPROVAL_FILE` to that exact path, and set `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH` to the bundle's canonical `bundleHash`. The bundle may come from the acknowledged manual static-selection path or the optional measured-evaluation path; the runner must reject a missing, malformed, stale, tampered, mixed-basis, or runtime-drifted bundle before claiming `PRODUCTION` work.

`biau-operator-api` also needs `RAG_SYNC_TOKEN` when reviewed/active station knowledge is synchronized. The browser must never receive it.

`docs:deployment-check` owns consistency between `render.yaml`, `.env.example`, deployment docs, manual gates, and this spec.

## Public Assistant

- Public answers use public-safe knowledge/citations only.
- Missing model/RAG returns an explicit fallback, not fabricated facts.
- Provider diagnostics expose only safe error categories such as timeout, HTTP status class, unreachable, empty response, or self-check failure.
- Public routes remain usable without a database.
- Public synthetic may exercise route/health/fallback behavior but must not send model prompts unless the user approves a real task.

## BIAU Operator

- `runOperatorAgent()` is the main answer path.
- Only `read` and `draft-write` tools are allowed.
- Owner sessions, messages, memory, usage, and knowledge are scoped by `ownerId`.
- Answer metadata and tool artifacts are sanitized and bounded.
- `/operator/settings` exposes safe channel/model/configured status, never keys or base URLs.
- Old private routes remain absent; negative 404 checks are intentional.

## Content Studio

- Studio writes use `getStudioPrisma()` / `requireStudioDatabase()`.
- `STUDIO_ADMIN_TOKEN` protects Studio mutations; it is server-only.
- Agent-created drafts are `hidden + review-needed` and cannot auto-publish.
- Publish Export records an intent; local/CI tools write public Git-tracked files after review.
- Exported file paths are repo-relative and reject absolute paths or traversal.

## RAG Orchestrator

- Public and private scopes use separate keys and collections.
- Sync requires `RAG_SYNC_TOKEN`.
- Qdrant/embedding/reranker credentials are server-only.
- Health and diagnostics expose readiness and counts, not endpoints or secrets.
- Local/mocked stores remain deterministic for tests.

## Logging And Metrics

- Logs use low-cardinality event names and safe categories.
- Do not log authorization headers, Access JWTs, owner email unless explicitly redacted, prompts, private docs, model responses, or database URLs.
- `/metrics` is default-off and must not use user/project/query text as labels.

## Sensitive Scan

Before commit, scan changed files for:

- API keys, bearer/service/admin tokens, Access assertions/audience values.
- Database/vector/model URLs and connection strings.
- Private owner content, production messages, raw traces, and stack dumps.
- Local absolute paths, signing material, passwords, and private dashboard links.
