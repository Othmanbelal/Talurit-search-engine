import type { BorrowRecord, BorrowRequestStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function createRequest(borrowRecordId: string, requesterId: string) {
  return prisma.borrowRequest.create({ data: { borrowRecordId, requesterId } });
}

export function findPendingRequestForRecord(borrowRecordId: string) {
  return prisma.borrowRequest.findFirst({ where: { borrowRecordId, status: "pending" } });
}

export function findRequestWithRecord(id: string) {
  return prisma.borrowRequest.findUnique({
    where: { id },
    include: { borrowRecord: true },
  });
}

/** Atomically flips a request from pending to a terminal status. Returns false if it was no longer pending (already resolved by someone else). */
export async function resolveRequestAtomic(id: string, status: BorrowRequestStatus, resolvedById: string) {
  const result = await prisma.borrowRequest.updateMany({
    where: { id, status: "pending" },
    data: { status, resolvedById, resolvedAt: new Date() },
  });
  return result.count === 1;
}

export async function transferBorrowRecord(oldRecord: BorrowRecord, newHolderId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.borrowRecord.update({
      where: { id: oldRecord.id },
      data: { status: "transferred", closedAt: new Date() },
    });
    return tx.borrowRecord.create({
      data: {
        sourceStockBalanceId: oldRecord.sourceStockBalanceId,
        sourceInventoryTableId: oldRecord.sourceInventoryTableId,
        itemId: oldRecord.itemId,
        quantity: oldRecord.quantity,
        notes: oldRecord.notes,
        currentHolderId: newHolderId,
        previousBorrowRecordId: oldRecord.id,
        status: "active",
      },
    });
  });
}
