BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- These server-owned tables were added after the initial Data API hardening.
-- Keep owner access and default-deny RLS; do not add browser access policies.
DO $$
DECLARE
    target_schema TEXT := current_schema();
    table_name TEXT;
    function_name TEXT;
    api_role TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'PublicAssistantRequest', 'PublicAssistantAnswerRevision', 'PublicAssistantBranch'
    ] LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target_schema, table_name);
        EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', target_schema, table_name);
        FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
            EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I', target_schema, table_name, api_role);
        END LOOP;
    END LOOP;

    FOREACH function_name IN ARRAY ARRAY[
        'public_assistant_reject_revision_update', 'public_assistant_validate_graph_ownership'
    ] LOOP
        -- Resolve application tables in the installation schema, never in the
        -- caller's path. Explicit pg_temp last prevents temporary-table shadowing.
        EXECUTE format(
            'ALTER FUNCTION %I.%I() SET search_path = pg_catalog, %I, pg_temp',
            target_schema, function_name, target_schema
        );
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I() FROM PUBLIC', target_schema, function_name);
        FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
            EXECUTE format('REVOKE ALL ON FUNCTION %I.%I() FROM %I', target_schema, function_name, api_role);
        END LOOP;
    END LOOP;
END $$;

COMMIT;
