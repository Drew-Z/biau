-- Store sanitized assistant answer metadata with persisted chat messages.
ALTER TABLE "ChatMessage" ADD COLUMN "meta" JSONB;
