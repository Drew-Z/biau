# Backend Error Handling

## Response Shape

API errors are returned as JSON objects with an `error` string. Existing examples include `missing-code`, `invalid-invite`, `missing-message`, `missing-or-invalid-token`, `missing-admin-token`, `database-not-configured`, and `assistant-api-error`.

Keep this compact error-code style for new routes unless a route already has a richer typed response contract.

## Route Pattern

Async route handlers in `server/src/app.ts` use `try/catch` and `next(error)` for unexpected failures. Expected validation failures return early with a status code and JSON error payload.

Examples:

- Missing invite code: `400 { error: 'missing-code' }`.
- Invalid or exhausted invite: `401 { error: 'invalid-invite' }`.
- Missing internal chat token: `401 { error: 'missing-or-invalid-token' }`.

## Database Not Configured

Routes that require persistence call `requireDatabase()`. When `DATABASE_URL` is absent, it throws an `Error` named `DatabaseNotConfigured` with message `database-not-configured`. The final error middleware converts this to `503 { error: 'database-not-configured' }`.

Use this mechanism instead of hand-checking `DATABASE_URL` in every protected route.

## Final Error Middleware

The final middleware in `server/src/app.ts` handles known database configuration errors, logs unknown errors with `console.error(error)`, and returns `500 { error: 'assistant-api-error' }`.

Do not leak raw exception messages, stack traces, provider responses, tokens, or database details to API clients.

## Validation

The current code uses lightweight inline validation and normalization, not a schema validation library. Trim string inputs, check required fields, cap user-facing names/titles, and return explicit 400/401/503 statuses.

## Avoid

- Do not throw for ordinary user validation failures when an early response is clearer.
- Do not expose `error.message` for unknown errors.
- Do not swallow unexpected errors silently; pass them to `next(error)`.
