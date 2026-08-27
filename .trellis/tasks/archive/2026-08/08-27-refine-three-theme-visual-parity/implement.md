# Implementation Plan

1. [x] Add the per-theme subline gradient and light-surface transparency tokens in `src/styles/appearance-themes.css`.
2. [x] Update `src/styles/hero-split.css` to consume the gradient and add the guarded tall-desktop geometry/material refinements.
3. [x] Update `src/styles/navigation.css` with the corresponding guarded homepage navigation offset.
4. [x] Capture Morning/Nature/Stellar production screenshots at `1440x900`, then check `320x900`, `390x900`, and `430x900` for selected controls, overflow, and reachable project actions.
5. [x] Run:

   ```powershell
   npm.cmd run lint
   npm.cmd run build
   npm.cmd run performance:check
   $env:UI_CHECK_BASE = 'http://127.0.0.1:5185'
   npm.cmd run check:ui:smoke
   npm.cmd run check:ui
   npm.cmd run check:ui:production-appearance
   git diff --check
   ```

## Risk Checks

- Keep the desktop geometry within the tall-desktop media query so smaller laptops and all mobile layouts keep their established, content-safe dimensions.
- Recheck Nature after material changes because its botanical line pattern can become overly prominent when the board alpha drops.
- Do not alter `public/status/blog-semi-synthetic.json`; it is an existing user change outside this task.
