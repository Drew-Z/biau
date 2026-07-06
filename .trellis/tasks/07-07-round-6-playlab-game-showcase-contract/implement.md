# Playlab Game Showcase Contract Implementation Plan

## Steps

1. [x] Inspect `D:\workspace4Cursor\game` rules, README, scripts, and git state.
2. [x] Inspect current main-site Playlab/Game project/status/synthetic data.
3. [x] Choose the smallest public-safe improvement based on evidence.
4. [x] Implement and run focused validation.
5. [x] Update task notes and Round 6 manual gates.
6. [ ] Commit and push `blog-semi`.

## Validation Candidates

- `npm.cmd run playlab:synthetic`
- `npm.cmd run status:contract`
- `npm.cmd run project-details:check`
- `npm.cmd run check:ui`
- `npm.cmd run verify` for shared UI/status/data changes.

## Rollback

Revert main-site data/script changes and task notes. Do not alter game deployment configuration.

## Result

- Added a Playlab-specific contract to `scripts/check-status-contract.ts`.
- `biau-playlab-synthetic.json` now must include `baseConfigured`, `playableSummary`, `biau-playlab-web-builds`, and `biau-playlab-mobile-hints`.
- If Playlab web builds are `online`, playable page counts and discovered resource counts must be internally consistent and fully passing.
- `site:status` now retries transient timeout/network/connection/5xx failures once before recording a target as offline, reducing false offline reports for cold-start hosts.
- Regenerated `public/status/biau-playlab-synthetic.json` and `public/status/site-status.json`.

## Validation

- `npm.cmd run playlab:synthetic` passed: web=online, mobile=online, playable=6/6, resources=36/36.
- `npm.cmd run site:status` passed generation: 4 online, 1 offline.
- `npm.cmd run status:contract` passed.
- `npm.cmd run verify` passed.

## Manual Gates

- Legal RAG public workbench still timed out after retry; check Render service health/cold-start/paused deploy state from the platform dashboard.
- New Playlab public game builds should still be approved before treating a newly exported build as stable.
