-- Warehouse slot FACK capacity + container type (sub-project A3)

ALTER TABLE "warehouse_slots" ADD COLUMN "fackEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "warehouse_slots" ADD COLUMN "fackCount" INTEGER;

ALTER TABLE "warehouse_slot_assignments" ADD COLUMN "containerType" TEXT NOT NULL DEFAULT 'pallet';
ALTER TABLE "warehouse_slot_assignments" ADD COLUMN "fackNumber" TEXT;

-- Re-key existing active assignments to slotId:stockBalanceId so a slot can hold
-- multiple distinct items while keeping the same row unique per slot.
UPDATE "warehouse_slot_assignments"
SET "activeSlotKey" = "slotId" || ':' || "stockBalanceId"
WHERE "unassignedAt" IS NULL AND "activeSlotKey" IS NOT NULL;
