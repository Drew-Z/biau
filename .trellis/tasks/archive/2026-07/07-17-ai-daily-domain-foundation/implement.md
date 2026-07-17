# AI Daily domain foundation implementation

## Ordered Work

- [x] Inspect existing Prisma and Studio state ownership.
- [x] Add shared TypeScript contracts and transition tables.
- [x] Add Prisma models, constraints, indexes, and migration.
- [x] Add repositories and transaction helpers for canonical source, edition, selection, generated revision, and flash revision ownership.
- [x] Add fixture factories and state-transition tests.
- [x] Add citation snapshot v2 compatibility types.
- [x] Run migration and regression gates against a disposable database.

## Completion Gate

Do not start dependent integration work until schema generation, state tests, and migration regression pass.
