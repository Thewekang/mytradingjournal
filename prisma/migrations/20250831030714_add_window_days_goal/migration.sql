-- AlterEnum
ALTER TYPE "public"."GoalType" ADD VALUE 'ROLLING_WINDOW_PNL';

-- AlterTable
ALTER TABLE "public"."Goal" ADD COLUMN     "windowDays" INTEGER;
