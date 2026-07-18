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
- Worker resize, palette, and motion messages must not create parallel render timers. Runtime `prefers-reduced-motion` changes must stop on one static frame and resume one render loop when animation is allowed again; runtime or message failures must hide the stale canvas and reveal the explicit CSS fallback state.
- Route changes must not repeatedly restart expensive initialization or cause project/blog page flicker.
- Intro completion must land on the stable navigation logo position and not block first interaction indefinitely.
- Visual checks compare desktop/mobile framing, exercise both runtime motion-preference directions, and confirm either a nonblank canvas or the explicit CSS fallback state.

## Public Content

- Public project/blog/status data is treated as publishable.
- Hidden drafts, private docs, credentials, private URLs, debug APKs, and unapproved downloads never render.
- External links expose external affordance and safe target/rel behavior.
- Internal links preserve SPA navigation.
- Project details include useful screenshots/diagrams inside the article flow, not only one hero image.

## SEO And Analytics

- Every public route has useful title, description, canonical, and Open Graph metadata.
- Private Operator routes may have metadata but are excluded from public sitemap/navigation.
- Analytics events use normalized route patterns/areas/depth; never send query/hash/dynamic ids/tokens.
- Root static HTML retains a meaningful SEO shell before hydration.

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
- SEO metadata, overflow, focus, and external/internal link behavior.
