# AI Daily Workflow Guidelines

## Scenario: Public AI Daily Flash Feed

### HTTP and deployment boundary

- `GET /public/ai-daily/feed` and `GET /public/ai-daily/events/:publicId` are no-token public reads mounted only by the Studio service and local `all` mode. The public assistant, Operator, and RAG services must not mount these routes.
- Production Studio sets an exact browser-origin allowlist, `TRUST_PROXY=true`, a bounded public window, stale threshold, rate limit, and rate window. `TRUST_PROXY` must not be enabled by the other Render services.
- The router returns explicit CORS headers only for allowlisted origins, handles `OPTIONS`, emits bounded process-local `RateLimit-*` headers, and returns `429` plus `Retry-After` when the client-IP budget is exhausted.
- Successful responses use public cache headers, deterministic ETags, and `304` for matching `If-None-Match` without returning a body.

### Public projection contract

- Feed rows must be `ACTIVE`, have a current `APPROVED` revision, fall inside the configured approval window, and remain inside retention. Ordering and pagination use the stable `(lastApprovedAt desc, publicId desc)` keyset; limits are integers from 1 through 40, defaulting to 20.
- Detail reads return `404` for unknown, held, never-approved, or otherwise non-public ids. Withdrawn or retention-expired ids return `410` so clients can distinguish permanent removal from a missing draft.
- DTOs are explicit public whitelists. They expose only the stable public id, revision, bounded editorial text, approval/correction timestamps, and sanitized citation snapshots. Prisma records, internal ids, lifecycle audit data, stack traces, tokens, and private fields never cross this boundary.
- Citation URLs must parse as credential-free public HTTPS URLs. Local, private, metadata, LAN, malformed, and non-HTTPS targets are removed before serialization.
- Feed metadata reports page-scoped citation coverage plus `fresh`, `stale`, or `empty` projection state. A stale projection remains readable and must be labeled rather than silently treated as fresh.

### Required verification

Run `npm.cmd run ai-daily:public-feed-check` after changing the projection, router, schema, service modes, cache/CORS/rate-limit behavior, or citation contract. The deterministic check must cover field whitelisting, URL safety, pagination, `304`, `404`, `410`, `429`, stale metadata, correction ETag changes, query budget, and route isolation without connecting to providers or production databases.

## Scenario: Evidence-bound generation runner

### Durable stage contract

The generation runner is evidence-bound and provider-neutral. Its durable stages are:

```text
EXTRACT_FACTS -> COMPOSE -> VERIFY -> VALIDATE -> DRAFT
```

Each stage has one immutable `AiDailyGenerationCheckpoint` per `runId + stage`. The checkpoint stores `payloadJson`, its SHA-256 `payloadHash`, and a schema version. A replay with the same hash is idempotent; a different payload for the same stage is a hard conflict. The checkpoint is written before `AiDailyRun.currentStage` advances.

Checkpoint creation takes a PostgreSQL transaction advisory lock scoped to `runId + stage`. Only the transaction that creates the checkpoint may advance the run and append the corresponding low-sensitive `generation-checkpoint` event. Concurrent or later same-hash replays return the existing checkpoint without incrementing `eventSequence`; this exactly-once event behavior must be covered by the disposable PostgreSQL gate.

The verifier receives both the risk-classified claims and every generated composition block, including titles, summaries, impact text, and trends. Claim reviews and composition-block reviews must each be unique and complete. A missing, duplicated, contradicted, or insufficient block review fails closed, so attaching a valid claim ID to unsupported prose cannot make a revision `VALID`.

Generation work is claimed through the existing `AiDailyWorkItem` lease. Every new checkpoint write is bound to the current lease token and expiry. An expired worker cannot advance a run; the next attempt closes the old attempt as retryable failure and resumes from the last checkpoint. Same-date run creation takes a PostgreSQL advisory lock and merges scheduled/manual triggers into the same active run.

### Revision and draft projection

The deterministic gate owns publication eligibility. `VALID` may create the first `HIDDEN + REVIEW_NEEDED` ContentDraft and one pending review. `NEEDS_EDITOR_REVIEW` creates only an immutable generated revision. `REJECTED` creates no draft. A later valid revision never updates an existing draft; it is recorded as `BLOCKED` and sets `AiDailyIssue.newEvidenceAvailable`.

Generated revisions use a unique generation key so a retry after projection cannot create a duplicate revision. Citation snapshot v2 data is copied from persisted evidence, not reconstructed from model output.

Worker projection revalidates the active work-item lease inside the same transaction that creates or reuses a generated revision. The validation reads the work-item row with `SELECT ... FOR UPDATE`, so an expired-lease reclaim cannot pass between validation and projection writes. The disposable PostgreSQL gate must hold the issue row, prove the projection transaction has reached that barrier, and confirm reclaim remains blocked until the projection transaction releases the lease row. Each revision retains its exact `projectionDraftId`; a retry after projection but before the DRAFT checkpoint must return that original draft binding rather than the issue's later mutable draft pointer.

### Command and provider boundary

The automatic checks use fixture providers only. `ai-daily:run`, `ai-daily:compose`, `ai-daily:resume`, and `ai-daily:editorial-tick` require an explicit `--fixture` until a separately approved business acceptance run configures real providers. No model or search liveness request is a valid health check.

## Scenario: Offline AI Daily Drafts

### 1. Scope / Trigger

- Trigger: adding or changing AI Daily source inputs, draft generation commands, review gates, or future model-assisted AI Daily generation.
- Goal: keep AI Daily evidence-first, source-backed, manually reviewed, and safe for public commits.

### 2. Signatures

- `npm.cmd run ai-daily:draft -- --source <json>` reads a public-safe source JSON file and writes `content-drafts/ai-daily-<date>.md`.
- `npm.cmd run ai-daily:draft -- --source <json> --out <markdown>` writes to an explicit draft path.
- `npm.cmd run ai-daily:draft -- --source <json> --force` may overwrite an existing draft.
- Source JSON shape:
  - `date: "YYYY-MM-DD"`
  - `title?: string`
  - `subtitle?: string`
  - `editorNote?: string`
  - `items: Array<{ title, url, source, publishedAt?, summary, impact, toVerify?, tags? }>`

### 3. Contracts

- Default mode is `Codex-only scaffold/review`; generated drafts must record `model channel: none`.
- The command must not fetch URLs, call models, inspect private env files, or publish content.
- `url` must be a public `http` or `https` URL.
- `summary` and `impact` are required, author-written fields; do not copy long passages from sources.
- Draft frontmatter must include `status: "draft"`, `column: "ai-daily"`, and `modelStrategy`.
- Draft body must include evidence scaffold headings used by `blog:check`.
- First phase output is always `draft/manual-review`; automation must not claim daily publication is live.

### 4. Validation & Error Matrix

- Missing `--source` -> fail before writing.
- Missing or invalid `date` -> fail before writing.
- Empty `items` -> fail before writing.
- Invalid URL -> fail before writing.
- Missing `title`, `summary`, or `impact` on an item -> fail before writing.
- Existing output path without `--force` -> fail without overwriting.
- Model-assisted generation requested without explicit approval -> do not run.

### 5. Good / Base / Bad Cases

- Good: a source JSON with three official links generates a draft that clearly says `draft/manual-review`.
- Base: source dates are written as `source-provided` when the exact publication date still needs review.
- Bad: the source JSON contains a model relay URL, API key, internal dashboard link, or raw copied article text.
- Bad: a generated draft is promoted to public blog data without human review.

### 6. Tests Required

- Run `npm.cmd run ai-daily:draft -- --source <sample> --force`.
- Run `npm.cmd run blog:check` to verify the evidence scaffold and frontmatter.
- Run `npm.cmd run lint` and `npm.cmd run build`.
- Run `git diff --check`.
- Scan changed AI Daily files for token/key/password/base URL/private path patterns.

### 7. Wrong vs Correct

#### Wrong

```powershell
npm.cmd run ai-daily:draft -- --source .env.local
```

This points the draft generator at a private env file and risks exposing secrets.

#### Correct

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --force
```

The command reads a public-safe source pack and writes a reviewable draft without model calls or publication side effects.

## Scenario: Content Studio AI Daily Issue Detail

### 1. Scope / Trigger

- Trigger: adding or changing `/studio/ai-daily/:issueId`, `/studio/api/ai-daily/issues/*`, source selection, issue brief editing, or issue-to-draft conversion.
- Goal: keep one AI Daily issue editable as an internal workflow object while public publication remains gated by hidden/review-needed drafts and static export.

### 2. Signatures

- `GET /studio/api/ai-daily/issues/:id` returns `{ issue, sources, draft }`.
- `PATCH /studio/api/ai-daily/issues/:id` accepts `{ title?, date?, status?, sourceIds?, briefJson? }`.
- `POST /studio/api/ai-daily/issues/:id/content-draft` accepts `{ editorName?: string }`.
- Frontend route: `/studio/ai-daily/:issueId`.
- Draft output from conversion:
  - `column: "ai-daily"`
  - `tag: "AI 日报"`
  - `visibility: "hidden"`
  - `status: "review-needed"`
  - `aiAssistance: "none"`

### 3. Contracts

- All routes require the Studio bearer token and the Studio database boundary through `requireStudioDatabase()`.
- `sourceIds` must reference existing `SourceItem.id` records before saving.
- `briefJson` must be a JSON object, capped by size, and must not contain secret-looking values.
- Frontend brief parsing, formatting, and field validation must go through `src/utils/studioAiDailyBrief.ts`; route components should not maintain a second page-local brief contract.
- The editorial brief fields `summary`, `publicAngle`, `keySignals`, and `toVerify` are required. Missing or wrong-typed fields are save-blocking errors; thin but correctly shaped fields are visible warnings so editors can continue incremental work.
- `/studio/ai-daily/:issueId` should preserve partial saved brief objects in the textarea and surface their validation issues instead of silently replacing them with the empty default template.
- Issue readiness is stricter than editable brief validation. Moving an issue to `review-needed`, `approved`, or `published`, or converting it to a draft, must require a substantive brief plus at least one selected public source with usable summary evidence. Normal non-review saves may keep incomplete work.
- Converting an issue to a draft must not call a model, fetch external URLs, publish content, or write Git-tracked public data.
- If an issue already links to an AI Daily draft, conversion returns the existing linked draft detail instead of creating duplicates.
- If the derived slug `ai-daily-YYYY-MM-DD` already exists for a non-AI-Daily draft, conversion must fail with `duplicate-slug`.
- The response `sources` array should be ordered according to the issue's `sourceIds`, not by database update time.

### 4. Validation & Error Matrix

- Issue not found -> `404 { error: "ai-daily-issue-not-found" }`.
- Invalid date -> `400 { error: "invalid-date" }`.
- Invalid status -> `400 { error: "invalid-ai-daily-status" }`.
- Missing source id -> `400 { error: "invalid-source-ids" }`.
- Invalid or oversized brief -> `400 { error: "invalid-brief-json" }`.
- Secret-looking payload -> `400 { error: "sensitive-content-detected" }`.
- Malformed brief textarea -> the page shows a save-blocking error before sending `PATCH`.
- Missing required brief fields -> the page shows save-blocking field errors before sending `PATCH`.
- Empty strings or empty arrays inside a correctly shaped brief -> the page shows warnings but keeps the issue editable.
- Review-ready status with thin brief, malformed brief, missing sources, invalid source URL, or no useful source summary -> `409 { error: "ai-daily-issue-not-ready", issues: [...] }`.
- Convert with no selected sources -> `409 { error: "ai-daily-issue-needs-sources" }`.
- Convert with selected but not review-ready evidence -> `409 { error: "ai-daily-issue-not-ready", issues: [...] }`.
- Duplicate derived slug -> `409 { error: "duplicate-slug" }`.

### 5. Good/Base/Bad Cases

- Good: editor opens `/studio/ai-daily/<id>`, adds three source cards, writes `summary`, `publicAngle`, `keySignals`, and `toVerify`, saves, then converts to a hidden review-needed draft.
- Good: a converted issue stores source-card blocks in `bodyJson` so the Studio draft preview and export path see the same evidence scaffold.
- Good: editor can save an incomplete `source-collected` issue, but the UI and API both block entering review until readiness errors are resolved.
- Base: a fresh issue has empty `briefJson`; the page shows a safe JSON template and waits for manual editing.
- Bad: conversion marks the draft approved, featured, published, or model-assisted without human review.
- Bad: the frontend stores or displays `STUDIO_DATABASE_URL`, `DATABASE_URL`, model provider URLs, API keys, or raw backend stack traces.

### 6. Tests Required

- Run `npm.cmd run prisma:validate` after schema or Studio route changes.
- Run `npm.cmd run server:build`, `npm.cmd run server:smoke`, and `npm.cmd run assistant:service-modes-smoke` after changing Studio API contracts.
- Run `npm.cmd run studio:ai-daily-brief-check` after changing the brief helper, issue readiness helper, or issue editing page.
- Run `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui` after changing the `/studio/ai-daily/:issueId` page.
- Run `npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --force` to keep the offline compatibility tool working.
- Run `git diff --check` and a sensitive scan over changed files.

### 7. Wrong vs Correct

#### Wrong

```ts
await prisma.contentDraft.create({
  data: { column: 'ai-daily', status: 'APPROVED', visibility: 'FEATURED' },
})
```

This bypasses the AI Daily review gate and can make an unreviewed issue look publish-ready.

#### Correct

```ts
await prisma.contentDraft.create({
  data: { column: 'ai-daily', status: 'REVIEW_NEEDED', visibility: 'HIDDEN', aiAssistance: 'none' },
})
```

The conversion creates an internal review draft only; public visibility still depends on human approval and static export.

## Scenario: Content Studio Local Smoke Gate

### 1. Scope / Trigger

- Trigger: adding or changing Studio export scripts, project/status detail
  planning scripts, offline AI Daily draft generation, or docs that describe
  the local content pipeline validation path.
- Goal: keep one deterministic `studio:smoke` command as the default local
  no-live gate for autonomous work and CI-style checks.

### 2. Signatures

- `npm.cmd run studio:smoke`
- The command runs:
  - `npm.cmd run studio:export -- --sample --dry-run --allow-dirty`
  - `npm.cmd run studio:project-detail-plan -- --sample legal-rag`
  - `npm.cmd run studio:status-plan -- --sample legal-rag`
  - `npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --out <system-temp>/ai-daily-smoke.md --force`

### 3. Contracts

- The command must not call model providers, fetch external URLs, require a
  Studio database, require production tokens, or write public Git-tracked
  content.
- AI Daily smoke output must be written under the system temporary directory
  and removed after the command exits.
- The command must print each sub-step name before running it so failures are
  attributable.
- The AI Daily smoke draft must still contain the evidence scaffold markers:
  `column: "ai-daily"`, `status: "draft"`, `model channel: none`,
  `publication state: draft/manual-review`, and `## Review Gates`.

### 4. Validation & Error Matrix

- Any sub-command exits non-zero -> fail `studio:smoke` and report the step
  name.
- AI Daily temp draft is missing a required marker -> fail with the missing
  marker list.
- Cleanup fails because the temp directory is already gone -> ignore through
  force removal.
- Need to validate live Studio API, production database, model summary, or web
  scraping -> do not extend `studio:smoke`; create an explicit task and manual
  gate instead.

### 5. Good/Base/Bad Cases

- Good: fresh local checkout with no model keys and no Studio database passes
  `studio:smoke`.
- Base: `studio:smoke` runs while docs, scripts, or public blog data files are
  dirty and still leaves no new `content-drafts/*.md` smoke artifact.
- Bad: `studio:smoke` writes `content-drafts/ai-daily-smoke.md` or calls
  `blog:model -- doctor --live`.
- Bad: `studio:smoke` reaches out to a deployed Studio service, RSS feed,
  model relay, or arbitrary source URL.

### 6. Tests Required

- Run `npm.cmd run studio:smoke` after changing any command it wraps.
- Run `git status --short` after smoke work to confirm no temporary AI Daily
  draft was left in `content-drafts/`.
- Run `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` before
  committing script or docs changes.

### 7. Wrong vs Correct

#### Wrong

```powershell
npm.cmd run ai-daily:draft -- --source content-drafts/ai-daily/sample-sources.json --out content-drafts/ai-daily-smoke.md --force
```

This leaves a tracked-directory smoke artifact that can be committed by
accident.

#### Correct

```powershell
npm.cmd run studio:smoke
```

The wrapper writes the AI Daily sample draft to the system temp directory,
verifies the safety markers, and cleans it up.

## Scenario: AI Daily Production Domain Foundation

### 1. Scope / Trigger

- Trigger: changing production AI Daily storage, run/work orchestration, source selection, generated revisions, flash revisions, or citation snapshots.
- Goal: preserve editorial auditability and deterministic retries while keeping legacy Studio issues readable during migration.

### 2. Signatures

- Shared domain contracts: `server/src/aiDailyDomain.ts`.
- Database ownership and transaction helpers: `server/src/aiDailyRepository.ts`.
- Deterministic fixtures: `server/src/aiDailyFixtures.ts`.
- Domain gate: `npm.cmd run studio:ai-daily-domain-check`.

### 3. Contracts

- `AiDailyIssue.status` and `sourceIdsJson` are compatibility fields. Production workflow truth uses the separate editorial state and versioned `AiDailyIssueSource` rows.
- Changed source selections must increment `selectionVersion`, preserve source order, and dual-write `sourceIdsJson` until the compatibility window closes; saving an identical ordered selection is idempotent.
- Source reads prefer the current relational selection and fall back to ordered legacy JSON only when no current relation exists.
- Canonical source promotion may update machine-owned identity/freshness fields, but must not overwrite manually edited title, publisher, tier, summary, tags, or risk flags.
- Edition identity uses a strict real calendar date. Invalid legacy date strings remain repairable records with a null `editionDate`; migrations must not silently normalize them.
- Work identity is independent of manual versus scheduled trigger. A claim requires a random lease token and expiry; completion must match both so an expired worker cannot overwrite a newer claim. A new worker may reclaim an expired lease only after closing the previous attempt as retryable failure.
- Generated content and flash content are versioned records. Flash revision content is immutable, approval history is append-only, and approval supersedes the previous approved revision in the same transaction.
- `EXPORTED` is not deployed-public truth. Public deployment remains explicit through `deployedPublicAt` or a later deployment projection.
- Citation snapshot v2 stores the original URL, canonical URL, publisher, timestamps, and a bounded evidence excerpt inside the revision/draft so later source edits cannot rewrite publication evidence.
- New domain tables are internal by default. Public selectors must opt in only after editorial approval and publication projection are implemented.

### 4. Validation & Error Matrix

- Invalid status transition -> reject with `invalid-ai-daily-transition` before writing.
- Invalid or normalized-looking calendar date -> reject with `invalid-ai-daily-edition-date` / `invalid-date`.
- Stale source selection version -> reject with `ai-daily-selection-version-conflict`.
- Missing source IDs -> reject before relation writes.
- Wrong lease token -> `lease-token-mismatch`; expired lease -> `lease-expired`.
- Duplicate logical work -> return the existing `idempotencyKey` row rather than enqueueing another trigger-specific copy.
- Citation snapshot with a private URL, malformed date, or evidence excerpt over 1 KiB -> reject as `invalid-citation-snapshot-v2`.

### 5. Good/Base/Bad Cases

- Good: a Studio brief save with unchanged source order preserves the current selection version, while an actual reorder creates a new ordered version and keeps the old rows for audit.
- Good: a worker crash leaves an expired lease; the next worker closes the old attempt as `RETRYABLE_FAILED`, receives a new token, and a stale completion is rejected.
- Base: a legacy issue has only `sourceIdsJson`; reads preserve its order until the first valid relational selection is written.
- Bad: a retry key contains `manual` or `scheduled`, creating two logical copies of the same edition work.
- Bad: generated/public content resolves citations by joining the latest mutable `SourceItem` instead of retaining citation snapshot v2.

### 6. Tests Required

- Run `npm.cmd run prisma:validate` and `npm.cmd run prisma:generate` after schema changes.
- Run `npm.cmd run studio:ai-daily-domain-check`, `npm.cmd run studio:ai-daily-brief-check`, and `npm.cmd run studio:review-policy-check` after domain changes.
- Run the full migration set against a disposable PostgreSQL database; migration changes also need a legacy-data fixture covering invalid dates, duplicate/missing source IDs, and preserved source order.
- Run `studio:ai-daily-repository-check` only with `AI_DAILY_DATABASE_CHECK=1` and a local database whose name ends in `_test`; the script must refuse deployed or non-test databases.
- Run `npm.cmd run server:build`, `npm.cmd run server:smoke`, `npm.cmd run assistant:service-modes-smoke`, `npm.cmd run lint`, and `npm.cmd run build` before commit.
- Do not call search/model providers as a schema or domain health check.

### 7. Wrong vs Correct

#### Wrong

```ts
await prisma.aiDailyWorkItem.update({
  where: { id: workItemId },
  data: { status: 'SUCCEEDED' },
})
```

This lets an expired worker overwrite a newer claim and drops attempt history.

#### Correct

```ts
await completeAiDailyWorkItem(prisma, {
  workItemId,
  leaseToken,
  result: 'succeeded',
})
```

The repository verifies the active token and expiry, records the attempt outcome, and changes work state in one transaction.

## Scenario: AI Daily Ingestion And Evidence

### 1. Scope / Trigger

- Trigger: changing source feeds, discovery orchestration, original-page extraction, evidence storage, dedupe, grouping, ranking, selection, or ingestion freshness.
- Goal: produce deterministic, selection-versioned evidence without allowing search snippets, social signals, unsafe URLs, or stale checkpoints to masquerade as publishable evidence.

### 2. Signatures

- Source registry API:
  - `GET /studio/api/ai-daily/source-feeds?enabled=true|false`
  - `POST /studio/api/ai-daily/source-feeds`
  - `PATCH /studio/api/ai-daily/source-feeds/:id`
- Source payload fields: `name`, `kind`, `url`, `locale`, `tier`, `topics`, `enabled`, `intervalMinutes`, `lookbackMinutes`, `officialDomain`.
- Core modules:
  - `server/src/aiDailyIngestion.ts`
  - `server/src/aiDailySourceAdapters.ts`
  - `server/src/aiDailySafeFetch.ts`
  - `server/src/aiDailyIngestionRepository.ts`
  - `server/src/aiDailyIngestionService.ts`
- Fixture gates: `npm.cmd run ai-daily:{source,discovery,evidence,freshness,dedupe,ranking}-check`.
- PostgreSQL gate: `AI_DAILY_DATABASE_CHECK=1 npm.cmd run ai-daily:repository-check` against a local database whose name ends in `_test`.
  The ingestion, generation, and Studio repository checks all read
  `STUDIO_DATABASE_URL`; `DATABASE_URL` remains reserved for the Operator
  workspace database.

### 3. Contracts

- Tier 1/2/3 default cadence is `15/30/60` minutes with overlapping lookback `30/60/120` minutes. Explicit lookback must be at least the collection interval; omitted lookback derives a database-valid overlap.
- Brave is the production primary discovery role, Tavily is the optional fallback, and X Search is signal-only. Primary failure remains not-ready; missing or failed fallback is visible as `reduced_redundancy`.
- Search and social results are candidates only. They become selectable only after original-page evidence is fetched and marked `READY`; `leadOnly` candidates cannot be promoted.
- Safe fetch rejects URL credentials, unsupported schemes, internal hostnames, and non-public IPv4/IPv6 addresses. DNS results are checked before a pinned request, every redirect target is revalidated, and redirect destinations are checked against robots before their page is fetched.
- Direct fetch limits connect/read/total time, compressed bytes, decoded bytes, content type, redirects, and normalized evidence. Normalized text is at most `64 KiB`; citation excerpt is at most `1 KiB`; evidence expires after 30 days by default.
- Evidence documents are immutable versions per candidate. `currentEvidenceId` points to the latest version; failed writes cannot advance the version because creation and projection share a transaction.
- Dedupe order is canonical URL, content hash, title fingerprint, then lexical similarity. Event ranking stores named score components and stable tie-breaks. Selection may pass `targetEvents` only to satisfy minimum evidence diversity and never exceeds `maxEvents`.
- Selection writes require an explicit `runId`; database truth must confirm every representative belongs to that run, is not lead-only, and has ready evidence. Repeating the same ordered selection must not increment `selectionVersion` or duplicate issue relations.
- Source API responses expose public registry and low-sensitive health fields only. Do not persist provider credentials, endpoints, raw provider bodies, or arbitrary configuration JSON in source/evidence tables.

### 4. Validation & Error Matrix

- Invalid source payload/cadence/domain -> `400 invalid-ai-daily-source-feed` with bounded issue codes.
- Empty or invalid patch -> `400 invalid-ai-daily-source-feed-patch`.
- Missing feed -> `404 ai-daily-source-feed-not-found`.
- Canonical feed identity conflict -> `409 duplicate-ai-daily-source-feed`.
- Unsafe URL or private/DNS target -> `unsafe_url`.
- Robots denial, including a redirect destination -> `robots_disallowed` before the page request.
- Timeout/network/rate-limit/invalid provider response -> stable ingestion category; raw response and stack are not persisted.
- Missing primary discovery -> not ready with `primary_unavailable`; missing or failed fallback -> `reduced_redundancy`.
- Stale Tier 1/discovery checkpoints or missing selected fetch checkpoints -> explicit freshness gaps, never normal-ready.
- Selection representative from another run or without ready evidence -> `ai-daily-selection-run-boundary-mismatch` / `ai-daily-selection-requires-ready-evidence`.

### 5. Good / Base / Bad Cases

- Good: a Tier 1 RSS item is collected with conditional headers, fetched from its authoritative page, stored as evidence version 1, ranked, and selected once; repeating the run reuses canonical source and issue relations.
- Good: a redirect reaches another public origin, that origin's robots policy is checked before its article request, and a denial stops extraction.
- Base: Brave succeeds below the coverage threshold while Tavily is missing; stable-source candidates remain, readiness reports reduced redundancy, and no provider is pinged merely to test configuration.
- Bad: promote an X/Search snippet directly to `SourceItem`, persist a provider response in JSON, fetch a redirect before checking its robots policy, or update a selected representative without binding the run.

### 6. Tests Required

- Run all six fixture gates and assert deterministic candidates, fallback attempts, evidence limits, p95 freshness, duplicate reasons, score order, diversity, and selected event count.
- Type-check the AI Daily scripts explicitly because `server:build` covers `server/src` but not every `server/scripts` entry.
- Run `prisma:validate`, `prisma:generate`, and the full migration chain against a disposable PostgreSQL database.
- The PostgreSQL check must assert source/candidate upsert idempotency, evidence version increments, cluster/selection persistence, identical selection idempotency, cross-run rejection, and authenticated Studio GET/POST/PATCH source routes.
- Run `server:build`, `server:smoke`, `assistant:service-modes-smoke`, `studio:smoke`, `lint`, `build`, `git diff --check`, and a sensitive-value scan.
- Automated gates must use mocks/fixtures and must not perform model, search, extraction-provider, or liveness-only calls.

### 7. Wrong vs Correct

#### Wrong

```ts
await applyAiDailyEvidenceSelection(prisma, {
  issueId,
  selected,
  selectedBy: 'runner',
})
```

This trusts in-memory representatives without proving that they belong to the active run.

#### Correct

```ts
await applyAiDailyEvidenceSelection(prisma, {
  runId,
  issueId,
  selected,
  selectedBy: 'runner',
  selectionReason: 'deterministic evidence gate',
})
```

The repository binds selection to the run, verifies ready evidence in the database, and keeps repeated ordered selection idempotent.

## Scenario: Content Studio AI Daily Workspace And Flash Review

### 1. Scope / Trigger

- Trigger: the Content Studio needs one bounded view of the current AI Daily
  edition plus guarded Flash editorial actions.
- Goal: let an authenticated editor inspect runs, source health, evidence,
  Flash revisions, and edition review state, then approve/reject a draft,
  hold/release/withdraw an item, or create an immutable correction draft.

### 2. Signatures

- `GET /studio/api/ai-daily/workspace?issueId=<id>&limit=<1-40>`
- `POST /studio/api/ai-daily/flash-revisions/:id/approve`
- `POST /studio/api/ai-daily/flash-revisions/:id/reject`
- `POST /studio/api/ai-daily/flash-items/:id/hold`
- `POST /studio/api/ai-daily/flash-items/:id/release`
- `POST /studio/api/ai-daily/flash-items/:id/withdraw`
- `POST /studio/api/ai-daily/flash-items/:id/corrections`
- `POST /studio/api/ai-daily/issues/:id/content-draft`
- `POST /studio/api/ai-daily/issues/:id/generated-revisions/:revisionId/corrections`
- `POST /studio/api/ai-daily/issues/:id/generated-revisions/:revisionId/revalidate`
- `POST /studio/api/ai-daily/issues/:id/generated-revisions/:revisionId/apply`
- `POST /studio/api/ai-daily/issues/:id/generated-revisions/:revisionId/discard`
- Route registration: `server/src/studioRoutes.ts`.
- Projection and sanitization: `server/src/studioAiDailyWorkspace.ts`.
- Deterministic checks:
  - `npm.cmd run studio:ai-daily-workspace-check`
  - `npm.cmd run studio:ai-daily-flash-check`

### 3. Contracts

- Every route requires the existing Studio bearer credential and Studio
  database. The workspace `GET` remains read-only; Flash writes call repository
  methods that use the shared domain transition guards.
- The response is a bounded projection of issues, feeds, runs/events,
  work-items, candidates/evidence/clusters, flash revisions/actions, and the
  selected edition draft/review/generated-revision summaries.
- Review checklists expose only `sourceChecked`, `safetyChecked`, and
  `publicReady` booleans; unknown keys are dropped at the frontend decoder.
- Candidate ordering puts nullable scores last, then uses deterministic
  timestamp/id tie-breakers.
- The frontend must decode the payload with
  `normalizeStudioAiDailyWorkspace` before rendering. An issue switch may only
  be applied by the newest request sequence.
- The workspace does not return raw provider error bodies, raw database JSON,
  citation snapshots, stack traces, credentials, or private URLs. Edition may
  return a bounded editable content preview and bounded validation findings so
  an authenticated editor can review it; provider bodies and unbounded source
  payloads remain excluded.
- Flash approval/rejection carries `observedRevisionNumber` and
  `expectedPublicRevision`. Lifecycle actions carry `expectedPublicRevision`.
  Correction additionally carries `sourceRevisionId` and
  `expectedRevisionSequence`.
- The repository locks the Flash item row before validating versions. Approval
  atomically supersedes the previous approved revision, advances the public
  revision, and appends audit records. A held item stays held after approval.
- Withdrawal is terminal. New revisions, approval, correction, and release may
  not revive a withdrawn item.
- Correction clones the current approved revision's evidence snapshot into a
  new `DRAFT`; approved revision content is never updated in place.
- Mutation responses expose only bounded revision/item lifecycle metadata. The
  client refreshes the workspace after a successful write before reusing a
  concurrency token.
- Every Edition mutation carries `expectedIssueUpdatedAt`; the repository locks
  the issue row before comparing it. Manual draft creation uses the same
  contract rather than an unguarded legacy update. Correction idempotency keys
  are scoped by issue and source revision, and correction appends a new
  revision instead of replacing its source. A correction may only use a
  `PENDING` or `BLOCKED` source revision; applied and discarded revisions are
  terminal and reject further corrections.
- Revalidation is deterministic and provider-free. A valid revision can be
  applied only after validation; application restarts Content Studio review and
  never changes a `PUBLISHED` or `ARCHIVED` draft. `newEvidenceAvailable` is
  derived from remaining pending/blocked revisions, so applying or discarding
  an older revision cannot clear a newer revision's signal.
- Citation snapshots are normalized again when projected into a ContentDraft;
  invalid snapshots fail validation and are never copied into the draft body.

### 4. Validation & Error Matrix

- Missing Studio token -> `401 missing-studio-token`.
- Missing Studio configuration/database -> the existing stable `503` error
  contract.
- Unknown issue id -> `404 ai-daily-issue-not-found`.
- Invalid `limit` -> `400 invalid-ai-daily-workspace-limit`.
- Invalid Flash payload -> stable `400 invalid-ai-daily-flash-*` error.
- Missing Flash item/revision -> stable `404 ai-daily-flash-*-not-found`.
- Stale version, item/revision mismatch, invalid transition, withdrawn item, or
  stale correction source -> stable `409` error; Prisma/database text is not
  returned.
- Missing or malformed Edition action body -> stable
  `400 invalid-ai-daily-generated-*`; manual draft uses
  `400 invalid-ai-daily-content-draft-action`. A stale issue timestamp ->
  `409 ai-daily-generated-issue-conflict`; applying over a changed draft ->
  `409 ai-daily-generated-revision-draft-conflict`.
- The local workspace check uses only in-process fixtures and never calls a
  model, search provider, deployed service, or liveness endpoint.

### 5. Good / Base / Bad Cases

- Good: the editor opens the workspace, switches tabs or Edition ids, sees only
  the latest response, and performs a Flash action using the displayed version
  before the workspace refreshes.
- Base: no token, empty data, or a degraded run produces a concise status or
  empty state without fabricating editorial readiness.
- Bad: React reimplements a server transition, a stale public revision silently
  overwrites newer work, a withdrawn item is revived, an approved revision is
  edited in place, or a response returns raw provider/database details.

### 6. Tests Required

- Run `npm.cmd run studio:ai-daily-workspace-check` and
  `npm.cmd run studio:ai-daily-flash-check` after projection or transition
  fixture changes.
- Run `npm.cmd run check:ui`; the AI Daily fixture must exercise Edition
  correction, revalidation, apply, discard, source-revision retention, and
  desktop/mobile overflow.
- With an explicitly enabled disposable local PostgreSQL `_test` database, run
  `npm.cmd run studio:ai-daily-repository-check` for transaction coverage, and
  run `npm.cmd run ai-daily:generation-repository-check` when the generation
  runner changes. Do not point these checks at production or shared databases.
- When asserting the latest `ContentReview`, order by `reviewedAt DESC, id DESC`;
  `ContentReview` has no `createdAt` column, and equal timestamps need a stable
  id tie-breaker.
- Run `npm.cmd run server:build`, `npm.cmd run lint`, `npm.cmd run build`,
  `npm.cmd run check:ui`, and `git diff --check` before commit.
