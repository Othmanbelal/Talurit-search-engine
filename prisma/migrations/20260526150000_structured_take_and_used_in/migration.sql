CREATE TABLE "used_in_spots" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "used_in_spots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "used_in_stock_assignments" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "spotId" TEXT,
  "sourceStockBalanceId" TEXT NOT NULL,
  "sourceInventoryTableId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
  "notes" TEXT,
  "returnedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "used_in_stock_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "taken_stock_items" (
  "id" TEXT NOT NULL,
  "sourceStockBalanceId" TEXT NOT NULL,
  "sourceInventoryTableId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "notes" TEXT,
  "returnedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "taken_stock_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "used_in_spots_cardId_name_key" ON "used_in_spots"("cardId", "name");
CREATE INDEX "used_in_spots_cardId_idx" ON "used_in_spots"("cardId");
CREATE INDEX "used_in_stock_assignments_cardId_idx" ON "used_in_stock_assignments"("cardId");
CREATE INDEX "used_in_stock_assignments_spotId_idx" ON "used_in_stock_assignments"("spotId");
CREATE INDEX "used_in_stock_assignments_sourceStockBalanceId_idx" ON "used_in_stock_assignments"("sourceStockBalanceId");
CREATE INDEX "used_in_stock_assignments_sourceInventoryTableId_idx" ON "used_in_stock_assignments"("sourceInventoryTableId");
CREATE INDEX "used_in_stock_assignments_itemId_idx" ON "used_in_stock_assignments"("itemId");
CREATE INDEX "used_in_stock_assignments_returnedAt_idx" ON "used_in_stock_assignments"("returnedAt");
CREATE INDEX "taken_stock_items_sourceStockBalanceId_idx" ON "taken_stock_items"("sourceStockBalanceId");
CREATE INDEX "taken_stock_items_sourceInventoryTableId_idx" ON "taken_stock_items"("sourceInventoryTableId");
CREATE INDEX "taken_stock_items_itemId_idx" ON "taken_stock_items"("itemId");
CREATE INDEX "taken_stock_items_returnedAt_idx" ON "taken_stock_items"("returnedAt");

ALTER TABLE "used_in_spots" ADD CONSTRAINT "used_in_spots_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "used_in_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "used_in_stock_assignments" ADD CONSTRAINT "used_in_stock_assignments_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "used_in_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "used_in_stock_assignments" ADD CONSTRAINT "used_in_stock_assignments_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "used_in_spots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "used_in_stock_assignments" ADD CONSTRAINT "used_in_stock_assignments_sourceStockBalanceId_fkey" FOREIGN KEY ("sourceStockBalanceId") REFERENCES "stock_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "used_in_stock_assignments" ADD CONSTRAINT "used_in_stock_assignments_sourceInventoryTableId_fkey" FOREIGN KEY ("sourceInventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "used_in_stock_assignments" ADD CONSTRAINT "used_in_stock_assignments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "used_in_stock_assignments" ADD CONSTRAINT "used_in_stock_assignments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "taken_stock_items" ADD CONSTRAINT "taken_stock_items_sourceStockBalanceId_fkey" FOREIGN KEY ("sourceStockBalanceId") REFERENCES "stock_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "taken_stock_items" ADD CONSTRAINT "taken_stock_items_sourceInventoryTableId_fkey" FOREIGN KEY ("sourceInventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "taken_stock_items" ADD CONSTRAINT "taken_stock_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "taken_stock_items" ADD CONSTRAINT "taken_stock_items_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
