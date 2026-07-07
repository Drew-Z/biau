# Round 16 project visual rendered caption UI guard

## Goal

Ensure project detail page UI checks prove image-backed in-body visuals render their captions and alt-backed images, not only that the data model contains them.

## Requirements

- R1. `npm.cmd run check:ui` must assert rendered project visual image alt text and captions for project detail pages with visual data.
- R2. The expected counts/text should derive from `src/data/portfolio.ts`, not hardcoded project-specific numbers.
- R3. The guard must remain local and offline, using the existing preview route checks only.
- R4. Do not change project page layout, image assets, or public project claims.

## Acceptance Criteria

- [x] `scripts/check-ui.mjs` asserts image-backed project visuals render image alt text.
- [x] `scripts/check-ui.mjs` asserts image-backed project visuals render visible captions.
- [x] `npm.cmd run check:ui` passes against a fresh preview.
- [x] Required validation commands pass.

## Out of Scope

- Changing project detail UI structure.
- Adding or replacing project visuals.
- Changing project catalog data.
