export type PreviewSeverity = "INFO" | "WARNING" | "ERROR";

export type RawExcelData = {
  sourceSheet: string;
  sourceRowNumber?: number;
  sourceCell?: string;
  values: Record<string, unknown>;
};

export type PreviewIssue = {
  sheetName: string;
  rowNumber?: number;
  severity: PreviewSeverity;
  message: string;
  rawData: RawExcelData;
};

export type PreviewTool = {
  productName: string;
  manufacturerName?: string | null;
  articleNumber?: string | null;
  alternativeArticleNumber?: string | null;
  grade?: string | null;
  mounting?: string | null;
  toolTypeName?: string | null;
  diameter?: string | null;
  cuttingLength?: string | null;
  cuttingSize?: string | null;
  holder?: string | null;
  holderSecondary?: string | null;
  overhang?: string | null;
  stockRaw?: string | null;
  quantity?: number | null;
  quantitySecondary?: number | null;
  countRaw?: string | null;
  priceRaw?: string | null;
  totalPriceRaw?: string | null;
  locationRawLabel?: string | null;
  locationCompartment?: string | null;
  machineName?: string | null;
  machineRaw?: string | null;
  sourceSheet: string;
  sourceRowNumber: number;
  rawData: RawExcelData;
};

export type PreviewLocation = {
  rawLabel?: string | null;
  shelf?: string | null;
  drawer?: string | null;
  compartment?: string | null;
  mapRow?: number | null;
  mapColumn?: number | null;
  sourceSheet: string;
  description?: string | null;
  rawData: RawExcelData;
};

export type SheetPreview = {
  sheetName: string;
  status: "processed" | "ignored" | "missing";
  rowsRead: number;
  message?: string;
};

export type ExcelPreview = {
  fileName: string;
  sheets: SheetPreview[];
  tools: PreviewTool[];
  locations: PreviewLocation[];
  issues: PreviewIssue[];
  duplicates: PreviewIssue[];
  summary: {
    tools: number;
    locations: number;
    issues: number;
    duplicates: number;
  };
};

export type ConfirmImportResult = {
  importBatchId: string;
  status: "IMPORTED" | "PARTIAL";
  fileName: string;
  toolsCreated: number;
  toolsUpdated: number;
  locationsCreated: number;
  locationsUpdated: number;
  issuesLogged: number;
  duplicateRows: number;
};
