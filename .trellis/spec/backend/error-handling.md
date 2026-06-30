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

## Scenario: Assistant MVP Protected Route Errors

### 1. Scope / Trigger

- Trigger: assistant invite redemption, internal chat, and hidden admin routes share one frontend/backend contract and must keep working when secrets or `DATABASE_URL` are absent.

### 2. Signatures

- `POST /auth/redeem-invite`
- `POST /chat/internal`
- `GET /admin/summary`
- `POST /admin/invites`

### 3. Contracts

- Invite redemption accepts `{ code: string, name?: string }` and returns `{ token, member }`.
- Internal chat accepts `Authorization: Bearer <member-token>` and `{ message: string, sessionId?: string }`; it returns `{ answer, citations, sessionId, messageId }`.
- Admin routes accept `Authorization: Bearer <ADMIN_TOKEN>`.
- `DATABASE_URL` is required only after the route has enough auth/input to proceed to persistence.

### 4. Validation & Error Matrix

- Missing invite code -> `400 { error: 'missing-code' }`.
- Invalid, exhausted, or expired invite -> `401 { error: 'invalid-invite' }`.
- Missing internal bearer token -> `401 { error: 'missing-or-invalid-token' }`.
- Present internal bearer token but no database -> `503 { error: 'database-not-configured' }`.
- Missing or mismatched admin token -> `401 { error: 'missing-admin-token' }`.
- Valid admin token but no database -> `503 { error: 'database-not-configured' }`.
- Unexpected failure -> `500 { error: 'assistant-api-error' }`.

### 5. Good/Base/Bad Cases

- Good: `/chat/public` and `/health` work without database or model-provider secrets.
- Base: `/chat/internal` with no `Authorization` returns 401 even in no-database local smoke mode.
- Bad: `/chat/internal` with a bearer token and no database returns 401, hiding the real deployment gap from the frontend.

### 6. Tests Required

- `server:smoke` must assert `/health`, `/chat/public`, unauthenticated `/chat/internal` 401, and bearer-token `/chat/internal` 503 when `DATABASE_URL` is absent.
- `server:build` must pass after changing route contracts or auth helpers.

### 7. Wrong vs Correct

#### Wrong

```ts
const prisma = getPrisma()
if (!prisma) return null
```

This makes a configured bearer-token request look like an auth failure when the real problem is missing persistence.

#### Correct

```ts
const prisma = requireDatabase()
return prisma.member.findUnique({ where: { tokenHash } })
```

Check for a missing/empty bearer token first. Once a token is present, use `requireDatabase()` so the route returns the standardized 503.

## Avoid

- Do not throw for ordinary user validation failures when an early response is clearer.
- Do not expose `error.message` for unknown errors.
- Do not swallow unexpected errors silently; pass them to `next(error)`.
