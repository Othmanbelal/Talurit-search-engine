import { AppError } from "../../utils/AppError";
import type { ListStockRowsQuery } from "./structured-inventory.schemas";
import type {
  AddStockRowInput,
  CreateInventoryGroupInput,
  CreateInventoryTableInput,
  TableColumnSettingsInput,
  UpdateStockRowInput,
} from "./structured-inventory.schemas";
import { addManualStockRow, createGroupRecord, createTableRecord } from "./manual-stock-writer";
import {
  countTableLowStock,
  deleteInventoryGroupRecord,
  deleteInventoryTableRecord,
  findInventoryGroup,
  findInventoryGroups,
  findStockRow,
  findInventoryTable,
  findStockRows,
  findStockFilterOptions,
  findStockRowStats,
  findStockRowHistory,
  findTableLowStockRows,
  findUngroupedTables,
  updateInventoryTableColumns,
} from "./structured-inventory.repository";
import {
  serializeGroup,
  serializeInteractionLog,
  serializeStockRow,
  serializeTable,
  serializeTableSummary,
} from "./structured-inventory.serializer";
import {
  archiveStockRowRecord,
  deleteStockRowRecord,
  restoreStockRowRecord,
  updateStockRowRecord,
} from "./stock-row-editor";
import { duplicateSummary, findDuplicateGroups, mergeDuplicateRows } from "./duplicate-records";
import { logInteraction } from "./interaction-log";
import { cleanupResourceManagers } from "../resource-managers/resource-managers.service";
import { evaluateLowStock } from "../low-stock/low-stock.service";

export async function listStructuredInventories() {
  const [groups, ungroupedTables] = await Promise.all([
    findInventoryGroups(),
    findUngroupedTables(),
  ]);

  return {
    groups: groups.map(serializeGroup),
    ungroupedTables: ungroupedTables.map(serializeTableSummary),
  };
}

export async function getStructuredInventoryGroup(id: string) {
  const group = await findInventoryGroup(id);
  if (!group) throw new AppError("Inventory group not found.", 404);
  return serializeGroup(group);
}

export async function getStructuredInventoryTable(id: string) {
  const table = await findInventoryTable(id);
  if (!table) throw new AppError("Inventory table not found.", 404);
  return serializeTable(table);
}

export async function getStructuredInventoryRows(id: string, query: ListStockRowsQuery) {
  const table = await getStructuredInventoryTable(id);
  const [total, rows] = await findStockRows(id, query);
  const [stats, filterOptions] = await Promise.all([
    findStockRowStats(id, query),
    findStockFilterOptions(id),
  ]);
  const duplicates = await duplicateSummary(id);
  const lowStockCount = table.lowStockEnabled ? await countTableLowStock(id) : 0;

  return {
    items: rows.map(serializeStockRow),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
    stats: { ...stats, ...duplicates, lowStockCount },
    filterOptions,
  };
}

/** The low-stock rows for a table, for the summary widget's expandable list. */
export async function getTableLowStockRows(tableId: string) {
  await getStructuredInventoryTable(tableId);
  const rows = await findTableLowStockRows(tableId);
  return rows.map(serializeStockRow);
}

export async function createStructuredInventoryGroup(input: CreateInventoryGroupInput) {
  const group = await createGroupRecord(input);
  return serializeGroup({ ...group, _count: { tables: 0 }, tables: [] });
}

export async function createStructuredInventoryTable(input: CreateInventoryTableInput) {
  const table = await createTableRecord(input);
  return serializeTable(table);
}

export async function updateStructuredInventoryTableColumns(id: string, input: TableColumnSettingsInput) {
  await getStructuredInventoryTable(id);
  const table = await updateInventoryTableColumns(id, input);
  return serializeTable(table);
}

export async function deleteStructuredInventoryGroup(id: string) {
  await getStructuredInventoryGroup(id);
  await cleanupResourceManagers("inventory_group", id);
  await deleteInventoryGroupRecord(id);
}

export async function deleteStructuredInventoryTable(id: string) {
  await getStructuredInventoryTable(id);
  await cleanupResourceManagers("inventory_table", id);
  await deleteInventoryTableRecord(id);
}

export async function addStructuredStockRow(tableId: string, input: AddStockRowInput, userId?: string) {
  const table = await getStructuredInventoryTable(tableId);
  await addManualStockRow(tableId, input, userId);
  await logInteraction({ action: "add", inventoryTableId: tableId, userId, itemName: input.itemName, tableName: table.name }).catch((err: unknown) => console.error("[logInteraction:add]", err));
  return getStructuredInventoryRows(tableId, { page: 1, pageSize: 50, archived: "active", attributeFilters: [] });
}

export async function getStructuredStockRow(tableId: string, rowId: string) {
  await getStructuredInventoryTable(tableId);
  const row = await findStockRow(tableId, rowId);
  if (!row) throw new AppError("Inventory row not found.", 404);
  return serializeStockRow(row);
}

export async function updateStructuredStockRow(tableId: string, rowId: string, input: UpdateStockRowInput, userId?: string) {
  const before = await getStructuredStockRow(tableId, rowId);
  await updateStockRowRecord(tableId, rowId, input, userId);
  await logInteraction({ action: "edit", stockBalanceId: rowId, inventoryTableId: tableId, itemId: before.item.id, userId, itemName: before.item.name }).catch((err: unknown) => console.error("[logInteraction:edit]", err));
  // Re-check low stock after a manual quantity edit (may cross or clear the threshold).
  void evaluateLowStock(rowId);
  return getStructuredStockRow(tableId, rowId);
}

export async function archiveStructuredStockRow(tableId: string, rowId: string, userId?: string) {
  const row = await getStructuredStockRow(tableId, rowId);
  const result = await archiveStockRowRecord(tableId, rowId, userId);
  if (result.count === 0) throw new AppError("Inventory row not found.", 404);
  await logInteraction({ action: "archive", stockBalanceId: rowId, inventoryTableId: tableId, itemId: row.item.id, userId, itemName: row.item.name }).catch((err: unknown) => console.error("[logInteraction:archive]", err));
}

export async function restoreStructuredStockRow(tableId: string, rowId: string, userId?: string) {
  const row = await getStructuredStockRow(tableId, rowId);
  const result = await restoreStockRowRecord(tableId, rowId);
  if (result.count === 0) throw new AppError("Inventory row not found.", 404);
  await logInteraction({ action: "restore", stockBalanceId: rowId, inventoryTableId: tableId, itemId: row.item.id, userId, itemName: row.item.name }).catch((err: unknown) => console.error("[logInteraction:restore]", err));
}

export async function deleteStructuredStockRow(tableId: string, rowId: string, userId?: string) {
  const row = await getStructuredStockRow(tableId, rowId);
  const result = await deleteStockRowRecord(tableId, rowId);
  if (result.count === 0) throw new AppError("Inventory row not found.", 404);
  await logInteraction({ action: "delete", inventoryTableId: tableId, userId, itemId: row.item.id, itemName: row.item.name }).catch((err: unknown) => console.error("[logInteraction:delete]", err));
}

export async function getStructuredDuplicateGroups(tableId: string) {
  await getStructuredInventoryTable(tableId);
  return findDuplicateGroups(tableId);
}

export async function mergeStructuredDuplicateRows(tableId: string, input: Parameters<typeof mergeDuplicateRows>[1], userId?: string) {
  await getStructuredInventoryTable(tableId);
  await mergeDuplicateRows(tableId, input, userId);
}

export async function getStructuredStockRowHistory(rowId: string) {
  const logs = await findStockRowHistory(rowId);
  return logs.map(serializeInteractionLog);
}
