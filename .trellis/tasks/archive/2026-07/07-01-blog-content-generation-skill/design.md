# Design

## Current Shape

`blog-content-pipeline` is already the right skill to keep. The surrounding repo has most of the machinery:

- `scripts/blog-rewrite-plan.json` lists planned draft topics.
- `npm.cmd run blog:plan` previews the plan.
- `npm.cmd run blog:draft` creates an evidence-first Markdown scaffold.
- `content-drafts/` stores draft material before promotion.
- `content-archive/legacy-blog/rewrite-queue.json` stores archived generated posts.
- public runtime posts are controlled by `src/data/blog.ts`, `src/data/blogContent.ts`, and `src/data/blogCuration.ts`.

The missing piece is not another generator. The missing piece is an AI-facing SOP that tells Codex exactly which path to take for each content task.

## Target Skill Shape

Keep `SKILL.md` concise and move detailed reusable structures into references.

Recommended skill layout:

```text
.agents/skills/blog-content-pipeline/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── templates.md
    └── review-and-prompts.md
```

`SKILL.md` owns:

- trigger scope and public safety rule
- routing by task type
- evidence-first workflow
- model strategy
- publish/stage commands
- which reference to read and when

`references/templates.md` owns:

- five column templates
- each column's goal, evidence, shape, failures, and review gates

`references/review-and-prompts.md` owns:

- content input protocol
- model handoff prompt shape
- Codex review checklist
- legacy rewrite checklist
- promotion checklist

## Task Routes

1. **Plan a new post**: pick column, create evidence pack, optionally generate draft scaffold.
2. **Rewrite legacy post**: select from `content-archive/legacy-blog/rewrite-queue.json`, read archived post as source material, rebuild evidence, create fresh draft.
3. **Review a draft**: check facts, sensitive details, column fit, duplication, structure, and promotion readiness.
4. **Publish a reviewed post**: convert to typed `BlogPost`, add summary, loader, optional curation, regenerate assistant/sitemap, run checks.

## Model Strategy

Default:

```text
Codex evidence pack -> one strong content model draft/rewrite -> Codex fact/safety/style review -> staged draft or public data update
```

Multi-model comparison is exceptional, not default. Use it only when:

- the post is important enough to justify extra review,
- voice/style is uncertain,
- technical framing is disputed,
- a low-cost model can cheaply produce outlines before a strong model writes long form.

Never run concurrent calls through one relay by default.

## Model Channel Configuration

The repository should define the channel contract without committing real channels. Use public placeholders in `.env.example` and private values in `.env.local`.

Recommended generic draft model variables:

```text
BLOG_DRAFT_BASE_URL=
BLOG_DRAFT_API_KEY=
BLOG_DRAFT_MODEL=
BLOG_DRAFT_TEMPERATURE=0.65
BLOG_DRAFT_PROVIDER=
```

`scripts/generate-blog-draft.mjs` can read the generic variables first and fall back to the existing `GEMINI_*` variables. This preserves current behavior while allowing GLM, DeepSeek, Gemini, or another OpenAI-compatible relay to be selected without changing code.

Recommended role mapping:

- **Default long-form drafting / rewriting**: one strong content model such as GLM-5.2, DeepSeek V4 Pro, or Gemini 3.1 Pro.
- **Outline / summary / low-risk batch check**: fast model such as Gemini 3.5 Flash or an equivalent low-cost channel.
- **Review and ingestion**: Codex, using project evidence and repo contracts.
- **Multi-model comparison**: only for important posts, style uncertainty, or disputed framing. If run concurrently, split across different relays or provider profiles.

Image generation channels are not configured in this task. The skill may describe when to create image prompts or request image generation, but actual image provider setup remains separate.

## Validation

This task mostly changes markdown skill artifacts, but because the skill points at repo scripts and public content gates, run:

- `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft --force`
- `npm.cmd run blog:check`
- `npm.cmd run lint`
- `npm.cmd run build`

Also perform a basic skill structure check by parsing `SKILL.md` frontmatter and confirming referenced files exist. Do not run `--generate` unless local private model credentials are intentionally configured.

## Rollback

Revert changes under `.agents/skills/blog-content-pipeline/` and the Trellis task archive commit. No runtime blog data should change in this task.
