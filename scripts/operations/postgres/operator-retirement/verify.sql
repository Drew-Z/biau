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
  \echo 'Database fingerprint mismatch; verification aborted.'
  \quit 4
\endif

\if :user_matches
\else
  \echo 'Database user fingerprint mismatch; verification aborted.'
  \quit 4
\endif

DO $$
DECLARE
  remaining_tables text[];
  remaining_types text[];
  missing_public_tables text[];
BEGIN
  SELECT array_agg(name ORDER BY name)
  INTO remaining_tables
  FROM unnest(ARRAY[
    'OperatorMemory', 'OperatorMessage', 'OperatorSession', 'OperatorUsageLog',
    'AgentMemory', 'InternalKnowledgeDocument', 'InternalKnowledgeSyncRun',
    'ChatMessage', 'ChatSession', 'UsageLog', 'Member', 'Invite'
  ]) AS target(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NOT NULL;

  IF remaining_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Operator-only tables still exist: %', remaining_tables;
  END IF;

  SELECT array_agg(name ORDER BY name)
  INTO remaining_types
  FROM unnest(ARRAY[
    'AgentMemoryKind', 'AgentMemoryStatus',
    'InternalKnowledgeStatus', 'InternalKnowledgeSyncStatus',
    'MemberStatus', 'MessageRole', 'MemberRole'
  ]) AS target(name)
  WHERE EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = current_schema() AND t.typname = name
  );

  IF remaining_types IS NOT NULL THEN
    RAISE EXCEPTION 'Operator-only enums still exist: %', remaining_types;
  END IF;

  SELECT array_agg(name ORDER BY name)
  INTO missing_public_tables
  FROM unnest(ARRAY[
    'PublicAssistantSession', 'PublicAssistantRequest', 'PublicAssistantTurn',
    'PublicAssistantAnswerRevision', 'PublicAssistantBranch',
    'PublicAssistantFeedback', 'PublicAssistantDailyAggregate'
  ]) AS protected(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NULL;

  IF missing_public_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Public assistant protection tables are missing: %', missing_public_tables;
  END IF;
END $$;

SELECT format(
  'SELECT %L AS table_name, count(*) AS row_count FROM %I.%I;',
  name,
  current_schema(),
  name
)
FROM unnest(ARRAY[
  'PublicAssistantSession', 'PublicAssistantRequest', 'PublicAssistantTurn',
  'PublicAssistantAnswerRevision', 'PublicAssistantBranch',
  'PublicAssistantFeedback', 'PublicAssistantDailyAggregate'
]) AS protected(name)
\gexec

SELECT migration_name, finished_at IS NOT NULL AS applied
FROM "_prisma_migrations"
ORDER BY started_at DESC
LIMIT 5;

\echo 'Operator retirement verification passed.'
