CREATE TABLE "dynamic_inventories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceFileName" TEXT,
  "sourceSheetName" TEXT,
  "importedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dynamic_inventories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dynamic_inventory_columns" (
  "id" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceIndex" INTEGER NOT NULL,
  "dataType" TEXT NOT NULL DEFAULT 'text',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dynamic_inventory_columns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dynamic_inventory_rows" (
  "id" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dynamic_inventory_rows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "used_in_cards" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "used_in_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "used_in_assignments" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "rowId" TEXT NOT NULL,
  "quantity" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "used_in_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dynamic_inventories_name_idx" ON "dynamic_inventories"("name");
CREATE INDEX "dynamic_inventories_sourceFileName_idx" ON "dynamic_inventories"("sourceFileName");
CREATE UNIQUE INDEX "dynamic_inventory_columns_inventoryId_key_key" ON "dynamic_inventory_columns"("inventoryId", "key");
CREATE INDEX "dynamic_inventory_columns_inventoryId_sourceIndex_idx" ON "dynamic_inventory_columns"("inventoryId", "sourceIndex");
CREATE INDEX "dynamic_inventory_rows_inventoryId_rowNumber_idx" ON "dynamic_inventory_rows"("inventoryId", "rowNumber");
CREATE INDEX "used_in_cards_name_idx" ON "used_in_cards"("name");
CREATE UNIQUE INDEX "used_in_assignments_cardId_rowId_key" ON "used_in_assignments"("cardId", "rowId");
CREATE INDEX "used_in_assignments_inventoryId_idx" ON "used_in_assignments"("inventoryId");
CREATE INDEX "used_in_assignments_rowId_idx" ON "used_in_assignments"("rowId");

ALTER TABLE "dynamic_inventory_columns"
  ADD CONSTRAINT "dynamic_inventory_columns_inventoryId_fkey"
  FOREIGN KEY ("inventoryId") REFERENCES "dynamic_inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dynamic_inventory_rows"
  ADD CONSTRAINT "dynamic_inventory_rows_inventoryId_fkey"
  FOREIGN KEY ("inventoryId") REFERENCES "dynamic_inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "used_in_assignments"
  ADD CONSTRAINT "used_in_assignments_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "used_in_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "used_in_assignments"
  ADD CONSTRAINT "used_in_assignments_inventoryId_fkey"
  FOREIGN KEY ("inventoryId") REFERENCES "dynamic_inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "used_in_assignments"
  ADD CONSTRAINT "used_in_assignments_rowId_fkey"
  FOREIGN KEY ("rowId") REFERENCES "dynamic_inventory_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
