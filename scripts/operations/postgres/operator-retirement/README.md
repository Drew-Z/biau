# Operator PostgreSQL retirement

These scripts remove only the retired Operator, member, private-chat, memory,
usage, and internal-knowledge tables. They intentionally live outside
`prisma/migrations/` so Render startup cannot execute them automatically.

Do not run them against `STUDIO_DATABASE_URL`. Use the database that previously
backed the Operator and now contains the accepted public-assistant persistence
tables.

Required order:

1. Stop the retired Operator writer and create a restorable database backup.
2. Record the target database name and database user from the provider console.
3. Run `preflight.sql` and review all row counts and active connections.
4. Run `apply.sql` only after explicit approval.
5. Run `verify.sql`, public assistant persistence checks, and Studio checks.
6. Keep the backup and previous Render revision through the observation window.

Example commands use an environment variable so the connection string is not
written to shell history or repository files:

```bash
psql "$OPERATOR_DATABASE_URL" \
  --set expected_database='<database-name>' \
  --set expected_user='<database-user>' \
  --file scripts/operations/postgres/operator-retirement/preflight.sql

psql "$OPERATOR_DATABASE_URL" \
  --set expected_database='<database-name>' \
  --set expected_user='<database-user>' \
  --set confirm_operator_retirement='DROP_OPERATOR_ONLY_DATA' \
  --file scripts/operations/postgres/operator-retirement/apply.sql

psql "$OPERATOR_DATABASE_URL" \
  --set expected_database='<database-name>' \
  --set expected_user='<database-user>' \
  --file scripts/operations/postgres/operator-retirement/verify.sql
```

The scripts fail closed when a target object is missing, a public-assistant
protection table is missing, a foreign key crosses the allowlist boundary, or a
retired enum is still used outside the target set. They never use `CASCADE`.

After SQL verification, delete the external internal-RAG collection and Render
Operator service only through their separate manual gates.

For the 2026-07-26 production retirement, both deletion gates completed after
the public-only services and Qdrant public alias passed observation.
