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

\if :{?confirm_data_api_hardening}
\else
  \echo 'Missing required confirmation: confirm_data_api_hardening'
  \quit 3
\endif

SELECT current_database() = :'expected_database' AS database_matches,
       current_user = :'expected_user' AS user_matches,
       :'confirm_data_api_hardening' = 'HARDEN_SERVER_ONLY_DATA_API' AS confirmation_matches
\gset

\if :database_matches
\else
  \echo 'Database fingerprint mismatch; no hardening action was applied.'
  \quit 4
\endif

\if :user_matches
\else
  \echo 'Database user fingerprint mismatch; no hardening action was applied.'
  \quit 4
\endif

\if :confirmation_matches
\else
  \echo 'Confirmation phrase mismatch; no hardening action was applied.'
  \quit 5
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

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
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname)
  INTO actual_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_roles owner ON owner.oid = c.relowner
  WHERE n.nspname = current_schema()
    AND c.relkind IN ('r', 'p')
    AND owner.rolname = current_user;

  IF actual_tables IS NULL
     OR actual_tables @> expected_tables IS FALSE
     OR expected_tables @> actual_tables IS FALSE THEN
    RAISE EXCEPTION 'Public table allowlist mismatch; run preflight again';
  END IF;
END $$;

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublishExport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SourceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyIssue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailySourceFeed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyRunEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyWorkItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyWorkAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyCluster" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyIssueSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyGeneratedRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyFlashItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyFlashRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyApprovalAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyEvidenceDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyGenerationCheckpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiDailyEditorialOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicAssistantSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicAssistantRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicAssistantTurn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicAssistantAnswerRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicAssistantBranch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicAssistantFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicAssistantDailyAggregate" ENABLE ROW LEVEL SECURITY;

ALTER FUNCTION "protect_ai_daily_flash_revision_content"()
  SET search_path = pg_catalog, public;
ALTER FUNCTION "protect_ai_daily_approval_history"()
  SET search_path = pg_catalog, public;
ALTER FUNCTION "public_assistant_reject_revision_update"()
  SET search_path = pg_catalog, public;
ALTER FUNCTION "public_assistant_validate_graph_ownership"()
  SET search_path = pg_catalog, public;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;

\echo 'Server-only Data API hardening applied. Run verify.sql immediately.'
