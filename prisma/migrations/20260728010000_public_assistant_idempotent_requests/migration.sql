CREATE TYPE "PublicAssistantRequestStatus" AS ENUM ('processing', 'completed', 'retryable_failed', 'failed', 'cancelled');

CREATE TABLE "PublicAssistantRequest" (
    "requestId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "PublicAssistantRequestStatus" NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "leaseToken" TEXT NOT NULL,
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "turnId" TEXT,
    "responseJson" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicAssistantRequest_pkey" PRIMARY KEY ("requestId")
);

CREATE UNIQUE INDEX "PublicAssistantRequest_turnId_key" ON "PublicAssistantRequest"("turnId");
CREATE INDEX "PublicAssistantRequest_status_leaseExpiresAt_idx" ON "PublicAssistantRequest"("status", "leaseExpiresAt");
CREATE INDEX "PublicAssistantRequest_sessionId_createdAt_idx" ON "PublicAssistantRequest"("sessionId", "createdAt");
CREATE INDEX "PublicAssistantRequest_expiresAt_idx" ON "PublicAssistantRequest"("expiresAt");

ALTER TABLE "PublicAssistantRequest"
ADD CONSTRAINT "PublicAssistantRequest_turnId_fkey"
FOREIGN KEY ("turnId") REFERENCES "PublicAssistantTurn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
