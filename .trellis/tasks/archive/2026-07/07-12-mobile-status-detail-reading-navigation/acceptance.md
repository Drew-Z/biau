# Acceptance

## Result

The status reliability detail route now uses the shared compact reading guide with six stable sections. `/status` retains its own section navigator, missing status routes render no guide, and status detail joins the existing mobile floating-surface coordination boundary.

During verification, the shared guide exposed a layout race: scrolling before the in-flow outline collapsed shifted targets, and an animation-frame navigation could be cancelled by the opening effect cleanup. Navigation now collapses first and defers the jump with a zero-delay task. Reduced-motion also disables the global smooth-scroll rule.

## Evidence

- 320px: six complete items, no horizontal overflow, no assistant intersection.
- 390px: six complete items, no horizontal overflow, no assistant intersection.
- 430px: six complete items, no horizontal overflow, no assistant intersection.
- Desktop: compact guide remains visible and all six anchors land below the closed guide.
- Legal RAG check, manual gate, and next-action counts remain equal to source data.
- `/status` retains `StatusSectionNavigator`; `/status/missing-reading-guide` renders no guide.
- `scripts/check-ui.mjs` mocks `/health`; no real assistant or model endpoint was called.

## Verification

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run performance:check`
- `npm.cmd run check:ui`
- `git diff --check`
- `python ./.trellis/scripts/task.py validate ./.trellis/tasks/07-12-mobile-status-detail-reading-navigation`