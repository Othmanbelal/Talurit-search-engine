import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  createToolSchema,
  listToolsQuerySchema,
  toolIdParamSchema,
  toolPlacementSchema,
  updateToolSchema,
} from "./tools.schemas";
import {
  archiveTool,
  createTool,
  deleteTool,
  getTool,
  listTools,
  restoreTool,
  updateTool,
  updateToolPlacement,
} from "./tools.service";

export async function listToolsController(request: Request, response: Response) {
  const query = listToolsQuerySchema.parse(request.query);
  const result = await listTools(query);

  return response.json(successResponse(result));
}

export async function getToolController(request: Request, response: Response) {
  const { id } = toolIdParamSchema.parse(request.params);
  const tool = await getTool(id);

  return response.json(successResponse({ tool }));
}

export async function createToolController(request: Request, response: Response) {
  const input = createToolSchema.parse(request.body);
  const tool = await createTool(input, request.user!.id);

  return response.status(201).json(successResponse({ tool }));
}

export async function updateToolController(request: Request, response: Response) {
  const { id } = toolIdParamSchema.parse(request.params);
  const input = updateToolSchema.parse(request.body);
  const tool = await updateTool(id, input, request.user!.id);

  return response.json(successResponse({ tool }));
}

export async function updateToolPlacementController(request: Request, response: Response) {
  const { id } = toolIdParamSchema.parse(request.params);
  const input = toolPlacementSchema.parse(request.body);
  const tool = await updateToolPlacement(id, input, request.user!.id);

  return response.json(successResponse({ tool }));
}

export async function archiveToolController(request: Request, response: Response) {
  const { id } = toolIdParamSchema.parse(request.params);
  const tool = await archiveTool(id, request.user!.id);

  return response.json(successResponse({ tool }));
}

export async function restoreToolController(request: Request, response: Response) {
  const { id } = toolIdParamSchema.parse(request.params);
  const tool = await restoreTool(id, request.user!.id);

  return response.json(successResponse({ tool }));
}

export async function deleteToolController(request: Request, response: Response) {
  const { id } = toolIdParamSchema.parse(request.params);
  const tool = await deleteTool(id, request.user!.id);

  return response.json(successResponse({ tool }));
}
