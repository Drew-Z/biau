\set ON_ERROR_STOP on

\if :{?expected_database}
\else
  \echo 'Missing required psql variable: expected_database'
  DO $$ BEGIN RAISE EXCEPTION 'Missing expected_database'; END $$;
\endif

\if :{?expected_user}
\else
  \echo 'Missing required psql variable: expected_user'
  DO $$ BEGIN RAISE EXCEPTION 'Missing expected_user'; END $$;
\endif

SELECT current_database() = :'expected_database' AS database_matches,
       current_user = :'expected_user' AS user_matches
\gset

\if :database_matches
\else
  \echo 'Database fingerprint mismatch; no hardening action is allowed.'
  DO $$ BEGIN RAISE EXCEPTION 'Database fingerprint mismatch'; END $$;
\endif

\if :user_matches
\else
  \echo 'Database user fingerprint mismatch; no hardening action is allowed.'
  DO $$ BEGIN RAISE EXCEPTION 'Database user fingerprint mismatch'; END $$;
\endif

DO $$
DECLARE
  expected_tables text[] := ARRAY[
    '_prisma_migrations',
    'ContentDraft', 'ContentReview', 'PublishExport', 'SourceItem',
    'AiDailyIssue', 'AiDailySourceFeed', 'AiDailyRun', 'AiDailyRunEvent',
    'AiDailyWorkItem', 'AiDailyWorkAttempt', 'AiDailyCandidate',
    'AiDailyCluster', 'AiDailyIssueSource', 'AiDailyGeneratedRevision',
    'AiDailyFlashItem', 'AiDailyFlashRevision', 'AiDailyApprovalAction',
    'AiDailyEvidenceDocument', 'AiDailyGenerationCheckpoint',
    'AiDailyEditorialOverride',
    'PublicAssistantSession', 'PublicAssistantRequest', 'PublicAssistantTurn',
    'PublicAssistantAnswerRevision', 'PublicAssistantBranch',
    'PublicAssistantFeedback', 'PublicAssistantDailyAggregate'
  ];
  actual_tables text[];
  legacy_tables text[] := ARRAY[
    'AgentMemory', 'ChatMessage', 'ChatSession', 'InternalKnowledgeDocument',
    'InternalKnowledgeSyncRun', 'Invite', 'Member', 'OperatorMemory',
    'OperatorMessage', 'OperatorSession', 'OperatorUsageLog', 'UsageLog'
  ];
  rag_tables text[] := ARRAY[
    'rag_documents', 'rag_chunks', 'rag_entities', 'rag_relations', 'rag_sync_runs', 'rag_eval_runs'
  ];
  missing_tables text[];
  unexpected_tables text[];
  non_owner_tables text[];
  invalid_public_assistant_triggers text[];
BEGIN
  IF current_schema() <> 'public' THEN
    RAISE EXCEPTION 'Operational hardening only accepts the public schema';
  END IF;
  SELECT array_agg(c.relname ORDER BY c.relname)
  INTO actual_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = current_schema()
    AND c.relkind IN ('r', 'p');

  -- Some deployments colocate the public RAG store. Accept that complete,
  -- reviewed group only; partial groups and unrelated tables still fail closed.
  IF actual_tables && rag_tables THEN
    expected_tables := expected_tables || rag_tables;
  END IF;
  IF actual_tables && legacy_tables THEN
    expected_tables := expected_tables || legacy_tables;
  END IF;

  SELECT array_agg(name ORDER BY name)
  INTO missing_tables
  FROM unnest(expected_tables) AS expected(name)
  WHERE NOT (name = ANY (coalesce(actual_tables, ARRAY[]::text[])));

  SELECT array_agg(name ORDER BY name)
  INTO unexpected_tables
  FROM unnest(coalesce(actual_tables, ARRAY[]::text[])) AS actual(name)
  WHERE NOT (name = ANY (expected_tables));

  SELECT array_agg(c.relname ORDER BY c.relname)
  INTO non_owner_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_roles owner ON owner.oid = c.relowner
  WHERE n.nspname = current_schema()
    AND c.relkind IN ('r', 'p')
    AND c.relname = ANY (expected_tables)
    AND owner.rolname <> current_user;

  IF missing_tables IS NOT NULL OR unexpected_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Public table allowlist mismatch; missing=%, unexpected=%',
      missing_tables, unexpected_tables;
  END IF;

  IF non_owner_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Current database user does not own reviewed tables: %', non_owner_tables;
  END IF;

  WITH expected(table_name, trigger_name, function_name) AS (
    VALUES
      ('PublicAssistantAnswerRevision', 'PublicAssistantAnswerRevision_immutable', 'public_assistant_reject_revision_update'),
      ('PublicAssistantSession', 'PublicAssistantSession_graph_ownership', 'public_assistant_validate_graph_ownership'),
      ('PublicAssistantBranch', 'PublicAssistantBranch_graph_ownership', 'public_assistant_validate_graph_ownership'),
      ('PublicAssistantTurn', 'PublicAssistantTurn_graph_ownership', 'public_assistant_validate_graph_ownership'),
      ('PublicAssistantAnswerRevision', 'PublicAssistantAnswerRevision_graph_ownership', 'public_assistant_validate_graph_ownership'),
      ('PublicAssistantRequest', 'PublicAssistantRequest_graph_ownership', 'public_assistant_validate_graph_ownership'),
      ('PublicAssistantFeedback', 'PublicAssistantFeedback_graph_ownership', 'public_assistant_validate_graph_ownership')
  )
  SELECT array_agg(format('%s.%s', expected.table_name, expected.trigger_name) ORDER BY expected.table_name, expected.trigger_name)
  INTO invalid_public_assistant_triggers
  FROM expected
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_trigger trg
    JOIN pg_class tbl ON tbl.oid = trg.tgrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    JOIN pg_proc proc ON proc.oid = trg.tgfoid
    WHERE ns.nspname = current_schema()
      AND tbl.relname = expected.table_name
      AND trg.tgname = expected.trigger_name
      AND proc.proname = expected.function_name
      AND proc.pronamespace = tbl.relnamespace
      AND proc.pronargs = 0
      AND NOT trg.tgisinternal
      AND trg.tgenabled <> 'D'
  );

  IF invalid_public_assistant_triggers IS NOT NULL THEN
    RAISE EXCEPTION 'Public assistant protection triggers are missing, disabled, or misbound: %', invalid_public_assistant_triggers;
  END IF;

  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'Current database user does not bypass RLS';
  END IF;
END $$;

SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       (has_table_privilege('anon', c.oid, 'SELECT')
        OR has_table_privilege('anon', c.oid, 'INSERT')
        OR has_table_privilege('anon', c.oid, 'UPDATE')
        OR has_table_privilege('anon', c.oid, 'DELETE')
        OR has_table_privilege('anon', c.oid, 'TRUNCATE')
        OR has_table_privilege('anon', c.oid, 'REFERENCES')
        OR has_table_privilege('anon', c.oid, 'TRIGGER')) AS anon_has_any_reviewed_privilege,
       (has_table_privilege('authenticated', c.oid, 'SELECT')
        OR has_table_privilege('authenticated', c.oid, 'INSERT')
        OR has_table_privilege('authenticated', c.oid, 'UPDATE')
        OR has_table_privilege('authenticated', c.oid, 'DELETE')
        OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')
        OR has_table_privilege('authenticated', c.oid, 'REFERENCES')
        OR has_table_privilege('authenticated', c.oid, 'TRIGGER')) AS authenticated_has_any_reviewed_privilege
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = current_schema()
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

SELECT role_name,
       has_schema_privilege(role_name, current_schema(), 'USAGE') AS schema_usage
FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS roles(role_name)
ORDER BY role_name;

SELECT owner.rolname AS owner_name,
       coalesce(ns.nspname, '*') AS schema_name,
       d.defaclobjtype AS object_type,
       coalesce(grantee.rolname, 'PUBLIC') AS grantee,
       x.privilege_type
FROM pg_default_acl d
JOIN pg_roles owner ON owner.oid = d.defaclrole
LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) x
LEFT JOIN pg_roles grantee ON grantee.oid = x.grantee
WHERE owner.rolname = current_user
  AND ns.nspname = current_schema()
  AND coalesce(grantee.rolname, 'PUBLIC') IN ('PUBLIC', 'anon', 'authenticated')
ORDER BY object_type, grantee, privilege_type;

\echo 'Data API hardening preflight passed. Confirm there is no Data API consumer before apply.'
