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

export type StagingStatus = "ready" | "needs_review" | "error" | "ignored";

export type StructuredMapping = {
  id?: string;
  excelHeader: string;
  normalizedExcelHeader?: string;
  columnIndex: number;
  targetType: MappingTargetType;
  targetField?: string | null;
  attributeName?: string | null;
  attributeUnit?: string | null;
  attributeDataType?: string | null;
  sampleValues?: string[];
  confidence?: number;
};

export type StructuredImportSheet = {
  id: string;
  sheetName: string;
  detectedSheetType: SheetType | null;
  userSelectedSheetType: SheetType | null;
  headerRowNumber: number | null;
  selectedForImport: boolean;
  targetMode: SheetTargetMode | null;
  targetInventoryGroupId: string | null;
  targetInventoryTableId: string | null;
  mappings: StructuredMapping[];
};

export type StructuredImportBatch = {
  id: string;
  fileName: string;
  status: string;
  counts: { totalRows: number; readyRows: number; reviewRows: number; errorRows: number };
  targetInventoryGroup?: { id: string; name: string } | null;
  sheets: StructuredImportSheet[];
};

export type StagingRow = {
  id: string;
  rowNumber: number;
  rawRow: Record<string, unknown>;
  mappedData?: {
    item?: Record<string, unknown>;
    identifiers?: Record<string, unknown>;
    stock?: Record<string, unknown>;
    location?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
    notes?: Record<string, unknown>;
    duplicate?: {
      status: "possible" | "verified" | "dismissed";
      message: string;
      keys: string[];
    };
  } | unknown;
  status: StagingStatus;
  confidence?: number | string | null;
  message?: string | null;
  importSheet?: { id: string; sheetName: string };
};

export type SheetChoice = {
  sheetId: string;
  selectedForImport: boolean;
  userSelectedSheetType?: SheetType;
  headerRowNumber?: number | null;
  targetMode?: SheetTargetMode;
  targetInventoryGroupId?: string | null;
  targetInventoryTableId?: string | null;
};
