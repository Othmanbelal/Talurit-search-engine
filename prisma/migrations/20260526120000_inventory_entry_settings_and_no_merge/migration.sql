-- Inventory rows are now table-specific entries. This migration adds per-table
-- presentation settings, row-level archive metadata, and removes uniqueness that
-- previously caused imported rows with the same identifier to collapse together.

ALTER TABLE "inventory_items"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "qrCodeId" TEXT;

ALTER TABLE "inventory_tables"
  ADD COLUMN "columnSettings" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "stock_balances"
  ADD COLUMN "publicId" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedByUserId" TEXT;

DROP INDEX IF EXISTS "item_identifiers_type_normalizedValue_key";
DROP INDEX IF EXISTS "stock_balances_table_item_location_compartment_key";

UPDATE "inventory_items" SET "qrCodeId" = 'item_' || "id" WHERE "qrCodeId" IS NULL;
UPDATE "stock_balances" SET "publicId" = 'entry_' || "id" WHERE "publicId" IS NULL;

ALTER TABLE "inventory_items" ALTER COLUMN "qrCodeId" SET NOT NULL;
ALTER TABLE "stock_balances" ALTER COLUMN "publicId" SET NOT NULL;

CREATE UNIQUE INDEX "inventory_items_qrCodeId_key" ON "inventory_items"("qrCodeId");
CREATE INDEX "item_identifiers_type_normalizedValue_idx" ON "item_identifiers"("type", "normalizedValue");
CREATE UNIQUE INDEX "stock_balances_publicId_key" ON "stock_balances"("publicId");
CREATE INDEX "stock_balances_status_idx" ON "stock_balances"("status");
CREATE INDEX "stock_balances_inventoryTableId_itemId_locationId_compartment_idx"
  ON "stock_balances"("inventoryTableId", "itemId", "locationId", "compartment");
