# Design: Public assistant production rollout

## Release boundary

This is a forward database migration plus two independently deployed runtime surfaces:

```text
reviewed branch
  -> origin/main
  -> Cloudflare Pages (frontend + /api proxy)
  -> Render public API
       -> prisma migrate deploy
       -> Supabase public-assistant database
```

The Content Studio and RAG Orchestrator remain untouched. The public API continues to call the existing RAG service through its current environment contract.

## Preflight evidence

The release branch is a strict fast-forward of `origin/main`. Render is configured for manual deploy from `main`; its current live commit predates the release branch. The active public data is identified by table counts in the Supabase project named `biau-internal-assistant-db`, while the similarly shaped Studio database contains zero public sessions.

The active public database is identified by the existing production-shaped row counts and migration state. No connection string is copied out of Render or Supabase.

## Test-data disposition

Read-only metadata places all current records in one 2026-07-26 testing window. The user explicitly accepts losing the 9 Sessions, 10 Turns, 1 negative Feedback row, and four aggregate rows.

The rollout deliberately exercises migration backfill against those rows before deleting them. This gives stronger production migration evidence than truncating the legacy schema first:

```text
legacy test rows
  -> transactional migration
  -> verify Revision/Branch parity and triggers
  -> delete all Session trees
  -> delete public-assistant aggregate rows
  -> verify zero clean-baseline counts
```

The cleanup is a separate explicit SQL action after migration verification. It never reads or exports question/answer content.

## Release sequence

1. Re-run local deterministic gates on the release commit.
2. Record pre-migration metadata counts and the approved no-backup decision.
3. Fetch remote refs and prove the release is still a fast-forward of `origin/main`.
4. Push `HEAD:main` without force.
5. Confirm the Cloudflare production deployment for the pushed commit.
6. Trigger the Render public API deploy without clearing cache unless build evidence requires it.
7. Monitor build, migration, startup, health, and errors until the deploy is `live` or terminally failed.
8. Run read-only database parity and trigger checks plus Supabase advisors.
9. Delete the migrated test Session trees and aggregate rows, then verify a zero clean baseline.
10. Run non-model edge and responsive UI smoke checks.

Cloudflare should be available before the API deploy because the new browser is compatible with the old server. After the API migration, both sides expose the full version-2 contract.

## Verification contract

Database verification compares preflight counts with post-migration counts and checks:

- one Revision for every migrated legacy Turn, plus no unexplained loss;
- at least one Branch per retained Session with the active Branch populated;
- Feedback points to Revision rather than Turn;
- successful migration row `20260728020000_public_assistant_answer_revisions`;
- ownership and immutability triggers on the expected tables;
- legacy Turn answer columns are absent;
- completed cached responses have `contractVersion = 2` and conversation identity.

Service verification uses `/health`, deployment metadata, logs, and an invalid Branch request. It must not send a public chat request or touch external AI providers.

## Rollback

### Before migration commits

Stop the rollout. The migration transaction rolls back automatically; the previous Render deploy remains the recovery target.

### After migration commits

The old runtime is schema-incompatible and the legacy test data is explicitly disposable. Stop deployment churn and fix forward from the reviewed branch. Do not redeploy the old API or claim that discarded test records can be restored.

The test-data cleanup is already explicitly approved by the user, but it runs only after migration parity succeeds.

## Manual gates

- Connect the Cloudflare account that owns BIAU Pages or perform the deployment identity/rollback checks in Dashboard.
- Approve task activation after reviewing this plan.

## Security

- Never print, persist, or commit database URLs, keys, passwords, or conversation contents.
- Use Supabase MCP SQL only for read-only pre/post checks; schema application remains owned by Prisma on Render so Prisma migration history stays authoritative.
- Do not apply the Prisma SQL through Supabase `apply_migration`, which would create incompatible migration bookkeeping.
