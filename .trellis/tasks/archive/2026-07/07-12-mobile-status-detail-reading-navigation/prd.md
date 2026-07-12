# Mobile Status Detail Reading Navigation

## Goal

Make long project reliability detail routes navigable on mobile through the same compact reading model already used by project and blog details.

## Evidence

- `/status/legal-rag` is about 7,286px at 320px, 6,339px at 390px, and 6,137px at 430px.
- The route contains a hero, status distribution, multiple reliability checks, handling rules, manual gates, and next actions, but has no section navigator or active-position feedback.
- The main `/status` route has a native section selector, while project/blog detail routes use `DetailReadingGuide`; status detail is semantically a detail reading route.
- The reference site consistently uses compact progressive disclosure for secondary navigation instead of permanent horizontal rails.

## Requirements

- Reuse `DetailReadingGuide`; do not create a second status-detail navigation implementation.
- Define six stable anchors: Overview, Distribution, Reliability checks, Handling, Manual gates, Next actions.
- Render the guide after the hero and before reliability content with label `状态导航`.
- Mark only `/status/:projectId` as a `page-detail` route so existing floating-surface coordination applies; keep `/status` unchanged.
- Add scroll margin for status detail anchors and preserve every existing check, evidence note, gate, and action.
- Keep missing-project behavior unchanged and do not show an empty guide.
- Ensure public assistant and guide do not overlap and remain mutually exclusive on mobile.

## Acceptance Criteria

- [x] Status detail exposes six complete navigation items with stable IDs.
- [x] Selecting every item lands below the sticky guide and closes the outline.
- [x] Passive scrolling updates the active item and progress.
- [x] 320px, 390px, and 430px have no horizontal overflow or assistant collision.
- [x] Desktop retains the compact guide without changing status content.
- [x] `/status` keeps its existing main status navigator and route class behavior.
- [x] Missing status detail renders no guide.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.