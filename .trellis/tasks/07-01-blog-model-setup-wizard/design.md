# Design

## Architecture

Add a small CLI layer around the existing blog draft model profile contract.

- `scripts/blog-model-config.mjs`: shared model-profile helpers used by the
  draft generator and the setup wizard.
- `scripts/configure-blog-model.mjs`: smart-search-like CLI for setup, status,
  doctor, and config path.
- `scripts/generate-blog-draft.mjs`: imports shared config helpers instead of
  owning separate profile/env resolution logic.
- `package.json`: exposes npm scripts for the wizard and the check path.

## Command Shape

Primary command:

```powershell
npm.cmd run blog:model -- setup --profile strong
npm.cmd run blog:model -- status --profile strong --format markdown
npm.cmd run blog:model -- status --profile strong --format json
npm.cmd run blog:model -- doctor --profile strong --format markdown
npm.cmd run blog:model -- doctor --profile strong --live --format markdown
npm.cmd run blog:model -- config path --format json
```

Convenience aliases:

```powershell
npm.cmd run blog:model:wizard -- --profile strong
npm.cmd run blog:model:check -- --profile strong --format markdown
```

`status` is offline and shows profile status only: profile, non-secret provider
label, model id, temperature, and whether required private values are set. It
must not print the real base URL or API key.

`doctor` loads config and validates required values offline by default. Add
`--live` to send a minimal OpenAI-compatible chat completion request. It does
not write or overwrite any draft. This mirrors the `smart-search doctor`
posture: diagnose first, then show clear recovery guidance.

`config path` reports where the private file would be written. It should be
safe for agent parsing.

## Environment Contract

The shared resolver keeps the existing order:

1. `BLOG_DRAFT_<PROFILE>_<FIELD>`
2. `BLOG_DRAFT_<FIELD>`
3. legacy `GEMINI_<FIELD>`
4. safe non-secret fallback where allowed

The wizard writes only profile-specific `BLOG_DRAFT_<PROFILE>_*` keys for named
profiles and `BLOG_DRAFT_*` keys for `default`.

## Safety

- `.env.local` is the default write target.
- Existing secret values are never printed; they are shown as set/missing.
- API key input should use a hidden prompt in TTY mode.
- If no TTY is available, the interactive wizard should fail clearly instead of
  accepting secrets through visible logs.
- Status/doctor output may include profile, provider label, model id,
  temperature, resolution source, HTTP status for `--live`, and a short
  redacted upstream error excerpt. It must never include API keys,
  Authorization headers, or real base URLs.
- Prefer `--format json` for agent parsing and `--format markdown` for human
  diagnostics, matching the smart-search pattern.

## Tradeoffs

- This task intentionally avoids fallback. A successful wizard/check path gives
  a stable baseline before adding fallback complexity.
- The live doctor request may spend a tiny amount of model quota, so it requires
  explicit `--live` and remains separate from draft generation.

## Rollback

Rollback is straightforward:

- remove `scripts/configure-blog-model.mjs`
- remove shared helper imports and restore local config helpers in
  `scripts/generate-blog-draft.mjs`
- remove the npm scripts and docs updates
