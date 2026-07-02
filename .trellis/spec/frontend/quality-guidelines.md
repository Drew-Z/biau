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

## Review Priorities

- Preserve the product website / solution showcase voice.
- Keep Home, Projects, Assistant, Blog, and detail pages clearly distinct.
- Maintain theme, language, and harbor-scene behavior across routes.
- Verify links and route changes through `react-router-dom` patterns already used in `src/App.tsx` and page files.
- Keep public content sanitized before it enters `src/data/`.

## UI Rules

Use Semi Design v19 components and `@douyinfe/semi-icons` first. Do not add other UI frameworks or CSS-in-JS stacks. When Semi APIs are uncertain, check current official docs before relying on memory.

Prefer real project screenshots and runtime screenshots. Missing assets should use stable fallback assets or be omitted; do not fabricate business data or visual evidence.

## Data Safety

Everything committed to this public site should be treated as public. Never write real IPs, internal domains, database URLs, API keys, tokens, signing paths, certificates, private account details, exact sensitive metrics, or unsanitized customer/company names.

Use `.env.example` for structure. Do not read or quote `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`, `*.p12`, or `~/.ssh/*`.

## Avoid

- Do not use `--no-verify` or bypass checks.
- Do not add broad `// eslint-disable` comments to force lint success.
- Do not treat `npm run dev` as verification; it does not run strict TypeScript checks.
- Do not use destructive git commands or push without an explicit user request.
