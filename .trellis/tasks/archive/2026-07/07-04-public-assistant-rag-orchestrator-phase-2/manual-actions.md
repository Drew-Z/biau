# Public Assistant RAG Orchestrator Phase 2 Manual Actions

This file records user/platform work that must not be automated by Codex.

## Pending

### PA2-1. Choose production Orchestrator hosting

- Needed from user: decide whether the first deployed RAG Orchestrator should run on Render, the existing assistant API host, Cloudflare Workers, or another backend platform.
- Recommendation: use Render or the existing Node assistant API host first, because the Orchestrator needs server-side secrets, database drivers, sync jobs, and longer-running retrieval work.
- Why manual: hosting choice affects billing, deployment ownership, environment variables, logs, and rollback.
- Codex can continue meanwhile: yes, with in-repo local/mock Orchestrator contract and eval harness.

### PA2-2. Choose first external vector store

- Needed from user: approve Supabase Postgres + pgvector, Render Postgres + pgvector, Cloudflare Vectorize / AI Search, or another store.
- Recommendation: start with Supabase Postgres + pgvector unless platform consolidation on Render is more important.
- Why manual: cloud resource creation, cost, data retention, backups, and credentials require owner approval.
- Codex can continue meanwhile: yes, with provider-neutral interfaces and local/mock adapters.

### PA2-3. Provide private retrieval credentials

- Needed from user: add store, embedding, reranker, sync token, and optional Orchestrator API secrets to deployment platforms.
- Suggested variable groups: `ASSISTANT_RAG_*`, `RAG_*`, `SUPABASE_*`, `EMBEDDING_*`, `RERANKER_*`.
- Why manual: keys, database URLs, service role tokens, and model relay URLs must not be committed or printed.
- Codex can continue meanwhile: yes, using local/mock adapters.

### PA2-4. Approve live model / embedding / reranker validation

- Needed from user: provide a real task question if live validation is required after production deployment.
- Why manual: the user explicitly forbids model liveness checks, doctor checks, diagnose checks, pings, and tiny test prompts.
- Codex can continue meanwhile: yes, with deterministic eval and mock provider tests.

### PA2-5. Approve production Orchestrator health checks

- Needed from user: confirm when a production Orchestrator is deployed and whether `/health` and retrieval endpoints may be checked.
- Why manual: production checks can hit paid infrastructure and may expose operational state if misconfigured.
- Codex can continue meanwhile: yes, by keeping status integration planned or mock-only.

## Done

- None yet.
