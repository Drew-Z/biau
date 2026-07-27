# Implementation

- [x] Add Prisma request-state model and additive migration.
- [x] Add normalized `requestId` contract and canonical request hashing.
- [x] Implement claim, replay, lease takeover, failure, cancellation, and fenced completion persistence APIs.
- [x] Route JSON and SSE generation through one idempotent execution coordinator.
- [x] Carry request IDs through browser transport, active request state, retained issues, and explicit retry behavior.
- [x] Extend retention/session deletion and public-safe response projection.
- [x] Add deterministic concurrency, replay, conflict, lease-fencing, abort, API, proxy, and UI contract fixtures.
- [x] Update backend/frontend specifications and deployment environment documentation if the migration changes commands.
- [x] Run Prisma generation, lint, build, public assistant checks, UI checks, Cloudflare smoke, performance budget, and diff validation.

## Risk points

- Aggregate and turn writes must never happen outside the fenced completion transaction when a database claim exists.
- JSON and SSE routes must share the same coordinator and stable error mapping.
- A retry must not accidentally become a new generation ID; cancellation must not accidentally reuse a terminal ID.
- Stored `responseJson` must be decoded through the public projection before replay.
