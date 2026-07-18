-- AI Daily editorial overrides remain append-only and sit beside automated projections.
CREATE TYPE "AiDailyEditorialOverrideAction" AS ENUM (
    'INCLUDE',
    'EXCLUDE',
    'REORDER',
    'MERGE',
    'SPLIT',
    'REQUEST_EVIDENCE'
);

CREATE TABLE "AiDailyEditorialOverride" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "candidateId" TEXT,
    "clusterId" TEXT,
    "action" "AiDailyEditorialOverrideAction" NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "expectedUpdatedAt" TIMESTAMP(3),
    "observedVersion" INTEGER,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDailyEditorialOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiDailyEditorialOverride_runId_createdAt_id_idx"
ON "AiDailyEditorialOverride"("runId", "createdAt", "id");
CREATE INDEX "AiDailyEditorialOverride_candidateId_createdAt_idx"
ON "AiDailyEditorialOverride"("candidateId", "createdAt");
CREATE INDEX "AiDailyEditorialOverride_clusterId_createdAt_idx"
ON "AiDailyEditorialOverride"("clusterId", "createdAt");
CREATE INDEX "AiDailyEditorialOverride_action_createdAt_idx"
ON "AiDailyEditorialOverride"("action", "createdAt");

ALTER TABLE "AiDailyEditorialOverride"
ADD CONSTRAINT "AiDailyEditorialOverride_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "AiDailyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiDailyEditorialOverride"
ADD CONSTRAINT "AiDailyEditorialOverride_candidateId_fkey"
FOREIGN KEY ("candidateId") REFERENCES "AiDailyCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiDailyEditorialOverride"
ADD CONSTRAINT "AiDailyEditorialOverride_clusterId_fkey"
FOREIGN KEY ("clusterId") REFERENCES "AiDailyCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
