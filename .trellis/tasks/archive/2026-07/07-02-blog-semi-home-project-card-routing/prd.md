# Blog semi home project card routing

## Goal

Make homepage project cards behave like visitors expect on a product showcase:
clicking the card opens the internal project detail page, while the explicit
action button opens the deployed project website when one exists.

## Requirements

- R1. Preserve the existing homepage hero/card visual structure and drag/scroll
  behavior.
- R2. Clicking the card body should navigate to `/projects/<projectId>`.
- R3. Clicking the card action button should open the project's external website
  link when available.
- R4. Dragging or wheel-scrolling the card carousel must not accidentally trigger
  card navigation.
- R5. Keep the interaction keyboard-accessible where the card is implemented as
  a link-like control.
- R6. Do not fabricate links. If a project has no verified external URL, only
  provide the internal detail navigation.

## Acceptance Criteria

- [x] Homepage project cards route to internal project detail pages.
- [x] External project buttons still open the public project URLs.
- [x] Drag/scroll gestures do not misfire as clicks.
- [x] Existing project page card behavior remains unchanged.
- [x] `npm.cmd run lint` and `npm.cmd run build` pass.

## Result

- `HeroProject.link` now points to the internal project detail route.
- Projects with a verified deployed site use `externalLink` for the explicit
  action button.
- The carousel card is a keyboard-accessible link-like article; the external
  action is a real button that stops click propagation.
- Projects without a verified external URL expose only the internal card
  navigation.

## Validation

- Passed: `npm.cmd run lint`
- Passed: `npm.cmd run build`
- Passed: `npm.cmd run check:ui` after starting a temporary dev server on
  `http://127.0.0.1:5174`
- Note: the first direct `npm.cmd run check:ui` attempt failed because no local
  server was running at `5174`; rerun with the expected server passed.

## Notes

- Lightweight task; PRD-only is sufficient unless implementation discovers a
  shared component contract change.
