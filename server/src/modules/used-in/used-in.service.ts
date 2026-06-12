import { AppError } from "../../utils/AppError";
import type { AssignRowsInput, CreateUsedInCardInput, UpdateUsedInCardInput } from "./used-in.schemas";
import {
  countUsedInCardAssignments,
  createUsedInAssignments,
  createUsedInCard,
  createUsedInCardWithSpots,
  deleteUsedInCardRecord,
  deleteUsedInAssignment,
  findRowsForAssignment,
  findUsedInCard,
  listUsedInCards,
  replaceUsedInCardSpots,
  updateUsedInCardBase,
} from "./used-in.repository";
import { returnUsedInAssignment } from "../structured-inventory/stock-movement.service";
import { normalizeColumnSettings } from "../structured-inventory/column-settings";
import { serializeStockRow } from "../structured-inventory/structured-inventory.serializer";

export async function getUsedInCards() {
  const cards = await listUsedInCards();
  return cards.map((card) => ({
    ...card,
    spots: card.spots.map((spot) => ({ id: spot.id, name: spot.name, sortOrder: spot.sortOrder, isOccupied: spot.assignments.length > 0 })),
  }));
}

export function addUsedInCard(input: CreateUsedInCardInput, userId: string) {
  if (input.spotNames.length > 0) {
    return createUsedInCardWithSpots({ createdByUserId: userId, description: input.description, name: input.name, spotNames: input.spotNames });
  }
  return createUsedInCard({ createdByUserId: userId, description: input.description, name: input.name });
}

export async function getUsedInCard(id: string) {
  const card = await findUsedInCard(id);
  if (!card) throw new AppError("Used In card not found", 404);

  return {
    ...card,
    groups: groupAssignmentsByInventory(card.assignments),
    structuredGroups: groupStockAssignmentsByTable(card.stockAssignments),
  };
}

export async function updateUsedInCard(id: string, input: UpdateUsedInCardInput) {
  const card = await findUsedInCard(id);
  if (!card) throw new AppError("Used In card not found", 404);

  try {
    await replaceUsedInCardSpots(id, uniqueSpots(input.spots));
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : "Could not update spots", 400);
  }

  const updated = await updateUsedInCardBase(id, { name: input.name, description: input.description });
  return {
    ...updated,
    spots: updated.spots.map((spot) => ({ id: spot.id, name: spot.name, sortOrder: spot.sortOrder, isOccupied: spot.assignments.length > 0 })),
  };
}

export async function deleteUsedInCard(id: string) {
  const card = await findUsedInCard(id);
  if (!card) throw new AppError("Used In card not found", 404);
  const [legacyAssignments, activeStockAssignments] = await countUsedInCardAssignments(id);
  if (legacyAssignments > 0 || activeStockAssignments > 0) {
    throw new AppError("Return or remove assigned items before deleting this card.", 400);
  }
  await deleteUsedInCardRecord(id);
}

export async function assignRowsToCard(cardId: string, input: AssignRowsInput) {
  const card = await findUsedInCard(cardId);
  if (!card) throw new AppError("Used In card not found", 404);

  const rows = await findRowsForAssignment(input.rowIds);
  if (rows.length !== input.rowIds.length) {
    throw new AppError("One or more selected rows were not found", 400);
  }

  return createUsedInAssignments({
    cardId,
    notes: input.notes,
    quantity: input.quantity,
    rows,
  });
}

export function removeUsedInAssignment(id: string) {
  return deleteUsedInAssignment(id);
}

export function returnUsedInStockAssignment(id: string, userId?: string) {
  return returnUsedInAssignment(id, userId);
}

function uniqueSpots(spots: UpdateUsedInCardInput["spots"]) {
  const seen = new Set<string>();
  return spots.filter((spot) => {
    const normalized = spot.name.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function groupAssignmentsByInventory(assignments: NonNullable<Awaited<ReturnType<typeof findUsedInCard>>>["assignments"]) {
  const groups = new Map<string, {
    assignments: typeof assignments;
    columns: typeof assignments[number]["inventory"]["columns"];
    inventoryId: string;
    inventoryName: string;
  }>();

  for (const assignment of assignments) {
    const current = groups.get(assignment.inventoryId) ?? {
      assignments: [],
      columns: assignment.inventory.columns,
      inventoryId: assignment.inventoryId,
      inventoryName: assignment.inventory.name,
    };
    current.assignments.push(assignment);
    groups.set(assignment.inventoryId, current);
  }

  return Array.from(groups.values());
}

function groupStockAssignmentsByTable(assignments: NonNullable<Awaited<ReturnType<typeof findUsedInCard>>>["stockAssignments"]) {
  const groups = new Map<string, {
    assignments: Array<{
      id: string;
      quantity: number;
      notes: string | null;
      spot: { id: string; name: string } | null;
      sourceRow: ReturnType<typeof serializeStockRow>;
    }>;
    columns: ReturnType<typeof normalizeColumnSettings>;
    tableId: string;
    tableName: string;
  }>();

  for (const assignment of assignments) {
    const current = groups.get(assignment.sourceInventoryTableId) ?? {
      assignments: [],
      columns: normalizeColumnSettings(assignment.sourceInventoryTable.columnSettings),
      tableId: assignment.sourceInventoryTableId,
      tableName: assignment.sourceInventoryTable.name,
    };
    current.assignments.push({
      id: assignment.id,
      quantity: assignment.quantity.toNumber(),
      notes: assignment.notes,
      spot: assignment.spot ? { id: assignment.spot.id, name: assignment.spot.name } : null,
      sourceRow: serializeStockRow(assignment.sourceStockBalance),
    });
    groups.set(assignment.sourceInventoryTableId, current);
  }

  return Array.from(groups.values());
}
