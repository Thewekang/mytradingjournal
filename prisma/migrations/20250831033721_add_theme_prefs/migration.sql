-- AlterTable
ALTER TABLE "public"."JournalSettings" ADD COLUMN     "highContrast" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'dark';
