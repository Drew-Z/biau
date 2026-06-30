# Backend Logging Guidelines

## Current Logging Stack

The backend currently uses Node console logging, not a structured logging library. Keep logging sparse and operational until the project adopts a dedicated logger.

Existing examples:

- `server/src/index.ts` logs the listening port on startup.
- `server/src/app.ts` logs unexpected server errors in the final error middleware.
- `server/scripts/smoke.ts` logs `Assistant API smoke passed` after checks succeed.

## What to Log

Log operational lifecycle events and unexpected failures:

- Server startup and selected port.
- Smoke/verification success messages.
- Unexpected exceptions caught by the final error middleware.

If adding background jobs or deployment scripts, log start/end/failure at a level suitable for local debugging and deployment logs.

## What Not to Log

This is a public-site project with explicit data-safety rules. Never log:

- API keys, bearer tokens, invite codes, token hashes, signing paths, or certificates.
- Real database URLs, internal hosts, SSH hosts, private IPs, or connection strings.
- Full request bodies for chat, admin, invite, auth, or future upload endpoints.
- Raw customer/company names or exact sensitive business metrics.

## Error Logging

Use `console.error(error)` only at centralized boundaries, as in the final Express error middleware. Avoid duplicating the same exception in both route handlers and middleware.

## Avoid

- Do not introduce a new logging library unless the backend grows enough to need structured fields, transports, or redaction.
- Do not add noisy per-request logs for public chat or health checks.
- Do not log sanitized-looking fallback values if they were derived from real secrets; omit the value entirely.