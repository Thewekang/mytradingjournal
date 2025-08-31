-- CreateTable
CREATE TABLE "public"."RiskBreachLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "limit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskBreachLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskBreachLog_userId_createdAt_idx" ON "public"."RiskBreachLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."RiskBreachLog" ADD CONSTRAINT "RiskBreachLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
