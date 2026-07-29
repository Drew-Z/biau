# Backend Quality Guidelines

## Required Verification

Choose the smallest relevant set during iteration, then run the full task gate before commit:

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-model-check
npm.cmd run assistant:public-metrics-check
npm.cmd run assistant:public-quality-check
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-persistence-check
npm.cmd run assistant:public-rate-limit-check
npm.cmd run assistant:public-web-check
npm.cmd run assistant:public-sync-check
npm.cmd run assistant:hybrid-contract
npm.cmd run assistant:service-modes-smoke
npm.cmd run assistant:rag-smoke
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
- Reconstruct persisted public conversation history from the owned selected Branch and immutable Revision graph; never trust caller-supplied history as database authority or return stored JSON directly.
- Never return hashes, credentials, endpoints, raw prompts, private documents, request headers, or database details.
- Optional providers must degrade without breaking public health or deterministic tests.

## Service Modes

Runtime modes:

- `ASSISTANT_SERVICE_MODE=public`
- `ASSISTANT_SERVICE_MODE=studio`
- `ASSISTANT_SERVICE_MODE=rag`
- empty/unknown local default: `all`

Mount contracts:

- Public API: `/health`, `/chat/public`; no Studio, admin, auth, or RAG routes.
- Studio API mode: `/health`, `/studio/api/*`; no chat, auth/admin, or RAG routes.
- RAG API: `/health`, `/v1/retrieve`, `/v1/sync/public`; no chat, Studio, auth, admin, internal scope, or legacy `/v1/sync` route.
- Local `all`: public routes, Studio routes under `/studio/api`, and local public-only RAG under `/rag`.

`assistant:service-modes-smoke` must prove both positive mounts and negative 404 boundaries.

## Deployment Contract

Render final shape is one repository deployed as three Web Services:

- `biau-public-assistant-api` with `ASSISTANT_SERVICE_MODE=public`.
- `biau-content-studio-api` with `ASSISTANT_SERVICE_MODE=studio`.
- `biau-rag-orchestrator` with `ASSISTANT_SERVICE_MODE=rag`.

The public service uses `DATABASE_URL` only for bounded anonymous assistant persistence. Studio and AI Daily use the independent `STUDIO_DATABASE_URL`.

AI Daily production deployments must mount the human-approved model bundle as the Render Secret File `/etc/secrets/ai-daily-model-approval.v1.json`, set `AI_DAILY_MODEL_APPROVAL_FILE` to that exact path, and set `AI_DAILY_MODEL_APPROVAL_BUNDLE_HASH` to the bundle's canonical `bundleHash`. The bundle may come from the acknowledged manual static-selection path or the optional measured-evaluation path; the runner must reject a missing, malformed, stale, tampered, mixed-basis, or runtime-drifted bundle before claiming `PRODUCTION` work.

`RAG_SYNC_TOKEN` authorizes versioned public knowledge sync. The browser and public assistant service must never receive it.

`docs:deployment-check` owns consistency between `render.yaml`, `.env.example`, deployment docs, manual gates, and this spec.

## Public Assistant

- `runPublicAssistantAgent()` owns the authoritative server answer path and uses real conditional LangGraph edges.
- Public answers use retained public-safe site/web evidence and claim-level citations only.
- Missing model/RAG/search returns an explicit fallback, unavailable, partial, or uncertain result rather than fabricated facts.
- The HTTP projection exposes product states and bounded counters, not model/provider/channel/retrieval diagnostics.
- Direct and evidence-bound request profiles, optional JSON Schema output, Responses JSON/SSE/chat-relay decoding, absolute-deadline retries, abortable backoff, safe recovery projection, and old snapshot compatibility require fixture coverage.
- The table-driven quality matrix covers every route, all six public failure classes, recovery, cancellation, injection, secret seeking, citation integrity, follow-up/edit-resend, Branch/Revision continuity, and older snapshot hydration. Fixture checks must not resolve or call a configured provider endpoint.
- Public `/health` exposes only service/readiness capabilities and never includes exact model or provider identity. Detailed diagnostics remain behind the operations-token boundary.
- Client session IDs cannot bypass the IP-scoped chat/feedback limiter; in-memory buckets remain bounded.
- Hybrid Qdrant 400/404/405 fallback stays on `QDRANT_PUBLIC_ALIAS`, with a poison-base-collection fixture proving the target.
- Public routes remain usable without a database.
- Committed answers live only in immutable `PublicAssistantAnswerRevision` rows. Turn is the logical question, Branch is the saved-path pointer, and Revision-scoped Feedback must never fall back to flat Turn answer ownership.
- Completed request replay decodes the Request's frozen Revision projection and remains independent from later active-Branch changes. Selected Session history is separately reconstructed from the active Branch ancestry.
- `assistant:public-persistence-check` and the loopback-only migration fixture must prove intent hashing, lease fencing, concurrent forks, selection-version fencing, graph ownership, Revision UPDATE rejection, replay independence, and whole-session lifecycle behavior.
- Public synthetic may exercise route/health/fallback behavior but must not send model prompts unless the user approves a real task.

## Content Studio

- Studio writes use `getStudioPrisma()` / `requireStudioDatabase()`.
- `STUDIO_ADMIN_TOKEN` protects Studio mutations; it is server-only.
- Publish Export records an intent; local/CI tools write public Git-tracked files after review.
- Exported file paths are repo-relative and reject absolute paths or traversal.

## RAG Orchestrator

- Only public scope is supported. Internal scope and the legacy generic sync route return stable rejection/404 boundaries.
- Public publication sync requires `RAG_SYNC_TOKEN` and uses `/v1/sync/public`.
- Qdrant/embedding/reranker credentials are server-only.
- Health and diagnostics expose readiness and counts, not endpoints or secrets.
- Local/mocked stores remain deterministic for tests.

## Logging And Metrics

- Logs use low-cardinality event names and safe categories.
- Do not log authorization headers, prompts, fetched page bodies, model responses, or database URLs.
- `/metrics` is default-off and must not use user/project/query text as labels.
- Public-assistant metrics use fixed route/outcome/failure enums, extended HTTP latency buckets, bounded attempt timing, and a sensitive-field scan. They never label provider/model/endpoint, exact external status, IDs, citations, questions, or raw errors.

## Sensitive Scan

Before commit, scan changed files for:

- API keys, bearer/service/admin tokens, Access assertions/audience values.
- Database/vector/model URLs and connection strings.
- Private owner content, production messages, raw traces, and stack dumps.
- Local absolute paths, signing material, passwords, and private dashboard links.
