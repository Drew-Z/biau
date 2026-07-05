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
- Convert with no selected sources -> `409 { error: "ai-daily-issue-needs-sources" }`.
- Duplicate derived slug -> `409 { error: "duplicate-slug" }`.

### 5. Good/Base/Bad Cases

- Good: editor opens `/studio/ai-daily/<id>`, adds three source cards, writes `summary`, `publicAngle`, `keySignals`, and `toVerify`, saves, then converts to a hidden review-needed draft.
- Good: a converted issue stores source-card blocks in `bodyJson` so the Studio draft preview and export path see the same evidence scaffold.
- Base: a fresh issue has empty `briefJson`; the page shows a safe JSON template and waits for manual editing.
- Bad: conversion marks the draft approved, featured, published, or model-assisted without human review.
- Bad: the frontend stores or displays `STUDIO_DATABASE_URL`, `DATABASE_URL`, model provider URLs, API keys, or raw backend stack traces.

### 6. Tests Required

- Run `npm.cmd run prisma:validate` after schema or Studio route changes.
- Run `npm.cmd run server:build`, `npm.cmd run server:smoke`, and `npm.cmd run assistant:service-modes-smoke` after changing Studio API contracts.
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
