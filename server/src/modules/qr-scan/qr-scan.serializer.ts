import type { Prisma } from "@prisma/client";

type ScanRowRecord = Prisma.StockBalanceGetPayload<{
  include: {
    inventoryTable: { include: { group: true } };
    item: { include: { manufacturer: true; category: true; identifiers: true; attributes: true } };
    location: true;
    warehouseSlotAssignments: { include: { warehouse: true; slot: { include: { shelf: true } } } };
    usedInAssignments: { include: { card: true; spot: true } };
  };
}>;

type ManagerRecord = Prisma.ResourceManagerGetPayload<{
  include: { user: { select: { id: true; name: true; email: true; role: true; profile: { select: { profilePictureUrl: true; phoneNumber: true } } } } };
}>;

export function serializeScanRow(row: ScanRowRecord, managers: ManagerRecord[]) {
  const article = row.item.identifiers.find((identifier) => identifier.type === "manufacturer_article")?.value ?? null;
  const altArticle = row.item.identifiers.find((identifier) => identifier.type === "alternative_article")?.value ?? null;
  const tableManagers = managers.filter((manager) =>
    (manager.resourceType === "inventory_table" && manager.resourceId === row.inventoryTableId) ||
    (manager.resourceType === "inventory_group" && manager.resourceId === row.inventoryTable?.groupId)
  );

  return {
    stockBalanceId: row.id,
    publicId: row.publicId,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    compartment: row.compartment,
    status: row.status,
    table: row.inventoryTable ? {
      id: row.inventoryTable.id,
      name: row.inventoryTable.name,
      groupId: row.inventoryTable.groupId,
      groupName: row.inventoryTable.group?.name ?? null,
    } : null,
    item: {
      id: row.item.id,
      name: row.item.name,
      qrCodeId: row.item.qrCodeId,
      imageUrl: row.item.imageUrl,
      qrCodeImageUrl: row.item.qrCodeImageUrl,
      articleNumber: article,
      alternativeArticleNumber: altArticle,
      manufacturer: row.item.manufacturer?.name ?? null,
      category: row.item.category?.name ?? null,
      grade: row.item.grade,
      attributes: row.item.attributes.map((attribute) => ({
        name: attribute.name,
        rawValue: attribute.rawValue,
        numericValue: attribute.numericValue ? toNumber(attribute.numericValue) : null,
        unit: attribute.unit,
      })),
    },
    location: row.location ? {
      id: row.location.id,
      code: row.location.code,
      displayName: row.location.displayName,
      room: row.location.room,
      locationType: row.location.locationType,
    } : null,
    managers: tableManagers.map((manager) => ({
      id: manager.user.id,
      name: manager.user.name,
      email: manager.user.email,
      role: manager.user.role,
      pictureUrl: manager.user.profile?.profilePictureUrl ?? null,
      phoneNumber: manager.user.profile?.phoneNumber ?? null,
      scope: manager.resourceType,
    })),
    warehousePlacements: row.warehouseSlotAssignments.map((assignment) => ({
      warehouseId: assignment.warehouseId,
      warehouseName: assignment.warehouse.name,
      slotId: assignment.slotId,
      slotCode: assignment.slot.code,
      slotName: assignment.slot.displayName,
      shelfId: assignment.slot.shelfId,
      shelfName: assignment.slot.shelf.displayName ?? assignment.slot.shelf.code,
    })),
    usedIn: row.usedInAssignments.map((assignment) => ({
      cardId: assignment.cardId,
      cardName: assignment.card.name,
      spotName: assignment.spot?.name ?? null,
      quantity: toNumber(assignment.quantity),
    })),
  };
}

function toNumber(value: { toNumber?: () => number } | number) {
  return typeof value === "number" ? value : value.toNumber?.() ?? Number(value);
}
