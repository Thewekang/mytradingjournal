-- CreateTable
CREATE TABLE "TradeAttachment" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeAttachment_tradeId_idx" ON "TradeAttachment"("tradeId");

-- AddForeignKey
ALTER TABLE "TradeAttachment" ADD CONSTRAINT "TradeAttachment_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
