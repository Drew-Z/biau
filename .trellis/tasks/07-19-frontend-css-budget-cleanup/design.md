# Frontend CSS budget cleanup design

## Boundary

The implementation is a deletion-only cleanup in `src/styles/flow-pages.css`. It removes the obsolete harbor environment/grain layer and associated keyframes while retaining the active canvas renderer and `.app` pseudo-element fallback.

## Deletion Strategy

1. Delete the base `.harbor-environment*` and `.muxing-flow-grain*` blocks.
2. Remove only their entries from mixed intro, responsive, reduced-motion, and `:has(.flow-background...)` selector groups.
3. Delete the harbor-only keyframes after confirming no remaining animation declaration references them.
4. Stop after the production CSS budget passes; do not consume the larger but riskier assistant/gradient cleanup in this task.

## Safety And Rollback

- Static reference search proves the removed classes have no repository DOM producer.
- `.app::before` and `.app::after` remain the explicit fallback when the canvas reports `data-flow-fallback='css'`.
- The change is rollback-safe as one CSS-only commit.
- UI verification covers normal animation, runtime reduced motion, CSS fallback, intro docking, and public/private routes.
