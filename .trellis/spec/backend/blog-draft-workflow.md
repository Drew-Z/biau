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
- `npm.cmd run blog:draft -- --slug <slug> --polish-from content-drafts/<file>.md --profile review` requests an OpenAI-compatible review/polish pass using the existing draft body.
- `npm.cmd run blog:model -- setup` runs the smart-search-style interactive
  private model setup wizard for `strong`, `review`, and `fast`.
- `npm.cmd run blog:model -- setup --profile <profile>` configures one profile.
- `npm.cmd run blog:model -- setup --profile <profile> --fallback` configures
  one same-profile fallback channel.
- `npm.cmd run blog:model -- setup --profile <profile> --fallback --fallback-index <n>`
  updates a specific same-profile fallback channel.
- `npm.cmd run blog:model -- setup --non-interactive --profile <profile> --base-url <url> --api-key <key> --model <id> --provider <label>` saves one profile without prompts.
- `npm.cmd run blog:model -- setup --non-interactive --profile <profile> --fallback --fallback-index <n> --base-url <url> --api-key <key> --model <id> --provider <label>`
  saves one same-profile fallback channel without prompts.
- `npm.cmd run blog:model -- status --profile <profile> --format json|markdown` prints masked offline profile status.
- `npm.cmd run blog:model -- status --all --format json|markdown` prints masked offline status for the recommended three-profile flow.
- `npm.cmd run blog:model -- doctor --profile <profile> --format json|markdown` performs an offline channel configuration check without writing drafts.
- `npm.cmd run blog:model -- doctor --all --format json|markdown` performs offline checks for the recommended three-profile flow without sending model requests.
- `npm.cmd run blog:model -- doctor --profile <profile> --live --format json|markdown` performs an explicit approved small blog diagnostic model task without writing drafts.
- `npm.cmd run blog:model -- config path --format json|markdown` reports the private env target without printing secret values.
- Supported profile names are open-ended, but current documented profiles are `default`, `strong`, `fast`, and `review`.
- `BLOG_DRAFT_PROFILE=<profile>` selects a default profile when `--profile` is omitted.

### 3. Contracts

- Every normal blog content run starts with a mode gate:
  `Codex-only scaffold/review`, `model-assisted draft/rewrite`, `review-only`,
  or `publish reviewed content`.
- `Codex-only scaffold/review` must record the selected mode and `model channel:
  none` in the evidence pack. It must not force model setup.
- `model-assisted draft/rewrite` must ask the user to set or confirm model
  profiles before generation. The normal guided setup command is
  `npm.cmd run blog:model -- setup`, followed by masked offline
  `status --all` and `doctor --all`. Single-profile setup remains valid for
  small or low-risk drafts.
- Model-assisted runs must use masked offline `status` / `doctor` before
  generation. If the selected profile resolves from fallback or legacy values,
  the workflow should pause and recommend setup before `--generate`.
- `review-only` may skip model setup unless new model output is requested.
- `publish reviewed content` must only promote content that already passed the
  evidence, safety, column-fit, and public visibility gates.
- The script must not call a model unless `--generate` is present.
- `--polish-from` is also a live model request. It must only run after explicit
  approval, must preserve the existing evidence scaffold, and must replace only
  the visitor-readable body under `## Draft Body`.
- `--polish-from` must also update frontmatter/model-strategy evidence and
  review-gate wording so a polished draft never still claims `model channel:
  none` or "No live blog model generation or polish happened".
- `--polish-from` defaults to section-level polishing (`BLOG_DRAFT_POLISH_MODE=sections`)
  so long articles do not depend on one monolithic relay response. Set
  `BLOG_DRAFT_POLISH_MODE=full` only for intentional full-body review calls.
- Section-level polishing must keep structured handoffs small: pass only the
  safe facts, uncertain facts, forbidden details, compare/fuse notes, the
  section title/order, and the section body. Do not resend the entire evidence
  scaffold to every model call.
- Section-level polishing writes local checkpoints under
  `content-drafts/.checkpoints/`, which is ignored by git. If one section fails
  after all same-profile channels, keep that section's original prose, report
  the issue, and continue polishing later sections.
- Model calls use OpenAI-compatible chat completions. The script accepts either
  a relay root URL or a URL ending in `/v1` and calls the corresponding
  `/chat/completions` endpoint without duplicating `/v1`.
- Per field, resolution order is:
  1. profile-specific `BLOG_DRAFT_<PROFILE>_<FIELD>` when that environment key exists,
  2. default `BLOG_DRAFT_<FIELD>` when that environment key exists,
  3. legacy `GEMINI_<FIELD>` when that environment key exists,
  4. a non-secret fallback where one is safe.
- Same-profile fallback channels use indexed keys:
  `BLOG_DRAFT_<PROFILE>_FALLBACK_<N>_<FIELD>`. Real `--generate` and
  `--polish-from` runs try the primary channel first, then fallback channels in
  numeric order after a channel failure. Fallback is serial and same-role only;
  a failed `review` run must not silently switch to `strong` or `fast`.
- Fallback model-id comparison must canonicalize relay namespaces by comparing
  the final slash-delimited model segment. For example,
  `deepseek-ai/deepseek-v4-pro` and `deepseek-v4-pro` are the same model ID for
  fallback warning purposes, while different canonical IDs should still warn.
- Fields are `BASE_URL`, `API_KEY`, `MODEL`, `PROVIDER`, and `TEMPERATURE`.
  `TEMPERATURE` is an advanced optional setup field; internal defaults remain
  active when it is not configured.
- `API_KEY` is required only for `--generate`.
- `.env.local` may be loaded by the script, but it must not overwrite an already-present `process.env` key, including keys intentionally set to an empty string.
- Committed files may include placeholder variable names only. Never commit real relay URLs, API keys, accounts, private URLs, or local secret paths.
- `status` and `doctor` must not print real relay URLs or API keys. They may print
  profile, non-secret provider label, model id, temperature, source key names,
  status code, and a short redacted upstream error excerpt.

### 4. Validation & Error Matrix

- No mode selected at the start of a content run -> stop and ask for the writing
  mode before drafting or generation.
- Codex-only mode with no configured model -> proceed with scaffold/review and
  record `model channel: none`.
- Model-assisted mode with fallback/legacy profile resolution -> warn, recommend
  `blog:model setup --profile <profile>`, and do not treat the profile as fully
  confirmed unless the user explicitly accepts that risk.
- Model-assisted important-post flow -> record Codex evidence/scaffold,
  `strong` generation, `review` polishing, and Codex final fact/safety review.
- Missing API key with `--generate` -> fail before network access with a clear missing-key message.
- Invalid temperature -> fall back to a safe numeric default, currently `0.65`.
- No `--generate` -> write scaffold and require no model config.
- `--polish-from` with no `## Draft Body` -> fail before network access because
  the script cannot safely separate evidence from visitor-readable prose.
- Model API failure -> report status and a short response body excerpt, never credentials.
- Model timeout -> report the non-secret provider/model label and timeout
  duration. Long-form drafting/review defaults to `BLOG_DRAFT_REQUEST_TIMEOUT_MS=300000`;
  users may increase it in private env for slow relays.
- Primary-channel failure with configured same-profile fallback channels -> try
  fallback channels serially, print only non-secret provider/model labels and
  failure kinds, and record the winning channel label in `generatedBy`.
- Model route failure such as `unknown provider for model <id>` -> treat as a
  channel configuration problem, not a content-quality problem. Do not silently
  fall back during a dry run; record the profile, non-secret provider label,
  model id, status code, and suggested configuration fix.
- `doctor` without `--live` -> perform config validation only and report that no
  model request was sent.
- `doctor --live` -> may spend model quota or touch a private relay and must be
  treated as an explicit approved small blog diagnostic task, never a
  casual/default health check.
- Existing draft without `--force` -> skip rather than overwrite.
- Generated draft noise from validation, especially `generatedAt`, must not be committed unless the task is intentionally updating that draft.

### 5. Good / Base / Bad Cases

- Good: `--generate --profile strong` uses `BLOG_DRAFT_STRONG_*`; when a key is intentionally empty, the script reports missing API key and does not fall through to private local credentials.
- Base: no `--generate` creates a scaffold with evidence pack, safe facts, forbidden details, model strategy, review gates, and promotion checklist.
- Bad: truthy-checking `process.env[key]` while loading `.env.local`, because an intentionally empty key gets overwritten by private local config.

### 5.1 Custom Draft Template Convention

- Custom article templates are allowed for draft content, but they must not remove
  the evidence scaffold headings that `blog:check` treats as the public-safety
  contract.
- Model-generated content from `--generate` must be wrapped by the script in the
  same evidence scaffold; do not rely on the model to reproduce required
  headings correctly.
- Keep these headings intact for evidence drafts: `## Evidence Pack`,
  `## Safe Public Facts`, `## Uncertain Or Stale Facts`,
  `## Forbidden / Private Details`, `## Draft Brief`, `## Article Outline`,
  `## Review Gates`, and `## Promotion Checklist`.
- Put visitor-readable long-form content under an additional heading such as
  `## Draft Body` when a user asks for a custom writing structure.
- Put model-generated long-form content under `## Draft Body`. Strip a duplicate
  leading H1 from the model body when needed so the draft keeps one canonical
  title at the top.
- Use `## Article Outline` to record the selected template, including bilingual
  labels when useful. This keeps custom templates visible without confusing them
  with the machine-checked safety sections.

#### Wrong

```markdown
## 问题起点
...

## 关键决策
...
```

The draft may read well, but `blog:check` can no longer tell whether evidence,
unsafe facts, review gates, and promotion boundaries are present.

#### Correct

```markdown
## Evidence Pack
...

## Article Outline
- 问题起点 / Problem
- 关键决策 / Decision

## Draft Body

### 问题起点
...
```

The custom structure is still visible to the author and reader, while the
evidence-first contract remains testable.

#### Correct Generated Draft Shape

```markdown
## Evidence Pack
...

## Promotion Checklist
...

## Draft Body

### Model-generated article title or first section
...
```

The model body may be stylistically good, but the script owns the safety
headings. This prevents a successful model call from creating a draft that
cannot enter the review pipeline.

### 6. Tests Required

- Run `npm.cmd run blog:plan` or the equivalent list path when changing plan parsing.
- Run `npm.cmd run blog:draft -- --slug <known-slug> --force` for scaffold behavior.
- For generated draft changes, run one approved `--generate` flow or a targeted
  fixture proving model body text is wrapped under the evidence scaffold and
  passes `blog:check`.
- For polish changes, run one approved `--polish-from` flow or a targeted fixture
  proving only `## Draft Body` is replaced and the evidence scaffold remains
  intact.
- For profile/env changes, run a missing-key check with an intentionally empty `BLOG_DRAFT_<PROFILE>_API_KEY` and confirm it fails before network access.
- For model channel setup tooling, verify it masks existing secret values, writes
  only to `.env.local` or another explicitly private target, supports
  `json|markdown` output for status/doctor, and can check the selected profile
  without overwriting drafts.
- For guided setup changes, verify `setup`, `setup --profile <profile>`,
  `setup --non-interactive`, `status --all`, and `doctor --all`.
- Verify default `doctor` completes offline. Do not run `doctor --live` unless
  the user explicitly approves a small model task or asks to test the relay.
- Run `npm.cmd run blog:check`, `npm.cmd run lint`, and `npm.cmd run build` before finishing.

### 7. Wrong vs Correct

#### Wrong

```powershell
npm.cmd run blog:model -- doctor --profile strong
```

This should not send a relay/model request. A default diagnostic command is too
easy to run during validation and can spend quota or touch an unintended
provider.

#### Correct

```powershell
npm.cmd run blog:model -- doctor --profile strong --format markdown
npm.cmd run blog:model -- doctor --profile strong --live --format markdown
```

The first command is offline. The second command sends an approved small blog
diagnostic task and should only be run when the user has approved live
validation.

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

### 8. Model Setup Wizard Contract

The dry-run workflow has a secrets-safe setup path before fallback logic is
added.

Behavior:

- Beginner setup configures the recommended three-profile flow:
  `strong` for generation, `review` for polish, and `fast` for low-risk helper
  work. Single-profile and custom profile setup remain available.
- Beginner setup asks whether to configure optional same-profile fallback
  channels after each primary profile. Default answer is no.
- Prompt for `BASE_URL`, `API_KEY`, `MODEL`, and `PROVIDER` in beginner setup.
  Prompt for `TEMPERATURE` only in advanced setup or non-interactive flags.
- Provide smart-search-like subcommands: `setup`, `status`, `doctor`, and
  `config path`.
- Show model recommendations and field examples before asking for values.
- Show existing private values only as set/missing/configured; model ids and
  provider labels may be shown because they are non-secret labels.
- Write private values to `.env.local` or an explicitly provided private env
  file; never to tracked docs or examples.
- Offer `status` and default `doctor` for offline masked inspection, and
  `doctor --live` only as an approved small blog diagnostic model task without
  writing or overwriting a draft.
- Print actionable failures, but never print API keys, real relay URLs, account
  names, private paths, or request headers.
