import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import type { StockMovementActionInput, UseInCardInput } from "./structured-inventory.schemas";
import {
  decrementStock,
  findStockRowForMovement,
  findTakenItem,
  findUsedInAssignment,
  findUsedInCardWithSpots,
  incrementStock,
  listActiveTakenItems,
} from "./stock-movement-records";
import { serializeTakenItem } from "./stock-movement.serializer";
import { logInteraction } from "./interaction-log";
import { evaluateLowStock } from "../low-stock/low-stock.service";

export async function takeStockItem(tableId: string, rowId: string, input: StockMovementActionInput, userId?: string) {
  const row = await loadAvailableRow(tableId, rowId, input.quantity);
  await prisma.$transaction(async (tx) => {
    await decrementStock(tx, row, input.quantity, "take_out", userId);
    await tx.takenStockItem.create({
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
    action: "take",
    stockBalanceId: row.id,
    inventoryTableId: row.inventoryTableId,
    itemId: row.itemId,
    userId,
    quantity: input.quantity,
    notes: input.notes,
    itemName: row.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:take]", err));
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

export async function getTakenItems() {
  const items = await listActiveTakenItems();
  return items.map(serializeTakenItem);
}

export async function returnTakenItem(id: string, userId?: string) {
  const item = await findTakenItem(id);
  if (!item || item.returnedAt) throw new AppError("Taken item was not found.", 404);
  await prisma.$transaction(async (tx) => {
    await incrementStock(tx, item.sourceStockBalance, item.quantity, "return", userId);
    await tx.takenStockItem.update({ where: { id }, data: { returnedAt: new Date() } });
  });
  await logInteraction({
    action: "return",
    stockBalanceId: item.sourceStockBalanceId,
    inventoryTableId: item.sourceInventoryTableId,
    itemId: item.itemId,
    userId,
    quantity: item.quantity.toString(),
    itemName: item.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:return]", err));
  void evaluateLowStock(item.sourceStockBalanceId);
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
