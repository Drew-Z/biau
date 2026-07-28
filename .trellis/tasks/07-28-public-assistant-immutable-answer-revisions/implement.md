# Implementation Plan: Public assistant immutable answer revisions

## 1. Schema and migration

- [x] Add Branch, AnswerRevision, generation-intent fields, revision feedback, relations, indexes, and bounds to `prisma/schema.prisma`.
- [x] Add one forward migration that backfills legacy Turns, Requests, Feedback, parent links, branches, and active-branch pointers before dropping legacy answer columns.
- [x] Add migration-time version-2 replay-cache enrichment, graph-ownership triggers, and a Revision update-rejection trigger without optional PostgreSQL extensions.
- [x] Update public-database hardening/retirement operational SQL table allowlists.
- [x] Run Prisma validate/generate before backend implementation.

Rollback point: schema and migration commit can be reverted before production migration. After migration, restore the pre-migration backup and previous Render revision rather than attempting a destructive down migration.

## 2. Shared server contracts

- [x] Add discriminated generation intent and revision/branch/history response types.
- [x] Normalize and validate all identifiers at the API boundary.
- [x] Add low-sensitive stable errors and bounded branch/revision constants.
- [x] Include normalized intent identity in the canonical request hash.
- [x] Add additive HTTP contract-version normalization for both deployment orderings without reintroducing flat Turn writes.

## 3. Persistence and execution

- [x] Replace flat Turn persistence with fenced Turn/Revision/Branch completion transactions.
- [x] Derive persisted Agent history from the claimed branch ancestry.
- [x] Keep completed replay bound to the Request revision projection.
- [x] Add revision-bound feedback, active-branch session summaries/history, branch select/continue operations, deletion, and retention.
- [x] Fence generation auto-activation with the claimed branch-selection version and preserve concurrent first requests as distinct root branches.
- [x] Preserve database-free chat fallback without pretending branch/history persistence succeeded.

Rollback point: retain the previous implementation commit until the new persistence fixture proves first answer, replay, regeneration, branching, concurrent completion, feedback, deletion, and retention.

## 4. API and Cloudflare

- [x] Update JSON/SSE chat input/output contracts without duplicating coordinator logic.
- [x] Add the bounded `POST /chat/public/branch` route and rate-limit behavior.
- [x] Add the matching same-origin Cloudflare POST proxy and deployment contract checks.

## 5. Browser state and product UI

- [x] Add one typed API decoder for generation identity, history branches, logical turns, and answer revisions.
- [x] Extract pure conversation projection/update helpers from the flat message model.
- [x] Update restore, branch switch, continue-from-revision, new-turn, regenerate, retry, cancellation, deletion, and race fences.
- [x] Render one question with revision-aware answer state, previous/next controls, count, branch menu, and continue command.
- [x] Keep citations, claims, feedback, suggestions, scroll following, history drawer, fullscreen, focus, keyboard, mobile sizing, and reduced motion coherent.
- [x] Keep Branch-operation failures visible and exactly retryable without changing the active path or double-submitting an action.
- [x] Preserve the current persisted Revision and navigation when regeneration fails; append a new Revision only after a successful retry.
- [x] Move mobile initial focus into the modal without opening the soft keyboard, and restore the trigger on close or Escape.
- [x] Disclose bounded Branch/Revision history beside the selector and show the loaded logical-turn count per Branch.
- [x] Render Revision-specific citation provenance metadata: source section, optional publication date, and verified/partial evidence state.

## 6. Deterministic validation

- [x] Expand persistence fixture for migration-shaped data, exactly-once revision creation, concurrent forks, stale fences, replay, feedback, deletion, retention, and cross-session rejection.
- [x] Execute the real migration against an empty database and a disposable legacy-schema PostgreSQL fixture; assert the field-level parity table and upgraded completed replay.
- [x] Expand Agent/API/service-mode/rate-limit fixtures for intent and branch contracts.
- [x] Add a pure browser conversation fixture for hydrate, revision navigation, regeneration merge, branch replacement, ancestry-only history, retry IDs, and malformed payload rejection.
- [x] Expand Cloudflare smoke for the branch proxy and new result fields.
- [x] Cover old-browser/new-server and new-browser/old-server rollout windows plus explicit-selection-versus-late-completion races.
- [x] Expand UI checks for desktop and 320/390/430 widths, stable revision controls, branch menu, fullscreen, focus, scroll, and no overflow.
- [x] Cover Branch 409/503 recovery, synchronous retry de-duplication, regeneration failure preservation, and successful immutable retry.
- [x] Cover a delayed background health failure after Branch failure and prove it cannot replace the exact-action retry issue.
- [x] Assert public health responses omit exact model/provider identity while preserving readiness fields.
- [x] Assert truncated Branch/Revision disclosures, Branch turn counts, and citation provenance metadata in the browser fixture.

## Validation Commands

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run lint
npm.cmd run build
npm.cmd run server:build
npm.cmd run assistant:public-agent-check
npm.cmd run assistant:public-model-check
npm.cmd run assistant:public-api-check
npm.cmd run assistant:public-persistence-check
npm.cmd run assistant:public-rate-limit-check
npm.cmd run assistant:public-conversation-check
npm.cmd run assistant:public-web-check
npm.cmd run assistant:public-sync-check
npm.cmd run assistant:hybrid-contract
npm.cmd run assistant:rag-smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:smoke
npm.cmd run cf-assistant:smoke
npm.cmd run performance:check
npm.cmd run check:ui
git diff --check
```

`assistant:public-migration-check` is an additional required gate. Set `PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL` to a disposable loopback PostgreSQL database before running it; the script rejects every non-loopback host.

```powershell
npm.cmd run assistant:public-migration-check
```

All checks are fixture-only and must not call a live model, search, embedding, reranker, Qdrant, or other external AI provider.

## Final Review Gates

- [x] Every PRD acceptance criterion maps to a deterministic fixture or UI assertion.
- [x] No old flat Turn answer write remains.
- [x] No sibling revision enters Agent history.
- [x] No replay reads current branch state.
- [x] No branch/revision endpoint can cross an anonymous session capability.
- [x] Migration backfill parity is verified before legacy columns are dropped.
- [x] Revision immutability and cross-session graph ownership are enforced in PostgreSQL as well as application code.
- [x] Public database operational SQL and deployment docs match the final table/API contract.
