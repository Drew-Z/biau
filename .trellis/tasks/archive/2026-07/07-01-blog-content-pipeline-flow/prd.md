# Run blog content pipeline flow

## Goal

Run a normal `blog-content-pipeline` content workflow on one real topic so the skill can be used like an installed, reusable workflow rather than only documented in theory.

Pilot topic: `blog-content-system-build-log-draft` in the `build-log` column.

Writing template for this run: user-approved custom template
`问题起点 -> 关键决策 -> 实现路径 -> 验证方式 -> 经验沉淀 -> 下一步`
(`Problem -> Decision -> Implementation -> Verification -> Lessons -> Next Steps`).

## User Value

- Confirm the downloaded skill can guide a real blog production flow.
- Produce or refresh one evidence-first draft without leaking private details.
- Learn where model setup, offline checks, live model calls, review gates, and publication boundaries fit.

## Confirmed Facts

- The project has `blog-content-pipeline` installed under `.agents/skills/blog-content-pipeline/`.
- The standalone skill repository `git@github.com:Drew-Z/blog-content-pipeline.git` has been updated with model setup CLI usage.
- `npm.cmd run blog:plan` lists `blog-content-system-build-log-draft` as a `build-log` topic.
- The user approved a custom writing template instead of treating the built-in
  column template as fixed headings.
- `npm.cmd run blog:model -- doctor --profile strong --format markdown` is offline by default and does not send a model request.
- Current `strong` status can resolve through legacy/fallback values; profile-specific setup remains recommended before any model generation.
- Existing draft `content-drafts/07-blog-content-system-build-log-draft.md` already exists, so commands without `--force` should skip rather than overwrite.

## Requirements

- R1: Use the `blog-content-pipeline` skill routing and templates, not ad hoc blog writing.
- R2: Build an evidence pack before generating or rewriting content.
- R3: Prefer `blog-content-system-build-log-draft` unless evidence inspection shows it is unsuitable.
- R4: Do not run live model checks or model generation unless the user explicitly approves a small model task.
- R5: Keep private relay URLs, API keys, accounts, local secret paths, IPs, and deployment internals out of committed files and assistant summaries.
- R6: If a draft is generated or refreshed, keep it in `content-drafts/` unless separately approved for public promotion.
- R7: Review the draft for facts, safety, column fit, project-page overlap, voice, and structure.
- R8: Run the relevant blog checks after content changes.
- R9: Allow the user to specify a writing template for this run. Built-in
  column templates are defaults, not hard requirements; evidence and safety
  gates still apply.

## Out Of Scope

- Publishing the post into runtime `src/data/blog*` files unless separately approved.
- Running `doctor --live` or `blog:draft --generate` without explicit approval.
- Editing model credentials or reading `.env.local` values.
- Rewriting the entire blog catalog.

## Acceptance Criteria

- [x] Pilot topic is selected from `blog:plan` and recorded.
- [x] Writing template source is recorded as user-specified.
- [x] Evidence sources are inspected and summarized.
- [x] Evidence pack identifies safe facts, uncertain facts, forbidden details, reader value, and model strategy.
- [x] Scaffold or draft exists under `content-drafts/` and respects overwrite rules.
- [x] Review gates are applied and issues are recorded or fixed.
- [x] `npm.cmd run blog:check` passes after changes.
- [x] Any live model use, if performed, is explicitly approved and recorded as such.

## Validation Notes

- `npm.cmd run blog:model -- doctor --profile strong --format markdown` passed as an offline check; no model request was sent. It reported that `strong` currently resolves through legacy/fallback values, so profile-specific setup remains recommended before generation.
- `npm.cmd run blog:plan` listed `blog-content-system-build-log-draft` as item 07 in the `build-log` column.
- `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft` respected overwrite rules and skipped the existing draft without `--force`.
- `npm.cmd run blog:check` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed with existing Vite dynamic-import warnings only.
- No live model call was performed in this run.
