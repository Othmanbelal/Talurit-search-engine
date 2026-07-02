import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { isTableManager } from "../managers/manager-access";
import type { BorrowRecord } from "@prisma/client";
import {
  acceptRequestAndTransfer,
  createRequest,
  findPendingRequestForRecord,
  findRequestWithRecord,
  resolveRequestAtomic,
} from "./borrow-requests.repository";

export async function requestBorrow(borrowRecordId: string, requesterId: string) {
  const record = await prisma.borrowRecord.findUnique({ where: { id: borrowRecordId } });
  if (!record || record.status !== "active") throw new AppError("Borrowed item not found.", 404);
  if (record.currentHolderId === requesterId) throw new AppError("You already have this item.", 400);
  const pending = await findPendingRequestForRecord(borrowRecordId);
  if (pending) throw new AppError("This item already has a pending request.", 400);
  return createRequest(borrowRecordId, requesterId);
}

export async function acceptRequest(requestId: string, actorId: string, actorRole: string) {
  const request = await findRequestWithRecord(requestId);
  if (!request || request.status !== "pending") throw new AppError("Request not found.", 404);
  await authorizeResolver(request.borrowRecord, actorId, actorRole);

  return acceptRequestAndTransfer(requestId, request.borrowRecord, request.requesterId, actorId);
}

export async function declineRequest(requestId: string, actorId: string, actorRole: string) {
  const request = await findRequestWithRecord(requestId);
  if (!request || request.status !== "pending") throw new AppError("Request not found.", 404);
  await authorizeResolver(request.borrowRecord, actorId, actorRole);

  const resolved = await resolveRequestAtomic(requestId, "declined", actorId);
  if (!resolved) throw new AppError("This request was already resolved.", 409);
}

export async function cancelRequest(requestId: string, requesterId: string) {
  const request = await findRequestWithRecord(requestId);
  if (!request || request.status !== "pending") throw new AppError("Request not found.", 404);
  if (request.requesterId !== requesterId) throw new AppError("Only the requester can cancel this request.", 403);

  const resolved = await resolveRequestAtomic(requestId, "cancelled", requesterId);
  if (!resolved) throw new AppError("This request was already resolved.", 409);
}

async function authorizeResolver(record: BorrowRecord, actorId: string, actorRole: string) {
  if (actorRole === "admin") return;
  if (record.currentHolderId === actorId) return;
  if (actorRole === "manager" && (await isTableManager(actorId, record.sourceInventoryTableId))) return;
  throw new AppError("Only the current holder, table manager, or admin can resolve this request.", 403);
}
