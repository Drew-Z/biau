# Studio review queue loaded-state guard

## Goal

Extend `check:ui` so it verifies the Studio review queue affordance not only in the empty/no-token state, but also when the Studio API returns review-needed and approved drafts.

## Requirements

- Add a deterministic mocked Studio route/state to `scripts/check-ui.mjs`.
- Mock only low-sensitive Studio API payloads with fake ids, titles, statuses, visibility, and timestamps.
- Verify that the first-screen queue summary shows the loaded `hidden / review-needed` draft.
- Verify that clicking `打开下一篇待审核` selects the next review-needed draft and enables the normal edit/preview path.
- Do not call production Studio API, read real tokens, or store credentials.
- Preserve the existing empty/no-token Studio UI guard.

## Acceptance Criteria

- [x] `scripts/check-ui.mjs` includes a mocked Studio loaded-state case.
- [x] The loaded-state case proves the next-review action selects the review-needed draft.
- [x] `npm.cmd run check:ui` passes with a temporary local preview server.
- [x] `npm.cmd run lint` passes.
- [x] `npm.cmd run build` passes.

## Notes

- This is a test-only follow-up for the Studio review affordance. Real Studio approval/export remains a manual gate.

## Completion Notes

- Added a localhost-only `?ui-check=review-queue` fixture path in `StudioPage` so UI checks can exercise loaded review-needed and approved draft states without a real Studio API.
- Added a `check:ui` route with fake localStorage token and low-sensitive fixture assertions.
- The loaded-state check verifies `Hidden 待审` count, an enabled `打开下一篇待审核` button, and active draft selection after clicking it.
- Verified `npm.cmd run build`, `npm.cmd run check:ui`, and `npm.cmd run lint`.
- No production Studio API, model provider, database, or credentialed endpoint was called.
