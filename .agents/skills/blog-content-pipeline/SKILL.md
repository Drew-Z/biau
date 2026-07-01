---
name: blog-content-pipeline
description: "Evidence-first workflow for planning, drafting, rewriting, reviewing, and publishing BIAU Port blog content. Use when creating or improving posts for 知识积累 / Project Notes / 资源分享 / AI 日报 / 构建手记, reviving legacy posts from content-archive/legacy-blog, reviewing content-drafts, choosing model channels for blog generation, updating blog templates/review gates, or promoting reviewed drafts into public blog data, assistant tags, sitemap, and curation."
---

# Blog Content Pipeline

Use this skill to produce polished public blog content without turning the site into an automated SEO farm. Treat every committed article as public.

## Core Rule

Never let a model invent project facts, deployment status, metrics, screenshots, customer names, secrets, private URLs, API keys, local paths, or production infrastructure details.

## Route The Task

- **Plan or draft a new post**: read `src/data/blogShared.ts`, then read `references/templates.md` for the target column. Use `npm.cmd run blog:plan` and `npm.cmd run blog:draft -- --slug <slug> --force` when the topic exists in `scripts/blog-rewrite-plan.json`.
- **Rewrite a legacy post**: read `content-archive/legacy-blog/rewrite-queue.json`, then inspect the archived source under `content-archive/legacy-blog/posts/`. Treat it as raw material only; rebuild evidence before drafting.
- **Review an existing draft**: read the draft in `content-drafts/`, then use `references/review-and-prompts.md` for fact, safety, structure, and promotion gates.
- **Publish reviewed content**: update typed runtime data only after review: `src/data/blog.ts`, `src/data/blog-posts/<slug>.ts`, `src/data/blogContent.ts`, and `src/data/blogCuration.ts` as needed.

## Evidence Pack First

Before drafting, capture:

- target column and intended reader
- source paths or URLs read
- exact facts safe to publish
- uncertain or stale facts
- forbidden/private details
- project-page overlap risk
- intended model strategy

For project-related posts, do not rely only on README files. Read code, public project data, tests, deployment scripts, screenshots, Trellis task notes, and existing project pages.

## Model Channels

Default strategy:

```text
Codex evidence pack -> one strong content model draft/rewrite -> Codex review/edit/ingest
```

- Long-form drafting or rewriting: use the `strong` profile with one strong content model such as GLM-5.2, DeepSeek V4 Pro, Gemini 3.1 Pro, or an equivalent configured channel.
- Outlines, summaries, or low-risk batch checks: use the `fast` profile with Gemini 3.5 Flash or an equivalent low-cost model.
- Review experiments: use the `review` profile only after Codex has completed evidence and safety review; do not treat model review as authority.
- Multi-model comparison is exceptional: use it only for important posts, style uncertainty, or disputed framing.
- Default to serial calls. If parallel model use is necessary, split across different relays or provider profiles.
- Store real relay URLs and API keys only in `.env.local` or external configuration. Public repo files may contain placeholders only.

Draft generation uses OpenAI-compatible chat completions. Prefer named `BLOG_DRAFT_*` profiles; old `GEMINI_*` variables remain fallback:

```text
BLOG_DRAFT_PROFILE=strong
BLOG_DRAFT_BASE_URL=
BLOG_DRAFT_API_KEY=
BLOG_DRAFT_MODEL=
BLOG_DRAFT_PROVIDER=
BLOG_DRAFT_TEMPERATURE=0.65

BLOG_DRAFT_STRONG_BASE_URL=
BLOG_DRAFT_STRONG_API_KEY=
BLOG_DRAFT_STRONG_MODEL=
BLOG_DRAFT_STRONG_PROVIDER=
BLOG_DRAFT_STRONG_TEMPERATURE=0.65

BLOG_DRAFT_FAST_BASE_URL=
BLOG_DRAFT_FAST_API_KEY=
BLOG_DRAFT_FAST_MODEL=
BLOG_DRAFT_FAST_PROVIDER=
BLOG_DRAFT_FAST_TEMPERATURE=0.35

BLOG_DRAFT_REVIEW_BASE_URL=
BLOG_DRAFT_REVIEW_API_KEY=
BLOG_DRAFT_REVIEW_MODEL=
BLOG_DRAFT_REVIEW_PROVIDER=
BLOG_DRAFT_REVIEW_TEMPERATURE=0.2
```

Use `npm.cmd run blog:draft -- --slug <slug> --force --generate --profile strong` for long-form drafts. If a named profile is missing a value, the script falls back to the default `BLOG_DRAFT_*` channel, then legacy `GEMINI_*`.

Do not run `blog:draft -- --generate` unless the evidence pack is complete and a private model channel is intentionally configured.

## Draft Shape

Prefer Markdown or structured notes during drafting, then convert reviewed content into the typed `BlogPost` shape. Keep title, detail, sections, takeaways, knowledge points, and tags concrete.

Avoid generic AI prose, resume/interview tone, learning-day framing, empty listicles, and public claims that are not supported by the evidence pack.

## Review Gates

Read `references/review-and-prompts.md` when drafting with a model, reviewing a draft, or promoting content.

Minimum gates:

- every factual claim is backed by evidence
- no private or sensitive information is included
- the post does not duplicate a project detail page
- the column matches the article purpose
- legacy source material has been rewritten, not copied directly
- hidden drafts remain hidden unless explicitly curated

## Publish Or Stage

Stage drafts under `content-drafts/`. Public posts must go through `blogCuration` and public selectors.

For public visibility or tag changes, run:

```powershell
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run assistant:index
npm.cmd run sitemap:generate
npm.cmd run lint
npm.cmd run build
```

Attempt `npm.cmd run verify` for broad blog, assistant, or UI changes.
