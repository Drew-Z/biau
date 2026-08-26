# Single-axis reference-faithful themes

## Goal

Replace the current dual-axis appearance model with one explicit, persistent
three-theme system: `morning | nature | stellar`. Reproduce the reference
site's observable theme composition and material language on the BIAU Port
layout while retaining BIAU Port identity, content, routes, accessibility, and
the existing bounded rendering architecture.

## Background

- The deployed site currently combines `light | dark | auto` with
  `dusk | garden | stellar`, as defined in `src/utils/appearance.ts:1-15`.
- The scene control is the Logo while the visible moon control changes only
  color mode (`src/components/Navigation.tsx:78-130`). This makes the three
  scene choices difficult to discover and presents two competing appearance
  controls.
- Current Dusk and Garden remain dark materials
  (`src/styles/appearance-themes.css:227-309`), whereas the saved reference
  presents a bright warm Morning theme, a bright green Nature theme, and a dark
  navy Stellar theme (`D:/workspace4Cursor/resourses/沐星埠.html:30-88`).
- Existing Flow, Starfield, StellarEffects, Worker/main-thread fallback,
  reduced-motion, visibility, low-power, and intro-resume owners are already
  tested and must be reused rather than duplicated.
- The previous dual-axis decision in
  `.trellis/tasks/archive/2026-08/08-25-final-reference-parity/` is superseded by
  the user's explicit single-axis requirement. Its renderer lifecycle and
  cleanup guarantees remain applicable.
- `public/status/blog-semi-synthetic.json` is an unrelated user modification
  and must not be edited, staged, or committed by this task.

## Requirements

### R1. One authoritative theme state

- Define one typed theme union: `morning | nature | stellar`.
- Persist it under a single new BIAU Port theme key and expose one authoritative
  root attribute plus a monotonic version signal for visual owners.
- Remove `light | dark | auto` as user-selectable state and remove the separate
  HarborScene state axis. A compatibility class may exist only as a derived
  implementation detail and must not be independently stored or controlled.
- Migrate legacy scene values exactly as `dusk -> morning`,
  `garden -> nature`, and `stellar -> stellar`. A valid value under the new key
  takes precedence over legacy values.
- A browser with no valid new or legacy preference defaults to `morning`.

### R2. One explicit three-option control

- Replace both the Logo scene action and moon color-mode action with one
  accessible three-option theme control.
- The Logo returns to a side-effect-free home/brand affordance.
- Desktop and mobile users must be able to select Morning, Nature, or Stellar
  directly with pointer and keyboard input; current selection and labels must
  be programmatically exposed.
- Do not add onboarding, spotlight, sound, 3D Logo, hidden gestures, or a second
  settings surface.

### R3. Reference-faithful Morning

- Replace Dusk with a bright warm Morning composition: warm rose/yellow to
  cyan/blue fluid field, dark readable text, translucent light navigation and
  panels, restrained multicolor accents, and theme-matched Logo/footer.
- Morning must remain recognizable in static, reduced-motion, low-power, and
  no-WebGL paths.

### R4. Reference-faithful Nature

- Replace Garden with a bright botanical Nature composition: pale cyan/green
  to deeper leaf-green fluid field, dark readable text, translucent green
  surfaces, organic restrained accents, and theme-matched Logo/footer.
- Nature must remain recognizable in static, reduced-motion, low-power, and
  no-WebGL paths.

### R5. Reference-faithful Stellar

- Preserve and refine the current dark Stellar foundation: deep navy fluid
  field, dense multi-depth starfield, cool glass surfaces, warm restrained
  highlights, and Stellar-only edge/perimeter effects.
- Stellar effects must not leak into Morning or Nature.

### R6. Full semantic token coverage

- Each theme must explicitly own the page background, Flow profile, starfield,
  navigation, Logo material, Hero typography/accent, panels, cards, actions,
  controls, footer, selection, and route surface tokens.
- The three themes may share DOM and component structure, but must not be mere
  hue substitutions on one dark material.

### R7. Atomic transition and first paint

- Theme changes use the existing reduced-motion-aware View Transition pattern
  with synchronous root/storage/React state commitment.
- `index.html` must restore and prepaint the single theme before React mounts,
  with no 2x3 combination or system-color dependency.
- Invalid or unavailable storage must fail to the chosen default without
  blocking rendering.

### R8. Preserve rendering ownership and performance

- Keep one Flow canvas/renderer owner, one Starfield owner, and the existing
  bounded StellarEffects owner; do not add another full-screen Canvas,
  persistent RAF, fixed grid/line field, or unowned global decoration.
- Preserve Worker and main-thread fallback, WebGL fallback, hidden/resume,
  intro pause/resume, reduced-motion, mobile, and low-power cleanup behavior.

### R9. Update all consumers and diagnostics

- Update App, unused-but-typechecked Layout, HarborIntro, Flow, Starfield,
  StellarEffects, RightScrollCards, Navigation, CSS selectors, data attributes,
  storage reads, and diagnostics to the single theme contract.
- Renderer and Worker code may retain the complete profile shape but must not
  infer a second theme axis.

### R10. Replace the verification matrix

- Replace the six-combination checks with a three-theme matrix on desktop and
  mobile.
- Verify direct selection, keyboard operation, refresh persistence, migration,
  first-paint state, owner/profile agreement, theme-specific effects,
  contrast, containment, no horizontal overflow, reduced motion, low power,
  hidden/resume, and fallback behavior.
- Capture comparable visual evidence for all three themes at desktop and mobile
  sizes and audit it against the saved reference composition.

## Acceptance Criteria

- [ ] AC1: Exactly one user-selectable appearance state exists and its valid
  values are `morning`, `nature`, and `stellar`; no visible light/dark/auto or
  independent scene control remains. (R1, R2)
- [ ] AC2: The three themes are directly selectable with mouse, touch, Tab, and
  keyboard activation, with current state exposed through ARIA. (R2)
- [ ] AC3: Refresh preserves the selected theme; legacy Dusk/Garden/Stellar
  preferences migrate once without a wrong-theme first frame. (R1, R7)
- [ ] AC4: Morning and Nature are genuinely bright, reference-faithful visual
  systems, while Stellar remains a dark starfield system; page, Hero, nav,
  panels, cards, controls, Logo, and footer change coherently. (R3-R6)
- [ ] AC5: Root theme, Flow, Starfield, StellarEffects, intro mark, Logo, and
  carousel diagnostics agree after every switch; profile versions advance
  atomically. (R7, R9)
- [ ] AC6: Dense starfield and edge/perimeter effects run only in Stellar;
  Morning/Nature retain their own bounded background and interaction profiles.
  (R3-R5, R8)
- [ ] AC7: There remains exactly one Flow canvas and one Starfield canvas, with
  no new permanent animation owner; existing lifecycle and fallback checks pass.
  (R8)
- [ ] AC8: Desktop and 320/390/430 mobile views have readable contrast,
  contained controls, no horizontal overflow, and stable layouts in all three
  themes. (R6, R10)
- [ ] AC9: `npm.cmd run lint`, `npm.cmd run build`,
  `npm.cmd run performance:check`, `npm.cmd run check:ui:smoke`,
  `npm.cmd run check:ui`, and the local production appearance matrix pass. (R10)
- [ ] AC10: Visual evidence for three desktop and three mobile states is
  reviewed; intentional differences are limited to BIAU Port identity,
  content/layout, assets, and excluded interactions. (R3-R6, R10)
- [ ] AC11: `public/status/blog-semi-synthetic.json` remains untouched and
  excluded from any task commit. (R8)

## Out Of Scope

- Copying the reference Logo, brand, content, proprietary font, audio, 3D Logo,
  spotlight onboarding, compressed runtime, private debug panels, or external
  assets.
- Rewriting BIAU Port routes, product data, blog/status content, assistant,
  backend, CMS, or deployment architecture.
- Preserving all six historical `color mode x scene` combinations after
  migration; the user explicitly chose a lossy single-axis replacement.
