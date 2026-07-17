# AI Daily domain foundation design

## Boundary

This task owns shared contracts, Prisma schema, migrations, repositories, and deterministic fixtures. It does not implement live collection, providers, generation, public endpoints, or new Studio pages.

## Data Direction

- Keep PostgreSQL as the only authoritative runtime store.
- Replace `sourceIdsJson` authority with ordered `AiDailyIssueSource` relations while retaining safe migration compatibility.
- Model logical flash identity separately from immutable content revisions.
- Store only bounded, sanitized provider/run metadata.

## Migration

1. Add nullable/new tables and indexes.
2. Backfill relations from existing issue/source data.
3. Verify counts and ownership.
4. Switch repository reads to relational authority.
5. Retain compatibility reads until export and UI child tasks pass.

Rollback disables new repositories and leaves added data intact. It never deletes existing editorial data.

## Dependency Contract

Later tasks may depend only on exported domain services and types from this task, not direct ad hoc Prisma access.
