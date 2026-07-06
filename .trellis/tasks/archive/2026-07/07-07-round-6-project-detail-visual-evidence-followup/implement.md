# Project Detail Visual Evidence Followup Implementation Plan

## Steps

1. [x] Inspect `scripts/check-project-detail-evidence.ts` and project detail visual data.
2. [x] Identify the smallest check or data improvement that increases evidence quality.
3. [x] Implement the improvement.
4. [x] Run focused validation.
5. [x] Update task notes.
6. [ ] Commit and push.

## Validation Candidates

- `npm.cmd run project-details:check`
- `npm.cmd run assistant:index`
- `npm.cmd run check:ui`
- `npm.cmd run verify` if shared project data or UI routes change broadly.
- `git diff --check` and sensitive-value scan.

## Rollback

Revert the check/data change and task notes.

## Result

- Hardened `scripts/check-project-detail-evidence.ts` so public project body visuals must include public-safe captions.
- Required screenshots to carry source evidence through `sourceLabel` + `sourceUrl`.
- Added source URL validation that allows internal routes and `http(s)` public URLs while rejecting local paths, localhost/private-network forms, and query strings that look like secrets.
- Filled captions for all current in-body project visuals in `src/data/portfolio.ts`.
- Added source evidence for every current in-body screenshot.

## Validation

- `npm.cmd run project-details:check` ✅
- `npm.cmd run assistant:index` ✅
- `npm.cmd run lint` ✅
- `npm.cmd run build` ✅
- `npm.cmd run check:ui` ✅
- `npm.cmd run verify` ✅
- `git diff --check` ✅
- Sensitive-value scan over changed public data and task files ✅

## Manual Gates

- No new manual gate from this slice.
- Future visual polish can still replace older screenshots with fresher captures or add per-section diagrams, but every current image now carries a public caption and screenshot source evidence.
