import { AppError } from "../../utils/AppError";
import {
  closeAssignment,
  countActiveSlotAssignments,
  createAssignment,
  findActiveAssignmentByStock,
  findActiveAssignmentsForSlot,
  findActiveAssignmentsForWarehouse,
  findAssignment,
  findAssignableRowsByQrCandidates,
  findSlotForAssignment,
  findStockBalanceItemId,
  searchAssignableRows,
} from "./warehouse-assignments.repository";
import { serializeAssignment } from "./warehouse-assignments.serializer";
import { getWarehouse } from "./warehouse.service";
import { findLinkedTableIds } from "./warehouse-shelf-view.repository";
import type { AssignSlotInput, ScanInventoryRowsInput, SearchInventoryRowsQuery } from "./warehouse.schemas";

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
  const tableIds = await findLinkedTableIds(warehouseId);
  const rows = await searchAssignableRows(tableIds, query.search ?? "", query.tableId, query.limit);
  return rows.map(serializeAssignableRow);
}

export async function scanAssignableInventoryRows(warehouseId: string, input: ScanInventoryRowsInput) {
  await getWarehouse(warehouseId);
  const tableIds = await findLinkedTableIds(warehouseId);
  const rows = await findAssignableRowsByQrCandidates(tableIds, qrCandidates(input.code), input.limit);
  return {
    matched: rows.length > 0,
    rows: rows.map(serializeAssignableRow),
  };
}

function serializeAssignableRow(row: Awaited<ReturnType<typeof searchAssignableRows>>[number]) {
  return {
    id: row.id,
    itemName: row.item.name,
    manufacturer: row.item.manufacturer?.name ?? null,
    articleNumber: row.item.identifiers.find((identifier) => identifier.type === "manufacturer_article")?.value ?? null,
    quantity: Number(row.quantity),
    unit: row.unit,
    locationCode: row.location?.code ?? null,
    compartment: row.compartment,
    tableId: row.inventoryTableId,
    tableName: row.inventoryTable?.name ?? null,
  };
}

export async function assignSlot(warehouseId: string, slotId: string, input: AssignSlotInput, userId?: string) {
  await getWarehouse(warehouseId);
  const slot = await findSlotForAssignment(slotId);
  if (!slot) throw new AppError("Slot not found.", 404);
  if (slot.warehouseId !== warehouseId) throw new AppError("Slot does not belong to this warehouse.", 403);
  if (!slot.isActive) throw new AppError("Slot is inactive.", 409);

  const activeCount = await countActiveSlotAssignments(slotId);
  if (activeCount >= 1 || activeCount >= slot.maxAssignments) throw new AppError("Slot is already assigned.", 409);

  const existing = await findActiveAssignmentByStock(input.stockBalanceId);
  if (existing) throw new AppError("This inventory row is already assigned to a warehouse slot.", 409);

  const stockRow = await findStockBalanceItemId(input.stockBalanceId);
  if (!stockRow) throw new AppError("Inventory row not found.", 404);
  const tableIds = await findLinkedTableIds(warehouseId);
  if (!stockRow.inventoryTableId || !tableIds.includes(stockRow.inventoryTableId)) {
    throw new AppError("Inventory row must belong to a table linked to this warehouse.", 403);
  }

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

function qrCandidates(value: string) {
  const raw = value.trim();
  const candidates = new Set<string>([raw]);
  try {
    const url = new URL(raw);
    for (const key of ["qr", "code", "item", "itemId", "id"]) {
      const param = url.searchParams.get(key)?.trim();
      if (param) candidates.add(param);
    }
    const lastPath = url.pathname.split("/").filter(Boolean).at(-1);
    if (lastPath) candidates.add(lastPath);
  } catch {
    // Plain QR values are valid; URL parsing is only an additional convenience.
  }
  return Array.from(candidates);
}

export async function unassignSlot(warehouseId: string, assignmentId: string, userId?: string) {
  await getWarehouse(warehouseId);
  const assignment = await findAssignment(assignmentId, warehouseId);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await closeAssignment(assignmentId, userId ?? null);
}
