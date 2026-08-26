# Implementation plan: single-axis reference-faithful themes

## Preconditions

- [x] Re-read the active task artifacts and frontend specs through
  `trellis-before-dev` before product edits.
- [x] Confirm the only unrelated working-tree change remains
  `public/status/blog-semi-synthetic.json`; never edit, stage, or commit it.
- [x] Record baseline `lint`, `build`, performance, and appearance-check behavior.

## 1. Replace the state model

- [x] Rewrite `src/utils/appearance.ts` around `SiteTheme`, the new storage key,
  metadata, runtime guard, legacy migration, default Morning, next/direct helpers,
  atomic root application, and versioning.
- [x] Replace `src/hooks/useTheme.ts` and `src/hooks/useHarborScene.ts` with one
  `src/hooks/useSiteTheme.ts` using `flushSync` and reduced-motion-aware View
  Transition commits.
- [x] Update `src/App.tsx` and `src/components/Layout.tsx` to instantiate and pass
  only the single theme state.
- [x] Update `index.html` migration and three-theme prepaint before React mount.
- [x] Rollback point: state/hook/App/index changes compile before visual work.

## 2. Build the single direct control

- [x] Refactor `src/components/Navigation.tsx`: make Logo+wordmark a normal home
  link, remove both old appearance controls, and add one three-option group with
  Lucide icons, theme swatches, direct selection, ARIA pressed state, tooltips,
  and a live current-theme label.
- [x] Update `src/styles/navigation.css` for compact desktop and 320/390/430
  mobile containment, stable target sizes, focus, pressed, hover, and theme
  material states.
- [x] Preserve HarborIntro docking to the measurable `.nav-logo` shell.
- [x] Rollback point: navigation remains usable without theme-specific polish.

## 3. Collapse Flow into three complete profiles

- [x] Rename the typed profile contract in `src/background/flowPalettes.ts` from
  scene to theme and remove the dark/light profile matrix.
- [x] Define Morning, Nature, and Stellar desktop/portrait palettes, dynamics,
  effects, starfield profiles, Stellar effects, and render budgets.
- [x] Update `FlowRenderer`, `flow.worker.ts`, and messages only where the renamed
  serialized field requires it; preserve the existing renderer lifecycle.
- [x] Update `FlowBackground` to read one root theme, publish theme diagnostics,
  and observe only the new theme/version signals plus existing lifecycle state.
- [x] Verify the Worker and main-thread paths render the same selected profile.

## 4. Migrate starfield and Stellar effects

- [x] Update `StarfieldBackground` to consume one theme profile, publish
  `data-starfield-theme`, and keep theme-specific density/motion/low-power rules.
- [x] Update `StellarEffects` to read the new theme and enable edge/brand/
  perimeter effects only for Stellar.
- [x] Update `RightScrollCards` raw dataset comparisons, observer filters,
  theme-specific tilt, pointer glow, and border-flow gates.
- [x] Preserve cleanup for RAF, listeners, observers, injected edge layers, and
  root CSS variables.

## 5. Migrate intro and all component diagnostics

- [x] Rename HarborIntro props and Logo-shell data from HarborScene to SiteTheme
  without changing the session lifecycle or docking geometry.
- [x] Search all TS/TSX for old types, hooks, storage keys, dataset names,
  `light-theme` as state, and scene-specific string branches; update every owner
  or explicitly document a derived compatibility use.
- [x] Remove unused old hook exports/files only after all imports are migrated.
- [x] Run TypeScript/build to catch the unused Layout and lazy-route contracts.

## 6. Implement full Morning materials

- [x] Rebuild Morning tokens in `appearance-themes.css` from the reference warm
  fluid composition, using dark ink and light translucent surfaces.
- [x] Apply Morning-aware navigation, Logo, Hero, panel, card, action, mobile tab,
  footer, selection, and route surface tokens across the existing CSS files.
- [x] Ensure CSS fallback, reduced-motion, and low-power states retain the same
  Morning identity without animation.
- [x] Capture desktop/mobile Morning screenshots and correct contrast/overflow.

## 7. Implement full Nature materials

- [x] Rebuild Nature tokens from the reference cyan/green botanical composition,
  with dark green ink and pale translucent surfaces.
- [x] Apply Nature-aware navigation, Logo, Hero, panel, card, action, mobile tab,
  footer, selection, route surfaces, and calmer card motion.
- [x] Ensure no Stellar edge/perimeter styling remains visible.
- [x] Capture desktop/mobile Nature screenshots and correct contrast/overflow.

## 8. Refine Stellar without adding owners

- [x] Preserve the verified Stellar field, dense stars, cool glass, warm accent,
  edge glow, brand glow, and perimeter flow while moving selectors to the new
  single-axis contract.
- [x] Check intro/resume, hidden/resume, pointer edge, reduced motion, low power,
  no-WebGL, and Worker fallback behavior after selector migration.
- [x] Capture desktop/mobile Stellar screenshots and compare with the saved
  reference composition.

## 9. Replace automated appearance verification

- [x] Update `scripts/check-ui.mjs` from a 2x3 matrix to exactly three themes.
- [x] Test direct pointer/keyboard selection, ARIA pressed state, refresh
  persistence, Morning default, and all legacy migration paths.
- [x] Assert root/Logo/Flow/Starfield/Stellar/intro/carousel diagnostics and
  monotonic profile versions agree after switching.
- [x] Assert Morning/Nature bright-surface contrast and Stellar-only star/effect
  behavior, one Canvas per owner, mobile containment, reduced motion, low power,
  hidden/resume, and fallback paths.
- [x] Update `scripts/check-production-appearance.mjs` to the bounded read-only
  three-theme desktop/mobile matrix and new persistence/migration checks.

## 10. Full validation, visual audit, and delivery

- [x] Run `git diff --check`.
- [x] Run `npm.cmd run lint`.
- [x] Run `npm.cmd run build`.
- [x] Run `npm.cmd run performance:check`.
- [x] Start a production-like local preview on a free port.
- [x] Run `UI_CHECK_BASE=<local> npm.cmd run check:ui:smoke`.
- [x] Run `UI_CHECK_BASE=<local> npm.cmd run check:ui`.
- [x] Run `UI_CHECK_BASE=<local> npm.cmd run check:ui:production-appearance`.
- [x] Capture and inspect Morning/Nature/Stellar at `1440x900`, `390x900`, and
  `430x900`, including nonblank canvas-pixel and layout containment checks.
- [x] Re-run targeted checks after every visual correction until clean.
- [x] Verify `public/status/blog-semi-synthetic.json` is still the user's only
  unrelated change and excluded from the task diff/staging.
- [x] Complete the Trellis quality check and spec-impact review, then commit and
  push `main` only after all gates pass.

## Risk and rollback map

- State/prepaint mismatch: rollback `appearance.ts`, `useSiteTheme`, and
  `index.html` together; never roll back only one source of first-paint truth.
- Renderer mismatch: keep the complete serializable profile shape and roll back
  profile field renames with Flow/Worker diagnostics in one change.
- CSS cascade regression: correct semantic theme tokens before adding local
  selectors; do not restore a second appearance axis.
- Mobile navigation pressure: reduce visual chrome within the stable three-button
  group, not touch target size or route access.
- Lifecycle regression: retain existing owners and observer/RAF cleanup; no new
  renderer or global animation loop is an acceptable fix.
