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

\if :{?confirm_data_api_hardening}
\else
  \echo 'Missing required confirmation: confirm_data_api_hardening'
  DO $$ BEGIN RAISE EXCEPTION 'Missing confirm_data_api_hardening'; END $$;
\endif

SELECT current_database() = :'expected_database' AS database_matches,
       current_user = :'expected_user' AS user_matches,
       :'confirm_data_api_hardening' = 'HARDEN_SERVER_ONLY_DATA_API' AS confirmation_matches
\gset

\if :database_matches
\else
  \echo 'Database fingerprint mismatch; no hardening action was applied.'
  DO $$ BEGIN RAISE EXCEPTION 'Database fingerprint mismatch'; END $$;
\endif

\if :user_matches
\else
  \echo 'Database user fingerprint mismatch; no hardening action was applied.'
  DO $$ BEGIN RAISE EXCEPTION 'Database user fingerprint mismatch'; END $$;
\endif

\if :confirmation_matches
\else
  \echo 'Confirmation phrase mismatch; no hardening action was applied.'
  DO $$ BEGIN RAISE EXCEPTION 'Confirmation phrase mismatch'; END $$;
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Recheck the same allowlist, ownership and trigger bindings in this transaction.
\ir preflight.sql

-- Preflight just proved the exact table set and owner; no unreviewed table can
-- reach this step. Include the retained Studio history and colocated RAG group.
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

ALTER FUNCTION "protect_ai_daily_flash_revision_content"()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION "protect_ai_daily_approval_history"()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION "public_assistant_reject_revision_update"()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION "public_assistant_validate_graph_ownership"()
  SET search_path = pg_catalog, public, pg_temp;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;

\echo 'Server-only Data API hardening applied. Run verify.sql immediately.'
