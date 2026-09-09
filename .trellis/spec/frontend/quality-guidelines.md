# Frontend Quality Guidelines

## Required Verification

For frontend/config changes:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

Also run feature-specific checks such as `analytics:check`, `project-details:check`, `blog:check`, or `status:contract` when their contracts change.

For shared-language changes, run `npm.cmd run language:ui` against the current
local build. `checkSiteLanguage` is also included in full UI. It verifies both
languages across 320/390/430/1440px and three theme selections, keyboard focus,
route/history/refresh persistence, a second document, invalid/blocked storage,
lazy route loading, 404 recovery, localized accessible names, and actual content
language markers. Its network guard allows local fixtures only and asserts zero
model calls. Keep authored content Chinese until its separate translation phase.
Do not reset language storage in an init script before a persistence assertion.

The same language matrix also verifies both catalog interfaces: titles, search
and pagination names, native/desktop column identities, counts, project groups,
card actions, authored-text language markers, 44px targets and text containment.
Compare authored content and publication-action snapshots across switches and
assert stable URL/history plus a connected catalog DOM node. Exercise every
column's no-results state in both languages and real first-publication states.
Blog discovery retains real keyboard and background contrast sampling in both
languages; project reload checks assert persistence before any corrective action.

`checkDetailReadingLanguage`, called by the same language entry, covers article
and project controls, fixed and authored section languages, preserved content /
publication / image snapshots, connected article/guide nodes, stable ids and
history, outline focus/Escape/real anchors, missing returns and delayed content.
Test language-state continuity separately from the existing outside-pointer
dismissal. AI Daily guide items retain Chinese semantics while their shared
guide controls translate; status guide items follow the selected language.
Fixture payloads must satisfy the real decoder,
including explicit nullable `uncertainty` and `correctedAt` fields.

`checkProjectInterfaceLanguage` extends the same entry with the homepage project
panel, catalog and representative project details across the four widths and
three themes. Keep authored text and action-target snapshots separate from
translated-label assertions; compare access mode, target/type/intent, safe link
attributes, carousel DOM identity and history. Cover real language clicks,
refresh persistence and keyboard entry. Desktop catalog links remain hidden by
its existing layout: use its detail button and then the detail status link;
mobile tests must require a visible, focused status button before Enter.
An SPA URL can change while the previous catalog still renders during lazy
loading. Wait for the detail root and its prescribed heading focus before
focusing the next command; URL completion alone does not mean the page is ready.
Canvas currently has no candidate links, so assert zero rather than fabricating
an action or requiring a nonempty list for every project. Registry fixtures
cover generic access states not present in current public browser data.

Homepage full action labels may wrap inside the fixed button column. Keep their
font size, explicit short labels, and separate icons; `.carousel-action__label--full`
uses `min-width: 0`, normal whitespace and bounded word wrapping. Assert label
and icon rectangles lie inside the button as well as checking the page bounds:
an 88px button can contain a 99.6px text label in the viewport while overflowing
its own background. Inspect representative desktop screenshots after this check.

`checkStatusInterfaceLanguage` covers overview, detail and missing status pages
at four widths and three themes: 36 page groups, four delayed/error groups and
three overview branches. Compare original evidence, counts, tone classes and
link targets before/after real language clicks; retain connected page nodes,
stable section ids, URL/history, request counts, refresh preference and theme.
Check translated fixed labels separately from authored Chinese text, date
formatting and raw freshness evidence. Delayed/error fixtures must preserve the
static fallback and must not retry just because the language changed.
Exercise section selection and outline focus/Escape/anchors, 44px mobile
targets and text containment. For continuity assertions across a language
switch, locate the same control by stable identity and assert its translated
accessible name separately: a locator bound to the old English name cannot
resolve the control after it becomes Chinese. Keep native outside-pointer
dismissal separate from DOM-click language-state checks. Review representative
screenshots; fixture statuses are not production availability evidence.
This module is shared by the Node-based `language:ui` and tsx-based full UI
commands. Load TypeScript fixture data with the existing `tsx/esm/api` scoped
`tsImport` API; a static `.ts` import can pass under tsx and still fail when Node
resolves an extensionless transitive import. Validate the actual npm entry point
without changing application imports or adding a global loader.

For the public AI Daily Feed or detail route, also run:

```powershell
npm.cmd run ai-daily:public-feed-check
npm.cmd run analytics:check
npm.cmd run docs:deployment-check
```

## Pull Request Baseline

`.github/workflows/site-quality.yml` runs on ordinary pull requests, main pushes,
and manual dispatch. It uses Node 22 and the existing npm commands for lint,
build, blog/project discovery, analytics, registry, performance, and browser
smoke. Keep the full local `check:ui` delivery gate above; CI smoke covers seven
routes at three widths and does not replace the specialist interaction matrix.

Keep this workflow independent of production credentials, public knowledge
generation, local AI Daily acceptance records, deployment, and schedules. Its
token permission is `contents: read`, and checkout must not persist credentials.
Do not substitute the broader `verify` command for this bounded baseline.

Install Chromium with its system dependencies, bind preview to loopback with
strictPort, reject an occupied port, bound readiness polling, and clean up the
owned Node PID on exit. Explicit Bash/pipefail must preserve smoke failures
through tee. Upload only the current preview/smoke logs from RUNNER_TEMP. When
changing this lifecycle, verify success, failure propagation, and port-conflict
cleanup; distinguish local shell validation from actual GitHub runner results.

## Review Priorities

1. Broken routes, hidden content leaks, or credential exposure.
2. Mobile overflow, overlap, inaccessible controls, or unreadable detail pages.
3. Cross-layer payload drift and stale public facts.
4. Performance regressions, flicker, unstable canvas/intro state, and unnecessary bundle cost.
5. Visual polish.

## UI Rules

- Reuse class-based CSS, design tokens, and `lucide-react`.
- Keep cards at 8px radius or less unless an existing component requires otherwise.
- Use icons for familiar actions and accessible labels/tooltips for unfamiliar controls.
- Do not nest decorative cards or turn whole page sections into floating cards.
- Text must wrap within controls/panels at 320px through desktop widths.
- Stable tools, boards, tab bars, counters, and media use explicit responsive dimensions.
- Letter spacing is `0`; do not scale font size directly with viewport width.
- Preserve a multi-color but restrained palette; do not regress to a one-note dark-blue/purple/beige theme.

## Navigation Typography Contract

Desktop top-navigation labels are one shared visual system across `/`, catalog
routes, detail routes, and every theme/language state. Define its five text
measurements once on `.navigation-top`; both `.nav-link-center` and
`.nav-link-en` consume those custom properties. Page-specific selectors may
change layout, surface treatment, and state emphasis, but must not override
`font-family`, `font-size`, `font-weight`, `letter-spacing`, or `line-height`.
This prevents a route change from changing label width, weight, or baseline.

```css
.navigation-top {
  --nav-desktop-font-family: var(--font-ui);
  --nav-desktop-font-size: 14px;
  --nav-desktop-font-weight: 650;
  --nav-desktop-letter-spacing: 0;
  --nav-desktop-line-height: 1.2;
}

.nav-link-center,
.nav-link-en {
  font-family: var(--nav-desktop-font-family);
  font-size: var(--nav-desktop-font-size);
  font-weight: var(--nav-desktop-font-weight);
  letter-spacing: var(--nav-desktop-letter-spacing);
  line-height: var(--nav-desktop-line-height);
}
```

`active`, `hover`, and `focus-visible` may change color, background, shadow,
underline, or a bounded non-measurement translation. They must not change the
five properties above, apply text scale, or alter the label's measured width or
height. The mobile `.mobile-tab__label` has its own readable contract
(`10px / 750 / 0 / 1.05`) and likewise remains stable across route/theme/language
states; do not force desktop values onto it.

When changing navigation CSS, `scripts/check-ui.mjs` must retain its
`navigation-typography` browser group: inspect computed values and label bounds
for `/`, `/projects`, `/blog`, `/status`, a project detail, and a blog detail;
cover desktop `1440`, mobile `320/390/430`, `morning/nature/stellar`, Chinese
and English, plus initial/active/hover/focus-visible/route-switch states.
Normalize browser-serialized `letter-spacing: normal` to `0px`; a failure must
identify the route, viewport, theme, language, and state rather than weakening
the assertion.

## Desktop Active Navigation Visual Contract

Desktop route tabs also share one target and indicator geometry. Keep the four
items at `96px` minimum width with an `8px` gap, `8px 12px 12px` padding, and an
`8px` radius so changing routes does not swap between wide compact targets and
narrow widely spaced targets. The active indicator is a `56px × 2px` line,
positioned `4px` from the bottom with a `1px` radius. Its color and restrained
shadow come from `--home-accent` / `--home-accent-soft`; do not add a second
route-only glow pseudo-element.

```css
.navigation-top {
  --nav-desktop-item-gap: 8px;
  --nav-desktop-item-min-width: 96px;
  --nav-active-indicator-width: 56px;
  --nav-active-indicator-height: 2px;
}

.nav-link-center.active::before {
  content: none;
  display: none;
}
```

Homepage, catalog, and detail selectors must not override this geometry.
Theme color differences are intentional, but within one theme the computed
active background, indicator gradient, shadow, and pseudo-element visibility
must stay identical across routes and across active hover/focus states. The
`navigation-typography` browser group owns these computed-style and geometry
assertions alongside the existing text contract.

At `769–1023px`, keep the same four route tabs and active contract but use the
intermediate desktop shell: Logo, route tabs, language, and the three-theme
selector remain visible; the duplicate brand-text home link and primary CTA may
hide because Logo and the explicit Home tab preserve that destination. At
`1024px` the complete desktop brand and subpage CTA return. Tests must compare
the actual rectangles of the shell, its three regions, all route links, and all
visible controls against the viewport and against adjacent regions. A matching
`scrollWidth` / `clientWidth` pair is not sufficient because global horizontal
clipping can hide an out-of-bounds control without creating a scrollbar.

## Motion Content Readability Contract

Desktop auto-moving content must preserve readable edge content and a stable
keyboard target. Decorative viewport masks may soften the clipping edge, but
their fully transparent range must stay outside primary text and actions. For
the home carousel, each edge fade is capped at `6px`; mobile keeps the mask
disabled because it renders a static vertical list.

Mouse hover and keyboard focus are equivalent pause signals for automatic
carousel motion. Keep the track stationary while focus remains anywhere inside
the panel, including nested action buttons, and resume only after focus leaves
the complete panel. `scripts/check-ui.mjs` must verify the mask depth from
computed styles and measure track movement while a nested action owns focus;
do not let a concurrent pointer hover make the keyboard assertion pass.

## Content Studio

- Mobile uses focused workspace modes; desktop keeps the complete workspace visible.
- The review queue and next-review action remain visible before records load.
- Token inputs use password semantics and never echo values in status copy.
- Draft, source, AI Daily, review, and export forms preserve local edits when switching focused sections.
- Public preview is clearly separate from editable/internal metadata.
- AI Daily workspace tabs expose standard `aria-controls` / `tabpanel` associations and remain within the viewport from 320px through desktop widths. Candidate, Flash, and Edition controls expose pending, conflict, validation, destructive-action reasons, and audit status; local fixtures exercise their deterministic write mirrors without contacting a deployed service.

## Mobile Navigation And Reading

- Mobile tab bar includes exactly the public primary sections.
- Its grid track count equals the shared `Navigation` route count (currently four). The first and last tabs fill the padded content edges, every track is equal width, and route changes preserve that contract. Never retain an empty fifth track or invent a disabled destination to fill it.
- Touch targets are at least 44px where practical.
- Project detail `.link-badge` and `.project-visual__source-link` use 44px minimum
  height inside the existing 720px breakpoint. Cover quick links, ordinary links
  and image sources in both languages without changing desktop density.
- Blog/project missing details use `.detail-missing--catalog .btn` with 44px
  minimum height inside the existing 720px breakpoint. Scope this to those
  measured return actions; preserve other missing-page families and desktop
  density. Check both languages, visibility, text fit and actual return URLs.
- At `max-width: 720px`, blog pagination uses two flexible button columns around
  the page counter, 44px minimum targets and bounded inline padding. Keep English
  Previous/Next and the counter aligned in one row at 320/390/430; font scaling,
  clipped labels and a wrapped second button are not acceptable fixes.
- On `/status`, `.status-target__actions .btn` and `.status-project-card__link` use `min-height: 44px` within the existing `max-width: 720px` rules; keep the desktop `40px` density. Do not widen the shared selector to status-detail or missing-page actions without separate evidence.
- The status mobile browser matrix at `320/390/430` must find both action groups and assert visible, measurable targets at least `44px` wide/high with horizontal viewport containment. Missing groups and hidden/zero-size actions must fail; filtering them out before measurement can make an inaccessible page pass. Use scrolled screenshots and hit testing to verify reachability, not `scrollWidth` alone.
- Status-section navigation uses explicit `instant` scroll behavior for reduced motion and long jumps. Do not temporarily override root `scroll-behavior` or restore a stale selected section in a later animation frame; rapid section changes and subsequent wheel input must leave the scroll spy in control. Browser checks exercise all six section choices followed by real wheel input, asserting the target position, current section, sticky position and unchanged page containment.
- Status-detail controls also use `min-height: 44px` at `max-width: 720px`: `.status-detail-actions .btn`, `.status-project__header-tools > a`, and `.site-status-page .detail-missing .btn`. Keep the desktop `40px` actions / `30px` header link and the non-interactive count badge unchanged. Scope the missing-state override to the status page so other detail families retain their own evidence and layout contracts.
- `checkStatusDetailReadingNavigation()` covers two hero actions plus one header return link on a valid status detail and one return action on a missing status detail, at desktop and `320/390/430` with three themes and both language states. Require exact counts and destinations, visibility, minimum dimensions, horizontal containment, and center-point hit testing after scrolling. The missing route must omit the reading guide and return to `/status` on Enter.
- A fixed mobile tab bar uses an opaque surface so cards and text never remain visibly readable through the bar; the page content reserves `--mobile-tabbar-clearance` plus a content gap so the last interactive item can be scrolled above the bar.
- Compact mobile navigation keeps a readable brand identity in `.nav-brand-text`; route-specific mobile overrides must not hide it after the base navigation rule runs. UI checks assert brand width and the compact project CTA label at `320`, `390`, and `430` widths.
- Homepage navigation at `max-width: 768px` uses `minmax(0, 1fr) auto`; its brand
  section may shrink and its title wraps inside the available width. Retain the
  44px language/theme controls. Check visible brand text containment and its
  rectangle against the language button, then exercise real clicks in both
  directions. Fixed title width plus visible overflow can intercept the click
  even when the document itself has no horizontal scrollbar. Verify the
  380/381 and 768/769 boundaries when changing these rules.
- Blog/project/status details remain vertically readable without forced horizontal swiping.
- Floating assistant/reading controls collapse or offset near final content and footer.
- Drawers/modals remain within viewport, expose close actions, and avoid global-nav overlap.
- Page scroll remains the default gesture; component effects use explicit buttons/taps where gesture conflict would harm reading.

## Flow Background And Intro

### Single-Axis Reference Theme Parity

- `morning`, `nature`, and `stellar` are complete visual systems, not a
  light/dark overlay plus a scene value. The root's `data-site-theme` is the
  only appearance contract; `light-theme` is derived compatibility only.
- Profile parity uses the reference runtime's complete typed values, not only
  gradient stops. A numeric profile keeps its reference unit through
  `FlowThemeProfile -> renderer/worker -> shader`; implicit legacy scaling is
  a regression even when the resulting value remains in a plausible range.
- Screenshot audits cover desktop plus `320`, `390`, and `430` mobile widths.
  Motion frames need not match pixel-for-pixel, but Nature must retain the
  reference class of pale-cyan and deeper leaf-green low-frequency cloud forms.
- Keep `FlowRenderer`, `StarfieldBackground`, and `StellarEffects` as the
  existing bounded visual owners. Do not add a Canvas, Worker, permanent RAF,
  or unowned full-screen decoration.

- Normal mode may use the full animated background; reduced motion must show a stable nonblank canvas frame when WebGL2 is available, or a stable nonblank CSS fallback otherwise.
- Keep the eager CSS composition order `catalog-pages.css` -> `flow-pages.css` -> `appearance-themes.css` -> `hero-split.css` -> `navigation.css`. Flow supplies the renderer/fallback foundation; appearance supplies semantic tokens; the final homepage and navigation layers must remain able to project those tokens instead of being overwritten by older transparent Flow surfaces.
- Avoid continuous React state updates from animation frames.
- Canvas owns its render loop and disposes resources/listeners on unmount.
- Stellar entity-edge layers for navigation, Hero, and project panel share the existing `StellarEffects` owner. That owner publishes any cross-subtree strength token on `:root`, measures pointer coordinates in each target's local box, and removes dynamically appended layers, target classes, inline coordinates, root tokens, RAF, and listeners together. A token scoped only to the fixed owner does not inherit into layers appended under other DOM targets and will silently make those layers transparent.
- Worker resize, palette, and motion messages must not create parallel render timers. Runtime `prefers-reduced-motion` changes must use a token-correlated acknowledgement exposed as DOM state, stop on one static frame, and resume one render loop when animation is allowed again; UI checks wait for that acknowledgement instead of an arbitrary delay. Runtime or message failures must hide the stale canvas and reveal the explicit CSS fallback state.
- An OffscreenCanvas worker must not emit `motion-settled` in the same task as the final draw. Defer the acknowledgement by a cancelable `120ms` compositor window, cancel that timer on every newer motion token, and re-check the token before posting. Keep the strict pixel threshold and two-browser-frame presentation wait in the UI check; the compositor window is synchronization, not permission to loosen the assertion. This keeps DOM state from claiming stability while the browser still presents the previous animated frame.
- Reduced-motion synchronization must not trust one retained `MediaQueryList` change event as the only source of truth. Read the current query value when synchronizing, retain a low-frequency fallback poll that only acts on value changes, and send the resolved value to the worker. A late worker acknowledgement is accepted only when its token is current or its reduced/running tuple still matches the current page state; stale contradictory acknowledgements are ignored.
- Pixel stability checks run against the production preview worker path. After the DOM acknowledgement, wait for two browser animation frames so the compositor can present the acknowledged canvas frame, then compare pixels; do not replace this with a fixed sleep or a looser motion threshold.
- Route changes must not repeatedly restart expensive initialization or cause project/blog page flicker.
- Intro completion must land on the stable navigation logo position and not block first interaction indefinitely.
- Visual checks compare desktop/mobile framing, exercise both runtime motion-preference directions, and confirm either a nonblank canvas or the explicit CSS fallback state.

### Appearance Validation Matrix

- Check exactly `morning`, `nature`, and `stellar`. Each must expose matching
  root/Flow/Starfield/Stellar/intro diagnostics, a visible `BiauPortMark`, and
  at least `4.5:1` contrast for homepage Hero and normal-size card titles.
- Direct pointer and `Enter` activation update `biau-port-theme` and the root
  dataset, then survive reload. A fixture seeds a default only when the new key
  is absent; it never overwrites the value used by the reload assertion.
- Run mobile containment at `320`, `390`, and `430` widths for all themes. The
  Logo, three 44px theme targets, language control, cards, actions, and bottom
  navigation remain visible and non-overlapping.
- Preserve three distinct Flow dynamics tuples. Surface-token checks do not
  replace Canvas-pixel, reduced-motion, fallback, intro-docking, and performance
  assertions.
- A theme is not a color alias. Morning, Nature, and Stellar each define a
  distinct Flow palette/composition, full-viewport material, panel/card
  treatment, and control accent behavior. Nature specifically retains the
  reference cyan-to-leaf-green cloud composition rather than a mint recolor.
- `FlowBackground` owns one fixed, pointer-inert theme foundation around the existing canvas. It contains exactly three CSS-only static layers (`wash`, `texture`, and `landmark`); do not add another canvas, request, timer, or animation loop for theme identity. The foundation remains visible behind the canvas and when the canvas enters CSS fallback.
- The theme continues below the Hero and across longer public pages. The site footer consumes theme-specific background, pattern, border, and shadow tokens instead of a generic black/light surface. Full-page desktop/mobile evidence must include the Hero-to-footer transition.
- Appearance signatures include the foundation base, all three static layer backgrounds, texture sizing, Hero panel material, and footer background. A first-viewport screenshot or Flow-canvas hash alone cannot prove the full-page theme contract.
- At desktop widths above `1024px`, the homepage intro and project board form two explicit columns whose visual centers align vertically while the intro copy remains left-aligned. At `1024px` and below, restore the single-column reading order without horizontal overflow.
- When the homepage board also receives runtime depth or tilt transforms, apply a tall-desktop static alignment nudge with `position: relative; top: ...` rather than another `translate` declaration; this keeps the geometry stable when the runtime transform is composed or animated.

### Brand Experiment Isolation And Comparison Matrix

- The `/studio/brand/logo-lab` route is lazy-loaded and review-only. It must not
  enter the public navigation, project catalog, sitemap, or production status
  payload, and mobile must hide the global tabbar so the long comparison surface
  remains reachable.
- Candidate marks are evaluated against the same `64 × 64` geometry contract in
  color and monochrome at `24`, `40`, `48`, and `64px`, across `morning`,
  `nature`, and `stellar`, with reduced-motion enabled. A candidate that is
  blocked or incomplete keeps an explicit review label; it is never presented as
  an independent final delivery.
- The smoke check must assert nine rendered and nine labelled marks per
  candidate, no document overflow at desktop/`390`/`320`, and no mobile tabbar
  on the experiment route. The production `BiauPortMark` and favicon remain
  unchanged until a separate product decision and migration review.

```text
Correct: lazy Logo Lab -> shared test matrix -> explicit candidate review label
Wrong: import an experimental mark into Navigation or replace favicon during a
       visual comparison, then infer production readiness from one screenshot
```

### Theme Motion Ownership

- The existing Flow canvas remains the only continuous JavaScript-rendered
  background. Theme-specific material motion belongs to existing CSS layers
  and the footer; do not add a second canvas, a React frame-state loop, or a
  timer-driven starfield.
- `FlowBackground` may own one event-driven pointer coalescer. It schedules at most one `requestAnimationFrame` after pointer input, writes bounded CSS variables, and cancels the pending frame plus listeners on cleanup. Use the independent `translate` property for pointer parallax and reserve `transform` for theme keyframes so the two effects compose.
- Expose motion state through the existing `data-flow-motion` diagnostics.
  Fine pointers use existing bounded interaction; coarse pointers keep ambient
  motion without pointer parallax; hidden documents and the harbor intro pause;
  reduced motion removes continuous visual drift.
- Reuse `RightScrollCards`' existing pointer handler for theme-tokenized panel
  glow. It remains non-interactive, disappears on pointer exit, and is disabled
  on mobile/coarse and reduced-motion paths.

```tsx
// Correct: one pointer event is coalesced into one style-only paint.
const requestPointerPaint = () => {
  if (!frame) frame = requestAnimationFrame(paintPointer)
}

// Wrong: a second perpetual loop or React state update for ambient motion.
requestAnimationFrame(function animate() {
  setPointerPosition(readPointer())
  requestAnimationFrame(animate)
})
```

- UI checks compare the three computed theme signatures, observe changing
  normal-motion frames, verify fine-pointer panel glow, and prove intro/reduced
  transitions pause or remove motion before the Flow loop resumes.

### Harbor Theme Intro Lifecycle

- No theme may restore a competing full-screen `body` or `.app` background
  gradient. The Flow CSS fallback and current canvas owners remain the only
  background composition owners.
- `FlowBackground` and `StarfieldBackground` observe `class`,
  `data-site-theme`, and `data-site-theme-version` because `HarborIntro` gates
  animation through `harbor-intro-active`. On class removal, reuse the existing
  `sync()` path to resume one renderer/worker and one RAF; do not recreate the owner.
- Intro-resume UI checks wait for the class to be removed, the owner state to report `running`, the compositor opacity transition to settle, and at least two normal-motion frame samples to differ. A screenshot taken during the 420ms opacity transition is not valid evidence of a missing background.

```tsx
// Correct: root class changes reuse the existing lifecycle synchronizer.
const rootClassObserver = new MutationObserver(() => sync())
rootClassObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

// Wrong: recreate the renderer when HarborIntro leaves.
new FlowRenderer(canvas)
```

## Flow Theme Profile And Preview Contract

### 1. Scope / Trigger

This contract applies when a theme change crosses `FlowBackground`, the
OffscreenCanvas worker, and `FlowRenderer`. It prevents a palette-only change
or implicit numeric transform from silently losing the reference composition,
and prevents a UI check from passing against an old server process.

### 2. Signatures

- `getFlowProfile(theme, portrait): FlowThemeProfile` is the single
  profile factory.
- Worker messages are `init`, `resize`, `profile`, and `motion`; every motion
  acknowledgement carries the current `motionToken`.
- `FlowRenderer.draw(time, profile)` and `FlowRenderer.setProfile(profile)` are
  the only renderer profile entry points. No second Canvas or render loop is
  allowed.
- The homepage Canvas exposes `data-flow-theme` and the pipe-delimited
  `data-flow-dynamics` attribute for deterministic browser assertions.

### 3. Contracts

`data-flow-dynamics` has exactly seven numeric values in this order:
`speed|fieldScale|distortion|ribbonStrength|noiseScale|contrast|angle`.
The values are reference units, not generic normalized ranges. Current desktop
tuples are Morning `15|0.53|0.39|0.33|0.2|1.09|318`, Nature
`10|0.82|0.19|0.75|3|1.03|318`, and Stellar
`15|0.67|0.71|0.41|0.2|1.41|318`. Portrait may change only its documented angle
and palette ordering.

`FlowRenderer` maps the profile directly: `u_time = seconds * (26 / speed)`,
`u_distortion = distortion`, `u_fieldOpacity = fieldScale`,
`u_mistOpacity = ribbonStrength`, and `u_noiseScale = noiseScale`. Do not
reintroduce legacy multiplier/divider conversions. The reference Canvas
composition uses opacity `1` and filter `none`.

The worker receives one complete profile after resize and before the motion
message. A current-token `motion-settled` acknowledgement is required before
UI checks treat reduced/running/paused state as stable. Runtime failure hides
the stale Canvas and exposes the CSS fallback state.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Missing, non-numeric, or mismatched reference value | UI/profile check fails; do not normalize it into a plausible range |
| Profile theme differs from the root theme | UI check fails with the theme group; fix the owner rather than masking it |
| Worker/runtime error | `data-flow-fallback="css"`, Canvas hidden, CSS theme remains nonblank |
| Reduced/hidden/intro state | motion acknowledgement is `reduced-settled` or `paused`; no persistent frame movement |
| Check target serves an older bundle | stop and restart an isolated current preview, then set `UI_CHECK_BASE`; never treat stale output as current evidence |

### 5. Good / Base / Bad Cases

- Good: `npm.cmd run build`, serve the resulting `dist` on an isolated port,
  set `UI_CHECK_BASE` to that origin, and observe the three exact tuples.
- Base: local `npm.cmd run check:ui` against the current preview with the
  shared network guard and no model/API calls.
- Bad: reuse an unknown process on the default port; it can expose a valid
  `data-flow-ready` Canvas while omitting the new profile attributes, making
  the result look like a product regression.

### 6. Tests Required

- `npm.cmd run check:ui:smoke`: route/CSS/overflow assertions.
- `UI_CHECK_BASE=http://127.0.0.1:<isolated-port> npm.cmd run check:ui`:
  assert all three tuples, theme-specific material, Stellar-only edge glow,
  View Transition fallback, hidden/reduced lifecycle, and keyboard title input.
- `npm.cmd run performance:check`, `npm.cmd run lint`, `npm.cmd run build`,
  and `git diff --check`: assert budgets, type/lint correctness, and clean
  patch formatting.

### 7. Wrong vs Correct

Wrong: run the full UI suite against a pre-existing `127.0.0.1:5174` process
without checking its revision, then diagnose missing profile attributes as a
source-code failure.

Correct: build first, start a dedicated preview on an isolated port, pass its
origin through `UI_CHECK_BASE`, and keep the existing server untouched.

### 8. Theme Effects And Low-Power Contract

- Theme-specific shader and material controls belong to the typed
  `FlowThemeProfile.effects` object. Do not scatter brightness, saturation,
  noise-flow, star intensity, or star scale as untyped component constants.
- Keep `data-flow-dynamics` as the original seven-value
  `speed|fieldScale|distortion|ribbonStrength|noiseScale|contrast|angle`
  contract. Adding effect parameters must not change its order, count, or
  numeric bounds; browser checks and downstream diagnostics depend on it.
- Stellar stars are a profile-controlled layer in the existing Flow renderer.
  They must reuse the page's single WebGL/OffscreenCanvas owner, remain
  disabled when `starIntensity` is zero, and never introduce a second Canvas,
  timer-driven starfield, or React frame loop.
- Carousel motion is time-step based: auto-scroll and drag inertia consume
  `deltaTime` and bounded exponential friction so the visual speed is stable
  across 60 Hz, 120 Hz, throttled, and resumed frames. Frame-rate-dependent
  per-tick constants are not acceptable.
- Hidden documents, the harbor intro, and reduced-motion mode stop persistent
  theme rendering and CSS motion while retaining one stable frame. Devices
  advertising at most 2 GB `deviceMemory` or `connection.saveData` also keep
  the Flow frame stable and do not start a perpetual RAF/timer loop. Any
  resume path must schedule at most one new loop and must clear it on cleanup.

### 9. Main-Thread Development Profile Contract

- The `FlowBackground` main-thread fallback must call `publishProfile()` before
  its first draw, just like the production Worker init path. This keeps
  `data-flow-theme` and the seven-value `data-flow-dynamics` diagnostics
  available in isolated Vite previews and prevents the UI matrix from testing
  an untyped canvas state.
- The CSS foundation must remain visible underneath a ready Canvas. A ready
  flag may stop fallback animation, but must not set `.gradient-bg` or the app
  fallback pseudo-elements to `display: none`; the fallback owns the visible
  pixels until the first presented Canvas frame has taken over. The Canvas may
  use one RAF handoff after a valid frame, never a double-RAF gap that creates
  an empty frame.
- `FlowBackground` exposes `data-flow-profile-version` and the root exposes
  `data-site-theme-version` as monotonic diagnostics. A theme change updates
  the root before React paints, so CSS, renderer profile, and decoration
  observe one complete theme instead of a transient half-state.
- Changing the renderer owner or adding a fallback path must preserve the same
  profile attributes, capped-DPR sizing, and theme-change synchronization as
  the Worker path.

Wrong: assume the Worker init is the only place that needs to publish the
profile, then run `check:ui` against a dev server where the Canvas has no
`data-flow-dynamics` attribute.

Correct: publish the current typed profile before constructing the main-thread
renderer and re-publish it from the existing theme/resize synchronization.

### First-Frame Handoff Contract

The fallback and Canvas are layered owners of the same pixels during startup
and runtime failure. UI checks must wait for the actual Canvas/fallback state
and, for CSS motion assertions, wait until a computed transform changes rather
than sampling two fixed timestamps. Browser throttling can present the same
animation frame at both timestamps even when the animation is running.

Wrong: hide the fallback as soon as `data-flow-ready="true"` is set, or fail a
motion check solely because two samples 180ms apart are equal.

Correct: keep the fallback visible and stop only its animation after readiness;
then wait for a real transform change within a bounded timeout and still fail
when no change is observed.

### Production Appearance Verification Command

#### 1. Scope / Trigger

- Run after the appearance bundle reaches Cloudflare Pages or when diagnosing production-only theme, Logo, contrast, or mobile-containment drift.
- This command verifies the deployed homepage only. It does not replace local `check:ui`, exercise Studio fixtures, call a model/API provider, or write public status snapshots.

#### 2. Signatures

```powershell
npm.cmd run check:ui:production-appearance
$env:UI_CHECK_BASE='https://deployment.example'; npm.cmd run check:ui:production-appearance
```

- `UI_CHECK_BASE` is optional and must be an absolute `http` or `https` URL. The default is the stable `https://biau.pages.dev` Pages domain.

#### 3. Contracts

- Navigate only to `/` on the configured origin and install `scripts/lib/ui-network-guard.mjs` with `allowLoopback: false` before navigation. A static document navigation may retry once after a bounded delay; a second failure remains terminal, and the command never retries an API, Studio, or model request.
- Block and report any request outside the configured origin, including loopback, by resource type without printing its URL. Local UI suites retain the guard's default `allowLoopback: true` behavior.
- Cover Morning, Nature, and Stellar, keyboard theme persistence, and theme containment at `320`, `390`, and `430` widths.
- Require three exact Flow dynamics signatures, visible real Logo geometry, matching root datasets, and at least `4.5:1` Hero/card-title contrast.
- Seed local storage only when a key is absent; a reload check must not overwrite the preference it is validating.
- Resolve CSS colors through a temporary DOM element instead of parsing token strings directly. Composite translucent panel/card colors over `--home-page-solid` before calculating WCAG contrast; modern browsers may serialize the same valid color as `rgb(...)`, `rgba(...)`, or `#RRGGBBAA`.

#### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Invalid or non-HTTP(S) `UI_CHECK_BASE` | Exit non-zero before launching the browser |
| External HTTP(S) request | Abort it and fail with `external_request_blocked (<type>)` |
| Missing/failed document or homepage root | Exit non-zero without falling through to appearance assertions |
| Theme, Logo, contrast, or Flow signature mismatch | Name the bounded appearance group and exit non-zero |
| Theme reload/persistence mismatch | Fail the dedicated persistence group |
| Mobile shell overflow, Logo loss, or brand/action overlap | Fail the exact theme/width group |
| CSS token cannot be resolved to a browser-computed color | Fail contrast instead of treating the token text as an RGB tuple |

#### 5. Good / Base / Bad Cases

- Good: the deployed bundle passes three theme appearances, persistence, and nine mobile checks without external requests.
- Base: use the default stable Pages domain after a successful production deployment.
- Bad: point the full fixture-heavy `check:ui` suite at production, allow it to contact Studio/model services, or treat a local custom-domain TLS reset as proof that the Pages deployment failed.

#### 6. Tests Required

- Run `npm.cmd run check:ui:production-appearance` against the deployed bundle.
- Also run local `npm.cmd run check:ui`, `npm.cmd run check:ui:smoke`, `npm.cmd run performance:check`, `npm.cmd run lint`, and `npm.cmd run build` before completion.
- Assert the production command reports `14` groups and `0` failures for the current matrix.

#### 7. Wrong vs Correct

Wrong: `UI_CHECK_BASE=https://production npm.cmd run check:ui`; production API routing breaks local Studio fixtures and can obscure the appearance result.

Correct: run `check:ui` locally for fixture coverage, then run `check:ui:production-appearance` against the deployed origin for bounded, read-only appearance evidence.

### Reduced-Motion Validation Matrix

- Normal -> reduce: `data-flow-motion` becomes `reduced-settled`, one nonblank static frame remains, and measured frame delta stays below the static threshold.
- Reduce -> normal: `data-flow-motion` becomes `running` and the canvas resumes measurable motion with one render loop.
- Hidden/intro-active: state becomes `paused`; later motion acknowledgements may not overwrite a newer incompatible state.
- Worker/runtime failure: state becomes `css-fallback`, the canvas becomes invisible, and the CSS background remains nonblank.
- Wrong: rely only on `media.addEventListener('change', sync)` or accept every late acknowledgement.
- Correct: resolve the current media query during synchronization, use the bounded fallback poll, and validate acknowledgement token or current-state equivalence.

## Public Content

- Public project/blog/status data is treated as publishable.
- Hidden drafts, private docs, credentials, private URLs, debug APKs, and unapproved downloads never render.
- External links expose external affordance and safe target/rel behavior.
- Internal links preserve SPA navigation.
- Status entry cards render one primary note from the trimmed first issue, falling back to the trimmed catalog note. Render `.status-target__note.is-soft` only for a nonempty catalog note different from that primary text; do not duplicate fallback copy or hide a distinct warning to reduce card height. Keep source status data unchanged.
- The status note browser fixtures cover absent, distinct, identical, whitespace-padded, and blank first issues at desktop and `320/390/430`, including three themes and both language states. Assert exact note count/text, primary versus secondary emphasis, visibility, and overflow; a page with missing warnings must fail just as a page with duplicate notes does.
- Project details include useful screenshots/diagrams inside the article flow, not only one hero image.
- `/ai-daily` and `/ai-daily/:publicId` expose approved public projections only. At 320px through desktop they must keep loading, error, empty, stale, correction, pagination, facts, uncertainty, and citations vertically readable without overflow.
- AI Daily refresh and pagination controls expose pending/disabled state, do not create overlapping requests, preserve the last successful payload on transient failure, and do not flicker when an ETag refresh returns `304`.
- Public citation links are decoded as credential-free HTTPS URLs and render with external affordance plus `target="_blank" rel="noreferrer"`.

## Public Research Assistant

- The floating widget offers `auto`, `site`, and `web` modes, bounded multi-turn context, current-page context, progress, claim-linked citations, suggestions, retry/copy, and thumbs feedback.
- Initial copy describes capability without claiming a provider is connected before a request runs.
- Each turn selects one API base. A `429` response is terminal for that attempt and must not be replayed against another candidate URL.
- The browser prefers `/chat/public/stream`, validates the SSE event and terminal result contracts in one shared decoder, and may retry `/chat/public` only for an explicit `404`, `405`, `501`, or non-SSE legacy endpoint response. An incomplete, malformed, timed-out, rate-limited, or failed stream is terminal for that attempt.
- Every new generation intent creates a secure UUID request ID. Stream-to-JSON compatibility fallback and explicit retry of a stable transport failure reuse the same ID and the same normalized session/history payload; deliberate regeneration and retry after visitor cancellation create a new ID.
- A completed request replay remains bound to its original immutable Revision even after Branch selection changes. The browser reloads authoritative Session history after replay and must not treat frozen replay metadata as the current Branch head.
- A completion marked `activated: false` never enters the current visible path or next prompt history. The browser hydrates authoritative history; failure leaves the conversation readable but follow-up disabled until recovery.
- A failed answer-regeneration request keeps the current persisted Revision, `n / total` navigation, citations, feedback, and regenerate command. Browser-local fallback content is not inserted as a new Revision; an explicit successful retry is the only path that appends one.
- Public result copy distinguishes model answer, partial/uncertain evidence, blocked input, unavailable web research, and browser-local degraded fallback without exposing internal diagnostics.
- First-attempt success adds no recovery noise. A recovered result may show `已自动恢复（N 次尝试）`; a degraded result maps only `not_configured`, `timeout`, `network`, `upstream`, `empty`, or `invalid` to fixed Chinese copy and never shows provider/model/endpoint/HTTP diagnostics.
- Assistant answers may render bounded Markdown paragraphs, headings, lists, emphasis, blockquotes, tables, inline code, and fenced code. Raw HTML parsing, HTML blocks, automatic bare-URL links, model-authored links/images, and form controls remain disabled; verified citation cards are the only clickable evidence surface.
- Code blocks expose an accessible copy command and bounded horizontal scrolling. Tables own their horizontal scroller. Neither may widen the message, dialog, or document at 320, 390, or 430px.
- The active send command becomes an explicit stop command. Visitor-initiated stop calls the bounded cancellation route and aborts transport, retains exactly one pending question, prevents late, persisted, or local-fallback answers, and exposes a fresh-ID retry. New conversation and history restore cancel active generation silently; unmount aborts local transport and never leaks a cancellation notice.
- Positive feedback submits `helpful`; negative feedback requires one bounded reason (`incorrect`, `unclear`, `missing-sources`, `outdated`, or `other`) without free text. Only one message selector opens at a time; Escape closes it and restores the owning control; submission failure keeps the selector available for retry.
- The conversation is a labeled `role="log"` with `aria-busy` tied to active restore or answer work. `recovering` uses the same bounded progress channel. After eight seconds an elapsed-time label may repaint visually without becoming a repeated live announcement; restore, start, recovery, completion, and cancellation still use one concise status channel.
- Stop remains authoritative during an active model attempt and abortable retry backoff. Recovery status and elapsed copy occupy stable space and must not shift the composer or widen mobile messages.
- Desktop opens compact and supports full-screen mode. Mobile opens full-screen, follows `visualViewport` for soft-keyboard height/offset, accounts for safe areas, locks background scrolling for the modal lifetime, and keeps the message region as the only conversation scroller.
- A persisted current capability restores automatically on first open before follow-up submission is enabled. Expired history self-heals into a fresh conversation; transient restore failure stays retryable; `truncated=true` is visible. Starting a new conversation or restoring another session ignores late completions captured for another controller/session.
- On free-instance first open, `/health` is the only automatic network action until warm-up succeeds. One failed health request may retry exactly once with an abortable delay. The textarea remains editable and retains its draft, while send and every server mutation stay disabled. Initial history restore begins after the successful health response. Warm-up never automatically sends a question, creates a Revision, or calls a model, and a 504 is presented as service startup rather than model failure.
- Restore, Branch select, and continue-from-revision atomically replace the visible reducer path from normalized server history. Regeneration appends one Revision to the existing logical question and never duplicates that user question.
- Opening the inline question editor with unchanged text exposes an enabled `重新发送` command that deliberately creates a new Branch; after the text changes, the same command is labeled `发送修改`. Empty text and concurrent assistant work remain disabled.
- Branch-operation failures render in the main conversation, preserve the active path, and retry the captured action exactly once per explicit command. React state alone is not a sufficient same-tick duplicate-submit fence.
- Background health completion cannot overwrite or clear a chat/Branch issue with exact retry identity; scope-aware state updates own only their corresponding issue.
- Chat, health/history, and initial-restore failures share one retry gate. Browser offline state disables retry; an `online` event updates the retained issue without replaying it. A bounded `Retry-After` value becomes an absolute wall-clock deadline, and visible countdown state is recalculated from that deadline so background-tab timer throttling cannot shorten or extend the server delay.
- History opens as the top interaction layer, receives focus, traps Tab within its own controls, closes before the assistant on Escape, and restores the history trigger. Claim citation controls focus and highlight only their matching verified citation card. Internal citation navigation closes the assistant/fullscreen shell while retaining the restorable conversation.
- Mobile first-open moves focus into the modal dialog on a stable non-input command without summoning the soft keyboard. Desktop focuses the composer after initial restoration settles; close and Escape restore the owning trigger.
- At mobile widths the panel and trigger occupy stable grid rows, remain inside the viewport, do not block page navigation or reading controls, and expose 44px action/copy/feedback touch targets.
- Revision arrows, their stable count, `Continue from this version`, and the Branch menu remain contained and keyboard accessible; mobile actions are at least 44px and do not create a horizontal rail or document overflow.
- Bounded Branch and Revision projections disclose omitted history beside the Branch menu. Branch options show loaded turn counts, and a truncated Revision counter is explicitly described as counting only loaded versions.
- Citation cards preserve Revision-specific provenance by showing the allowlisted source section, optional publication date, and explicit verified/partial evidence state without creating model-authored links.
- UI fixtures exercise rejected Branch operations, exact-action retry, same-tick retry de-duplication, failed regeneration with intact Revision controls, and successful retry without a duplicate question.
- Suggested prompts are bounded; UI checks validate the rendered starter contract rather than requiring hidden overflow items.
- One-image UI fixtures cover selection, compressed preview, remove/focus restoration, request forwarding, retry continuity, privacy across refresh, and compact/fullscreen/mobile containment. No browser fixture calls a live model.

## SEO And Analytics

- Every public route has useful title, description, canonical, and Open Graph metadata.
- Analytics events use normalized route patterns/areas/depth; never send query/hash/dynamic ids/tokens.
- Root static HTML retains a meaningful SEO shell before hydration.
- AI Daily detail metadata upgrades from the route fallback to the approved event title and fact summary after the payload loads, while keeping the stable public canonical path.

## Accessibility

- Semantic buttons/links for actions/navigation.
- Visible focus states and keyboard activation for cards/commands.
- Icon-only controls have `aria-label`.
- Dialog/drawer state is conveyed to assistive technology.
- Images have meaningful alt text; decorative visuals are hidden.
- Color is not the only status signal.

## Performance

- Lazy-load route-heavy private/Studio surfaces.
- Keep `/projects` and `/blog` synchronously rendered. Their small route components and `catalog-pages.css` are part of the entry path so direct navigation never exposes `.route-loading`; route-heavy detail, status, Studio, AI Daily, NotFound, and public-assistant surfaces import `route-pages.css` from their lazy module.
- `src/index.css` imports `catalog-pages.css` before `flow-pages.css`. The order is contractual: base desktop catalog rules load first and the responsive rules in `flow-pages.css` must remain able to override them.
- Do not import `route-pages.css` from an eager component or the application entry. Doing so collapses the lazy CSS chunk back into the entry bundle.
- Do not ship obsolete page CSS/components after route removal.
- Optimize screenshots to web-friendly formats and dimensions.
- Avoid duplicate data indexes or repeated normalization in render loops.
- Small UI dictionaries use type-only imports for project types. A runtime
  import of the full `portfolio` module from a shared reading dictionary can
  move project data into the entry chunk (observed 300449 -> 423376 bytes).
  Choose existing Chinese versus English UI maps at the page that already owns
  the project data import, then recheck chunk output and the performance budget.
- Run `performance:check` when changing background, intro, route chunks, or large assets. It must enforce the entry CSS budget and fail when the named `route-pages-*.css` chunk disappears.
- Run `check:ui:smoke` for quick route/CSS/overflow feedback and `check:ui` before completion. The smoke check covers entry routes without loading flashes plus lazy routes with the route CSS present at desktop, 390px, and 320px.
- Both UI commands use the shared `[START]` / `[PASS]` / `[FAIL]` progress contract with named groups, current route/viewport context, group duration, and a final summary. Full keeps the 17-route × desktop/mobile matrix and all specialist assertions; progress instrumentation may not reduce coverage.
- Every Playwright page installs the shared local-network guard before navigation. `UI_CHECK_BASE`, loopback, `data:`, `blob:`, and later explicit page fixtures are allowed through `route.fallback()`; any other real HTTP(S) request fails as `external_request_blocked` without printing the target URL.

```css
/* Correct: entry CSS keeps high-frequency catalog pages stable. */
@import './styles/catalog-pages.css';
@import './styles/flow-pages.css';
```

```tsx
// Correct: a lazy route owns its route-only CSS dependency.
import '../styles/route-pages.css'
```

Wrong: importing `route-pages.css` from `App.tsx`, `index.css`, `ProjectsPage`, or `BlogPage`, or making those two high-frequency routes lazy merely to satisfy the byte counter.

## Data Safety

- Treat committed frontend code/data as public.
- Never place API keys, database URLs, model/vector endpoints, owner emails, Access values, service/admin tokens, or private content in `VITE_*`, local fixtures, screenshots, or console output.

## Regression Expectations

`check:ui` should cover:

- Main public routes at desktop/mobile widths.
- Retired assistant/private routes as NotFound.
- Public assistant concise/fallback behavior, safe structured Markdown, code copy, `recovering`, eight-second elapsed copy, recovery metadata, all six degraded failure classes, stop during provider work/backoff, late-response isolation, cancellation retry, immutable regeneration without duplicate questions, Revision-scoped citations/feedback, older snapshot hydration, and exact structured-feedback payloads.
- Public assistant free-instance warm-up at desktop and 320/390/430: 504 then 200 produces exactly two health calls, zero chat calls while warming, editable draft preservation, disabled generation commands, ordered history restore, explicit final retry, and no overflow.
- Public assistant scope controls, authoritative Branch history/selection/continue hydration, completed-replay isolation, automatic continuity/expiry/retry/truncation disclosure, Branch turn counts, Revision count scope, citation provenance metadata, offline-to-online recovery without automatic replay, wall-clock `Retry-After` countdowns, claim-to-source focus, internal navigation closure, history/full-screen focus behavior, mobile panel/trigger/soft-keyboard layout, 44px Revision/Branch controls, 320/390/430 containment, verified citations, feedback, and rate-limit behavior.
- Mobile public navigation and detail reading.
- Studio focused modes and review entry.
- Background animation/reduced-motion frames.
- AI Daily Feed/detail happy paths, stale/error/empty states, cursor pagination, `304` recovery, rapid route changes, safe citations, and reduced-motion loading indicators.
- SEO metadata, overflow, focus, and external/internal link behavior.
