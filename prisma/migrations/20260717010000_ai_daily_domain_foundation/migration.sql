-- AI Daily production-domain foundation.
-- This migration is additive: legacy issue status/source JSON remain available during the compatibility window.

-- CreateEnum
CREATE TYPE "AiDailyProfile" AS ENUM ('FIXTURE', 'DEGRADED', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "AiDailySourceFeedKind" AS ENUM ('RSS', 'API', 'SEARCH', 'MANUAL');

-- CreateEnum
CREATE TYPE "AiDailyRunTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'RETRY');

-- CreateEnum
CREATE TYPE "AiDailyRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_GAPS', 'FAILED_CONFIG', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiDailyRunStage" AS ENUM ('COLLECT', 'DISCOVER', 'FETCH', 'DEDUPE', 'GROUP', 'RANK', 'PROMOTE', 'EXTRACT_FACTS', 'COMPOSE', 'VERIFY', 'VALIDATE', 'DRAFT');

-- CreateEnum
CREATE TYPE "AiDailyEditorialState" AS ENUM ('COLLECTING', 'EVIDENCE_READY', 'NEEDS_MORE_EVIDENCE', 'REVIEW_NEEDED', 'EXPORTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiDailyWorkKind" AS ENUM ('COLLECT_FEED', 'DISCOVER', 'FETCH_SOURCE', 'DEDUPE', 'GROUP', 'RANK', 'PROMOTE', 'EXTRACT_FACTS', 'COMPOSE', 'VERIFY', 'VALIDATE', 'DRAFT');

-- CreateEnum
CREATE TYPE "AiDailyWorkStatus" AS ENUM ('PENDING', 'LEASED', 'RETRY_WAIT', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiDailyWorkAttemptOutcome" AS ENUM ('RUNNING', 'SUCCEEDED', 'RETRYABLE_FAILED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiDailyCandidateFetchStatus" AS ENUM ('DISCOVERED', 'FETCHED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AiDailyCandidateEvidenceStatus" AS ENUM ('UNCHECKED', 'READY', 'THIN', 'CONFLICTING', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiDailyCandidateSelectionState" AS ENUM ('CANDIDATE', 'SELECTED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "AiDailyClusterEditorState" AS ENUM ('AUTO', 'PROPOSED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiDailyGeneratedValidationStatus" AS ENUM ('VALID', 'NEEDS_EDITOR_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiDailyGeneratedApplyState" AS ENUM ('PENDING', 'APPLIED', 'BLOCKED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "AiDailyFlashLifecycleState" AS ENUM ('ACTIVE', 'HELD', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AiDailyFlashRevisionStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AiDailyApprovalActionKind" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'HELD', 'RELEASED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "SourceItem" ADD COLUMN     "canonicalKey" TEXT,
ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "canonicalizationVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "lastObservedAt" TIMESTAMP(3),
ADD COLUMN     "publisherDomain" TEXT,
ADD COLUMN     "titleFingerprint" TEXT;

-- AlterTable
ALTER TABLE "AiDailyIssue" ADD COLUMN     "deployedPublicAt" TIMESTAMP(3),
ADD COLUMN     "editionDate" DATE,
ADD COLUMN     "generatedRevisionSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "latestGeneratedRevisionId" TEXT,
ADD COLUMN     "newEvidenceAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selectedEvidenceVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "selectionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workflowState" "AiDailyEditorialState" NOT NULL DEFAULT 'COLLECTING';

-- Preserve existing source presentation fields while seeding machine-owned identity metadata.
UPDATE "SourceItem"
SET
    "canonicalUrl" = "url",
    "publisherDomain" = lower(substring("url" from '^[a-zA-Z]+://([^/:?#]+)')),
    "lastObservedAt" = COALESCE("publishedAt", "capturedAt")
WHERE "canonicalUrl" IS NULL;

-- Parse only real calendar dates. Invalid legacy strings remain NULL for explicit repair instead of being normalized.
DO $$
DECLARE
    issue_row RECORD;
    parsed_date DATE;
BEGIN
    FOR issue_row IN SELECT "id", "date" FROM "AiDailyIssue" LOOP
        BEGIN
            parsed_date := issue_row."date"::date;
            IF to_char(parsed_date, 'YYYY-MM-DD') = issue_row."date" THEN
                UPDATE "AiDailyIssue" SET "editionDate" = parsed_date WHERE "id" = issue_row."id";
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- Derive only states that existing rows can prove. Export/deployment truth is intentionally not inferred.
UPDATE "AiDailyIssue"
SET "workflowState" = CASE
    WHEN "status" = 'REJECTED' THEN 'REJECTED'::"AiDailyEditorialState"
    WHEN "status" = 'NEEDS_MORE_EVIDENCE' THEN 'NEEDS_MORE_EVIDENCE'::"AiDailyEditorialState"
    WHEN "draftId" IS NOT NULL THEN 'REVIEW_NEEDED'::"AiDailyEditorialState"
    ELSE 'COLLECTING'::"AiDailyEditorialState"
END;

-- CreateTable
CREATE TABLE "AiDailySourceFeed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AiDailySourceFeedKind" NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh',
    "tier" TEXT NOT NULL,
    "topicsJson" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "officialDomain" TEXT,
    "lastCollectedAt" TIMESTAMP(3),
    "lastSuccessfulAt" TIMESTAMP(3),
    "nextCollectAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCategory" TEXT,
    "lastErrorJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDailySourceFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyRun" (
    "id" TEXT NOT NULL,
    "issueId" TEXT,
    "editionDate" DATE NOT NULL,
    "profile" "AiDailyProfile" NOT NULL,
    "trigger" "AiDailyRunTrigger" NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "eventSequence" INTEGER NOT NULL DEFAULT 0,
    "status" "AiDailyRunStatus" NOT NULL DEFAULT 'QUEUED',
    "currentStage" "AiDailyRunStage",
    "configVersion" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "newestPublishedAt" TIMESTAMP(3),
    "lastTier1CollectedAt" TIMESTAMP(3),
    "lastCollectedAt" TIMESTAMP(3),
    "lastDiscoveredAt" TIMESTAMP(3),
    "lastFetchedAt" TIMESTAMP(3),
    "pipelineFreshnessAt" TIMESTAMP(3),
    "endToEndLagMs" INTEGER,
    "countersJson" JSONB,
    "finalErrorCategory" TEXT,
    "finalErrorJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDailyRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyRunEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "stage" "AiDailyRunStage",
    "kind" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "providerRole" TEXT,
    "attemptNumber" INTEGER,
    "errorCategory" TEXT,
    "durationMs" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDailyRunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyWorkItem" (
    "id" TEXT NOT NULL,
    "kind" "AiDailyWorkKind" NOT NULL,
    "editionDate" DATE,
    "runId" TEXT,
    "sourceFeedId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "AiDailyWorkStatus" NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "continuationCursorJson" JSONB,
    "deadlineAt" TIMESTAMP(3),
    "freshnessTargetAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastErrorCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDailyWorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyWorkAttempt" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "runId" TEXT,
    "leaseToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "outcome" "AiDailyWorkAttemptOutcome" NOT NULL DEFAULT 'RUNNING',
    "errorCategory" TEXT,
    "durationMs" INTEGER,
    "metadataJson" JSONB,

    CONSTRAINT "AiDailyWorkAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyCandidate" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceFeedId" TEXT,
    "providerKind" TEXT NOT NULL,
    "sourceExternalId" TEXT,
    "observationKey" TEXT NOT NULL DEFAULT 'primary',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "publisherDomain" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'zh',
    "sourceTier" TEXT NOT NULL,
    "titleFingerprint" TEXT,
    "contentHash" TEXT,
    "fetchStatus" "AiDailyCandidateFetchStatus" NOT NULL DEFAULT 'DISCOVERED',
    "evidenceStatus" "AiDailyCandidateEvidenceStatus" NOT NULL DEFAULT 'UNCHECKED',
    "fetchedAt" TIMESTAMP(3),
    "evidenceExcerpt" TEXT,
    "evidenceExpiresAt" TIMESTAMP(3),
    "duplicateOfCandidateId" TEXT,
    "clusterId" TEXT,
    "selectionState" "AiDailyCandidateSelectionState" NOT NULL DEFAULT 'CANDIDATE',
    "scoreTotal" DOUBLE PRECISION,
    "scoreJson" JSONB,
    "sourceItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDailyCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyCluster" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stableIdentityKey" TEXT NOT NULL,
    "representativeCandidateId" TEXT,
    "groupingReason" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "corroborationCount" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "editorState" "AiDailyClusterEditorState" NOT NULL DEFAULT 'AUTO',
    "editorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDailyCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyIssueSource" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "selectionVersion" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "selectedBy" TEXT NOT NULL,
    "selectionReason" TEXT,
    "evidenceVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDailyIssueSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyGeneratedRevision" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "selectionVersion" INTEGER NOT NULL,
    "evidenceVersion" INTEGER NOT NULL,
    "contentJson" JSONB NOT NULL,
    "sourceBindingsJson" JSONB NOT NULL,
    "citationSnapshotsJson" JSONB NOT NULL,
    "citationSchemaVersion" INTEGER NOT NULL DEFAULT 2,
    "promptVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "modelRole" TEXT NOT NULL,
    "modelIdentifier" TEXT NOT NULL,
    "observedDraftUpdatedAt" TIMESTAMP(3),
    "applyState" "AiDailyGeneratedApplyState" NOT NULL DEFAULT 'PENDING',
    "validationStatus" "AiDailyGeneratedValidationStatus" NOT NULL,
    "validationFindingsJson" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "AiDailyGeneratedRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyFlashItem" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "stableEventKey" TEXT NOT NULL,
    "sourceClusterIdentity" TEXT NOT NULL,
    "lifecycleState" "AiDailyFlashLifecycleState" NOT NULL DEFAULT 'ACTIVE',
    "currentApprovedRevisionId" TEXT,
    "revisionSequence" INTEGER NOT NULL DEFAULT 0,
    "publicRevision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastApprovedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "projectionUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "AiDailyFlashItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyFlashRevision" (
    "id" TEXT NOT NULL,
    "flashItemId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "generatedRevisionId" TEXT,
    "selectionVersion" INTEGER NOT NULL,
    "evidenceVersion" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "factSummary" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "uncertainty" TEXT,
    "correctionState" TEXT NOT NULL DEFAULT 'none',
    "correctedAt" TIMESTAMP(3),
    "citationSnapshotsJson" JSONB NOT NULL,
    "citationSchemaVersion" INTEGER NOT NULL DEFAULT 2,
    "status" "AiDailyFlashRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "editor" TEXT,
    "approvedAt" TIMESTAMP(3),
    "supersededRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDailyFlashRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDailyApprovalAction" (
    "id" TEXT NOT NULL,
    "flashItemId" TEXT NOT NULL,
    "flashRevisionId" TEXT,
    "action" "AiDailyApprovalActionKind" NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "observedRevisionNumber" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDailyApprovalAction_pkey" PRIMARY KEY ("id")
);

-- Backfill the legacy ordered source array without failing on missing/deleted SourceItem rows.
WITH expanded AS (
    SELECT
        issue."id" AS "issueId",
        source."sourceItemId",
        source."ordinality"
    FROM "AiDailyIssue" AS issue
    CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE
            WHEN jsonb_typeof(issue."sourceIdsJson") = 'array' THEN issue."sourceIdsJson"
            ELSE '[]'::jsonb
        END
    ) WITH ORDINALITY AS source("sourceItemId", "ordinality")
), deduplicated AS (
    SELECT DISTINCT ON ("issueId", "sourceItemId")
        "issueId",
        "sourceItemId",
        "ordinality"
    FROM expanded
    ORDER BY "issueId", "sourceItemId", "ordinality"
), ranked AS (
    SELECT
        deduplicated."issueId",
        deduplicated."sourceItemId",
        row_number() OVER (PARTITION BY deduplicated."issueId" ORDER BY deduplicated."ordinality") - 1 AS "position"
    FROM deduplicated
    INNER JOIN "SourceItem" AS source_item ON source_item."id" = deduplicated."sourceItemId"
)
INSERT INTO "AiDailyIssueSource" (
    "id",
    "issueId",
    "sourceItemId",
    "selectionVersion",
    "position",
    "selectedBy",
    "selectionReason",
    "evidenceVersion",
    "createdAt"
)
SELECT
    'legacy-' || md5(ranked."issueId" || ':' || ranked."sourceItemId" || ':0'),
    ranked."issueId",
    ranked."sourceItemId",
    0,
    ranked."position"::integer,
    'legacy-backfill',
    'sourceIdsJson compatibility backfill',
    0,
    CURRENT_TIMESTAMP
FROM ranked;

ALTER TABLE "AiDailySourceFeed"
    ADD CONSTRAINT "AiDailySourceFeed_intervalMinutes_check" CHECK ("intervalMinutes" > 0);
ALTER TABLE "AiDailyWorkItem"
    ADD CONSTRAINT "AiDailyWorkItem_attempts_check" CHECK ("attemptCount" >= 0 AND "maxAttempts" > 0);
ALTER TABLE "AiDailyIssueSource"
    ADD CONSTRAINT "AiDailyIssueSource_versions_check" CHECK ("selectionVersion" >= 0 AND "evidenceVersion" >= 0 AND "position" >= 0);
ALTER TABLE "AiDailyGeneratedRevision"
    ADD CONSTRAINT "AiDailyGeneratedRevision_versions_check" CHECK ("revisionNumber" > 0 AND "selectionVersion" >= 0 AND "evidenceVersion" >= 0 AND "citationSchemaVersion" = 2);
ALTER TABLE "AiDailyFlashRevision"
    ADD CONSTRAINT "AiDailyFlashRevision_versions_check" CHECK ("revisionNumber" > 0 AND "selectionVersion" >= 0 AND "evidenceVersion" >= 0 AND "citationSchemaVersion" = 2);

-- CreateIndex
CREATE INDEX "AiDailySourceFeed_enabled_nextCollectAt_idx" ON "AiDailySourceFeed"("enabled", "nextCollectAt");

-- CreateIndex
CREATE INDEX "AiDailySourceFeed_tier_enabled_lastSuccessfulAt_idx" ON "AiDailySourceFeed"("tier", "enabled", "lastSuccessfulAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailySourceFeed_kind_canonicalKey_key" ON "AiDailySourceFeed"("kind", "canonicalKey");

-- CreateIndex
CREATE INDEX "AiDailyRun_editionDate_status_idx" ON "AiDailyRun"("editionDate", "status");

-- CreateIndex
CREATE INDEX "AiDailyRun_status_currentStage_createdAt_idx" ON "AiDailyRun"("status", "currentStage", "createdAt");

-- CreateIndex
CREATE INDEX "AiDailyRun_issueId_idx" ON "AiDailyRun"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyRun_editionDate_attemptNumber_key" ON "AiDailyRun"("editionDate", "attemptNumber");

-- CreateIndex
CREATE INDEX "AiDailyRunEvent_runId_createdAt_idx" ON "AiDailyRunEvent"("runId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyRunEvent_runId_sequence_key" ON "AiDailyRunEvent"("runId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyWorkItem_idempotencyKey_key" ON "AiDailyWorkItem"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiDailyWorkItem_status_availableAt_priority_idx" ON "AiDailyWorkItem"("status", "availableAt", "priority");

-- CreateIndex
CREATE INDEX "AiDailyWorkItem_leaseExpiresAt_idx" ON "AiDailyWorkItem"("leaseExpiresAt");

-- CreateIndex
CREATE INDEX "AiDailyWorkItem_editionDate_kind_status_idx" ON "AiDailyWorkItem"("editionDate", "kind", "status");

-- CreateIndex
CREATE INDEX "AiDailyWorkItem_runId_idx" ON "AiDailyWorkItem"("runId");

-- CreateIndex
CREATE INDEX "AiDailyWorkItem_sourceFeedId_idx" ON "AiDailyWorkItem"("sourceFeedId");

-- CreateIndex
CREATE INDEX "AiDailyWorkAttempt_workItemId_startedAt_idx" ON "AiDailyWorkAttempt"("workItemId", "startedAt");

-- CreateIndex
CREATE INDEX "AiDailyWorkAttempt_runId_idx" ON "AiDailyWorkAttempt"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyWorkAttempt_workItemId_attemptNumber_key" ON "AiDailyWorkAttempt"("workItemId", "attemptNumber");

-- CreateIndex
CREATE INDEX "AiDailyCandidate_canonicalKey_idx" ON "AiDailyCandidate"("canonicalKey");

-- CreateIndex
CREATE INDEX "AiDailyCandidate_runId_selectionState_scoreTotal_idx" ON "AiDailyCandidate"("runId", "selectionState", "scoreTotal");

-- CreateIndex
CREATE INDEX "AiDailyCandidate_evidenceExpiresAt_idx" ON "AiDailyCandidate"("evidenceExpiresAt");

-- CreateIndex
CREATE INDEX "AiDailyCandidate_sourceItemId_idx" ON "AiDailyCandidate"("sourceItemId");

-- CreateIndex
CREATE INDEX "AiDailyCandidate_sourceFeedId_idx" ON "AiDailyCandidate"("sourceFeedId");

-- CreateIndex
CREATE INDEX "AiDailyCandidate_clusterId_idx" ON "AiDailyCandidate"("clusterId");

-- CreateIndex
CREATE INDEX "AiDailyCandidate_duplicateOfCandidateId_idx" ON "AiDailyCandidate"("duplicateOfCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyCandidate_runId_canonicalKey_observationKey_key" ON "AiDailyCandidate"("runId", "canonicalKey", "observationKey");

-- CreateIndex
CREATE INDEX "AiDailyCluster_runId_rank_idx" ON "AiDailyCluster"("runId", "rank");

-- CreateIndex
CREATE INDEX "AiDailyCluster_representativeCandidateId_idx" ON "AiDailyCluster"("representativeCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyCluster_runId_stableIdentityKey_key" ON "AiDailyCluster"("runId", "stableIdentityKey");

-- CreateIndex
CREATE INDEX "AiDailyIssueSource_issueId_selectionVersion_position_idx" ON "AiDailyIssueSource"("issueId", "selectionVersion", "position");

-- CreateIndex
CREATE INDEX "AiDailyIssueSource_sourceItemId_idx" ON "AiDailyIssueSource"("sourceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyIssueSource_issueId_selectionVersion_sourceItemId_key" ON "AiDailyIssueSource"("issueId", "selectionVersion", "sourceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyIssueSource_issueId_selectionVersion_position_key" ON "AiDailyIssueSource"("issueId", "selectionVersion", "position");

-- CreateIndex
CREATE INDEX "AiDailyGeneratedRevision_issueId_validationStatus_createdAt_idx" ON "AiDailyGeneratedRevision"("issueId", "validationStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyGeneratedRevision_issueId_revisionNumber_key" ON "AiDailyGeneratedRevision"("issueId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyFlashItem_publicId_key" ON "AiDailyFlashItem"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyFlashItem_stableEventKey_key" ON "AiDailyFlashItem"("stableEventKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyFlashItem_currentApprovedRevisionId_key" ON "AiDailyFlashItem"("currentApprovedRevisionId");

-- CreateIndex
CREATE INDEX "AiDailyFlashItem_lifecycleState_lastApprovedAt_idx" ON "AiDailyFlashItem"("lifecycleState", "lastApprovedAt");

-- CreateIndex
CREATE INDEX "AiDailyFlashItem_retentionUntil_idx" ON "AiDailyFlashItem"("retentionUntil");

-- CreateIndex
CREATE INDEX "AiDailyFlashRevision_flashItemId_status_createdAt_idx" ON "AiDailyFlashRevision"("flashItemId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AiDailyFlashRevision_generatedRevisionId_idx" ON "AiDailyFlashRevision"("generatedRevisionId");

-- CreateIndex
CREATE INDEX "AiDailyFlashRevision_supersededRevisionId_idx" ON "AiDailyFlashRevision"("supersededRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyFlashRevision_flashItemId_revisionNumber_key" ON "AiDailyFlashRevision"("flashItemId", "revisionNumber");

-- The approval transaction supersedes the previous revision before approving the next one.
CREATE UNIQUE INDEX "AiDailyFlashRevision_one_approved_per_item_key"
ON "AiDailyFlashRevision"("flashItemId")
WHERE "status" = 'APPROVED';

-- CreateIndex
CREATE INDEX "AiDailyApprovalAction_flashItemId_createdAt_id_idx" ON "AiDailyApprovalAction"("flashItemId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AiDailyApprovalAction_flashRevisionId_createdAt_idx" ON "AiDailyApprovalAction"("flashRevisionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceItem_canonicalKey_key" ON "SourceItem"("canonicalKey");

-- CreateIndex
CREATE INDEX "SourceItem_publisherDomain_publishedAt_idx" ON "SourceItem"("publisherDomain", "publishedAt");

-- CreateIndex
CREATE INDEX "SourceItem_contentHash_idx" ON "SourceItem"("contentHash");

-- CreateIndex
CREATE INDEX "SourceItem_titleFingerprint_idx" ON "SourceItem"("titleFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyIssue_editionDate_key" ON "AiDailyIssue"("editionDate");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyIssue_latestGeneratedRevisionId_key" ON "AiDailyIssue"("latestGeneratedRevisionId");

-- CreateIndex
CREATE INDEX "AiDailyIssue_status_date_idx" ON "AiDailyIssue"("status", "date");

-- CreateIndex
CREATE INDEX "AiDailyIssue_workflowState_editionDate_idx" ON "AiDailyIssue"("workflowState", "editionDate");

-- CreateIndex
CREATE INDEX "AiDailyIssue_draftId_idx" ON "AiDailyIssue"("draftId");

-- AddForeignKey
ALTER TABLE "AiDailyIssue" ADD CONSTRAINT "AiDailyIssue_latestGeneratedRevisionId_fkey" FOREIGN KEY ("latestGeneratedRevisionId") REFERENCES "AiDailyGeneratedRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyRun" ADD CONSTRAINT "AiDailyRun_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AiDailyIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyRunEvent" ADD CONSTRAINT "AiDailyRunEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiDailyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyWorkItem" ADD CONSTRAINT "AiDailyWorkItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiDailyRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyWorkItem" ADD CONSTRAINT "AiDailyWorkItem_sourceFeedId_fkey" FOREIGN KEY ("sourceFeedId") REFERENCES "AiDailySourceFeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyWorkAttempt" ADD CONSTRAINT "AiDailyWorkAttempt_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "AiDailyWorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyWorkAttempt" ADD CONSTRAINT "AiDailyWorkAttempt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiDailyRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyCandidate" ADD CONSTRAINT "AiDailyCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiDailyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyCandidate" ADD CONSTRAINT "AiDailyCandidate_sourceFeedId_fkey" FOREIGN KEY ("sourceFeedId") REFERENCES "AiDailySourceFeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyCandidate" ADD CONSTRAINT "AiDailyCandidate_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyCandidate" ADD CONSTRAINT "AiDailyCandidate_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "AiDailyCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyCandidate" ADD CONSTRAINT "AiDailyCandidate_duplicateOfCandidateId_fkey" FOREIGN KEY ("duplicateOfCandidateId") REFERENCES "AiDailyCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyCluster" ADD CONSTRAINT "AiDailyCluster_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiDailyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyCluster" ADD CONSTRAINT "AiDailyCluster_representativeCandidateId_fkey" FOREIGN KEY ("representativeCandidateId") REFERENCES "AiDailyCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyIssueSource" ADD CONSTRAINT "AiDailyIssueSource_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AiDailyIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyIssueSource" ADD CONSTRAINT "AiDailyIssueSource_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyGeneratedRevision" ADD CONSTRAINT "AiDailyGeneratedRevision_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AiDailyIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyFlashItem" ADD CONSTRAINT "AiDailyFlashItem_currentApprovedRevisionId_fkey" FOREIGN KEY ("currentApprovedRevisionId") REFERENCES "AiDailyFlashRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyFlashRevision" ADD CONSTRAINT "AiDailyFlashRevision_flashItemId_fkey" FOREIGN KEY ("flashItemId") REFERENCES "AiDailyFlashItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyFlashRevision" ADD CONSTRAINT "AiDailyFlashRevision_generatedRevisionId_fkey" FOREIGN KEY ("generatedRevisionId") REFERENCES "AiDailyGeneratedRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyFlashRevision" ADD CONSTRAINT "AiDailyFlashRevision_supersededRevisionId_fkey" FOREIGN KEY ("supersededRevisionId") REFERENCES "AiDailyFlashRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyApprovalAction" ADD CONSTRAINT "AiDailyApprovalAction_flashItemId_fkey" FOREIGN KEY ("flashItemId") REFERENCES "AiDailyFlashItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDailyApprovalAction" ADD CONSTRAINT "AiDailyApprovalAction_flashRevisionId_fkey" FOREIGN KEY ("flashRevisionId") REFERENCES "AiDailyFlashRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Revision content is immutable; lifecycle/approval metadata may still advance through guarded transactions.
CREATE FUNCTION "protect_ai_daily_flash_revision_content"() RETURNS trigger AS $$
BEGIN
    IF ROW(
        OLD."flashItemId",
        OLD."revisionNumber",
        OLD."generatedRevisionId",
        OLD."selectionVersion",
        OLD."evidenceVersion",
        OLD."title",
        OLD."factSummary",
        OLD."whyItMatters",
        OLD."uncertainty",
        OLD."citationSnapshotsJson",
        OLD."citationSchemaVersion",
        OLD."createdAt"
    ) IS DISTINCT FROM ROW(
        NEW."flashItemId",
        NEW."revisionNumber",
        NEW."generatedRevisionId",
        NEW."selectionVersion",
        NEW."evidenceVersion",
        NEW."title",
        NEW."factSummary",
        NEW."whyItMatters",
        NEW."uncertainty",
        NEW."citationSnapshotsJson",
        NEW."citationSchemaVersion",
        NEW."createdAt"
    ) THEN
        RAISE EXCEPTION 'ai-daily-flash-revision-content-is-immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AiDailyFlashRevision_protect_content"
BEFORE UPDATE ON "AiDailyFlashRevision"
FOR EACH ROW EXECUTE FUNCTION "protect_ai_daily_flash_revision_content"();

-- Approval history is append-only audit data.
CREATE FUNCTION "protect_ai_daily_approval_history"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ai-daily-approval-history-is-append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AiDailyApprovalAction_prevent_update"
BEFORE UPDATE ON "AiDailyApprovalAction"
FOR EACH ROW EXECUTE FUNCTION "protect_ai_daily_approval_history"();

CREATE TRIGGER "AiDailyApprovalAction_prevent_delete"
BEFORE DELETE ON "AiDailyApprovalAction"
FOR EACH ROW EXECUTE FUNCTION "protect_ai_daily_approval_history"();
