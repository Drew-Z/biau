# Manual actions queue

This file records work that needs the user's explicit manual participation.
Codex should keep working on unrelated unblocked tasks and come back to this
queue when the user is available.

## Pending

### M1. Approve live model validation policy

- Related task: `07-04-public-assistant-kg-lite`
- Needed from user: approve any future live model validation and provide a real task prompt to use.
- Why manual: user explicitly forbids model liveness tests; validation must not use ping/test prompts.
- Codex can continue meanwhile: yes, with deterministic mocks and local fallback checks.

### M2. Choose external RAG runtime after local contract is stable

- Related task: `07-04-public-assistant-kg-lite`
- Needed from user: choose whether to provision Supabase, Render Postgres, Neo4j/Aura, Cloudflare Vectorize/AI Search, or another runtime.
- Recommendation on file: start with Agentic Hybrid RAG and delay Neo4j until deep graph traversal is proven necessary.
- Why manual: cloud resources, costs, credentials, and long-term platform preference require user approval.
- Codex can continue meanwhile: yes, by building provider-agnostic exports, mocks, and local retrieval.

### M3. Provide or approve RAG / model / embedding secrets

- Related task: `07-04-public-assistant-kg-lite`
- Needed from user: add secrets to the chosen deployment platform, not to the repo.
- Why manual: Codex must not write or expose keys, database URLs, or private endpoints.
- Codex can continue meanwhile: yes, using mocks and disabled-by-default adapters.

### M4. Confirm ERP live production registration behavior

- Related task: `07-03-erp-production-registration-live-verify`
- Needed from user: verify live ERP deployment shows registration and that new users have safe default permissions, or provide safe demo credentials/check instructions.
- Why manual: production site access and account policy are external to this repo.
- Codex can continue meanwhile: yes, with local/main-site data and documentation updates.

### M5. Confirm Legal RAG public demo access policy

- Related task: `07-03-legal-rag-demo-access-qa-closure`
- Needed from user: decide what demo credentials, if any, may be shown publicly and how they can be revoked.
- Why manual: public credentials and legal demo access policy need owner approval.
- Codex can continue meanwhile: yes, with public wording, gated UI, and mock/safe checks.

### M6. Approve Pet APK public release artifact

- Related task: `07-03-pet-apk-public-release-closure`
- Needed from user: provide or approve release APK/AAB, signing status, version notes, checksum, and public download decision.
- Why manual: publishing binaries requires explicit owner approval and safety checks.
- Codex can continue meanwhile: yes, by keeping the download gated and improving showcase copy/status.

### M7. Approve scheduled monitoring / observability platform choices

- Related task: `07-03-cross-project-scheduled-reliability-observability`
- Needed from user: choose which monitoring stack to use for production checks, for example Cloudflare analytics, Umami/Plausible, Prometheus/Grafana, ARMS, or a staged combination.
- Why manual: platform setup may require accounts, secrets, billing, and privacy choices.
- Codex can continue meanwhile: yes, with local synthetic checks and status JSON generation.

### M8. Approve AI Daily automation inputs and publishing policy

- Related task: `07-03-ai-daily-content-pipeline-phase-1`
- Needed from user: decide source scope, model/provider usage policy, review rules, and whether AI Daily publishes automatically or stays draft-only.
- Why manual: this affects public content quality, source trust, and model cost.
- Codex can continue meanwhile: yes, by designing draft-only pipeline pieces and review gates.

## Done

- None yet.
