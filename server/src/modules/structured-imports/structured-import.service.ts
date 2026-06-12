import { AppError } from "../../utils/AppError";
import { scanWorkbook } from "./workbook-scanner";
import { validateStructuredImportFile } from "./structured-import.file";
import {
  confirmBatchImport,
  createScanBatch,
  getScanBatch,
  listStagingRows,
  replaceSheetMappings,
  stageBatchRows,
  updateBatchSheets,
  updateStagingRow,
} from "./structured-import.repository";
import { serializeBatch } from "./structured-import.serializer";
import type { SheetUpdate, StagingRowUpdate, UserMapping } from "./structured-import.repository";

export async function scanStructuredImport(file: Express.Multer.File | undefined, userId?: string) {
  validateStructuredImportFile(file);
  const sheets = scanWorkbook(file.buffer);
  if (sheets.length === 0) throw new AppError("No readable sheets were found in the workbook.", 400);

  const batch = await createScanBatch({
    fileName: file.originalname,
    uploadedByUserId: userId,
    sheets,
  });

  return serializeBatch(batch);
}

export async function getStructuredImportBatch(batchId: string) {
  const batch = await getScanBatch(batchId);
  if (!batch) throw new AppError("Structured import batch was not found.", 404);
  return serializeBatch(batch);
}

export async function applySheetChoices(batchId: string, groupName: string | undefined, sheets: SheetUpdate[]) {
  const batch = await updateBatchSheets(batchId, groupName, sheets);
  return serializeBatch(batch);
}

export async function applySheetMappings(sheetId: string, mappings: UserMapping[]) {
  return replaceSheetMappings(sheetId, mappings);
}

export async function stageStructuredImport(batchId: string) {
  const batch = await stageBatchRows(batchId);
  return serializeBatch(batch);
}

export async function confirmStructuredImport(batchId: string, userId?: string) {
  const batch = await confirmBatchImport(batchId, userId);
  return serializeBatch(batch);
}

export async function getStructuredImportStagingRows(batchId: string, status?: string) {
  await ensureBatchExists(batchId);
  return listStagingRows(batchId, status);
}

export async function patchStructuredImportStagingRow(rowId: string, input: StagingRowUpdate) {
  return updateStagingRow(rowId, input);
}

async function ensureBatchExists(batchId: string) {
  const batch = await getScanBatch(batchId);
  if (!batch) throw new AppError("Structured import batch was not found.", 404);
}
