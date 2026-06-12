import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { findWarehouseSceneData, upsertWarehouseObjectFromScene } from "./warehouse-scene.repository";
import { extractShelfSceneObjects } from "./warehouse-scene-objects";
import { generateRackSlotsForObject, generateWarehouseShelvesForObject } from "./warehouse-slots.service";
import type { GenerateRackSlotsFromSceneObjectInput, GenerateShelvesFromSceneObjectInput } from "./warehouse.schemas";

export async function listWarehouseSceneObjects(warehouseId: string) {
  const warehouse = await findWarehouseSceneData(warehouseId);
  if (!warehouse) throw new AppError("Warehouse not found.", 404);
  const persistedByExternalId = new Map(warehouse.objects.map((object) => [object.externalObjectId, object]));
  const shelfCounts = countShelvesByObject(warehouse.shelves);

  return extractShelfSceneObjects(warehouse.layoutData).map((object) => {
    const persisted = persistedByExternalId.get(object.externalObjectId);
    return {
      ...object,
      warehouseObjectId: persisted?.id ?? null,
      linkedShelfCount: persisted ? shelfCounts.get(persisted.id) ?? 0 : 0,
    };
  });
}

export async function generateShelvesFromSceneObject(warehouseId: string, input: GenerateShelvesFromSceneObjectInput) {
  const warehouse = await findWarehouseSceneData(warehouseId);
  if (!warehouse) throw new AppError("Warehouse not found.", 404);
  const sceneObject = extractShelfSceneObjects(warehouse.layoutData)
    .find((object) => object.externalObjectId === input.externalObjectId);
  if (!sceneObject) throw new AppError("3D shelf object not found in the saved warehouse design.", 404);

  const warehouseObject = await prisma.$transaction((tx) => upsertWarehouseObjectFromScene(tx, warehouseId, sceneObject));
  return generateWarehouseShelvesForObject(warehouseId, input, warehouseObject.id);
}

export async function generateRackSlotsFromSceneObject(warehouseId: string, input: GenerateRackSlotsFromSceneObjectInput) {
  const warehouse = await findWarehouseSceneData(warehouseId);
  if (!warehouse) throw new AppError("Warehouse not found.", 404);
  const sceneObject = extractShelfSceneObjects(warehouse.layoutData)
    .find((object) => object.externalObjectId === input.externalObjectId);
  if (!sceneObject) throw new AppError("3D rack object not found in the saved warehouse design.", 404);

  const warehouseObject = await prisma.$transaction((tx) => upsertWarehouseObjectFromScene(tx, warehouseId, sceneObject));
  return generateRackSlotsForObject(warehouseId, input, warehouseObject.id, sceneObject);
}

function countShelvesByObject(shelves: Array<{ warehouseObjectId: string | null }>) {
  const counts = new Map<string, number>();
  for (const shelf of shelves) {
    if (shelf.warehouseObjectId) counts.set(shelf.warehouseObjectId, (counts.get(shelf.warehouseObjectId) ?? 0) + 1);
  }
  return counts;
}
