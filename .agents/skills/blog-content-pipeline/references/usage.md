# Blog Content Pipeline Usage

Use this reference when setting up the skill, choosing model channels, running
blog draft commands, or deciding whether a post needs generated images.

## Installation And Sync

Recommended standalone source:

```text
git@github.com:Drew-Z/blog-content-pipeline.git
```

Use the repository folder itself as the skill folder. Copy or sync it into a
project-local skill path when needed:

```text
<project>/.agents/skills/blog-content-pipeline/
```

Keep the copied folder shape unchanged:

```text
blog-content-pipeline/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── templates.md
    ├── review-and-prompts.md
    └── usage.md
```

Do not commit real relay URLs, API keys, accounts, private URLs, local secret
paths, production infrastructure details, or private metrics.

## Normal Start: Choose The Writing Mode

Every content run starts by choosing one mode before drafting:

1. `Codex-only scaffold/review` — no model generation. Record `model channel:
   none` in the evidence pack and use repository evidence plus local checks.
2. `model-assisted draft/rewrite` — configure or confirm model profiles before
   generation. Use the guided three-profile setup for important posts; use one
   explicit profile only for small or low-risk drafts.
3. `review-only` — review an existing draft without generating new content.
4. `publish reviewed content` — promote only after review passes.

If the run is `model-assisted`, do not skip setup by treating fallback or legacy
values as good enough. Run masked offline checks, surface any fallback/legacy
warning, and ask the user whether to run setup before generation.

## Model Setup Before Use

Configure private model values in the consuming project, normally in
`.env.local` or an external secret store. Public repositories should only keep
placeholder variable names.

If the consuming project provides a smart-search-like model CLI, prefer it over
manual editing. The beginner wizard should explain roles and examples before it
asks for secrets:

```powershell
npm.cmd run blog:model -- setup
npm.cmd run blog:model -- status --all --format markdown
npm.cmd run blog:model -- doctor --all --format markdown

# Single-profile setup remains available
npm.cmd run blog:model -- setup --profile strong
npm.cmd run blog:model -- setup --profile review --fallback
npm.cmd run blog:model -- setup --profile review --fallback --fallback-index 1
npm.cmd run blog:model -- status --profile strong --format markdown
npm.cmd run blog:model -- doctor --profile strong --format markdown
```

`status` and default `doctor` should be offline and masked. Do not use
`doctor --live` as a casual health check. Run it only after the user explicitly
approves a small blog diagnostic model task; it may spend quota or touch a
private relay, and it must not write or overwrite drafts.

Approved live diagnostic command:

```powershell
npm.cmd run blog:model -- doctor --profile strong --live --format markdown
```

For scripted setup, pass placeholders only in public examples:

```powershell
npm.cmd run blog:model -- setup --non-interactive --profile strong --base-url "https://relay.example.com" --api-key "key" --model "glm-5.2" --provider "glm"
npm.cmd run blog:model -- setup --non-interactive --profile review --base-url "https://relay.example.com" --api-key "key" --model "deepseek-v4-pro" --provider "deepseek"
npm.cmd run blog:model -- setup --non-interactive --profile fast --base-url "https://relay.example.com" --api-key "key" --model "gemini-3.5-flash" --provider "gemini"
npm.cmd run blog:model -- setup --non-interactive --profile review --fallback --fallback-index 1 --base-url "https://relay.example.com" --api-key "key" --model "deepseek-v4-pro" --provider "deepseek-backup"
```

Environment shape:

```text
BLOG_DRAFT_PROFILE=strong
BLOG_DRAFT_BASE_URL=
BLOG_DRAFT_API_KEY=
BLOG_DRAFT_MODEL=
BLOG_DRAFT_PROVIDER=
# Optional advanced value; beginner setup keeps the internal default.
BLOG_DRAFT_TEMPERATURE=0.65

BLOG_DRAFT_STRONG_BASE_URL=
BLOG_DRAFT_STRONG_API_KEY=
BLOG_DRAFT_STRONG_MODEL=glm-5.2-or-gemini-3.1-pro
BLOG_DRAFT_STRONG_PROVIDER=generation-relay
BLOG_DRAFT_STRONG_TEMPERATURE=0.65

BLOG_DRAFT_FAST_BASE_URL=
BLOG_DRAFT_FAST_API_KEY=
BLOG_DRAFT_FAST_MODEL=gemini-3.5-flash
BLOG_DRAFT_FAST_PROVIDER=fast-relay
BLOG_DRAFT_FAST_TEMPERATURE=0.35

BLOG_DRAFT_REVIEW_BASE_URL=
BLOG_DRAFT_REVIEW_API_KEY=
BLOG_DRAFT_REVIEW_MODEL=deepseek-v4-pro
BLOG_DRAFT_REVIEW_PROVIDER=polish-relay
BLOG_DRAFT_REVIEW_TEMPERATURE=0.2

# Optional same-profile fallback channels. Use FALLBACK_2, FALLBACK_3, etc. for
# more backups. These are serial fallbacks for the same role, not cross-role
# fallbacks.
BLOG_DRAFT_REVIEW_FALLBACK_1_BASE_URL=
BLOG_DRAFT_REVIEW_FALLBACK_1_API_KEY=
BLOG_DRAFT_REVIEW_FALLBACK_1_MODEL=deepseek-v4-pro
BLOG_DRAFT_REVIEW_FALLBACK_1_PROVIDER=polish-relay-backup
BLOG_DRAFT_REVIEW_FALLBACK_1_TEMPERATURE=0.2
```

Recommended profile roles:

- Codex: evidence pack, scaffold, generated-text comparison, final fact/safety
  review, and ingestion.
- `strong`: long-form drafting, legacy rewrites, and style-sensitive posts. Use
  GLM-5.2, Gemini 3.1 Pro, or an equivalent strong content channel.
- `review`: polishing after Codex comparison. Use DeepSeek V4 Pro or an
  equivalent model for structure, tone, density, and lower AI-smell rewrites.
- `fast`: outlines, summaries, topic clustering, and low-risk batch checks. Use
  Gemini 3.5 Flash or an equivalent low-cost channel.

Default important-post flow:

```text
Codex evidence pack -> Codex scaffold -> strong profile draft -> Codex compare/fuse -> review profile polish -> Codex final review
```

Default to serial model calls. Single-profile generation is still acceptable for
small or low-risk drafts after evidence and setup gates pass. If parallel
comparison is needed, split calls across separate relays or provider profiles.

Each profile may also define one or more same-profile fallback channels. During
real `--generate` or `--polish-from` runs, the draft script tries the selected
profile's primary channel first, then fallback channels in numeric order when a
channel fails to produce valid content. Fallback is serial and same-role only:
`review` can use `BLOG_DRAFT_REVIEW_FALLBACK_1_*`, but it must not silently use
`strong` or `fast`.

The setup/status tooling should compare fallback model IDs by canonical model
name. Relay-specific namespaces are acceptable when the final model segment
matches: `deepseek-ai/deepseek-v4-pro` is equivalent to `deepseek-v4-pro`.
Only warn when the canonical model IDs differ, because that may be an
intentional but separate same-role fallback.

## Typical Commands

For projects that include `scripts/generate-blog-draft.mjs`:

```powershell
npm.cmd run blog:plan

# Codex-only mode
npm.cmd run blog:draft -- --slug <slug> --force

# Model-assisted mode
npm.cmd run blog:model -- setup
npm.cmd run blog:model -- status --all --format markdown
npm.cmd run blog:model -- doctor --all --format markdown
npm.cmd run blog:draft -- --slug <slug> --force --generate --profile strong
npm.cmd run blog:draft -- --slug <slug> --polish-from content-drafts/<file>.md --profile review
npm.cmd run blog:check
```

The scaffold command does not call a model. Use `--generate` only after the run
is explicitly model-assisted, the evidence pack, safe public facts, uncertain
facts, and forbidden details are complete, and the user has approved generation.
Use `--polish-from` after a first draft exists. By default, long drafts are
polished section-by-section (`BLOG_DRAFT_POLISH_MODE=sections`) instead of as one
monolithic model call. The script sends each section plus a compact evidence
summary to the selected profile, keeps the evidence scaffold in place, writes
local checkpoints under `content-drafts/.checkpoints/`, and writes the polished
body back under `## Draft Body`. Set `BLOG_DRAFT_POLISH_MODE=full` only when one
full-body review call is intentional. `BLOG_DRAFT_REQUEST_TIMEOUT_MS` defaults to
`300000` for slow relay/model channels.

`status` and default `doctor` may report that a selected profile resolves from
fallback or legacy values. Treat that as a setup gap for model-assisted runs:
pause and recommend `setup --profile <profile>` before generation.

If status or doctor reports an incomplete same-profile fallback channel, either
finish configuring it with `setup --profile <profile> --fallback --fallback-index
<n>` or remove the partial `BLOG_DRAFT_<PROFILE>_FALLBACK_<N>_*` keys from the
private env file. Partial fallback channels should not silently fall through to
another role.

For public promotion, run the consuming project's public-content checks, for
example:

```powershell
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run assistant:index
npm.cmd run sitemap:generate
npm.cmd run lint
npm.cmd run build
```

## Task Routes

- New post: choose a column, build an evidence pack, generate or write a draft,
  then review before promotion.
- Legacy rewrite: use archived text only as raw material, rebuild evidence from
  current code/docs/data, and publish only a fresh rewrite.
- Draft review: check facts, safety, column fit, project-page overlap, voice,
  image assets, and promotion readiness.
- Public promotion: convert reviewed content into the consuming project's typed
  blog data and regenerate public indexes.

## Image Generation Policy

Images are useful when they help readers understand or remember the post. They
are not required for every post, and they must not replace evidence.

Use this priority order:

1. Real project screenshots when the UI or state is safe to show publicly.
2. Self-made diagrams for architecture, data flow, workflow, and decision trees.
3. Licensed or source-attributed images for resource sharing or news context.
4. Generated images for covers, mood-setting, or abstract concepts only.

Generate images when:

- the post needs a cover or visual hook but has no real screenshot;
- the topic is conceptual and a metaphorical image helps orientation;
- the generated image is clearly decorative or illustrative.

Prefer screenshots or diagrams when:

- the post is a project case page or project-summary post;
- readers need to inspect real UI, architecture, workflow, or output;
- the image supports a factual claim.

Do not generate:

- fake product screenshots or dashboards;
- fake metrics, logs, charts, customer logos, or deployment states;
- images that imply a feature exists when it is only planned;
- copyrighted or brand-confusing lookalikes.

Every image should record:

- source type: screenshot, diagram, licensed image, or generated image;
- purpose in the post;
- alt text;
- public-safety review result;
- whether it is evidence or decoration.

Generated image prompts should be stored as draft notes when they influence a
published asset. Keep them free of private product names, customer data, private
URLs, account names, IPs, metrics, and local paths.

## Review Before Publishing

Before promoting any post:

- every factual claim traces to evidence;
- generated text has been edited by Codex or the author;
- no private details are present;
- images are labeled by source type and safe to publish;
- generated images are not presented as screenshots or evidence;
- project-page overlap has been checked;
- the final article fits its column.
