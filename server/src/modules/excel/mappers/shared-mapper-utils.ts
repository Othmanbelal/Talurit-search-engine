import type { RawExcelData } from "../excel.types";

export type SheetRow = unknown[];

export function cellText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function hasText(value: unknown) {
  return cellText(value) !== null;
}

export function columnLetter(index: number) {
  let dividend = index + 1;
  let label = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    label = String.fromCharCode(65 + modulo) + label;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return label;
}

export function rowHasAnyValue(row: SheetRow) {
  return row.some((cell) => hasText(cell));
}

export function parseInteger(value: unknown) {
  const text = cellText(value);
  if (!text) return null;

  const normalized = text.replace(",", ".");
  if (!/^\d+(\.0+)?$/.test(normalized)) return null;

  return Number.parseInt(normalized, 10);
}

export function headerMap(headerRow: SheetRow) {
  const map = new Map<string, number>();

  headerRow.forEach((value, index) => {
    const header = cellText(value);
    if (header) {
      map.set(header, index);
      map.set(normalizeHeaderKey(header), index);
    }
  });

  return map;
}

export function valueByHeader(row: SheetRow, headers: Map<string, number>, name: string) {
  const index = headers.get(name) ?? headers.get(normalizeHeaderKey(name));
  return index === undefined ? null : cellText(row[index]);
}

function normalizeHeaderKey(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("sv-SE");
}

export function valueByIndex(row: SheetRow, index: number) {
  return cellText(row[index]);
}

export function rawDataFromRow(args: {
  headers?: SheetRow;
  row: SheetRow;
  rowNumber: number;
  sheetName: string;
}): RawExcelData {
  const values: Record<string, unknown> = {};

  args.row.forEach((value, index) => {
    const header = args.headers ? cellText(args.headers[index]) : null;
    const key = header ? `${columnLetter(index)}:${header}` : columnLetter(index);
    values[key] = value ?? null;
  });

  return {
    sourceSheet: args.sheetName,
    sourceRowNumber: args.rowNumber,
    values,
  };
}

export function rawDataFromCell(args: {
  cellValue: unknown;
  columnIndex: number;
  rowNumber: number;
  sheetName: string;
}): RawExcelData {
  const cell = `${columnLetter(args.columnIndex)}${args.rowNumber}`;

  return {
    sourceSheet: args.sheetName,
    sourceRowNumber: args.rowNumber,
    sourceCell: cell,
    values: {
      cell,
      value: args.cellValue ?? null,
    },
  };
}
