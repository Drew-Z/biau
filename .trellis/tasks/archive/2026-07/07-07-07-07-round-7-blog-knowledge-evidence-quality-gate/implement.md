# Blog Knowledge Evidence Quality Gate Implementation Plan

## Steps

1. [x] Inspect blog data types, knowledge posts, and existing validation scripts.
2. [x] Identify the smallest deterministic rule set that catches weak knowledge posts without false positives.
3. [x] Implement the gate.
4. [x] Fix any currently public post that fairly fails the new gate, using existing repo evidence only.
5. [x] Run focused and broad validation.
6. [x] Update task notes.
7. [x] Commit and push.

## Result

- Added `scripts/check-blog-knowledge-quality.ts`.
- Added `npm.cmd run blog:knowledge-check` and wired it into `npm.cmd run verify`.
- The gate checks public `knowledge` posts through `getPublicBlogPosts()` and `getBlogPost()`, covering knowledge points, scenarios, checklist, section depth, takeaways, source/evidence section, project-first framing, and sensitive public-content patterns.
- Added public-safe evidence boundary sections to:
  - `content-modeling-project-site`
  - `public-content-governance`
  - `static-site-release-verification`
- Regenerated public assistant knowledge after public content changed.
- Hardened `scripts/check-ui.mjs` so UI checks wait for blog detail article loading and lazy images before assertion, and report actionable `requestfailed` URLs instead of failing only on anonymous local-preview timeout noise.
- Updated `.trellis/spec/frontend/quality-guidelines.md` with the blog knowledge gate and UI readiness convention.

## Validation

- `npm.cmd run blog:knowledge-check`
- `npm.cmd run blog:check`
- `npm.cmd run blog:audit`
- `npm.cmd run assistant:index`
- `npm.cmd run assistant:kg-check`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run check:ui` with local preview
- `npm.cmd run verify`
- `git diff --check`
- Targeted sensitive scan: only known test placeholder strings and environment variable names were matched; no real secrets were introduced.

## Manual Gates

- None for this slice. Future knowledge article rewrites still need human editorial review before publication if they introduce new facts or external citations.

## Validation Candidates

- `npm.cmd run blog:audit`
- `npm.cmd run blog:check`
- new focused script if added
- `npm.cmd run assistant:index` if public content changes
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify`
- `git diff --check`
- targeted sensitive-value scan

## Rollback

Remove the new gate and any content updates from this slice.
