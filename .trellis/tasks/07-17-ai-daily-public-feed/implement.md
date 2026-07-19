# AI Daily public feed and deep edition implementation

## 1. Public Projection Contract

- [x] Add shared public DTO, cursor, freshness, ETag, citation, and URL-safety
  helpers with deterministic fixture coverage.
- [x] Add one bounded feed query and one detail lookup against the Studio
  Prisma client.
- [x] Add the compound public-feed index and a timestamped migration.

## 2. Public HTTP Boundary

- [x] Add a dedicated public router mounted only in `studio` and local `all`
  service modes.
- [x] Implement feed/detail status semantics, bounded query parsing, keyset
  pagination, exact CORS allowlist, process-local rate limiting, cache headers,
  and `If-None-Match` handling.
- [x] Prove Studio authentication/mutations and private fields remain isolated.

## 3. Public Frontend

- [x] Add a typed, no-auth public API client with runtime decoding and ETag
  support.
- [x] Add lazy `/ai-daily` feed and `/ai-daily/:publicId` detail pages.
- [x] Add visible freshness, citation coverage, correction, stale-data,
  loading, empty, error, pagination, and mobile-safe states.
- [x] Pause polling in background tabs and refresh at most every 60 seconds
  while visible without discarding the last successful payload.

## 4. Discovery And Operations Contract

- [x] Add SEO, normalized analytics metadata/checks, navigation/discovery link,
  sitemap index entry, public synthetic target, and deployment env docs.
- [x] Keep dynamic event ids out of the static sitemap until a reviewed
  Git-tracked public snapshot exists.

## 5. Verification

- [x] Add `npm.cmd run ai-daily:public-feed-check` covering field whitelisting,
  citation URL safety, pagination, status semantics, correction/ETag change,
  CORS, rate limit, cache, stale metadata, fixture publication timing, and query
  budget without live providers or production databases. Service-mode and auth
  isolation are covered by `npm.cmd run assistant:service-modes-smoke`.
- [x] Extend deterministic UI fixtures for desktop/mobile feed and detail,
  `304`, transient failure with retained data, stale state, and overflow.
- [x] Run:

```powershell
npm.cmd run prisma:format
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run ai-daily:public-feed-check
npm.cmd run studio:export -- --sample --dry-run --allow-dirty
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run assistant:index
npm.cmd run sitemap:generate
npm.cmd run analytics:check
npm.cmd run docs:deployment-check
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
git diff --check
```

## Completion Gate

The public Flash API and frontend must expose only the current approved active
projection, while the static Edition export remains a separately reviewed and
independently deployable publication path.

The code gate is complete. Production migration, Studio/Cloudflare environment
configuration, deployment, and live CDN timing remain explicit manual gates in
`docs/manual-gates.md`; no production database or provider was contacted by the
automated checks.
