-- CreateEnum
CREATE TYPE "AgentMemoryKind" AS ENUM ('PREFERENCE', 'PROJECT', 'WORKFLOW', 'CONTEXT');

-- CreateEnum
CREATE TYPE "AgentMemoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
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

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentMemory_memberId_contentHash_key" ON "AgentMemory"("memberId", "contentHash");

-- CreateIndex
CREATE INDEX "AgentMemory_memberId_status_updatedAt_idx" ON "AgentMemory"("memberId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentMemory_sessionId_idx" ON "AgentMemory"("sessionId");

-- CreateIndex
CREATE INDEX "AgentMemory_sourceMessageId_idx" ON "AgentMemory"("sourceMessageId");

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
