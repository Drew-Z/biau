# Content pipeline safe backlog

## Goal

Create a safe, non-public backlog for the next blog/content work after the
project-page refresh, so future writing can start from evidence and review
gates instead of ad-hoc article generation.

## Requirements

- R1. Use `blog-content-pipeline` in `review-only` / Codex-only backlog mode.
- R2. Do not call live model generation or model doctor.
- R3. Do not publish, delete, or hide any additional runtime blog content.
- R4. Review current public columns, drafts, rewrite plan, and legacy queue at a
  high level.
- R5. Produce a committed backlog document under `content-drafts/` with:
  writing mode, model channel, current inventory, recommended priorities,
  evidence sources, image policy, and human approval gates.
- R6. Keep the backlog public-safe: no API keys, private URLs, local absolute
  paths, accounts, or sensitive deployment details.

## Acceptance Criteria

- [x] Backlog document exists under `content-drafts/`.
- [x] It records `model channel: none` for this run.
- [x] It separates knowledge notes, project-notes, resources, AI daily, and
      build-log follow-ups.
- [x] It marks publish/delete/model-live/image-generation decisions as requiring
      human approval.
- [x] `npm.cmd run blog:check` and `git diff --check` pass.

## Result

- Added `content-drafts/blog-content-backlog-2026-07-02.md`.
- Added review-only notes to `content-drafts/08-*` through
  `content-drafts/13-*` project summary drafts, including evidence refresh
  needs and human approval checklists.
- The backlog documents review-only mode, current inventory, recommended next
  queue, project-note overlap guidance, model strategy, image policy, and human
  approval gates.
- No runtime blog data, curation, loaders, sitemap, or assistant index was
  changed by this task.

## Validation

- Passed: `npm.cmd run blog:plan`
- Passed: `npm.cmd run blog:check`
- Passed: `git diff --check` (only CRLF checkout warning)
- Follow-up audit passed: `npm.cmd run lint`, `npm.cmd run build`, and
  `npm.cmd run check:ui` after the `detailLink` data-contract cleanup.

## Notes

- Lightweight task; PRD-only is sufficient.
