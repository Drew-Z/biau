# Status manual action queue

## Goal

Add a public-safe manual action queue to the status overview so pending human gates and next actions are visible without opening every project detail.

This improves the reliability-observation workflow: a visitor or maintainer can open `/status`, see the current project health, and immediately understand which manual steps still need a human in a platform console, credential context, release process, or review workflow.

## Requirements

- Add a compact, scan-friendly action queue to the `/status` overview route.
- Derive the queue from existing public-safe `reliabilityProjects` data; do not duplicate project ids, gate text, or next-action text in the page component.
- Include both manual gates and follow-up actions, with project title, category, action type, short text, and a link to the project's dedicated status detail route.
- Keep the queue bounded so it helps orientation instead of flooding the page; prioritize items from projects that still have planned/unchecked/degraded/offline checks, then preserve existing project order.
- Do not expose secrets, account details, provider endpoints, database URLs, real metrics, or APK download links.
- Do not promote any pending capability from `planned` / `unchecked` to `online`; this is only a visibility and navigation improvement.
- Add UI regression coverage that derives expected queue counts from the same status payload/data helpers.
- Update the parent task progress notes after implementation.

## Acceptance Criteria

- [x] `/status` shows a visible manual action queue before the per-project index.
- [x] Queue items link to `/status/:projectId` detail routes.
- [x] Queue content is derived from `reliabilityProjects` and remains public-safe.
- [x] UI check asserts the queue exists, has the expected bounded count, and its links use dedicated status routes.
- [x] Relevant checks pass: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:ui`, and `npm.cmd run status:contract`.

## Notes

- This is a lightweight task; PRD-only planning is sufficient.
- If a manual gate gets completed later, update the underlying status/manual-gate data first and let the queue reflect it.

## Implementation Notes

- Added `getStatusManualActionQueue()` in `src/data/siteStatusView.ts` so the page and UI regression check use the same derived queue.
- `/status` now renders a bounded "下一步人工队列" section with one primary manual gate and one primary next action per reliability project, capped at 12 items.
- `scripts/check-ui.mjs` now derives the expected queue from the merged status payload and asserts card count, link count, title/type rendering, and `/status/:projectId` hrefs.
- Validation run:
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `npm.cmd run status:contract`
  - `npm.cmd run check:ui` against local preview on `127.0.0.1:4174`
