# Public RAG pgvector recovery implementation

## Checklist

- [x] Harden `server/sql/rag-store-pgvector.sql` for Supabase `extensions.vector(4096)`, exact search, and RLS.
- [x] Add a deterministic schema contract check covering dimensions, indexes, and RLS.
- [x] Update `render.yaml`, `.env.example`, `README.md`, deployment docs, backend specs, and deployment-contract checks for Supabase pgvector production.
- [x] Run local RAG, deployment, TypeScript, lint, build, and whitespace verification without provider calls.
- [x] Commit and push the implementation to `main` (`6ccdf556`, `7cb6f77e`).
- [x] Apply the additive schema migration to the active public-assistant Supabase project.
- [x] Inspect vector type, RLS state, policies, and database advisors.
- [x] Update the Render RAG service provider/database variables without printing secrets and deploy the committed revision (`dep-d9sol82jnfac739so21g`).
- [x] Trigger the existing public RAG sync workflow and verify 29 documents / 58 chunks plus vector readiness (workflow `31370568374`).
- [x] Run one approved real public-assistant business acceptance request and record remaining manual/security follow-ups.

## Acceptance Evidence

- Render `/health` returned `store=supabase-pgvector`, `vectorReady=true`, `keywordReady=true`, `rerankerReady=true`, `documentCount=29`, `chunkCount=58`, and `buildCommit=7cb6f77e2b14ddbb7eb72b431b4d2a48fadc70ae`.
- GitHub workflow `Drew-Z/biau#31370568374` completed successfully after the public sync scope fix.
- A real site-scoped question returned three verified public citations from the deployed RAG route. The model provider was unavailable for that request, so the API correctly returned a cited degraded answer; this is recorded as a separate provider configuration/availability follow-up, not a RAG-store failure.
- Existing `PublicAssistantRequest`, `PublicAssistantAnswerRevision`, and `PublicAssistantBranch` remain a separate manual security follow-up because they need a compatibility-safe RLS policy design.

## Validation Commands

```bash
npm.cmd run assistant:rag-pgvector-schema-check
npm.cmd run assistant:public-sync-check
npm.cmd run assistant:hybrid-contract
npm.cmd run assistant:service-modes-smoke
npm.cmd run assistant:rag-smoke
npm.cmd run docs:deployment-check
npm.cmd run server:build
npm.cmd run lint
npm.cmd run build
git diff --check
```

## Risk And Rollback Points

- Never print or commit `RAG_DATABASE_URL`, `RAG_SYNC_TOKEN`, `RAG_PUBLIC_API_KEY`, or provider credentials.
- Apply only additive DDL. Do not change existing assistant persistence tables in the same migration.
- Do not deploy before local contracts pass.
- Do not synchronize until the Render health commit/checksum matches the pushed revision.
- If deployment or sync fails, restore the previous Render revision/provider values; leave additive tables in place.
