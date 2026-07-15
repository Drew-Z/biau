# Backend Error Handling

## Response Shape

Expected operational failures return JSON with a stable `error` code:

```json
{ "error": "database-not-configured" }
```

Do not return stack traces, provider bodies, request headers, tokens, database details, raw prompts, or private document text.

## Status Conventions

- `400`: invalid payload or unsupported action.
- `401`: missing/invalid service or endpoint credential.
- `403`: authenticated credential but forbidden owner/scope.
- `404`: missing resource, cross-owner resource, or intentionally unmounted route.
- `409`: duplicate slug/state conflict.
- `429`: bounded quota/rate limit where applicable.
- `502`: configured upstream unreachable/invalid response.
- `503`: required server configuration/database unavailable.
- `504`: configured upstream timed out.

## Operator Errors

- Missing/mismatched `OPERATOR_SERVICE_TOKEN` -> `401 operator-service-auth-required`.
- Missing sanitized owner identity -> `403 operator-identity-required`.
- Owner email not allowed -> `403 operator-identity-not-allowed`.
- Missing Operator database -> `503 database-not-configured`.
- Missing/cross-owner session or memory -> `404 session-not-found` / `memory-not-found`.
- Old private routes -> `404`; do not redirect or silently emulate them.

The Cloudflare facade maps its own boundary failures to:

- `401 operator-access-required` / `operator-access-invalid`.
- `403 operator-owner-not-allowed`.
- `503 operator-facade-not-configured`.
- `502 operator-upstream-unreachable`.
- `504 operator-upstream-timeout`.

## Public Assistant

Public chat should degrade to public knowledge when optional model/RAG providers fail. It must distinguish provider failure from insufficient public context and must not fabricate details.

## Studio

- Missing Studio auth -> `401 missing-studio-token`.
- Studio auth absent in server config -> `503 studio-auth-not-configured`.
- Missing Studio database -> `503 database-not-configured`.
- Invalid review/export state -> stable `400`/`409` code.

## Route Pattern

Route handlers use `try/catch` and pass unexpected errors to the final middleware. Known validation/configuration conditions return directly with stable codes. The final middleware logs only a low-sensitive error category.

## Required Tests

```powershell
npm.cmd run operator:facade-smoke
npm.cmd run server:smoke
npm.cmd run assistant:service-modes-smoke
npm.cmd run server:build
```
