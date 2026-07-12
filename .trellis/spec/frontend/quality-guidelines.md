# Frontend Quality Guidelines

## Required Verification

For changes under `src/` or project configuration, run these in order on Windows PowerShell:

```powershell
npm.cmd run lint
npm.cmd run build
```

`npm run build` includes `tsc -b`, so it is the required type-check gate. Run lint first and fix lint failures before build. Markdown-only or `content-drafts/`-only changes may skip this gate, but component, route, style, and `src/data/` changes must run it.

For broad release checks, `npm.cmd run verify` also runs assistant index generation, assistant V2 knowledge graph checks, offline assistant RAG eval, local RAG sync planning, assistant metadata/admin checks, Prisma validation, backend build/smoke, assistant service-mode isolation, local/mock RAG orchestrator smoke, Cloudflare function smoke, frontend build, blog checks, Studio/AI Daily smoke, project-detail evidence checks, preview startup, and UI checks through `scripts/verify.mjs`.

## Node-Side Validation Helpers

When a task needs a `tsx` sampling script or assertion script for frontend-derived logic, keep the pure logic in `src/data/` or `src/utils/` instead of exporting it from a page component that imports UI packages, CSS, icons, or browser-only modules.

```typescript
// Good: Node-side scripts can import this without loading page UI dependencies.
import { getRelatedProjects } from './src/data/projectRecommendations.ts'

// Bad: importing a page can transitively load Semi icon CSS and fail in Node.
import { getRelatedProjects } from './src/pages/ProjectDetailPage.tsx'
```

This keeps validation scripts executable with `npx tsx` and prevents page rendering dependencies from becoming hidden test dependencies.

When a UI regression check asserts counts for data-driven lists such as homepage
external targets, related projects, blog cards, or reliability groups, derive the
expected value from the same public data source or generated manifest instead of
hardcoding yesterday's number. This keeps tests useful when content grows.

Public data modules that are already statically imported by the main route tree
should not be dynamically imported from small shell components just to look lazy.
For example, `SeoManager` should statically import `projects` and
`getPublicBlogPostSummary()` because those modules are already pulled into the
main bundle by public pages and assistant data. A redundant dynamic import causes
Vite/Rolldown `INEFFECTIVE_DYNAMIC_IMPORT` warnings without reducing shipped
JavaScript. If a future SEO or shell helper truly needs lazy data, first confirm
the target module is not already statically imported elsewhere in the same chunk,
then guard the behavior with `npm.cmd run build` output.

For Playwright route checks, avoid using `networkidle` as the default page
readiness signal. Studio, status, assistant, or preview pages may keep background
requests or lazy resources open long enough to create false timeouts. Prefer a
shared helper with a bounded retry that waits for `domcontentloaded`, the React
root, and disappearance of the `.route-loading` Suspense fallback, then assert
the route-specific visible content needed by the test. Use `networkidle` only for
a narrowly documented case where the network becoming idle is the behavior under
test.

For `/status`, entry-card detail links and reliability project detail routes
should be derived through shared helpers and `src/data/statusTargets.ts`. UI
checks should assert the link count and `/status/:projectId` route target from
the same data instead of duplicating project ids or fixed counts in Playwright
code.

For `/status/:projectId`, evidence freshness UI should be derived through
`parseEvidenceFreshness()` in `src/data/siteStatusView.ts`, not by re-parsing
the evidence string inside the page component. UI checks should derive the
expected freshness row count from the same generated `site-status.json` payload
that the page consumes, so synthetic check additions or removals do not require
hardcoded Playwright count updates.

`npm.cmd run status:contract` must also catch generated status JSON drift:
`public/status/site-status.json` target ids, reliability project ids, and per
project check ids must stay aligned with `src/data/statusTargets.ts`. Keep this
guard offline; do not run live entry checks just to prove a generated JSON file
matches the current source contracts.

For route-level UI checks, wait for route-specific async readiness in addition
to the shared `.route-loading` Suspense fallback. Blog detail routes, for
example, load the route module first and then load article content via
`getBlogPost()`, so `check:ui` must wait until the title is no longer
`文章载入中` before asserting the final heading. When checking lazy images, scroll
the image into view and wait for `complete && naturalWidth > 0` before reading
layout metrics. Prefer `requestfailed` logs with URLs for actionable resource
failures; anonymous Chromium `Failed to load resource: net::ERR_TIMED_OUT`
console noise from local preview should not be the only failure signal when
explicit route, image, and link assertions still pass. Local preview checks
must not ignore same-origin JS, CSS, image, JSON, or route failures. The public
shell must not add render-blocking third-party font stylesheets; use the project
system-font stacks unless a later self-hosted font asset has an explicit
performance budget.

When a route check asserts a first-load browser state, make that state explicit
in `scripts/check-ui.mjs`. For example, Studio no-token prompts must declare
`clearLocalStorageKeys: ['biau-studio-admin-token']` on the route entry and clear
those keys with `page.addInitScript()` before navigation. Do not rely on the
current developer browser, a previously visited route, or a stale preview server
to happen to have the right storage state.

### Generated Route Lists And Sitemaps

Generated route lists must read structured public data, not parse source files
with broad regular expressions. `src/data/portfolio.ts` contains nested
`visual.id` values in addition to top-level `project.id` values; regex scanning
for `id:` can accidentally create fake routes such as `/projects/<visual-id>`.
This applies to sitemap generation, route monitors, and UI checks. For example,
`scripts/check-site-monitor.ts` should import `projects`, `reliabilityProjects`,
and `getPublicBlogPosts()` instead of reading TypeScript source with regex.

Good:

```typescript
import { projects } from '../src/data/portfolio.ts'

const projectIds = projects.map((project) => project.id)
```

Bad:

```typescript
const portfolio = await readFile('src/data/portfolio.ts', 'utf8')
const projectIds = [...portfolio.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1])
```

After changing sitemap generation, project ids, status ids, blog curation, or
visual ids, run `npm.cmd run sitemap:generate` and inspect `public/sitemap.xml`
for only real routable paths. For broad release checks, also run
`npm.cmd run status:contract` when status data is involved.

Studio routes must also pass the visible overflow guard in `scripts/check-ui.mjs`.
When changing `/studio` layout, form controls, cards, chips, preview headers, or
AI Daily source controls, ensure `.studio-page` descendants stay within their
parent and viewport at desktop and mobile widths. Long titles, slugs, source
names, model labels, and status text should use `min-width: 0` plus
`overflow-wrap: anywhere` / bounded grid columns instead of relying on a perfect
content length.

Studio is an internal workbench route, not a marketing/case-study route. It may
reuse the public shell and navigation, but its main surface should stay compact:
the hero title must be dashboard-sized, token controls should behave like a
toolbar on desktop, and the primary `/studio` grid should use at most two columns
at normal desktop widths. `check:ui` asserts these basics so a page can no longer
pass only because it has no horizontal scrollbar while still looking like a
public landing page with dense admin forms forced into it.

The main `/studio` route must also provide an obvious review path in the first
screen. Editors should not have to infer where the content lives or which action
publishes the next step: the page needs a visible review guide, a current-draft
summary, anchors to edit and preview, and clear actions for "审核通过" and
"创建导出记录". `check:ui` treats a missing review guide on `/studio` as a UI
regression.

Studio API failures should distinguish user-fixable token problems from real
network or service failures. Before sending `Authorization`, reject tokens that
contain control characters or non-header-safe characters, and explain that the
editor should clear and paste a plain-text token. Fetch/CORS failures may be
reported as a generic browser connection problem, but HTTP responses such as
`401 missing-studio-token` must still use the normal token mismatch message.
Do not leave page-level `catch` blocks that overwrite these diagnostics with
`无法连接 Studio API`; route components should route unexpected client exceptions
through the shared Studio client-exception explainer so frontend parsing errors,
bad saved header values, and real token mismatches stay distinguishable.

### Blog Knowledge Quality Gate

Public `知识积累 / Knowledge Notes` posts must pass
`npm.cmd run blog:knowledge-check` before they are treated as publishable. The
gate reads `getPublicBlogPosts()` plus the loadable runtime article from
`getBlogPost()`, so it checks the same public selector and route content that
visitors and the public assistant use.

The gate enforces:

- at least three concrete `knowledgePoints`;
- reusable `scenarios` and `practiceChecklist` entries;
- multiple substantive sections and takeaways;
- a source/evidence section whose body cites public references, official docs,
  or safe repo paths such as `src/data/...`, `scripts/...`, or `package.json`;
- reusable knowledge-first framing before local project application notes;
- no local absolute paths, private IPs, file URLs, or secret-like query strings.

Do not satisfy this gate by inventing citations. If a knowledge article is based
on this repository's public engineering work, cite the relevant public source
files and scripts. If public blog body content changes, regenerate assistant
knowledge with `npm.cmd run assistant:index` and let `npm.cmd run verify` rerun
`blog:knowledge-check`.

## Review Priorities

- Preserve the product website / solution showcase voice.
- Keep Home, Projects, Assistant, Blog, and detail pages clearly distinct.
- Maintain theme, language, and harbor-scene behavior across routes.
- Verify links and route changes through `react-router-dom` patterns already used in `src/App.tsx` and page files.
- Keep public content sanitized before it enters `src/data/`.

## UI Rules

Use the existing class-based design system and `lucide-react`. Do not add other UI frameworks or CSS-in-JS stacks unless the repository has a concrete product requirement that the current system cannot meet.

Prefer real project screenshots and runtime screenshots. Missing assets should use stable fallback assets or be omitted; do not fabricate business data or visual evidence.

### Convention: Mobile Gesture Ownership

On mobile, the document is the only owner of vertical panning. Interactive hero
regions may react to an explicit tap or a clearly horizontal gesture, but they
must release vertical movement to normal page scrolling before calling
`preventDefault()` or taking pointer capture.

```typescript
// Good: classify the gesture before taking ownership.
if (Math.abs(deltaY) > Math.abs(deltaX) * 1.18) {
  return
}

if (Math.abs(deltaX) >= 18) {
  event.preventDefault()
  element.setPointerCapture(event.pointerId)
}
```

For the home page specifically:

- `.hero-title-rotator` keeps `touch-action: pan-y`; a tap or clearly horizontal
  swipe may switch the poem, while a vertical drag must scroll the page.
- The mobile project manifest is a full-width vertical list. It must not create
  an internal horizontal or vertical scroll owner; each row leaves vertical
  panning to the document and exposes a separate trailing external action.
- Desktop infinite-loop duplicate cards must carry an explicit marker such as
  `data-loop-copy="true"` and stay hidden in the mobile manifest. Mobile
  visitors should receive one semantic copy of each project.
- Mobile navigation keeps only the brand, theme action, and menu trigger in the
  top row. Language and route actions belong in the expanded panel when the
  compact row cannot fit them without overlap.
- The expanded navigation panel must render above hero/page stacking contexts;
  `elementFromPoint()` in the UI check should resolve to the panel over its
  visible area.

`scripts/check-ui.mjs` must cover the home page at `320`, `390`, and `430` CSS
pixels and assert: no navigation overlap, no page-level horizontal overflow,
vertical panning on the title and project manifest, one visible project-card
set arranged in a non-overlapping column, bounded trailing actions, and an
operable mobile menu. This is a layout contract, not a screenshot-only check.

Mobile blog and project detail routes use the document as the only full-page
vertical scroll owner. The detail body is an unframed continuous reading band:
text sections use separators and rhythm instead of nested panel borders and
shadows, while screenshots, diagrams, code, tables, and related-item cards keep
their own meaningful boundaries. Primary body text must be at least `15px`, and
rich media may scroll horizontally only inside its own bounded container.

### Convention: Detail Reading Orientation

Representative long blog and project detail routes must expose a shared sticky
reading guide with unique existing targets, current-section context, and a
semantic `progressbar`. The outline starts collapsed, stays horizontally and
vertically operable when opened, supports `Escape` and outside-click closing,
and uses real hash anchors even when JavaScript chooses the scroll behavior.

`scripts/check-ui.mjs` verifies the guide at desktop plus `320`, `390`, and `430`
CSS pixels. Checks cover target integrity, deterministic unique ids, toggle and
focus semantics, section navigation, active-section updates, reduced-motion
operation, at least `95%` progress at the true document bottom, no empty guide
on missing routes, and no page-level overflow. Do not replace these behavioral
checks with screenshots alone.

### Convention: Light Theme Restraint

The light theme uses a morning-harbor palette rather than a high-saturation
rainbow field or a flat cream background. Muted rose, daylight, sea mist, and
harbor blue may all remain visible, but background saturation stays below
`100%` and primary panel alpha stays between `0.55` and `0.74` for readable,
still-translucent content.

The visible background contract uses five composited levels: the animated
`.gradient-bg` base, the app fluid field, the app ribbon field, the gradient
mist/edge pair, and `.harbor-environment` beam/spectrum/mist/edge layers.
Desktop scenes must keep all levels active. Mobile scenes may reduce inset,
blur, opacity, and layer area, but must not globally hide the fluid/ribbon or
harbor layers merely to make cards calmer or to address a performance concern.
Adjust mobile cost tokens, surface alpha, borders, and shadows first.

`dusk`, `garden`, and `stellar` must remain visibly distinct in both light and
dark themes. `scripts/check-ui.mjs` owns the computed-style contract for the
fluid/ribbon animations, harbor environment animations, six theme signatures,
mobile visibility, and the static `prefers-reduced-motion` fallback.

Foreground material must follow the active harbor scene as well as the moving
background. The home hero panel, project rail, and project cards use shared
scene tokens for tint, highlight, edge, depth, and sheen. Keep six distinct
light/dark material signatures, preserve project-specific card accents, and use
bounded pseudo-element highlights that never resize content. On mobile, reduce
sheen intensity and retain the vertical project manifest; under reduced motion,
the sheen must be static with no transition.

`dusk`, `garden`, and `stellar` must keep distinct light palettes. A light scene
must never reuse dark endpoints such as `#052433`; scene switching changes
atmosphere without silently changing the theme or reducing text contrast.

Light navigation controls, cards, footer surfaces, and status indicators use
the same cool translucent surface language with ink-tinted borders and restrained
shadows. Avoid pure-white outlines, neon active states, or multiple unrelated
accent systems competing in one viewport.

`scripts/check-ui.mjs` owns the token-level light scene contract in addition to
normal overflow and interaction checks.

## Scenario: Mobile First-Load Performance And Harbor Intro

### 1. Scope / Trigger

- Trigger: changing `index.html`, `src/main.tsx`, top-level route imports,
  `HarborIntro`, global CSS imports, or Cloudflare Pages cache headers.
- Goal: let the harbor animation begin promptly on a cold mobile visit without
  turning the animation itself into a permanent loading screen.

### 2. Signatures

- Build budget command: `npm.cmd run performance:check`.
- Intro completion key: `sessionStorage['biau-port-harbor-intro:v3']`.
- Cloudflare Pages cache contract: `public/_headers` owns `/assets/*` immutable
  cache behavior.

### 3. Contracts

- `dist/index.html` must not contain render-blocking third-party stylesheets.
  Use the system font stacks in `src/styles/theme.css`; a future custom font
  must be self-hosted and explicitly budgeted.
- Keep the public shell free of component-framework stylesheets. UI controls
  use repository CSS tokens and tree-shaken Lucide icons; adding a framework
  requires proof that the product need and build budget justify it.
- The built entry CSS must stay at or below `240000` raw bytes and the built
  entry JavaScript at or below `430000` raw bytes. These are regression budgets,
  not user-network transfer estimates.
- Heavy non-home routes and the public assistant widget should remain lazy
  chunks unless direct-route UX proves that a specific route must be eager.
- Hashed `/assets/*` files use `Cache-Control: public, max-age=31536000,
  immutable`; HTML remains revalidatable so new hashes can deploy safely.
- The harbor intro uses the measured navigation Logo box as its final geometry,
  clears the center wordmark before handoff, and writes its seen marker only
  after `harborIntroVeil`
  completes. A slow or interrupted load must not permanently suppress the next
  attempt. `prefers-reduced-motion: reduce` still skips the animation.

### 4. Validation & Error Matrix

- External stylesheet in built HTML -> `performance:check` fails.
- Entry CSS or JS exceeds its budget -> `performance:check` fails with actual
  and allowed byte counts.
- Missing immutable asset header -> `performance:check` fails.
- Intro marker exists while `.harbor-intro` is active -> `check:ui` fails.
- First mobile visit with no reduced-motion preference does not mount or finish
  the intro -> `check:ui` fails.
- Reduced-motion visitor -> no intro is required and normal page content must
  remain available.

### 5. Good/Base/Bad Cases

- Good: cold 390px visit loads local CSS/JS, mounts the harbor animation, then
  stores `v2=1` only after docking and veil completion.
- Base: a completed intro in the same tab is skipped on later SPA/home visits.
- Base: a reduced-motion visitor sees the page directly.
- Bad: a Google Fonts `<link rel="stylesheet">` blocks React and the animation.
- Bad: importing `semi.min.css` adds hundreds of unused component rules to the
  public shell.
- Bad: setting the intro marker in the mount effect before any frame is painted.

### 6. Tests Required

- Run `npm.cmd run lint`, `npm.cmd run build`, and
  `npm.cmd run performance:check` after changing entry resources or caching.
- Run `npm.cmd run check:ui` after changing the intro, route splitting, or
  top-level Suspense behavior.
- The UI check must include a mobile context with `390x844`, touch enabled, and
  `reducedMotion: 'no-preference'`.
- When production is redeployed, verify the new hashed asset headers and repeat
  a cold mobile trace; local preview cannot prove Cloudflare applied `_headers`.

### 7. Wrong vs Correct

#### Wrong

```tsx
import 'large-ui-framework/dist/full.css'

useLayoutEffect(() => {
  sessionStorage.setItem(INTRO_STORAGE_KEY, '1')
}, [])
```

The public shell pays for unused CSS, and an interrupted first frame suppresses
future intro attempts.

#### Correct

```tsx
if (event.animationName === 'harborIntroVeil') {
  markIntroSeen()
  setVisible(false)
}
```

Only the CSS actually used by the site ships in the entry bundle, and the
completion marker represents a completed animation.

### Internal Assistant Workspace First Load

`/assistant` should open as a productized Agent workspace, not as a long explanatory chat transcript. Keep the default assistant opening concise, do not render default citation cards before the user asks a question, and keep the first screen focused on run mode, model channel, next action, conversation, and the Agent inspector.

`scripts/check-ui.mjs` must keep assertions for this contract:

- the opening assistant message stays short;
- default first load has no citation cards;
- the run-status strip is visible;
- the Agent, tool, and guardrail inspector panels are visible on desktop and mobile.

For `/assistant/admin`, the knowledge tab must keep a visible internal knowledge sync path and curated `sourceType` presets. Editors should not have to guess whether a document is a runbook, project note, status note, resource, AI Daily source, or incident note from a blank text input. `check:ui` should click the knowledge tab and assert the readiness path and source-type preset UI without requiring a live admin token.

For `/assistant`, keep a visible member durable-memory panel on desktop and mobile. It must expose refresh and archived-item controls, show a clear no-token/empty state, wrap long content, and avoid a direct create form. Memory writes are initiated through explicit Agent conversation only, and a memory API failure must not disable the chat workspace.

## Scenario: Default-Off Analytics Adapter

### 1. Scope / Trigger

- Trigger: changing `src/utils/analytics.ts`, route-view tracking in `src/App.tsx`, product interaction analytics, or the public docs for Umami/Plausible.
- Goal: keep visitor analytics useful for product decisions without shipping provider secrets, full URLs, query strings, raw prompts, or private identifiers.

### 2. Signatures

- Env selector: `VITE_ANALYTICS_PROVIDER = "umami" | "plausible" | "debug" | unset`.
- Route helper: `getAnalyticsRouteMetadata(pathname)` returns `{ routePattern, routeArea, routeDepth }`.
- Route event helper: `trackRouteView(pathname)` emits `route_view` once per normalized pathname change.
- Interaction helper: `trackAnalyticsEvent(name, properties?)` sends custom events through the configured browser global.

### 3. Contracts

- Analytics is default-off. Unsupported or missing `VITE_ANALYTICS_PROVIDER` must result in no network or browser-global calls.
- The repository must not contain Umami/Plausible site ids, provider script URLs, dashboard URLs, tokens, or API keys.
- Route-view events must send normalized metadata such as `/projects/:id`, `/blog/:slug`, `routeArea`, and `routeDepth`; do not send full URLs, query strings, hashes, dynamic ids, user-entered text, or external URLs.
- `debug` may dispatch `biau:analytics` for local inspection, but production collection still requires the user to choose and configure one provider.
- React StrictMode can double-run effects in development, so route tracking must dedupe repeated normalized pathnames.

### 4. Validation & Error Matrix

- Missing provider -> no event is sent.
- `debug` provider -> browser dispatches `CustomEvent("biau:analytics")` with low-sensitive event detail.
- `umami` provider -> call `window.umami?.track(name, props)` if the admin-injected script exists.
- `plausible` provider -> call `window.plausible?.(name, { props })` if the admin-injected script exists.
- Route `/projects/legal-rag?token=x` -> event properties must still look like `{ routePattern: "/projects/:id", routeArea: "project-detail", routeDepth: 2 }`.

### 5. Good/Base/Bad Cases

- Good: navigating from `/projects` to `/projects/legal-rag` emits one `route_view` with `routePattern: "/projects/:id"` and no project id or query.
- Base: analytics provider unset; interaction handlers can still call `trackAnalyticsEvent()` safely because it no-ops.
- Bad: adding a Plausible/Umami script tag, site id, or endpoint URL directly in `index.html`, `src/`, docs, or generated status files.
- Bad: sending raw assistant questions, Studio tokens, full external URLs, or project detail slugs as analytics properties.

### 6. Tests Required

- Run `npm.cmd run lint` and `npm.cmd run build` after changing analytics code or route tracking.
- Run `npm.cmd run analytics:check` after changing route metadata, route tracking, or analytics event payloads.
- Run `npm.cmd run docs:observability-check` and `npm.cmd run docs:manual-gates-check` after changing analytics/observability docs.
- Search changed files for `umami`, `plausible`, `token`, `apiKey`, `password`, `database URL`, and full provider URLs before committing analytics work.

### 7. Wrong vs Correct

#### Wrong

```ts
trackAnalyticsEvent('route_view', { href: window.location.href, question: input })
```

This leaks full URLs, query strings, and user-entered content into a third-party analytics system.

#### Correct

```ts
trackRouteView(pathname)
```

The helper normalizes the route to a public-safe pattern and dedupes repeated pathnames before calling the configured provider.

### Project Detail Visual Composition

Project detail pages should include both runtime evidence and structural explanation:

- at least three in-body visual blocks for each standard case-study page, so the detail body is not just a hero image plus text;
- at least one in-body `screenshot` visual, so visitors can see the actual product/game/app state;
- at least one in-body structural visual: `workflow`, `architecture`, `data-flow`, or `diagram`, so visitors can understand the implementation or usage path.
- all standard case-study groups should be present: `overview`, `workflow`, `architecture`, `quality`, `limitations`, and `roadmap`;
- body visuals should use unique ids and should not collapse to repeated copies of the hero image;
- hero images, visual images, visual source links, project links, section links, and assistant-facing project facts must stay public-safe and free of local paths, private IPs, secret-like query strings, or non-HTTPS external URLs;
- hero and body visual image files must be parseable by the local image pipeline, large enough for visitor-readable case-study pages, and raster assets such as PNG/JPEG should keep same-name WebP sidecars;
- image-backed body visuals need visitor-readable alt text and captions, not placeholder labels; `project-details:check` enforces conservative minimum lengths for both;
- each section needs enough body text or bullet detail to read as a case-study note, not a bare heading.

`npm.cmd run project-details:check` enforces this composition. When a project
lacks a safe runtime screenshot, record that as an asset/manual gate rather than
inventing one. When a project lacks a safe structural visual, prefer a
public-safe SVG/diagram that explains the current implementation boundary,
workflow, or data flow without private URLs, local paths, credentials, or
unapproved release claims.

`npm.cmd run check:ui` should also prove the rendered project detail page keeps
the data contract visible: image-backed body visuals need rendered image alt
text and visible captions derived from `src/data/portfolio.ts`, not just valid
data entries that never reach the DOM.

## Static Public Pages

When adding a pure static page under `public/` instead of a React route, add a
small assertion or manual check that proves:

- every referenced `/images/...` asset exists in `public/`;
- gated downloads such as APKs do not expose a real `href` until approved;
- generated sitemap output contains the static route when it should be indexed.

This prevents the page from passing build/lint while still shipping broken
screenshots or an accidentally public gated download.

### Convention: README Screenshot Capture

When refreshing README or GitHub landing screenshots for the main site, capture
the stable route UI instead of the first-entry harbor intro. Add this init script
before navigating in Playwright:

```js
await context.addInitScript(() => {
  window.sessionStorage.setItem('biau-port-harbor-intro:v3', '1')
})
```

After navigation, wait for `#root`, wait for `.harbor-intro` to detach when it is
present, and give the route a short settling delay before `page.screenshot()`.
The home, projects, and blog screenshots should be regenerated as paired
PNG/WebP files under `public/images/projects/showcase/`, then optimized with:

```powershell
npm.cmd run images:optimize -- --force
```

Good: README screenshots show `/`, `/projects`, or `/blog` visitor content with
the BIAU Port / 泊岸 shell visible. Bad: README screenshots show only the
animated intro gradient, logo, or loading state.

### Convention: Root Static SEO Shell

`index.html` is the first SEO and social-card shell before React mounts. Keep
its `<title>`, description, Open Graph, and Twitter fields aligned with the
defaults in `src/utils/seo.ts`.

Good:

```html
<meta property="og:site_name" content="BIAU Port" />
<title>BIAU Port 泊岸 | AI 应用、项目展示与知识库</title>
```

Bad:

```html
<meta property="og:site_name" content="Old Brand" />
<title>Old Brand | AI 应用、项目展示与知识库</title>
```

After changing brand, default title, default description, canonical host, or
default social image, search both the static shell and runtime SEO source:

```powershell
rg -n "old brand|new brand" index.html src/utils/seo.ts README.md
```

### Convention: Cross-Site BIAU Port Brand Alignment

When aligning a project demo or sibling showcase with BIAU Port / 泊岸, do not
stop at browser metadata. The public visitor must see the relationship in the
page chrome too.

Check these surfaces:

- Browser shell: `<title>`, `og:site_name`, favicon, apple touch icon, manifest
  or Astro/Vite site metadata.
- Visible shell: login hero, nav brand, sidebar logo, footer ownership line,
  bridge banner, and "back to BIAU Port" links.
- Main-site data: `src/data/portfolio.ts`, `src/data/statusTargets.ts`,
  `src/data/assistant.ts`, generated assistant knowledge, sitemap, and status
  JSON when relevant.

Preserve product names such as `Ozon ERP`, `Legal RAG`, `BIAU Playlab`, and
`寻球`; the BIAU Port / 泊岸 mark is the parent shell, not a replacement for the
case-study product identity.

Good:

```text
BIAU Port / 泊岸
Ozon ERP 运营控制台
```

Bad:

```text
Ozon ERP
```

if BIAU Port only appears in a small bridge card or browser favicon.

Validation should include a targeted `rg` for old/new brand strings, the
affected site build, and main-site generated outputs if public data changed.

## Data Safety

Everything committed to this public site should be treated as public. Never write real IPs, internal domains, database URLs, API keys, tokens, signing paths, certificates, private account details, exact sensitive metrics, or unsanitized customer/company names.

Use `.env.example` for structure. Do not read or quote `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`, `*.p12`, or `~/.ssh/*`.

## Avoid

- Do not use `--no-verify` or bypass checks.
- Do not add broad `// eslint-disable` comments to force lint success.
- Do not treat `npm run dev` as verification; it does not run strict TypeScript checks.
- Do not use destructive git commands or push without an explicit user request.

### Mobile Primary Navigation Regression

Test the five source-ordered Home, Projects, Knowledge, Status, and Assistant
tabs at 320px, 390px, and 430px. Assert fixed viewport bounds, 44px targets,
no horizontal overflow, and exactly one active tab for both index and nested
route families. Verify the mobile header keeps theme and language controls but
has no redundant hamburger menu. The public assistant must clear the tabbar by
at least 8px, footer content must remain readable above its safe-area clearance,
and assistant drawers must suppress the global tabbar while open. Desktop must
hide the mobile tabbar and preserve keyboard access to the full navigation.
### Mobile Taxonomy Regression

For responsive taxonomy controls, UI checks must cover 320px, 390px, and 430px.
Assert that the mobile selector is visible and bounded, the desktop button group
is hidden, every option exists, populated and empty selections use the shared
projection, pagination resets, and the document has no horizontal overflow.
Desktop checks must assert the inverse visibility contract.

### Mobile Project Catalog Regression

For `/projects`, test 320px, 390px, and 430px against `catalogProjects` from
`src/data/portfolio.ts`. Assert two complete vertical controls, AI as the only
default panel, one visible grid after every switch, source order and counts,
every catalog project reachable exactly once, one BIAU Playlab card, no
standalone `interactive` cards, 44px group/card actions, material 390px height
reduction, and no horizontal overflow. Desktop must hide the mobile controls
and show both catalog groups and every catalog card simultaneously. Separately
verify the full `projects` registry still renders every retained child game
detail route, and verify Playlab exposes all internal case links and Web-play
links. Do not derive expected titles or counts from the rendered DOM.

### Mobile Workspace Drawer Regression

For chat-first responsive workspaces, test desktop inverse visibility plus
320px, 390px, and 430px mobile widths. Assert the primary workspace starts in
the first viewport; the drawer starts inaccessible and closed; opening exposes
`dialog` / `aria-modal` semantics, focuses the close control, traps focus, locks
document scrolling, and prevents global-navigation overlap; Escape, backdrop,
and close-button paths restore scrolling and trigger focus. Also assert drawer
bounds, retained secondary capabilities, and no page-level horizontal overflow.

### Long Status Page Navigation Regression

For `/status`, verify the mobile-only section navigator at 320px, 390px, and
430px. Assert all stable section options exist, each jump lands below the sticky
control, passive scroll tracking updates the selected section, the control stays
bounded near the viewport top, and entry/project evidence counts are unchanged.
Desktop must hide the mobile navigator, and no viewport may gain horizontal
overflow.

### Mobile Focused Workspace Regression

For multi-column authoring routes such as `/studio`, verify 320px, 390px, and
430px. Assert the mode control is visible and every target is at least 44px;
only the default editor panel is visible initially; switching modes preserves
form state; selecting, creating, or opening a review record returns to the
editor; token controls remain before the workspace and guidance remains after
it; and no horizontal overflow appears. Desktop must hide the mode control and
keep every original workspace panel visible.

### Mobile Administrative Section Regression

For `/assistant/admin`, test the six section values at 320px, 390px, and 430px.
Assert that mobile shows one labeled native selector and hides desktop tabs;
each selection leaves exactly one corresponding panel visible; entered form
state survives round trips; the default overview remains below the documented
height budget; and the page has no horizontal overflow. Desktop must expose the
tablist, hide the selector, and obey the same one-panel contract.

### Mobile Floating Surface Regression

For detail routes with both a reading guide and public assistant, test 320px,
390px, and 430px using actual bounding rectangles. Assert zero positive-area
intersection, the intended 8px gap when collision exists, stale-offset reset
after scrolling, no offset on a non-colliding blog detail, bidirectional mobile
open-state exclusion, desktop inverse behavior, and no horizontal overflow.
Mock assistant health in UI checks; never probe a real model/provider merely to
exercise floating-surface behavior.

Status reliability detail routes use the same regression boundary. Verify the
six ordered stable anchors, every anchor landing below the collapsed sticky
guide, passive active-section tracking, and preservation of source check, gate,
and next-action counts at desktop plus 320px, 390px, and 430px. `/status` keeps
`StatusSectionNavigator`; missing `/status/:projectId` routes render no reading
guide. Use condition-based waits for geometry and React state, and force test
scrolling to `scroll-behavior: auto` when a check needs deterministic placement.
### Adaptive Performance Profile Regression

Mobile visual performance uses the root `data-performance="balanced|static"` contract. Resolve the profile from reduced-motion, Save-Data, constrained network, and combined low-memory/low-CPU mobile signals; missing signals must remain `balanced`. Apply the initial value before React renders, subscribe to media/network changes with cleanup, and do not persist or expose device diagnostics.

The `static` profile may stop perpetual background, ribbon, field, grain, and harbor-environment work and reduce backdrop blur. It must not remove content, navigation, title transitions, reading controls, or the one-shot BIAU harbor intro. `prefers-reduced-motion` keeps its stronger existing intro opt-out.

Run `npm.cmd run performance-profile:check` after changing signal resolution, ambient layers, the harbor intro, or mobile viewport behavior. The focused check must cover pure rule decisions, runtime connection changes, 320/390/430px static rendering, horizontal overflow, retained low-power intro, Save-Data, and reduced-motion.
