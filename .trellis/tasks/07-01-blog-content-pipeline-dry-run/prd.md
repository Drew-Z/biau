# Blog content pipeline dry run

## Goal

Run one low-risk, real model-assisted dry run of the standalone
`blog-content-pipeline` skill so we can decide whether it is ready for regular
blog drafting work.

## Scope

- Target slug: `blog-content-system-build-log-draft`.
- Target draft: `content-drafts/07-blog-content-system-build-log-draft.md`.
- Use the `strong` model profile through the existing `blog:draft` command.
- Produce a dry-run report beside the draft:
  `content-drafts/blog-content-system-build-log-draft.skill-dry-run.md`.
- Keep the result draft-only. Do not publish, curate, index, or update runtime
  public blog data.

## Requirements

- Follow the `blog-content-pipeline` skill and its template, usage, and review
  references.
- Confirm the evidence pack is sufficient before calling the model.
- Call the real model with:
  `npm.cmd run blog:draft -- --slug blog-content-system-build-log-draft --force --generate --profile strong`.
- Record each stage in the dry-run report, including command result, visible
  issues, review findings, and whether the problem is blocking.
- Do not read, quote, commit, or expose `.env.local`, real relay URLs, API keys,
  accounts, private URLs, or local secret paths.
- Do not add fallback behavior in this task. If the model call fails, record the
  failure and proposed follow-up instead.

## Acceptance Criteria

- [x] Task is moved from `planning` to `in_progress`.
- [x] Required skill references and relevant Trellis specs are read.
- [x] The strong-profile model generation command is executed once for the target
      slug, or a pre-flight blocker is documented.
- [x] A dry-run report exists with stage-by-stage results and actionable issues.
- [x] The generated draft is reviewed against fact, safety, structure, overlap,
      image, and promotion gates.
      - Result: no generated draft was produced because the strong channel
        returned a model routing error. The existing scaffold was reviewed and
        the blocker was recorded.
- [x] Relevant checks are run and results are recorded.
- [ ] The task is committed and pushed after successful completion.
