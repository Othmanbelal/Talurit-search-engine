import type { Prisma } from "@prisma/client";
import { normalizeColumnSettings } from "./column-settings";

type InteractionLogRecord = Prisma.ItemInteractionLogGetPayload<{
  include: { user: { select: { name: true; profile: { select: { profilePictureUrl: true } } } } };
}>;

export function serializeInteractionLog(log: InteractionLogRecord) {
  return {
    id: log.id,
    action: log.action,
    itemName: log.itemName,
    quantity: log.quantity?.toString() ?? null,
    notes: log.notes,
    userName: log.user?.name ?? log.userName ?? null,
    userPictureUrl: log.user?.profile?.profilePictureUrl ?? null,
    userId: log.userId,
    createdAt: log.createdAt.toISOString(),
  };
}

type GroupRecord = Prisma.InventoryGroupGetPayload<{
  include: { _count: { select: { tables: true } }; tables: { include: { _count: { select: { stockBalances: true } } } } };
}>;

type TableRecord = Prisma.InventoryTableGetPayload<{
  include: { group: true; _count: { select: { stockBalances: true } } };
}>;

type BaseStockRowRecord = Prisma.StockBalanceGetPayload<{
  include: {
    item: { include: { manufacturer: true; category: true; identifiers: true; attributes: true } };
    location: true;
    usedInAssignments: { include: { card: true } };
  };
}>;

type UsedInAssignmentRecord = Prisma.UsedInStockAssignmentGetPayload<{ include: { card: true } }> & {
  createdByUser?: { name: string } | null;
};

type TakenItemRecord = Prisma.TakenStockItemGetPayload<{}> & {
  createdByUser?: { name: string } | null;
};

type WarehousePlacementRecord = Prisma.WarehouseSlotAssignmentGetPayload<{}> & {
  warehouse: { id: string; name: string };
  slot: { id: string; code: string; compartment: string; displayName: string | null };
};

type StockRowRecord = Omit<BaseStockRowRecord, "usedInAssignments"> & {
  usedInAssignments: UsedInAssignmentRecord[];
  takenItems?: TakenItemRecord[];
  warehouseSlotAssignments?: WarehousePlacementRecord[];
};

export function serializeGroup(group: GroupRecord) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    tableCount: group._count.tables,
    rowCount: group.tables.reduce((total, table) => total + table._count.stockBalances, 0),
    tables: group.tables.map(serializeTableSummary),
  };
}

export function serializeTable(table: TableRecord) {
  return {
    ...serializeTableSummary(table),
    group: table.group
      ? { id: table.group.id, name: table.group.name, description: table.group.description }
      : null,
  };
}

export function serializeTableSummary(table: {
  id: string;
  groupId: string | null;
  name: string;
  sourceSheetName: string | null;
  tableType: string;
  columnSettings?: unknown;
  createdAt: Date;
  updatedAt: Date;
  _count?: { stockBalances?: number };
}) {
  return {
    id: table.id,
    groupId: table.groupId,
    name: table.name,
    sourceSheetName: table.sourceSheetName,
    tableType: table.tableType,
    columnSettings: normalizeColumnSettings(table.columnSettings),
    rowCount: table._count?.stockBalances ?? 0,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };
}

export function serializeStockRow(row: StockRowRecord) {
  const article = findIdentifier(row, "manufacturer_article");
  const altArticle = findIdentifier(row, "alternative_article");
  const quantity = toNumber(row.quantity);
  const unitPrice = row.unitPrice ? toNumber(row.unitPrice) : null;

  return {
    id: row.id,
    publicId: row.publicId,
    compartment: row.compartment,
    quantity,
    unit: row.unit,
    unitPrice,
    currency: row.currency,
    totalValue: unitPrice === null ? null : quantity * unitPrice,
    status: row.status,
    notes: row.notes,
    archivedAt: row.archivedAt,
    usageTags: usageTags(row),
    activityTags: activityTags(row),
    warehousePlacement: warehousePlacement(row),
    item: {
      id: row.item.id,
      name: row.item.name,
      grade: row.item.grade,
      imageUrl: row.item.imageUrl,
      qrCodeId: row.item.qrCodeId,
      qrCodeImageUrl: row.item.qrCodeImageUrl,
      articleNumber: article,
      alternativeArticleNumber: altArticle,
      manufacturer: row.item.manufacturer?.name ?? null,
      category: row.item.category?.name ?? null,
      attributes: row.item.attributes.map((attribute) => ({
        name: attribute.name,
        rawValue: attribute.rawValue,
        numericValue: attribute.numericValue ? toNumber(attribute.numericValue) : null,
        unit: attribute.unit,
      })),
    },
    location: row.location
      ? {
          id: row.location.id,
          code: row.location.code,
          displayName: row.location.displayName,
          locationType: row.location.locationType,
          room: row.location.room,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function warehousePlacement(row: StockRowRecord) {
  const assignment = row.warehouseSlotAssignments?.[0];
  if (!assignment) return null;
  return {
    assignmentId: assignment.id,
    warehouseId: assignment.warehouse.id,
    warehouseName: assignment.warehouse.name,
    slotId: assignment.slot.id,
    slotCode: assignment.slot.code,
    slotCompartment: assignment.slot.compartment,
    slotDisplayName: assignment.slot.displayName,
  };
}

function findIdentifier(row: StockRowRecord, type: string) {
  return row.item.identifiers.find((identifier) => identifier.type === type)?.value ?? null;
}

function toNumber(value: { toNumber?: () => number } | number) {
  return typeof value === "number" ? value : value.toNumber?.() ?? Number(value);
}

function usageTags(row: StockRowRecord) {
  const byCard = new Map<string, { cardId: string; cardName: string; quantity: number }>();
  for (const assignment of row.usedInAssignments) {
    const current = byCard.get(assignment.cardId) ?? { cardId: assignment.cardId, cardName: assignment.card.name, quantity: 0 };
    current.quantity += toNumber(assignment.quantity);
    byCard.set(assignment.cardId, current);
  }
  return Array.from(byCard.values());
}

function activityTags(row: StockRowRecord) {
  const tags = new Map<string, ActivityTag>();
  for (const assignment of row.usedInAssignments) {
    const userName = displayUserName(assignment.createdByUser?.name);
    const key = `used_in:${assignment.cardId}:${userName}`;
    const current = tags.get(key) ?? {
      type: "used_in" as const,
      cardId: assignment.cardId,
      cardName: assignment.card.name,
      quantity: 0,
      userName,
    };
    current.quantity += toNumber(assignment.quantity);
    tags.set(key, current);
  }

  for (const taken of row.takenItems ?? []) {
    const userName = displayUserName(taken.createdByUser?.name);
    const key = `taken:${userName}`;
    const current = tags.get(key) ?? { type: "taken" as const, quantity: 0, userName };
    current.quantity += toNumber(taken.quantity);
    tags.set(key, current);
  }

  return Array.from(tags.values());
}

function displayUserName(name?: string | null) {
  return name?.trim() || "Unknown user";
}

type ActivityTag = {
  type: "used_in" | "taken";
  quantity: number;
  userName: string;
  cardId?: string;
  cardName?: string;
};
