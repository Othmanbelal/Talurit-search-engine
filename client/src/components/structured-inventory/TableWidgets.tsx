import type { StructuredInventoryTable, StructuredStockRowsResponse } from "../../types/structured-inventory";
import { InventoryStats } from "./InventoryStats";

export function TableWidgets({ rows, table }: { rows: StructuredStockRowsResponse | null; table: StructuredInventoryTable | null }) {
  const settings = table?.columnSettings;
  if (!settings || !rows) return null;
  const items = [];
  if (settings.widgets.itemCount) items.push({ label: "Items", value: rows.stats.itemCount });
  if (settings.widgets.balance) items.push({ label: "Inventory balance", value: balance(rows.stats.balance, rows.stats.currency) });
  return items.length > 0 ? <InventoryStats items={items} /> : null;
}

function balance(value: number, currency: string) {
  return `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}
