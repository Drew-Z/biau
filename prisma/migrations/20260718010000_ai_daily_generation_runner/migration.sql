-- CreateTable
CREATE TABLE "AiDailyGenerationCheckpoint" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stage" "AiDailyRunStage" NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDailyGenerationCheckpoint_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AiDailyGeneratedRevision"
ADD COLUMN "generationKey" TEXT,
ADD COLUMN "projectionDraftId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyGenerationCheckpoint_runId_stage_key"
ON "AiDailyGenerationCheckpoint"("runId", "stage");

-- CreateIndex
CREATE INDEX "AiDailyGenerationCheckpoint_runId_createdAt_idx"
ON "AiDailyGenerationCheckpoint"("runId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyGeneratedRevision_generationKey_key"
ON "AiDailyGeneratedRevision"("generationKey");

-- AddForeignKey
ALTER TABLE "AiDailyGenerationCheckpoint"
ADD CONSTRAINT "AiDailyGenerationCheckpoint_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "AiDailyRun"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
