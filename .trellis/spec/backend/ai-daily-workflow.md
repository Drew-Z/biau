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
