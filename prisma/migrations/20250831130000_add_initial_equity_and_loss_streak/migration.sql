-- Add initialEquity and maxConsecutiveLossesThreshold to JournalSettings
ALTER TABLE "JournalSettings" ADD COLUMN "initialEquity" DOUBLE PRECISION NOT NULL DEFAULT 100000;
ALTER TABLE "JournalSettings" ADD COLUMN "maxConsecutiveLossesThreshold" INTEGER NOT NULL DEFAULT 5;
