type BatchWithSheets = {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  readyRows: number;
  reviewRows: number;
  errorRows: number;
  targetInventoryGroup?: { id: string; name: string } | null;
  sheets: Array<{
    id: string;
    sheetName: string;
    detectedSheetType: string | null;
    userSelectedSheetType: string | null;
    headerRowNumber: number | null;
    selectedForImport: boolean;
    targetMode: string | null;
    targetInventoryGroupId: string | null;
    targetInventoryTableId: string | null;
    columnMappings: Array<{
      id: string;
      excelHeader: string;
      normalizedExcelHeader: string;
      columnIndex: number;
      targetType: string;
      targetField: string | null;
      attributeName: string | null;
      attributeUnit: string | null;
      attributeDataType: string | null;
      sampleValues: unknown;
      confidence: unknown;
    }>;
  }>;
};

export function serializeBatch(batch: BatchWithSheets) {
  return {
    id: batch.id,
    fileName: batch.fileName,
    status: batch.status,
    counts: {
      totalRows: batch.totalRows,
      readyRows: batch.readyRows,
      reviewRows: batch.reviewRows,
      errorRows: batch.errorRows,
    },
    targetInventoryGroup: batch.targetInventoryGroup,
    sheets: batch.sheets.map((sheet) => ({
      id: sheet.id,
      sheetName: sheet.sheetName,
      detectedSheetType: sheet.detectedSheetType,
      userSelectedSheetType: sheet.userSelectedSheetType,
      headerRowNumber: sheet.headerRowNumber,
      selectedForImport: sheet.selectedForImport,
      targetMode: sheet.targetMode,
      targetInventoryGroupId: sheet.targetInventoryGroupId,
      targetInventoryTableId: sheet.targetInventoryTableId,
      mappings: sheet.columnMappings.map((mapping) => ({
        id: mapping.id,
        excelHeader: mapping.excelHeader,
        normalizedExcelHeader: mapping.normalizedExcelHeader,
        columnIndex: mapping.columnIndex,
        targetType: mapping.targetType,
        targetField: mapping.targetField,
        attributeName: mapping.attributeName,
        attributeUnit: mapping.attributeUnit,
        attributeDataType: mapping.attributeDataType,
        sampleValues: Array.isArray(mapping.sampleValues) ? mapping.sampleValues : [],
        confidence: Number(mapping.confidence ?? 0),
      })),
    })),
  };
}
