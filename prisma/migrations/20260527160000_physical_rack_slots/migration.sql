ALTER TABLE "warehouse_shelves"
ADD COLUMN "shelfKind" TEXT NOT NULL DEFAULT 'location_reference',
ADD COLUMN "levelNumber" INTEGER;

ALTER TABLE "warehouse_slots"
ADD COLUMN "slotIndex" INTEGER,
ADD COLUMN "palletWidth" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
ADD COLUMN "palletDepth" DOUBLE PRECISION NOT NULL DEFAULT 0.8;

CREATE INDEX "warehouse_shelves_warehouseObjectId_levelNumber_idx"
ON "warehouse_shelves"("warehouseObjectId", "levelNumber");

CREATE INDEX "warehouse_shelves_shelfKind_idx"
ON "warehouse_shelves"("shelfKind");

CREATE INDEX "warehouse_slots_shelfId_slotIndex_idx"
ON "warehouse_slots"("shelfId", "slotIndex");
