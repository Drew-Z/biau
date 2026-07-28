# Implementation plan: Public assistant production rollout

## 1. Preflight

- [x] Confirm the release branch is clean and a strict fast-forward of `origin/main`.
- [x] Inventory Render service branch, commands, current deploy, and auto-deploy state.
- [x] Identify the active Supabase public-assistant database through read-only table/migration counts.
- [x] Confirm the new migration is pending and determine its destructive rollback boundary.
- [x] Check Cloudflare MCP visibility and record the account mismatch manual gate.
- [x] Re-run the full local fixture/build/UI gate on the final release commit.

## 2. Test-data disposition gate

- [x] Inspect metadata only and confirm all current records belong to one testing window.
- [x] Record the user's explicit approval to skip backup and discard all current public-assistant records.
- [x] Reconfirm pre-migration Session, Turn, Feedback, and aggregate counts immediately before release.

Rollback point: before the migration commits, stop the rollout and leave the transactional legacy schema intact.

## 3. Source and edge release

- [x] Fetch remote refs and repeat the fast-forward proof.
- [x] Push the reviewed commit to `origin/main` without force.
- [x] Confirm Cloudflare Pages starts or completes the production deployment for that commit.
- [x] Retain the prior Cloudflare deployment identity for rollback.

## 4. Render and database release

- [x] Retain the current Render live deploy identity.
- [x] Trigger only `biau-public-assistant-api` without clearing cache.
- [x] Monitor build, `prisma migrate deploy`, startup, health, and error logs to a terminal state.
- [x] Verify migration history, row-count parity, Branch/Revision backfill, replay projection, ownership triggers, immutability trigger, and removed legacy columns.
- [x] Run Supabase security and performance advisors.
- [x] Delete every migrated test Session tree and public-assistant aggregate row, then verify all public-assistant data counts are zero.

Rollback point: after migration commit, fix forward. The old application revision is schema-incompatible and the approved test records are intentionally not recoverable.

## 5. Production acceptance

- [x] Verify `/health` readiness and identity redaction.
- [x] Verify the same-origin Branch proxy with an invalid non-model request.
- [x] Run desktop/mobile production UI smoke for open/history/new/fullscreen/Revision/Branch containment.
- [x] Confirm no model, search, embedding, reranker, or vector provider request was made.
- [x] Record deploy identities, verification results, and any manual follow-up without secrets.

## Required local commands

```powershell
npm.cmd run prisma:validate
npm.cmd run lint
npm.cmd run build
npm.cmd run server:build
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-persistence-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:service-modes-smoke
npm.cmd run cf-assistant:smoke
npm.cmd run check:ui
npm.cmd run performance:check
git diff --check
```

The loopback migration fixture remains required when `PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL` is available. Production database verification is read-only after Render applies the migration; do not run the migration SQL through Supabase MCP.

## Start review gate

Do not run `task.py start`, push `main`, trigger Render, delete test data, or otherwise mutate production until the user reviews this plan and explicitly approves activation.
