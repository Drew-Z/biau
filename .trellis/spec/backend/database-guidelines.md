# Backend Database Guidelines

## ORM And Driver

The backend uses Prisma 7 with PostgreSQL and `@prisma/adapter-pg`. Clients are created lazily in `server/src/db.ts`.

- `getPrisma()` owns bounded anonymous public-assistant persistence.
- `getStudioPrisma()` / `requireStudioDatabase()` own Content Studio persistence.
- Do not instantiate Prisma clients in route handlers.
- Real connection strings stay in deployment environment variables.

When a managed pooler requires Prisma 7 / libpq compatibility, configure the provider-approved TLS/query parameters in the platform value. Never put the real URI in source or docs.

## Schema Ownership

### Public assistant database (`DATABASE_URL`)

- `PublicAssistantSession`
- `PublicAssistantRequest`
- `PublicAssistantTurn`
- `PublicAssistantAnswerRevision`
- `PublicAssistantBranch`
- `PublicAssistantFeedback`
- `PublicAssistantDailyAggregate`

### Studio Database (`STUDIO_DATABASE_URL`)

- Content drafts and reviews.
- Source items.
- AI Daily issues.
- Publish Export records.

### Supabase server-only boundary

The current Supabase `public` schema is not a browser Data API. All application access goes through server-side Prisma using the database owner.

- Every reviewed application table has RLS enabled with no public policy; this is an intentional default-deny state.
- `anon` and `authenticated` have no public schema, table, sequence, or function privileges.
- `service_role` retains schema usage and bypasses RLS, but frontend bundles must never receive its key.
- The `postgres` default ACL must not grant future public tables, sequences, or functions to Data API roles or `PUBLIC` function execution.
- Reintroducing REST, GraphQL, Realtime, Edge Function, browser, or mobile access requires a separate access design with explicit object grants and least-privilege policies.
- Production checks use the reviewed scripts under `scripts/operations/postgres/data-api-hardening/`; do not mix access-policy changes into data-retirement SQL.

## Studio Boundary

- `ASSISTANT_SERVICE_MODE=studio` mounts only `/health` and `/studio/api/*`.
- Local `all` may mount Studio routes for development.
- `STUDIO_DATABASE_URL` is independent from the public assistant `DATABASE_URL`.
- Studio and AI Daily tables are never part of public-assistant data retirement.

Correct deployment shape:

```text
biau-content-studio-api
STUDIO_DATABASE_URL=<content studio database>

biau-public-assistant-api
DATABASE_URL=<anonymous public assistant database>
```

## Retired private data

Operator/member/private-chat/internal-knowledge tables are absent from the current Prisma schema. Their final PostgreSQL deletion uses the reviewed scripts under `scripts/operations/postgres/operator-retirement/`, outside automatic Prisma migrations. The flow requires database fingerprint checks, a restorable backup, explicit confirmation, no `CASCADE`, and post-delete verification of all public-assistant tables.

Catalog guards that detect enum use outside a retirement allowlist must filter `pg_class.relkind` to real relations (`r`, `p`, `v`, `m`, `f`, `c`). Index relations mirror indexed column types in `pg_attribute`; counting `relkind = i` as an external enum consumer produces a false dependency and blocks a valid retirement. The destructive statement must still omit `CASCADE` so unmodelled dependencies fail the transaction closed.

## Query Patterns

- Use explicit `select`/serializers for browser responses.
- Use `Promise.all` only for independent queries.
- Convert trusted bounded metadata to `Prisma.InputJsonValue` intentionally.
- Never spread arbitrary request bodies into Prisma writes.

### Scenario: Public assistant immutable conversation graph

#### 1. Scope / Trigger

- Applies to public generation idempotency, answer regeneration, branch selection, session history, feedback, retention, and any migration touching the anonymous conversation graph.

#### 2. Signatures

- `PublicAssistantRequest` is one generation intent and owns its canonical hash, lease fence, target identities, completed `responseJson`, and unique `revisionId`.
- `PublicAssistantTurn` is one logical question and stores its exact `parentRevisionId` context anchor.
- `PublicAssistantAnswerRevision` is one immutable generated answer with its display snapshot, lineage, status, route, metrics, aggregate binding, and revision ordinal.
- `PublicAssistantBranch` is a mutable per-session pointer to one selected head revision. `PublicAssistantSession.activeBranchId` and `branchSelectionVersion` persist explicit visitor selection.

#### 3. Contracts

- The browser creates one UUID per visitor generation intent. Transport retries reuse it; deliberate regeneration or retry after cancellation creates a new UUID. The canonical request hash includes the normalized intent kind and every branch, turn, parent, and base revision identity.
- PostgreSQL owns `processing | completed | retryable_failed | failed | cancelled`. A processing claim carries an opaque lease token and bounded expiry; completion locks the request row and verifies the canonical hash, state, lease token, and expiry before writing the graph.
- Turn, Revision, Branch/head changes, aggregate increment, and completed Request projection commit in one fenced transaction. A stale, cancelled, or superseded lease exits before any graph or aggregate write.
- A committed Revision is append-only. The database update-rejection trigger and same-session graph-ownership triggers fail closed for Session, Branch, Turn, Revision, Request, and Feedback edges.
- Explicit branch selection increments `branchSelectionVersion`. A generation may auto-activate only when the captured version is still current; a late valid completion remains saved without stealing a newer visitor selection.
- Completed duplicate replay decodes only that Request's frozen, versioned `responseJson`. It never rebuilds an answer from the current branch head or mutable session state. Session display history is separately reconstructed from the selected Branch head through immutable parent-revision links.
- Session deletion and retention remove Requests and whole expired Session trees. Normal lifecycle code never updates or independently deletes a committed Revision; aggregate rows remain independent.

#### 4. Validation & Error Matrix

- Same request ID with a different normalized intent -> stable idempotency conflict.
- Unknown or cross-session branch/turn/revision capability -> stable not-found response without ownership disclosure.
- Expired lease, cancellation, or fenced completion -> no Turn, Revision, Branch, Feedback, or aggregate write.
- Revision/branch bound reached -> stable conflict; do not evict a reachable Revision to make room.
- Corrupt or cross-session ancestry -> fail closed; never flatten sibling branches into history.

#### 5. Good / Base / Bad Cases

- Good: regeneration creates a sibling Revision and saved Branch, then refresh restores the selected path while the original completed Request still replays its own Revision.
- Base: PostgreSQL is not configured, so chat may return a documented ephemeral answer while history, branch, and persisted feedback operations return `database-not-configured`.
- Bad: overwrite a Revision, trust client history as persisted ancestry, or use the active Branch to rebuild an older completed response.

#### 6. Tests Required

- `assistant:public-persistence-check` must assert request hashing, leases, first-turn atomicity, regeneration lineage, concurrent forks, branch-selection fencing, revision-scoped feedback, replay independence, retention, deletion, and cross-session rejection.
- `assistant:public-migration-check` must run only against loopback PostgreSQL and prove empty-schema migration, legacy parity, Revision UPDATE rejection, graph-ownership triggers, and whole-session deletion.
- Operational SQL fixtures must prove the exact table allowlist, RLS, function `search_path`, and all public-assistant trigger bindings without connecting to production.

#### 7. Wrong vs Correct

Wrong: store a second answer by mutating or duplicating a flat Turn, then infer replay identity from the current active Branch.

Correct: append one immutable Revision for the existing Turn, bind the completed Request to it, save its Branch, and hydrate current history independently from the authoritative selected path.

### AI Daily Retention Dry-Run

- `GET /studio/api/ai-daily/retention/dry-run` is read-only and must use the Studio Prisma client behind Studio authentication.
- Query only bounded, expired windows (`expiresAt <= now` for evidence and `retentionUntil <= now` for Flash); fetch one overflow row per kind to report `truncated` without claiming a full scan.
- The shared retention policy owns classification. Current evidence, current approved revisions, non-withdrawn Flash lifecycle, revision history, and approval audit history fail closed as blocked; no route may issue `deleteMany`, `updateMany`, or archive writes for this contract.
- Response counts describe the returned candidate window. Opaque record ids may appear only in this authenticated maintenance response; never copy them into public status, metrics, logs, blog content, or generated knowledge.

## Content Studio Review Contract

- Review status: `approved | needs-changes | rejected | pending`.
- Stable checklist booleans: `sourceChecked`, `safetyChecked`, `publicReady`.
- Approving a draft requires all three checklist booleans to be `true`; route callers cannot approve with incomplete source, safety, or public-readiness evidence.
- `DRAFT` enters review only through a new `PENDING` review. A `REJECTED` draft must be edited and saved; that edit invalidates the terminal result and creates the new `PENDING` review automatically.
- A `REVIEW_NEEDED` draft whose latest review is `NEEDS_CHANGES` can be resubmitted only after the persisted draft `updatedAt` is later than that review's `reviewedAt`.
- Review transitions are state-bound: ordinary `REVIEW_NEEDED` drafts accept review decisions, while `APPROVED` may only be revoked to `needs-changes` or `rejected`.
- Editing an `APPROVED`, `PUBLISHED`, or `REJECTED` draft invalidates the terminal review result, returns the draft to `REVIEW_NEEDED`, and creates a new `PENDING` review in the same transaction.
- `ARCHIVED` drafts are read-only. `DRAFT`, `REVIEW_NEEDED`, `APPROVED`, and `REJECTED` may be archived and become `HIDDEN`; `PUBLISHED` requires an explicit public-withdrawal flow before archive.
- Draft edit, review, archive, and export-intent requests carry the browser's observed `expectedUpdatedAt`; the server compares it with the current row and uses that exact value in `id + status + updatedAt` conditional updates. A stale browser or concurrent request returns `draft-state-changed` instead of overwriting newer state.
- Empty or audit-only draft patches do not count as content revisions and must not invalidate an approval or create a new review cycle.
- Latest-review queries use `reviewedAt DESC, id DESC` so equal timestamps have a deterministic winner across list, review, and export paths.
- Optional page metadata is bounded and normalized.
- Unknown checklist keys are dropped.
- Checklist JSON must not contain credentials, provider/database URLs, private dashboards, stack traces, or absolute paths.

## Publish Export Contract

- Creating an export requires an `APPROVED` draft whose latest review is also `APPROVED` with all three checklist booleans set to `true`.
- Re-check the latest review both when creating an export intent and when the local exporter reports its result; an older approval does not authorize export after a pending, needs-changes, or rejected review.
- Every new Publish Export stores `draftId`, `draftUpdatedAt`, and the exact approved `reviewId`. The local exporter fetches the selected record before and after writing files and proves all three still match the current approved draft.
- `draftId + draftUpdatedAt` is unique, so concurrent browsers cannot create duplicate export intents for one approved draft version.
- Callback payloads repeat the bounded draft/review/version binding. Old records without that binding and callbacks for a later draft revision are rejected and must be replaced with a new Publish Export.
- Publish Export callbacks are serialized through the bound draft row. `passed` is an immutable terminal result; failed and unfinished records may be retried.
- The local exporter snapshots every target file before writing. If post-write version verification or the bound callback fails, it restores those files so an unaccepted export cannot remain in the working tree.
- Production creates an export intent; it does not write Git files.
- Local/CI reports repo-relative exported files and sanitized check results.
- Export callbacks accept only bounded repo-relative file paths and structured local-export-written | passed | failed check evidence.
- Reject absolute paths and `..` traversal.
- Export result JSON must not include tokens, URLs with credentials, request bodies, or private stack traces.

## Secrets And Tokens

- Never persist plaintext service/admin tokens, API keys, database URLs, provider endpoints, or private request headers.
- `STUDIO_ADMIN_TOKEN`, `RAG_SYNC_TOKEN`, and provider keys remain platform-only.

## Migrations

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:migrate:studio
```

Production migration requires a database backup and available previous Render revision. Destructive Operator retirement is never added to `prisma/migrations/`; it follows the independent reviewed manual flow.

## Tests Required

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run lint
npm.cmd run build
git diff --check
```

Production-only checks record low-sensitive outcomes. Do not expose real ids, prompts, connection strings, or tokens.

## Avoid

- Adding destructive Operator cleanup to the automatic Prisma migration path.
- Running retirement SQL against `STUDIO_DATABASE_URL`.
- Putting server database/token values in `VITE_*`.
