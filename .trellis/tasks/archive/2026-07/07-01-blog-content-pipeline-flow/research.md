# Evidence And Review Notes

## Scope

- Task: run a normal `blog-content-pipeline` workflow on one real topic.
- Topic: `blog-content-system-build-log-draft`.
- Column: `build-log`.
- Output boundary: draft-only under `content-drafts/`.
- Model boundary: no live model call in this run.
- Writing template: user-approved custom flow, `问题起点 -> 关键决策 -> 实现路径 -> 验证方式 -> 经验沉淀 -> 下一步`.

## Sources Read

- `.agents/skills/blog-content-pipeline/SKILL.md`
- `.agents/skills/blog-content-pipeline/references/templates.md`
- `.agents/skills/blog-content-pipeline/references/usage.md`
- `.agents/skills/blog-content-pipeline/references/review-and-prompts.md`
- `.trellis/spec/backend/blog-draft-workflow.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/tasks/archive/2026-07/07-01-first-build-log-post/research.md`
- `.trellis/tasks/archive/2026-07/07-01-blog-content-pipeline-dry-run/prd.md`
- `.trellis/tasks/archive/2026-07/07-01-blog-model-setup-wizard/prd.md`
- `content-drafts/07-blog-content-system-build-log-draft.md`
- `content-drafts/blog-content-system-build-log-draft.skill-dry-run.md`
- `content-drafts/README.md`
- `content-drafts/blog-rewrite-workflow.md`
- `scripts/blog-rewrite-plan.json`
- `scripts/generate-blog-draft.mjs`
- `scripts/blog-model-config.mjs`
- `scripts/check-public-blog.mjs`
- `src/data/blogShared.ts`
- `src/data/blogCuration.ts`
- `src/data/blog-posts/blog-content-system-build-log.ts`
- `package.json`

## Safe Public Facts

- The blog has five `BlogColumn` values: `knowledge`, `project-notes`, `resources`, `ai-daily`, and `build-log`.
- Public visibility is controlled through `blogCuration`; hidden/default content is not public merely because a draft exists.
- `blog:draft` writes an evidence-first scaffold by default and only calls a model when `--generate` is explicit.
- `blog:model doctor` is offline by default; live model routing checks require an explicit `--live` task.
- The target draft already existed, so the normal non-force scaffold command should skip instead of overwriting.
- A public sibling article already exists at `blog-content-system-build-log`, so this refreshed draft must focus on the skill usage flow rather than repeating the content-system overview.

## Uncertain Or Deferred

- Current `strong` profile routing was not live-tested in this run.
- This draft is not yet approved for public promotion.
- Image use should be decided only if the draft becomes a public article; a simple workflow diagram is more appropriate than generated product-like imagery.
- Legacy blog cleanup is a separate task and should not be claimed as completed here.

## Forbidden Details

- Do not record real relay URLs, API keys, accounts, private endpoints, database URLs, deployment internals, or machine-specific secret paths.
- Do not quote private environment config values.
- Do not imply draft creation equals public publication.
- Do not invent traffic, SEO, model-quality, user-feedback, or production metrics.

## Review Result

- Draft refreshed at `content-drafts/07-blog-content-system-build-log-draft.md`.
- The fixed evidence headings required by `blog:check` were preserved.
- The user-approved custom writing template was added under `## Draft Body`.
- Public overlap with the existing build-log article was explicitly narrowed to a "skill normal workflow" angle.
- Review gates are checked in the draft for facts, safety, column fit, hidden-draft boundary, overlap, and no live model use.

## Validation

- `npm.cmd run blog:model -- doctor --profile strong --format markdown`: passed offline; no model request was sent. It warned that `strong` resolves through fallback/legacy values, so profile-specific setup is still recommended before generation.
- `npm.cmd run blog:plan`: passed; selected topic appears as item 07 with `column=build-log`.
- `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft`: passed; existing draft was skipped without `--force`.
- `npm.cmd run blog:check`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with existing Vite dynamic-import warnings only.
