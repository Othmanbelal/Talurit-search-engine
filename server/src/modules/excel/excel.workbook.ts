import * as XLSX from "xlsx";
import type { SheetRow } from "./mappers/shared-mapper-utils";

export function readWorkbook(buffer: Buffer) {
  return XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
  });
}

export function getSheetRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    // Preserve blank rows so sourceRowNumber and mapRow match the original workbook.
    blankrows: true,
    defval: null,
    raw: false,
  });
}
