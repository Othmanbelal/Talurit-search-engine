import { AppError } from "../../utils/AppError";
import { isTableManager } from "../managers/manager-access";
import { sendLowStockEmail } from "./low-stock.email";
import {
  findRowForConfig,
  findTableById,
  listLowStockCandidateIds,
  loadRowForLowStock,
  setLowStockNotifiedAt,
  setRowLowStockConfig,
  setTableLowStockEnabled,
  writeReorderLog,
  type LowStockRow,
} from "./low-stock.repository";

/**
 * Re-evaluate one row's low-stock state after a quantity change. Fire-and-forget:
 * never throws into the caller. Sends one reorder email per downward crossing and
 * re-arms when restocked above the threshold.
 */
export async function evaluateLowStock(stockBalanceId: string): Promise<void> {
  try {
    const row = await loadRowForLowStock(stockBalanceId);
    if (!row || !row.inventoryTable) return;

    const effectiveEnabled =
      row.inventoryTable.lowStockEnabled && row.lowStockEnabled && row.lowStockThreshold != null;
    if (!effectiveEnabled || row.lowStockThreshold == null) return;

    const quantity = row.quantity.toNumber();
    const threshold = row.lowStockThreshold.toNumber();

    if (quantity > threshold) {
      // Back above threshold — re-arm so the next dip notifies again.
      if (row.lowStockNotifiedAt != null) await setLowStockNotifiedAt(row.id, null);
      return;
    }

    // At/below threshold: notify once until re-armed.
    if (row.lowStockNotifiedAt != null) return;
    await notify(row, quantity, threshold);
  } catch (error) {
    console.error("[low-stock] evaluate failed:", error instanceof Error ? error.message : error);
  }
}

async function notify(row: LowStockRow, quantity: number, threshold: number) {
  const articleNumber =
    row.item.identifiers.find((id) => id.type === "manufacturer_article")?.value ?? null;

  const result = await sendLowStockEmail({
    tableId: row.inventoryTable!.id,
    itemName: row.item.name,
    articleNumber,
    tableName: row.inventoryTable!.name,
    location: row.location?.code ?? null,
    quantity,
    threshold,
    unit: row.unit,
    reorderUrl: row.reorderUrl,
  });

  await writeReorderLog({
    stockBalanceId: row.id,
    itemName: row.item.name,
    tableName: row.inventoryTable!.name,
    quantity,
    threshold,
    reorderUrl: row.reorderUrl,
    recipients: result.recipients,
    success: result.sent,
    error: result.error,
  }).catch(() => undefined);

  // Only mark notified on success so a failed send (e.g. SMTP down) is retried by the sweep.
  if (result.sent) await setLowStockNotifiedAt(row.id, new Date());
}

/** Daily reconciliation: notify any enabled, low, not-yet-notified row. */
export async function sweepLowStock(): Promise<void> {
  const ids = await listLowStockCandidateIds();
  for (const id of ids) {
    await evaluateLowStock(id);
  }
}

export async function setTableLowStock(tableId: string, enabled: boolean, userId: string, role: string) {
  const table = await findTableById(tableId);
  if (!table) throw new AppError("Inventory table not found.", 404);
  await assertCanManage(tableId, userId, role);
  await setTableLowStockEnabled(tableId, enabled);
  return { tableId, lowStockEnabled: enabled };
}

export async function setRowLowStock(
  tableId: string,
  rowId: string,
  input: { enabled: boolean; threshold: number | null; reorderUrl: string | null },
  userId: string,
  role: string,
) {
  const row = await findRowForConfig(tableId, rowId);
  if (!row) throw new AppError("Inventory row not found.", 404);
  await assertCanManage(tableId, userId, role);
  if (input.enabled && input.threshold == null) {
    throw new AppError("A low-stock threshold is required to enable low stock for this item.", 400);
  }
  await setRowLowStockConfig(rowId, {
    lowStockEnabled: input.enabled,
    lowStockThreshold: input.threshold,
    reorderUrl: input.reorderUrl,
  });
  // Re-check immediately so a freshly-configured low item notifies without waiting for the sweep.
  void evaluateLowStock(rowId);
  return {
    rowId,
    lowStockEnabled: input.enabled,
    lowStockThreshold: input.threshold,
    reorderUrl: input.reorderUrl,
  };
}

async function assertCanManage(tableId: string, userId: string, role: string) {
  if (role === "admin") return;
  if (role === "manager" && (await isTableManager(userId, tableId))) return;
  throw new AppError("Only the table manager or an admin can change low-stock settings.", 403);
}
