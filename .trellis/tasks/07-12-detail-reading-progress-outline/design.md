# Design: Detail Reading Progress And Outline Navigation

## Shared Component

`DetailReadingGuide` receives an ordered list of `{ id, label }` entries. It owns only transient UI state: outline visibility, active section, and document progress. Page components remain responsible for deciding which public content blocks exist and assigning the matching ids.

## Progress And Active Section

A passive `scroll` listener, a `resize` listener, and one requestAnimationFrame-scheduled measurement derive:

- whole-document progress from `scrollY / (document.scrollHeight - innerHeight)`;
- current section from the last target whose top has crossed a bounded reading anchor near the upper third of the viewport.

The component recalculates when its item list changes and cleans up listeners and any pending frame on unmount.

## Interaction

The sticky summary control exposes the current section and percentage. It toggles an absolutely positioned outline panel within the guide shell. The panel uses real anchor links, prevents the default jump only to choose smooth versus instant scroll based on reduced-motion preference, and closes after selection.

Document pointer-down closes an open outline when the target is outside the component. `Escape` closes it and restores focus to the summary control. The panel is locally scrollable only while explicitly open and its content exceeds a bounded mobile height; it never becomes the page scroll owner.

## Placement And Styling

The guide is rendered after the header/hero media and before the first detail body. It is `position: sticky`, centered within the existing page grid, and uses the current scene-responsive translucent panel tokens. A thin progress track is part of the guide itself. Mobile uses the same interaction with tighter dimensions and a viewport-bounded panel, avoiding a new bottom bar or fixed floating button.

## Section Contracts

Blog ids use stable role/index identifiers such as `blog-knowledge`, `blog-section-1`, and `blog-related-projects`. Project ids use `project-highlights`, `project-overview`, and `project-related`. No localized or user-authored heading is slugified into an id, avoiding unstable Unicode and duplicate-title behavior.

## Regression Scope

Playwright verifies representative blog/project routes at desktop plus 320/390/430 widths: target integrity, unique ids, toggle semantics, keyboard closing, navigation, active label, progress, viewport bounds, reduced motion, and true-bottom reachability.
