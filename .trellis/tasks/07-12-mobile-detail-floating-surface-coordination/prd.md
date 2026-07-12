# Mobile Detail Floating Surface Coordination

## Goal

Coordinate the public assistant and detail reading guide on mobile so both capabilities remain available without overlapping or competing as simultaneous overlays.

## Evidence

- On `/projects/legal-rag` at initial load, the 44px public assistant trigger overlaps the 50px reading-guide toggle at 320px, 390px, and 430px.
- At 390px the assistant occupies x=330..374/y=840..884 while the guide occupies x=12..378/y=842..892, producing 1,827px² overlap.
- Blog detail pages do not always collide initially because their guide appears earlier, so a permanent global upward offset would waste space.
- The reference site separates mobile tools into one active drawer/surface at a time; this task adopts its progressive-disclosure principle without copying its bottom tabs or assets.

## Requirements

- Detect real mobile overlap between the closed public-assistant trigger and detail reading-guide toggle; move the assistant only by the minimum required distance plus an 8px gap.
- Recalculate on initial render, scrolling, viewport resize, and relevant surface state changes without oscillating.
- Reset the collision offset when no guide exists, no overlap exists, the viewport is desktop, or the assistant is open.
- On mobile, opening the assistant closes the reading outline; opening the reading outline closes the assistant.
- Keep desktop independent behavior unchanged.
- Preserve both controls, their existing keyboard/Escape behavior, footer suppression, assistant conversation state, and reading progress state.
- Do not call or probe a real model/provider in UI verification; mock assistant health when opening the widget.

## Acceptance Criteria

- [x] Closed controls have no positive-area intersection at 320px, 390px, and 430px on project detail.
- [x] Blog detail with no collision keeps the assistant at its normal bottom position.
- [x] Scrolling/repositioning removes stale offsets when collision ends.
- [x] Mobile opening either surface closes the other and retains each component state.
- [x] Desktop does not apply collision transforms or mutual exclusion.
- [x] Footer-hidden assistant behavior remains intact.
- [x] No horizontal overflow or content occlusion is introduced.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.