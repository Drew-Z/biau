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
- An OffscreenCanvas worker must not emit `motion-settled` in the same task as the final draw. Defer the acknowledgement by one bounded compositor window, cancel that timer on every newer motion token, and re-check the token before posting. This keeps DOM state from claiming stability while the browser still presents the previous animated frame.
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
- Run `performance:check` when changing background, intro, route chunks, or large assets. It must enforce the entry CSS budget and fail when the named `route-pages-*.css` chunk disappears.
- Run `check:ui:smoke` for quick route/CSS/overflow feedback and `check:ui` before completion. The smoke check covers entry routes without loading flashes plus lazy routes with the route CSS present at desktop, 390px, and 320px.

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
