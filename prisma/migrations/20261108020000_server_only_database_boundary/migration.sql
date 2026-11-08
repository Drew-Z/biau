BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Public and Studio both use server-side owner connections. Historical tables
-- are retained, never retired as a side effect of access hardening.
DO $$
DECLARE
    target_schema TEXT := current_schema();
    expected_tables TEXT[] := ARRAY[
        '_prisma_migrations', 'ContentDraft', 'ContentReview', 'PublishExport', 'SourceItem',
        'AiDailyIssue', 'AiDailySourceFeed', 'AiDailyRun', 'AiDailyRunEvent',
        'AiDailyWorkItem', 'AiDailyWorkAttempt', 'AiDailyCandidate', 'AiDailyCluster',
        'AiDailyIssueSource', 'AiDailyGeneratedRevision', 'AiDailyFlashItem',
        'AiDailyFlashRevision', 'AiDailyApprovalAction', 'AiDailyEvidenceDocument',
        'AiDailyGenerationCheckpoint', 'AiDailyEditorialOverride',
        'PublicAssistantSession', 'PublicAssistantRequest', 'PublicAssistantTurn',
        'PublicAssistantAnswerRevision', 'PublicAssistantBranch',
        'PublicAssistantFeedback', 'PublicAssistantDailyAggregate'
    ];
    legacy_tables TEXT[] := ARRAY[
        'AgentMemory', 'ChatMessage', 'ChatSession', 'InternalKnowledgeDocument',
        'InternalKnowledgeSyncRun', 'Invite', 'Member', 'OperatorMemory',
        'OperatorMessage', 'OperatorSession', 'OperatorUsageLog', 'UsageLog'
    ];
    rag_tables TEXT[] := ARRAY[
        'rag_documents', 'rag_chunks', 'rag_entities', 'rag_relations', 'rag_sync_runs', 'rag_eval_runs'
    ];
    actual_tables TEXT[];
    object_name TEXT;
    api_role TEXT;
BEGIN
    SELECT array_agg(c.relname ORDER BY c.relname) INTO actual_tables
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = target_schema AND c.relkind IN ('r', 'p');
    IF actual_tables && legacy_tables THEN expected_tables := expected_tables || legacy_tables; END IF;
    IF actual_tables && rag_tables THEN expected_tables := expected_tables || rag_tables; END IF;
    IF actual_tables IS NULL OR NOT (actual_tables @> expected_tables AND expected_tables @> actual_tables) THEN
        RAISE EXCEPTION 'Server-only table allowlist mismatch; review schema before hardening';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_roles r ON r.oid = c.relowner
        WHERE n.nspname = target_schema AND c.relkind IN ('r', 'p') AND r.rolname <> current_user
    ) THEN
        RAISE EXCEPTION 'Migration user must own every reviewed application table';
    END IF;

    FOREACH object_name IN ARRAY expected_tables LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target_schema, object_name);
    END LOOP;
    FOREACH object_name IN ARRAY ARRAY[
        'public_assistant_reject_revision_update', 'public_assistant_validate_graph_ownership',
        'protect_ai_daily_flash_revision_content', 'protect_ai_daily_approval_history'
    ] LOOP
        EXECUTE format('ALTER FUNCTION %I.%I() SET search_path = pg_catalog, %I, pg_temp', target_schema, object_name, target_schema);
    END LOOP;

    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC', target_schema);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM PUBLIC', target_schema);
    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC', target_schema);
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', target_schema);
    -- Schema-level revocation alone cannot remove PostgreSQL's built-in global
    -- default EXECUTE grant to PUBLIC for newly created functions.
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC', current_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON TABLES FROM PUBLIC', current_user, target_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM PUBLIC', current_user, target_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM PUBLIC', current_user, target_schema);
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM %I', target_schema, api_role);
        EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM %I', target_schema, api_role);
        EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM %I', target_schema, api_role);
        EXECUTE format('REVOKE ALL ON SCHEMA %I FROM %I', target_schema, api_role);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON TABLES FROM %I', current_user, api_role);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON SEQUENCES FROM %I', current_user, api_role);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON FUNCTIONS FROM %I', current_user, api_role);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON TABLES FROM %I', current_user, target_schema, api_role);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM %I', current_user, target_schema, api_role);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM %I', current_user, target_schema, api_role);
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role', target_schema);
    END IF;
END $$;

COMMIT;
