import type { AssignmentRecord } from "./warehouse-assignments.repository";

export function serializeAssignment(assignment: AssignmentRecord) {
  return {
    id: assignment.id,
    warehouseId: assignment.warehouseId,
    slotId: assignment.slotId,
    activeSlotKey: assignment.activeSlotKey,
    containerType: assignment.containerType,
    fackNumber: assignment.fackNumber,
    assignedAt: assignment.assignedAt.toISOString(),
    slot: {
      id: assignment.slot.id,
      code: assignment.slot.code,
      compartment: assignment.slot.compartment,
      displayName: assignment.slot.displayName,
      storageLocation: assignment.slot.storageLocation,
      shelfLabel: assignment.slot.shelf.displayName ?? assignment.slot.shelf.code,
    },
    stockBalance: {
      id: assignment.stockBalance.id,
      itemName: assignment.stockBalance.item.name,
      manufacturer: assignment.stockBalance.item.manufacturer?.name ?? null,
      articleNumber: assignment.stockBalance.item.identifiers.find((identifier) => identifier.type === "manufacturer_article")?.value ?? null,
      quantity: Number(assignment.stockBalance.quantity),
      unit: assignment.stockBalance.unit,
      location: assignment.stockBalance.location,
      compartment: assignment.stockBalance.compartment,
      inventoryTable: assignment.stockBalance.inventoryTable,
    },
    assignedByUserId: assignment.assignedByUserId,
    assignedByUserName: assignment.assignedByUser?.name ?? null,
  };
}
