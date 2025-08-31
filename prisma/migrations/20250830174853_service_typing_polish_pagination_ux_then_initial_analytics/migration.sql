-- Ensure soft delete column exists (robust for shadow DB rebuild)
ALTER TABLE "public"."Trade" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
-- Ensure supporting index exists
DO $$ BEGIN
	CREATE INDEX IF NOT EXISTS "Trade_userId_deletedAt_idx" ON "public"."Trade"("userId", "deletedAt");
EXCEPTION WHEN others THEN NULL; END $$;
