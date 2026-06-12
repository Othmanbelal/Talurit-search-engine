-- CreateTable
CREATE TABLE "item_interaction_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "stockBalanceId" TEXT,
    "inventoryTableId" TEXT,
    "itemId" TEXT,
    "userId" TEXT,
    "quantity" DECIMAL(65,30),
    "notes" TEXT,
    "itemName" TEXT,
    "tableName" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_interaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_interaction_logs_stockBalanceId_idx" ON "item_interaction_logs"("stockBalanceId");

-- CreateIndex
CREATE INDEX "item_interaction_logs_itemId_idx" ON "item_interaction_logs"("itemId");

-- CreateIndex
CREATE INDEX "item_interaction_logs_userId_idx" ON "item_interaction_logs"("userId");

-- CreateIndex
CREATE INDEX "item_interaction_logs_createdAt_idx" ON "item_interaction_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "item_interaction_logs" ADD CONSTRAINT "item_interaction_logs_stockBalanceId_fkey" FOREIGN KEY ("stockBalanceId") REFERENCES "stock_balances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_interaction_logs" ADD CONSTRAINT "item_interaction_logs_inventoryTableId_fkey" FOREIGN KEY ("inventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_interaction_logs" ADD CONSTRAINT "item_interaction_logs_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_interaction_logs" ADD CONSTRAINT "item_interaction_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
