import type { ImportStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { normalizeLookupKey } from "../../utils/normalize";
import { toolInclude } from "../tools/tools.types";

export type ExcelTransaction = Prisma.TransactionClient;

export function runExcelTransaction<T>(handler: (transaction: ExcelTransaction) => Promise<T>) {
  return prisma.$transaction(handler, { maxWait: 10_000, timeout: 60_000 });
}

export function createImportBatch(
  transaction: ExcelTransaction,
  data: Prisma.ImportBatchUncheckedCreateInput,
) {
  return transaction.importBatch.create({ data });
}

export function updateImportBatchStatus(
  transaction: ExcelTransaction,
  id: string,
  data: {
    duplicateRows: number;
    invalidRows: number;
    status: ImportStatus;
    validRows: number;
  },
) {
  return transaction.importBatch.update({ where: { id }, data });
}

export function createImportIssues(
  transaction: ExcelTransaction,
  rows: Prisma.ImportRowIssueUncheckedCreateInput[],
) {
  if (rows.length === 0) return Promise.resolve({ count: 0 });
  return transaction.importRowIssue.createMany({ data: rows });
}

export function upsertManufacturer(transaction: ExcelTransaction, name: string) {
  return transaction.manufacturer.upsert({
    where: { name },
    update: {},
    create: { name, normalizedName: normalizeLookupKey(name) },
  });
}

export function upsertToolType(transaction: ExcelTransaction, name: string) {
  return transaction.toolType.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

export function upsertMachine(transaction: ExcelTransaction, name: string) {
  return transaction.machine.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

export async function findOrCreateLocation(
  transaction: ExcelTransaction,
  data: Prisma.LocationCreateInput,
) {
  const existing = await transaction.location.findFirst({ where: buildLocationWhere(data) });

  if (!existing) {
    const location = await transaction.location.create({ data });
    return { location, created: true };
  }

  const location = await transaction.location.update({
    where: { id: existing.id },
    data: {
      rawLabel: data.rawLabel,
      shelf: data.shelf,
      drawer: data.drawer,
      compartment: data.compartment,
      mapRow: data.mapRow,
      mapColumn: data.mapColumn,
      sourceSheet: data.sourceSheet,
      description: data.description ?? existing.description,
      rawData: data.rawData,
    },
  });

  return { location, created: false };
}

export async function findToolForImport(
  transaction: ExcelTransaction,
  args: {
    articleNumber?: string | null;
    locationId?: string | null;
    manufacturerId?: string | null;
    productName: string;
    sourceRowNumber: number;
    sourceSheet: string;
  },
) {
  const sourceMatch = await transaction.tool.findFirst({
    where: { sourceSheet: args.sourceSheet, sourceRowNumber: args.sourceRowNumber },
  });

  // Excel rows have stable source coordinates; matching by row preserves duplicate-looking rows.
  if (sourceMatch || args.sourceRowNumber) return sourceMatch;
  if (!args.articleNumber && !args.manufacturerId && !args.locationId) return null;

  return transaction.tool.findFirst({
    where: {
      productName: args.productName,
      sourceSheet: args.sourceSheet,
      ...(args.articleNumber ? { articleNumber: args.articleNumber } : {}),
      ...(args.manufacturerId ? { manufacturerId: args.manufacturerId } : {}),
      ...(args.locationId ? { locationId: args.locationId } : {}),
    },
  });
}

export function createImportedTool(
  transaction: ExcelTransaction,
  data: Prisma.ToolUncheckedCreateInput,
) {
  return transaction.tool.create({ data });
}

export function updateImportedTool(
  transaction: ExcelTransaction,
  id: string,
  data: Prisma.ToolUncheckedUpdateInput,
) {
  return transaction.tool.update({ where: { id }, data });
}

export function createToolHistory(
  transaction: ExcelTransaction,
  data: Prisma.ToolHistoryUncheckedCreateInput,
) {
  return transaction.toolHistory.create({ data });
}

export function findExportTools(args: {
  orderBy: Prisma.ToolOrderByWithRelationInput[];
  where: Prisma.ToolWhereInput;
}) {
  return prisma.tool.findMany({
    where: args.where,
    orderBy: args.orderBy,
    include: toolInclude,
  });
}

export function findExportLocations() {
  return prisma.location.findMany({
    orderBy: [{ rawLabel: "asc" }, { shelf: "asc" }, { compartment: "asc" }],
  });
}

export function findExportMachines() {
  return prisma.machine.findMany({ orderBy: { name: "asc" } });
}

function buildLocationWhere(data: Prisma.LocationCreateInput): Prisma.LocationWhereInput {
  if (data.sourceSheet && data.mapRow && data.mapColumn) {
    return {
      sourceSheet: data.sourceSheet,
      mapRow: data.mapRow,
      mapColumn: data.mapColumn,
    };
  }

  const rawLabel = typeof data.rawLabel === "string" ? data.rawLabel : null;
  const shelf = typeof data.shelf === "string" ? data.shelf : null;
  const compartment = typeof data.compartment === "string" ? data.compartment : null;

  if (rawLabel && shelf && compartment) {
    // Repair the older preview shape "shelf / compartment" on the next import.
    return {
      OR: [
        { rawLabel, shelf, compartment },
        { rawLabel: `${shelf} / ${compartment}`, shelf, compartment },
      ],
    };
  }

  return {
    rawLabel: data.rawLabel,
    shelf: data.shelf,
    compartment: data.compartment,
  };
}
