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
│   ├── auth.ts        # Operator service/identity auth and database requirement guard
│   ├── crypto.ts      # token/hash helpers
│   ├── knowledge.ts   # public knowledge loading and in-memory search
│   ├── model.ts       # model-provider integration and fallback answer behavior
│   ├── ragAdapters.ts # deterministic local embedding/vector/reranker adapters
│   ├── ragClient.ts   # server-side optional RAG Orchestrator adapter with local fallback
│   ├── ragEmbeddings.ts # shared OpenAI-compatible / deterministic embedding helpers
│   ├── ragOrchestrator.ts # local/mock RAG retrieval contract and diagnostics
│   ├── ragPostgresStore.ts # optional Supabase/pgvector RAG store compatibility
│   ├── ragQdrantStore.ts # Qdrant Cloud RAG store for final vector retrieval path
│   ├── ragRoutes.ts   # RAG Orchestrator HTTP router mounted under /rag
│   └── types.ts       # API/data payload types
├── scripts/
│   ├── smoke.ts       # local smoke test for health/public/internal auth behavior
│   ├── rag-smoke.ts   # local/mock RAG Orchestrator HTTP contract smoke
│   └── rag-sync-local.ts # public knowledge V2 sync plan / validation
├── sql/
│   └── rag-store-pgvector.sql # Supabase/Render Postgres + pgvector compatibility schema template
└── data/
    └── public-knowledge.json

prisma/
├── schema.prisma
└── migrations/
```

## Module Boundaries

Keep route registration, middleware, and response shaping in `server/src/app.ts`. Move reusable concerns into narrow modules: environment in `env.ts`, database access setup in `db.ts`, auth/token lookup in `auth.ts`, model calls in `model.ts`, and knowledge search in `knowledge.ts`.

RAG Orchestrator code should stay split between `ragAdapters.ts` for deterministic local vector helpers, `ragEmbeddings.ts` for shared embedding-provider integration, `ragClient.ts` for the main-site adapter / external HTTP fallback logic, `ragOrchestrator.ts` for provider selection and retrieval contract shaping, store-specific modules such as `ragQdrantStore.ts` / `ragPostgresStore.ts`, and `ragRoutes.ts` for HTTP validation. The current in-repo mock router is mounted under `/rag` so it does not replace the assistant API's root `/health`; standalone Orchestrator mode mounts the same router at its root.

Provider-neutral storage templates live under `server/sql/`, and local sync validation scripts live under `server/scripts/`. These files must remain public-safe: schema placeholders and table names are fine, but real connection strings, service role keys, cloud hostnames, private endpoints, or embedding/reranker credentials do not belong there.

`server/src/index.ts` should stay thin: create the app, listen on `env.port`, and handle graceful shutdown by closing the server and disconnecting Prisma.

## Generated Public Knowledge Contract

`scripts/generate-assistant-knowledge.ts` writes the public assistant index to `server/data/public-knowledge.json`. `server/src/knowledge.ts` must read that same file at runtime:

```typescript
const knowledgePath = path.resolve(__dirname, '../data/public-knowledge.json')
```

This relative path is intentional. It works when running source with `tsx` from `server/src` and after `server:build` emits files under `server/dist`. Do not resolve `../../data/public-knowledge.json`; that points at repository-root `data/` and silently falls back to the minimal `site:intro` knowledge item.

## Feature Availability

Backend features must tolerate missing optional services. `env.ts` exposes `hasDatabase()` and `hasModelProvider()`. Routes that require persistence call `requireDatabase()` from `auth.ts`; public chat can run with the local knowledge fallback and model fallback.

## Naming and Imports

Server TypeScript uses ESM imports with `.js` extensions for local modules, for example `import { createApp } from './app.js'`. Preserve this pattern because the server build emits ESM.

## Avoid

- Do not put secrets or connection strings in source files; read them from environment variables.
- Do not make `index.ts` own business logic.
- Do not require a database for `/health` or `/chat/public`; current smoke tests expect these to work without auth/database setup.
