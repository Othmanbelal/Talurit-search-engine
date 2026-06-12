-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('inventory_table', 'inventory_group', 'warehouse');

-- CreateTable
CREATE TABLE "resource_managers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_managers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_managers_resourceType_resourceId_idx" ON "resource_managers"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "resource_managers_userId_idx" ON "resource_managers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "resource_managers_userId_resourceType_resourceId_key" ON "resource_managers"("userId", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "resource_managers" ADD CONSTRAINT "resource_managers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_managers" ADD CONSTRAINT "resource_managers_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "stock_balances_inventoryTableId_itemId_locationId_compartment_i" RENAME TO "stock_balances_inventoryTableId_itemId_locationId_compartme_idx";

-- RenameIndex
ALTER INDEX "warehouse_inventory_group_links_warehouseId_inventoryGroupId_ke" RENAME TO "warehouse_inventory_group_links_warehouseId_inventoryGroupI_key";

-- RenameIndex
ALTER INDEX "warehouse_inventory_table_links_warehouseId_inventoryTableId_ke" RENAME TO "warehouse_inventory_table_links_warehouseId_inventoryTableI_key";
