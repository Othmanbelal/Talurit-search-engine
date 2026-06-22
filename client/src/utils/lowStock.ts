import type { StructuredStockRow } from "../types/structured-inventory";

/** An item is "defined" (yellow button) when low stock is enabled with a threshold. */
export function isRowLowStockDefined(row: StructuredStockRow): boolean {
  return row.lowStockEnabled && row.lowStockThreshold != null;
}

/** A row is "LOW" (badge) when defined, the table allows it, and qty is at/below threshold. */
export function isRowLow(row: StructuredStockRow, tableLowStockEnabled: boolean): boolean {
  return (
    tableLowStockEnabled &&
    isRowLowStockDefined(row) &&
    row.quantity <= (row.lowStockThreshold as number)
  );
}
