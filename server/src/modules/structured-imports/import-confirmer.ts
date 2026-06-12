import type { Prisma, StructuredImportBatch, StructuredImportSheet } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import {
  categoryName,
  gradeValue,
  locationCode,
  manufacturerName,
} from "./mapped-data-access";
import { upsertCategory, upsertLocation, upsertManufacturer } from "./import-entity-resolver";
import { createInventoryItemFromImport } from "./import-item-writer";
import { saveImportProfile } from "./import-profile-writer";
import { upsertStockBalance } from "./import-stock-writer";
import type { MappedImportData } from "./structured-import.types";

export async function confirmStructuredBatch(args: {
  tx: Prisma.TransactionClient;
  batchId: string;
  userId?: string;
}) {
  const batch = await loadConfirmBatch(args.tx, args.batchId);
  validateConfirmable(batch);
  const groupId = await resolveBatchGroup(args.tx, batch);
  let importedRows = 0;
  let firstProfileId: string | null = null;

  for (const sheet of importableSheets(batch.sheets)) {
    const tableId = await resolveInventoryTable(args.tx, sheet, groupId);
    const profile = await saveImportProfile({ tx: args.tx, sheet });
    firstProfileId = firstProfileId || profile.id;

    for (const row of sheet.stagingRows.filter((candidate) => candidate.status === "ready")) {
      const data = row.mappedData as unknown as MappedImportData;
      const manufacturer = await upsertManufacturer(args.tx, manufacturerName(data));
      const category = await upsertCategory(args.tx, categoryName(data));
      const location = await upsertLocation(args.tx, locationCode(data));
      const item = await createInventoryItemFromImport({
        tx: args.tx,
        data,
        manufacturerId: manufacturer?.id,
        categoryId: category?.id,
        grade: gradeValue(data),
      });

      await upsertStockBalance({
        tx: args.tx,
        item,
        location,
        inventoryTableId: tableId,
        stagingRowId: row.id,
        data,
        userId: args.userId,
      });
      await args.tx.importStagingRow.update({ where: { id: row.id }, data: { detectedItemId: item.id, detectedLocationId: location?.id } });
      importedRows += 1;
    }
  }

  return args.tx.structuredImportBatch.update({
    where: { id: batch.id },
    data: { status: "imported", confirmedAt: new Date(), detectedProfileId: firstProfileId || undefined },
    include: { sheets: { include: { columnMappings: true } }, targetInventoryGroup: true },
  });
}

async function loadConfirmBatch(tx: Prisma.TransactionClient, batchId: string) {
  return tx.structuredImportBatch.findUnique({
    where: { id: batchId },
    include: {
      targetInventoryGroup: true,
      sheets: { include: { columnMappings: true, stagingRows: true } },
    },
  });
}

function validateConfirmable(batch: ConfirmBatch | null): asserts batch is ConfirmBatch {
  if (!batch) throw new AppError("Structured import batch was not found.", 404);
  const sheets = importableSheets(batch.sheets);
  if (sheets.length === 0) throw new AppError("No sheets are selected for import.", 400);
  const blocking = sheets.flatMap((sheet) => sheet.stagingRows.filter((row) => ["needs_review", "error", "pending"].includes(row.status)));
  if (blocking.length > 0) throw new AppError("Resolve all pending, error, and review rows before confirming import.", 400);
}

async function resolveBatchGroup(tx: Prisma.TransactionClient, batch: ConfirmBatch) {
  if (batch.targetInventoryGroupId) return batch.targetInventoryGroupId;
  const needsGroup = importableSheets(batch.sheets).some((sheet) => sheet.targetMode === "group_with_other_sheets");
  const needsMergeGroup = importableSheets(batch.sheets).some((sheet) => sheet.targetMode === "merge_with_selected_sheets");
  if (!needsGroup && !needsMergeGroup) return null;
  const group = await tx.inventoryGroup.create({ data: { name: `${batch.fileName} Import` } });
  await tx.structuredImportBatch.update({ where: { id: batch.id }, data: { targetInventoryGroupId: group.id } });
  return group.id;
}

async function resolveInventoryTable(tx: Prisma.TransactionClient, sheet: ConfirmSheet, groupId: string | null) {
  if (sheet.targetInventoryTableId) return sheet.targetInventoryTableId;
  if (sheet.targetMode === "merge_with_selected_sheets") return resolveMergedTable(tx, sheet, groupId);

  const table = await tx.inventoryTable.create({
    data: {
      groupId: sheet.targetInventoryGroupId || groupId,
      name: sheet.sheetName,
      sourceSheetName: sheet.sheetName,
      tableType: sheet.userSelectedSheetType || sheet.detectedSheetType || "generic_table",
    },
  });
  await tx.structuredImportSheet.update({ where: { id: sheet.id }, data: { targetInventoryTableId: table.id } });
  return table.id;
}

async function resolveMergedTable(tx: Prisma.TransactionClient, sheet: ConfirmSheet, groupId: string | null) {
  const targetGroupId = sheet.targetInventoryGroupId || groupId;
  const existing = await tx.inventoryTable.findFirst({
    where: { groupId: targetGroupId, tableType: "merged_inventory" },
  });
  if (existing) {
    await tx.structuredImportSheet.update({ where: { id: sheet.id }, data: { targetInventoryTableId: existing.id } });
    return existing.id;
  }

  const table = await tx.inventoryTable.create({
    data: {
      groupId: targetGroupId,
      name: "Merged imported inventory",
      sourceSheetName: "Multiple sheets",
      tableType: "merged_inventory",
    },
  });
  await tx.structuredImportSheet.update({ where: { id: sheet.id }, data: { targetInventoryTableId: table.id } });
  return table.id;
}

function importableSheets<T extends StructuredImportSheet>(sheets: T[]) {
  return sheets.filter((sheet) => sheet.selectedForImport && sheet.targetMode !== "ignore");
}

type ConfirmBatch = NonNullable<Awaited<ReturnType<typeof loadConfirmBatch>>>;
type ConfirmSheet = ConfirmBatch["sheets"][number];
