# Design: Blog Model Wizard And Multi-Model Flow

## Scope

Improve the local blog content pipeline so a model-assisted run behaves like a
usable product workflow instead of a raw env-key editor.

This task owns:

- `scripts/configure-blog-model.mjs` setup UX and CLI flags.
- `scripts/blog-model-config.mjs` profile metadata and optional temperature
  handling.
- `scripts/generate-blog-draft.mjs` generation strategy metadata and staged
  profile support if needed for an end-to-end normal run.
- `content-drafts/README.md` and `blog-content-pipeline` skill references.
- The active Trellis task artifacts and any spec updates learned from the work.

This task does not publish a blog post or commit real credentials.

## Smart-Search Pattern To Borrow

Smart-search setup provides the benchmark for this wizard:

- Beginner flow first, low-level keys only in `--advanced`.
- Grouped configuration with capability/role names instead of env var names.
- Examples before prompts, written to stderr.
- `--non-interactive` flags for scripted setup.
- Hidden secret entry using a proven terminal secret prompt or fail-closed
  behavior when the terminal cannot hide input.
- Masked status/doctor output.
- Final summary with missing capabilities and next-step commands.

The blog pipeline should adapt this pattern to content-generation roles rather
than search capabilities.

## Model Roles

Use three configured blog profiles plus Codex:

| Role | Profile | Default Recommendation | Purpose |
| --- | --- | --- | --- |
| Evidence and final review | Codex | Current session | Build evidence pack, scaffold, compare outputs, final safety/fact review |
| Generation | `strong` | GLM-5.2 or Gemini 3.1 Pro | Produce the main Chinese technical draft from evidence |
| Polish | `review` | DeepSeek V4 Pro | Rewrite for structure, tone, density, and low-AI prose |
| Fast helper | `fast` | Gemini 3.5 Flash | Titles, outlines, summaries, low-risk batch checks |

The wizard should present these as recommendations, not hard-coded provider
truth. The user can set any OpenAI-compatible relay/model ids.

## CLI Shape

Keep existing commands working:

```powershell
npm.cmd run blog:model -- setup --profile strong
npm.cmd run blog:model -- status --profile strong --format markdown
npm.cmd run blog:model -- doctor --profile strong --format markdown
```

Add or formalize:

```powershell
npm.cmd run blog:model -- setup
npm.cmd run blog:model -- setup --profile strong --advanced
npm.cmd run blog:model -- setup --all
npm.cmd run blog:model -- setup --non-interactive --profile strong --base-url "..." --api-key "..." --model "..." --provider "..."
npm.cmd run blog:model -- status --all --format markdown
npm.cmd run blog:model -- doctor --all --format markdown
```

Beginner `setup` should guide through `strong`, `review`, and `fast` in that
order. It should show examples and allow skipping a role while preserving
existing values.

## Field Semantics

Beginner prompts should use role labels and examples:

- Base URL: private OpenAI-compatible relay base URL. Accept either root URL or
  `/v1`; normalize only duplicate trailing slashes. Explain that the draft
  client calls `/chat/completions` under the OpenAI-compatible API path.
- Model ID: exact relay model id, for example `glm-5.2`, `deepseek-v4-pro`, or
  `gemini-3.1-pro`.
- Provider label: non-secret display label, for example `glm`, `deepseek`, or
  `relay-main`.
- API key: secret token, hidden input only.
- Temperature: advanced optional field. Defaults remain internal and should not
  block beginner setup.

## Secret Handling

Secret entry must be fail-closed:

- If stdin/stderr are not TTY, interactive setup refuses to collect secrets.
- If hidden input is unsupported, setup tells the user to use a secure terminal
  or non-interactive flags from their own shell history policy.
- `status`, `doctor`, setup summaries, errors, and draft metadata never print
  raw API keys or private relay URLs.
- Public docs may show placeholder values only.

## Generation Strategy

The recommended model-assisted flow becomes:

```text
Codex evidence pack
-> Codex scaffold / draft A
-> strong profile model draft B
-> Codex compare and fuse
-> review profile polishing pass
-> Codex final fact/safety review
```

Implementation can be incremental. The first acceptable implementation may
make the CLI and docs support all roles and produce separate model outputs;
Codex performs comparison/fusion manually. A later version may automate compare
and polish commands.

## Compatibility

- Existing `BLOG_DRAFT_STRONG_*`, `BLOG_DRAFT_FAST_*`, `BLOG_DRAFT_REVIEW_*`,
  default `BLOG_DRAFT_*`, and legacy `GEMINI_*` resolution continue to work.
- Fallback/legacy warnings remain visible for named profiles.
- Existing single-profile `blog:draft -- --generate --profile strong` remains
  valid for small/simple drafts, but no longer described as the default best
  practice for important posts.

## Validation

Minimum checks:

- `npm.cmd run blog:model -- --help` or equivalent help path includes new flags.
- `npm.cmd run blog:model -- status --all --format markdown` masks secrets and
  shows role/profile status.
- `npm.cmd run blog:model -- doctor --all --format markdown` stays offline by
  default and reports no live request was sent.
- Non-interactive setup can be tested against a temporary env file using
  placeholder values, then status/doctor can read that temp file without leaking
  the placeholders.
- `npm.cmd run blog:check`, `npm.cmd run lint`, and targeted script tests pass.
