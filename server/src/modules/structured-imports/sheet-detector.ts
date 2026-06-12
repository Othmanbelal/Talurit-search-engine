import type { ColumnSuggestion, SheetTargetMode, SheetType } from "./structured-import.types";
import { normalizeText } from "./structured-import.normalizers";

export function detectSheetType(sheetName: string, columns: ColumnSuggestion[]): SheetType {
  const name = normalizeText(sheetName);
  const targets = new Set(columns.map((column) => column.targetType));

  if (name.includes("belaggning") || name.includes("location")) return "location_reference";
  if (name.includes("okuma") || name.includes("haas")) return "machine_tool_list";
  if (targets.has("item_field") && targets.has("quantity")) return "stockroom_inventory";
  if (targets.has("item_field") || targets.has("identifier")) return "inventory_items";
  return "generic_table";
}

export function suggestTargetMode(sheetType: SheetType): SheetTargetMode {
  if (sheetType === "ignore") return "ignore";
  return "group_with_other_sheets";
}
