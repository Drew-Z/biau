# Frontend Component Guidelines

## UI System

Use the existing class-based components and design tokens for UI controls. Use `lucide-react` for familiar command and navigation icons so the frontend stays framework-light and tree-shakeable.

```tsx
import { ArrowRight } from 'lucide-react'

<button type="button" className="btn">
  <span>查看详情</span>
  <ArrowRight size={16} aria-hidden />
</button>
```

Do not import `antd`, `@mui/*`, `chakra-ui`, `tailwindcss`, `styled-components`, Emotion, or Semi UI. Extend the existing tokens and class-based CSS before adding another component framework.

## Component Shape

Most components are exported named functions with local prop interfaces. `src/components/ProjectCard.tsx` is the reference shape: import types explicitly, define `ProjectCardProps`, keep category mappings near the component, and export `function ProjectCard(...)`.

Keep route-level composition in `src/pages/` and reusable units in `src/components/`. `src/pages/ProjectsPage.tsx` groups data and delegates card rendering to `ProjectCard` rather than duplicating card markup.

## Props and Events

Use typed props interfaces for reusable components. Pass callbacks for navigation or actions instead of importing router state into deeply reusable display components. `ProjectCard` receives `onViewDetails`, while `ProjectsPage` owns `useNavigate()` and external-link behavior.

When a card exposes pointer affordance alongside nested actions, keep keyboard access on the explicit action controls instead of making the container a competing interactive element. `ProjectCard` keeps its detail action as a keyboard-focusable `button`, while status and external-link actions retain their own semantics; the card surface may still forward pointer activation without adding `role="link"`, `tabIndex`, or a container key handler that conflicts with nested controls.

## Styling

Use existing class-based CSS systems such as `glass-card`, `feature-card`, `hover-lift`, and page-specific classes. Respect the token/theme CSS already present in `src/styles/` and `src/App.css`. Avoid hard-coded one-off colors when a theme/token class can express the state.

Do not create card-in-card page structures or marketing-only landing layouts. The site should feel like a production product showcase with clear information architecture.

### Convention: Brand Intro Docking

When a first-entry brand animation resolves into the navigation logo, reuse the same SVG component as the real navigation mark and calculate the final target from the live `.nav-logo` DOM rect. Do not hard-code desktop/mobile `x` / `y` coordinates as the final source of truth; fixed CSS variables may exist only as fallbacks before measurement.

```tsx
const navRect = navLogo.getBoundingClientRect()
intro.style.setProperty('--harbor-logo-x', `${navRect.left + navRect.width / 2}px`)
intro.style.setProperty('--harbor-logo-y', `${navRect.top + navRect.height / 2}px`)
```

Use the live Logo width and height as the animated element's base box, enlarge that exact shell for the center stage, and return to scale `1` at the measured target. Copy the live Logo background, border, radius, and shadow into the intro shell so the handoff does not swap between two visually different containers. Hide or crossfade the underlying navigation Logo during docking, clear centered wordmarks before landing, then let the real navigation Logo resume its normal hover, focus, and click behavior after the intro unmounts. `scripts/check-ui.mjs` should assert target center, final geometry, shell parity, and wordmark clearance so responsive navigation changes cannot silently break the landing motion.

### Convention: Navigation Appearance Controls

The navigation mark renders the shared `BiauPortMark` inside a normal home
`Link`; it is not an appearance control. Theme selection is one explicit
three-option group with stable `data-theme-option` values `morning`, `nature`,
and `stellar`, Lucide icons, `aria-pressed`, and at least 44px touch targets on
mobile. The root's `data-site-theme` is the sole appearance source of truth;
the derived `light-theme` class is compatibility-only.

All three options remain keyboard reachable with visible focus rings. Selection
updates `biau-port-theme`, `data-site-theme`, and the monotonic
`data-site-theme-version` in one synchronous commit. UI checks must verify the
three options, direct selection, refresh persistence, and the real SVG logo in
every theme.

### Convention: Isolated Brand-Mark Experiments

Unreleased logo directions belong in a lazy Studio route (currently
`/studio/brand/logo-lab`) and must not replace the production `BiauPortMark`,
`public/favicon.svg`, project icons, navigation imports, or sitemap metadata.
Keep each candidate as a small named component under `src/components/` with a
shared `64 × 64` viewBox and theme-specific CSS tokens; geometry must remain
open and experimental rather than closing into a standard letterform or app
tile. The experiment page owns comparison copy and sizing, while the candidate
only owns its SVG geometry and state classes.

Candidate SVGs use the following accessibility contract:

```tsx
const labelled = !ariaHidden && Boolean(title)
const titleId = `${useId().replace(/:/g, '')}-mark-title`

<svg
  viewBox="0 0 64 64"
  role={labelled ? 'img' : undefined}
  aria-hidden={labelled ? undefined : 'true'}
  aria-labelledby={labelled ? titleId : undefined}
  focusable="false"
>
  {labelled ? <title id={titleId}>{title}</title> : null}
</svg>
```

Use `useId()` (with a safe DOM id) for every gradient/filter/title reference;
never share a hard-coded id between repeated samples. `ariaHidden={false}`
without a title is still decorative and must not announce an unlabeled SVG.
The production mark keeps its own component and animation contract until a
separate product decision promotes one candidate.

### Convention: Long-Form Reading Guide

Blog and project detail routes longer than a few viewports use the shared
`DetailReadingGuide`. Pages own the ordered public section model and render a
deterministic id for every guide entry; the guide must not infer ids by slugifying
localized or user-authored headings.

The guide is a sticky in-flow orientation control, not a fixed sidebar or mobile
bottom bar. Its collapsed state exposes the current major section and whole-page
progress. The explicit outline may use bounded local scrolling while open, but
normal reading remains document-owned. Opening the outline brings the complete
guide into view; `Escape`, outside pointer interaction, and an ordinary primary
anchor activation all close it.

Chapter anchors retain native link semantics. Before any custom scrolling or
open-state change, return when the click is already `defaultPrevented`, uses a
non-primary button, or includes Ctrl/Meta/Shift/Alt. Modified activation belongs
to the browser: preserve the real href, including the current route/query and
fragment, and do not close or scroll the source guide. Do not replace this with
`window.open`. Unmodified Enter produces an ordinary primary click and retains
the existing close-then-scroll behavior and focus strategy.

| Activation | Owner and result |
| --- | --- |
| Ordinary primary click / Enter | Guide closes, then scrolls the existing target |
| Ctrl/Meta/Shift/Alt or non-primary button | Browser keeps its native link action; no guide side effects |
| Already cancelled event | Existing event owner; no guide side effects |

`checkReadingGuideLinks` verifies real modified-click/keyboard/middle-button
documents and ordinary chapter jumps. Checking that an href exists is not
enough: cancelling the click can silently consume the visitor's new-tab intent.

Use `prefers-reduced-motion` to choose instant versus smooth section navigation.
When an outline is in normal flow, close it before scrolling the target and defer
`scrollIntoView` until the collapsed layout is committed. Scrolling first and
then collapsing shifts the target by the removed outline height; scheduling the
jump in the same animation-frame queue as the open-state effect can also be
cancelled by that effect's cleanup. Reduced-motion mode must additionally set
`html { scroll-behavior: auto; }`; `behavior: auto` otherwise inherits the site's
global smooth-scroll rule.
Loading and missing-detail states do not render an empty guide. Keep the public
assistant behind the open outline and verify the guide at `320`, `390`, `430`,
and desktop widths.

The guide's public labels follow `useSiteLanguage`; its section text has a
separate language contract. `itemsLanguage?: SiteLanguage` defaults to `zh` for
untranslated callers, and `DetailReadingItem.language` overrides an individual
label. Localized blog/project pages pass the active language; authored article
sections keep `{ id, label: section.title, language: 'zh' }`. Mark both the
current label and each outline label with the resolved language. Preserve ids,
open state, focus, anchor handlers and scroll measurement when labels change.
The collapsed current label may retain its existing truncation; the expanded
outline must expose the full text with wrapping.

## Content and Assets

Use real sanitized project screenshots when available. If an asset is missing, use a stable fallback asset or omit the image; do not fabricate business evidence, metrics, customers, or screenshots.

## Accessibility Checklist

- Interactive non-button containers need keyboard handlers and ARIA labels.
- External links use `target="_blank"` with `rel="noopener noreferrer"`.
- Images rendered through `ResponsiveImage` need useful alt text, usually the project or content title.
- Button text must fit at mobile and desktop sizes; prefer icons from `lucide-react` when a known command has a standard symbol.

### Responsive Taxonomy Controls

When a taxonomy has more options than a 320px mobile viewport can show in full,
keep the desktop segmented buttons but replace them on mobile with one labeled
native `select`. Both surfaces must share the same controlled value and callback;
do not duplicate filtering state. Every option must expose the complete Chinese
and English identity plus its count or pending state. Do not use a clipped,
no-wrap horizontal rail or partial-card peek as the only discovery mechanism.

Catalog controls follow `useSiteLanguage`. Put the selected language first in
native option text and desktop primary labels, retain the alternate identity,
and mark desktop alternate labels with their actual `lang`. Counts and pending
labels follow the selected interface language; stable column/group values and
URL selection must not depend on translated text.

The desktop blog column buttons form a named `role="group"` and each exposes
`aria-pressed={selectedColumn === column}` (including `all`). The URL-derived
selection is shared with the native mobile select; do not introduce a second
selection state or a tab/radio keyboard model. Keep the existing Enter/Space
button activation and Tab order. `blog:discovery-ui` checks one pressed button
after history, reload, empty results and 720/721 resizing, plus every column.
Its keyboard sequence moves between buttons with real Tab/Shift+Tab events;
focusing each button programmatically cannot verify the native tab order.

Every desktop column title, English subtitle, count, and pending label must
retain at least 4.5:1 text contrast in all three themes. Empty columns remain
enabled controls: use the existing `--ink` token without subtitle opacity or
an extra transparent empty-state color. Explicitly inherit subtitle color to
override the generic `.filter-btn-subtitle` transparent `currentColor` rule.
Keep the pending text and border as the distinction. The column group uses
`--home-page-solid` to isolate its text from the animated page backdrop; a
partially transparent panel can fail even when text itself is fully opaque.
The browser check samples the actual background with glyphs
temporarily hidden, composites the computed text color and ancestor opacity,
and restores the masking style in `finally`; cover selection, hover, keyboard,
and both languages at 721/1440 widths instead of checking token names alone.

### Mobile Catalog Progressive Disclosure

When a public catalog has a small number of stable groups but many repeated
cards, mobile may expose the groups as vertical single-open controls. Keep the
source projection and card subtree shared with desktop; do not clone cards or
introduce a horizontal rail. Each control exposes its label, source-derived
count, `aria-expanded`, `aria-controls`, and a 44px target. Non-active mobile
panels use the semantic `hidden` attribute plus a scoped `[hidden] { display:
none; }` rule whenever an existing grid declaration could override browser
defaults. Desktop must remove `hidden` rather than merely restyling hidden
content.

### Mobile Chat-First Workspaces

For desktop workspaces that combine a primary editor/chat with member, history,
memory, or administration sidebars, mobile must keep the primary task first in
the document experience. Reuse the same stateful sidebar subtree as a bounded
modal drawer instead of duplicating forms or hiding capabilities. The drawer
requires an explicit 44px trigger, backdrop, close command, Escape handling,
focus containment and restoration, document scroll locking, safe-area padding,
and no overlap from global navigation. Runtime evidence may move after the core
interaction on mobile, but it must remain available.

### Public Assistant Revision And Branch Controls

Keep previous/next Revision commands in the answer action row as fixed-size Lucide icon buttons with accessible names, tooltips, and a stable `n / total` counter. Previewing a sibling Revision changes only the displayed answer snapshot; it does not silently activate a Branch.

The public assistant fullscreen surface uses one centered content column, with only the message region owning vertical scrolling and the composer remaining in the panel grid. History is a modal layer inside that panel: its backdrop and drawer use an opaque surface and an isolated stacking context so the underlying transcript cannot bleed through. Native scope and branch selects must set explicit theme-aware `select`/`option` colors; browser defaults must not produce a white popup with light text.

When a visitor previews a non-active Revision, expose a clear `Continue from this version` command. Existing Branch selection is a separate bounded menu/control, and both operations hydrate the authoritative path returned by the service rather than assembling ancestry in the component.

Branch options include their loaded logical-turn count. When the bounded history projection reports omitted Branches or answer Revisions, keep that limitation adjacent to the Branch control and state that Revision counts cover only currently loaded content; do not present a truncated `n / total` value as the complete history.

Citation cards expose the allowlisted provenance snapshot as a compact metadata row: source section, publication date when present, and the explicit `verified` or `partial` evidence state. Missing dates stay absent, and partial evidence must not inherit verified styling or copy.

Persisted visitor questions expose one Lucide edit command. Editing replaces that user bubble with a labelled inline textarea plus cancel and resend controls; unchanged or blank values remain disabled. `Escape` cancels editing before it closes feedback, history, or the assistant dialog, and focus returns to the owning edit command. While editing, the main composer and Branch/Revision mutations are disabled, but the visitor may choose the research mode used by the new Branch.

At mobile widths, Revision commands, continue, and Branch selection provide at least 44px touch targets, wrap without widening the message, and remain inside the assistant panel at 320, 390, and 430px. Do not introduce a horizontal rail, swipe-only version navigation, or gesture-only Branch activation. Fullscreen and history layers keep their existing Escape, focus containment/restoration, and single conversation-scroller contracts.

On mobile first-open, move focus from the hidden trigger into a stable non-input command inside the modal without focusing the composer or summoning the soft keyboard. Closing by button or Escape restores the owning trigger. Desktop restoration continues to focus the composer.

Recovery presentation consumes normalized metadata only. Use fixed copy for recovered attempts and the bounded safe failure-class union; do not define raw-payload casts or provider error mappings inside the component. The `recovering` repaint and elapsed-time label reuse the existing status region without adding repeated live announcements. Reserve stable space so recovery copy cannot move the composer, widen a message, or overflow at 320, 390, or 430px.

The public assistant composer may accept one JPEG, PNG, or WebP image. Use one Lucide image command, an explicit removable preview, and browser-side resize/compression before submission. The image stays only in the active in-memory request and must not enter local history snapshots. Retry/edit-resend may reuse the current in-memory attachment, while refresh intentionally discards it. Keep preview text and controls contained at 320, 390, 430, compact desktop, and fullscreen widths.

Free-instance warm-up uses a separate `idle | warming | ready | error` state
from answer-service presentation. Opening the widget runs only `/health`; a
failed health request may retry once through the same abortable lifecycle.
While warming, keep the main textarea editable and its draft stable, but disable
send, suggestions, regeneration, feedback mutations, Branch mutations, and
history loading. Persisted-session restore starts only after warm-up reaches
`ready`. Never auto-replay a chat question or describe a warm-up 504 as a model
failure. The final error exposes an explicit health retry and no keep-alive job.

The synchronous launcher remains mounted as a stable placeholder while the
lazy workspace chunk is opening. This prevents a trigger/read-guide collision
window on mobile and preserves the measured collision offset. Initial session
restore should be scheduled after the current effect turn and should consume
its target only after success or a handled non-abort failure; an effect cleanup
that only cancels an in-flight request must not discard the target. This keeps
React Strict Mode effect replay from leaving the workspace stuck in a restore
loading state or issuing duplicate restore requests.

### Mobile Primary Navigation

When the site has a small, stable set of high-frequency route families, mobile
may expose them as a persistent bottom tabbar instead of hiding every destination
behind a hamburger menu. Keep the route registry in `Navigation`, use Lucide
icons plus short labels, make nested routes activate their parent tab, and keep
every target at least 44px. The bar must respect safe-area insets and reserve
clearance for footer content and fixed assistant controls. Mobile top navigation
still owns brand, theme, and language controls; desktop keeps the full center
navigation and hides the tabbar. Do not use a horizontal scroll rail, gesture-only
navigation, or duplicate route metadata in CSS and tests.

### Convention: Homepage Port Board

Treat the homepage as the public port board rather than a separate marketing
landing page. Its mobile tabbar exposes exactly the four real route families
declared by `Navigation` (`/`, `/projects`, `/blog`, `/status`); planned or
disabled products must not gain a navigation tab merely to fill the layout.

Keep the Hero's product-positioning copy and public status summary visible, and
derive every project action from `projectPublication` through the shared CTA
projection. A card must not infer availability from its artwork, copy, or URL.

```tsx
const publication = getProjectPublication(project.id)
const cta = getProjectCta(publication, language)
```

Render the full and compact action labels from this projection, including their
language metadata. Do not inspect Chinese or English label substrings to infer
access state. The panel's fixed copy follows `useSiteLanguage`, while authored
project text remains Chinese; language is not a carousel-effect dependency.

The homepage shell uses the existing class-based theme system with compact 8px
surfaces, deep ink backgrounds, cyan state accents, and amber brand emphasis.
Do not turn page sections into nested decorative cards or add a fifth mobile
navigation column without a real public route. UI checks must assert the ordered
route set, 44px controls, no horizontal overflow, and a first project card visible
within the initial mobile reading rhythm at 320, 390, and 430px.

### Homepage Carousel Responsive Motion

`RightScrollCards` uses the exported `MOBILE_INTERACTION_QUERY` from
`src/utils/responsive.ts`: `(max-width: 768px), (pointer: coarse)`. Subscribe to
that query's `change` event in the motion effect and remove the listener in
cleanup. Install the lifecycle even when the initial page is mobile; an early
return at mount leaves later desktop input without a measured cycle or RAF.

Both `syncMotion` and `tick` respect the current mobile mode. Reuse the existing
static reset and RAF reference instead of adding React state or remounting the
carousel when the viewport changes.

| Condition | Motion lifecycle |
| --- | --- |
| Mobile interaction or reduced motion | Cancel RAF; reset position, velocity, cycle initialization and tilt; remove inline track translation |
| Hidden document or active brand intro | Pause using the existing position-preserving path |
| Animated desktop | Start only if no RAF is pending; measure the current card cycle on the next tick |

CSS `transform: none` alone does not stop a running effect. Desktop-to-mobile
must stop track style writes, and mobile-to-desktop must recover autoplay and
ordinary-wheel inertia without a reload. Preserve the `projects.length` effect
dependency, existing pointer handlers, pause signals, wheel ownership and motion
constants. Language/theme updates keep their existing DOM and state continuity.

### Homepage Carousel Wheel Ownership

`RightScrollCards.handleNativeWheel` returns immediately for `event.ctrlKey`,
before cancelling the event or updating scroll position/velocity. Browsers also
deliver trackpad pinch as Ctrl-modified wheel input; consuming it can block
native zoom and move the project list. Do not manually implement browser zoom.

```tsx
if (event.ctrlKey) return
if (usesMobileInteractionMode() || !carouselMotionAllowed()) return
event.preventDefault()
applyWheelDelta(event.deltaY, event.deltaMode)
```

Keep the non-passive listener and its cleanup: ordinary animated-desktop wheel
still belongs to the carousel. Mobile and reduced-motion gates, drag/hover/focus
behavior, autoplay, wrapping and inertia constants retain their existing paths.
This contract concerns wheel input, not a new touch/pointer gesture policy.
`checkHomeCarouselWheel` verifies trusted input, actual targets, cancellation,
same-event movement and native visual-viewport zoom.

### Long Mobile Page Navigation

When an evidence-heavy mobile page exceeds several viewports, preserve its
content and add one compact sticky native section selector instead of hiding
sections or introducing a horizontal rail. Map every option to a stable section
ID, show the current section and position, and keep the navigator in document
flow. Use immediate movement for jumps longer than two viewports and smooth
movement only for short jumps; always respect reduced-motion preferences.

### Mobile Focused Workspaces

When a desktop authoring workspace contains several persistent columns, mobile
may expose them as explicit task modes instead of one long stack. Reuse the
existing column DOM and state, keep the primary mode selected by default, and
show exactly one mode panel below the control. Mode buttons need stable tab/panel
relationships, selected state, Lucide icons, and at least 44px targets. Implement
the complete tab keyboard model: only the selected tab has `tabIndex={0}`;
ArrowLeft/ArrowUp and ArrowRight/ArrowDown wrap through the stable mode order;
Home/End jump to the first/last mode; selection moves focus to the destination
tab. Panels use `aria-labelledby` to reference their tab. Actions that select or
create the primary record should return to its editor mode. Authentication
controls stay before the mode switch; guidance can follow the focused workspace.
Desktop hides the switch and keeps every column visible, so do not add semantic
`hidden` attributes when desktop must render all panels simultaneously. UI checks
must exercise focus, selected state, roving tabindex, panel visibility, and both
tab/panel id relationships at 320, 390, and 430px.

### Mobile Administrative Sections

For dense administration routes with several mutually exclusive domains, the
desktop tablist and mobile native selector must share one typed section state.
Do not render all panels as a mobile stack. Author CSS must explicitly preserve
the semantic `[hidden]` contract when panel classes define `display`; inactive
panels must be neither visible nor interactive. Keep all option labels complete,
avoid horizontal tab rails, and preserve the existing form/API state while
switching sections.

### Mobile Floating Surface Coordination

When fixed and sticky mobile tools can share a viewport, do not assign permanent
stacked offsets from one screenshot. Measure their real interactive rectangles
and apply only the minimum collision offset plus a stable gap. Reconstruct the
unshifted rectangle from the live CSS transform during transitions so repeated
measurements cannot amplify the offset. High-occupancy surfaces should announce
a typed mobile-only open event so peers close, while each component retains its
own content and progress state. Desktop and non-colliding routes keep their
original behavior, and reduced-motion disables the positioning transition.
