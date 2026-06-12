import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type { SceneShelfObject } from "./warehouse-scene-objects";

export function findWarehouseSceneData(warehouseId: string) {
  return prisma.warehouseLayout.findUnique({
    where: { id: warehouseId },
    select: {
      id: true,
      layoutData: true,
      objects: { select: { id: true, externalObjectId: true, name: true, objectType: true } },
      shelves: { select: { id: true, warehouseObjectId: true } },
    },
  });
}

export async function upsertWarehouseObjectFromScene(tx: Prisma.TransactionClient, warehouseId: string, object: SceneShelfObject) {
  const existing = await tx.warehouseObject.findFirst({
    where: { warehouseId, externalObjectId: object.externalObjectId },
    select: { id: true },
  });
  const data = warehouseObjectData(warehouseId, object);
  if (existing) return tx.warehouseObject.update({ where: { id: existing.id }, data });
  return tx.warehouseObject.create({ data });
}

function warehouseObjectData(warehouseId: string, object: SceneShelfObject) {
  return {
    warehouseId,
    externalObjectId: object.externalObjectId,
    name: object.name,
    objectType: object.objectType,
    positionX: object.positionX,
    positionY: object.positionY,
    elevation: object.elevation,
    rotation: object.rotation,
    width: object.width,
    depth: object.depth,
    height: object.height,
    color: object.color,
    locked: object.locked,
    metadata: object.metadata as Prisma.InputJsonObject,
  };
}
