# Backend Database Guidelines

## ORM and Driver

The backend uses Prisma 7 with PostgreSQL and `@prisma/adapter-pg`. The Prisma client is created lazily in `server/src/db.ts` only when `DATABASE_URL` is configured.

```ts
prisma ??= new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.databaseUrl }),
})
```

Use `getPrisma()` when a route can gracefully degrade without a database. Use `requireDatabase()` when the route cannot proceed without persistence and should return the standardized database-not-configured response.

## Schema Ownership

Database models live in `prisma/schema.prisma`. Current persisted concepts are invites, members, chat sessions, chat messages, usage logs, and the `MemberRole` / `MessageRole` enums.

Migrations live under `prisma/migrations/`. Validate schema changes with:

```powershell
npm.cmd run prisma:validate
```

Deployment migrations use:

```powershell
npm.cmd run prisma:migrate
```

## Query Patterns

Keep route queries explicit and scoped to the authenticated subject. `server/src/app.ts` uses `findFirst({ where: { id: sessionId, memberId: member.id } })` for internal chat session reuse so one member cannot attach to another member's session.

Use `Promise.all` for independent admin summary counts, as in `/admin/summary`.

When storing generated citations, convert to Prisma JSON input intentionally: `citations as unknown as Prisma.InputJsonValue`. Avoid spreading arbitrary request bodies into Prisma writes.

## Secrets and Tokens

Never store invite codes or member tokens in plaintext. `server/src/auth.ts` and `server/src/crypto.ts` issue opaque tokens and store `sha256` hashes (`Invite.codeHash`, `Member.tokenHash`).

## Naming

Prisma models use PascalCase singular names (`Invite`, `Member`, `ChatSession`). Fields use lower camel case (`dailyQuota`, `usedCount`, `createdAt`). Enum values are uppercase (`MEMBER`, `ADMIN`, `USER`, `ASSISTANT`, `SYSTEM`).

## Avoid

- Do not instantiate Prisma clients inside request handlers.
- Do not make database availability mandatory for public routes.
- Do not commit real `DATABASE_URL` values; use `.env.example` for structure.
- Do not store raw invite codes, bearer tokens, API keys, or private chat secrets.
