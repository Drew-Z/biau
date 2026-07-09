# Site monitor structured route coverage

## Goal

Refactor site:monitor to derive public route coverage from structured project/blog/status data instead of regex and handwritten route subsets.

## Requirements

- `site:monitor` should read `projects`, `reliabilityProjects`, and `getPublicBlogPosts()` directly.
- Cover all public project detail routes, all reliability status detail routes, and all public blog post routes.
- Keep core routes, sitemap, robots, and optional same-origin/external link checks.
- Keep output low-sensitive: no tokens, credentials, database URLs, private dashboards, or raw response bodies.
- Avoid introducing network checks beyond the routes the user already intends to monitor; external link checks remain opt-in.
- Update the frontend quality spec so future route-monitor work follows the structured data rule.

## Acceptance Criteria

- [x] `npm.cmd run site:monitor` checks the full structured public route set.
- [x] `npm.cmd run site:monitor -- --json` emits a valid result with no failures.
- [x] `npm.cmd run lint` passes.
- [x] `npm.cmd run build` passes.
- [x] Spec documents that `site:monitor` route lists must not parse source files with regex.

## Notes

- This is a code-quality and reliability-coverage slice; it does not call models or credentialed APIs.

## Completion Notes

- `site:monitor` now runs through `tsx scripts/check-site-monitor.ts` and derives public project, status, and blog detail routes from `src/data/portfolio.ts`, `src/data/statusTargets.ts`, and `getPublicBlogPosts()`.
- Verified `npm.cmd run site:monitor` and `npm.cmd run site:monitor -- --json`; both checked 37 targets with 0 failures.
- Verified `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check`.
