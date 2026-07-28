# Design: Public assistant immutable answer revisions

## Architecture

The existing generation request remains the exactly-once execution identity. The new model adds three distinct persistent identities:

```text
Session
  activeBranchId -> Branch

Branch
  headRevisionId -> Revision

Turn (one user question)
  parentRevisionId -> Revision used as context
  revisions[] -> Revision (alternative immutable answers)

Revision
  turnId -> Turn
  basedOnRevisionId -> prior answer regenerated from
  requestId <- Request.revisionId
```

Following `Branch.headRevision -> Revision.turn.parentRevision` reconstructs one unique conversation path. A branch row is intentionally small and mutable only at its head; all question and answer content remains append-only.

## PostgreSQL Model

### PublicAssistantSession

- Keep `id`, title, activity, and retention fields.
- Add nullable `activeBranchId` with a named relation using `ON DELETE SET NULL`.
- Add `branchSelectionVersion Int @default(0)`. Only explicit branch select/continue actions increment it.
- Add `branches[]`.

### PublicAssistantBranch

- `id String @id @default(cuid())`
- `sessionId String`
- `ordinal Int`
- `headRevisionId String?`
- `forkedFromRevisionId String?`
- `createdAt`, `lastActiveAt`, `expiresAt`
- Unique `(sessionId, ordinal)` and bounded lookup indexes.
- Head/origin foreign keys use `SET NULL` only for whole-session deletion safety. Application invariants reject a null head for a live returned branch.
- Every active/head/origin/parent/base link is checked against the owning session before write. The migration adds database triggers for graph ownership edges that cannot be expressed safely as cascading composite Prisma relations.

### PublicAssistantTurn

- Keep only logical-question fields: session, question, mode, fingerprints/terms, parent revision, timestamps, and revisions.
- Remove answer, route, status, citation, metric, snapshot, aggregate, feedback, and request ownership from Turn after migration backfill.
- `parentRevisionId` uses a named optional relation to Revision with `ON DELETE SET NULL`; revisions are never individually deleted in normal operation.

### PublicAssistantAnswerRevision

- `id String @id @default(cuid())`
- `turnId String`, `revisionNo Int`, `basedOnRevisionId String?`
- Immutable answer fields moved from Turn.
- `aggregateId`, `createdAt`, `expiresAt`.
- Unique `(turnId, revisionNo)` and indexes for turn order, lineage, and retention.
- Request owns the one-to-one `revisionId`; the revision does not duplicate request identity.
- A database trigger rejects every `UPDATE` to a committed Revision row. Feedback and branch selection remain separate mutable rows.

### PublicAssistantRequest

- Add `intent` enum (`new_turn`, `answer_revision`).
- Keep nullable `turnId`, but remove the old uniqueness constraint.
- Add unique nullable `revisionId` plus nullable `branchId`, `parentRevisionId`, and `baseRevisionId` claim fields.
- Record `claimedBranchSelectionVersion` so completion can detect a newer explicit visitor branch action.
- Canonical hashing includes all normalized intent identity. Response replay continues to read the request's frozen `responseJson`, never a branch head.

### PublicAssistantFeedback

- Replace unique `turnId` with unique `revisionId`.
- Keep `sessionId` for bounded ownership and deletion queries.
- Aggregate selection is derived from the targeted revision.

## Migration

One forward migration performs these steps in one transactional migration:

1. Create enums, Revision and Branch tables, nullable link columns, indexes, and foreign keys.
2. Backfill one revision per legacy Turn with `revisionNo = 1`, preserving answer, status, citations, metrics, snapshot, aggregate, timestamps, and expiry. IDs are deterministic text (`legacy-revision-` plus the existing Turn ID), so no PostgreSQL extension is required.
3. Backfill request `revisionId` through the request's legacy `turnId`; mark existing requests `new_turn`.
4. Backfill feedback `revisionId` through its legacy `turnId`.
5. Set each legacy Turn's `parentRevisionId` to the previous chronological turn's revision within the same session.
6. Create one branch per retained session whose head is the final chronological revision and set the session active branch. IDs use `legacy-branch-` plus Session ID.
7. Rewrite every completed Request `responseJson` through a SQL JSONB projection that retains its existing allowlisted answer fields and adds `contractVersion: 2` plus the backfilled conversation identity.
8. Add graph-ownership and revision-immutability triggers, verify parity, then drop legacy Turn answer columns and Feedback.turnId.

The migration uses deterministic row ordering `(createdAt, id)` and no optional database extension. Production deployment must apply the migration before serving the new API. Rollback uses the previous Render revision plus the required pre-migration database backup; there is no automatic destructive down migration.

Migration parity is field-specific:

| Legacy data | Migration result |
|---|---|
| Session id/title/activity/expiry | Preserved; active branch and selection version added |
| Turn question/mode/fingerprints/terms/time/expiry | Preserved on logical Turn; parent revision added |
| Turn answer/route/status/citations/metrics/snapshot/aggregate | Copied byte-for-byte or JSON-for-JSON into Revision 1 |
| Request state/hash/lease/cache/time | Preserved; revision/branch identity and v2 cache projection added |
| Feedback value/time/session | Preserved; target changed from Turn to Revision 1 |
| Daily Aggregate rows and counters | Preserved unchanged; Revision 1 keeps the legacy aggregate binding |

## Generation Contract

The browser sends `contractVersion: 2` and a normalized `intent` object:

```ts
type PublicAssistantGenerationIntent =
  | {
      kind: 'new-turn'
      branchId: string | null
      parentRevisionId: string | null
    }
  | {
      kind: 'answer-revision'
      branchId: string
      turnId: string
      baseRevisionId: string
    }
```

The server validates identifiers and session ownership before execution. For a persisted branch, server-derived ancestry is authoritative; bounded browser history remains only for the database-free first-party fallback path.

The public answer projection adds:

```ts
contractVersion: 2
conversation: {
  branchId: string
  branchOrdinal: number
  turnId: string
  revisionId: string
  revisionNo: number
  basedOnRevisionId: string | null
}
```

These fields are low-sensitive opaque identifiers already held through the session capability. They are returned only for that session and are included in cached request replay.

## Completion Transaction

Completion retains the current request-row lock and lease fence.

### First turn

1. Upsert/lock Session.
2. Create Turn with no parent.
3. Create Revision 1 and increment its daily aggregate.
4. Create the next serialized root Branch pointing to the revision. The first is ordinal 1; concurrent first requests receive later distinct ordinals.
5. Auto-activate the branch only when `branchSelectionVersion` still equals the value captured at claim; otherwise retain the newer explicit selection.
6. Complete Request with turn, revision, branch, and frozen response projection.

### Follow-up turn

1. Lock Session and validate the claimed parent revision belongs to it.
2. Create Turn pointing to the claimed parent revision and create Revision 1.
3. If the claimed branch still points to the parent, advance that branch head.
4. If another request already advanced it, create a new branch rooted at the new revision so both valid concurrent results survive.
5. Auto-activate the result only when `branchSelectionVersion` still equals the value captured at claim; otherwise preserve the visitor's newer explicit selection. Complete Request either way.

### Answer regeneration

1. Lock Session and target Turn; validate base revision ownership and same-turn lineage.
2. Allocate `revisionNo = max + 1` while holding the Turn lock.
3. Create the immutable Revision and aggregate increment.
4. Create a new branch rooted at that revision, recording the base revision as origin.
5. Auto-activate the branch only when `branchSelectionVersion` still equals the claim value; otherwise save it without stealing focus. Complete Request either way.

Every early exit occurs before Turn, Revision, Branch, or aggregate writes. A replay returns the Request projection bound to its Revision, not current Session state.

## Branch Operations

`POST /chat/public/branch` accepts one discriminated body:

- `{ sessionId, action: 'select', branchId }`
- `{ sessionId, action: 'continue-from-revision', revisionId }`

Both use the history rate-limit bucket, `Cache-Control: no-store`, row locking, and session ownership validation. They increment `branchSelectionVersion`. `continue-from-revision` reuses a branch whose exact current head is the revision; otherwise it creates the next bounded branch under the Session lock. The response is the same normalized history projection used by restore, eliminating client-side reconstruction drift. A completion holding an older captured selection version may save data but cannot replace this explicit selection.

Cloudflare exposes `/api/chat/public/branch` as a thin POST proxy with the existing request/response/header limits.

## History Projection

The session response becomes:

```ts
interface PublicAssistantSessionHistory {
  session: SessionSummary & { activeBranchId: string }
  branches: Array<{
    id: string
    ordinal: number
    headRevisionId: string
    preview: string
    turnCount: number
    lastActiveAt: string
  }>
  turns: Array<{
    id: string
    question: string
    mode: PublicAssistantMode
    parentRevisionId: string | null
    selectedRevisionId: string
    revisions: PublicAssistantAnswerRevision[]
    createdAt: string
  }>
  hasEarlierTurns: boolean
  revisionsTruncated: boolean
  branchesTruncated: boolean
}
```

Persistence walks backward from the active branch head, retains the latest 100 ancestors, then returns them in chronological order. The first returned Turn keeps its real opaque parent identity while `hasEarlierTurns=true` tells the UI that earlier content is omitted. Agent context uses an independent latest-6 selected-ancestor projection. Every snapshot is decoded through the existing public allowlist. Missing/corrupt or cross-session links fail safely with a stable history error rather than leaking raw rows.

## Frontend State

`PublicAssistantWidget` keeps local React state but replaces the flat `WidgetMessage[]` source of truth with typed `ConversationTurn[]`, branch summaries, and active branch ID. Pure conversation projection/reducer helpers live outside the component so deterministic fixtures can cover them without adding a global state library.

- Rendering maps one user question and its selected revision.
- Revision navigation changes only the viewed revision for that Turn.
- Regeneration targets the viewed Turn/revision and merges the returned Revision without duplicating the question.
- `Continue from this version` calls the branch endpoint, then hydrates the returned authoritative path.
- Branch selection calls the same endpoint and replaces the active path atomically.
- New follow-ups use only the active path's selected revisions.
- Suggestions come from the active head revision.
- Feedback is stored and rendered per revision.

Revision controls stay in the existing answer action row with fixed-size Lucide buttons, tooltips, a stable count box, and 44px touch targets on mobile. No horizontal rails or gesture-only controls are introduced.

## Failure Contract

- Cross-session branch/turn/revision identifiers -> `404 session-not-found` or `404 revision-not-found` without revealing ownership.
- Invalid intent shape -> `400 invalid-public-assistant-request`.
- Revision/branch limit -> `409 public-assistant-revision-limit` or `public-assistant-branch-limit`.
- Missing persistence for branch/history/feedback -> `503 database-not-configured`.
- Corrupt ancestry -> `409 public-assistant-history-invalid`, low-sensitive logging only.
- Completed request replay remains successful even if the branch later changes.

## Lifecycle

- Session deletion deletes Request rows first, then the Session cascade removes branches, turns, revisions, and feedback. Aggregate rows remain.
- Retention deletes expired Requests and whole expired Sessions. It does not independently delete Revision rows.
- Public table verification/hardening SQL includes Branch and Revision.

## Risks And Controls

- **Circular deletion relations**: nullable head/active pointers use `SET NULL`; Session remains the tree deletion owner.
- **Concurrent revision numbering**: lock the target Turn and retain `(turnId, revisionNo)` uniqueness.
- **Wrong replay after branch switch**: response cache is revision-bound and allowlist-decoded.
- **Prompt contamination**: persisted ancestry is server-derived; siblings are never flattened into history.
- **Migration loss**: backfill before dropping legacy columns; fixture uses representative legacy rows and verifies field parity.
- **Selection race**: claim captures `branchSelectionVersion`; only an unchanged version permits automatic activation.
- **Cross-session graph corruption**: validate every edge in the transaction and enforce database ownership triggers for stored graph links.
- **Large component regression**: move pure state transformations into a typed helper and keep DOM changes localized to the existing widget.

## Rollout

1. Back up the public-assistant PostgreSQL database and retain the current Render revision.
2. Deploy the additive version-2 API build with `prisma migrate deploy` before process start. It continues to accept bounded version-1 new-turn bodies.
3. Deploy Cloudflare Pages Functions and frontend from the same commit. The new browser treats a legacy upstream answer as ephemeral and withholds revision controls until identity is available.
4. Run fixture-only checks in CI, then one user-approved production conversation covering first answer, regenerate, branch switch, refresh, and feedback.

The API and frontend come from one commit but deploy sequentially. Additive HTTP compatibility covers both orderings; it does not preserve the old flat Turn persistence model.
