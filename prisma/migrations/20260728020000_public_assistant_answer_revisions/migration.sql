-- Immutable answer revisions and saved conversation branches for the anonymous public assistant.
CREATE TYPE "PublicAssistantGenerationIntent" AS ENUM ('new_turn', 'answer_revision');

ALTER TABLE "PublicAssistantSession"
ADD COLUMN "activeBranchId" TEXT,
ADD COLUMN "branchSelectionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PublicAssistantRequest"
ADD COLUMN "intent" "PublicAssistantGenerationIntent" NOT NULL DEFAULT 'new_turn',
ADD COLUMN "claimedBranchSelectionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "revisionId" TEXT,
ADD COLUMN "branchId" TEXT,
ADD COLUMN "parentRevisionId" TEXT,
ADD COLUMN "baseRevisionId" TEXT;

ALTER TABLE "PublicAssistantTurn"
ADD COLUMN "parentRevisionId" TEXT;

CREATE TABLE "PublicAssistantAnswerRevision" (
    "id" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "basedOnRevisionId" TEXT,
    "answer" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "citationIdsJson" JSONB NOT NULL,
    "metricsJson" JSONB,
    "displaySnapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicAssistantAnswerRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicAssistantBranch" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "headRevisionId" TEXT,
    "forkedFromRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicAssistantBranch_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PublicAssistantAnswerRevision" (
    "id",
    "turnId",
    "aggregateId",
    "revisionNo",
    "basedOnRevisionId",
    "answer",
    "route",
    "status",
    "citationIdsJson",
    "metricsJson",
    "displaySnapshotJson",
    "createdAt",
    "expiresAt"
)
SELECT
    'legacy-revision-' || "id",
    "id",
    "aggregateId",
    1,
    NULL,
    "answer",
    "route",
    "status",
    "citationIdsJson",
    "metricsJson",
    "displaySnapshotJson",
    "createdAt",
    "expiresAt"
FROM "PublicAssistantTurn";

WITH ordered_turns AS (
    SELECT
        "id",
        LAG("id") OVER (
            PARTITION BY "sessionId"
            ORDER BY "createdAt" ASC, "id" ASC
        ) AS "previousTurnId"
    FROM "PublicAssistantTurn"
)
UPDATE "PublicAssistantTurn" AS turn
SET "parentRevisionId" = 'legacy-revision-' || ordered."previousTurnId"
FROM ordered_turns AS ordered
WHERE turn."id" = ordered."id"
  AND ordered."previousTurnId" IS NOT NULL;

WITH final_turns AS (
    SELECT DISTINCT ON ("sessionId")
        "sessionId",
        "id" AS "turnId",
        "createdAt",
        "expiresAt"
    FROM "PublicAssistantTurn"
    ORDER BY "sessionId", "createdAt" DESC, "id" DESC
)
INSERT INTO "PublicAssistantBranch" (
    "id",
    "sessionId",
    "ordinal",
    "headRevisionId",
    "forkedFromRevisionId",
    "createdAt",
    "lastActiveAt",
    "expiresAt"
)
SELECT
    'legacy-branch-' || final_turns."sessionId",
    final_turns."sessionId",
    1,
    'legacy-revision-' || final_turns."turnId",
    NULL,
    session."createdAt",
    session."lastActiveAt",
    session."expiresAt"
FROM final_turns
JOIN "PublicAssistantSession" AS session
  ON session."id" = final_turns."sessionId";

UPDATE "PublicAssistantSession"
SET "activeBranchId" = 'legacy-branch-' || "id"
WHERE EXISTS (
    SELECT 1
    FROM "PublicAssistantBranch"
    WHERE "PublicAssistantBranch"."id" = 'legacy-branch-' || "PublicAssistantSession"."id"
);

ALTER TABLE "PublicAssistantFeedback"
ADD COLUMN "revisionId" TEXT;

UPDATE "PublicAssistantFeedback"
SET "revisionId" = 'legacy-revision-' || "turnId";

ALTER TABLE "PublicAssistantFeedback"
ALTER COLUMN "revisionId" SET NOT NULL;

UPDATE "PublicAssistantRequest" AS request
SET
    "revisionId" = 'legacy-revision-' || request."turnId",
    "branchId" = 'legacy-branch-' || request."sessionId",
    "parentRevisionId" = turn."parentRevisionId"
FROM "PublicAssistantTurn" AS turn
WHERE request."turnId" = turn."id";

UPDATE "PublicAssistantRequest" AS request
SET "responseJson" =
    CASE
        WHEN jsonb_typeof(request."responseJson") = 'object' THEN request."responseJson"
        ELSE jsonb_build_object(
            'requestId', request."requestId",
            'answer', revision."answer",
            'status', revision."status",
            'claims', COALESCE(revision."displaySnapshotJson"->'claims', '[]'::jsonb),
            'citations', COALESCE(revision."displaySnapshotJson"->'citations', '[]'::jsonb),
            'suggestions', COALESCE(revision."displaySnapshotJson"->'suggestions', '[]'::jsonb),
            'sessionId', request."sessionId",
            'messageId', request."turnId",
            'meta', COALESCE(
                revision."displaySnapshotJson"->'meta',
                jsonb_build_object('mode', 'fallback', 'citationCount', 0)
            )
        )
    END
    || jsonb_build_object(
        'contractVersion', 2,
        'conversation', jsonb_build_object(
            'branchId', request."branchId",
            'branchOrdinal', branch."ordinal",
            'turnId', request."turnId",
            'revisionId', request."revisionId",
            'revisionNo', revision."revisionNo",
            'basedOnRevisionId', revision."basedOnRevisionId",
            'activated', true
        )
    )
FROM "PublicAssistantAnswerRevision" AS revision,
     "PublicAssistantBranch" AS branch
WHERE request."status" = 'completed'
  AND request."revisionId" = revision."id"
  AND branch."id" = request."branchId";

DROP INDEX "PublicAssistantRequest_turnId_key";
DROP INDEX "PublicAssistantFeedback_turnId_key";
DROP INDEX "PublicAssistantTurn_status_createdAt_idx";

ALTER TABLE "PublicAssistantFeedback"
DROP CONSTRAINT "PublicAssistantFeedback_turnId_fkey";

ALTER TABLE "PublicAssistantTurn"
DROP CONSTRAINT "PublicAssistantTurn_aggregateId_fkey";

ALTER TABLE "PublicAssistantTurn"
DROP COLUMN "aggregateId",
DROP COLUMN "answer",
DROP COLUMN "route",
DROP COLUMN "status",
DROP COLUMN "citationIdsJson",
DROP COLUMN "metricsJson",
DROP COLUMN "displaySnapshotJson";

ALTER TABLE "PublicAssistantFeedback"
DROP COLUMN "turnId";

CREATE UNIQUE INDEX "PublicAssistantSession_activeBranchId_key"
ON "PublicAssistantSession"("activeBranchId");

CREATE UNIQUE INDEX "PublicAssistantRequest_revisionId_key"
ON "PublicAssistantRequest"("revisionId");

CREATE INDEX "PublicAssistantRequest_turnId_createdAt_idx"
ON "PublicAssistantRequest"("turnId", "createdAt");

CREATE INDEX "PublicAssistantRequest_branchId_createdAt_idx"
ON "PublicAssistantRequest"("branchId", "createdAt");

CREATE INDEX "PublicAssistantTurn_parentRevisionId_idx"
ON "PublicAssistantTurn"("parentRevisionId");

CREATE UNIQUE INDEX "PublicAssistantAnswerRevision_turnId_revisionNo_key"
ON "PublicAssistantAnswerRevision"("turnId", "revisionNo");

CREATE INDEX "PublicAssistantAnswerRevision_turnId_createdAt_idx"
ON "PublicAssistantAnswerRevision"("turnId", "createdAt");

CREATE INDEX "PublicAssistantAnswerRevision_basedOnRevisionId_idx"
ON "PublicAssistantAnswerRevision"("basedOnRevisionId");

CREATE INDEX "PublicAssistantAnswerRevision_status_createdAt_idx"
ON "PublicAssistantAnswerRevision"("status", "createdAt");

CREATE INDEX "PublicAssistantAnswerRevision_expiresAt_idx"
ON "PublicAssistantAnswerRevision"("expiresAt");

CREATE UNIQUE INDEX "PublicAssistantBranch_sessionId_ordinal_key"
ON "PublicAssistantBranch"("sessionId", "ordinal");

CREATE INDEX "PublicAssistantBranch_sessionId_lastActiveAt_idx"
ON "PublicAssistantBranch"("sessionId", "lastActiveAt");

CREATE INDEX "PublicAssistantBranch_headRevisionId_idx"
ON "PublicAssistantBranch"("headRevisionId");

CREATE INDEX "PublicAssistantBranch_expiresAt_idx"
ON "PublicAssistantBranch"("expiresAt");

CREATE UNIQUE INDEX "PublicAssistantFeedback_revisionId_key"
ON "PublicAssistantFeedback"("revisionId");

ALTER TABLE "PublicAssistantSession"
ADD CONSTRAINT "PublicAssistantSession_activeBranchId_fkey"
FOREIGN KEY ("activeBranchId") REFERENCES "PublicAssistantBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantAnswerRevision"
ADD CONSTRAINT "PublicAssistantAnswerRevision_turnId_fkey"
FOREIGN KEY ("turnId") REFERENCES "PublicAssistantTurn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantAnswerRevision"
ADD CONSTRAINT "PublicAssistantAnswerRevision_aggregateId_fkey"
FOREIGN KEY ("aggregateId") REFERENCES "PublicAssistantDailyAggregate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantAnswerRevision"
ADD CONSTRAINT "PublicAssistantAnswerRevision_basedOnRevisionId_fkey"
FOREIGN KEY ("basedOnRevisionId") REFERENCES "PublicAssistantAnswerRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantTurn"
ADD CONSTRAINT "PublicAssistantTurn_parentRevisionId_fkey"
FOREIGN KEY ("parentRevisionId") REFERENCES "PublicAssistantAnswerRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantBranch"
ADD CONSTRAINT "PublicAssistantBranch_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "PublicAssistantSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantBranch"
ADD CONSTRAINT "PublicAssistantBranch_headRevisionId_fkey"
FOREIGN KEY ("headRevisionId") REFERENCES "PublicAssistantAnswerRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantBranch"
ADD CONSTRAINT "PublicAssistantBranch_forkedFromRevisionId_fkey"
FOREIGN KEY ("forkedFromRevisionId") REFERENCES "PublicAssistantAnswerRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantRequest"
ADD CONSTRAINT "PublicAssistantRequest_revisionId_fkey"
FOREIGN KEY ("revisionId") REFERENCES "PublicAssistantAnswerRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantRequest"
ADD CONSTRAINT "PublicAssistantRequest_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "PublicAssistantBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantRequest"
ADD CONSTRAINT "PublicAssistantRequest_parentRevisionId_fkey"
FOREIGN KEY ("parentRevisionId") REFERENCES "PublicAssistantAnswerRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantRequest"
ADD CONSTRAINT "PublicAssistantRequest_baseRevisionId_fkey"
FOREIGN KEY ("baseRevisionId") REFERENCES "PublicAssistantAnswerRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicAssistantFeedback"
ADD CONSTRAINT "PublicAssistantFeedback_revisionId_fkey"
FOREIGN KEY ("revisionId") REFERENCES "PublicAssistantAnswerRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "public_assistant_reject_revision_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'PublicAssistantAnswerRevision rows are immutable'
        USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER "PublicAssistantAnswerRevision_immutable"
BEFORE UPDATE ON "PublicAssistantAnswerRevision"
FOR EACH ROW
EXECUTE FUNCTION "public_assistant_reject_revision_update"();

CREATE FUNCTION "public_assistant_validate_graph_ownership"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    linked_session_id TEXT;
BEGIN
    IF TG_TABLE_NAME = 'PublicAssistantSession' THEN
        IF NEW."activeBranchId" IS NOT NULL THEN
            SELECT "sessionId" INTO linked_session_id
            FROM "PublicAssistantBranch"
            WHERE "id" = NEW."activeBranchId";
            IF linked_session_id IS DISTINCT FROM NEW."id" THEN
                RAISE EXCEPTION 'Public assistant active branch crosses session ownership'
                    USING ERRCODE = 'check_violation';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'PublicAssistantBranch' THEN
        IF NEW."headRevisionId" IS NOT NULL THEN
            SELECT turn."sessionId" INTO linked_session_id
            FROM "PublicAssistantAnswerRevision" AS revision
            JOIN "PublicAssistantTurn" AS turn ON turn."id" = revision."turnId"
            WHERE revision."id" = NEW."headRevisionId";
            IF linked_session_id IS DISTINCT FROM NEW."sessionId" THEN
                RAISE EXCEPTION 'Public assistant branch head crosses session ownership'
                    USING ERRCODE = 'check_violation';
            END IF;
        END IF;
        IF NEW."forkedFromRevisionId" IS NOT NULL THEN
            SELECT turn."sessionId" INTO linked_session_id
            FROM "PublicAssistantAnswerRevision" AS revision
            JOIN "PublicAssistantTurn" AS turn ON turn."id" = revision."turnId"
            WHERE revision."id" = NEW."forkedFromRevisionId";
            IF linked_session_id IS DISTINCT FROM NEW."sessionId" THEN
                RAISE EXCEPTION 'Public assistant branch origin crosses session ownership'
                    USING ERRCODE = 'check_violation';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'PublicAssistantTurn' THEN
        IF NEW."parentRevisionId" IS NOT NULL THEN
            SELECT parent_turn."sessionId" INTO linked_session_id
            FROM "PublicAssistantAnswerRevision" AS revision
            JOIN "PublicAssistantTurn" AS parent_turn ON parent_turn."id" = revision."turnId"
            WHERE revision."id" = NEW."parentRevisionId";
            IF linked_session_id IS DISTINCT FROM NEW."sessionId" THEN
                RAISE EXCEPTION 'Public assistant turn parent crosses session ownership'
                    USING ERRCODE = 'check_violation';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'PublicAssistantAnswerRevision' THEN
        IF NEW."basedOnRevisionId" IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM "PublicAssistantAnswerRevision" AS base
            WHERE base."id" = NEW."basedOnRevisionId"
              AND base."turnId" = NEW."turnId"
        ) THEN
            RAISE EXCEPTION 'Public assistant revision lineage crosses logical turns'
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'PublicAssistantRequest' THEN
        IF NEW."branchId" IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM "PublicAssistantBranch"
            WHERE "id" = NEW."branchId" AND "sessionId" = NEW."sessionId"
        ) THEN
            RAISE EXCEPTION 'Public assistant request branch crosses session ownership'
                USING ERRCODE = 'check_violation';
        END IF;
        IF NEW."turnId" IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM "PublicAssistantTurn"
            WHERE "id" = NEW."turnId" AND "sessionId" = NEW."sessionId"
        ) THEN
            RAISE EXCEPTION 'Public assistant request turn crosses session ownership'
                USING ERRCODE = 'check_violation';
        END IF;
        IF NEW."revisionId" IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM "PublicAssistantAnswerRevision" AS revision
            JOIN "PublicAssistantTurn" AS turn ON turn."id" = revision."turnId"
            WHERE revision."id" = NEW."revisionId" AND turn."sessionId" = NEW."sessionId"
        ) THEN
            RAISE EXCEPTION 'Public assistant request revision crosses session ownership'
                USING ERRCODE = 'check_violation';
        END IF;
        IF NEW."parentRevisionId" IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM "PublicAssistantAnswerRevision" AS revision
            JOIN "PublicAssistantTurn" AS turn ON turn."id" = revision."turnId"
            WHERE revision."id" = NEW."parentRevisionId" AND turn."sessionId" = NEW."sessionId"
        ) THEN
            RAISE EXCEPTION 'Public assistant request parent crosses session ownership'
                USING ERRCODE = 'check_violation';
        END IF;
        IF NEW."baseRevisionId" IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM "PublicAssistantAnswerRevision" AS revision
            JOIN "PublicAssistantTurn" AS turn ON turn."id" = revision."turnId"
            WHERE revision."id" = NEW."baseRevisionId" AND turn."sessionId" = NEW."sessionId"
        ) THEN
            RAISE EXCEPTION 'Public assistant request base crosses session ownership'
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'PublicAssistantFeedback' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM "PublicAssistantAnswerRevision" AS revision
            JOIN "PublicAssistantTurn" AS turn ON turn."id" = revision."turnId"
            WHERE revision."id" = NEW."revisionId" AND turn."sessionId" = NEW."sessionId"
        ) THEN
            RAISE EXCEPTION 'Public assistant feedback crosses session ownership'
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER "PublicAssistantSession_graph_ownership"
BEFORE INSERT OR UPDATE OF "activeBranchId" ON "PublicAssistantSession"
FOR EACH ROW
EXECUTE FUNCTION "public_assistant_validate_graph_ownership"();

CREATE TRIGGER "PublicAssistantBranch_graph_ownership"
BEFORE INSERT OR UPDATE OF "sessionId", "headRevisionId", "forkedFromRevisionId" ON "PublicAssistantBranch"
FOR EACH ROW
EXECUTE FUNCTION "public_assistant_validate_graph_ownership"();

CREATE TRIGGER "PublicAssistantTurn_graph_ownership"
BEFORE INSERT OR UPDATE OF "sessionId", "parentRevisionId" ON "PublicAssistantTurn"
FOR EACH ROW
EXECUTE FUNCTION "public_assistant_validate_graph_ownership"();

CREATE TRIGGER "PublicAssistantAnswerRevision_graph_ownership"
BEFORE INSERT ON "PublicAssistantAnswerRevision"
FOR EACH ROW
EXECUTE FUNCTION "public_assistant_validate_graph_ownership"();

CREATE TRIGGER "PublicAssistantRequest_graph_ownership"
BEFORE INSERT OR UPDATE OF "sessionId", "turnId", "revisionId", "branchId", "parentRevisionId", "baseRevisionId" ON "PublicAssistantRequest"
FOR EACH ROW
EXECUTE FUNCTION "public_assistant_validate_graph_ownership"();

CREATE TRIGGER "PublicAssistantFeedback_graph_ownership"
BEFORE INSERT OR UPDATE OF "sessionId", "revisionId" ON "PublicAssistantFeedback"
FOR EACH ROW
EXECUTE FUNCTION "public_assistant_validate_graph_ownership"();

REVOKE ALL ON FUNCTION "public_assistant_reject_revision_update"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public_assistant_validate_graph_ownership"() FROM PUBLIC;
