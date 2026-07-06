# Status summary semantics polish

## Goal

Make `/status` summary cards describe their counting scope clearly. The page
currently mixes entry-target counts with reliability-check counts in one row:
`online/degraded/offline/unchecked` show public entry target totals, while
`planned` shows reliability-project planned checks. This is not broken
functionally, but it is easy for a visitor to misread as one unified metric.

The polish should keep the existing dedicated status detail routes, entry
cards, reliability project cards, and generated status JSON contract intact,
while making the overview distinguish:

- public entry reachability;
- layered reliability checks;
- manual/production gates that are intentionally not counted as failures.

## Requirements

- Keep public content sanitized; do not add production credentials, private
  dashboard URLs, model provider details, or hidden endpoint values.
- Do not run live model tests or credentialed project checks.
- Preserve `/status/:projectId` route behavior and existing status target
  buttons.
- Derive all summary numbers from shared status helpers or typed data, not from
  hard-coded counts in the page component or Playwright check.
- Make the total/online/degraded/offline/unchecked/planned semantics explicit
  enough that a visitor can tell which numbers are entry checks and which are
  reliability checks.
- Keep the UI responsive and consistent with the existing glass-card status
  design.

## Acceptance Criteria

- [x] `/status` overview presents entry-target and reliability-check summaries
      with separate labels or grouped cards.
- [x] The page does not claim "all clear" when entry targets or reliability
      checks contain degraded/offline/unchecked states.
- [x] The detail route links still point to `/status/:projectId`, not hash
      anchors.
- [x] UI verification asserts the status summary semantics from shared data.
- [x] `npm.cmd run lint` passes.
- [x] `npm.cmd run build` passes.
- [x] `npm.cmd run check:ui` passes or any failure is explained with a concrete
      blocker.

## Notes

- Parent task: `07-04-biau-port-continuous-improvement`.
- This is a local UI/data semantics task; no cloud or manual gate is required.
