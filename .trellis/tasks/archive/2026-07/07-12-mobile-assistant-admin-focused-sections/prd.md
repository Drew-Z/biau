# Mobile Assistant Admin Focused Sections

## Goal

Make the internal assistant admin route behave as a real sectioned workspace on mobile instead of rendering every management panel in one 7,395px page.

## Evidence

- At 390x900 `/assistant/admin` is about 7,395px tall with Overview, Invites, Members, Knowledge, Usage, and Safety content all visible.
- Every panel has a `hidden` attribute driven by `activeTab`, but `.assistant-admin-grid { display: grid }` overrides the browser hidden presentation.
- The existing six desktop tab buttons wrap tightly on mobile and use 36px targets.
- The reference site uses explicit mode selection and progressive disclosure for dense tools; this task adopts that information principle without copying its bottom navigation or proprietary UI.

## Requirements

- Restore the semantic `hidden` contract so only the active admin panel is rendered visually and interactively.
- Keep the existing six-button tablist on desktop.
- Replace the desktop tablist with one labeled native section selector on mobile; expose all six labels without horizontal scrolling or wrapped micro-buttons.
- Keep one shared `activeTab` state for both surfaces and preserve forms, loaded data, and admin token while switching sections.
- Ensure every panel has a stable relationship to its desktop tab and mobile selector option.
- Keep the mobile selector after the hero and before the active panel; make it sticky only if it does not cover global navigation or page content.
- Preserve all admin capabilities and existing no-token safety behavior.

## Acceptance Criteria

- [x] Exactly one admin panel is visible on desktop and mobile.
- [x] Desktop shows the tablist and hides the mobile selector.
- [x] 320px, 390px, and 430px show the complete native selector and hide desktop tabs.
- [x] Selecting each of six options displays only its corresponding panel.
- [x] Switching sections preserves entered form values and local token state.
- [x] Selected section has an accessible name and no horizontal overflow.
- [x] The default Overview mobile page is materially shorter than the previous 7,395px stack.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.