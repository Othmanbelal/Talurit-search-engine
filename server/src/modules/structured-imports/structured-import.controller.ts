import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  batchIdParamSchema,
  confirmImportSchema,
  rowIdParamSchema,
  sheetIdParamSchema,
  stagingQuerySchema,
  updateMappingsSchema,
  updateStagingRowSchema,
  updateSheetsSchema,
} from "./structured-import.schemas";
import {
  applySheetChoices,
  confirmStructuredImport,
  applySheetMappings,
  getStructuredImportBatch,
  getStructuredImportStagingRows,
  patchStructuredImportStagingRow,
  scanStructuredImport,
  stageStructuredImport,
} from "./structured-import.service";

export async function scanStructuredImportController(request: Request, response: Response) {
  const batch = await scanStructuredImport(request.file, request.user?.id);
  return response.status(201).json(successResponse({ batch }));
}

export async function getStructuredImportBatchController(request: Request, response: Response) {
  const { batchId } = batchIdParamSchema.parse(request.params);
  const batch = await getStructuredImportBatch(batchId);
  return response.json(successResponse({ batch }));
}

export async function getStructuredImportPreviewController(request: Request, response: Response) {
  const { batchId } = batchIdParamSchema.parse(request.params);
  const batch = await getStructuredImportBatch(batchId);
  const rows = await getStructuredImportStagingRows(batchId);
  return response.json(successResponse({ batch, rows }));
}

export async function updateStructuredImportSheetsController(request: Request, response: Response) {
  const { batchId } = batchIdParamSchema.parse(request.params);
  const input = updateSheetsSchema.parse(request.body);
  const batch = await applySheetChoices(batchId, input.groupName, input.sheets);
  return response.json(successResponse({ batch }));
}

export async function updateStructuredImportMappingsController(request: Request, response: Response) {
  const { sheetId } = sheetIdParamSchema.parse(request.params);
  const input = updateMappingsSchema.parse(request.body);
  const sheet = await applySheetMappings(sheetId, input.mappings);
  return response.json(successResponse({ sheet }));
}

export async function stageStructuredImportController(request: Request, response: Response) {
  const { batchId } = batchIdParamSchema.parse(request.params);
  const batch = await stageStructuredImport(batchId);
  return response.json(successResponse({ batch }));
}

export async function confirmStructuredImportController(request: Request, response: Response) {
  const { batchId } = batchIdParamSchema.parse(request.params);
  confirmImportSchema.parse(request.body ?? {});
  const batch = await confirmStructuredImport(batchId, request.user?.id);
  return response.json(successResponse({ batch }));
}

export async function listStructuredImportStagingRowsController(request: Request, response: Response) {
  const { batchId } = batchIdParamSchema.parse(request.params);
  const query = stagingQuerySchema.parse(request.query);
  const rows = await getStructuredImportStagingRows(batchId, query.status);
  return response.json(successResponse({ rows }));
}

export async function updateStructuredImportStagingRowController(request: Request, response: Response) {
  const { rowId } = rowIdParamSchema.parse(request.params);
  const input = updateStagingRowSchema.parse(request.body);
  const row = await patchStructuredImportStagingRow(rowId, input);
  return response.json(successResponse({ row }));
}
