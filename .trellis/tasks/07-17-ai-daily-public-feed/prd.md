# AI Daily public feed and deep edition

## Goal

Publish approved flash revisions through a safe near-real-time public surface while preserving the reviewed static daily edition as the durable archive.

## Dependencies

- Requires `07-17-ai-daily-domain-foundation` complete.
- Requires approved flash and revision contracts from `07-17-ai-daily-studio-editorial`.
- End-to-end acceptance requires evidence and generation outputs from `07-17-ai-daily-ingestion-evidence` and `07-17-ai-daily-generation-runner`.

## Requirements

- Add versioned read-only feed and event-detail DTOs on the existing Studio service.
- Expose only the current approved revision of active flash items from the last 48-72 hours.
- Enforce field whitelisting, bounded pagination, CORS allowlist, rate limiting, indexed query budget, ETag, and CDN cache headers.
- Return `404` for unknown/never-approved items and `410` for withdrawn/expired items.
- Expose projection generation, pipeline freshness, last approval, editorial coverage, and stale state.
- Add a mobile-safe BIAU flash feed that refreshes at most every 60 seconds while visible and retains the last successful payload on failure.
- Preserve daily edition review, citation snapshots, Publish Export, static catalog, sitemap, and assistant-index boundaries.
- Never expose evidence bodies, prompts, provider metadata, reviews, or internal IDs.

## Acceptance Criteria

- [x] Approval reaches the public API within p95 <=2 minutes under fixture timing.
- [x] Correction changes the ETag and stable public representation; old revisions are not separately public.
- [x] Withdrawal is removed immediately and detail returns `410`.
- [x] CDN/cache, CORS, rate-limit, auth isolation, pagination, and query-budget fixtures pass.
- [x] API-success-but-stale content is visibly labeled.
- [x] Mobile and desktop feed layouts have no unintended overflow.
- [x] Hidden/unreviewed content remains absent from public build and assistant surfaces.

## Validation

```powershell
npm.cmd run ai-daily:public-feed-check
npm.cmd run studio:export -- --sample --dry-run
npm.cmd run blog:audit
npm.cmd run blog:check
npm.cmd run assistant:index
npm.cmd run sitemap:generate
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run check:ui
```
