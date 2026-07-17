-- Bind every new Publish Export to the exact approved draft snapshot and
-- review that authorized it. Existing rows stay nullable and must be replaced
-- before another callback can be accepted.
ALTER TABLE "PublishExport"
ADD COLUMN "reviewId" TEXT,
ADD COLUMN "draftUpdatedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "PublishExport_draftId_draftUpdatedAt_key"
ON "PublishExport"("draftId", "draftUpdatedAt");

ALTER TABLE "PublishExport"
ADD CONSTRAINT "PublishExport_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "ContentReview"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
