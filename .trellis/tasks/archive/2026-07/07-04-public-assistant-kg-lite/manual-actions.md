# Public assistant manual actions

This file records public-assistant work that needs user or platform action.
Codex should continue local implementation and deterministic validation while
these items wait.

## Pending

### PA1. Configure production model provider secrets

- Needed from user: add the selected model base URL, API key, model name, and provider label to the deployment platform as secrets or environment variables.
- Suggested variables: `ASSISTANT_MODEL_BASE_URL`, `ASSISTANT_MODEL_API_KEY`, `ASSISTANT_MODEL_NAME`, `ASSISTANT_MODEL_PROVIDER`.
- Why manual: real keys and model relay URLs must not be committed or printed.
- Codex can continue meanwhile: yes, using local fallback and mock-model smoke tests.

### PA2. Approve any real model validation prompt

- Needed from user: provide an approved real task prompt if production model validation is required after deployment.
- Why manual: user explicitly forbids model liveness tests, doctor checks, diagnose checks, pings, or tiny test prompts.
- Codex can continue meanwhile: yes, with deterministic local tests and mock provider tests.

### PA3. Choose external RAG runtime

- Needed from user: choose Supabase, Render Postgres, Neo4j/Aura, Cloudflare Vectorize/AI Search, or another runtime after the local contract is stable.
- Recommendation on file: keep Agentic Hybrid RAG first; introduce Neo4j only if real questions require deep graph traversal.
- Why manual: cloud resources, billing, credentials, backups, and long-term platform preference require owner approval.
- Codex can continue meanwhile: yes, by building local docs/chunks/entities/relations and disabled-by-default adapters.

### PA4. Provide RAG / embedding / reranker secrets

- Needed from user: add external RAG API key, database URL, embedding key, reranker key, or graph DB credentials to the chosen platform.
- Why manual: these are sensitive credentials and private endpoints.
- Codex can continue meanwhile: yes, with mock adapters and local deterministic retrieval.

### PA5. Approve production deployment verification

- Needed from user: confirm when Cloudflare Pages Functions are deployed and whether production `/api/health` and `/api/chat/public` may be checked.
- Why manual: production checks can hit real deployments and, if model env vars are present, real model providers.
- Codex can continue meanwhile: yes, with local Function/Express smoke tests and generated status wording that clearly marks live production as unchecked.

## Done

- None yet.
