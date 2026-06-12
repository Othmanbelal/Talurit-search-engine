import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  addStockRowSchema,
  createInventoryGroupSchema,
  createInventoryTableSchema,
  idParamSchema,
  listStockRowsQuerySchema,
  mergeDuplicateRowsSchema,
  stockMovementActionSchema,
  tableColumnSettingsSchema,
  updateStockRowSchema,
  useInCardSchema,
} from "./structured-inventory.schemas";
import {
  addStructuredStockRow,
  archiveStructuredStockRow,
  createStructuredInventoryGroup,
  createStructuredInventoryTable,
  deleteStructuredInventoryGroup,
  deleteStructuredInventoryTable,
  deleteStructuredStockRow,
  getStructuredInventoryGroup,
  getStructuredInventoryRows,
  getStructuredDuplicateGroups,
  getStructuredStockRow,
  getStructuredInventoryTable,
  getStructuredStockRowHistory,
  listStructuredInventories,
  mergeStructuredDuplicateRows,
  restoreStructuredStockRow,
  updateStructuredInventoryTableColumns,
  updateStructuredStockRow,
} from "./structured-inventory.service";
import {
  getTakenItems,
  returnTakenItem,
  takeStockItem,
  useStockItemInCard,
} from "./stock-movement.service";

export async function listStructuredInventoriesController(_request: Request, response: Response) {
  const inventories = await listStructuredInventories();
  return response.json(successResponse({ inventories }));
}

export async function createStructuredInventoryGroupController(request: Request, response: Response) {
  const group = await createStructuredInventoryGroup(createInventoryGroupSchema.parse(request.body));
  return response.status(201).json(successResponse({ group }));
}

export async function createStructuredInventoryTableController(request: Request, response: Response) {
  const table = await createStructuredInventoryTable(createInventoryTableSchema.parse(request.body));
  return response.status(201).json(successResponse({ table }));
}

export async function getStructuredInventoryGroupController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const group = await getStructuredInventoryGroup(id);
  return response.json(successResponse({ group }));
}

export async function getStructuredInventoryTableController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const table = await getStructuredInventoryTable(id);
  return response.json(successResponse({ table }));
}

export async function listStructuredInventoryRowsController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const query = listStockRowsQuerySchema.parse(request.query);
  const rows = await getStructuredInventoryRows(id, query);
  return response.json(successResponse(rows));
}

export async function listStructuredDuplicatesController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const groups = await getStructuredDuplicateGroups(id);
  return response.json(successResponse({ groups }));
}

export async function mergeStructuredDuplicatesController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await mergeStructuredDuplicateRows(id, mergeDuplicateRowsSchema.parse(request.body), request.user?.id);
  return response.status(204).send();
}

export async function addStructuredStockRowController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const rows = await addStructuredStockRow(id, addStockRowSchema.parse(request.body), request.user?.id);
  return response.status(201).json(successResponse(rows));
}

export async function updateStructuredInventoryTableColumnsController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const table = await updateStructuredInventoryTableColumns(id, tableColumnSettingsSchema.parse(request.body));
  return response.json(successResponse({ table }));
}

export async function deleteStructuredInventoryGroupController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await deleteStructuredInventoryGroup(id);
  return response.status(204).send();
}

export async function deleteStructuredInventoryTableController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await deleteStructuredInventoryTable(id);
  return response.status(204).send();
}

export async function getStructuredStockRowController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  const row = await getStructuredStockRow(id, rowId);
  return response.json(successResponse({ row }));
}

export async function updateStructuredStockRowController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  const row = await updateStructuredStockRow(id, rowId, updateStockRowSchema.parse(request.body), request.user?.id);
  return response.json(successResponse({ row }));
}

export async function archiveStructuredStockRowController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await archiveStructuredStockRow(id, rowId, request.user?.id);
  return response.status(204).send();
}

export async function restoreStructuredStockRowController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await restoreStructuredStockRow(id, rowId, request.user?.id);
  return response.status(204).send();
}

export async function deleteStructuredStockRowController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await deleteStructuredStockRow(id, rowId, request.user?.id);
  return response.status(204).send();
}

export async function takeStockItemController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await takeStockItem(id, rowId, stockMovementActionSchema.parse(request.body), request.user?.id);
  return response.status(204).send();
}

export async function useStockItemInCardController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await useStockItemInCard(id, rowId, useInCardSchema.parse(request.body), request.user?.id);
  return response.status(204).send();
}

export async function listTakenItemsController(_request: Request, response: Response) {
  const items = await getTakenItems();
  return response.json(successResponse({ items }));
}

export async function returnTakenItemController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await returnTakenItem(id, request.user?.id);
  return response.status(204).send();
}

export async function getStructuredStockRowHistoryController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const history = await getStructuredStockRowHistory(id);
  return response.json(successResponse({ history }));
}

function rowParams(params: Request["params"]) {
  return {
    id: idParamSchema.parse({ id: params.id }).id,
    rowId: idParamSchema.parse({ id: params.rowId }).id,
  };
}
