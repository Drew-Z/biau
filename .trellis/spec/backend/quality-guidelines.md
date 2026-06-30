# Backend Quality Guidelines

## Required Verification

Backend and full-project changes should pass the relevant commands from `package.json`:

```powershell
npm.cmd run prisma:validate
npm.cmd run server:build
npm.cmd run server:smoke
npm.cmd run lint
npm.cmd run build
```

For broad confidence before handoff, run:

```powershell
npm.cmd run verify
```

`verify` runs assistant knowledge generation, Prisma validation, lint, server build, smoke test, frontend build, blog check, preview startup, and UI checks.

## Smoke Test Contract

`server/scripts/smoke.ts` is the minimum backend behavior gate. It starts the Express app on an available localhost port and verifies:

- `/health` returns OK.
- `/chat/public` accepts a simple message and returns an answer plus citations array.
- `/chat/internal` rejects unauthenticated requests with `401`.

Do not break these behaviors when changing app middleware, auth, model fallback, or database guards.

## Environment Safety

Use `server/src/env.ts` as the single place for reading environment variables. Keep defaults non-sensitive and local-development friendly. The current public model fallback allows the assistant API to run without `OPENAI_API_KEY`.

Do not read `.env`, `.env.local`, `.env.*.local`, private key files, or SSH files into task context. Use `.env.example` when documenting expected shape.

## API Review Checklist

- Inputs are trimmed, required fields are checked, and strings stored as names/titles are length-capped.
- Protected routes verify bearer/admin tokens before database writes or reads.
- Database-required routes use `requireDatabase()` and get a 503 when no database is configured.
- Public routes still work without a database or model provider.
- Error responses use stable error codes and do not leak internals.
- Tokens and invite codes are hashed before persistence.

## Avoid

- Do not instantiate Prisma per request.
- Do not spread raw `req.body` into Prisma writes.
- Do not make lint pass by adding broad disables.
- Do not use destructive git commands or push without an explicit user request.
