-- Generated revisions retain immutable editor corrections and explicit lifecycle metadata.
CREATE TYPE "AiDailyGeneratedRevisionKind" AS ENUM (
    'GENERATED',
    'EDITOR_CORRECTION'
);

ALTER TABLE "AiDailyGeneratedRevision"
    ADD COLUMN "revisionKind" "AiDailyGeneratedRevisionKind" NOT NULL DEFAULT 'GENERATED',
    ADD COLUMN "sourceRevisionId" TEXT,
    ADD COLUMN "revalidatedAt" TIMESTAMP(3),
    ADD COLUMN "validatedBy" TEXT,
    ADD COLUMN "discardedAt" TIMESTAMP(3),
    ADD COLUMN "discardedBy" TEXT,
    ADD COLUMN "discardReason" TEXT;

CREATE INDEX "AiDailyGeneratedRevision_sourceRevisionId_idx"
ON "AiDailyGeneratedRevision"("sourceRevisionId");

ALTER TABLE "AiDailyGeneratedRevision"
ADD CONSTRAINT "AiDailyGeneratedRevision_sourceRevisionId_fkey"
FOREIGN KEY ("sourceRevisionId") REFERENCES "AiDailyGeneratedRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
