import type { ShelfRecord } from "./warehouse-slots.repository";

export function serializeShelf(shelf: ShelfRecord) {
  return {
    id: shelf.id,
    warehouseId: shelf.warehouseId,
    code: shelf.code,
    normalizedCode: shelf.normalizedCode,
    shelfKind: shelf.shelfKind,
    levelNumber: shelf.levelNumber,
    displayName: shelf.displayName,
    sortOrder: shelf.sortOrder,
    storageLocation: shelf.storageLocation,
    warehouseObject: shelf.warehouseObject,
    counts: {
      assignments: shelf.slots.reduce((sum, slot) => sum + slot._count.assignments, 0),
      slots: shelf._count.slots,
    },
    slots: shelf.slots.map((slot) => {
      const stockBalance = slot.assignments[0]?.stockBalance;
      const capacity = slot.fackEnabled && slot.fackCount ? slot.fackCount : 1;
      const usedCount = slot._count.assignments;
      return {
        id: slot.id,
        warehouseId: slot.warehouseId,
        shelfId: slot.shelfId,
        code: slot.code,
        normalizedCode: slot.normalizedCode,
        compartment: slot.compartment,
        slotIndex: slot.slotIndex,
        displayName: slot.displayName,
        sortOrder: slot.sortOrder,
        isActive: slot.isActive,
        maxAssignments: slot.maxAssignments,
        fackEnabled: slot.fackEnabled,
        fackCount: slot.fackCount,
        capacity,
        usedCount,
        freeCount: Math.max(0, capacity - usedCount),
        palletWidth: slot.palletWidth,
        palletDepth: slot.palletDepth,
        locationAssigned: Boolean(slot.storageLocationId) && !slot.code.startsWith("UNASSIGNED:"),
        storageLocation: slot.storageLocation,
        assignmentCount: slot._count.assignments,
        assignedPlacement: stockBalance ? {
          locationCode: stockBalance.location?.code ?? null,
          compartment: stockBalance.compartment,
        } : null,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
      };
    }),
    createdAt: shelf.createdAt,
    updatedAt: shelf.updatedAt,
  };
}
