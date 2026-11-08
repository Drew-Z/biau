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
  \echo 'Database fingerprint mismatch; verification stopped.'
  DO $$ BEGIN RAISE EXCEPTION 'Database fingerprint mismatch'; END $$;
\endif

\if :user_matches
\else
  \echo 'Database user fingerprint mismatch; verification stopped.'
  DO $$ BEGIN RAISE EXCEPTION 'Database user fingerprint mismatch'; END $$;
\endif

-- Verification must also reject missing/unreviewed tables and wrong owners.
\ir preflight.sql

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
    'PublicAssistantFeedback', 'PublicAssistantDailyAggregate',
    'rag_documents', 'rag_chunks', 'rag_entities', 'rag_relations', 'rag_sync_runs', 'rag_eval_runs',
    'AgentMemory', 'ChatMessage', 'ChatSession', 'InternalKnowledgeDocument',
    'InternalKnowledgeSyncRun', 'Invite', 'Member', 'OperatorMemory',
    'OperatorMessage', 'OperatorSession', 'OperatorUsageLog', 'UsageLog'
  ];
  insecure_tables text[];
  privileged_tables text[];
  executable_functions text[];
  mutable_search_path_functions text[];
  invalid_public_assistant_triggers text[];
  unsafe_defaults integer;
  privileged_sequences text[];
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname)
  INTO insecure_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = current_schema()
    AND c.relkind IN ('r', 'p')
    AND c.relname = ANY (expected_tables)
    AND NOT c.relrowsecurity;

  SELECT array_agg(c.relname ORDER BY c.relname)
  INTO privileged_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = current_schema()
    AND c.relkind IN ('r', 'p')
    AND c.relname = ANY (expected_tables)
    AND (
      has_table_privilege('anon', c.oid, 'SELECT')
      OR has_table_privilege('anon', c.oid, 'INSERT')
      OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE')
      OR has_table_privilege('anon', c.oid, 'TRUNCATE')
      OR has_table_privilege('anon', c.oid, 'REFERENCES')
      OR has_table_privilege('anon', c.oid, 'TRIGGER')
      OR has_table_privilege('authenticated', c.oid, 'SELECT')
      OR has_table_privilege('authenticated', c.oid, 'INSERT')
      OR has_table_privilege('authenticated', c.oid, 'UPDATE')
      OR has_table_privilege('authenticated', c.oid, 'DELETE')
      OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')
      OR has_table_privilege('authenticated', c.oid, 'REFERENCES')
      OR has_table_privilege('authenticated', c.oid, 'TRIGGER')
    );

  SELECT array_agg(p.oid::regprocedure::text ORDER BY p.oid::regprocedure::text)
  INTO executable_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = current_schema()
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    );

  SELECT count(*)
  INTO unsafe_defaults
  FROM pg_default_acl d
  JOIN pg_roles owner ON owner.oid = d.defaclrole
  LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) x
  LEFT JOIN pg_roles grantee ON grantee.oid = x.grantee
  WHERE owner.rolname = current_user
    AND (ns.nspname = current_schema() OR d.defaclnamespace = 0)
    AND coalesce(grantee.rolname, 'PUBLIC') IN ('PUBLIC', 'anon', 'authenticated');

  SELECT array_agg(p.oid::regprocedure::text ORDER BY p.oid::regprocedure::text)
  INTO mutable_search_path_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = current_schema()
    AND p.proname IN (
      'protect_ai_daily_flash_revision_content',
      'protect_ai_daily_approval_history',
      'public_assistant_reject_revision_update',
      'public_assistant_validate_graph_ownership'
    )
    AND (p.prosecdef OR NOT coalesce(p.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=pg_catalog, public, pg_temp']);

  SELECT array_agg(c.relname ORDER BY c.relname) INTO privileged_sequences
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = current_schema() AND c.relkind = 'S'
    AND (has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE')
      OR has_sequence_privilege('authenticated', c.oid, 'USAGE,SELECT,UPDATE'));

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

  IF insecure_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Reviewed tables without RLS: %', insecure_tables;
  END IF;

  IF privileged_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Data API roles retain table privileges: %', privileged_tables;
  END IF;
  IF privileged_sequences IS NOT NULL THEN
    RAISE EXCEPTION 'Data API roles retain sequence privileges: %', privileged_sequences;
  END IF;

  IF executable_functions IS NOT NULL THEN
    RAISE EXCEPTION 'Data API roles retain function execution: %', executable_functions;
  END IF;

  IF mutable_search_path_functions IS NOT NULL THEN
    RAISE EXCEPTION 'Reviewed functions retain a mutable search_path: %', mutable_search_path_functions;
  END IF;

  IF invalid_public_assistant_triggers IS NOT NULL THEN
    RAISE EXCEPTION 'Public assistant protection triggers are missing, disabled, or misbound: %', invalid_public_assistant_triggers;
  END IF;

  IF has_schema_privilege('anon', current_schema(), 'USAGE')
     OR has_schema_privilege('authenticated', current_schema(), 'USAGE')
     OR has_schema_privilege('anon', current_schema(), 'CREATE')
     OR has_schema_privilege('authenticated', current_schema(), 'CREATE') THEN
    RAISE EXCEPTION 'Data API roles retain public schema usage';
  END IF;

  IF NOT has_schema_privilege('service_role', current_schema(), 'USAGE') THEN
    RAISE EXCEPTION 'service_role lost public schema usage';
  END IF;

  IF unsafe_defaults > 0 THEN
    RAISE EXCEPTION 'Current owner retains unsafe Data API default ACL entries: %', unsafe_defaults;
  END IF;
  -- No explicit global ACL means PostgreSQL's built-in PUBLIC EXECUTE default.
  IF NOT EXISTS (
    SELECT 1 FROM pg_default_acl d JOIN pg_roles r ON r.oid = d.defaclrole
    WHERE r.rolname = current_user AND d.defaclnamespace = 0 AND d.defaclobjtype = 'f'
  ) THEN
    RAISE EXCEPTION 'Current owner retains implicit PUBLIC function execution default';
  END IF;
END $$;

SELECT 'PublicAssistantSession' AS table_name, count(*) AS row_count FROM "PublicAssistantSession";
SELECT 'PublicAssistantRequest' AS table_name, count(*) AS row_count FROM "PublicAssistantRequest";
SELECT 'PublicAssistantTurn' AS table_name, count(*) AS row_count FROM "PublicAssistantTurn";
SELECT 'PublicAssistantAnswerRevision' AS table_name, count(*) AS row_count FROM "PublicAssistantAnswerRevision";
SELECT 'PublicAssistantBranch' AS table_name, count(*) AS row_count FROM "PublicAssistantBranch";
SELECT 'PublicAssistantFeedback' AS table_name, count(*) AS row_count FROM "PublicAssistantFeedback";
SELECT 'PublicAssistantDailyAggregate' AS table_name, count(*) AS row_count FROM "PublicAssistantDailyAggregate";
SELECT 'ContentDraft' AS table_name, count(*) AS row_count FROM "ContentDraft";
SELECT 'AiDailyIssue' AS table_name, count(*) AS row_count FROM "AiDailyIssue";

\echo 'Server-only Data API hardening verification passed.'
