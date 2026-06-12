import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  assignRowsSchema,
  assignmentIdParamSchema,
  cardIdParamSchema,
  createUsedInCardSchema,
  updateUsedInCardSchema,
} from "./used-in.schemas";
import {
  addUsedInCard,
  assignRowsToCard,
  deleteUsedInCard,
  getUsedInCard,
  getUsedInCards,
  removeUsedInAssignment,
  returnUsedInStockAssignment,
  updateUsedInCard,
} from "./used-in.service";

export async function listUsedInCardsController(_request: Request, response: Response) {
  const cards = await getUsedInCards();
  return response.json(successResponse({ cards }));
}

export async function createUsedInCardController(request: Request, response: Response) {
  const input = createUsedInCardSchema.parse(request.body);
  const card = await addUsedInCard(input, request.user!.id);
  return response.status(201).json(successResponse({ card }));
}

export async function getUsedInCardController(request: Request, response: Response) {
  const { id } = cardIdParamSchema.parse(request.params);
  const card = await getUsedInCard(id);
  return response.json(successResponse({ card }));
}

export async function updateUsedInCardController(request: Request, response: Response) {
  const { id } = cardIdParamSchema.parse(request.params);
  const card = await updateUsedInCard(id, updateUsedInCardSchema.parse(request.body));
  return response.json(successResponse({ card }));
}

export async function deleteUsedInCardController(request: Request, response: Response) {
  const { id } = cardIdParamSchema.parse(request.params);
  await deleteUsedInCard(id);
  return response.status(204).send();
}

export async function assignRowsController(request: Request, response: Response) {
  const { id } = cardIdParamSchema.parse(request.params);
  const input = assignRowsSchema.parse(request.body);
  const result = await assignRowsToCard(id, input);
  return response.status(201).json(successResponse({ result }));
}

export async function deleteAssignmentController(request: Request, response: Response) {
  const { id } = assignmentIdParamSchema.parse(request.params);
  const assignment = await removeUsedInAssignment(id);
  return response.json(successResponse({ assignment }));
}

export async function returnStockAssignmentController(request: Request, response: Response) {
  const { id } = assignmentIdParamSchema.parse(request.params);
  await returnUsedInStockAssignment(id, request.user?.id);
  return response.status(204).send();
}
