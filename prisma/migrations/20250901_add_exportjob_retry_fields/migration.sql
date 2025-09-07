-- Consolidated ExportJob creation (original create + retry/backoff + tokens + request id)
CREATE TABLE IF NOT EXISTS "ExportJob" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "paramsJson" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "request_id" TEXT,
  "error" TEXT,
  "filename" TEXT,
  "contentType" TEXT,
  "payloadBase64" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "downloadTokenExpiresAt" TIMESTAMP(3),
  "downloadTokenConsumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "ExportJob_user_created_idx" ON "ExportJob"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "ExportJob_status_created_idx" ON "ExportJob"("status","createdAt");
CREATE INDEX IF NOT EXISTS "ExportJob_next_attempt_idx" ON "ExportJob"("nextAttemptAt");
CREATE INDEX IF NOT EXISTS "ExportJob_request_id_idx" ON "ExportJob"("request_id");
CREATE INDEX IF NOT EXISTS "ExportJob_downloadTokenExpiresAt_idx" ON "ExportJob"("downloadTokenExpiresAt");
