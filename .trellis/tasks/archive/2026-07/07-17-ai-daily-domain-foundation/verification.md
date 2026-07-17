# AI Daily domain foundation verification

## Deterministic checks

- `prisma:validate`, `prisma:generate`, and `server:build` pass.
- `studio:ai-daily-domain-check` covers profile readiness, domain-local transitions, cross-domain rejection, canonical identity, edition dates, idempotency, leases, citation snapshots, and schema/migration contracts.
- `studio:ai-daily-brief-check`, `studio:review-policy-check`, and `studio:smoke` preserve the existing Studio and offline draft behavior without live provider calls.
- `blog:check` proves hidden content remains absent from public selectors and assistant knowledge.
- `server:smoke`, `assistant:service-modes-smoke`, `lint`, `build`, and `check:ui` pass for the wider compatibility surface.

## PostgreSQL migration regression

- A disposable PostgreSQL database applies the full migration chain from an empty schema.
- A legacy-data fixture upgrades without destructive deletion or arbitrary state promotion.
- Invalid legacy date `2026-02-30` remains `editionDate = NULL`.
- Duplicate and missing legacy source IDs are filtered safely while valid source order is retained.
- `studio:ai-daily-repository-check` passes against PostgreSQL for canonical adoption, selection idempotency, revision ownership, lease reclaim, stale-token rejection, flash supersession, immutable revisions, and append-only approval history.

## Public boundary

This foundation does not add a database-backed public selector. AI Daily conversion still creates a `HIDDEN + REVIEW_NEEDED` draft, and public content continues to require the existing review, Publish Export, static catalog, build, and deployment path. The later public-feed task owns the approved flash projection and its end-to-end leak checks.
