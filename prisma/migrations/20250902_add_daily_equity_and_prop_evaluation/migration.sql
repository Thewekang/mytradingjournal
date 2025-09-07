-- Migration: add DailyEquity + PropEvaluation tables
-- NOTE: Review trailing drawdown requirements before production.

CREATE TABLE "DailyEquity" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "realizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cumulativeEquity" DOUBLE PRECISION NOT NULL,
  "tradeCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DailyEquity_userId_date_unique" UNIQUE ("userId","date"),
  CONSTRAINT "DailyEquity_user_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "DailyEquity_userId_date_idx" ON "DailyEquity" ("userId","date");

CREATE TABLE "PropEvaluation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "firmName" TEXT NOT NULL,
  "phase" TEXT NOT NULL DEFAULT 'PHASE1',
  "accountSize" DOUBLE PRECISION NOT NULL,
  "profitTarget" DOUBLE PRECISION NOT NULL,
  "maxDailyLoss" DOUBLE PRECISION NOT NULL,
  "maxOverallLoss" DOUBLE PRECISION NOT NULL,
  "trailing" BOOLEAN NOT NULL DEFAULT false,
  "minTradingDays" INTEGER NOT NULL DEFAULT 0,
  "consistencyBand" DOUBLE PRECISION DEFAULT 0.4,
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "cumulativeProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "peakEquity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "PropEvaluation_user_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "PropEvaluation_user_status_idx" ON "PropEvaluation" ("userId","status");
