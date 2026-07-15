-- Create the owner-only Operator workspace without deleting legacy member data.
CREATE TABLE "OperatorSession" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperatorSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperatorMessage" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sessionId" TEXT,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperatorMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperatorMemory" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sessionId" TEXT,
    "sourceMessageId" TEXT,
    "kind" "AgentMemoryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" "AgentMemoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperatorMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperatorUsageLog" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "model" TEXT,
    "modelChannelId" TEXT,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperatorUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperatorSession_ownerId_archivedAt_lastMessageAt_idx" ON "OperatorSession"("ownerId", "archivedAt", "lastMessageAt");
CREATE INDEX "OperatorMessage_ownerId_sessionId_createdAt_idx" ON "OperatorMessage"("ownerId", "sessionId", "createdAt");
CREATE UNIQUE INDEX "OperatorMemory_ownerId_contentHash_key" ON "OperatorMemory"("ownerId", "contentHash");
CREATE INDEX "OperatorMemory_ownerId_status_updatedAt_idx" ON "OperatorMemory"("ownerId", "status", "updatedAt");
CREATE INDEX "OperatorMemory_sessionId_idx" ON "OperatorMemory"("sessionId");
CREATE INDEX "OperatorMemory_sourceMessageId_idx" ON "OperatorMemory"("sourceMessageId");
CREATE INDEX "OperatorUsageLog_ownerId_createdAt_idx" ON "OperatorUsageLog"("ownerId", "createdAt");

ALTER TABLE "OperatorMessage" ADD CONSTRAINT "OperatorMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OperatorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperatorMemory" ADD CONSTRAINT "OperatorMemory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OperatorSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperatorMemory" ADD CONSTRAINT "OperatorMemory_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "OperatorMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep the legacy member attribution column intact so the previous service
-- revision remains a viable rollback target until the Operator flow is accepted.
ALTER TABLE "InternalKnowledgeDocument" ADD COLUMN "createdByOperatorId" TEXT;
