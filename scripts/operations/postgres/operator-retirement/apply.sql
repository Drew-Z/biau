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

\if :{?confirm_operator_retirement}
\else
  \echo 'Missing required psql variable: confirm_operator_retirement'
  \quit 3
\endif

SELECT current_database() = :'expected_database' AS database_matches,
       current_user = :'expected_user' AS user_matches,
       :'confirm_operator_retirement' = 'DROP_OPERATOR_ONLY_DATA' AS confirmation_matches
\gset

\if :database_matches
\else
  \echo 'Database fingerprint mismatch; no retirement action was applied.'
  \quit 4
\endif

\if :user_matches
\else
  \echo 'Database user fingerprint mismatch; no retirement action was applied.'
  \quit 4
\endif

\if :confirmation_matches
\else
  \echo 'Confirmation phrase mismatch; no retirement action was applied.'
  \quit 5
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
  missing_targets integer;
  missing_public integer;
  cross_boundary_fks integer;
  external_enum_uses integer;
BEGIN
  SELECT count(*)
  INTO missing_targets
  FROM unnest(ARRAY[
    'OperatorMemory', 'OperatorMessage', 'OperatorSession', 'OperatorUsageLog',
    'AgentMemory', 'InternalKnowledgeDocument', 'InternalKnowledgeSyncRun',
    'ChatMessage', 'ChatSession', 'UsageLog', 'Member', 'Invite'
  ]) AS target(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NULL;

  IF missing_targets > 0 THEN
    RAISE EXCEPTION 'Retirement target set is incomplete; run preflight again';
  END IF;

  SELECT count(*)
  INTO missing_public
  FROM unnest(ARRAY[
    'PublicAssistantSession', 'PublicAssistantRequest', 'PublicAssistantTurn',
    'PublicAssistantAnswerRevision', 'PublicAssistantBranch',
    'PublicAssistantFeedback', 'PublicAssistantDailyAggregate'
  ]) AS protected(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NULL;

  IF missing_public > 0 THEN
    RAISE EXCEPTION 'Public assistant protection tables are missing';
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
    RAISE EXCEPTION 'Cross-boundary foreign keys still reference the retirement target set';
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
    RAISE EXCEPTION 'Retirement enums are still used outside the target set';
  END IF;
END $$;

LOCK TABLE
  "OperatorMemory", "OperatorMessage", "OperatorSession", "OperatorUsageLog",
  "AgentMemory", "InternalKnowledgeDocument", "InternalKnowledgeSyncRun",
  "ChatMessage", "ChatSession", "UsageLog", "Member", "Invite"
IN ACCESS EXCLUSIVE MODE;

DROP TABLE
  "OperatorMemory", "OperatorMessage", "OperatorSession", "OperatorUsageLog",
  "AgentMemory", "InternalKnowledgeDocument", "InternalKnowledgeSyncRun",
  "ChatMessage", "ChatSession", "UsageLog", "Member", "Invite";

DROP TYPE
  "AgentMemoryKind", "AgentMemoryStatus",
  "InternalKnowledgeStatus", "InternalKnowledgeSyncStatus",
  "MemberStatus", "MessageRole", "MemberRole";

DO $$
BEGIN
  IF to_regclass(format('%I.%I', current_schema(), 'PublicAssistantSession')) IS NULL
     OR to_regclass(format('%I.%I', current_schema(), 'PublicAssistantRequest')) IS NULL
     OR to_regclass(format('%I.%I', current_schema(), 'PublicAssistantTurn')) IS NULL
     OR to_regclass(format('%I.%I', current_schema(), 'PublicAssistantAnswerRevision')) IS NULL
     OR to_regclass(format('%I.%I', current_schema(), 'PublicAssistantBranch')) IS NULL
     OR to_regclass(format('%I.%I', current_schema(), 'PublicAssistantFeedback')) IS NULL
     OR to_regclass(format('%I.%I', current_schema(), 'PublicAssistantDailyAggregate')) IS NULL THEN
    RAISE EXCEPTION 'Public assistant protection tables changed during retirement';
  END IF;
END $$;

COMMIT;

\echo 'Operator-only PostgreSQL data retired. Run verify.sql immediately.'
