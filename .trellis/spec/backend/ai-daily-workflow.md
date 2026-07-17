# AI Daily Workflow Guidelines

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
