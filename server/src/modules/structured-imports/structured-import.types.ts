export type SheetType =
  | "stockroom_inventory"
  | "inventory_items"
  | "location_reference"
  | "machine_tool_list"
  | "generic_table"
  | "ignore";

export type SheetTargetMode =
  | "create_new_table"
  | "group_with_other_sheets"
  | "add_to_existing_table"
  | "merge_with_selected_sheets"
  | "ignore";

export type MappingTargetType =
  | "ignore"
  | "item_field"
  | "manufacturer"
  | "identifier"
  | "category"
  | "grade"
  | "location"
  | "compartment"
  | "quantity"
  | "unit_price"
  | "machine_reference"
  | "item_attribute"
  | "note";

export type ColumnSuggestion = {
  columnIndex: number;
  excelHeader: string;
  normalizedExcelHeader: string;
  sampleValues: string[];
  targetType: MappingTargetType;
  targetField?: string;
  attributeName?: string;
  attributeUnit?: string;
  attributeDataType?: string;
  confidence: number;
};

export type SourceRow = {
  rowNumber: number;
  valuesByHeader: Record<string, string | number | boolean | null>;
};

export type ScannedSheet = {
  sheetName: string;
  detectedSheetType: SheetType;
  suggestedTargetMode: SheetTargetMode;
  headerRowNumber: number | null;
  rowsRead: number;
  columns: ColumnSuggestion[];
  sourceRows: SourceRow[];
};

export type StageRowStatus = "ready" | "needs_review" | "error" | "ignored";

export type MappedImportData = {
  item: Record<string, unknown>;
  identifiers: Record<string, unknown>;
  stock: Record<string, unknown>;
  location: Record<string, unknown>;
  attributes: Record<string, unknown>;
  notes: Record<string, unknown>;
  duplicate?: {
    status: "possible" | "verified" | "dismissed";
    message: string;
    keys: string[];
  };
};

export type RowValidationResult = {
  status: StageRowStatus;
  confidence: number;
  message?: string;
  mappedData: MappedImportData;
};

export type ScanResult = {
  batchId: string;
  fileName: string;
  sheets: Omit<ScannedSheet, "sourceRows">[];
};
