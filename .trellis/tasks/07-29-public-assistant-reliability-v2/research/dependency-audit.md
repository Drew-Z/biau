# Production Dependency Audit

## Command

```powershell
npm.cmd audit --omit=dev --registry=https://registry.npmjs.org
```

The official registry was used because the configured mirror does not implement
the npm audit advisory endpoint. `npm audit fix --force` was not used.

## Compatible Fixes

- Updated `@prisma/adapter-pg`, `@prisma/client`, and `prisma` from the `^7.8.0`
  line to `^7.9.1`.
- The updated Prisma dependency graph removes the reported vulnerable
  `@hono/node-server`, `valibot`, and `fast-uri` versions.
- The lockfile continues to use the repository's configured npm mirror for
  package downloads; only the audit query uses the official registry.

## Residual Advisory

- Advisory: `GHSA-qwww-vcr4-c8h2`, React Router RSC Mode CSRF bypass.
- Audit projection: two high findings through the `react-router-dom` ->
  `react-router` dependency edge.
- Repository reachability: not reachable in the current deployment. The site is
  a Vite browser SPA mounted with `BrowserRouter` in `src/main.tsx`; route code
  uses declarative `Routes`/`Route` and browser links. It does not expose React
  Server Components action execution or a React Router RSC server handler.
- Compatible fix status: npm offers only `npm audit fix --force`, which would
  downgrade `react-router-dom` to `7.11.0` and is explicitly disallowed. The
  latest compatible `react-router-dom` line remains within the advisory range.
- Follow-up: keep the advisory visible and upgrade when the DOM package exposes
  a compatible fixed router version. Reassess immediately if RSC/server actions
  are introduced.

## Acceptance

The dependency slice is acceptable when a clean install, Prisma generation,
all public-assistant checks, server/frontend builds, and UI checks pass. The
residual advisory is documented rather than hidden or force-fixed.
