import { AppError } from "../../utils/AppError";
import { getSheetRows, readWorkbook } from "../excel/excel.workbook";
import type { DynamicImportPreview, DynamicSheetPreview } from "./inventories.types";

const allowedExtensions = [".xlsx", ".xlsm", ".xls"];

export function buildDynamicImportPreview(file?: Express.Multer.File): DynamicImportPreview {
  validateExcelFile(file);

  const workbook = readWorkbook(file.buffer);
  const sheets = workbook.SheetNames.map((sheetName) =>
    mapSheetPreview(sheetName, getSheetRows(workbook, sheetName)),
  ).filter((sheet): sheet is DynamicSheetPreview => Boolean(sheet));

  return { fileName: file.originalname, sheets };
}

function mapSheetPreview(sheetName: string, rows: unknown[][]): DynamicSheetPreview | null {
  const headerIndex = rows.findIndex((row) => row.some(hasValue));
  if (headerIndex < 0) return null;

  const headerRow = rows[headerIndex];
  const columns = headerRow.map((cell, index) => ({
    key: uniqueColumnKey(headerRow, index),
    name: cleanCell(cell) || `Column ${index + 1}`,
    sourceIndex: index,
  }));
  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some(hasValue));
  const sampleRows = dataRows.slice(0, 5).map((row) => rowToRecord(row, columns));

  return {
    sheetName,
    suggestedName: sheetName,
    columns,
    rowsRead: dataRows.length,
    sampleRows,
  };
}

export function buildDynamicSheetData(file: Express.Multer.File) {
  const preview = buildDynamicImportPreview(file);
  const workbook = readWorkbook(file.buffer);

  return preview.sheets.map((sheet) => {
    const rows = getSheetRows(workbook, sheet.sheetName);
    const headerIndex = rows.findIndex((row) => row.some(hasValue));
    const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some(hasValue));

    return {
      ...sheet,
      rows: dataRows.map((row, index) => ({
        rowNumber: headerIndex + index + 2,
        data: rowToRecord(row, sheet.columns),
      })),
    };
  });
}

function rowToRecord(
  row: unknown[],
  columns: { key: string; sourceIndex: number }[],
): Record<string, string | null> {
  return Object.fromEntries(
    columns.map((column) => [column.key, cleanCell(row[column.sourceIndex]) || null]),
  );
}

function uniqueColumnKey(headerRow: unknown[], index: number) {
  const base = slugify(cleanCell(headerRow[index]) || `column-${index + 1}`);
  const earlier = headerRow.slice(0, index).map((cell) => slugify(cleanCell(cell)));
  const duplicateCount = earlier.filter((key) => key === base).length;

  return duplicateCount > 0 ? `${base}-${duplicateCount + 1}` : base;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "column";
}

function cleanCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function hasValue(value: unknown) {
  return cleanCell(value).length > 0;
}

function validateExcelFile(file?: Express.Multer.File): asserts file is Express.Multer.File {
  if (!file) throw new AppError("Excel file is required.", 400);
  if (file.size === 0) throw new AppError("Uploaded Excel file is empty.", 400);
  if (!allowedExtensions.some((extension) => file.originalname.toLowerCase().endsWith(extension))) {
    throw new AppError("Only .xlsx, .xlsm, or .xls files are supported.", 400);
  }
}
