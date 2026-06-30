# Backend Directory Structure

This project includes a small Express assistant API alongside the Vite frontend. Backend code is TypeScript ESM and lives under `server/`; database schema and migrations live under `prisma/`.

## Layout

```text
server/
├── src/
│   ├── index.ts       # process entry point, listen/shutdown
│   ├── app.ts         # Express app, middleware, routes, error middleware
│   ├── env.ts         # environment parsing and feature availability helpers
│   ├── db.ts          # Prisma client singleton and disconnect helper
│   ├── auth.ts        # invite/member token helpers and database requirement guard
│   ├── crypto.ts      # token/hash helpers
│   ├── knowledge.ts   # public knowledge loading and in-memory search
│   ├── model.ts       # model-provider integration and fallback answer behavior
│   └── types.ts       # API/data payload types
├── scripts/
│   └── smoke.ts       # local smoke test for health/public/internal auth behavior
└── data/
    └── public-knowledge.json

prisma/
├── schema.prisma
└── migrations/
```

## Module Boundaries

Keep route registration, middleware, and response shaping in `server/src/app.ts`. Move reusable concerns into narrow modules: environment in `env.ts`, database access setup in `db.ts`, auth/token lookup in `auth.ts`, model calls in `model.ts`, and knowledge search in `knowledge.ts`.

`server/src/index.ts` should stay thin: create the app, listen on `env.port`, and handle graceful shutdown by closing the server and disconnecting Prisma.

## Feature Availability

Backend features must tolerate missing optional services. `env.ts` exposes `hasDatabase()` and `hasModelProvider()`. Routes that require persistence call `requireDatabase()` from `auth.ts`; public chat can run with the local knowledge fallback and model fallback.

## Naming and Imports

Server TypeScript uses ESM imports with `.js` extensions for local modules, for example `import { createApp } from './app.js'`. Preserve this pattern because the server build emits ESM.

## Avoid

- Do not put secrets or connection strings in source files; read them from environment variables.
- Do not make `index.ts` own business logic.
- Do not require a database for `/health` or `/chat/public`; current smoke tests expect these to work without auth/database setup.
