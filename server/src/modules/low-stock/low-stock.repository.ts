import { prisma } from "../../db/prisma";

export function loadRowForLowStock(stockBalanceId: string) {
  return prisma.stockBalance.findUnique({
    where: { id: stockBalanceId },
    select: {
      id: true,
      quantity: true,
      unit: true,
      lowStockEnabled: true,
      lowStockThreshold: true,
      reorderUrl: true,
      lowStockNotifiedAt: true,
      inventoryTableId: true,
      item: { select: { name: true, identifiers: { select: { type: true, value: true } } } },
      location: { select: { code: true } },
      inventoryTable: { select: { id: true, name: true, lowStockEnabled: true } },
    },
  });
}

export type LowStockRow = NonNullable<Awaited<ReturnType<typeof loadRowForLowStock>>>;

/**
 * Candidate rows that are enabled + at/below threshold + not yet notified.
 * Column-to-column comparison isn't expressible in Prisma `where`, so the final
 * quantity<=threshold filter happens in memory (the candidate set is small).
 */
export async function listLowStockCandidateIds(): Promise<string[]> {
  const rows = await prisma.stockBalance.findMany({
    where: {
      lowStockEnabled: true,
      lowStockThreshold: { not: null },
      lowStockNotifiedAt: null,
      status: { not: "archived" },
      inventoryTable: { is: { lowStockEnabled: true } },
    },
    select: { id: true, quantity: true, lowStockThreshold: true },
  });
  return rows
    .filter((row) => row.lowStockThreshold != null && row.quantity.lte(row.lowStockThreshold))
    .map((row) => row.id);
}

export function setLowStockNotifiedAt(stockBalanceId: string, value: Date | null) {
  return prisma.stockBalance.update({ where: { id: stockBalanceId }, data: { lowStockNotifiedAt: value } });
}

export function writeReorderLog(data: {
  stockBalanceId: string;
  itemName: string;
  tableName: string;
  quantity: number;
  threshold: number;
  reorderUrl: string | null;
  recipients: string[];
  success: boolean;
  error?: string | null;
}) {
  return prisma.reorderNotificationLog.create({
    data: {
      stockBalanceId: data.stockBalanceId,
      itemName: data.itemName,
      tableName: data.tableName,
      quantity: data.quantity,
      threshold: data.threshold,
      reorderUrl: data.reorderUrl,
      recipients: data.recipients.join(", "),
      success: data.success,
      error: data.error ?? null,
    },
  });
}

export function setTableLowStockEnabled(tableId: string, enabled: boolean) {
  return prisma.inventoryTable.update({ where: { id: tableId }, data: { lowStockEnabled: enabled } });
}

export function findTableById(tableId: string) {
  return prisma.inventoryTable.findUnique({ where: { id: tableId }, select: { id: true } });
}

export function findRowForConfig(tableId: string, rowId: string) {
  return prisma.stockBalance.findFirst({
    where: { id: rowId, inventoryTableId: tableId },
    select: { id: true },
  });
}

export function setRowLowStockConfig(rowId: string, data: {
  lowStockEnabled: boolean;
  lowStockThreshold: number | null;
  reorderUrl: string | null;
}) {
  return prisma.stockBalance.update({
    where: { id: rowId },
    data: {
      lowStockEnabled: data.lowStockEnabled,
      lowStockThreshold: data.lowStockThreshold,
      reorderUrl: data.reorderUrl,
      // Re-arm notifications whenever the config changes so the next dip emails.
      lowStockNotifiedAt: null,
    },
  });
}
