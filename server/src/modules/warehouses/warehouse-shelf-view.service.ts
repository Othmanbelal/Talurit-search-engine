import { findAvailableLocationCodes, findLinkedTableIds, findShelvesWithItems } from "./warehouse-shelf-view.repository";
import { getWarehouse } from "./warehouse.service";

export async function getShelfView(warehouseId: string) {
  await getWarehouse(warehouseId);
  const tableIds = await findLinkedTableIds(warehouseId);
  const shelves = await findShelvesWithItems(warehouseId, tableIds);
  return {
    shelves: shelves.map((shelf) => ({
      id: shelf.id,
      code: shelf.code,
      displayName: shelf.displayName,
      shelfKind: shelf.shelfKind,
      levelNumber: shelf.levelNumber,
      warehouseObject: shelf.warehouseObject
        ? {
            id: shelf.warehouseObject.id,
            name: shelf.warehouseObject.name,
            externalObjectId: shelf.warehouseObject.externalObjectId,
            positionX: shelf.warehouseObject.positionX,
            positionY: shelf.warehouseObject.positionY,
            elevation: shelf.warehouseObject.elevation,
            rotation: shelf.warehouseObject.rotation,
            width: shelf.warehouseObject.width,
            depth: shelf.warehouseObject.depth,
            height: shelf.warehouseObject.height,
          }
        : null,
      slots: shelf.slots.map((slot) => ({
        id: slot.id,
        code: slot.code,
        displayName: slot.displayName,
        compartment: slot.compartment,
        slotIndex: slot.slotIndex,
        locationAssigned: slot.locationAssigned,
        palletWidth: slot.palletWidth,
        palletDepth: slot.palletDepth,
        items: slot.items,
      })),
    })),
    linkedTableCount: tableIds.length,
  };
}

export async function getLocationCodes(warehouseId: string) {
  await getWarehouse(warehouseId);
  const tableIds = await findLinkedTableIds(warehouseId);
  return findAvailableLocationCodes(warehouseId, tableIds);
}
