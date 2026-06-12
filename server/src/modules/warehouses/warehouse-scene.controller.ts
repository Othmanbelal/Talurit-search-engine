import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { saveRackSlotLayoutFromSceneObject } from "./warehouse-rack-layout.service";
import {
  generateRackSlotsFromSceneObjectSchema,
  generateShelvesFromSceneObjectSchema,
  idParamSchema,
  saveRackSlotLayoutFromSceneObjectSchema,
} from "./warehouse.schemas";
import { generateRackSlotsFromSceneObject, generateShelvesFromSceneObject, listWarehouseSceneObjects } from "./warehouse-scene.service";

export async function listWarehouseSceneObjectsController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const sceneObjects = await listWarehouseSceneObjects(id);
  return response.json(successResponse({ sceneObjects }));
}

export async function generateShelvesFromSceneObjectController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const shelves = await generateShelvesFromSceneObject(id, generateShelvesFromSceneObjectSchema.parse(request.body));
  return response.status(201).json(successResponse({ shelves }));
}

export async function generateRackSlotsFromSceneObjectController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const shelves = await generateRackSlotsFromSceneObject(id, generateRackSlotsFromSceneObjectSchema.parse(request.body));
  return response.status(201).json(successResponse({ shelves }));
}

export async function saveRackSlotLayoutFromSceneObjectController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const shelves = await saveRackSlotLayoutFromSceneObject(id, saveRackSlotLayoutFromSceneObjectSchema.parse(request.body));
  return response.status(201).json(successResponse({ shelves }));
}
