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
- `PublicAssistantTurn`
- `PublicAssistantFeedback`
- `PublicAssistantDailyAggregate`

### Studio Database (`STUDIO_DATABASE_URL`)

- Content drafts and reviews.
- Source items.
- AI Daily issues.
- Publish Export records.

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
