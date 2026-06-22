import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { rowLowStockSchema, tableLowStockSchema } from "./low-stock.schemas";
import { setRowLowStock, setTableLowStock } from "./low-stock.service";

export async function setTableLowStockController(request: Request, response: Response) {
  const input = tableLowStockSchema.parse(request.body);
  const result = await setTableLowStock(request.params.tableId, input.enabled, request.user!.id, request.user!.role);
  return response.json(successResponse(result));
}

export async function setRowLowStockController(request: Request, response: Response) {
  const input = rowLowStockSchema.parse(request.body);
  const result = await setRowLowStock(
    request.params.tableId,
    request.params.rowId,
    input,
    request.user!.id,
    request.user!.role,
  );
  return response.json(successResponse(result));
}
