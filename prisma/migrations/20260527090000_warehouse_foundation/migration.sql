CREATE TABLE "warehouse_layouts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "layoutData" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL DEFAULT 1,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warehouse_layouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warehouse_objects" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "externalObjectId" TEXT,
  "name" TEXT NOT NULL,
  "objectType" TEXT NOT NULL,
  "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "elevation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "depth" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "color" TEXT,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warehouse_objects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warehouse_shelves" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "warehouseObjectId" TEXT,
  "storageLocationId" TEXT,
  "code" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "displayName" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "positionZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "depth" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warehouse_shelves_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warehouse_slots" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "shelfId" TEXT NOT NULL,
  "storageLocationId" TEXT,
  "code" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "compartment" TEXT NOT NULL,
  "displayName" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "positionZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "depth" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxAssignments" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warehouse_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warehouse_inventory_group_links" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "inventoryGroupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouse_inventory_group_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warehouse_inventory_table_links" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "inventoryTableId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouse_inventory_table_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warehouse_slot_assignments" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "stockBalanceId" TEXT NOT NULL,
  "inventoryTableId" TEXT,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
  "activeSlotKey" TEXT,
  "notes" TEXT,
  "assignedByUserId" TEXT,
  "unassignedByUserId" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unassignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warehouse_slot_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "warehouse_layouts_name_idx" ON "warehouse_layouts"("name");
CREATE INDEX "warehouse_layouts_isArchived_idx" ON "warehouse_layouts"("isArchived");
CREATE INDEX "warehouse_layouts_createdByUserId_idx" ON "warehouse_layouts"("createdByUserId");

CREATE INDEX "warehouse_objects_warehouseId_idx" ON "warehouse_objects"("warehouseId");
CREATE INDEX "warehouse_objects_externalObjectId_idx" ON "warehouse_objects"("externalObjectId");
CREATE INDEX "warehouse_objects_objectType_idx" ON "warehouse_objects"("objectType");

CREATE UNIQUE INDEX "warehouse_shelves_warehouseId_normalizedCode_key" ON "warehouse_shelves"("warehouseId", "normalizedCode");
CREATE INDEX "warehouse_shelves_warehouseObjectId_idx" ON "warehouse_shelves"("warehouseObjectId");
CREATE INDEX "warehouse_shelves_storageLocationId_idx" ON "warehouse_shelves"("storageLocationId");
CREATE INDEX "warehouse_shelves_code_idx" ON "warehouse_shelves"("code");

CREATE UNIQUE INDEX "warehouse_slots_warehouseId_normalizedCode_compartment_key" ON "warehouse_slots"("warehouseId", "normalizedCode", "compartment");
CREATE INDEX "warehouse_slots_shelfId_idx" ON "warehouse_slots"("shelfId");
CREATE INDEX "warehouse_slots_storageLocationId_idx" ON "warehouse_slots"("storageLocationId");
CREATE INDEX "warehouse_slots_isActive_idx" ON "warehouse_slots"("isActive");

CREATE UNIQUE INDEX "warehouse_inventory_group_links_warehouseId_inventoryGroupId_key" ON "warehouse_inventory_group_links"("warehouseId", "inventoryGroupId");
CREATE INDEX "warehouse_inventory_group_links_inventoryGroupId_idx" ON "warehouse_inventory_group_links"("inventoryGroupId");

CREATE UNIQUE INDEX "warehouse_inventory_table_links_warehouseId_inventoryTableId_key" ON "warehouse_inventory_table_links"("warehouseId", "inventoryTableId");
CREATE INDEX "warehouse_inventory_table_links_inventoryTableId_idx" ON "warehouse_inventory_table_links"("inventoryTableId");

CREATE UNIQUE INDEX "warehouse_slot_assignments_activeSlotKey_key" ON "warehouse_slot_assignments"("activeSlotKey");
CREATE INDEX "warehouse_slot_assignments_warehouseId_idx" ON "warehouse_slot_assignments"("warehouseId");
CREATE INDEX "warehouse_slot_assignments_slotId_idx" ON "warehouse_slot_assignments"("slotId");
CREATE INDEX "warehouse_slot_assignments_stockBalanceId_idx" ON "warehouse_slot_assignments"("stockBalanceId");
CREATE INDEX "warehouse_slot_assignments_inventoryTableId_idx" ON "warehouse_slot_assignments"("inventoryTableId");
CREATE INDEX "warehouse_slot_assignments_itemId_idx" ON "warehouse_slot_assignments"("itemId");
CREATE INDEX "warehouse_slot_assignments_unassignedAt_idx" ON "warehouse_slot_assignments"("unassignedAt");

ALTER TABLE "warehouse_layouts" ADD CONSTRAINT "warehouse_layouts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warehouse_objects" ADD CONSTRAINT "warehouse_objects_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_shelves" ADD CONSTRAINT "warehouse_shelves_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_shelves" ADD CONSTRAINT "warehouse_shelves_warehouseObjectId_fkey" FOREIGN KEY ("warehouseObjectId") REFERENCES "warehouse_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warehouse_shelves" ADD CONSTRAINT "warehouse_shelves_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warehouse_slots" ADD CONSTRAINT "warehouse_slots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_slots" ADD CONSTRAINT "warehouse_slots_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "warehouse_shelves"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_slots" ADD CONSTRAINT "warehouse_slots_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warehouse_inventory_group_links" ADD CONSTRAINT "warehouse_inventory_group_links_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_inventory_group_links" ADD CONSTRAINT "warehouse_inventory_group_links_inventoryGroupId_fkey" FOREIGN KEY ("inventoryGroupId") REFERENCES "inventory_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_inventory_table_links" ADD CONSTRAINT "warehouse_inventory_table_links_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_inventory_table_links" ADD CONSTRAINT "warehouse_inventory_table_links_inventoryTableId_fkey" FOREIGN KEY ("inventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_slot_assignments" ADD CONSTRAINT "warehouse_slot_assignments_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_slot_assignments" ADD CONSTRAINT "warehouse_slot_assignments_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "warehouse_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_slot_assignments" ADD CONSTRAINT "warehouse_slot_assignments_stockBalanceId_fkey" FOREIGN KEY ("stockBalanceId") REFERENCES "stock_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_slot_assignments" ADD CONSTRAINT "warehouse_slot_assignments_inventoryTableId_fkey" FOREIGN KEY ("inventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warehouse_slot_assignments" ADD CONSTRAINT "warehouse_slot_assignments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_slot_assignments" ADD CONSTRAINT "warehouse_slot_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warehouse_slot_assignments" ADD CONSTRAINT "warehouse_slot_assignments_unassignedByUserId_fkey" FOREIGN KEY ("unassignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
