import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { normalizeKey, toNullableString } from "./structured-import.normalizers";
import { mapRawRow } from "./staging-mapper";
import { summarizeStatuses } from "./staging-summary";
import { validateMappedRow } from "./staging-validator";
import { confirmStructuredBatch } from "./import-confirmer";
import { markPossibleDuplicates } from "./duplicate-detector";
import type { ColumnSuggestion, ScannedSheet } from "./structured-import.types";

export async function createScanBatch(args: {
  fileName: string;
  uploadedByUserId?: string;
  sheets: ScannedSheet[];
}) {
  const totalRows = args.sheets.reduce((sum, sheet) => sum + sheet.rowsRead, 0);
  return prisma.$transaction(async (tx) => {
    const batch = await tx.structuredImportBatch.create({
      data: { fileName: args.fileName, uploadedByUserId: args.uploadedByUserId, status: "scanned", totalRows },
    });

    // Staging rows belong to both the batch and the sheet, so they are created after the sheet has an id.
    for (const sheet of args.sheets) {
      const createdSheet = await tx.structuredImportSheet.create({
        data: { importBatchId: batch.id, ...sheetCreateInput(sheet) },
      });
      await tx.importStagingRow.createMany({
        data: sheet.sourceRows.map((row) => ({
          importBatchId: batch.id,
          importSheetId: createdSheet.id,
          rowNumber: row.rowNumber,
          rawRow: row.valuesByHeader as Prisma.InputJsonValue,
        })),
      });
    }

    return tx.structuredImportBatch.findUniqueOrThrow({ where: { id: batch.id }, include: batchInclude });
  });
}

export async function getScanBatch(batchId: string) {
  return prisma.structuredImportBatch.findUnique({ where: { id: batchId }, include: batchInclude });
}

export async function updateBatchSheets(batchId: string, groupName: string | undefined, sheets: SheetUpdate[]) {
  return prisma.$transaction(async (tx) => {
    const group = groupName ? await tx.inventoryGroup.create({ data: { name: groupName } }) : null;

    for (const sheet of sheets) {
      await tx.structuredImportSheet.updateMany({
        where: { id: sheet.sheetId, importBatchId: batchId },
        data: {
          selectedForImport: sheet.selectedForImport,
          userSelectedSheetType: sheet.userSelectedSheetType,
          headerRowNumber: sheet.headerRowNumber ?? undefined,
          targetMode: sheet.targetMode,
          targetInventoryGroupId: sheet.targetInventoryGroupId ?? group?.id,
          targetInventoryTableId: sheet.targetInventoryTableId ?? undefined,
        },
      });
    }

    if (group) await tx.structuredImportBatch.update({ where: { id: batchId }, data: { targetInventoryGroupId: group.id } });
    return tx.structuredImportBatch.findUniqueOrThrow({ where: { id: batchId }, include: batchInclude });
  });
}

export async function replaceSheetMappings(sheetId: string, mappings: UserMapping[]) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.importColumnMapping.findMany({ where: { importSheetId: sheetId } });
    const samplesByColumn = new Map(existing.map((mapping) => [mapping.columnIndex, mapping.sampleValues]));

    await tx.importColumnMapping.deleteMany({ where: { importSheetId: sheetId } });
    await tx.importColumnMapping.createMany({
      data: mappings.map((mapping) => mappingCreateFromUser(sheetId, samplesByColumn)(mapping)),
    });
  });

  return prisma.structuredImportSheet.findUniqueOrThrow({
    where: { id: sheetId },
    include: { columnMappings: { orderBy: { columnIndex: "asc" } } },
  });
}

export async function stageBatchRows(batchId: string) {
  return prisma.$transaction(async (tx) => {
    const sheets = await tx.structuredImportSheet.findMany({
      where: { importBatchId: batchId, selectedForImport: true, targetMode: { not: "ignore" } },
      include: { columnMappings: true, stagingRows: { orderBy: { rowNumber: "asc" } } },
    });
    const statuses: string[] = [];

    for (const sheet of sheets) {
      let previousLocation: string | null = null;
      const stagedRows: Array<{ row: typeof sheet.stagingRows[number]; result: ReturnType<typeof validateMappedRow> }> = [];
      for (const row of sheet.stagingRows) {
        const mapped = mapRawRow(row.rawRow as Record<string, unknown>, sheet.columnMappings);
        const result = validateMappedRow(mapped, previousLocation);
        previousLocation = toNullableString(mapped.location.code) || previousLocation;
        stagedRows.push({ row, result });
      }

      for (const { row, result } of markPossibleDuplicates(stagedRows)) {
        statuses.push(result.status);
        await tx.importStagingRow.update({
          where: { id: row.id },
          data: {
            mappedData: result.mappedData as Prisma.InputJsonValue,
            status: result.status,
            confidence: result.confidence,
            message: result.message ?? null,
          },
        });
      }
    }

    const counts = summarizeStatuses(statuses);
    return tx.structuredImportBatch.update({
      where: { id: batchId },
      data: { status: counts.reviewRows > 0 ? "needs_review" : "previewed", totalRows: statuses.length, ...counts },
      include: batchInclude,
    });
  });
}

export async function confirmBatchImport(batchId: string, userId?: string) {
  return prisma.$transaction(
    (tx) => confirmStructuredBatch({ tx, batchId, userId }),
    { maxWait: 10_000, timeout: 60_000 },
  );
}

export async function listStagingRows(batchId: string, status?: string) {
  return prisma.importStagingRow.findMany({
    where: {
      importBatchId: batchId,
      status: status || undefined,
      importSheet: { selectedForImport: true, targetMode: { not: "ignore" } },
    },
    orderBy: [{ importSheet: { sheetName: "asc" } }, { rowNumber: "asc" }],
    include: { importSheet: { select: { id: true, sheetName: true } } },
  });
}

export async function updateStagingRow(rowId: string, input: StagingRowUpdate) {
  return prisma.importStagingRow.update({
    where: { id: rowId },
    data: {
      mappedData: input.mappedData as Prisma.InputJsonValue | undefined,
      status: input.status,
      message: input.message,
    },
    include: { importSheet: { select: { id: true, sheetName: true } } },
  });
}

const batchInclude = {
  sheets: { include: { columnMappings: { orderBy: { columnIndex: "asc" } } }, orderBy: { sheetName: "asc" } },
  targetInventoryGroup: true,
} as const;

function sheetCreateInput(sheet: ScannedSheet) {
  return {
    sheetName: sheet.sheetName,
    detectedSheetType: sheet.detectedSheetType,
    headerRowNumber: sheet.headerRowNumber,
    selectedForImport: sheet.detectedSheetType !== "ignore",
    targetMode: sheet.suggestedTargetMode,
    columnMappings: { create: sheet.columns.map(mappingCreateInput) },
  };
}

function mappingCreateInput(column: ColumnSuggestion) {
  return {
    excelHeader: column.excelHeader,
    normalizedExcelHeader: column.normalizedExcelHeader,
    columnIndex: column.columnIndex,
    targetType: column.targetType,
    targetField: column.targetField,
    attributeName: column.attributeName,
    attributeUnit: column.attributeUnit,
    attributeDataType: column.attributeDataType,
    sampleValues: column.sampleValues as Prisma.InputJsonValue,
    confidence: column.confidence,
  };
}

function mappingCreateFromUser(sheetId: string, samplesByColumn = new Map<number, unknown>()) {
  return (mapping: UserMapping) => ({
    importSheetId: sheetId,
    excelHeader: mapping.excelHeader,
    normalizedExcelHeader: normalizeKey(mapping.excelHeader),
    columnIndex: mapping.columnIndex,
    targetType: mapping.targetType,
    targetField: mapping.targetField ?? null,
    attributeName: mapping.attributeName ?? null,
    attributeUnit: mapping.attributeUnit ?? null,
    attributeDataType: mapping.attributeDataType ?? null,
    sampleValues: (samplesByColumn.get(mapping.columnIndex) ?? []) as Prisma.InputJsonValue,
    confidence: 1,
  });
}

export type SheetUpdate = {
  sheetId: string;
  selectedForImport: boolean;
  userSelectedSheetType?: string;
  headerRowNumber?: number | null;
  targetMode?: string;
  targetInventoryGroupId?: string | null;
  targetInventoryTableId?: string | null;
};

export type UserMapping = {
  excelHeader: string;
  columnIndex: number;
  targetType: string;
  targetField?: string | null;
  attributeName?: string | null;
  attributeUnit?: string | null;
  attributeDataType?: string | null;
};

export type StagingRowUpdate = {
  mappedData?: unknown;
  status?: string;
  message?: string | null;
};
