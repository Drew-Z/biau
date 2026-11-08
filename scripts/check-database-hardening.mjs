import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'

const databaseUrl = process.env.PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL?.trim()
assert.ok(databaseUrl, 'PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL is required')
const url = new URL(databaseUrl)
assert.ok(['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname), 'Hardening checks require loopback PostgreSQL')
const database = `hardening_contract_${process.pid}_${Date.now()}`
const localUrl = new URL(url)
localUrl.pathname = `/${database}`
const quote = (value) => `"${value.replaceAll('"', '""')}"`
const legacyTables = ['AgentMemory', 'ChatMessage', 'ChatSession', 'InternalKnowledgeDocument', 'InternalKnowledgeSyncRun', 'Invite', 'Member', 'OperatorMemory', 'OperatorMessage', 'OperatorSession', 'OperatorUsageLog', 'UsageLog']
const ragTables = ['rag_documents', 'rag_chunks', 'rag_entities', 'rag_relations', 'rag_sync_runs', 'rag_eval_runs']
const opsRoot = path.resolve('scripts/operations/postgres/data-api-hardening')
const migration = await readFile('prisma/migrations/20261108020000_server_only_database_boundary/migration.sql', 'utf8')
const preflight = await readFile(path.join(opsRoot, 'preflight.sql'), 'utf8')
const admin = new pg.Client({ connectionString: url.href })
const client = new pg.Client({ connectionString: localUrl.href })
const createdRoles = []
let databaseCreated = false

async function runOps(file, { failure, fingerprint = database } = {}) {
  const sql = (await readFile(path.join(opsRoot, file), 'utf8')).replaceAll('\\ir preflight.sql', () => preflight)
  const args = ['--no-psqlrc', '--set', `expected_database=${fingerprint}`, '--set', `expected_user=${decodeURIComponent(url.username)}`, '--set', 'confirm_data_api_hardening=HARDEN_SERVER_ONLY_DATA_API', '--file', '-']
  const container = process.env.PUBLIC_ASSISTANT_DATABASE_TEST_PSQL_DOCKER_CONTAINER
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: database }
  const result = container
    ? spawnSync('docker', ['exec', '-i', container, 'psql', '-U', env.PGUSER, '-d', database, ...args], { input: sql, encoding: 'utf8' })
    : spawnSync('psql', args, { env, input: sql, encoding: 'utf8' })
  assert.equal(result.error, undefined, 'psql must be available (or select the dedicated local test container)')
  if (failure) {
    assert.notEqual(result.status, 0, `${file} must reject ${failure}`)
    assert.match(`${result.stdout}\n${result.stderr}`, failure)
  } else {
    assert.equal(result.status, 0, `${file} failed: ${result.stderr}`)
  }
}

async function rejectsAll(failure) {
  for (const file of ['preflight.sql', 'apply.sql', 'verify.sql']) await runOps(file, { failure })
}

async function expectBoundary(tables) {
  const state = await client.query(`
    SELECT count(*)::int AS tables, count(*) FILTER (WHERE relrowsecurity AND NOT relforcerowsecurity)::int AS protected
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')
  `)
  assert.deepEqual(state.rows[0], { tables, protected: tables })
  await runOps('verify.sql')
  // Verify effective defaults, including PostgreSQL's implicit PUBLIC EXECUTE.
  await client.query('BEGIN')
  try {
    await client.query(`CREATE TABLE public.hardening_future_table (id int); CREATE SEQUENCE public.hardening_future_sequence; CREATE FUNCTION public.hardening_future_function() RETURNS int LANGUAGE sql AS 'SELECT 1'`)
    for (const role of ['anon', 'authenticated']) {
      const grants = await client.query(`SELECT
        has_table_privilege($1,'public.hardening_future_table','SELECT,INSERT,UPDATE,DELETE') AS table_access,
        has_sequence_privilege($1,'public.hardening_future_sequence','USAGE,SELECT,UPDATE') AS sequence_access,
        has_function_privilege($1,'public.hardening_future_function()','EXECUTE') AS function_access,
        has_schema_privilege($1,'public','USAGE,CREATE') AS schema_access`, [role])
      assert.deepEqual(grants.rows[0], { table_access: false, sequence_access: false, function_access: false, schema_access: false })
    }
    await client.query(`INSERT INTO public.hardening_future_table VALUES (1)`)
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM public.hardening_future_table`)).rows[0].n, 1)
  } finally { await client.query('ROLLBACK') }
}

await admin.connect()
try {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    if ((await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role])).rowCount === 0) {
      await admin.query(`CREATE ROLE ${quote(role)} NOLOGIN`)
      createdRoles.push(role)
    }
  }
  await admin.query(`CREATE DATABASE ${quote(database)}`)
  databaseCreated = true
  const deployed = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: localUrl.href }, encoding: 'utf8', timeout: 120000,
  })
  assert.equal(deployed.status, 0, `Fresh Prisma deploy failed: ${deployed.stderr}`)
  await client.connect()
  await expectBoundary(40)

  await client.query(`CREATE TABLE public.hardening_unreviewed (id int)`)
  await rejectsAll(/allowlist mismatch/)
  await assert.rejects(() => client.query(migration), /allowlist mismatch/)
  await client.query('ROLLBACK')
  await client.query(`DROP TABLE public.hardening_unreviewed`)

  await client.query(`ALTER TABLE public."PublicAssistantBranch" RENAME TO "MissingBranch"`)
  await rejectsAll(/allowlist mismatch/)
  await client.query(`ALTER TABLE public."MissingBranch" RENAME TO "PublicAssistantBranch"`)
  await client.query(`ALTER TABLE public."SourceItem" OWNER TO anon`)
  await rejectsAll(/does not own reviewed tables/)
  await client.query(`ALTER TABLE public."SourceItem" OWNER TO ${quote(decodeURIComponent(url.username))}`)
  await client.query(`ALTER TABLE public."PublicAssistantSession" DISABLE TRIGGER "PublicAssistantSession_graph_ownership"`)
  await rejectsAll(/protection triggers are missing, disabled, or misbound/)
  await client.query(`ALTER TABLE public."PublicAssistantSession" ENABLE TRIGGER "PublicAssistantSession_graph_ownership"`)
  await client.query(`CREATE SCHEMA shadow; CREATE FUNCTION shadow.public_assistant_validate_graph_ownership() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END'; DROP TRIGGER "PublicAssistantSession_graph_ownership" ON public."PublicAssistantSession"; CREATE TRIGGER "PublicAssistantSession_graph_ownership" BEFORE INSERT OR UPDATE OF "activeBranchId" ON public."PublicAssistantSession" FOR EACH ROW EXECUTE FUNCTION shadow.public_assistant_validate_graph_ownership()`)
  await rejectsAll(/protection triggers are missing, disabled, or misbound/)
  await client.query(`DROP TRIGGER "PublicAssistantSession_graph_ownership" ON public."PublicAssistantSession"; CREATE TRIGGER "PublicAssistantSession_graph_ownership" BEFORE INSERT OR UPDATE OF "activeBranchId" ON public."PublicAssistantSession" FOR EACH ROW EXECUTE FUNCTION public.public_assistant_validate_graph_ownership(); DROP FUNCTION shadow.public_assistant_validate_graph_ownership(); DROP SCHEMA shadow`)
  await runOps('apply.sql', { failure: /Database fingerprint mismatch/, fingerprint: 'wrong_database' })

  await client.query(`ALTER TABLE public."SourceItem" DISABLE ROW LEVEL SECURITY; GRANT ALL ON SCHEMA public TO anon, authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated; ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO PUBLIC; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon`)
  await runOps('verify.sql', { failure: /without RLS/ })
  await runOps('apply.sql')
  await expectBoundary(40)

  await client.query(`DROP TABLE ${legacyTables.map((name) => `public.${quote(name)}`).join(', ')}`)
  await client.query(migration)
  await expectBoundary(28)
  await client.query(`CREATE TABLE public.rag_documents (id int)`)
  await rejectsAll(/allowlist mismatch/)
  for (const table of ragTables.slice(1)) await client.query(`CREATE TABLE public.${quote(table)} (id int)`)
  await client.query(migration)
  await expectBoundary(34)
  console.log('Server-only database contracts passed: fresh deploy, 40/28/34-table layouts, defaults, grants, allowlist, owner, trigger and fingerprint rejection.')
} finally {
  await client.end().catch(() => undefined)
  if (databaseCreated) await admin.query(`DROP DATABASE ${quote(database)}`)
  for (const role of createdRoles) await admin.query(`DROP ROLE ${quote(role)}`)
  await admin.end()
}
