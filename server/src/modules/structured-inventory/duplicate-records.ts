import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { normalizeKey } from "../structured-imports/structured-import.normalizers";
import { serializeStockRow } from "./structured-inventory.serializer";
import type { MergeDuplicateRowsInput } from "./structured-inventory.schemas";

const duplicateInclude = {
  item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
  location: true,
  usedInAssignments: { where: { returnedAt: null }, include: { card: true } },
  takenItems: { where: { returnedAt: null } },
} satisfies Prisma.StockBalanceInclude;

export async function findDuplicateGroups(tableId: string) {
  const rows = await prisma.stockBalance.findMany({
    where: { inventoryTableId: tableId, status: { not: "archived" } },
    include: duplicateInclude,
    orderBy: [{ item: { name: "asc" } }, { location: { code: "asc" } }, { compartment: "asc" }],
  });
  return duplicateGroups(rows);
}

export async function duplicateSummary(tableId: string) {
  const groups = await findDuplicateGroups(tableId);
  return { duplicateGroups: groups.length, duplicateRows: groups.reduce((total, group) => total + group.rows.length, 0) };
}

export async function mergeDuplicateRows(tableId: string, input: MergeDuplicateRowsInput, userId?: string) {
  const ids = Array.from(new Set(input.rowIds));
  if (!ids.includes(input.primaryRowId)) throw new AppError("Primary row must be part of the selected duplicate rows.", 400);

  await prisma.$transaction(async (tx) => {
    const rows = await tx.stockBalance.findMany({
      where: { id: { in: ids }, inventoryTableId: tableId, status: { not: "archived" } },
      include: duplicateInclude,
    });
    if (rows.length !== ids.length) throw new AppError("One or more duplicate rows were not found.", 404);
    const primary = rows.find((row) => row.id === input.primaryRowId);
    if (!primary) throw new AppError("Primary row was not found.", 404);
    assertMergeCompatible(rows);

    const mergedRows = rows.filter((row) => row.id !== primary.id);
    const quantityAfter = rows.reduce((total, row) => total.plus(row.quantity), new Prisma.Decimal(0));
    await tx.stockBalance.update({ where: { id: primary.id }, data: { quantity: quantityAfter } });
    await tx.stockMovement.create({
      data: {
        itemId: primary.itemId,
        locationId: primary.locationId,
        stockBalanceId: primary.id,
        movementType: "merge_duplicate",
        quantityChange: quantityAfter.minus(primary.quantity),
        quantityBefore: primary.quantity,
        quantityAfter,
        reason: `Merged ${mergedRows.length} duplicate row${mergedRows.length === 1 ? "" : "s"}`,
        createdByUserId: userId,
      },
    });
    await tx.stockBalance.updateMany({
      where: { id: { in: mergedRows.map((row) => row.id) } },
      data: { status: "archived", archivedAt: new Date(), archivedByUserId: userId, quantity: 0 },
    });
  });
}

function duplicateGroups(rows: DuplicateRow[]) {
  const groups = new Map<string, DuplicateRow[]>();
  for (const row of rows) {
    const key = duplicateKey(row);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }
  return Array.from(groups.entries()).flatMap(([key, groupedRows]) => (
    groupedRows.length > 1 ? [{ key, rows: groupedRows.map(serializeStockRow) }] : []
  ));
}

function duplicateKey(row: DuplicateRow) {
  const article = row.item.identifiers.find((identifier) => identifier.type === "manufacturer_article")?.normalizedValue;
  const altArticle = row.item.identifiers.find((identifier) => identifier.type === "alternative_article")?.normalizedValue;
  const manufacturer = normalizeKey(row.item.manufacturer?.name ?? "");
  if (article || altArticle) return [manufacturer, article ?? "", altArticle ?? ""].join("|");
  return [manufacturer, normalizeKey(row.item.name), normalizeKey(row.item.category?.name ?? ""), normalizeKey(row.item.grade ?? "")].join("|");
}

function assertMergeCompatible(rows: DuplicateRow[]) {
  const first = rows[0];
  for (const row of rows) {
    if (row.unit !== first.unit || row.currency !== first.currency) throw new AppError("Rows with different units or currencies cannot be merged.", 400);
    if (row.usedInAssignments.length > 0 || row.takenItems.length > 0) {
      throw new AppError("Return used/taken duplicate rows before merging.", 400);
    }
  }
}

type DuplicateRow = Prisma.StockBalanceGetPayload<{ include: typeof duplicateInclude }>;
