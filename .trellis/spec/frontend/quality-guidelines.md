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
explicit route, image, and link assertions still pass. Local preview checks may
ignore transient Google Fonts request failures for `fonts.googleapis.com` and
`fonts.gstatic.com`; they must not ignore same-origin JS, CSS, image, JSON, or
route failures.

When a route check asserts a first-load browser state, make that state explicit
in `scripts/check-ui.mjs`. For example, Studio no-token prompts must declare
`clearLocalStorageKeys: ['biau-studio-admin-token']` on the route entry and clear
those keys with `page.addInitScript()` before navigation. Do not rely on the
current developer browser, a previously visited route, or a stale preview server
to happen to have the right storage state.

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

Use Semi Design v19 components and `@douyinfe/semi-icons` first. Do not add other UI frameworks or CSS-in-JS stacks. When Semi APIs are uncertain, check current official docs before relying on memory.

Prefer real project screenshots and runtime screenshots. Missing assets should use stable fallback assets or be omitted; do not fabricate business data or visual evidence.

### Project Detail Visual Composition

Project detail pages should include both runtime evidence and structural explanation:

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
