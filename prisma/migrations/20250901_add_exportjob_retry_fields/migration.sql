-- Add retry/backoff fields to ExportJob
ALTER TABLE "ExportJob"
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextAttemptAt" TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS "ExportJob_nextAttemptAt_idx" ON "ExportJob" ("nextAttemptAt");
