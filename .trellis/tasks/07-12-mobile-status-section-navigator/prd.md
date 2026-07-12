# Mobile Status Section Navigator

## Goal

Make the 13,000px mobile reliability page directly navigable without removing entry, synthetic, manual-gate, or project evidence.

## Evidence

- At 390x900 `/status` currently measures about 13,047px tall.
- Manual actions begin around y=2,978, external-entry cards continue past y=9,300, and project reliability cards begin around y=10,048.
- The page has no mobile section index or current-location cue.
- The reference site demonstrates explicit compact navigation for dense mobile option sets; this task adapts that principle without copying its bottom tab bar.

## Requirements

- Add stable IDs to overview, statistics, reliability layers, manual queue, entry checks, and project reliability sections.
- Add a mobile-only sticky native section selector immediately after the page hero.
- Show the current section label and position; update it as the user scrolls.
- Selecting a section scrolls to it and respects reduced-motion preferences.
- Keep all existing status evidence and desktop layout unchanged.
- Keep the navigator at least 44px tall, bounded at 320/390/430px, and free of horizontal overflow.

## Acceptance Criteria

- [x] Mobile exposes all six status sections from one complete selector.
- [x] Selecting every option reaches the matching stable section ID.
- [x] Scrolling updates the selector/current position.
- [x] The sticky navigator remains bounded and does not overlap global navigation.
- [x] Desktop hides the mobile navigator and keeps existing content.
- [x] All reliability evidence remains rendered.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.