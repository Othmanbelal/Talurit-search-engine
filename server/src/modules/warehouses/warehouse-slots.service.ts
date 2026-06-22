import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { normalizeKey } from "../structured-imports/structured-import.normalizers";
import {
  compartmentLabel,
  locationCreateData,
  locationUpdateData,
  parseShelfLocation,
} from "./warehouse-location-utils";
import {
  countActiveShelfAssignments,
  countActiveSlotAssignments,
  deleteShelfRecord,
  deleteSlotRecord,
  findShelfRecord,
  findSlotRecord,
  listShelfRecords,
  shelfInclude,
  touchWarehouse,
} from "./warehouse-slots.repository";
import { serializeShelf } from "./warehouse-slots.serializer";
import type {
  CreateShelfInput,
  CreateSlotInput,
  GenerateShelvesInput,
  GenerateRackSlotsFromSceneObjectInput,
  UpdateShelfInput,
  UpdateSlotInput,
  ShelfFackInput,
} from "./warehouse.schemas";
import { getWarehouse } from "./warehouse.service";

type RackGeometry = {
  externalObjectId: string;
  name: string;
  positionX: number;
  positionY: number;
  elevation: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
};

export async function listWarehouseShelves(warehouseId: string) {
  await getWarehouse(warehouseId);
  return (await listShelfRecords(warehouseId)).map(serializeShelf);
}

export async function generateWarehouseShelves(warehouseId: string, input: GenerateShelvesInput) {
  await getWarehouse(warehouseId);
  return generateShelves(warehouseId, input);
}

export async function generateWarehouseShelvesForObject(warehouseId: string, input: GenerateShelvesInput, warehouseObjectId: string) {
  await getWarehouse(warehouseId);
  return generateShelves(warehouseId, input, warehouseObjectId);
}

export async function generateRackSlotsForObject(warehouseId: string, input: GenerateRackSlotsFromSceneObjectInput, warehouseObjectId: string, geometry: RackGeometry) {
  await getWarehouse(warehouseId);
  await prisma.$transaction(async (tx) => {
    let locationPosition = input.locationStartPosition;
    for (let level = 1; level <= input.shelfLevelCount; level += 1) {
      const shelf = await upsertPhysicalShelf(tx, warehouseId, warehouseObjectId, geometry, level, input.shelfLevelCount);
      for (let slotIndex = 1; slotIndex <= input.slotsPerShelf; slotIndex += 1) {
        const code = `P${input.planNumber}${input.sectionLetter}:${locationPosition}`;
        await upsertPhysicalSlot(tx, warehouseId, shelf.id, code, input, slotIndex, geometry, level);
        locationPosition += 1;
      }
    }
  });
  await touchWarehouse(warehouseId);
  return listWarehouseShelves(warehouseId);
}

async function generateShelves(warehouseId: string, input: GenerateShelvesInput, warehouseObjectId?: string) {
  await prisma.$transaction(async (tx) => {
    for (let position = input.positionStart; position <= input.positionEnd; position += 1) {
      const code = `P${input.planNumber}${input.sectionLetter}:${position}`;
      const shelf = await upsertShelf(tx, warehouseId, code, input.room, position, warehouseObjectId);
      for (let fack = input.compartmentStart; fack <= input.compartmentEnd; fack += 1) {
        await upsertSlot(tx, warehouseId, shelf.id, shelf.storageLocationId, code, compartmentLabel(fack), fack);
      }
    }
  });
  await touchWarehouse(warehouseId);
  return listWarehouseShelves(warehouseId);
}

export async function createWarehouseShelf(warehouseId: string, input: CreateShelfInput) {
  await getWarehouse(warehouseId);
  const shelf = await prisma.$transaction(async (tx) => {
    const created = await upsertShelf(tx, warehouseId, input.code, "Verktygsrum");
    for (const [index, compartment] of (input.compartments ?? []).entries()) {
      await upsertSlot(tx, warehouseId, created.id, created.storageLocationId, created.code, compartmentLabel(compartment), index + 1);
    }
    return tx.warehouseShelf.update({
      where: { id: created.id },
      data: { displayName: input.displayName ?? created.displayName },
      include: shelfInclude,
    });
  });
  await touchWarehouse(warehouseId);
  return serializeShelf(shelf);
}

export async function updateWarehouseShelf(warehouseId: string, shelfId: string, input: UpdateShelfInput) {
  const shelf = await findRequiredShelf(warehouseId, shelfId);
  const location = input.code ? parseShelfLocation(input.code) : null;
  const updated = await prisma.$transaction(async (tx) => {
    const storageLocation = location ? await upsertStorageLocation(tx, location, "Verktygsrum") : null;
    const nextCode = location?.code ?? shelf.code;
    const nextNormalized = location?.normalizedCode ?? shelf.normalizedCode;
    if (location) {
      await tx.warehouseSlot.updateMany({
        where: { shelfId },
        data: { code: nextCode, normalizedCode: nextNormalized, storageLocationId: storageLocation?.id },
      });
    }
    return tx.warehouseShelf.update({
      where: { id: shelfId },
      data: {
        code: nextCode,
        normalizedCode: nextNormalized,
        displayName: input.displayName ?? shelf.displayName,
        storageLocationId: storageLocation?.id ?? shelf.storageLocationId,
      },
      include: shelfInclude,
    });
  });
  await touchWarehouse(warehouseId);
  return serializeShelf(updated);
}

export async function deleteWarehouseShelf(warehouseId: string, shelfId: string) {
  await findRequiredShelf(warehouseId, shelfId);
  if (await countActiveShelfAssignments(shelfId)) throw new AppError("Cannot delete a shelf with assigned stock.", 409);
  await deleteShelfRecord(warehouseId, shelfId);
  await touchWarehouse(warehouseId);
}

export async function createWarehouseSlot(warehouseId: string, shelfId: string, input: CreateSlotInput) {
  const shelf = await findRequiredShelf(warehouseId, shelfId);
  await upsertSlot(prisma, warehouseId, shelf.id, shelf.storageLocationId, shelf.code, compartmentLabel(input.compartment), shelf.slots.length + 1, input.displayName);
  await touchWarehouse(warehouseId);
  return listWarehouseShelves(warehouseId);
}

export async function updateWarehouseSlot(warehouseId: string, slotId: string, input: UpdateSlotInput) {
  const slot = await findRequiredSlot(warehouseId, slotId);
  if (input.compartment && input.compartment !== slot.compartment && (await countActiveSlotAssignments(slotId))) {
    throw new AppError("Cannot rename an occupied slot.", 409);
  }
  const fackData = resolveFackUpdate(slot.fackEnabled, slot.fackCount, slot.assignments.length, input);
  const updated = await prisma.warehouseSlot.update({
    where: { id: slotId },
    data: {
      compartment: input.compartment ? compartmentLabel(input.compartment) : undefined,
      displayName: input.displayName,
      isActive: input.isActive,
      ...fackData,
    },
    select: { shelfId: true },
  });
  await touchWarehouse(warehouseId);
  return findRequiredShelf(warehouseId, updated.shelfId).then(serializeShelf);
}

/** Apply a FACK toggle/count to every slot under a shelf (bulk). */
export async function setShelfFack(warehouseId: string, shelfId: string, input: ShelfFackInput) {
  const shelf = await findRequiredShelf(warehouseId, shelfId);
  if (input.enabled && input.count == null) {
    throw new AppError("Enter a FACK count to enable FACK for these slots.", 400);
  }
  const capacity = input.enabled ? (input.count as number) : 1;
  for (const slot of shelf.slots) {
    if (slot._count.assignments > capacity) {
      throw new AppError(`Slot ${slot.compartment} holds more items than the new capacity (${capacity}).`, 409);
    }
  }
  await prisma.warehouseSlot.updateMany({
    where: { shelfId },
    data: { fackEnabled: input.enabled, fackCount: input.enabled ? input.count : null, maxAssignments: capacity },
  });
  await touchWarehouse(warehouseId);
  return findRequiredShelf(warehouseId, shelfId).then(serializeShelf);
}

/** Validate and build the FACK update for a single slot. Empty when nothing FACK-related changes. */
function resolveFackUpdate(
  currentEnabled: boolean,
  currentCount: number | null,
  activeAssignments: number,
  input: UpdateSlotInput,
): { fackEnabled?: boolean; fackCount?: number | null; maxAssignments?: number } {
  if (input.fackEnabled === undefined && input.fackCount === undefined) return {};
  const enabled = input.fackEnabled ?? currentEnabled;
  const count = input.fackCount !== undefined ? input.fackCount : currentCount;
  if (enabled && (count == null || count < 1)) {
    throw new AppError("Enter a FACK count to enable FACK for this slot.", 400);
  }
  const capacity = enabled ? (count as number) : 1;
  if (capacity < activeAssignments) {
    throw new AppError(`Cannot set capacity below the ${activeAssignments} item(s) currently in this slot.`, 409);
  }
  return { fackEnabled: enabled, fackCount: enabled ? count : null, maxAssignments: capacity };
}

export async function deleteWarehouseSlot(warehouseId: string, slotId: string) {
  await findRequiredSlot(warehouseId, slotId);
  if (await countActiveSlotAssignments(slotId)) throw new AppError("Cannot delete a slot with assigned stock.", 409);
  await deleteSlotRecord(slotId);
  await touchWarehouse(warehouseId);
}

async function findRequiredShelf(warehouseId: string, shelfId: string) {
  const shelf = await findShelfRecord(warehouseId, shelfId);
  if (!shelf) throw new AppError("Warehouse shelf not found.", 404);
  return shelf;
}

async function findRequiredSlot(warehouseId: string, slotId: string) {
  const slot = await findSlotRecord(warehouseId, slotId);
  if (!slot) throw new AppError("Warehouse slot not found.", 404);
  return slot;
}

async function upsertShelf(tx: Prisma.TransactionClient, warehouseId: string, code: string, room = "Verktygsrum", sortOrder = 0, warehouseObjectId?: string) {
  const location = parseShelfLocation(code, room);
  const storageLocation = await upsertStorageLocation(tx, location, room);
  const objectLink = warehouseObjectId ? { warehouseObjectId } : {};
  return tx.warehouseShelf.upsert({
    where: { warehouseId_normalizedCode: { warehouseId, normalizedCode: location.normalizedCode } },
    create: { warehouseId, code: location.code, normalizedCode: location.normalizedCode, displayName: location.code, sortOrder, storageLocationId: storageLocation.id, ...objectLink },
    update: { code: location.code, displayName: location.code, sortOrder, storageLocationId: storageLocation.id, ...objectLink },
  });
}

async function upsertStorageLocation(tx: Prisma.TransactionClient, location: ReturnType<typeof parseShelfLocation>, room: string) {
  return tx.storageLocation.upsert({
    where: { normalizedCode: location.normalizedCode },
    create: locationCreateData(location, room),
    update: locationUpdateData(location, room),
  });
}

async function upsertSlot(tx: Prisma.TransactionClient | typeof prisma, warehouseId: string, shelfId: string, storageLocationId: string | null, code: string, compartment: string, sortOrder = 0, displayName?: string | null) {
  const location = parseShelfLocation(code);
  return tx.warehouseSlot.upsert({
    where: { warehouseId_normalizedCode_compartment: { warehouseId, normalizedCode: location.normalizedCode, compartment } },
    create: { warehouseId, shelfId, storageLocationId, code: location.code, normalizedCode: location.normalizedCode, compartment, displayName: displayName ?? `FACK ${compartment}`, sortOrder },
    update: { shelfId, storageLocationId, code: location.code, displayName: displayName ?? undefined, sortOrder, isActive: true },
  });
}

async function upsertPhysicalShelf(tx: Prisma.TransactionClient, warehouseId: string, warehouseObjectId: string, geometry: RackGeometry, levelNumber: number, levelCount: number) {
  const code = `${geometry.externalObjectId}:L${levelNumber}`;
  const normalizedCode = normalizeKey(`rack ${warehouseObjectId} level ${levelNumber}`);
  const levelHeight = levelCount > 0 ? geometry.height / levelCount : 0;
  return tx.warehouseShelf.upsert({
    where: { warehouseId_normalizedCode: { warehouseId, normalizedCode } },
    create: {
      warehouseId,
      warehouseObjectId,
      code,
      normalizedCode,
      shelfKind: "rack_level",
      levelNumber,
      displayName: `${geometry.name} / shelf ${levelNumber}`,
      sortOrder: levelNumber,
      positionX: geometry.positionX,
      positionY: geometry.positionY,
      positionZ: geometry.elevation + levelHeight * (levelNumber - 1),
      width: geometry.width,
      depth: geometry.depth,
      height: levelHeight,
      metadata: { rotation: geometry.rotation },
    },
    update: {
      warehouseObjectId,
      shelfKind: "rack_level",
      levelNumber,
      displayName: `${geometry.name} / shelf ${levelNumber}`,
      sortOrder: levelNumber,
      positionX: geometry.positionX,
      positionY: geometry.positionY,
      positionZ: geometry.elevation + levelHeight * (levelNumber - 1),
      width: geometry.width,
      depth: geometry.depth,
      height: levelHeight,
      metadata: { rotation: geometry.rotation },
    },
  });
}

async function upsertPhysicalSlot(tx: Prisma.TransactionClient, warehouseId: string, shelfId: string, code: string, input: GenerateRackSlotsFromSceneObjectInput, slotIndex: number, geometry: RackGeometry, levelNumber: number) {
  const location = parseShelfLocation(code, input.room);
  const storageLocation = await upsertStorageLocation(tx, location, input.room);
  const slotOffset = (slotIndex - 1) * input.palletWidth;
  return tx.warehouseSlot.upsert({
    where: { warehouseId_normalizedCode_compartment: { warehouseId, normalizedCode: location.normalizedCode, compartment: input.compartment } },
    create: {
      warehouseId,
      shelfId,
      storageLocationId: storageLocation.id,
      code: location.code,
      normalizedCode: location.normalizedCode,
      compartment: input.compartment,
      slotIndex,
      displayName: `${location.code} / FACK ${input.compartment}`,
      sortOrder: slotIndex,
      positionX: geometry.positionX + slotOffset,
      positionY: geometry.positionY,
      positionZ: geometry.elevation,
      width: input.palletWidth,
      depth: input.palletDepth,
      palletWidth: input.palletWidth,
      palletDepth: input.palletDepth,
      metadata: { levelNumber, physicalSlot: true, rackObjectId: geometry.externalObjectId },
    },
    update: {
      shelfId,
      storageLocationId: storageLocation.id,
      slotIndex,
      displayName: `${location.code} / FACK ${input.compartment}`,
      sortOrder: slotIndex,
      width: input.palletWidth,
      depth: input.palletDepth,
      palletWidth: input.palletWidth,
      palletDepth: input.palletDepth,
      isActive: true,
      metadata: { levelNumber, physicalSlot: true, rackObjectId: geometry.externalObjectId },
    },
  });
}
