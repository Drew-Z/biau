# Acceptance

## Visual Evidence

- Light dusk: muted rose, daylight yellow, and sea-mist cyan remain visible behind readable translucent surfaces.
- Dark stellar: cobalt/deep-blue main light, cyan beam, and warm gold edge accents are visible instead of a uniform blue fill.
- Mobile stellar at 390px: the navigation, hero, native project rail, and footer remain inside the viewport while the reduced-cost light field stays visible.
- Two screenshots taken 900ms apart for each sampled scene produced different rendered buffers, confirming live movement rather than animation declarations alone.

## Automated Gates

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run performance:check`
- `npm.cmd run check:ui`
- `git diff --check`

`check:ui` now verifies all six light/dark scene signatures, app fluid/ribbon layers, the harbor environment stack, the 390px mobile profile, and the reduced-motion static fallback.
