# Assistant admin UI refresh guard

## Goal

Add a UI regression guard so `/assistant/admin` keeps the clear refresh-all workflow and safe no-token state.

## Requirements

- Extend `scripts/check-ui.mjs` to assert `/assistant/admin` exposes the visible "刷新全部状态" action.
- Assert the admin route still shows a safe no-token prompt/disabled state without requiring a real `ADMIN_TOKEN`.
- Do not store or inject a real admin token in the UI check.
- Keep the check low-sensitive and offline against local preview only.

## Acceptance Criteria

- [x] `npm.cmd run check:ui` fails if `/assistant/admin` loses the refresh-all action.
- [x] `npm.cmd run check:ui` still runs without a real admin token.
- [x] `npm.cmd run lint` passes.
- [x] `npm.cmd run build` passes.

## Notes

- The previous check covered the route generally, but not the new admin refresh workflow.

## Completion Notes

- `scripts/check-ui.mjs` now clears `biau-assistant-admin-token` before checking `/assistant/admin`.
- The UI check asserts the "刷新全部状态" action is visible and disabled without an admin token, and that the local-only token boundary text is visible.
- Verified `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui` with local preview.
