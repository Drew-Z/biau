# Supabase Data API hardening

These scripts convert the application-owned `public` schema into a server-only
database boundary. They enable RLS on the reviewed table allowlist and remove
Data API access for `anon` and `authenticated`. Direct Prisma connections using
the database owner continue to work. The reviewed audit trigger functions also
receive a fixed `search_path`.

Do not run this flow when a browser, mobile app, Edge Function, or external
integration reads these tables through Supabase REST, GraphQL, or Realtime.
Confirm the application access path and review recent API logs first.

Required order:

1. Create and restore-test a database backup.
2. Confirm the reviewed application has no Data API consumer.
3. Run `preflight.sql` and review the table/grant/default-ACL summary.
4. Run `apply.sql` only after explicit approval.
5. Run `verify.sql`, then check Public, Studio, and RAG health endpoints.

The scripts require the exact 28-table application allowlist. A deployment may
also contain the complete six-table public RAG store (`rag_documents`,
`rag_chunks`, `rag_entities`, `rag_relations`, `rag_sync_runs`, `rag_eval_runs`).
Studio may additionally retain the complete 12-table legacy group declared in
`preflight.sql`; hardening retains that history. Any partial optional group,
missing application table, unexpected table, wrong owner,
or missing/disabled/misbound assistant trigger fails preflight, apply, and verify.
They do not modify data or create permissive RLS policies.

The forward Prisma migration `20261108010000_public_assistant_database_hardening`
also covers the three later assistant tables and two trigger functions. It is the
normal deployment path for that incremental repair; do not rerun the broad
access-policy conversion just to apply this migration. It keeps owner access,
revokes Data API grants, and pins the functions to `pg_catalog, public, pg_temp`
(the installation schema replaces `public` in isolated tests). Explicit
`pg_temp` last prevents temporary tables from shadowing ownership lookups.

Run `npm.cmd run assistant:public-migration-check` against a disposable loopback
PostgreSQL database using `PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL`. The
database user needs schema/role creation privileges. Tests create and clean up
two isolated schemas and one NOLOGIN reader role. Pre-existing `anon` and
`authenticated` roles are exercised when available; CI provisions both. The
test covers legacy data, permission revocation, RLS after accidental grants,
temporary-table shadowing, immutable revisions, graph ownership, and deletion.

The subsequent `20261108020000_server_only_database_boundary` migration installs
the complete boundary for both Public and Studio, including all four trigger
functions. It removes schema CREATE/USAGE and table/sequence/function access
from public API roles and clears the migration owner's global and schema
default grants. Schema-level defaults alone cannot remove PostgreSQL's implicit
global PUBLIC function EXECUTE grant. `verify.sql` checks both levels.

Run `node scripts/check-database-hardening.mjs` with the same loopback URL to
exercise the full migration chain in a disposable database and validate
40/28/34-table layouts, future object grants, unknown/missing tables, wrong
owners, disabled/misbound triggers, and database fingerprint rejection. It
requires `psql` or a dedicated local test container selected by
`PUBLIC_ASSISTANT_DATABASE_TEST_PSQL_DOCKER_CONTAINER`; it removes only its own
database and any test roles it created. The scripts use SQL exceptions with
`ON_ERROR_STOP` for failed guards: PostgreSQL 17 `\\quit 4` does not reliably
produce a nonzero exit status.

```bash
psql "$OPERATOR_DATABASE_URL" \
  --set expected_database='<database-name>' \
  --set expected_user='<database-user>' \
  --file scripts/operations/postgres/data-api-hardening/preflight.sql

psql "$OPERATOR_DATABASE_URL" \
  --set expected_database='<database-name>' \
  --set expected_user='<database-user>' \
  --set confirm_data_api_hardening='HARDEN_SERVER_ONLY_DATA_API' \
  --file scripts/operations/postgres/data-api-hardening/apply.sql

psql "$OPERATOR_DATABASE_URL" \
  --set expected_database='<database-name>' \
  --set expected_user='<database-user>' \
  --file scripts/operations/postgres/data-api-hardening/verify.sql
```

Supabase-managed default privileges owned by `supabase_admin` cannot be changed
by the project `postgres` role. Application migrations run as `postgres`; if a
future tool creates a public table as another owner, review its RLS and grants
before treating it as part of this boundary.
