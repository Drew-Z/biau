# Design

## Public contract

- `requestId` is a required UUID in the JSON body shared by `/chat/public` and `/chat/public/stream`.
- The browser creates one ID per generation intent and retains it in `ActiveChatRequest` / retry issue metadata.
- A retried transport failure reuses the ID. Visitor cancellation is terminal for that attempt; retrying the prompt starts a fresh generation ID.
- Public responses include `requestId`. Stable conflicts are `idempotency-key-reused`, `public-assistant-request-processing`, and `public-assistant-request-cancelled` with bounded retry metadata where applicable.

## Persistence state machine

Add `PublicAssistantRequest`:

- Primary key: `requestId`.
- Identity: `sessionId`, canonical `requestHash`.
- State: `processing | completed | retryable_failed | failed | cancelled`.
- Lease: opaque `leaseToken`, `leaseExpiresAt`, `attempt`.
- Terminal data: `turnId`, allowlisted `responseJson`, stable `errorCode`.
- Lifecycle: `createdAt`, `updatedAt`, `expiresAt` plus indexes for lease recovery and retention.

Claim behavior:

1. Atomically create a processing row with a fresh lease.
2. On unique conflict, lock/read the row.
3. Different hash -> conflict.
4. Completed -> decode and replay the stored public response.
5. Active processing -> return processing + retry delay.
6. Expired processing or retryable failure -> compare-and-swap to a new lease token and increment attempt.
7. Failed/cancelled -> terminal response; the visitor must create a new generation intent.

## Completion and fencing

- Agent execution stays outside the database transaction.
- Completion begins a transaction, locks the request row, and verifies `processing + leaseToken`.
- The transaction performs the current aggregate upsert and turn creation, writes the exact public response snapshot and turn ID, then marks the request completed.
- A stale lease fails before aggregate/turn writes.
- Agent/transport failure updates the row only when the same lease still owns it. Retryable transport/internal failures release it as `retryable_failed`; explicit cancellation marks `cancelled`.

## Canonical hashing

- Hash only the normalized server request: session ID, question, mode, bounded history, and normalized page context.
- Use deterministic key ordering and SHA-256.
- Never store or log the canonical plaintext solely for idempotency.

## Database-optional behavior

- When the database is not configured, the route keeps its current usable behavior and marks the result as non-persistent through existing low-sensitive metadata only.
- In-process request fencing still prevents same-render duplicate calls in the browser; no claim of cross-instance replay is made without PostgreSQL.

## Migration and rollback

- The migration only adds the request table and indexes; existing sessions/turns/feedback remain unchanged.
- Old persisted history needs no backfill.
- Rollback can stop sending `requestId` only together with reverting the server contract; dropping the additive table is otherwise independent.

## Next dependency

True answer regeneration will create a new request ID for a new immutable revision and will reuse this state machine for duplicate transport attempts. This task deliberately does not fake revision semantics in the current flat turn model.
