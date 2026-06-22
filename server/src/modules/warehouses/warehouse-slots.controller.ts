import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import {
  createShelfSchema,
  createSlotSchema,
  generateShelvesSchema,
  idParamSchema,
  shelfFackSchema,
  shelfParamSchema,
  slotParamSchema,
  updateShelfSchema,
  updateSlotSchema,
} from "./warehouse.schemas";
import {
  createWarehouseShelf,
  createWarehouseSlot,
  deleteWarehouseShelf,
  deleteWarehouseSlot,
  generateWarehouseShelves,
  listWarehouseShelves,
  setShelfFack,
  updateWarehouseShelf,
  updateWarehouseSlot,
} from "./warehouse-slots.service";

export async function listWarehouseShelvesController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const shelves = await listWarehouseShelves(id);
  return response.json(successResponse({ shelves }));
}

export async function generateWarehouseShelvesController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const shelves = await generateWarehouseShelves(id, generateShelvesSchema.parse(request.body));
  return response.status(201).json(successResponse({ shelves }));
}

export async function createWarehouseShelfController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const shelf = await createWarehouseShelf(id, createShelfSchema.parse(request.body));
  return response.status(201).json(successResponse({ shelf }));
}

export async function updateWarehouseShelfController(request: Request, response: Response) {
  const { id, shelfId } = shelfParamSchema.parse(request.params);
  const shelf = await updateWarehouseShelf(id, shelfId, updateShelfSchema.parse(request.body));
  return response.json(successResponse({ shelf }));
}

export async function deleteWarehouseShelfController(request: Request, response: Response) {
  const { id, shelfId } = shelfParamSchema.parse(request.params);
  await deleteWarehouseShelf(id, shelfId);
  return response.json(successResponse({ deleted: true }));
}

export async function createWarehouseSlotController(request: Request, response: Response) {
  const { id, shelfId } = shelfParamSchema.parse(request.params);
  const shelves = await createWarehouseSlot(id, shelfId, createSlotSchema.parse(request.body));
  return response.status(201).json(successResponse({ shelves }));
}

export async function updateWarehouseSlotController(request: Request, response: Response) {
  const { id, slotId } = slotParamSchema.parse(request.params);
  const shelf = await updateWarehouseSlot(id, slotId, updateSlotSchema.parse(request.body));
  return response.json(successResponse({ shelf }));
}

export async function setShelfFackController(request: Request, response: Response) {
  const { id, shelfId } = shelfParamSchema.parse(request.params);
  const shelf = await setShelfFack(id, shelfId, shelfFackSchema.parse(request.body));
  return response.json(successResponse({ shelf }));
}

export async function deleteWarehouseSlotController(request: Request, response: Response) {
  const { id, slotId } = slotParamSchema.parse(request.params);
  await deleteWarehouseSlot(id, slotId);
  return response.json(successResponse({ deleted: true }));
}
