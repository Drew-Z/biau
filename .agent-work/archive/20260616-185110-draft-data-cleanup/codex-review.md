# Codex Review

Provider selection followed the short smoke-test rule:

- `a`: timed out after 20s with no output.
- `b`: returned in 14s but ignored the strict `OK` instruction and later produced a generic greeting for the long plan.
- `c`: timed out after 20s with no output.
- `d`: returned in 10s with verbose but usable output, then produced the accepted read-only plan.

## Accepted

- Remove the unused `articles` export from `src/data/portfolio.ts`.
- Remove the unused `pending` value from `ProjectStatus` and `statusLabels`.
- Remove the two UI color branches that only existed for `pending`.

## Narrowing

- Do not modify visible project content, route structure, styles, screenshots, or active project statuses.
- Do not change `main`, `live`, `mvp`, or `ongoing` status semantics.
- Do not remove any real blog posts from `blogPosts`; the unused `articles` export is a separate dead data block.

## Pre-Implementation Facts

- `articles` is exported but not imported or rendered by the current app.
- No project in `projects` uses `status: 'pending'`.
- `pending` appears only in the type/label definition and two render-time color branches.
