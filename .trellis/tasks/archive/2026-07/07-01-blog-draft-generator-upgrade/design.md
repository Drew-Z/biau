# Design

## Current Shape

The repository already has a draft layer:

- `scripts/generate-blog-draft.mjs`
- `scripts/blog-rewrite-plan.json`
- `content-drafts/`
- `npm run blog:plan`
- `npm run blog:draft`
- `npm run blog:check`

The current generator reads a rewrite-plan JSON, calls a Gemini-compatible chat endpoint, and writes Markdown drafts with basic frontmatter. The checker assumes every draft uses the old knowledge-explainer heading set.

## Target Shape

Keep the same command names, but make the draft system column-aware and evidence-first.

### Draft Plan Contract

`scripts/blog-rewrite-plan.json` remains the source list for planned drafts, but each topic can now include richer fields:

- `slug`
- `title`
- `column`
- `summary`
- `series`
- `tag`
- `targetReader`
- `knowledgePoints`
- `projectExamples`
- `publicAngle`
- `evidenceSources`
- `safeFacts`
- `uncertainFacts`
- `forbiddenDetails`
- `modelStrategy`
- `priority`

Existing fields remain usable so old entries do not need a destructive migration.

### Generator Behavior

Default `blog:draft` behavior writes a structured Markdown draft scaffold from plan data. It should not require an API key for normal use. This is the main workflow because it supports evidence collection and human review before model drafting.

Optional model generation can remain behind the existing request path if enabled explicitly, but the default path must not call a model.

### Column Templates

The generator owns a local map from `BlogColumn` values to recommended article sections, aligned with `.agents/skills/blog-content-pipeline/references/templates.md`:

- `knowledge`: problem boundary, mechanism, tradeoffs, example, failure modes, checklist
- `project-notes`: stage/goal, changes, architecture/workflow, constraints, gaps, next iteration
- `resources`: what it is, why recommend, best-fit, usage, caveats, alternatives
- `ai-daily`: highlights, changes, why it matters, what to try, sources, open questions
- `build-log`: starting point, decision, implementation path, verification, easier now, follow-up

### Draft File Shape

Each generated draft should be Markdown with frontmatter:

```yaml
---
slug: "..."
title: "..."
column: "project-notes"
tag: "..."
series: "..."
status: "draft"
generatedBy: "codex-draft-scaffold"
generatedAt: "..."
modelStrategy: "Codex evidence pack + one strong content model draft/rewrite + Codex review"
---
```

Body sections:

- `## Evidence Pack`
- `## Safe Public Facts`
- `## Uncertain Or Stale Facts`
- `## Forbidden / Private Details`
- `## Draft Brief`
- `## Article Outline`
- `## Review Gates`
- `## Promotion Checklist`

### Checker Behavior

`scripts/check-public-blog.mjs` should validate both old and new draft styles:

- Existing old drafts can still pass with the old required headings.
- New column-aware drafts pass with the evidence-first headings.
- Drafts must still avoid forbidden public terms and Day-number framing.
- New drafts must include `status: "draft"` and `column: "<BlogColumn>"`.

## Safety

The generator must not publish directly to public blog data. It writes only under `content-drafts/`. Promotion remains a separate manual/reviewed action.

No secrets should be logged. `.env.local` may be loaded only for optional model requests and should never be printed.

## Rollback

Rollback is straightforward: revert changes to `scripts/generate-blog-draft.mjs`, `scripts/check-public-blog.mjs`, `scripts/blog-rewrite-plan.json`, and `content-drafts/README.md`. Generated drafts are safe to delete if they are only scaffolds.
