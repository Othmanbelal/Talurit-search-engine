export type DynamicColumnPreview = {
  key: string;
  name: string;
  sourceIndex: number;
};

export type DynamicSheetPreview = {
  sheetName: string;
  suggestedName: string;
  columns: DynamicColumnPreview[];
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
