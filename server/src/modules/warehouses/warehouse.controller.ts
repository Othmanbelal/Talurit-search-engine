import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  createWarehouseSchema,
  idParamSchema,
  listWarehousesQuerySchema,
  saveWarehouseLayoutSchema,
  updateWarehouseSchema,
} from "./warehouse.schemas";
import {
  archiveWarehouse,
  createWarehouse,
  deleteWarehouse,
  getWarehouse,
  listWarehouses,
  saveWarehouseLayout,
  updateWarehouse,
} from "./warehouse.service";

export async function listWarehousesController(request: Request, response: Response) {
  const warehouses = await listWarehouses(listWarehousesQuerySchema.parse(request.query));
  return response.json(successResponse({ warehouses }));
}

export async function createWarehouseController(request: Request, response: Response) {
  const warehouse = await createWarehouse(createWarehouseSchema.parse(request.body), request.user?.id);
  return response.status(201).json(successResponse({ warehouse }));
}

export async function getWarehouseController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const warehouse = await getWarehouse(id);
  return response.json(successResponse({ warehouse }));
}

export async function updateWarehouseController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const warehouse = await updateWarehouse(id, updateWarehouseSchema.parse(request.body));
  return response.json(successResponse({ warehouse }));
}

export async function saveWarehouseLayoutController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const warehouse = await saveWarehouseLayout(id, saveWarehouseLayoutSchema.parse(request.body));
  return response.json(successResponse({ warehouse }));
}

export async function deleteWarehouseController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await deleteWarehouse(id);
  return response.status(204).send();
}
