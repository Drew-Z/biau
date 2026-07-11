# Design: Reference-site Surface Depth And Interaction Integration

## Surface Contract

Each page scene owns four additional CSS variables:

- `--flow-surface-tint-rgb`: color mixed into translucent panel/card fills.
- `--flow-surface-highlight-rgb`: cool or warm inset/specular light.
- `--flow-surface-edge-rgb`: bounded border trace color.
- `--flow-surface-depth-alpha`: scene-specific shadow strength.

The six light/dark scene selectors define distinct values. Components consume the variables without branching in React.

## Layering

- `.hero-panel` receives a scene-tinted radial/linear surface and a layered shadow that separates it from the moving background.
- `.carousel-card` keeps its project accent but blends that accent with the scene surface, so project identity and harbor atmosphere coexist.
- `.carousel-card::after` provides one bounded diagonal specular band. It changes opacity/position on hover and focus-visible, never changes layout dimensions, and remains behind the action content.
- Existing `.carousel-wrapper` trace/sweep and perspective remain the outer interaction layer.

## Mobile And Motion

- Mobile keeps native horizontal scrolling and removes hover-only transform assumptions.
- Specular opacity is reduced on mobile; focus-visible remains available for keyboard users.
- `prefers-reduced-motion: reduce` removes new transitions and holds the specular band in a static low-opacity state.

## Rollback

If a scene becomes too bright, adjust only its surface tokens or mobile opacity. Do not remove the shared surface system or disable the moving background.
