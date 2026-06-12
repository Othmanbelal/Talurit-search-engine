import type { Prisma } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import type { ConfirmDynamicImportInput, ListInventoryRowsQuery } from "./inventories.schemas";
import {
  createDynamicInventory,
  findDynamicInventory,
  findDynamicInventoryRows,
  listDynamicInventories,
} from "./inventories.repository";
import { buildDynamicImportPreview, buildDynamicSheetData } from "./inventories.workbook";

export const previewDynamicImport = buildDynamicImportPreview;
export const getDynamicInventories = listDynamicInventories;

export async function confirmDynamicImport(
  file: Express.Multer.File | undefined,
  input: ConfirmDynamicImportInput,
  userId: string,
) {
  if (!file) throw new AppError("Excel file is required.", 400);
  const sheets = buildDynamicSheetData(file);
  let inventoriesCreated = 0;
  let rowsCreated = 0;
  let columnsCreated = 0;

  for (const sheet of sheets) {
    const inventory = await createDynamicInventory({
      columns: sheet.columns,
      importedByUserId: userId,
      name: input.tableNames[sheet.sheetName] ?? sheet.suggestedName,
      rows: sheet.rows.map((row) => ({
        rowNumber: row.rowNumber,
        data: row.data as Prisma.InputJsonValue,
      })),
      sourceFileName: file.originalname,
      sourceSheetName: sheet.sheetName,
    });

    inventoriesCreated += 1;
    rowsCreated += inventory._count.rows;
    columnsCreated += inventory._count.columns;
  }

  return { inventoriesCreated, rowsCreated, columnsCreated };
}

export async function getDynamicInventory(id: string) {
  const inventory = await findDynamicInventory(id);
  if (!inventory) throw new AppError("Inventory not found", 404);
  return inventory;
}

export async function getDynamicInventoryRows(id: string, query: ListInventoryRowsQuery) {
  await getDynamicInventory(id);
  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await findDynamicInventoryRows({
    inventoryId: id,
    skip,
    take: query.pageSize,
  });

  return {
    items: rows,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
