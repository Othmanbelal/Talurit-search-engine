import type { BorrowRecord, BorrowRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";

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
export async function resolveRequestAtomic(
  id: string,
  status: BorrowRequestStatus,
  resolvedById: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const result = await tx.borrowRequest.updateMany({
    where: { id, status: "pending" },
    data: { status, resolvedById, resolvedAt: new Date() },
  });
  return result.count === 1;
}

/** Atomically accepts a pending request and transfers custody: resolves the request,
 * closes the old active record as transferred, and creates the linked successor —
 * all in one transaction so a mid-flight failure cannot orphan the loan. */
export async function acceptRequestAndTransfer(
  requestId: string,
  oldRecord: BorrowRecord,
  newHolderId: string,
  resolvedById: string,
) {
  return prisma.$transaction(async (tx) => {
    const resolved = await resolveRequestAtomic(requestId, "accepted", resolvedById, tx);
    if (!resolved) throw new AppError("This request was already resolved.", 409);

    const closed = await tx.borrowRecord.updateMany({
      where: { id: oldRecord.id, status: "active" },
      data: { status: "transferred", closedAt: new Date() },
    });
    if (closed.count !== 1) throw new AppError("This borrowed item is no longer active.", 409);

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
