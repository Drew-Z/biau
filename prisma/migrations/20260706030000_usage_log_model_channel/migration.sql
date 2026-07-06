-- Store the low-sensitive resolved model channel id used by each assistant call.
ALTER TABLE "UsageLog" ADD COLUMN "modelChannelId" TEXT;
