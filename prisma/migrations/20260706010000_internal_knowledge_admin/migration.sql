-- CreateEnum
CREATE TYPE "InternalKnowledgeStatus" AS ENUM ('DRAFT', 'REVIEWED', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InternalKnowledgeSyncStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "InternalKnowledgeDocument" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" JSONB,
    "status" "InternalKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "safetyNotes" TEXT,
    "contentHash" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalKnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalKnowledgeSyncRun" (
    "id" TEXT NOT NULL,
    "status" "InternalKnowledgeSyncStatus" NOT NULL DEFAULT 'STARTED',
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "diagnostic" JSONB,

    CONSTRAINT "InternalKnowledgeSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalKnowledgeDocument_slug_key" ON "InternalKnowledgeDocument"("slug");
