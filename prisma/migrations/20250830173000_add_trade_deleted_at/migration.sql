-- Add soft delete column to Trade (reordered before later alter migration)
ALTER TABLE "public"."Trade" ADD COLUMN "deletedAt" TIMESTAMP;
CREATE INDEX "Trade_userId_deletedAt_idx" ON "public"."Trade"("userId", "deletedAt");
