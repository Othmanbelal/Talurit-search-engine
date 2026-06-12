import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { normalizeKey } from "../structured-imports/structured-import.normalizers";
import { locationCreateData, locationUpdateData, parseShelfLocation } from "./warehouse-location-utils";
import { findWarehouseSceneData, upsertWarehouseObjectFromScene } from "./warehouse-scene.repository";
import { extractShelfSceneObjects, type SceneShelfObject } from "./warehouse-scene-objects";
import { touchWarehouse } from "./warehouse-slots.repository";
import { listWarehouseShelves } from "./warehouse-slots.service";
import type { SaveRackSlotLayoutFromSceneObjectInput } from "./warehouse.schemas";

type SlotLocation = {
  code: string;
  compartment: string;
  displayName: string;
  locationAssigned: boolean;
  normalizedCode: string;
  storageLocationId: string | null;
};

export async function saveRackSlotLayoutFromSceneObject(warehouseId: string, input: SaveRackSlotLayoutFromSceneObjectInput) {
  const warehouse = await findWarehouseSceneData(warehouseId);
  if (!warehouse) throw new AppError("Warehouse not found.", 404);

  const sceneObject = extractShelfSceneObjects(warehouse.layoutData)
    .find((object) => object.externalObjectId === input.externalObjectId);
  if (!sceneObject) throw new AppError("3D rack object not found in the saved warehouse design.", 404);

  try {
    await prisma.$transaction(async (tx) => {
      const warehouseObject = await upsertWarehouseObjectFromScene(tx, warehouseId, sceneObject);
      for (const level of input.shelfLevels) {
        const shelf = await upsertRackLevel(tx, warehouseId, warehouseObject.id, sceneObject, level.levelNumber, input.shelfLevels.length);
        const configuredSlots = new Map(level.slots.map((slot) => [slot.slotIndex, slot]));
        for (let slotIndex = 1; slotIndex <= level.slotCount; slotIndex += 1) {
          await upsertRackSlot(tx, warehouseId, shelf.id, warehouseObject.id, sceneObject, input, level.levelNumber, level.slotCount, slotIndex, configuredSlots.get(slotIndex));
        }
        await deleteUnusedTrailingSlots(tx, warehouseId, shelf.id, level.slotCount);
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Two rack slots cannot use the same location and FACK in one warehouse.", 409);
    }
    throw error;
  }

  await touchWarehouse(warehouseId);
  return listWarehouseShelves(warehouseId);
}

async function upsertRackLevel(tx: Prisma.TransactionClient, warehouseId: string, warehouseObjectId: string, object: SceneShelfObject, levelNumber: number, levelCount: number) {
  const normalizedCode = normalizeKey(`rack ${warehouseObjectId} level ${levelNumber}`);
  const levelHeight = object.height > 0 ? object.height / Math.max(levelCount, 1) : 0;
  return tx.warehouseShelf.upsert({
    where: { warehouseId_normalizedCode: { warehouseId, normalizedCode } },
    create: { warehouseId, ...rackLevelData(warehouseObjectId, object, levelNumber, normalizedCode, levelHeight) },
    update: rackLevelData(warehouseObjectId, object, levelNumber, normalizedCode, levelHeight),
  });
}

function rackLevelData(warehouseObjectId: string, object: SceneShelfObject, levelNumber: number, normalizedCode: string, levelHeight: number) {
  return {
    warehouseObjectId,
    code: `${object.externalObjectId}:L${levelNumber}`,
    normalizedCode,
    shelfKind: "rack_level",
    levelNumber,
    displayName: `${object.name} / level ${levelNumber}`,
    sortOrder: levelNumber,
    positionX: object.positionX,
    positionY: object.positionY,
    positionZ: object.elevation + levelHeight * (levelNumber - 1),
    width: object.width,
    depth: object.depth,
    height: levelHeight,
    metadata: { rotation: object.rotation },
  };
}

async function upsertRackSlot(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  shelfId: string,
  warehouseObjectId: string,
  object: SceneShelfObject,
  input: SaveRackSlotLayoutFromSceneObjectInput,
  levelNumber: number,
  slotCount: number,
  slotIndex: number,
  configuredSlot?: { code?: string | null; compartment?: string | null; displayName?: string | null },
) {
  const slotLocation = await prepareSlotLocation(tx, warehouseObjectId, input.room, levelNumber, slotIndex, configuredSlot);
  const geometry = slotGeometry(object, input, input.shelfLevels.length, levelNumber, slotCount, slotIndex);
  const existing = await tx.warehouseSlot.findFirst({ where: { warehouseId, shelfId, slotIndex }, select: { id: true } });
  const data = rackSlotData(shelfId, slotLocation, geometry, levelNumber, slotIndex, input);
  if (existing) return tx.warehouseSlot.update({ where: { id: existing.id }, data });
  return tx.warehouseSlot.create({ data: { warehouseId, ...data } });
}

async function prepareSlotLocation(
  tx: Prisma.TransactionClient,
  warehouseObjectId: string,
  room: string,
  levelNumber: number,
  slotIndex: number,
  slot?: { code?: string | null; compartment?: string | null; displayName?: string | null },
): Promise<SlotLocation> {
  const rawCode = slot?.code?.trim();
  if (!rawCode) return placeholderSlotLocation(warehouseObjectId, levelNumber, slotIndex, slot?.displayName);
  const parsed = parseLocationOrThrow(rawCode, room, levelNumber, slotIndex);
  const storageLocation = await tx.storageLocation.upsert({
    where: { normalizedCode: parsed.normalizedCode },
    create: locationCreateData(parsed, room),
    update: locationUpdateData(parsed, room),
  });
  const compartment = slot?.compartment?.trim() || "1";
  return {
    code: parsed.code,
    compartment,
    displayName: slot?.displayName?.trim() || `${parsed.code} / FACK ${compartment}`,
    locationAssigned: true,
    normalizedCode: parsed.normalizedCode,
    storageLocationId: storageLocation.id,
  };
}

function placeholderSlotLocation(warehouseObjectId: string, levelNumber: number, slotIndex: number, displayName?: string | null): SlotLocation {
  const code = `UNASSIGNED:${warehouseObjectId}:L${levelNumber}:S${slotIndex}`;
  return {
    code,
    compartment: `slot-${slotIndex}`,
    displayName: displayName?.trim() || `Slot ${slotIndex} - no location ID`,
    locationAssigned: false,
    normalizedCode: normalizeKey(code),
    storageLocationId: null,
  };
}

function parseLocationOrThrow(code: string, room: string, levelNumber: number, slotIndex: number) {
  try {
    return parseShelfLocation(code, room);
  } catch {
    throw new AppError(`Level ${levelNumber}, slot ${slotIndex} must use a location like P10A:1.`, 400);
  }
}

function rackSlotData(
  shelfId: string,
  slotLocation: SlotLocation,
  geometry: ReturnType<typeof slotGeometry>,
  levelNumber: number,
  slotIndex: number,
  input: SaveRackSlotLayoutFromSceneObjectInput,
) {
  return {
    shelfId,
    storageLocationId: slotLocation.storageLocationId,
    code: slotLocation.code,
    normalizedCode: slotLocation.normalizedCode,
    compartment: slotLocation.compartment,
    slotIndex,
    displayName: slotLocation.displayName,
    sortOrder: slotIndex,
    positionX: geometry.positionX,
    positionY: geometry.positionY,
    positionZ: geometry.positionZ,
    width: geometry.width,
    depth: geometry.depth,
    palletWidth: input.palletWidth,
    palletDepth: input.palletDepth,
    isActive: true,
    metadata: { levelNumber, slotIndex, physicalSlot: true, locationAssigned: slotLocation.locationAssigned },
  };
}

function slotGeometry(object: SceneShelfObject, input: SaveRackSlotLayoutFromSceneObjectInput, levelCount: number, levelNumber: number, slotCount: number, slotIndex: number) {
  const rackWidth = object.width > 0 ? object.width : input.palletWidth * slotCount;
  const levelHeight = object.height > 0 ? object.height / Math.max(levelCount, 1) : 0;
  const slotSpan = rackWidth / Math.max(slotCount, 1);
  const offset = -rackWidth / 2 + slotSpan * (slotIndex - 0.5);
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  return {
    positionX: object.positionX + offset * cos,
    positionY: object.positionY + offset * sin,
    positionZ: object.elevation + levelHeight * (levelNumber - 1),
    width: slotSpan,
    depth: object.depth > 0 ? object.depth : input.palletDepth,
  };
}

function deleteUnusedTrailingSlots(tx: Prisma.TransactionClient, warehouseId: string, shelfId: string, slotCount: number) {
  return tx.warehouseSlot.deleteMany({
    where: { warehouseId, shelfId, slotIndex: { gt: slotCount }, assignments: { none: { unassignedAt: null } } },
  });
}
