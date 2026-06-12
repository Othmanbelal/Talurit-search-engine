import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { AppError } from "../../utils/AppError";
import {
  confirmDynamicImportSchema,
  inventoryIdParamSchema,
  listInventoryRowsQuerySchema,
} from "./inventories.schemas";
import {
  confirmDynamicImport,
  getDynamicInventories,
  getDynamicInventory,
  getDynamicInventoryRows,
  previewDynamicImport,
} from "./inventories.service";

export async function previewDynamicImportController(request: Request, response: Response) {
  const preview = previewDynamicImport(request.file);
  return response.json(successResponse({ preview }));
}

export async function confirmDynamicImportController(request: Request, response: Response) {
  const rawTableNames = parseTableNames(request.body.tableNames);
  const input = confirmDynamicImportSchema.parse({ tableNames: rawTableNames });
  const result = await confirmDynamicImport(request.file, input, request.user!.id);

  return response.status(201).json(successResponse({ import: result }));
}

export async function listDynamicInventoriesController(_request: Request, response: Response) {
  const inventories = await getDynamicInventories();
  return response.json(successResponse({ inventories }));
}

export async function getDynamicInventoryController(request: Request, response: Response) {
  const { id } = inventoryIdParamSchema.parse(request.params);
  const inventory = await getDynamicInventory(id);
  return response.json(successResponse({ inventory }));
}

export async function listDynamicInventoryRowsController(request: Request, response: Response) {
  const { id } = inventoryIdParamSchema.parse(request.params);
  const query = listInventoryRowsQuerySchema.parse(request.query);
  const rows = await getDynamicInventoryRows(id, query);

  return response.json(successResponse(rows));
}

function parseTableNames(value: unknown) {
  if (!value) return {};
  if (typeof value !== "string") throw new AppError("Invalid table name mapping.", 400);

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new AppError("Invalid table name mapping.", 400);
  }
}
