# Frontend Quality Guidelines

## Required Verification

For frontend/config changes:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

Also run feature-specific checks such as `analytics:check`, `project-details:check`, `blog:check`, `status:contract`, or `operator:facade-smoke` when their contracts change.

For the public AI Daily Feed or detail route, also run:

```powershell
npm.cmd run ai-daily:public-feed-check
npm.cmd run analytics:check
npm.cmd run docs:deployment-check
```

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

## BIAU Operator

- `/operator` opens as a work surface, not a long explanatory landing page.
- Opening copy is concise and contains no default citation dump.
- Desktop shows session sidebar, conversation, and runtime inspector.
- Mobile shows conversation first and uses a bounded drawer for sessions.
- `/operator/settings` provides five complete areas: overview, knowledge, RAG, memory, usage.
- Settings expose safe model/channel/configured state only; no browser token form exists.
- The public assistant widget is hidden on all Operator routes.
- Operator is absent from public navigation and unauthenticated public synthetic.
- Old private routes render NotFound; do not add redirects for compatibility.

## Content Studio

- Mobile uses focused workspace modes; desktop keeps the complete workspace visible.
- The review queue and next-review action remain visible before records load.
- Token inputs use password semantics and never echo values in status copy.
- Draft, source, AI Daily, review, and export forms preserve local edits when switching focused sections.
- Public preview is clearly separate from editable/internal metadata.
- AI Daily workspace tabs expose standard `aria-controls` / `tabpanel` associations and remain within the viewport from 320px through desktop widths. Candidate, Flash, and Edition controls expose pending, conflict, validation, destructive-action reasons, and audit status; local fixtures exercise their deterministic write mirrors without contacting a deployed service.

## Mobile Navigation And Reading

- Mobile tab bar includes exactly the public primary sections.
- Touch targets are at least 44px where practical.
- Blog/project/status details remain vertically readable without forced horizontal swiping.
- Floating assistant/reading controls collapse or offset near final content and footer.
- Drawers/modals remain within viewport, expose close actions, and avoid global-nav overlap.
- Page scroll remains the default gesture; component effects use explicit buttons/taps where gesture conflict would harm reading.

## Flow Background And Intro

- Normal mode may use the full animated background; reduced motion must show a stable nonblank canvas frame when WebGL2 is available, or a stable nonblank CSS fallback otherwise.
- Avoid continuous React state updates from animation frames.
- Canvas owns its render loop and disposes resources/listeners on unmount.
- Worker resize, palette, and motion messages must not create parallel render timers. Runtime `prefers-reduced-motion` changes must use a token-correlated acknowledgement exposed as DOM state, stop on one static frame, and resume one render loop when animation is allowed again; UI checks wait for that acknowledgement instead of an arbitrary delay. Runtime or message failures must hide the stale canvas and reveal the explicit CSS fallback state.
- Reduced-motion synchronization must not trust one retained `MediaQueryList` change event as the only source of truth. Read the current query value when synchronizing, retain a low-frequency fallback poll that only acts on value changes, and send the resolved value to the worker. A late worker acknowledgement is accepted only when its token is current or its reduced/running tuple still matches the current page state; stale contradictory acknowledgements are ignored.
- Pixel stability checks run against the production preview worker path. After the DOM acknowledgement, wait for two browser animation frames so the compositor can present the acknowledged canvas frame, then compare pixels; do not replace this with a fixed sleep or a looser motion threshold.
- Route changes must not repeatedly restart expensive initialization or cause project/blog page flicker.
- Intro completion must land on the stable navigation logo position and not block first interaction indefinitely.
- Visual checks compare desktop/mobile framing, exercise both runtime motion-preference directions, and confirm either a nonblank canvas or the explicit CSS fallback state.

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
- Project details include useful screenshots/diagrams inside the article flow, not only one hero image.
- `/ai-daily` and `/ai-daily/:publicId` expose approved public projections only. At 320px through desktop they must keep loading, error, empty, stale, correction, pagination, facts, uncertainty, and citations vertically readable without overflow.
- AI Daily refresh and pagination controls expose pending/disabled state, do not create overlapping requests, preserve the last successful payload on transient failure, and do not flicker when an ETag refresh returns `304`.
- Public citation links are decoded as credential-free HTTPS URLs and render with external affordance plus `target="_blank" rel="noreferrer"`.

## SEO And Analytics

- Every public route has useful title, description, canonical, and Open Graph metadata.
- Private Operator routes may have metadata but are excluded from public sitemap/navigation.
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
- Do not ship obsolete page CSS/components after route removal.
- Optimize screenshots to web-friendly formats and dimensions.
- Avoid duplicate data indexes or repeated normalization in render loops.
- Run `performance:check` when changing background, intro, route chunks, or large assets.

## Data Safety

- Treat committed frontend code/data as public.
- Never place API keys, database URLs, model/vector endpoints, owner emails, Access values, service/admin tokens, or private content in `VITE_*`, local fixtures, screenshots, or console output.

## Regression Expectations

`check:ui` should cover:

- Main public routes at desktop/mobile widths.
- Operator workspace/settings with deterministic API fixtures.
- Old private routes as NotFound.
- Public assistant concise/fallback behavior.
- Mobile public navigation and detail reading.
- Studio focused modes and review entry.
- Background animation/reduced-motion frames.
- AI Daily Feed/detail happy paths, stale/error/empty states, cursor pagination, `304` recovery, rapid route changes, safe citations, and reduced-motion loading indicators.
- SEO metadata, overflow, focus, and external/internal link behavior.
