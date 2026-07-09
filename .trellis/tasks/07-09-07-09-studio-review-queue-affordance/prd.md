# Studio review queue affordance

## Goal

Make `/studio` self-explanatory for the next manual step after production refresh succeeds: users should be able to see where review-needed drafts live, which draft is next, and what action creates a publish export, without reading a separate runbook first.

## Requirements

- Improve the first-screen review guidance on `/studio` so the review queue, current draft, and next action are obvious.
- Keep the page compact and workbench-like; do not turn Studio into a marketing page.
- Use only public/low-sensitive draft metadata already available to the frontend: title, column, status, visibility, updated date, and ids/slugs when already displayed.
- Do not expose tokens, database URLs, provider endpoints, model keys, member tokens, or private content that is not already part of the selected draft preview.
- Preserve existing Studio token handling and API behavior.
- Add or update UI checks so the review path remains visible.

## Acceptance Criteria

- [x] `/studio` shows a clear review queue summary for `hidden / review-needed` and related draft states.
- [x] The next actionable draft has visible actions to jump to edit/preview and create a publish export when allowed.
- [x] Empty/loading/error states still explain what to do next without leaking secrets.
- [x] `npm.cmd run check:ui` covers the review affordance.
- [x] `npm.cmd run lint` passes.
- [x] `npm.cmd run build` passes.

## Notes

- This task is local/UI-only. Real approval, publish export review, and static public content changes remain manual gates.

## Completion Notes

- Added a first-screen review queue summary to `/studio` with `Hidden 待审`, `全部待审`, `可导出`, and `下一篇待审核`.
- Added a safe `打开下一篇待审核` action that only selects a loaded draft; it does not approve, export, or publish content.
- Updated `check:ui` to assert the review affordance is visible and disabled before drafts load.
- Updated the Studio runbook and manual gates ledger so the next human step points at the new first-screen review path.
- Verified with `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run check:ui` using a temporary local preview server.
