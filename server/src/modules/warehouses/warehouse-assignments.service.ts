import { AppError } from "../../utils/AppError";
import {
  closeAssignment,
  countActiveSlotAssignments,
  createAssignment,
  findActiveAssignmentByStock,
  findActiveAssignmentsForSlot,
  findActiveAssignmentsForWarehouse,
  findAssignment,
  findSlotForAssignment,
  findStockBalanceItemId,
  searchAssignableRows,
} from "./warehouse-assignments.repository";
import { serializeAssignment } from "./warehouse-assignments.serializer";
import { getWarehouse } from "./warehouse.service";
import type { AssignSlotInput, SearchInventoryRowsQuery } from "./warehouse.schemas";

export async function listWarehouseAssignments(warehouseId: string) {
  await getWarehouse(warehouseId);
  const assignments = await findActiveAssignmentsForWarehouse(warehouseId);
  return assignments.map(serializeAssignment);
}

export async function listSlotAssignments(warehouseId: string, slotId: string) {
  await getWarehouse(warehouseId);
  const assignments = await findActiveAssignmentsForSlot(slotId);
  return assignments.map(serializeAssignment);
}

export async function getAssignmentByStock(stockBalanceId: string) {
  const assignment = await findActiveAssignmentByStock(stockBalanceId);
  if (!assignment) return null;
  return {
    assignmentId: assignment.id,
    warehouseId: assignment.warehouse.id,
    warehouseName: assignment.warehouse.name,
    slotId: assignment.slot.id,
    slotCode: assignment.slot.code,
    slotCompartment: assignment.slot.compartment,
    slotDisplayName: assignment.slot.displayName,
  };
}

export async function searchAssignableInventoryRows(warehouseId: string, query: SearchInventoryRowsQuery) {
  await getWarehouse(warehouseId);
  const rows = await searchAssignableRows(warehouseId, query.search ?? "", query.tableId, query.limit);
  return rows.map((row) => ({
    id: row.id,
    itemName: row.item.name,
    manufacturer: row.item.manufacturer?.name ?? null,
    quantity: Number(row.quantity),
    unit: row.unit,
    locationCode: row.location?.code ?? null,
    compartment: row.compartment,
    tableId: row.inventoryTableId,
    tableName: row.inventoryTable?.name ?? null,
  }));
}

export async function assignSlot(warehouseId: string, slotId: string, input: AssignSlotInput, userId?: string) {
  await getWarehouse(warehouseId);
  const slot = await findSlotForAssignment(slotId);
  if (!slot) throw new AppError("Slot not found.", 404);
  if (slot.warehouseId !== warehouseId) throw new AppError("Slot does not belong to this warehouse.", 403);
  if (!slot.isActive) throw new AppError("Slot is inactive.", 409);

  const activeCount = await countActiveSlotAssignments(slotId);
  if (activeCount >= slot.maxAssignments) throw new AppError("Slot is already at maximum capacity.", 409);

  const existing = await findActiveAssignmentByStock(input.stockBalanceId);
  if (existing) throw new AppError("This inventory row is already assigned to a warehouse slot.", 409);

  const stockRow = await findStockBalanceItemId(input.stockBalanceId);
  if (!stockRow) throw new AppError("Inventory row not found.", 404);

  const activeSlotKey = slotId;
  const assignment = await createAssignment({
    warehouseId,
    slotId,
    stockBalanceId: input.stockBalanceId,
    itemId: stockRow.itemId,
    inventoryTableId: input.inventoryTableId ?? stockRow.inventoryTableId,
    assignedByUserId: userId ?? null,
    notes: input.notes ?? null,
    activeSlotKey,
  });
  return serializeAssignment(assignment);
}

export async function unassignSlot(warehouseId: string, assignmentId: string, userId?: string) {
  await getWarehouse(warehouseId);
  const assignment = await findAssignment(assignmentId, warehouseId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await closeAssignment(assignmentId, userId ?? null);
}
