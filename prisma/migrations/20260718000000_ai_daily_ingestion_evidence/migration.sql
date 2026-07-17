-- AI Daily ingestion/evidence foundation.
-- This migration remains additive and does not enable live provider configuration.

ALTER TYPE "AiDailySourceFeedKind" ADD VALUE IF NOT EXISTS 'OFFICIAL_PAGE';
ALTER TYPE "AiDailySourceFeedKind" ADD VALUE IF NOT EXISTS 'GITHUB_RELEASES';
ALTER TYPE "AiDailySourceFeedKind" ADD VALUE IF NOT EXISTS 'HACKER_NEWS';

CREATE TYPE "AiDailySourceHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'FAILING');
CREATE TYPE "AiDailyEvidenceExtractionMethod" AS ENUM ('DIRECT', 'FIRECRAWL', 'TAVILY');
CREATE TYPE "AiDailyEvidenceDocumentStatus" AS ENUM ('READY', 'THIN', 'REJECTED');

ALTER TABLE "AiDailySourceFeed"
ADD COLUMN "lookbackMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN "etag" TEXT,
ADD COLUMN "lastModified" TEXT,
ADD COLUMN "lastAttemptedAt" TIMESTAMP(3),
ADD COLUMN "healthStatus" "AiDailySourceHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "lastLagMs" INTEGER;

ALTER TABLE "AiDailyCandidate"
ADD COLUMN "providerRole" TEXT NOT NULL DEFAULT 'stable',
ADD COLUMN "discoveryQueryGroup" TEXT,
ADD COLUMN "leadOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fetchAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastErrorCategory" TEXT,
ADD COLUMN "evidenceVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currentEvidenceId" TEXT;

ALTER TABLE "AiDailyCluster"
ADD COLUMN "scoreTotal" DOUBLE PRECISION,
ADD COLUMN "scoreJson" JSONB,
ADD COLUMN "selectedAt" TIMESTAMP(3);

CREATE TABLE "AiDailyEvidenceDocument" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "extractionMethod" "AiDailyEvidenceExtractionMethod" NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh',
    "contentType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "headingsJson" JSONB NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "normalizedBytes" INTEGER NOT NULL,
    "status" "AiDailyEvidenceDocumentStatus" NOT NULL,
    "errorCategory" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDailyEvidenceDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiDailyCandidate_currentEvidenceId_key" ON "AiDailyCandidate"("currentEvidenceId");
CREATE UNIQUE INDEX "AiDailyEvidenceDocument_candidateId_version_key" ON "AiDailyEvidenceDocument"("candidateId", "version");
CREATE INDEX "AiDailyCandidate_currentEvidenceId_idx" ON "AiDailyCandidate"("currentEvidenceId");
CREATE INDEX "AiDailyEvidenceDocument_candidateId_fetchedAt_idx" ON "AiDailyEvidenceDocument"("candidateId", "fetchedAt");
CREATE INDEX "AiDailyEvidenceDocument_contentHash_idx" ON "AiDailyEvidenceDocument"("contentHash");
CREATE INDEX "AiDailyEvidenceDocument_expiresAt_idx" ON "AiDailyEvidenceDocument"("expiresAt");

ALTER TABLE "AiDailyEvidenceDocument"
ADD CONSTRAINT "AiDailyEvidenceDocument_candidateId_fkey"
FOREIGN KEY ("candidateId") REFERENCES "AiDailyCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiDailyCandidate"
ADD CONSTRAINT "AiDailyCandidate_currentEvidenceId_fkey"
FOREIGN KEY ("currentEvidenceId") REFERENCES "AiDailyEvidenceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiDailySourceFeed"
ADD CONSTRAINT "AiDailySourceFeed_lookbackMinutes_check"
CHECK ("lookbackMinutes" >= "intervalMinutes" AND "lookbackMinutes" <= 2880);

ALTER TABLE "AiDailySourceFeed"
ADD CONSTRAINT "AiDailySourceFeed_lastLagMs_check"
CHECK ("lastLagMs" IS NULL OR "lastLagMs" >= 0);

ALTER TABLE "AiDailyCandidate"
ADD CONSTRAINT "AiDailyCandidate_evidenceVersion_check"
CHECK ("evidenceVersion" >= 0 AND "fetchAttemptCount" >= 0);

ALTER TABLE "AiDailyEvidenceDocument"
ADD CONSTRAINT "AiDailyEvidenceDocument_bounds_check"
CHECK (
    "version" > 0
    AND "normalizedBytes" >= 0
    AND "normalizedBytes" <= 65536
    AND octet_length("normalizedText") <= 65536
    AND octet_length("excerpt") <= 1024
);
