import type { MappingTargetType, SheetTargetMode, SheetType, StagingStatus } from "./structuredImportTypes";

export const sheetTypeOptions: { value: SheetType; label: string }[] = [
  { value: "stockroom_inventory", label: "Stockroom inventory" },
  { value: "inventory_items", label: "Inventory items" },
  { value: "location_reference", label: "Location reference" },
  { value: "machine_tool_list", label: "Machine tool list" },
  { value: "generic_table", label: "Generic table" },
  { value: "ignore", label: "Ignore" },
];

export const targetModeOptions: { value: SheetTargetMode; label: string }[] = [
  { value: "create_new_table", label: "Keep as separate table" },
  { value: "group_with_other_sheets", label: "Group, but keep separate" },
  { value: "merge_with_selected_sheets", label: "Merge compatible sheets" },
  { value: "add_to_existing_table", label: "Add to existing table" },
  { value: "ignore", label: "Ignore sheet" },
];

export const mappingTargetOptions: { value: MappingTargetType; label: string }[] = [
  { value: "ignore", label: "Ignore" },
  { value: "item_field", label: "Item name" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "identifier", label: "Article number" },
  { value: "category", label: "Category / type" },
  { value: "grade", label: "Grade" },
  { value: "location", label: "Location" },
  { value: "compartment", label: "Compartment / fack" },
  { value: "quantity", label: "Quantity" },
  { value: "unit_price", label: "Unit price" },
  { value: "machine_reference", label: "Machine reference" },
  { value: "item_attribute", label: "Item attribute" },
  { value: "note", label: "Notes" },
];

export const statusOptions: StagingStatus[] = ["ready", "needs_review", "error", "ignored"];
