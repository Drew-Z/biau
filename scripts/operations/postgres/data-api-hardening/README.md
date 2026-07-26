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

The scripts use an exact 25-table allowlist and fail when the `public` schema
contains a missing or unexpected application table. They do not modify data or
create permissive RLS policies.

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
