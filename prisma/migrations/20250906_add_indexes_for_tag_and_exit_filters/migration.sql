-- Add indexes to speed up analytics and tag/date filters

-- Trade: by user/date and user/status/date for closed-trade analytics
CREATE INDEX IF NOT EXISTS "Trade_userId_exitAt_idx" ON "Trade" ("userId", "exitAt");
CREATE INDEX IF NOT EXISTS "Trade_userId_status_exitAt_idx" ON "Trade" ("userId", "status", "exitAt");

-- TradeTagOnTrade: for tag aggregations and joins
CREATE INDEX IF NOT EXISTS "TradeTagOnTrade_tagId_idx" ON "TradeTagOnTrade" ("tagId");
CREATE INDEX IF NOT EXISTS "TradeTagOnTrade_tradeId_idx" ON "TradeTagOnTrade" ("tradeId");
