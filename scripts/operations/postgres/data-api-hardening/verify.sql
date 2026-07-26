\set ON_ERROR_STOP on

\if :{?expected_database}
\else
  \echo 'Missing required psql variable: expected_database'
  \quit 3
\endif

\if :{?expected_user}
\else
  \echo 'Missing required psql variable: expected_user'
  \quit 3
\endif

SELECT current_database() = :'expected_database' AS database_matches,
       current_user = :'expected_user' AS user_matches
\gset

\if :database_matches
\else
  \echo 'Database fingerprint mismatch; verification stopped.'
  \quit 4
\endif

\if :user_matches
\else
  \echo 'Database user fingerprint mismatch; verification stopped.'
  \quit 4
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
    'PublicAssistantSession', 'PublicAssistantTurn',
    'PublicAssistantFeedback', 'PublicAssistantDailyAggregate'
  ];
  insecure_tables text[];
  privileged_tables text[];
  executable_functions text[];
  mutable_search_path_functions text[];
  unsafe_defaults integer;
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
  JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) x
  LEFT JOIN pg_roles grantee ON grantee.oid = x.grantee
  WHERE owner.rolname = current_user
    AND ns.nspname = current_schema()
    AND coalesce(grantee.rolname, 'PUBLIC') IN ('PUBLIC', 'anon', 'authenticated');

  SELECT array_agg(p.oid::regprocedure::text ORDER BY p.oid::regprocedure::text)
  INTO mutable_search_path_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = current_schema()
    AND p.proname IN (
      'protect_ai_daily_flash_revision_content',
      'protect_ai_daily_approval_history'
    )
    AND NOT coalesce(p.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=pg_catalog, public'];

  IF insecure_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Reviewed tables without RLS: %', insecure_tables;
  END IF;

  IF privileged_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Data API roles retain table privileges: %', privileged_tables;
  END IF;

  IF executable_functions IS NOT NULL THEN
    RAISE EXCEPTION 'Data API roles retain function execution: %', executable_functions;
  END IF;

  IF mutable_search_path_functions IS NOT NULL THEN
    RAISE EXCEPTION 'Reviewed functions retain a mutable search_path: %', mutable_search_path_functions;
  END IF;

  IF has_schema_privilege('anon', current_schema(), 'USAGE')
     OR has_schema_privilege('authenticated', current_schema(), 'USAGE') THEN
    RAISE EXCEPTION 'Data API roles retain public schema usage';
  END IF;

  IF NOT has_schema_privilege('service_role', current_schema(), 'USAGE') THEN
    RAISE EXCEPTION 'service_role lost public schema usage';
  END IF;

  IF unsafe_defaults > 0 THEN
    RAISE EXCEPTION 'Current owner retains unsafe Data API default ACL entries: %', unsafe_defaults;
  END IF;
END $$;

SELECT 'PublicAssistantSession' AS table_name, count(*) AS row_count FROM "PublicAssistantSession";
SELECT 'PublicAssistantTurn' AS table_name, count(*) AS row_count FROM "PublicAssistantTurn";
SELECT 'PublicAssistantFeedback' AS table_name, count(*) AS row_count FROM "PublicAssistantFeedback";
SELECT 'PublicAssistantDailyAggregate' AS table_name, count(*) AS row_count FROM "PublicAssistantDailyAggregate";
SELECT 'ContentDraft' AS table_name, count(*) AS row_count FROM "ContentDraft";
SELECT 'AiDailyIssue' AS table_name, count(*) AS row_count FROM "AiDailyIssue";

\echo 'Server-only Data API hardening verification passed.'
