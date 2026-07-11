# Mobile Blog Column Selector

## Goal

Replace the clipped horizontal mobile knowledge-base taxonomy rail with one complete, accessible column selector while preserving the desktop filter tabs.

## Evidence

- At 390px the current no-wrap `.blog-column-filter` cuts the third category at the right edge and requires undisclosed horizontal panning.
- The homepage project rail was already removed for the same mobile discoverability problem.
- The reference site compresses mobile option sets into one explicit entry point rather than exposing desktop navigation density unchanged.

## Requirements

- Keep all desktop column buttons and their current behavior at widths above 720px.
- Add one mobile-only native select showing every column, English/Chinese identity, and current public count or pending state.
- Hide the desktop filter rail on mobile so no taxonomy control owns horizontal scrolling.
- Preserve shared `selectedColumn`, page reset, empty-state, search, pagination, and public curation behavior.
- Use the existing visual tokens and Lucide icons; do not copy the reference bottom tab bar.
- Keep the selector at least 44px tall, bounded at 320/390/430px, keyboard/screen-reader operable, and free of page overflow.

## Acceptance Criteria

- [x] Desktop continues to render all existing column buttons and no mobile selector.
- [x] At 320px, 390px, and 430px only the mobile selector is visible and all six choices are available.
- [x] Choosing a populated column filters cards and resets pagination.
- [x] Choosing an empty column renders the shared column-specific empty state.
- [x] The selector and page remain within the viewport without horizontal scrolling or clipped category text.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.

## Out Of Scope

- Changing blog columns or public content.
- Replacing the search or pagination controls.
- Adding a fixed mobile bottom navigation bar.
