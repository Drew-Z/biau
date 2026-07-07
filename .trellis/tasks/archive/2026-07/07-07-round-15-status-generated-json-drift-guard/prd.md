# Round 15 status generated JSON drift guard

## Goal

Make the offline status contract check catch drift between `src/data/statusTargets.ts` and generated `public/status/site-status.json` without running live external site checks.

## Requirements

- R1. `npm.cmd run status:contract` must fail when `site-status.json.targets` no longer has the same target IDs as `siteStatusTargets`.
- R2. `npm.cmd run status:contract` must fail when `site-status.json.reliabilityProjects` no longer has the same project/check IDs as `reliabilityProjects`.
- R3. The drift guard must remain offline and must not fetch external sites, call cloud APIs, or perform credentialed checks.
- R4. Failure messages should name the missing/extra IDs so stale generated JSON is easy to repair.
- R5. Existing synthetic snapshot safety checks and freshness checks must remain intact.

## Acceptance Criteria

- [x] `scripts/check-status-contract.ts` checks generated target/project/check ID alignment against source data.
- [x] `npm.cmd run status:contract` passes with the current generated JSON.
- [x] Required validation commands pass.
- [x] No live network/model/cloud/credential checks are introduced.

## Out of Scope

- Regenerating `public/status/site-status.json` through live entry checks.
- Changing status page UI rendering.
- Adding Prometheus/Grafana/Umami/Plausible integrations.
