import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import type { StockMovementActionInput, UseInCardInput } from "./structured-inventory.schemas";
import {
  decrementStock,
  findBorrowRecord,
  findStockRowForMovement,
  findUsedInAssignment,
  findUsedInCardWithSpots,
  incrementStock,
  listActiveBorrowRecords,
} from "./stock-movement-records";
import { serializeBorrowRecord } from "./stock-movement.serializer";
import { logInteraction } from "./interaction-log";
import { evaluateLowStock } from "../low-stock/low-stock.service";
import { resolveManagerTableIds } from "../managers/manager-access";

export async function consumeStockItem(tableId: string, rowId: string, input: StockMovementActionInput, userId?: string) {
  const row = await loadAvailableRow(tableId, rowId, input.quantity);
  await prisma.$transaction(async (tx) => {
    await decrementStock(tx, row, input.quantity, "consume", userId);
    await tx.consumedStockItem.create({
      data: {
        sourceStockBalanceId: row.id,
        sourceInventoryTableId: row.inventoryTableId!,
        itemId: row.itemId,
        quantity: input.quantity,
        notes: input.notes,
        createdByUserId: userId,
      },
    });
  });
  await logInteraction({
    action: "consume",
    stockBalanceId: row.id,
    inventoryTableId: row.inventoryTableId,
    itemId: row.itemId,
    userId,
    quantity: input.quantity,
    notes: input.notes,
    itemName: row.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:consume]", err));
  void evaluateLowStock(row.id);
}

export async function borrowStockItem(tableId: string, rowId: string, input: StockMovementActionInput, userId?: string) {
  const row = await loadAvailableRow(tableId, rowId, input.quantity);
  await prisma.$transaction(async (tx) => {
    await decrementStock(tx, row, input.quantity, "borrow", userId);
    await tx.borrowRecord.create({
      data: {
        sourceStockBalanceId: row.id,
        sourceInventoryTableId: row.inventoryTableId!,
        itemId: row.itemId,
        quantity: input.quantity,
        notes: input.notes,
        currentHolderId: userId,
      },
    });
  });
  await logInteraction({
    action: "borrow",
    stockBalanceId: row.id,
    inventoryTableId: row.inventoryTableId,
    itemId: row.itemId,
    userId,
    quantity: input.quantity,
    notes: input.notes,
    itemName: row.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:borrow]", err));
  void evaluateLowStock(row.id);
}

export async function useStockItemInCard(tableId: string, rowId: string, input: UseInCardInput, userId?: string) {
  const row = await loadAvailableRow(tableId, rowId, input.quantity);
  const card = await findUsedInCardWithSpots(input.cardId);
  if (!card) throw new AppError("Used In card not found.", 404);
  const spotIds = validateSpotSelection(card, input.quantity, input.spotIds);

  await prisma.$transaction(async (tx) => {
    await decrementStock(tx, row, input.quantity, "use_in", userId);
    for (const spotId of assignmentSpotIds(spotIds, input.quantity)) {
      await tx.usedInStockAssignment.create({
        data: {
          cardId: card.id,
          spotId,
          sourceStockBalanceId: row.id,
          sourceInventoryTableId: row.inventoryTableId!,
          itemId: row.itemId,
          quantity: spotId ? 1 : input.quantity,
          notes: input.notes,
          createdByUserId: userId,
        },
      });
    }
  });
  await logInteraction({
    action: "use_in",
    stockBalanceId: row.id,
    inventoryTableId: row.inventoryTableId,
    itemId: row.itemId,
    userId,
    quantity: input.quantity,
    notes: input.notes,
    itemName: row.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:use_in]", err));
  void evaluateLowStock(row.id);
}

export async function getBorrowedItems(userId?: string, role?: string) {
  const records = await listActiveBorrowRecords();
  const managedTableIds = new Set(role === "manager" && userId ? await resolveManagerTableIds(userId) : []);
  const viewer = { userId, role, managedTableIds };
  return records.map((record) => serializeBorrowRecord(record, viewer));
}

export async function returnBorrowedItem(id: string, quantity: number | undefined, userId?: string) {
  const record = await findBorrowRecord(id);
  if (!record || record.status !== "active") throw new AppError("Borrowed item was not found.", 404);
  if (record.currentHolderId !== userId) throw new AppError("Only the current holder can return this item.", 403);

  const heldQuantity = record.quantity.toNumber();
  const returnQuantity = quantity ?? heldQuantity;
  if (returnQuantity <= 0 || returnQuantity > heldQuantity) {
    throw new AppError(`Enter a quantity between 1 and ${record.quantity.toString()}.`, 400);
  }
  const fullyReturned = returnQuantity === heldQuantity;

  if (!fullyReturned) {
    const pending = await prisma.borrowRequest.findFirst({ where: { borrowRecordId: id, status: "pending" } });
    if (pending) throw new AppError("Resolve the pending request before making a partial return.", 400);
  }

  await prisma.$transaction(async (tx) => {
    if (fullyReturned) {
      const flipped = await tx.borrowRecord.updateMany({
        where: { id, status: "active" },
        data: { status: "returned", closedAt: new Date(), quantity: 0 },
      });
      if (flipped.count !== 1) throw new AppError("This borrowed item was already returned or transferred.", 409);
      await tx.borrowRequest.updateMany({
        where: { borrowRecordId: id, status: "pending" },
        data: { status: "cancelled", resolvedAt: new Date() },
      });
    } else {
      const adjusted = await tx.borrowRecord.updateMany({
        where: { id, status: "active", quantity: record.quantity },
        data: { quantity: record.quantity.minus(returnQuantity) },
      });
      if (adjusted.count !== 1) throw new AppError("This borrowed item changed — reload and try again.", 409);
    }

    const freshStock = await tx.stockBalance.findUnique({ where: { id: record.sourceStockBalanceId } });
    if (!freshStock) throw new AppError("Source stock row not found.", 404);
    await incrementStock(tx, freshStock, returnQuantity, "return", userId);
  });

  await logInteraction({
    action: "return",
    stockBalanceId: record.sourceStockBalanceId,
    inventoryTableId: record.sourceInventoryTableId,
    itemId: record.itemId,
    userId,
    quantity: returnQuantity,
    itemName: record.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:return]", err));
  void evaluateLowStock(record.sourceStockBalanceId);
}

export async function returnUsedInAssignment(id: string, userId?: string) {
  const assignment = await findUsedInAssignment(id);
  if (!assignment || assignment.returnedAt) throw new AppError("Used In assignment was not found.", 404);
  await prisma.$transaction(async (tx) => {
    await incrementStock(tx, assignment.sourceStockBalance, assignment.quantity, "return", userId);
    await tx.usedInStockAssignment.update({ where: { id }, data: { returnedAt: new Date() } });
  });
  await logInteraction({
    action: "return_used",
    stockBalanceId: assignment.sourceStockBalanceId,
    inventoryTableId: assignment.sourceInventoryTableId,
    itemId: assignment.itemId,
    userId,
    quantity: assignment.quantity.toString(),
    itemName: assignment.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:return_used]", err));
  void evaluateLowStock(assignment.sourceStockBalanceId);
}

async function loadAvailableRow(tableId: string, rowId: string, quantity: number) {
  const row = await findStockRowForMovement(tableId, rowId);
  if (!row || !row.inventoryTableId) throw new AppError("Inventory row not found.", 404);
  if (row.quantity.lessThan(quantity)) {
    throw new AppError(`Only ${row.quantity.toString()} ${row.unit} available.`, 400);
  }
  return row;
}

function validateSpotSelection(card: CardWithSpots, quantity: number, selectedSpotIds: string[]) {
  if (card.spots.length === 0) return [];
  if (selectedSpotIds.length !== quantity) {
    throw new AppError(`Select ${quantity} empty spot${quantity === 1 ? "" : "s"} for this card.`, 400);
  }
  const emptySpotIds = new Set(card.spots.filter((spot) => spot.assignments.length === 0).map((spot) => spot.id));
  const uniqueSelected = new Set(selectedSpotIds);
  if (uniqueSelected.size !== selectedSpotIds.length) throw new AppError("Each spot can only be selected once.", 400);
  if (![...uniqueSelected].every((spotId) => emptySpotIds.has(spotId))) {
    throw new AppError("One or more selected spots are already occupied.", 400);
  }
  return selectedSpotIds;
}

function assignmentSpotIds(spotIds: string[], _quantity: number) {
  return spotIds.length > 0 ? spotIds : [null];
}

type CardWithSpots = NonNullable<Awaited<ReturnType<typeof findUsedInCardWithSpots>>>;
