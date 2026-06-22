-- Low stock thresholds, reorder links & notifications (sub-project C)

-- StockBalance low-stock config (additive; defaults cover existing rows)
ALTER TABLE "stock_balances" ADD COLUMN "lowStockEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stock_balances" ADD COLUMN "lowStockThreshold" DECIMAL(65,30);
ALTER TABLE "stock_balances" ADD COLUMN "reorderUrl" TEXT;
ALTER TABLE "stock_balances" ADD COLUMN "lowStockNotifiedAt" TIMESTAMP(3);
CREATE INDEX "stock_balances_lowStockEnabled_idx" ON "stock_balances"("lowStockEnabled");

-- InventoryTable master toggle
ALTER TABLE "inventory_tables" ADD COLUMN "lowStockEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Reorder notification audit log
CREATE TABLE "reorder_notification_logs" (
    "id" TEXT NOT NULL,
    "stockBalanceId" TEXT,
    "itemName" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "threshold" DECIMAL(65,30) NOT NULL,
    "reorderUrl" TEXT,
    "recipients" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reorder_notification_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reorder_notification_logs_stockBalanceId_idx" ON "reorder_notification_logs"("stockBalanceId");
CREATE INDEX "reorder_notification_logs_createdAt_idx" ON "reorder_notification_logs"("createdAt");
ALTER TABLE "reorder_notification_logs" ADD CONSTRAINT "reorder_notification_logs_stockBalanceId_fkey" FOREIGN KEY ("stockBalanceId") REFERENCES "stock_balances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
