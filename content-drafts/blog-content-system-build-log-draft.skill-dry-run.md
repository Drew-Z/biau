# blog-content-pipeline Skill Dry Run

## Run Summary

- Task: `.trellis/tasks/07-01-blog-content-pipeline-dry-run`
- Target slug: `blog-content-system-build-log-draft`
- Target column: `构建手记 / Build Log`
- Target draft: `content-drafts/07-blog-content-system-build-log-draft.md`
- Mode: draft-only dry run
- Model strategy: one serial `strong` profile call, then Codex review
- Publish action: none
- Run date: 2026-07-01

## Stage Results

| Stage | Status | Result | Issues |
| --- | --- | --- | --- |
| Trellis task setup | Pass | Task artifacts created and task moved to `in_progress`. | None. |
| Skill reference load | Pass | Read skill, templates, review protocol, usage policy, and relevant Trellis draft workflow spec. | None. |
| Plan lookup | Pass | `npm.cmd run blog:plan` lists the target slug as item 07 with `build-log` column. | None. |
| Evidence pre-flight | Pass | Draft evidence pack exists and sources are readable. Safe facts and forbidden details are explicit. | Same-theme public post already exists, so duplication risk must be reviewed after generation. |
| Model generation | Blocked | Command reached the configured strong channel but failed before writing a draft. | Model route returned `502 unknown provider for model gemini-3.1-pro`. |
| Draft review | Partial | No new model draft was produced, so only the existing scaffold could be reviewed. | Cannot judge long-form output quality until the strong channel is fixed. |
| Validation checks | Pass | `npm.cmd run blog:check` and `npm.cmd run lint` passed. | Full `build` was not necessary because no runtime files changed. |

## Evidence Sources Checked

- `.agents/skills/blog-content-pipeline/SKILL.md`
- `.agents/skills/blog-content-pipeline/references/templates.md`
- `.agents/skills/blog-content-pipeline/references/review-and-prompts.md`
- `.agents/skills/blog-content-pipeline/references/usage.md`
- `.trellis/spec/backend/blog-draft-workflow.md`
- `.trellis/tasks/archive/2026-07/07-01-first-build-log-post/research.md`
- `src/data/blogShared.ts`
- `src/data/blogCuration.ts`
- `src/data/blog-posts/blog-content-system-build-log.ts`
- `scripts/blog-rewrite-plan.json`
- `content-drafts/07-blog-content-system-build-log-draft.md`

## Pre-Flight Findings

- The target column is correct for a site/workflow evolution article.
- The evidence pack supports these public claims: five blog columns exist, public visibility is controlled by curation, and the blog-content-pipeline requires evidence, draft, review, and publish gates.
- Sensitive boundaries are already stated: no relay URL, API key, local secret path, private deployment detail, fake metrics, or automatic-publication claim.
- A public article with the sibling slug `blog-content-system-build-log` already exists. The dry-run draft must be judged as a pipeline test draft, not promoted as a second public post unless it adds a distinct angle.

## Model Command

```powershell
npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft --force --generate --profile strong
```

Sanitized command result:

```text
开始生成：blog-content-system-build-log-draft
使用模型渠道：strong -> strong-profile / gemini-3.1-pro
模型 API 请求失败：502 {"error":{"message":"unknown provider for model gemini-3.1-pro","type":"server_error","code":"internal_server_error"}}
```

Interpretation:

- This was not a missing-key failure. The command reached a configured model API
  endpoint and received a provider/model routing error.
- The logged provider label is `strong-profile`, which is the script fallback
  label for the `strong` profile when no explicit provider label is configured.
- The script sends the configured model id in the OpenAI-compatible request. The
  current configured model id, `gemini-3.1-pro`, is not recognized by the target
  route used in this run.
- No fallback was attempted because this dry run intentionally tests the first
  configured strong channel.

## Review Gates To Apply

- Facts trace to evidence.
- No sensitive or private details.
- The post stays in `build-log` and does not become a project detail page.
- It explains a reusable workflow lesson, not a private diary.
- It does not duplicate the existing public Build Log article without a distinct reason.
- Image decisions follow the skill usage policy.

## Draft Review Result

No model-generated draft was available to review. The existing scaffold remains
the current target draft and has these properties:

- Structure is suitable for a `build-log` draft: evidence pack, safe facts,
  uncertain facts, forbidden details, draft brief, outline, model strategy,
  review gates, and promotion checklist.
- Public-safety boundary is explicit and adequate for the next run.
- Main content risk is duplication with the already public
  `blog-content-system-build-log` article.
- Promotion should stay blocked until either the draft gains a distinct
  "pipeline dry-run and model-channel hardening" angle or the existing public
  article is intentionally replaced.

## Image Decision

- No generated image is needed for this dry run.
- If the article later becomes public, prefer a simple self-made workflow
  diagram showing `evidence pack -> model draft -> Codex review -> curation`
  over a decorative generated cover.
- Do not generate fake product screenshots, fake metrics, or model dashboard
  imagery for this topic.

## Readiness Decision

Current verdict: not ready for production model-assisted drafting with the
current `strong` channel configuration.

What is ready:

- The skill instructions are usable.
- The evidence-pack shape is clear.
- The command path is reproducible.
- Failures are visible without exposing secrets.
- The draft-only safety boundary held: no public data was changed.

What blocks formal use:

- The configured `strong` profile does not currently resolve to a usable model
  route for this command.
- Because no model draft was produced, output quality, voice, and factual
  discipline of the model step remain untested.

## Recommended Fixes

1. Build a model setup wizard before adding fallback logic. The wizard should let
   the author select `strong`, `fast`, or `review`, enter/update private values,
   mask existing secrets, and validate the selected channel without exposing
   `.env.local`.
2. Set the `strong` profile to a model id recognized by the private relay or
   provider route.
3. Add an explicit non-secret provider label for the `strong` profile so logs are
   easier to interpret.
4. Add a lightweight channel pre-flight check, for example a `--check-model`
   mode that validates profile/model routing without overwriting drafts.
5. After the channel works, rerun this same dry run once before adding fallback
   logic.

Recommended next Trellis task:

- `blog-model-setup-wizard`: implement a secrets-safe CLI assistant for
  configuring and checking blog draft model profiles.

## Validation

```powershell
npm.cmd run blog:check
npm.cmd run lint
```

Result: both passed.
