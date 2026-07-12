# Refine Mobile Experience From Reference Patterns

## Goal

Improve BIAU Port mobile navigation by absorbing the saved Muxingbu reference site's persistent bottom-tab pattern while preserving the main site's quieter BIAU visual language and existing vertical-scroll interactions.

## Evidence

- Current mobile screenshots at 320/390/430px show a compact top header, but all five primary destinations remain behind the hamburger menu.
- The saved reference uses a persistent mobile tabbar with icon-and-label destinations, safe-area spacing, clear active state, and thumb-reachable navigation.
- BIAU Port already has five stable primary routes: Home, Projects, Blog, Status, and Assistant.
- Existing public-assistant and detail-reading floating surfaces need explicit spacing contracts so a new fixed bottom navigation cannot overlap them.

## Requirements

- Add a mobile-only bottom navigation with Home, Projects, Knowledge, Status, and Assistant.
- Use Lucide icons, short Chinese labels, route-aware active state, semantic navigation, and at least 44px targets.
- Respect `env(safe-area-inset-bottom)` and remain bounded at 320px, 390px, and 430px.
- Keep the desktop navigation unchanged.
- Keep the mobile top header focused on brand and theme; remove the redundant hamburger interaction when the bottom navigation is available.
- Offset the public assistant and page/footer content so the bottom navigation does not cover controls or final content.
- Preserve vertical scrolling, existing detail reading navigation, theme controls, routes, and reduced-motion behavior.
- Do not add GSAP, background audio, SPA DOM replacement, horizontal navigation rails, or a new UI framework.

## Acceptance Criteria

- [x] Mobile renders exactly five persistent route tabs with icons and labels; desktop renders none.
- [x] Each tab is at least 44px and navigates to the expected route.
- [x] Active state follows `/`, `/projects*`, `/blog*`, `/status*`, and `/assistant*` route families.
- [x] Top mobile header has no redundant menu button or hidden-menu dependency.
- [x] Bottom tabbar and public assistant have no positive-area overlap at 320px, 390px, or 430px.
- [x] Footer/final content remains scrollable above the tabbar and respects safe-area inset.
- [x] No horizontal overflow occurs on representative Home, Projects, Blog, project detail, blog detail, and status routes.
- [x] `lint`, `build`, `performance:check`, `check:ui`, and `git diff --check` pass.