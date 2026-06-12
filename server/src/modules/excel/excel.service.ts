import type { PreviewIssue, ExcelPreview, PreviewTool, SheetPreview } from "./excel.types";
import { buildToolOrderBy, buildToolWhere } from "../tools/tools.query";
import { buildInventoryExportWorkbook, exportFileName } from "./excel.exporter";
import { persistExcelPreview } from "./excel.importer";
import {
  findExportLocations,
  findExportMachines,
  findExportTools,
} from "./excel.repository";
import type { ExportInventoryQuery } from "./excel.schemas";
import { getSheetRows, readWorkbook } from "./excel.workbook";
import { mapBelaggningVrum } from "./mappers/belaggning-vrum.mapper";
import { mapVerktygsrum } from "./mappers/verktygsrum.mapper";
import { AppError } from "../../utils/AppError";

type MapperResult = Partial<Pick<ExcelPreview, "tools" | "locations" | "issues">>;

const belaggningSheetName = "Bel\u00e4ggning vrum";
const knownSheetNames = ["Verktygsrum", belaggningSheetName, "OKUMA", "HAAS", "Blad1"];
const importableSheetNames = ["Verktygsrum", belaggningSheetName];
const allowedExtensions = [".xlsx", ".xlsm", ".xls"];

export function createExcelImportPreview(file?: Express.Multer.File): ExcelPreview {
  validateExcelFile(file);

  const workbook = readWorkbook(file.buffer);
  const sheets: SheetPreview[] = [];
  const tools: ExcelPreview["tools"] = [];
  const locations: ExcelPreview["locations"] = [];
  const issues: PreviewIssue[] = [];

  // Known sheets get deterministic processing so positional sheets never use table logic.
  for (const sheetName of importableSheetNames) {
    if (!workbook.SheetNames.includes(sheetName)) {
      sheets.push({ sheetName, status: "missing", rowsRead: 0, message: "Sheet not found." });
      continue;
    }

    const rows = getSheetRows(workbook, sheetName);
    sheets.push({ sheetName, status: "processed", rowsRead: rows.length });
    const result = mapKnownSheet(sheetName, rows);
    tools.push(...(result.tools ?? []));
    locations.push(...(result.locations ?? []));
    issues.push(...(result.issues ?? []));
  }

  collectIgnoredSheetWarnings(workbook.SheetNames, sheets, issues);

  const duplicates = detectLikelyToolDuplicates(tools);

  return {
    fileName: file.originalname,
    sheets,
    tools,
    locations,
    issues,
    duplicates,
    summary: {
      tools: tools.length,
      locations: locations.length,
      issues: issues.length,
      duplicates: duplicates.length,
    },
  };
}

export async function confirmExcelImport(file: Express.Multer.File | undefined, userId: string) {
  const preview = createExcelImportPreview(file);

  return persistExcelPreview(preview, userId);
}

export async function exportInventory(query: ExportInventoryQuery) {
  const toolQuery = { ...query, page: 1, pageSize: 1 };
  const [tools, locations, machines] = await Promise.all([
    findExportTools({
      where: buildToolWhere(toolQuery),
      orderBy: buildToolOrderBy(toolQuery),
    }),
    findExportLocations(),
    findExportMachines(),
  ]);

  return {
    buffer: buildInventoryExportWorkbook({ tools, locations, machines }),
    fileName: exportFileName(),
  };
}

function validateExcelFile(file?: Express.Multer.File): asserts file is Express.Multer.File {
  if (!file) {
    throw new AppError("Excel file is required.", 400);
  }

  if (file.size === 0) {
    throw new AppError("Uploaded Excel file is empty.", 400);
  }

  if (!allowedExtensions.some((extension) => file.originalname.toLowerCase().endsWith(extension))) {
    throw new AppError("Only .xlsx, .xlsm, or .xls files are supported.", 400);
  }
}

function mapKnownSheet(sheetName: string, rows: unknown[][]): MapperResult {
  switch (sheetName) {
    case "Verktygsrum":
      return mapVerktygsrum(rows);
    case belaggningSheetName:
      return mapBelaggningVrum(rows);
    default:
      return {};
  }
}

function collectIgnoredSheetWarnings(
  workbookSheets: string[],
  sheets: SheetPreview[],
  issues: PreviewIssue[],
) {
  for (const sheetName of workbookSheets) {
    if (knownSheetNames.includes(sheetName)) {
      if (sheetName === "Blad1") {
        sheets.push({ sheetName, status: "ignored", rowsRead: 0, message: "Ignored by design." });
      }
      if (sheetName === "OKUMA" || sheetName === "HAAS") {
        sheets.push({
          sheetName,
          status: "ignored",
          rowsRead: 0,
          message: "Raw machine rows are no longer imported.",
        });
      }
      continue;
    }

    sheets.push({ sheetName, status: "ignored", rowsRead: 0, message: "Unknown sheet ignored." });
    issues.push({
      sheetName,
      severity: "WARNING",
      message: "Unknown workbook sheet was ignored during preview.",
      rawData: { sourceSheet: sheetName, values: { sheetName } },
    });
  }
}

function detectLikelyToolDuplicates(tools: PreviewTool[]) {
  const issues: PreviewIssue[] = [];
  const seen = new Map<string, PreviewTool>();

  for (const tool of tools) {
    const key = toolDuplicateKey(tool);
    const existing = seen.get(key);

    if (existing) {
      issues.push({
        sheetName: tool.sourceSheet,
        rowNumber: tool.sourceRowNumber,
        severity: "WARNING",
        message: `Likely duplicate of row ${existing.sourceRowNumber} in ${existing.sourceSheet}.`,
        rawData: tool.rawData,
      });
      continue;
    }

    seen.set(key, tool);
  }

  return issues;
}

function toolDuplicateKey(tool: PreviewTool) {
  // Article numbers are not globally unique, so location and product context stay in the key.
  return [
    normalizeKey(tool.articleNumber),
    normalizeKey(tool.productName),
    normalizeKey(tool.manufacturerName),
    normalizeKey(tool.locationRawLabel),
  ].join("|");
}

function normalizeKey(value?: string | null) {
  return value?.trim().toLocaleLowerCase("sv-SE") ?? "";
}
