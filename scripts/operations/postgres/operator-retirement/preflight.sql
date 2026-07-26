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
  \echo 'Database fingerprint mismatch; no retirement action is allowed.'
  \quit 4
\endif

\if :user_matches
\else
  \echo 'Database user fingerprint mismatch; no retirement action is allowed.'
  \quit 4
\endif

SELECT current_database() AS database_name,
       current_user AS database_user,
       current_schema() AS schema_name,
       inet_server_addr() IS NOT NULL AS remote_server;

DO $$
DECLARE
  missing_tables text[];
  missing_types text[];
  missing_public_tables text[];
  cross_boundary_fks integer;
  external_enum_uses integer;
BEGIN
  SELECT array_agg(name ORDER BY name)
  INTO missing_tables
  FROM unnest(ARRAY[
    'OperatorMemory', 'OperatorMessage', 'OperatorSession', 'OperatorUsageLog',
    'AgentMemory', 'InternalKnowledgeDocument', 'InternalKnowledgeSyncRun',
    'ChatMessage', 'ChatSession', 'UsageLog', 'Member', 'Invite'
  ]) AS target(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Operator retirement target tables are missing: %', missing_tables;
  END IF;

  SELECT array_agg(name ORDER BY name)
  INTO missing_types
  FROM unnest(ARRAY[
    'AgentMemoryKind', 'AgentMemoryStatus',
    'InternalKnowledgeStatus', 'InternalKnowledgeSyncStatus',
    'MemberStatus', 'MessageRole', 'MemberRole'
  ]) AS target(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = current_schema() AND t.typname = name
  );

  IF missing_types IS NOT NULL THEN
    RAISE EXCEPTION 'Operator retirement target enums are missing: %', missing_types;
  END IF;

  SELECT array_agg(name ORDER BY name)
  INTO missing_public_tables
  FROM unnest(ARRAY[
    'PublicAssistantSession', 'PublicAssistantTurn',
    'PublicAssistantFeedback', 'PublicAssistantDailyAggregate'
  ]) AS protected(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NULL;

  IF missing_public_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Public assistant protection tables are missing: %', missing_public_tables;
  END IF;

  WITH target_tables AS (
    SELECT to_regclass(format('%I.%I', current_schema(), name)) AS oid
    FROM unnest(ARRAY[
      'OperatorMemory', 'OperatorMessage', 'OperatorSession', 'OperatorUsageLog',
      'AgentMemory', 'InternalKnowledgeDocument', 'InternalKnowledgeSyncRun',
      'ChatMessage', 'ChatSession', 'UsageLog', 'Member', 'Invite'
    ]) AS target(name)
  )
  SELECT count(*)
  INTO cross_boundary_fks
  FROM pg_constraint c
  WHERE c.contype = 'f'
    AND (
      (c.conrelid IN (SELECT oid FROM target_tables) AND c.confrelid NOT IN (SELECT oid FROM target_tables))
      OR
      (c.confrelid IN (SELECT oid FROM target_tables) AND c.conrelid NOT IN (SELECT oid FROM target_tables))
    );

  IF cross_boundary_fks > 0 THEN
    RAISE EXCEPTION 'Cross-boundary foreign keys reference the retirement target set: %', cross_boundary_fks;
  END IF;

  SELECT count(*)
  INTO external_enum_uses
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace table_ns ON table_ns.oid = c.relnamespace
  JOIN pg_type t ON t.oid = a.atttypid
  JOIN pg_namespace type_ns ON type_ns.oid = t.typnamespace
  WHERE table_ns.nspname = current_schema()
    AND type_ns.nspname = current_schema()
    AND c.relkind = ANY (ARRAY['r', 'p', 'v', 'm', 'f', 'c']::"char"[])
    AND t.typname = ANY (ARRAY[
      'AgentMemoryKind', 'AgentMemoryStatus',
      'InternalKnowledgeStatus', 'InternalKnowledgeSyncStatus',
      'MemberStatus', 'MessageRole', 'MemberRole'
    ])
    AND c.relname <> ALL (ARRAY[
      'OperatorMemory', 'OperatorMessage', 'OperatorSession', 'OperatorUsageLog',
      'AgentMemory', 'InternalKnowledgeDocument', 'InternalKnowledgeSyncRun',
      'ChatMessage', 'ChatSession', 'UsageLog', 'Member', 'Invite'
    ])
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF external_enum_uses > 0 THEN
    RAISE EXCEPTION 'Retirement enums are still used outside the target set: %', external_enum_uses;
  END IF;
END $$;

SELECT format(
  'SELECT %L AS table_name, count(*) AS row_count, pg_total_relation_size(%L::regclass) AS total_bytes FROM %I.%I;',
  name,
  format('%I.%I', current_schema(), name),
  current_schema(),
  name
)
FROM unnest(ARRAY[
  'OperatorMemory', 'OperatorMessage', 'OperatorSession', 'OperatorUsageLog',
  'AgentMemory', 'InternalKnowledgeDocument', 'InternalKnowledgeSyncRun',
  'ChatMessage', 'ChatSession', 'UsageLog', 'Member', 'Invite',
  'PublicAssistantSession', 'PublicAssistantTurn',
  'PublicAssistantFeedback', 'PublicAssistantDailyAggregate'
]) AS listed(name)
\gexec

SELECT count(*) AS active_nonself_connections
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state <> 'idle';

\echo 'Operator retirement preflight passed. Review every row count before apply.'
