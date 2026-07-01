# Blog Draft Workflow Guidelines

These rules cover the repository-owned blog draft script and its public-safe
model channel contract. Read this before changing `scripts/generate-blog-draft.mjs`,
`.env.example` blog draft keys, or the blog content pipeline skill.

## Scenario: Blog Draft Model Channels

### 1. Scope / Trigger

- Trigger: changes to `blog:plan`, `blog:draft`, model-assisted draft generation, `.env.local` loading, or blog draft model environment variables.
- Goal: allow optional model-assisted drafting while keeping the default path deterministic, offline, evidence-first, and safe for public commits.

### 2. Signatures

- `npm.cmd run blog:plan` runs `node scripts/generate-blog-draft.mjs --list`.
- `npm.cmd run blog:draft -- --slug <slug> --force` writes an evidence-first scaffold only.
- `npm.cmd run blog:draft -- --slug <slug> --force --generate --profile <profile>` requests an OpenAI-compatible chat completion.
- Supported profile names are open-ended, but current documented profiles are `default`, `strong`, `fast`, and `review`.
- `BLOG_DRAFT_PROFILE=<profile>` selects a default profile when `--profile` is omitted.

### 3. Contracts

- The script must not call a model unless `--generate` is present.
- Model calls use `POST <BASE_URL>/v1/chat/completions`.
- Per field, resolution order is:
  1. profile-specific `BLOG_DRAFT_<PROFILE>_<FIELD>` when that environment key exists,
  2. default `BLOG_DRAFT_<FIELD>` when that environment key exists,
  3. legacy `GEMINI_<FIELD>` when that environment key exists,
  4. a non-secret fallback where one is safe.
- Fields are `BASE_URL`, `API_KEY`, `MODEL`, `PROVIDER`, and `TEMPERATURE`.
- `API_KEY` is required only for `--generate`.
- `.env.local` may be loaded by the script, but it must not overwrite an already-present `process.env` key, including keys intentionally set to an empty string.
- Committed files may include placeholder variable names only. Never commit real relay URLs, API keys, accounts, private URLs, or local secret paths.

### 4. Validation & Error Matrix

- Missing API key with `--generate` -> fail before network access with a clear missing-key message.
- Invalid temperature -> fall back to a safe numeric default, currently `0.65`.
- No `--generate` -> write scaffold and require no model config.
- Model API failure -> report status and a short response body excerpt, never credentials.
- Existing draft without `--force` -> skip rather than overwrite.
- Generated draft noise from validation, especially `generatedAt`, must not be committed unless the task is intentionally updating that draft.

### 5. Good / Base / Bad Cases

- Good: `--generate --profile strong` uses `BLOG_DRAFT_STRONG_*`; when a key is intentionally empty, the script reports missing API key and does not fall through to private local credentials.
- Base: no `--generate` creates a scaffold with evidence pack, safe facts, forbidden details, model strategy, review gates, and promotion checklist.
- Bad: truthy-checking `process.env[key]` while loading `.env.local`, because an intentionally empty key gets overwritten by private local config.

### 6. Tests Required

- Run `npm.cmd run blog:plan` or the equivalent list path when changing plan parsing.
- Run `npm.cmd run blog:draft -- --slug <known-slug> --force` for scaffold behavior.
- For profile/env changes, run a missing-key check with an intentionally empty `BLOG_DRAFT_<PROFILE>_API_KEY` and confirm it fails before network access.
- Run `npm.cmd run blog:check`, `npm.cmd run lint`, and `npm.cmd run build` before finishing.

### 7. Wrong vs Correct

#### Wrong

```javascript
if (process.env[key]) continue
return process.env.BLOG_DRAFT_API_KEY || process.env.GEMINI_API_KEY
```

This treats an intentionally empty environment variable as absent, so private
`.env.local` values or legacy fallbacks can be used unexpectedly.

#### Correct

```javascript
if (Object.prototype.hasOwnProperty.call(process.env, key)) continue
```

Check key presence, not truthiness, whenever the caller needs to deliberately
disable or override a local model channel.
