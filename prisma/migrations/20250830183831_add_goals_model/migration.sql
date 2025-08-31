-- CreateEnum
CREATE TYPE "public"."GoalType" AS ENUM ('TOTAL_PNL', 'TRADE_COUNT', 'WIN_RATE');

-- CreateEnum
CREATE TYPE "public"."GoalPeriod" AS ENUM ('MONTH', 'QUARTER', 'YEAR');

-- AlterTable
ALTER TABLE "public"."Trade" ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."GoalType" NOT NULL,
    "period" "public"."GoalPeriod" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_userId_period_endDate_idx" ON "public"."Goal"("userId", "period", "endDate");

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
