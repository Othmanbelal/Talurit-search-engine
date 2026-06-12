import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { confirmExcelImport, createExcelImportPreview, exportInventory } from "./excel.service";
import { exportInventoryQuerySchema } from "./excel.schemas";

export async function previewExcelImportController(request: Request, response: Response) {
  const preview = createExcelImportPreview(request.file);

  response.json(successResponse({ preview }));
}

export async function confirmExcelImportController(request: Request, response: Response) {
  const result = await confirmExcelImport(request.file, request.user!.id);

  response.status(201).json(successResponse({ import: result }));
}

export async function exportInventoryController(request: Request, response: Response) {
  const query = exportInventoryQuerySchema.parse(request.query);
  const result = await exportInventory(query);

  response.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  response.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  response.send(result.buffer);
}
