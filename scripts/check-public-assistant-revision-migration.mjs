import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'

const databaseUrl = process.env.PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL?.trim()
if (!databaseUrl) {
  throw new Error('PUBLIC_ASSISTANT_REVISION_TEST_DATABASE_URL is required')
}

const parsedUrl = new URL(databaseUrl)
if (!['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
  throw new Error('Revision migration checks only accept a loopback PostgreSQL host')
}

const { Client } = pg
const client = new Client({ connectionString: databaseUrl })
const suffix = `${process.pid}_${Date.now()}`
const emptySchema = `pa_revision_empty_${suffix}`
const legacySchema = `pa_revision_legacy_${suffix}`
const migrationsRoot = path.resolve('prisma/migrations')
const publicAssistantMigrations = [
  '20260726010000_public_assistant_product',
  '20260727010000_public_assistant_session_history',
  '20260728010000_public_assistant_idempotent_requests',
  '20260728020000_public_assistant_answer_revisions',
]

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`
}

async function setSchema(schema) {
  await client.query(`SET search_path TO ${quoteIdentifier(schema)}`)
}

async function applyMigration(name) {
  const sql = await readFile(path.join(migrationsRoot, name, 'migration.sql'), 'utf8')
  await client.query(sql)
}

async function expectCheckViolation(run, message) {
  await assert.rejects(run, (error) => error?.code === '23514' && String(error.message).includes(message))
}

async function checkEmptySchema() {
  await client.query(`CREATE SCHEMA ${quoteIdentifier(emptySchema)}`)
  await setSchema(emptySchema)
  for (const migration of publicAssistantMigrations) await applyMigration(migration)

  const tables = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = $1
      AND tablename IN ('PublicAssistantAnswerRevision', 'PublicAssistantBranch')
    ORDER BY tablename
  `, [emptySchema])
  assert.deepEqual(tables.rows.map((row) => row.tablename), [
    'PublicAssistantAnswerRevision',
    'PublicAssistantBranch',
  ])

  const triggers = await client.query(`
    SELECT DISTINCT trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = $1
      AND trigger_name LIKE 'PublicAssistant%'
  `, [emptySchema])
  assert.equal(triggers.rowCount, 7, 'empty migration must install all revision and graph triggers')
}

async function checkLegacyUpgrade() {
  await client.query(`CREATE SCHEMA ${quoteIdentifier(legacySchema)}`)
  await setSchema(legacySchema)
  for (const migration of publicAssistantMigrations.slice(0, -1)) await applyMigration(migration)

  await client.query(`
    INSERT INTO "PublicAssistantSession" ("id", "createdAt", "lastActiveAt", "expiresAt")
    VALUES
      ('session-a', '2026-07-28 01:00:00', '2026-07-28 01:02:00', '2026-08-28'),
      ('session-b', '2026-07-28 02:00:00', '2026-07-28 02:01:00', '2026-08-28');

    INSERT INTO "PublicAssistantDailyAggregate" (
      "id", "date", "topicFingerprint", "topicTerms", "route", "status",
      "totalCount", "positiveCount", "negativeCount", "siteEvidenceTotal",
      "webEvidenceTotal", "latencyTotalMs", "createdAt", "updatedAt"
    ) VALUES (
      'aggregate-1', '2026-07-28', 'topic', 'topic', 'site', 'answered',
      3, 0, 0, 0, 0, 0, '2026-07-28', '2026-07-28'
    );

    INSERT INTO "PublicAssistantTurn" (
      "id", "sessionId", "aggregateId", "question", "answer", "mode", "route", "status",
      "citationIdsJson", "metricsJson", "questionFingerprint", "topicFingerprint",
      "topicTerms", "createdAt", "expiresAt", "displaySnapshotJson"
    ) VALUES
      (
        'turn-a1', 'session-a', 'aggregate-1', 'q1', 'answer-a1', 'auto', 'site', 'answered',
        '["citation-a1"]', '{"latencyMs":321,"siteEvidenceCount":2}', 'q1fp', 'topic', 'topic', '2026-07-28 01:00:00', '2026-08-28',
        '{"version":1,"claims":[],"citations":[],"suggestions":["next-a1"],"meta":{"mode":"model","citationCount":0}}'
      ),
      (
        'turn-a2', 'session-a', 'aggregate-1', 'q2', 'answer-a2', 'site', 'site', 'answered',
        '[]', NULL, 'q2fp', 'topic', 'topic', '2026-07-28 01:01:00', '2026-08-28',
        '{"version":1,"claims":[],"citations":[],"suggestions":["next-a2"],"meta":{"mode":"model","citationCount":0}}'
      ),
      (
        'turn-b1', 'session-b', 'aggregate-1', 'qb', 'answer-b1', 'web', 'site', 'answered',
        '[]', NULL, 'qbfp', 'topic', 'topic', '2026-07-28 02:00:00', '2026-08-28',
        '{"version":1,"claims":[],"citations":[],"suggestions":[],"meta":{"mode":"model","citationCount":0}}'
      );

    INSERT INTO "PublicAssistantFeedback" (
      "id", "sessionId", "turnId", "rating", "reason", "comment", "createdAt", "updatedAt"
    ) VALUES ('feedback-a1', 'session-a', 'turn-a1', 'up', NULL, NULL, '2026-07-28', '2026-07-28');

    INSERT INTO "PublicAssistantRequest" (
      "requestId", "sessionId", "requestHash", "status", "attempt", "leaseToken",
      "leaseExpiresAt", "turnId", "responseJson", "createdAt", "updatedAt", "expiresAt"
    ) VALUES
      (
        'request-a1', 'session-a', 'hash-a1', 'completed', 1, 'lease-a1',
        '2026-07-28 01:10:00', 'turn-a1',
        '{"requestId":"request-a1","answer":"object-preserved","status":"answered","claims":[],"citations":[],"suggestions":[],"sessionId":"session-a","messageId":"turn-a1","meta":{"mode":"model","citationCount":0}}',
        '2026-07-28', '2026-07-28', '2026-08-28'
      ),
      (
        'request-a2', 'session-a', 'hash-a2', 'completed', 1, 'lease-a2',
        '2026-07-28 01:10:00', 'turn-a2', '"legacy-scalar"'::jsonb,
        '2026-07-28', '2026-07-28', '2026-08-28'
      );
  `)

  await applyMigration(publicAssistantMigrations.at(-1))

  const counts = await client.query(`
    SELECT
      (SELECT count(*)::int FROM "PublicAssistantAnswerRevision") AS revisions,
      (SELECT count(*)::int FROM "PublicAssistantBranch") AS branches,
      (SELECT "totalCount" FROM "PublicAssistantDailyAggregate" WHERE "id" = 'aggregate-1') AS aggregate_total
  `)
  assert.deepEqual(counts.rows[0], { revisions: 3, branches: 2, aggregate_total: 3 })

  const parity = await client.query(`
    SELECT
      revision."id" AS revision_id,
      revision."revisionNo" AS revision_no,
      revision."basedOnRevisionId" AS based_on_revision_id,
      revision."answer",
      revision."route",
      revision."status",
      revision."citationIdsJson" AS citation_ids,
      revision."metricsJson" AS metrics,
      revision."displaySnapshotJson" AS display_snapshot,
      revision."aggregateId" AS aggregate_id,
      revision."createdAt"::text AS revision_created_at,
      revision."expiresAt"::text AS revision_expires_at,
      turn."question",
      turn."mode",
      turn."questionFingerprint" AS question_fingerprint,
      turn."topicFingerprint" AS topic_fingerprint,
      turn."topicTerms" AS topic_terms,
      turn."createdAt"::text AS turn_created_at,
      turn."expiresAt"::text AS turn_expires_at
    FROM "PublicAssistantTurn" AS turn
    JOIN "PublicAssistantAnswerRevision" AS revision
      ON revision."turnId" = turn."id"
    WHERE turn."id" = 'turn-a1'
  `)
  assert.deepEqual(parity.rows[0], {
    revision_id: 'legacy-revision-turn-a1',
    revision_no: 1,
    based_on_revision_id: null,
    answer: 'answer-a1',
    route: 'site',
    status: 'answered',
    citation_ids: ['citation-a1'],
    metrics: { latencyMs: 321, siteEvidenceCount: 2 },
    display_snapshot: {
      version: 1,
      claims: [],
      citations: [],
      suggestions: ['next-a1'],
      meta: { mode: 'model', citationCount: 0 },
    },
    aggregate_id: 'aggregate-1',
    revision_created_at: '2026-07-28 01:00:00',
    revision_expires_at: '2026-08-28 00:00:00',
    question: 'q1',
    mode: 'auto',
    question_fingerprint: 'q1fp',
    topic_fingerprint: 'topic',
    topic_terms: 'topic',
    turn_created_at: '2026-07-28 01:00:00',
    turn_expires_at: '2026-08-28 00:00:00',
  })

  const sessionAndBranch = await client.query(`
    SELECT
      session."createdAt"::text AS session_created_at,
      session."lastActiveAt"::text AS session_last_active_at,
      session."expiresAt"::text AS session_expires_at,
      session."activeBranchId" AS active_branch_id,
      session."branchSelectionVersion" AS selection_version,
      branch."ordinal",
      branch."headRevisionId" AS head_revision_id,
      branch."forkedFromRevisionId" AS forked_from_revision_id,
      branch."createdAt"::text AS branch_created_at,
      branch."lastActiveAt"::text AS branch_last_active_at,
      branch."expiresAt"::text AS branch_expires_at
    FROM "PublicAssistantSession" AS session
    JOIN "PublicAssistantBranch" AS branch
      ON branch."id" = session."activeBranchId"
    WHERE session."id" = 'session-a'
  `)
  assert.deepEqual(sessionAndBranch.rows[0], {
    session_created_at: '2026-07-28 01:00:00',
    session_last_active_at: '2026-07-28 01:02:00',
    session_expires_at: '2026-08-28 00:00:00',
    active_branch_id: 'legacy-branch-session-a',
    selection_version: 0,
    ordinal: 1,
    head_revision_id: 'legacy-revision-turn-a2',
    forked_from_revision_id: null,
    branch_created_at: '2026-07-28 01:00:00',
    branch_last_active_at: '2026-07-28 01:02:00',
    branch_expires_at: '2026-08-28 00:00:00',
  })

  const parent = await client.query(`SELECT "parentRevisionId" FROM "PublicAssistantTurn" WHERE "id" = 'turn-a2'`)
  assert.equal(parent.rows[0]?.parentRevisionId, 'legacy-revision-turn-a1')
  const feedback = await client.query(`SELECT "revisionId" FROM "PublicAssistantFeedback" WHERE "id" = 'feedback-a1'`)
  assert.equal(feedback.rows[0]?.revisionId, 'legacy-revision-turn-a1')

  const caches = await client.query(`
    SELECT "requestId", "responseJson"
    FROM "PublicAssistantRequest"
    WHERE "requestId" IN ('request-a1', 'request-a2')
    ORDER BY "requestId"
  `)
  assert.equal(caches.rows[0].responseJson.answer, 'object-preserved')
  assert.equal(caches.rows[1].responseJson.answer, 'answer-a2')
  for (const row of caches.rows) {
    assert.equal(row.responseJson.contractVersion, 2)
    assert.equal(row.responseJson.conversation.revisionId, `legacy-revision-${row.responseJson.messageId}`)
  }

  const removedColumns = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1
      AND table_name = 'PublicAssistantTurn'
      AND column_name IN ('answer', 'route', 'status', 'displaySnapshotJson', 'aggregateId')
  `, [legacySchema])
  assert.equal(removedColumns.rowCount, 0, 'legacy answer columns must be removed after backfill')

  await expectCheckViolation(
    () => client.query(`UPDATE "PublicAssistantAnswerRevision" SET "answer" = 'mutated' WHERE "id" = 'legacy-revision-turn-a1'`),
    'PublicAssistantAnswerRevision rows are immutable',
  )
  await expectCheckViolation(
    () => client.query(`UPDATE "PublicAssistantSession" SET "activeBranchId" = 'legacy-branch-session-b' WHERE "id" = 'session-a'`),
    'Public assistant active branch crosses session ownership',
  )
  await expectCheckViolation(
    () => client.query(`UPDATE "PublicAssistantBranch" SET "headRevisionId" = 'legacy-revision-turn-b1' WHERE "id" = 'legacy-branch-session-a'`),
    'Public assistant branch head crosses session ownership',
  )
  await expectCheckViolation(
    () => client.query(`UPDATE "PublicAssistantTurn" SET "parentRevisionId" = 'legacy-revision-turn-b1' WHERE "id" = 'turn-a2'`),
    'Public assistant turn parent crosses session ownership',
  )
  await expectCheckViolation(
    () => client.query(`
      INSERT INTO "PublicAssistantAnswerRevision" (
        "id", "turnId", "aggregateId", "revisionNo", "basedOnRevisionId", "answer", "route", "status",
        "citationIdsJson", "createdAt", "expiresAt"
      ) VALUES (
        'cross-revision', 'turn-a1', 'aggregate-1', 2, 'legacy-revision-turn-b1', 'cross', 'site', 'answered',
        '[]', '2026-07-28', '2026-08-28'
      )
    `),
    'Public assistant revision lineage crosses logical turns',
  )
  await expectCheckViolation(
    () => client.query(`UPDATE "PublicAssistantRequest" SET "branchId" = 'legacy-branch-session-b' WHERE "requestId" = 'request-a1'`),
    'Public assistant request branch crosses session ownership',
  )
  await expectCheckViolation(
    () => client.query(`UPDATE "PublicAssistantFeedback" SET "revisionId" = 'legacy-revision-turn-b1' WHERE "id" = 'feedback-a1'`),
    'Public assistant feedback crosses session ownership',
  )

  await client.query(`DELETE FROM "PublicAssistantRequest" WHERE "sessionId" = 'session-a'`)
  await client.query(`DELETE FROM "PublicAssistantSession" WHERE "id" = 'session-a'`)
  const deletedTree = await client.query(`
    SELECT
      (SELECT count(*)::int FROM "PublicAssistantTurn" WHERE "sessionId" = 'session-a') AS turns,
      (SELECT count(*)::int FROM "PublicAssistantAnswerRevision"
        WHERE "id" IN ('legacy-revision-turn-a1', 'legacy-revision-turn-a2')) AS revisions,
      (SELECT count(*)::int FROM "PublicAssistantFeedback" WHERE "sessionId" = 'session-a') AS feedback,
      (SELECT count(*)::int FROM "PublicAssistantBranch" WHERE "sessionId" = 'session-a') AS branches
  `)
  assert.deepEqual(deletedTree.rows[0], { turns: 0, revisions: 0, feedback: 0, branches: 0 })
}

await client.connect()
try {
  await checkEmptySchema()
  await checkLegacyUpgrade()
  console.log('Public assistant PostgreSQL revision migration contracts passed.')
} finally {
  await client.query('SET search_path TO public').catch(() => undefined)
  await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(emptySchema)} CASCADE`).catch(() => undefined)
  await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(legacySchema)} CASCADE`).catch(() => undefined)
  await client.end()
}
