-- Baseline consolidated migration (Option B reset)
-- This file represents the full current schema as of 2025-09-05 after drift resolution.
-- Apply only on a RESET dev database. Do NOT apply to prod if existing data present.

-- Drop existing tables if present (dev reset safeguard)
DROP TABLE IF EXISTS "TradeTagOnTrade" CASCADE;
DROP TABLE IF EXISTS "RiskBreachLog" CASCADE;
DROP TABLE IF EXISTS "DailyEquity" CASCADE;
DROP TABLE IF EXISTS "ExportJob" CASCADE;
DROP TABLE IF EXISTS "PropEvaluation" CASCADE;
DROP TABLE IF EXISTS "Goal" CASCADE;
DROP TABLE IF EXISTS "JournalSettings" CASCADE;
DROP TABLE IF EXISTS "TradeTag" CASCADE;
DROP TABLE IF EXISTS "Trade" CASCADE;
DROP TABLE IF EXISTS "Instrument" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Enums
DO $$ BEGIN
  CREATE TYPE "TradeDirection" AS ENUM ('LONG','SHORT');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TradeStatus" AS ENUM ('OPEN','CLOSED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER','ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "GoalType" AS ENUM ('TOTAL_PNL','TRADE_COUNT','WIN_RATE','PROFIT_FACTOR','EXPECTANCY','AVG_LOSS_CAP','DAILY_GREEN_STREAK','ROLLING_30D_PNL','ROLLING_WINDOW_PNL');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "GoalPeriod" AS ENUM ('MONTH','QUARTER','YEAR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Core tables
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "image" TEXT,
  "passwordHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Instrument" (
  "id" TEXT PRIMARY KEY,
  "symbol" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "tickSize" DOUBLE PRECISION NOT NULL,
  "contractMultiplier" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TradeTag" (
  "id" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#3b82f6',
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "JournalSettings" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
  "riskPerTradePct" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "maxDailyLossPct" DOUBLE PRECISION NOT NULL DEFAULT 3,
  "initialEquity" DOUBLE PRECISION NOT NULL DEFAULT 100000,
  "maxConsecutiveLossesThreshold" INTEGER NOT NULL DEFAULT 5,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "theme" TEXT NOT NULL DEFAULT 'dark',
  "highContrast" BOOLEAN NOT NULL DEFAULT false,
  "lastEquityValidationAt" TIMESTAMP(3),
  "lastEquityRebuildAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Trade" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "instrumentId" TEXT NOT NULL REFERENCES "Instrument"("id") ON DELETE CASCADE,
  "direction" "TradeDirection" NOT NULL,
  "entryPrice" DOUBLE PRECISION NOT NULL,
  "exitPrice" DOUBLE PRECISION,
  "quantity" INTEGER NOT NULL,
  "leverage" DOUBLE PRECISION,
  "entryAt" TIMESTAMP(3) NOT NULL,
  "exitAt" TIMESTAMP(3),
  "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "reason" TEXT,
  "lesson" TEXT,
  "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "Trade_user_instrument_entry_idx" ON "Trade"("userId","instrumentId","entryAt");
CREATE INDEX "Trade_user_deleted_idx" ON "Trade"("userId","deletedAt");

CREATE TABLE "TradeTagOnTrade" (
  "tradeId" TEXT NOT NULL REFERENCES "Trade"("id") ON DELETE CASCADE,
  "tagId" TEXT NOT NULL REFERENCES "TradeTag"("id") ON DELETE CASCADE,
  PRIMARY KEY ("tradeId","tagId")
);

CREATE TABLE "Goal" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" "GoalType" NOT NULL,
  "period" "GoalPeriod" NOT NULL,
  "targetValue" DOUBLE PRECISION NOT NULL,
  "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "achievedAt" TIMESTAMP(3),
  "windowDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Goal_user_period_end_idx" ON "Goal"("userId","period","endDate");

CREATE TABLE "RiskBreachLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "limit" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RiskBreachLog_user_created_idx" ON "RiskBreachLog"("userId","createdAt");

CREATE TABLE "ExportJob" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "paramsJson" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "request_id" TEXT,
  "error" TEXT,
  "filename" TEXT,
  "contentType" TEXT,
  "payloadBase64" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "downloadTokenExpiresAt" TIMESTAMP(3),
  "downloadTokenConsumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3)
);
CREATE INDEX "ExportJob_user_created_idx" ON "ExportJob"("userId","createdAt");
CREATE INDEX "ExportJob_status_created_idx" ON "ExportJob"("status","createdAt");
CREATE INDEX "ExportJob_next_attempt_idx" ON "ExportJob"("nextAttemptAt");
CREATE INDEX "ExportJob_request_id_idx" ON "ExportJob"("request_id");

CREATE TABLE "DailyEquity" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "date" TIMESTAMP(3) NOT NULL,
  "realizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cumulativeEquity" DOUBLE PRECISION NOT NULL,
  "tradeCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DailyEquity_user_date_unique" ON "DailyEquity"("userId","date");
CREATE INDEX "DailyEquity_user_date_idx" ON "DailyEquity"("userId","date");

CREATE TABLE "PropEvaluation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "firmName" TEXT NOT NULL,
  "phase" TEXT NOT NULL DEFAULT 'PHASE1',
  "accountSize" DOUBLE PRECISION NOT NULL,
  "profitTarget" DOUBLE PRECISION NOT NULL,
  "maxDailyLoss" DOUBLE PRECISION NOT NULL,
  "maxOverallLoss" DOUBLE PRECISION NOT NULL,
  "trailing" BOOLEAN NOT NULL DEFAULT false,
  "minTradingDays" INTEGER NOT NULL DEFAULT 0,
  "consistencyBand" DOUBLE PRECISION DEFAULT 0.4,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "cumulativeProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "peakEquity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PropEvaluation_user_status_idx" ON "PropEvaluation"("userId","status");

-- Referential triggers (optional updatedAt bumps) could be added later.
