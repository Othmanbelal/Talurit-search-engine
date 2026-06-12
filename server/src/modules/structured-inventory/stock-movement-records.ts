import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

const activeAssignmentWhere = { returnedAt: null };

export function findStockRowForMovement(tableId: string, rowId: string) {
  return prisma.stockBalance.findFirst({
    where: { id: rowId, inventoryTableId: tableId, status: { not: "archived" } },
    include: { item: true, inventoryTable: true },
  });
}

export function listActiveTakenItems() {
  return prisma.takenStockItem.findMany({
    where: { returnedAt: null },
    orderBy: { createdAt: "desc" },
    include: stockMovementInclude(),
  });
}

export function findTakenItem(id: string) {
  return prisma.takenStockItem.findUnique({ where: { id }, include: stockMovementInclude() });
}

export function findUsedInAssignment(id: string) {
  return prisma.usedInStockAssignment.findUnique({
    where: { id },
    include: { sourceStockBalance: true, sourceInventoryTable: true, item: true, card: true, spot: true },
  });
}

export function findUsedInCardWithSpots(cardId: string, tx: Prisma.TransactionClient = prisma) {
  return tx.usedInCard.findUnique({
    where: { id: cardId },
    include: {
      spots: { orderBy: { sortOrder: "asc" }, include: { assignments: { where: activeAssignmentWhere } } },
    },
  });
}

export function decrementStock(
  tx: Prisma.TransactionClient,
  row: MovementStockRow,
  quantity: number,
  movementType: string,
  userId?: string,
) {
  return tx.stockBalance.update({
    where: { id: row.id },
    data: {
      quantity: row.quantity.minus(quantity),
      movements: {
        create: {
          itemId: row.itemId,
          locationId: row.locationId,
          movementType,
          quantityChange: -quantity,
          quantityBefore: row.quantity,
          quantityAfter: row.quantity.minus(quantity),
          reason: movementType === "use_in" ? "Assigned to Used In card" : "Taken out from inventory",
          createdByUserId: userId,
        },
      },
    },
  });
}

export function incrementStock(
  tx: Prisma.TransactionClient,
  row: { id: string; itemId: string; locationId: string | null; quantity: Prisma.Decimal },
  quantity: Prisma.Decimal,
  movementType: string,
  userId?: string,
) {
  return tx.stockBalance.update({
    where: { id: row.id },
    data: {
      quantity: row.quantity.plus(quantity),
      movements: {
        create: {
          itemId: row.itemId,
          locationId: row.locationId,
          movementType,
          quantityChange: quantity,
          quantityBefore: row.quantity,
          quantityAfter: row.quantity.plus(quantity),
          reason: "Returned to inventory",
          createdByUserId: userId,
        },
      },
    },
  });
}

function stockMovementInclude() {
  return {
    sourceStockBalance: {
      include: {
        item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
        location: true,
        inventoryTable: true,
        usedInAssignments: { where: { returnedAt: null }, include: { card: true } },
      },
    },
    sourceInventoryTable: true,
    item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
  } satisfies Prisma.TakenStockItemInclude;
}

export type MovementStockRow = NonNullable<Awaited<ReturnType<typeof findStockRowForMovement>>>;
