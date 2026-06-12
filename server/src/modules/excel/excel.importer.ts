import { ImportStatus, IssueSeverity, ToolStatus, type Prisma } from "@prisma/client";
import { isValidStorageLabel, normalizeStorageLabel } from "../../utils/location-label";
import { normalizeText } from "../../utils/normalize";
import type {
  ConfirmImportResult,
  ExcelPreview,
  PreviewLocation,
  PreviewTool,
} from "./excel.types";
import {
  createImportBatch,
  createImportIssues,
  createImportedTool,
  createToolHistory,
  findOrCreateLocation,
  findToolForImport,
  runExcelTransaction,
  updateImportBatchStatus,
  updateImportedTool,
  upsertMachine,
  upsertManufacturer,
  upsertToolType,
} from "./excel.repository";

type ImportCounters = Omit<ConfirmImportResult, "fileName" | "importBatchId" | "status">;

export function persistExcelPreview(preview: ExcelPreview, importedByUserId: string) {
  return runExcelTransaction(async (transaction) => {
    const counters = createCounters(preview.duplicates.length);
    const batch = await createImportBatch(transaction, {
      fileName: preview.fileName,
      sheetName: "Workbook",
      importedByUserId,
      totalRows: preview.tools.length + preview.locations.length,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: preview.duplicates.length,
      status: ImportStatus.PREVIEWED,
    });
    const locationCache = new Map<string, string>();

    for (const location of preview.locations) {
      await persistLocation(transaction, location, counters, locationCache);
    }

    for (const tool of preview.tools) {
      await persistTool(transaction, tool, batch.id, importedByUserId, counters, locationCache);
    }

    counters.issuesLogged = await persistImportIssues(transaction, batch.id, preview);
    const status = preview.issues.some((issue) => issue.severity === "ERROR")
      ? ImportStatus.PARTIAL
      : ImportStatus.IMPORTED;

    await updateImportBatchStatus(transaction, batch.id, {
      duplicateRows: counters.duplicateRows,
      invalidRows: preview.issues.filter((issue) => issue.severity === "ERROR").length,
      status,
      validRows: countPersistedRecords(counters),
    });

    return {
      ...counters,
      importBatchId: batch.id,
      status,
      fileName: preview.fileName,
    } satisfies ConfirmImportResult;
  });
}

async function persistTool(
  transaction: Prisma.TransactionClient,
  tool: PreviewTool,
  importBatchId: string,
  importedByUserId: string,
  counters: ImportCounters,
  locationCache: Map<string, string>,
) {
  const manufacturer = await maybeUpsertManufacturer(transaction, tool.manufacturerName);
  const toolType = await maybeUpsertToolType(transaction, tool.toolTypeName);
  const machine = await maybeUpsertMachine(transaction, tool.machineName);
  const locationId = await resolveToolLocation(transaction, tool, counters, locationCache);
  const existing = await findToolForImport(transaction, {
    articleNumber: tool.articleNumber,
    locationId,
    manufacturerId: manufacturer?.id,
    productName: tool.productName,
    sourceRowNumber: tool.sourceRowNumber,
    sourceSheet: tool.sourceSheet,
  });
  const data = mapToolData(tool, importBatchId, manufacturer?.id, toolType?.id, locationId, machine?.id);

  if (existing) {
    await updateImportedTool(transaction, existing.id, mapToolUpdateData(data));
    await createToolHistory(transaction, {
      toolId: existing.id,
      action: "IMPORT_UPDATE",
      changedByUserId: importedByUserId,
    });
    counters.toolsUpdated += 1;
    return;
  }

  const created = await createImportedTool(transaction, data);
  await createToolHistory(transaction, {
    toolId: created.id,
    action: "IMPORT_CREATE",
    changedByUserId: importedByUserId,
  });
  counters.toolsCreated += 1;
}

async function persistLocation(
  transaction: Prisma.TransactionClient,
  location: PreviewLocation,
  counters: ImportCounters,
  cache: Map<string, string>,
) {
  if (!shouldPersistStorageLocation(location)) return null;

  const key = locationKey(location);
  const cachedId = cache.get(key);
  if (cachedId) return cachedId;

  const result = await findOrCreateLocation(transaction, mapLocationData(location));
  cache.set(key, result.location.id);
  if (result.created) counters.locationsCreated += 1;
  else counters.locationsUpdated += 1;

  return result.location.id;
}

async function resolveToolLocation(
  transaction: Prisma.TransactionClient,
  tool: PreviewTool,
  counters: ImportCounters,
  cache: Map<string, string>,
) {
  if (!tool.locationRawLabel && !tool.locationCompartment) return null;
  if (!isValidStorageLabel(tool.locationRawLabel)) return null;

  return persistLocation(
    transaction,
    {
      rawLabel: tool.locationRawLabel,
      shelf: tool.locationRawLabel,
      compartment: tool.locationCompartment,
      sourceSheet: tool.sourceSheet,
      rawData: tool.rawData,
    },
    counters,
    cache,
  );
}

function mapToolData(
  tool: PreviewTool,
  importBatchId: string,
  manufacturerId?: string,
  toolTypeId?: string,
  locationId?: string | null,
  machineId?: string,
) {
  return {
    productName: tool.productName,
    manufacturerId,
    articleNumber: clean(tool.articleNumber),
    alternativeArticleNumber: clean(tool.alternativeArticleNumber),
    grade: clean(tool.grade),
    mounting: clean(tool.mounting),
    toolTypeId,
    diameter: clean(tool.diameter),
    cuttingLength: clean(tool.cuttingLength),
    cuttingSize: clean(tool.cuttingSize),
    holder: clean(tool.holder),
    holderSecondary: clean(tool.holderSecondary),
    overhang: clean(tool.overhang),
    stockRaw: clean(tool.stockRaw),
    quantity: tool.quantity,
    quantitySecondary: tool.quantitySecondary,
    countRaw: clean(tool.countRaw),
    priceRaw: clean(tool.priceRaw),
    totalPriceRaw: clean(tool.totalPriceRaw),
    locationId,
    machineId,
    machineRaw: clean(tool.machineRaw),
    sourceSheet: tool.sourceSheet,
    sourceRowNumber: tool.sourceRowNumber,
    rawData: tool.rawData as Prisma.InputJsonValue,
    importBatchId,
    status: ToolStatus.AVAILABLE,
    isArchived: false,
  } satisfies Prisma.ToolUncheckedCreateInput;
}

function mapLocationData(location: PreviewLocation) {
  const rawLabel = normalizeStorageLabel(location.rawLabel ?? location.shelf);

  return {
    rawLabel,
    shelf: rawLabel,
    drawer: clean(location.drawer),
    compartment: clean(location.compartment),
    mapRow: location.mapRow,
    mapColumn: location.mapColumn,
    sourceSheet: location.sourceSheet,
    description: clean(location.description),
    rawData: location.rawData as Prisma.InputJsonValue,
  } satisfies Prisma.LocationCreateInput;
}

async function maybeUpsertManufacturer(transaction: Prisma.TransactionClient, name?: string | null) {
  const cleanName = clean(name);
  return cleanName ? upsertManufacturer(transaction, normalizeText(cleanName)) : null;
}

async function maybeUpsertToolType(transaction: Prisma.TransactionClient, name?: string | null) {
  const cleanName = clean(name);
  return cleanName ? upsertToolType(transaction, normalizeText(cleanName)) : null;
}

async function maybeUpsertMachine(transaction: Prisma.TransactionClient, name?: string | null) {
  const cleanName = clean(name);
  return cleanName ? upsertMachine(transaction, normalizeText(cleanName)) : null;
}

async function persistImportIssues(
  transaction: Prisma.TransactionClient,
  importBatchId: string,
  preview: ExcelPreview,
) {
  const rows = [...preview.issues, ...preview.duplicates].map((issue) => ({
    importBatchId,
    sheetName: issue.sheetName,
    rowNumber: issue.rowNumber,
    severity: IssueSeverity[issue.severity],
    message: issue.message,
    rawData: issue.rawData as Prisma.InputJsonValue,
  }));
  const result = await createImportIssues(transaction, rows);

  return result.count;
}

function createCounters(duplicateRows: number): ImportCounters {
  return {
    toolsCreated: 0,
    toolsUpdated: 0,
    locationsCreated: 0,
    locationsUpdated: 0,
    issuesLogged: 0,
    duplicateRows,
  };
}

function countPersistedRecords(counters: ImportCounters) {
  return (
    counters.toolsCreated +
    counters.toolsUpdated +
    counters.locationsCreated +
    counters.locationsUpdated
  );
}

function mapToolUpdateData(data: Prisma.ToolUncheckedCreateInput) {
  const { isArchived: _isArchived, status: _status, ...updateData } = data;
  return updateData satisfies Prisma.ToolUncheckedUpdateInput;
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function locationKey(location: PreviewLocation) {
  const rawLabel = normalizeStorageLabel(location.rawLabel ?? location.shelf);

  return [
    location.sourceSheet,
    rawLabel,
    rawLabel,
    clean(location.compartment),
    location.mapRow ?? "",
    location.mapColumn ?? "",
  ].join("|");
}

function shouldPersistStorageLocation(location: PreviewLocation) {
  const rawLabel = normalizeStorageLabel(location.rawLabel ?? location.shelf);
  return Boolean(rawLabel && isValidStorageLabel(rawLabel));
}
