# Public assistant production rollout

## Goal

Promote the completed public-assistant productization commits to production with a recoverable PostgreSQL migration, an explicitly ordered Render and Cloudflare rollout, and deterministic production verification that does not call a model, search provider, embedding provider, reranker, or vector database.

## Background

- `codex/public-assistant-productization` is clean, is not behind `origin/main`, and is 19 commits ahead.
- The Render `biau-public-assistant-api` service deploys `main`, has automatic deploy disabled, builds the shared server, and starts with `npm run prisma:migrate && npm run server:start`.
- The live Render service is older than both `origin/main` and the rollout branch.
- Supabase contains two projects with legacy public-assistant tables. The project named `biau-internal-assistant-db` contains the active public data: 9 sessions, 10 turns, and 1 feedback row at preflight time. The Studio project contains no public-assistant sessions.
- Both databases currently report `20260726010000_public_assistant_product` as the latest successful Prisma migration. The immutable-revision migration is not applied.
- The new migration is transactional but intentionally removes legacy answer columns after backfilling immutable Revisions and Branches. A previous Render revision alone is therefore not a complete rollback.
- Read-only metadata shows all current public-assistant data was created during one testing window on 2026-07-26: 9 Sessions, 10 Turns, 1 negative Feedback, no positive Feedback, and 10 aggregate answers. The user explicitly approved treating all of it as disposable test data and skipping backup.
- The connected Cloudflare account does not expose the BIAU Pages project. Cloudflare deployment inspection and rollback require the correct account or a user-performed dashboard check.
- Supabase documents automatic daily backups for paid plans and recommends regular CLI logical dumps for free projects.

## Requirements

### R1. Test-data disposition and rollback readiness

- Treat the current 9 Sessions, 10 Turns, 1 Feedback row, and their aggregate rows as disposable test data; do not read or export their content.
- Skip the logical backup by explicit user decision. Record the pre-migration metadata counts only.
- Migrate the legacy rows first so production migration parity is still exercised, verify the backfill, then delete all public-assistant Session trees and public-assistant aggregate rows to establish a clean production baseline.
- Retain the current live Render deploy identity and identify the previous Cloudflare production deployment for reference, while documenting that the old API cannot run against the committed new schema.
- After migration success, use forward repair rather than a code-only rollback. No claim of recoverable legacy test data is permitted.

### R2. Ordered release

- Fast-forward `origin/main` from the reviewed rollout branch; do not force-push or rewrite history.
- Allow or manually trigger the BIAU Cloudflare Pages production build from that exact commit, then verify its deployment identity.
- Manually trigger only `biau-public-assistant-api` on Render after the commit is present on `main`. Do not deploy Studio or RAG merely because they share the repository.
- Render must run `prisma migrate deploy` before starting the public API. Migration failure must leave the old schema transactionally intact and the new service unavailable rather than partially upgraded.
- Do not change production environment values as part of this task unless a verified contract mismatch requires a separate reviewed action.

### R3. Database verification

- Verify the new Prisma migration is recorded exactly once.
- Verify the Branch and AnswerRevision tables, ownership triggers, and Revision update-rejection trigger exist.
- Verify legacy Session/Turn/Feedback row counts and answer data were backfilled without loss before treating the deploy as healthy.
- Verify completed Request replay projections are version 2 and bound to Revision identity where such rows exist.
- Run Supabase security and performance advisors after DDL changes and record findings without applying unrelated remediations in this rollout.

### R4. Service and edge verification

- Verify the Render deploy is live on the release commit and `/health` reports readiness without exact model/provider identity.
- Verify the same-origin Cloudflare public Branch proxy reaches the public API and preserves the expected bounded 4xx contract for a deliberately invalid, non-model request.
- Verify the production frontend loads, the public assistant can open, and history/new/fullscreen/branch/revision surfaces do not overflow at desktop and mobile widths.
- Do not send a chat prompt, run provider diagnostics, or invoke live model/search/embedding/reranker/vector services. A real conversation remains a separate explicit user action.

### R5. Failure handling

- Before migration success: retain the existing live service and stop on build/migration failure.
- After migration success: do not redeploy the old API against the new schema. Fix forward on the reviewed branch; the explicitly disposable test data is not restored.
- Record every manual gate and the exact verified state so interrupted work can resume without guessing.

## Acceptance Criteria

- [ ] Pre-migration metadata counts are recorded without reading content, and the user-approved no-backup decision is preserved.
- [ ] `origin/main` is fast-forwarded to the reviewed release commit with no unrelated remote divergence.
- [ ] Cloudflare and Render production deployments reference the same release commit.
- [ ] The immutable answer-revision migration is applied exactly once and all database parity/trigger checks pass.
- [ ] The migrated test Session trees and aggregate rows are deleted after parity verification, leaving a clean public-assistant production baseline.
- [ ] Render health, Cloudflare Branch proxy, desktop UI, and mobile UI production smoke checks pass without a model/provider call.
- [ ] Supabase security/performance advisor results are recorded and newly introduced critical findings are resolved or explicitly block release.
- [ ] Rollback evidence and remaining manual actions are recorded; no secret or production data is committed.

## Out Of Scope

- Changing model, search, embedding, reranker, or Qdrant configuration.
- Deploying Content Studio, RAG Orchestrator, or AI Daily changes.
- Running a live chat prompt as a health check.
- Refactoring the migration or public-assistant feature unless preflight exposes a release-blocking defect.

## Open Questions

- The connected Cloudflare account does not contain the BIAU Pages project; the correct account must be connected or the user must perform the Pages deployment checks manually.
