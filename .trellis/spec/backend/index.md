# Backend Development Guidelines

These guidelines describe the assistant API and database layer that sit beside the Vite frontend. Read them before changing `server/`, `prisma/`, backend scripts, environment contracts, or API-facing data flow.

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Express server layout, module boundaries, ESM import pattern | Filled |
| [Database Guidelines](./database-guidelines.md) | Prisma 7 adapter-pg usage, migrations, query and token persistence patterns | Filled |
| [Error Handling](./error-handling.md) | JSON error-code responses, route try/catch, database-not-configured handling | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Backend validation commands, smoke test contract, API review checklist | Filled |
| [Logging Guidelines](./logging-guidelines.md) | Current console logging conventions and redaction rules | Filled |

## Pre-Development Checklist

Before backend edits:

- Read [Directory Structure](./directory-structure.md) for file ownership and server module boundaries.
- Read [Database Guidelines](./database-guidelines.md) before touching Prisma, persistence, invites, members, sessions, messages, or usage logs.
- Read [Error Handling](./error-handling.md) before adding or changing routes.
- Read [Logging Guidelines](./logging-guidelines.md) before adding logs.
- Read [Quality Guidelines](./quality-guidelines.md) before declaring backend work complete.

## Local Rules Imported

These specs incorporate rules from `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/data-safety.mdc`, and `.cursor/rules/verify.mdc`, plus the current `server/`, `prisma/`, and `scripts/verify.mjs` implementation.

## Core Project Rules

- Never commit real IPs, accounts, secrets, database URLs, cloud API URLs, signing paths, certificates, or private business metrics.
- Use `.env.example` for environment shape; do not read or quote private `.env*` or key files.
- Keep public assistant behavior usable without a configured database or model provider unless a task explicitly changes that contract.
- Run the relevant Prisma/server/lint/build checks after backend changes.
