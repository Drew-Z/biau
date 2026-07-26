-- Public research assistant anonymous quality loop.
-- Raw turns expire after 30 days; aggregate rows intentionally retain no original question or answer.
CREATE TABLE "PublicAssistantSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicAssistantSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicAssistantDailyAggregate" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "topicFingerprint" TEXT NOT NULL,
    "topicTerms" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "siteEvidenceTotal" INTEGER NOT NULL DEFAULT 0,
    "webEvidenceTotal" INTEGER NOT NULL DEFAULT 0,
    "latencyTotalMs" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicAssistantDailyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicAssistantTurn" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "citationIdsJson" JSONB NOT NULL,
    "metricsJson" JSONB,
    "questionFingerprint" TEXT NOT NULL,
    "topicFingerprint" TEXT NOT NULL,
    "topicTerms" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicAssistantTurn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicAssistantFeedback" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicAssistantFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicAssistantSession_expiresAt_idx" ON "PublicAssistantSession"("expiresAt");
CREATE INDEX "PublicAssistantSession_lastActiveAt_idx" ON "PublicAssistantSession"("lastActiveAt");
CREATE INDEX "PublicAssistantTurn_sessionId_createdAt_idx" ON "PublicAssistantTurn"("sessionId", "createdAt");
CREATE INDEX "PublicAssistantTurn_status_createdAt_idx" ON "PublicAssistantTurn"("status", "createdAt");
CREATE INDEX "PublicAssistantTurn_topicFingerprint_createdAt_idx" ON "PublicAssistantTurn"("topicFingerprint", "createdAt");
CREATE INDEX "PublicAssistantTurn_expiresAt_idx" ON "PublicAssistantTurn"("expiresAt");
CREATE UNIQUE INDEX "PublicAssistantFeedback_turnId_key" ON "PublicAssistantFeedback"("turnId");
CREATE INDEX "PublicAssistantFeedback_sessionId_createdAt_idx" ON "PublicAssistantFeedback"("sessionId", "createdAt");
CREATE INDEX "PublicAssistantFeedback_rating_createdAt_idx" ON "PublicAssistantFeedback"("rating", "createdAt");
CREATE UNIQUE INDEX "PublicAssistantDailyAggregate_date_topicFingerprint_route_status_key" ON "PublicAssistantDailyAggregate"("date", "topicFingerprint", "route", "status");
CREATE INDEX "PublicAssistantDailyAggregate_date_status_idx" ON "PublicAssistantDailyAggregate"("date", "status");
CREATE INDEX "PublicAssistantDailyAggregate_negativeCount_totalCount_idx" ON "PublicAssistantDailyAggregate"("negativeCount", "totalCount");

ALTER TABLE "PublicAssistantTurn" ADD CONSTRAINT "PublicAssistantTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PublicAssistantSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicAssistantTurn" ADD CONSTRAINT "PublicAssistantTurn_aggregateId_fkey" FOREIGN KEY ("aggregateId") REFERENCES "PublicAssistantDailyAggregate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicAssistantFeedback" ADD CONSTRAINT "PublicAssistantFeedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PublicAssistantSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicAssistantFeedback" ADD CONSTRAINT "PublicAssistantFeedback_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "PublicAssistantTurn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
