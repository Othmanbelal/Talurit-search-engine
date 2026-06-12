export type DynamicInventoryColumn = {
  id: string;
  key: string;
  name: string;
  sourceIndex: number;
  dataType: string;
};

export type DynamicInventory = {
  id: string;
  name: string;
  sourceFileName?: string | null;
  sourceSheetName?: string | null;
  createdAt: string;
  updatedAt: string;
  columns?: DynamicInventoryColumn[];
  _count?: {
    columns?: number;
    rows?: number;
  };
};

export type DynamicInventoryRow = {
  id: string;
  inventoryId: string;
  rowNumber: number;
  data: Record<string, string | null>;
};

export type DynamicSheetPreview = {
  sheetName: string;
  suggestedName: string;
  columns: { key: string; name: string; sourceIndex: number }[];
  rowsRead: number;
  sampleRows: Record<string, string | null>[];
};

export type DynamicImportPreview = {
  fileName: string;
  sheets: DynamicSheetPreview[];
};

export type ConfirmDynamicImportResult = {
  inventoriesCreated: number;
  rowsCreated: number;
  columnsCreated: number;
};

export type DynamicRowsResponse = {
  items: DynamicInventoryRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
