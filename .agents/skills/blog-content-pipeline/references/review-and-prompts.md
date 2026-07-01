# Blog Review And Prompt Protocol

Use this reference when handing evidence to a content model, reviewing a draft, rewriting legacy material, or promoting a post.

## Input Protocol

Collect this before drafting:

- Writing mode: `Codex-only scaffold/review`, `model-assisted draft/rewrite`,
  `review-only`, or `publish reviewed content`.
- Column: `knowledge`, `project-notes`, `resources`, `ai-daily`, or `build-log`.
- Target reader and reader value.
- Evidence sources read.
- Safe public facts.
- Uncertain or stale facts.
- Forbidden/private details.
- Related project page or prior post.
- Desired output: scaffold, model draft, rewrite, review, or publish.
- Model channels: configured non-secret provider/model labels for Codex,
  `strong`, `review`, and optionally `fast`; use `none` for Codex-only
  scaffold/review.
- Model setup status: whether `setup`, masked `status`, and offline `doctor`
  were run for model-assisted drafting; record fallback/legacy warnings without
  exposing secrets.

## Model Handoff Prompt

Use the staged model-assisted flow for important posts:

```text
Codex evidence pack -> Codex scaffold -> strong profile draft -> Codex compare/fuse -> review profile polish -> Codex final review
```

Single-profile generation is acceptable for small or low-risk drafts after the
same evidence and setup gates pass.

```text
Write a public Chinese technical blog draft for BIAU Port.

Writing mode: model-assisted draft/rewrite
Column: <column zh/en>
Title: <title>
Target reader: <reader>
Reader value: <why this is worth publishing>
Model channel: <strong profile non-secret provider/model label only>

Evidence sources:
<paths or URLs>

Safe public facts:
<facts>

Uncertain or stale facts:
<facts that must be hedged or omitted>

Forbidden/private details:
<secrets, private URLs, accounts, local paths, sensitive metrics>

Required shape:
<column template>

Hard rules:
- Do not invent facts, metrics, deployment state, customer names, screenshots, or private infrastructure.
- Do not expose forbidden details.
- Do not write resume/interview/study-diary prose.
- If a claim is not supported by evidence, omit it or mark it as a question for the author.
- Output Markdown body only.
```

## Codex Review Checklist

- Facts: every project claim traces to evidence.
- Safety: no keys, tokens, private URLs, IPs, accounts, database URLs, signing paths, customer names, sensitive metrics, or local secret paths.
- Column fit: the article purpose matches its `BlogColumn`.
- Project-page overlap: stable capability lists belong on project pages; blogs should explain process, tradeoffs, lessons, or iteration.
- Voice: no generic AI filler, inflated claims, resume tone, interview tone, or learning-day framing.
- Structure: title, detail, sections, takeaways, tags, scenarios, and checklist are concrete.
- Public assistant impact: summary and tags will improve retrieval rather than drown project facts.
- Mode gate: model-assisted drafts have an explicit configured channel; Codex-only
  drafts record `none`; live checks or generation were explicitly approved.
- Multi-model flow: important posts record Codex scaffold/comparison, the
  `strong` draft profile, the `review` polish profile, and any skipped role with
  a reason.

## Legacy Rewrite Checklist

- Select one entry from `content-archive/legacy-blog/rewrite-queue.json`.
- Read the archived source only as raw material.
- Rebuild evidence from current code, docs, project data, screenshots, Trellis tasks, and safe public sources.
- Decide whether the topic is still useful. If not, leave it archived.
- Rename or reshape the topic when the old slug/title carries generated-content smell.
- Never copy legacy text straight into runtime blog data.

## Draft To Runtime Promotion

1. Convert reviewed Markdown into `BlogPost` fields.
2. Add summary metadata to `src/data/blog.ts`.
3. Add the article module to `src/data/blog-posts/<slug>.ts`.
4. Register a loader in `src/data/blogContent.ts` only if it should be readable by route.
5. Add or update `blogCuration` only when public visibility is intended.
6. Run:

```powershell
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run assistant:index
npm.cmd run sitemap:generate
npm.cmd run lint
npm.cmd run build
```

## Channel Notes

- Prefer `BLOG_DRAFT_STRONG_*` for long-form drafting or legacy rewrites; the
  recommended generation model is GLM-5.2 or Gemini 3.1 Pro.
- Prefer `BLOG_DRAFT_FAST_*` for outlines, summaries, and low-risk batch checks.
- Prefer `BLOG_DRAFT_REVIEW_*` for polishing; the recommended polish model is
  DeepSeek V4 Pro. Codex still owns final fact, safety, and ingestion decisions.
- Keep default `BLOG_DRAFT_*` as the shared fallback channel.
- Keep `GEMINI_*` only as backward-compatible fallback.
- Record the provider/model label in draft metadata, but never record API keys or real private relay URLs in committed files.
- Use separate relay profiles before any parallel model comparison.

Example commands:

```powershell
npm.cmd run blog:draft -- --slug <slug> --force --generate --profile strong
npm.cmd run blog:draft -- --slug <slug> --force --generate --profile review
```
