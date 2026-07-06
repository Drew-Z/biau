# Frontend Quality Guidelines

## Required Verification

For changes under `src/` or project configuration, run these in order on Windows PowerShell:

```powershell
npm.cmd run lint
npm.cmd run build
```

`npm run build` includes `tsc -b`, so it is the required type-check gate. Run lint first and fix lint failures before build. Markdown-only or `content-drafts/`-only changes may skip this gate, but component, route, style, and `src/data/` changes must run it.

For broad release checks, `npm.cmd run verify` also runs assistant index generation, Prisma validation, backend build/smoke, frontend build, blog checks, preview startup, and UI checks through `scripts/verify.mjs`.

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
shared helper that waits for `domcontentloaded`, the React root, and disappearance
of the `.route-loading` Suspense fallback, then assert the route-specific visible
content needed by the test. Use `networkidle` only for a narrowly documented case
where the network becoming idle is the behavior under test.

For `/status`, entry-card detail links and reliability project detail routes
should be derived through shared helpers and `src/data/statusTargets.ts`. UI
checks should assert the link count and `/status/:projectId` route target from
the same data instead of duplicating project ids or fixed counts in Playwright
code.

## Review Priorities

- Preserve the product website / solution showcase voice.
- Keep Home, Projects, Assistant, Blog, and detail pages clearly distinct.
- Maintain theme, language, and harbor-scene behavior across routes.
- Verify links and route changes through `react-router-dom` patterns already used in `src/App.tsx` and page files.
- Keep public content sanitized before it enters `src/data/`.

## UI Rules

Use Semi Design v19 components and `@douyinfe/semi-icons` first. Do not add other UI frameworks or CSS-in-JS stacks. When Semi APIs are uncertain, check current official docs before relying on memory.

Prefer real project screenshots and runtime screenshots. Missing assets should use stable fallback assets or be omitted; do not fabricate business data or visual evidence.

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
