import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

const activeAssignmentWhere = { returnedAt: null };

export function findStockRowForMovement(tableId: string, rowId: string) {
  return prisma.stockBalance.findFirst({
    where: { id: rowId, inventoryTableId: tableId, status: { not: "archived" } },
    include: { item: true, inventoryTable: true },
  });
}

export function listActiveBorrowRecords() {
  return prisma.borrowRecord.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    include: borrowRecordInclude(),
  });
}

export function findBorrowRecord(id: string) {
  return prisma.borrowRecord.findUnique({ where: { id }, include: borrowRecordInclude() });
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
          reason: movementReason(movementType),
          createdByUserId: userId,
        },
      },
    },
  });
}

export function incrementStock(
  tx: Prisma.TransactionClient,
  row: { id: string; itemId: string; locationId: string | null; quantity: Prisma.Decimal },
  quantity: Prisma.Decimal | number,
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

function movementReason(movementType: string) {
  if (movementType === "use_in") return "Assigned to Used In card";
  if (movementType === "consume") return "Consumed from inventory";
  if (movementType === "borrow") return "Borrowed from inventory";
  return "Taken out from inventory";
}

function borrowRecordInclude() {
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
    currentHolder: { select: { id: true, name: true } },
    requests: { where: { status: "pending" as const }, include: { requester: { select: { id: true, name: true } } } },
  } satisfies Prisma.BorrowRecordInclude;
}

export type MovementStockRow = NonNullable<Awaited<ReturnType<typeof findStockRowForMovement>>>;
