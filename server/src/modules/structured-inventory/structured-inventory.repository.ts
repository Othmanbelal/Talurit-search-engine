import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type { ListStockRowsQuery } from "./structured-inventory.schemas";
import { normalizeColumnSettings } from "./column-settings";
import { normalizeKey } from "../structured-imports/structured-import.normalizers";

const tableSummaryInclude = { _count: { select: { stockBalances: true } } };
const groupInclude = {
  _count: { select: { tables: true } },
  tables: { include: tableSummaryInclude, orderBy: { createdAt: "desc" as const } },
};

export function findInventoryGroups() {
  return prisma.inventoryGroup.findMany({
    include: groupInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function findUngroupedTables() {
  return prisma.inventoryTable.findMany({
    where: { groupId: null },
    include: tableSummaryInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function findInventoryGroup(id: string) {
  return prisma.inventoryGroup.findUnique({
    where: { id },
    include: groupInclude,
  });
}

export function findInventoryTable(id: string) {
  return prisma.inventoryTable.findUnique({
    where: { id },
    include: { group: true, ...tableSummaryInclude },
  });
}

export function updateInventoryTableColumns(id: string, columnSettings: Prisma.InputJsonValue) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.inventoryTable.findUnique({ where: { id }, select: { columnSettings: true } });
    await deleteRemovedCustomColumnData(tx, id, current?.columnSettings, columnSettings);
    return tx.inventoryTable.update({
      where: { id },
      data: { columnSettings },
      include: { group: true, ...tableSummaryInclude },
    });
  });
}

export async function deleteInventoryGroupRecord(id: string) {
  await prisma.inventoryGroup.delete({ where: { id } });
}

export async function deleteInventoryTableRecord(id: string) {
  await prisma.$transaction(async (tx) => {
    await tx.stockBalance.deleteMany({ where: { inventoryTableId: id } });
    await tx.inventoryTable.delete({ where: { id } });
  });
}

export function findStockRows(tableId: string, query: ListStockRowsQuery) {
  const where = buildStockWhere(tableId, query);
  const skip = (query.page - 1) * query.pageSize;

  return prisma.$transaction([
    prisma.stockBalance.count({ where }),
    prisma.stockBalance.findMany({
      where,
      include: {
        item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
        location: true,
        usedInAssignments: { where: { returnedAt: null }, include: { card: true, createdByUser: userNameSelect() } },
        borrowRecords: { where: { status: "active" }, include: { currentHolder: userNameSelect() } },
        warehouseSlotAssignments: { where: { unassignedAt: null }, include: warehousePlacementInclude() },
      },
      orderBy: [{ location: { code: "asc" } }, { compartment: "asc" }, { item: { name: "asc" } }],
      skip,
      take: query.pageSize,
    }),
  ]);
}

export async function findStockRowStats(tableId: string, query: ListStockRowsQuery) {
  const rows = await prisma.stockBalance.findMany({
    where: buildStockWhere(tableId, {
      ...query,
      search: undefined,
      itemName: undefined,
      manufacturerName: undefined,
      categoryName: undefined,
      attributeFilters: [],
    }),
    select: {
      quantity: true,
      unitPrice: true,
      currency: true,
    },
  });
  const balance = rows.reduce((total, row) => total + row.quantity.toNumber() * (row.unitPrice?.toNumber() ?? 0), 0);
  return { itemCount: rows.length, differentItems: rows.length, balance, currency: rows[0]?.currency ?? "SEK" };
}

export async function findStockFilterOptions(tableId: string) {
  const rows = await prisma.stockBalance.findMany({
    where: { inventoryTableId: tableId, status: { not: "archived" } },
    select: {
      item: {
        select: {
          name: true,
          manufacturer: { select: { name: true } },
          category: { select: { name: true } },
          attributes: { select: { name: true, rawValue: true, numericValue: true } },
        },
      },
    },
    orderBy: { item: { name: "asc" } },
  });
  return {
    itemNames: unique(rows.map((row) => row.item.name)),
    manufacturers: unique(rows.map((row) => row.item.manufacturer?.name).filter(Boolean) as string[]),
    categories: unique(rows.map((row) => row.item.category?.name).filter(Boolean) as string[]),
    attributes: attributeOptions(rows.flatMap((row) => row.item.attributes)),
  };
}

export function findStockRow(tableId: string, rowId: string) {
  return prisma.stockBalance.findFirst({
    where: { id: rowId, inventoryTableId: tableId },
    include: {
      item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
      location: true,
      usedInAssignments: { where: { returnedAt: null }, include: { card: true, createdByUser: userNameSelect() } },
      borrowRecords: { where: { status: "active" }, include: { currentHolder: userNameSelect() } },
      warehouseSlotAssignments: { where: { unassignedAt: null }, include: warehousePlacementInclude() },
    },
  });
}

const stockRowFullInclude = {
  item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
  location: true,
  usedInAssignments: { where: { returnedAt: null }, include: { card: true, createdByUser: userNameSelect() } },
  borrowRecords: { where: { status: "active" }, include: { currentHolder: userNameSelect() } },
  warehouseSlotAssignments: { where: { unassignedAt: null }, include: warehousePlacementInclude() },
} satisfies Prisma.StockBalanceInclude;

function lowStockWhere(tableId: string): Prisma.StockBalanceWhereInput {
  return {
    inventoryTableId: tableId,
    status: { not: "archived" },
    archivedAt: null,
    lowStockEnabled: true,
    lowStockThreshold: { not: null },
  };
}

/** Count enabled items at/below their threshold (qty<=threshold can't be a Prisma where, so filter in memory). */
export async function countTableLowStock(tableId: string): Promise<number> {
  const rows = await prisma.stockBalance.findMany({
    where: lowStockWhere(tableId),
    select: { quantity: true, lowStockThreshold: true },
  });
  return rows.filter((row) => row.lowStockThreshold != null && row.quantity.lte(row.lowStockThreshold)).length;
}

/** The actual low-stock rows for a table (for the summary widget's list), fully included for serialization. */
export async function findTableLowStockRows(tableId: string) {
  const rows = await prisma.stockBalance.findMany({
    where: lowStockWhere(tableId),
    include: stockRowFullInclude,
    orderBy: { quantity: "asc" },
  });
  return rows.filter((row) => row.lowStockThreshold != null && row.quantity.lte(row.lowStockThreshold));
}

function userNameSelect() {
  return { select: { name: true } } as const;
}

function warehousePlacementInclude() {
  return {
    warehouse: { select: { id: true, name: true } },
    slot: { select: { id: true, code: true, compartment: true, displayName: true } },
  } as const;
}

function buildStockWhere(tableId: string, query: ListStockRowsQuery): Prisma.StockBalanceWhereInput {
  const trimmed = query.search?.trim();
  const where: Prisma.StockBalanceWhereInput = { inventoryTableId: tableId };
  const item = buildItemWhere(query);
  if (query.archived === "archived") where.status = "archived";
  if (query.archived === "active") where.status = { not: "archived" };
  if (Object.keys(item).length > 0) where.item = { is: item };
  if (!trimmed) return where;

  where.OR = [
    { item: { is: { name: { contains: trimmed, mode: "insensitive" } } } },
    { item: { is: { manufacturer: { is: { name: { contains: trimmed, mode: "insensitive" } } } } } },
    { item: { is: { category: { is: { name: { contains: trimmed, mode: "insensitive" } } } } } },
    { item: { is: { identifiers: { some: { value: { contains: trimmed, mode: "insensitive" } } } } } },
    { item: { is: { attributes: { some: { rawValue: { contains: trimmed, mode: "insensitive" } } } } } },
    { location: { is: { code: { contains: trimmed, mode: "insensitive" } } } },
    { compartment: { contains: trimmed, mode: "insensitive" } },
  ];

  return where;
}

function buildItemWhere(query: ListStockRowsQuery): Prisma.InventoryItemWhereInput {
  const item: Prisma.InventoryItemWhereInput = {};
  if (query.itemName) item.name = query.itemName;
  if (query.manufacturerName) item.manufacturer = { is: { name: query.manufacturerName } };
  if (query.categoryName) item.category = { is: { name: query.categoryName } };
  const attributeFilters = query.attributeFilters ?? [];
  if (attributeFilters.length > 0) item.AND = attributeFilters.map(attributeFilter);
  return item;
}

function attributeFilter(filter: { name: string; value: string }): Prisma.InventoryItemWhereInput {
  const valueFilters: Prisma.ItemAttributeWhereInput[] = [{ rawValue: filter.value }];
  const numericValue = numericFilterValue(filter.value);
  if (numericValue !== null) valueFilters.push({ numericValue });
  return { attributes: { some: { name: filter.name, OR: valueFilters } } };
}

function attributeOptions(attributes: { name: string; rawValue: string | null; numericValue: Prisma.Decimal | null }[]) {
  const byName = new Map<string, Set<string>>();
  for (const attribute of attributes) {
    const value = attributeDisplayValue(attribute);
    if (!value) continue;
    const values = byName.get(attribute.name) ?? new Set<string>();
    values.add(value);
    byName.set(attribute.name, values);
  }
  return Array.from(byName.entries())
    .map(([name, values]) => ({ name, label: attributeLabel(name), values: unique(Array.from(values)) }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function attributeDisplayValue(attribute: { rawValue: string | null; numericValue: Prisma.Decimal | null }) {
  return attribute.rawValue?.trim() || attribute.numericValue?.toString() || "";
}

function attributeLabel(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function numericFilterValue(value: string) {
  const normalized = value.replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function findStockRowHistory(stockBalanceId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.itemInteractionLog.findMany({
    where: { stockBalanceId, createdAt: { gte: since } },
    include: { user: { select: { name: true, profile: { select: { profilePictureUrl: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

async function deleteRemovedCustomColumnData(
  tx: Prisma.TransactionClient,
  tableId: string,
  previous: unknown,
  next: unknown,
) {
  const previousSettings = normalizeColumnSettings(previous);
  const nextKeys = new Set(normalizeColumnSettings(next).customColumns.map((column) => column.key));
  const removedNames = previousSettings.customColumns
    .filter((column) => !nextKeys.has(column.key))
    .map((column) => normalizeKey(column.name));
  if (removedNames.length === 0) return;
  const rows = await tx.stockBalance.findMany({ where: { inventoryTableId: tableId }, select: { itemId: true } });
  await tx.itemAttribute.deleteMany({
    where: { itemId: { in: rows.map((row) => row.itemId) }, name: { in: removedNames } },
  });
}
