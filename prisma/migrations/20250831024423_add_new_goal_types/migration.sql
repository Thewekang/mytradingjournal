-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."GoalType" ADD VALUE 'PROFIT_FACTOR';
ALTER TYPE "public"."GoalType" ADD VALUE 'EXPECTANCY';
ALTER TYPE "public"."GoalType" ADD VALUE 'AVG_LOSS_CAP';
