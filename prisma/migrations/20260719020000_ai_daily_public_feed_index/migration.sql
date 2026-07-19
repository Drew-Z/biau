-- Bound the public Flash projection query by lifecycle, approval time, and stable public id.
CREATE INDEX "AiDailyFlashItem_lifecycleState_lastApprovedAt_publicId_idx"
ON "AiDailyFlashItem"("lifecycleState", "lastApprovedAt", "publicId");

DROP INDEX IF EXISTS "AiDailyFlashItem_lifecycleState_lastApprovedAt_idx";
