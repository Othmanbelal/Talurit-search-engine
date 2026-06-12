import { getSheetRows, readWorkbook } from "../excel/excel.workbook";
import { buildHeaders, detectHeaderRow } from "./header-detector";
import { suggestColumn } from "./column-suggester";
import { detectSheetType, suggestTargetMode } from "./sheet-detector";
import { hasValue } from "./structured-import.normalizers";
import type { ScannedSheet, SourceRow } from "./structured-import.types";

export function scanWorkbook(buffer: Buffer): ScannedSheet[] {
  const workbook = readWorkbook(buffer);
  return workbook.SheetNames.map((sheetName) => scanSheet(sheetName, getSheetRows(workbook, sheetName)))
    .filter((sheet): sheet is ScannedSheet => Boolean(sheet));
}

function scanSheet(sheetName: string, rows: unknown[][]): ScannedSheet | null {
  const headerIndex = detectHeaderRow(rows);
  if (headerIndex === null) return null;

  const headers = buildHeaders(rows[headerIndex] ?? []);
  const indexedRows = rows.slice(headerIndex + 1)
    .map((row, index) => ({ row, rowNumber: headerIndex + index + 2 }))
    .filter(({ row }) => row.some(hasValue));
  const dataRows = indexedRows.map(({ row }) => row);
  const columns = headers.map((_, columnIndex) => suggestColumn(headers, dataRows, columnIndex));
  const detectedSheetType = detectSheetType(sheetName, columns);

  return {
    sheetName,
    detectedSheetType,
    suggestedTargetMode: suggestTargetMode(detectedSheetType),
    headerRowNumber: headerIndex + 1,
    rowsRead: dataRows.length,
    columns,
    sourceRows: indexedRows.map(({ row, rowNumber }) => buildSourceRow(headers, row, rowNumber)),
  };
}

function buildSourceRow(headers: string[], row: unknown[], rowNumber: number): SourceRow {
  const valuesByHeader: SourceRow["valuesByHeader"] = {};
  headers.forEach((header, index) => {
    valuesByHeader[header] = normalizeCell(row[index]);
  });
  return { rowNumber, valuesByHeader };
}

function normalizeCell(value: unknown): string | number | boolean | null {
  if (value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return value === null ? null : String(value);
}
