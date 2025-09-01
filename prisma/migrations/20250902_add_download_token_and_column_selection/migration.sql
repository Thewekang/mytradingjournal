-- Add download token expiry/consumption tracking to ExportJob
ALTER TABLE "ExportJob"
ADD COLUMN "downloadTokenExpiresAt" TIMESTAMP NULL,
ADD COLUMN "downloadTokenConsumedAt" TIMESTAMP NULL;

-- (Optional) future: index for querying expired tokens for cleanup/audit
CREATE INDEX IF NOT EXISTS "ExportJob_downloadTokenExpiresAt_idx" ON "ExportJob" ("downloadTokenExpiresAt");
