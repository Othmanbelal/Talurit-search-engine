import type { Request, Response } from "express";
import { createBorrowRequestSchema, idParamSchema } from "./borrow-requests.schemas";
import { acceptRequest, cancelRequest, declineRequest, requestBorrow } from "./borrow-requests.service";

export async function createBorrowRequestController(request: Request, response: Response) {
  const input = createBorrowRequestSchema.parse(request.body);
  await requestBorrow(input.borrowRecordId, request.user!.id);
  return response.status(204).send();
}

export async function acceptBorrowRequestController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await acceptRequest(id, request.user!.id, request.user!.role);
  return response.status(204).send();
}

export async function declineBorrowRequestController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await declineRequest(id, request.user!.id, request.user!.role);
  return response.status(204).send();
}

export async function cancelBorrowRequestController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await cancelRequest(id, request.user!.id);
  return response.status(204).send();
}
