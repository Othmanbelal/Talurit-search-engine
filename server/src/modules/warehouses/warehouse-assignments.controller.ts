import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  assignmentParamSchema,
  assignSlotSchema,
  byStockParamSchema,
  idParamSchema,
  searchInventoryRowsQuerySchema,
  slotParamSchema,
} from "./warehouse.schemas";
import {
  assignSlot,
  getAssignmentByStock,
  listSlotAssignments,
  listWarehouseAssignments,
  searchAssignableInventoryRows,
  unassignSlot,
} from "./warehouse-assignments.service";

export async function listWarehouseAssignmentsController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const assignments = await listWarehouseAssignments(id);
  return response.json(successResponse({ assignments }));
}

export async function listSlotAssignmentsController(request: Request, response: Response) {
  const { id, slotId } = slotParamSchema.parse(request.params);
  const assignments = await listSlotAssignments(id, slotId);
  return response.json(successResponse({ assignments }));
}

export async function getAssignmentByStockController(request: Request, response: Response) {
  const { stockBalanceId } = byStockParamSchema.parse(request.params);
  const assignment = await getAssignmentByStock(stockBalanceId);
  return response.json(successResponse({ assignment }));
}

export async function searchInventoryRowsController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const query = searchInventoryRowsQuerySchema.parse(request.query);
  const rows = await searchAssignableInventoryRows(id, query);
  return response.json(successResponse({ rows }));
}

export async function assignSlotController(request: Request, response: Response) {
  const { id, slotId } = slotParamSchema.parse(request.params);
  const input = assignSlotSchema.parse(request.body);
  const assignment = await assignSlot(id, slotId, input, request.user?.id);
  return response.status(201).json(successResponse({ assignment }));
}

export async function unassignSlotController(request: Request, response: Response) {
  const { id, assignmentId } = assignmentParamSchema.parse(request.params);
  await unassignSlot(id, assignmentId, request.user?.id);
  return response.json(successResponse({ unassigned: true }));
}
