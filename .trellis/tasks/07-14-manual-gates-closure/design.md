# Design: Cross-project Manual Gates Closure

## Source Of Truth

`docs/manual-gates.md` remains the durable ledger. Readiness, deployment, monitoring, and runbook documents may explain a subsystem, but they must link back to the ledger instead of maintaining separate active queues.

## Classification Model

Each item is assigned one state:

- `completed`: low-sensitive evidence already proves it; keep only a completion note when historically useful.
- `agent`: code, docs, local checks, public health endpoints, or safe synthetic checks can close it without user credentials.
- `human`: requires a platform console, private credential, production member context, release approval, or provider choice.
- `deferred`: useful but not required for current product correctness or acceptance.

The active queue lists only `human` items. Agent work is implemented in this task and completed items do not remain as instructions.

## Internal Knowledge Sync State Fix

`InternalKnowledgeDocument.updatedAt` represents content/admin edits in the UI. A successful sync currently writes `lastSyncedAt` through Prisma `updateMany`, which also advances `updatedAt` because of `@updatedAt`. The client then sees `updatedAt > lastSyncedAt` and reports a false stale state.

The focused fix conditionally updates each document only when both `contentHash` and `updatedAt` still match the snapshot used to build the sync plan. It writes `lastSyncedAt` while explicitly preserving the original content `updatedAt`, preventing Prisma metadata writes from masquerading as content edits. If a document changes while the external sync is running, the conditional update matches zero rows and the newer document remains stale for the next sync instead of being falsely marked synchronized.

Regression coverage must prove:

- no `lastSyncedAt` -> pending;
- `updatedAt > lastSyncedAt` -> content changed;
- equal timestamps or `updatedAt < lastSyncedAt` -> synchronized.
- content changed during synchronization -> conditional acknowledgement is skipped and the document remains stale.

## Human Guidance Contract

Only one human gate is active in the conversation at a time. After the user reports completion, Codex first verifies whatever can be checked without secrets, updates the ledger, and only then presents the next gate.

The first recommended gate is the Xunqiu stage-APK policy mismatch. Public link inspection currently finds a downloadable `latest-xunqiu64.apk`, while the durable ledger still says formal release approval, signing, checksum, scan/regression evidence, and rollback notes are incomplete. The safe recommendation is to remove public download links until that evidence is approved; the user must confirm whether the current stage package was intentionally approved for public distribution.

After that decision, the next gate is Internal Assistant production recheck:

1. Restart only `biau-internal-assistant-api` in Render.
2. Reopen `/assistant` with the same member context and verify the existing ACTIVE memory still exists.

No member token, admin token, memory text, model endpoint, or database URL is recorded.

## Validation Boundaries

- Safe: documentation checks, local deterministic assistant checks, server smoke, service-mode smoke, UI check, build/lint, public health/synthetic endpoints without live chat.
- Human-only: credentialed Legal/ERP checks, platform-console settings, release signing, model calls, analytics ownership verification, and metrics scrape credentials.
- A failed public synthetic is evidence to investigate, not permission to expose a secret or send a model probe.

## Rollback

- The timestamp fix is isolated to the successful internal-knowledge sync update and its regression check.
- Ledger edits can be reverted independently from product code.
- A human gate is never marked complete solely from an unverified verbal assumption; it can be restored if later evidence contradicts the recorded conclusion.
