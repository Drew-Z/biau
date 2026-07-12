# Mobile Project Catalog Progressive Disclosure

## Goal

Make the mobile project catalog easier to scan and operate without horizontal rails or hiding project availability. The page should expose the three project groups as compact vertical controls and render one expanded group at a time on mobile, while desktop keeps the complete catalog visible.

## Evidence

- At 390px `/projects` renders all 12 project cards in one 4,144px document; at 320px it reaches 4,920px.
- The catalog contains three natural groups: AI applications, full-stack development, and games.
- 39 visible project actions are below the 44px touch-target baseline; card detail actions are about 36px high and external links about 34px.
- The page has no horizontal overflow, so the problem is information density and touch ergonomics rather than width containment.
- `/blog` is longer but already uses a mobile native category selector. `/assistant` already moves member/session controls into a drawer. The project catalog is the remaining surface without progressive disclosure.
- The read-only reference uses progressive disclosure and one focused high-occupancy surface on mobile; its brand, assets, copy, bottom navigation, and styling are out of scope.

## Requirements

- Keep all three project groups and all project cards available; do not delete, reorder, or duplicate project data.
- On widths at or below 720px, show a vertical group selector with one expanded group at a time. Default to `AI 应用`.
- Group controls expose the group name, project count, expanded state, and a minimum 44px target. Selecting another group swaps the visible project grid and moves focus/context predictably.
- Do not use horizontal scrolling, a bottom tab bar, or a permanently open multi-group catalog on mobile.
- Desktop and tablet layouts above 720px continue to show every group and do not depend on the mobile selection state.
- Project card detail and external-link actions meet a 44px mobile touch target without changing their navigation behavior.
- Preserve card keyboard access, analytics, external links, project order, and existing visual language.
- Add UI regression checks at 320px, 390px, and 430px for group counts, one-panel visibility, state switching, touch targets, data preservation, document height reduction, and no horizontal overflow. Desktop must retain all groups.

## Out Of Scope

- Rewriting project content or changing project categories.
- Blog card CTA and internal assistant refinements; these remain follow-up audit findings.
- Copying reference-site assets, brand, color system, or navigation.

## Acceptance Criteria

- [x] Mobile shows three complete vertical group controls and exactly one project grid.
- [x] AI applications is the default expanded group; switching groups preserves source order and shows the expected project count.
- [x] Every source project remains reachable through one of the mobile groups.
- [x] Mobile project actions are at least 44px high at 320px, 390px, and 430px.
- [x] The initial 390px document is materially shorter than the 4,144px baseline and has no horizontal overflow.
- [x] Desktop shows all three groups and all source projects simultaneously.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.