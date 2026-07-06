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

### M3. Provide or approve RAG / model / embedding secrets

- Related task: `07-04-public-assistant-kg-lite`
- Needed from user: add server-only secrets to Render / Cloudflare / provider dashboards, not to the repo. Current RAG path needs `ASSISTANT_RAG_API_BASE_URL`, scoped `ASSISTANT_RAG_API_KEY`, `RAG_PUBLIC_API_KEY`, `RAG_INTERNAL_API_KEY`, `RAG_SYNC_TOKEN`, Qdrant URL/API key, embedding base/key/model/dimension, and optional reranker settings.
- Why manual: Codex must not write or expose keys, database URLs, or private endpoints.
- Codex can continue meanwhile: yes, using mocks and disabled-by-default adapters.
- Detail queue: see `07-04-public-assistant-kg-lite/manual-actions.md`.

### M4. Confirm ERP live production registration behavior

- Related task: `07-03-erp-production-registration-live-verify`
- Current evidence: live ERP entry and API health are online, but `/api/auth/bootstrap` returns `registrationEnabled=false`; live health reports git commit `6b3dabc593c7`, which is an ancestor of the current local/remote `8f38437` that includes the registration-open and BIAU Port brand commits.
- Needed from user: redeploy ERP from the latest branch, then confirm whether registration appears; if it still does not, inspect `ERP_REGISTRATION_ENABLED` in the deployment platform.
- Why manual: production deployment controls and account policy are external to this repo.
- Codex can continue meanwhile: yes, with main-site status/data updates and repeatable synthetic checks.

### M5. Confirm Legal RAG public demo access policy

- Related task: `07-03-legal-rag-demo-access-qa-closure`
- Needed from user: create or approve a low-permission public demo account, configure the API-side login password, configure `VITE_PUBLIC_DEMO_EMAIL` / `VITE_PUBLIC_DEMO_PASSWORD` in the Legal RAG Web deployment if the credentials may be shown publicly, then approve a credentialed synthetic check.
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

### M9. Confirm Xunqiu public release and backend production details

- Related task: `07-04-biau-port-continuous-improvement`
- Needed from user: approve which Xunqiu APK, backend URL, R2/Render/database settings, and production health endpoints may be used for public status or download claims.
- Why manual: APK release, backend production URLs, storage, database, and deployment settings can expose private infrastructure or imply production support.
- Codex can continue meanwhile: yes, by improving static showcase consistency, local build checks, docs, and non-secret status wording.

### M10. Approve Game/Playlab public release changes

- Related task: `07-04-biau-port-continuous-improvement`
- Needed from user: approve any new playable build, downloadable binary, or public release wording before it is presented as official.
- Why manual: public playable releases and binaries affect user expectations and may need manual QA beyond static checks.
- Codex can continue meanwhile: yes, by checking static routes, screenshots, title/favicon consistency, mobile hints, and documentation.

### M11. Confirm related-repository push policy

- Related task: `07-04-biau-port-continuous-improvement`
- Needed from user: confirm whether ERP, Legal RAG, Pet, Xunqiu, xunqiu-backend-modern, and Game/Playlab should be pushed automatically after successful commits, or left committed locally for review.
- Current queued change: ERP has local commit `654cc79` on branch
  `codex/ozon-plugin-parity`, one commit ahead of
  `origin/codex/ozon-plugin-parity`; it preserves `?from=biau-port` across
  login/register switching and has passed `npm.cmd run build --workspace @erp/web`.
- Why manual: `blog-semi` has an explicit default push rule, but related repositories may have different branch/deployment safety expectations.
- Codex can continue meanwhile: yes, by keeping commits per repository and reporting exactly which repo/branch changed.

### M12. Approve public assistant RAG Orchestrator production rollout

- Related task: `07-04-public-assistant-rag-orchestrator-phase-2`
- Needed from user: confirm the three Render services are using the agreed boundaries (`public`, `internal`, `rag`), fill the private Render variables, approve public/internal knowledge sync, and approve any live health/retrieval/model validation tasks.
- Recommendation: keep `biau-rag-orchestrator` as the scoped RAG service, use Qdrant collections as the first production vector path, keep Supabase/Postgres for internal assistant application data, and defer Neo4j until real deep graph traversal is proven necessary.
- Why manual: this requires cloud resources, private credentials, production sync choices, and live validation policy.
- Codex can continue meanwhile: yes, by building local/mock Orchestrator contract, eval harness, provider-neutral adapters, and documentation.

## Done

### M2. Record external RAG runtime decision

- Related task: `07-04-public-assistant-kg-lite`
- Resolution: final architecture is three service boundaries plus a scoped RAG Orchestrator on Render, with Qdrant collections as the production vector path.
- Notes: Supabase/Postgres remains appropriate for internal assistant application data, and Neo4j is deferred until real deep graph traversal is proven necessary.
