# Backend Database Guidelines

## ORM And Driver

The backend uses Prisma 7 with PostgreSQL and `@prisma/adapter-pg`. Clients are created lazily in `server/src/db.ts`.

- `getPrisma()` / `requireDatabase()` own BIAU Operator persistence.
- `getStudioPrisma()` / `requireStudioDatabase()` own Content Studio persistence.
- Do not instantiate Prisma clients in route handlers.
- Real connection strings stay in deployment environment variables.

When a managed pooler requires Prisma 7 / libpq compatibility, configure the provider-approved TLS/query parameters in the platform value. Never put the real URI in source or docs.

## Schema Ownership

### Operator Database (`DATABASE_URL`)

- `OperatorSession`
- `OperatorMessage`
- `OperatorMemory`
- `OperatorUsageLog`
- `InternalKnowledgeDocument`
- `InternalKnowledgeSyncRun`

The `InternalKnowledge*` model name is retained as a private RAG scope/storage term; it does not reintroduce a member product.

### Studio Database (`STUDIO_DATABASE_URL`)

- Content drafts and reviews.
- Source items.
- AI Daily issues.
- Publish Export records.

### Legacy Migration Sources

Old invite/member/session/message/memory/usage tables may remain temporarily for rollback and selective migration. Final Operator runtime must not create new invite/member records or depend on member tokens.

## Owner Scoping

- Every Operator session/message/memory/usage query includes `ownerId` derived from `OperatorPrincipal`.
- Never accept `ownerId` from request JSON.
- Cross-owner lookups return `404`.
- `OperatorMemory` uses `@@unique([ownerId, contentHash])` for per-owner deduplication.
- Serializers omit `ownerId`, `contentHash`, source message ids, hashes, and raw JSON internals.

## Studio Boundary

- Operator `studio.draft` writes through the Studio client/database, not the Operator client.
- `biau-operator-api` and `biau-content-studio-api` use the same `STUDIO_DATABASE_URL`.
- Operator `DATABASE_URL` remains separate.
- `ASSISTANT_SERVICE_MODE=operator` does not mount `/studio/api/*`.
- `ASSISTANT_SERVICE_MODE=studio` mounts only `/health` and `/studio/api/*`.
- Local `all` may mount Studio routes for development.

Correct deployment shape:

```text
biau-operator-api
DATABASE_URL=<operator workspace database>
STUDIO_DATABASE_URL=<shared content studio database>

biau-content-studio-api
STUDIO_DATABASE_URL=<same shared content studio database>
```

## Owner Memory Migration

1. Run `npm.cmd run operator:memory-migration:check` against the intended private database.
2. Review only redacted record ids, owner candidates, status, timestamps, and counts.
3. Approve exact ids that are clearly the site owner's `ACTIVE` long-term memory.
4. Run apply with only those ids.
5. Verify count, deduplication, archive/restore, and persistence after service restart.

Do not migrate ordinary chats, invites, members, model assignments, usage, ambiguous records, sensitive memory, or non-active records.

## Query Patterns

- Use `findFirst({ where: { id, ownerId } })` for owner-scoped resource lookup.
- Use explicit `select`/serializers for browser responses.
- Use `Promise.all` only for independent queries.
- Convert trusted bounded metadata to `Prisma.InputJsonValue` intentionally.
- Never spread arbitrary request bodies into Prisma writes.

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

- Never persist plaintext service/admin tokens, Access assertions, API keys, database URLs, provider endpoints, or private request headers.
- Hash only when a retained legacy migration field requires it; final Operator authentication is not a browser token database.
- `STUDIO_ADMIN_TOKEN`, `OPERATOR_SERVICE_TOKEN`, `RAG_SYNC_TOKEN`, and provider keys remain platform-only.

## Migrations

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:migrate:studio
```

Production migration requires a database backup and available previous Render revision. Do not run destructive cleanup until Operator owner flow and selected memory migration are accepted.

## Tests Required

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run operator:memory-migration:check
npm.cmd run lint
npm.cmd run build
git diff --check
```

Production-only checks record low-sensitive outcomes. Do not expose real ids, memory text, connection strings, or tokens.

## Avoid

- Writing Studio rows through the Operator Prisma client.
- Mounting Studio API routes in Operator mode.
- Querying owner records by id without `ownerId`.
- Deleting legacy migration sources before backup and accepted migration.
- Putting server database/token values in `VITE_*`.
