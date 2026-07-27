# Public assistant idempotent generation

## Goal

Make one visitor generation intent execute and persist at most once across duplicate clicks, transport retries, worker restarts, and multiple service instances, while preserving the public assistant's anonymous and provider-agnostic boundary.

## Background

- The browser currently sends only `message`, `sessionId`, `mode`, `history`, and `pageContext`; retry creates a fresh HTTP request with no stable generation identity.
- Both JSON and SSE routes run the Agent before persistence lookup, and `persistTurn` always creates a new turn and increments aggregate counters.
- A mature answer-revision/branch model depends on distinguishing a retry of one generation from a genuinely new generation. This task establishes that invariant first.

## Requirements

- Every new generation intent receives a cryptographically random UUID `requestId` in the browser request body.
- Transport retries for a retained failed prompt reuse its `requestId`; a deliberate new generation, including future answer revision, receives a new ID.
- The server validates `requestId` and calculates a canonical request hash from the normalized public request. Reusing one ID with different content fails with a stable `409` error before Agent execution.
- PostgreSQL owns the cross-instance request state machine. A request is atomically claimed before Agent execution with a bounded lease and fencing token.
- A duplicate completed request returns the exact cached public response without rerunning planning, retrieval, generation, persistence, or aggregate updates.
- An active duplicate returns a stable retryable response with bounded `Retry-After`; an expired or retryable-failed lease may be claimed once by a new executor.
- Turn creation, daily aggregate increments, cached response persistence, and request completion occur in one transaction guarded by the active fencing token.
- A stale executor that loses its lease cannot create a turn or increment aggregates.
- Explicit cancellation and transport abort leave no completed turn. A later explicit retry may reuse the original request ID only when the request state is retryable.
- Database absence keeps the documented local/degraded assistant behavior, but must not falsely advertise cross-instance idempotency.
- The public projection may expose `requestId`, stable public error code, and bounded retry delay; it must not expose lease tokens, request hashes, provider data, database state, or raw diagnostics.
- Retention and session deletion remove expired/request-associated idempotency rows within the existing public-assistant retention boundary.
- All verification uses fake Agent/model paths and local API/database fixtures. No live model, search, embedding, reranker, vector store, or production endpoint may be called.

## Out Of Scope

- Answer revision trees, branch switching, and per-revision feedback are the next dependent task.
- New Redis, Durable Object, queue, or other cloud infrastructure is not required; PostgreSQL is the authoritative coordination store.
- Token-level SSE resume is not promised. Recovery guarantees the terminal result and exactly-once persistence.

## Acceptance Criteria

- [x] JSON and SSE accept a validated UUID `requestId`, and both return it in terminal public results/errors.
- [x] Two concurrent identical requests cause exactly one Agent run, one turn, and one aggregate increment.
- [x] Same ID with a different canonical payload returns `409 idempotency-key-reused` without running the Agent.
- [x] Completed replay returns the same response/turn identifiers without rerunning any expensive tool.
- [x] Active duplicate exposes a bounded retry delay; expired/retryable lease takeover is fenced against late completion.
- [x] Browser retry reuses its retained request ID, while a new user generation creates a different ID.
- [x] Cancellation/abort produces no completed turn and a stale executor cannot persist afterward.
- [x] Public persistence retention/session deletion covers request rows.
- [x] Prisma migration, server/browser contracts, local concurrency tests, lint, build, UI checks, Cloudflare smoke, performance budget, and diff validation pass.

## Notes

- The `requestId` body field is the canonical cross-proxy contract. A header alias can be added later only if an external client needs it.
