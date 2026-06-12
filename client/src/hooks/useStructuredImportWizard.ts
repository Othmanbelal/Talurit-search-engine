import { ChangeEvent, useMemo, useState } from "react";
import {
  confirmStructuredImportRequest,
  listStructuredStagingRowsRequest,
  scanStructuredImportRequest,
  stageStructuredImportRequest,
  updateStructuredMappingsRequest,
  updateStructuredSheetsRequest,
  updateStructuredStagingRowRequest,
} from "../lib/import/structuredImportApi";
import { defaultGroupName } from "../lib/import/structuredImportFormatters";
import type {
  SheetChoice,
  StagingRow,
  StructuredImportBatch,
  StructuredMapping,
} from "../lib/import/structuredImportTypes";

type Step = "upload" | "sheets" | "mappings" | "preview" | "result";

export function useStructuredImportWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<StructuredImportBatch | null>(null);
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = useMemo(() => {
    if (!batch || rows.length === 0) return false;
    return rows.every((row) => row.status !== "needs_review" && row.status !== "error");
  }, [batch, rows]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setBatch(null);
    setRows([]);
    setStep("upload");
    setError(null);
  }

  async function scanFile() {
    if (!file) return;
    await run(async () => {
      const response = await scanStructuredImportRequest(file);
      setBatch(response.batch);
      setGroupName(defaultGroupName(response.batch));
      setStep("sheets");
    }, "Workbook scan failed");
  }

  async function saveSheets(choices: SheetChoice[]) {
    if (!batch) return;
    await run(async () => {
      const response = await updateStructuredSheetsRequest(batch.id, groupName, choices);
      setBatch(response.batch);
      setStep("mappings");
    }, "Sheet settings failed");
  }

  async function saveMappings(sheetId: string, mappings: StructuredMapping[]) {
    if (!batch) return;
    await run(async () => {
      await updateStructuredMappingsRequest(batch.id, sheetId, mappings);
      setBatch((current) => current ? replaceSheetMappings(current, sheetId, mappings) : current);
    }, "Column mapping failed");
  }

  async function saveAllMappingsAndStage(drafts: Record<string, StructuredMapping[]>) {
    if (!batch) return;
    await run(async () => {
      for (const sheet of batch.sheets.filter((candidate) => candidate.selectedForImport)) {
        await updateStructuredMappingsRequest(batch.id, sheet.id, drafts[sheet.id] ?? sheet.mappings);
      }
      const response = await stageStructuredImportRequest(batch.id);
      setBatch(response.batch);
      await loadRows(response.batch.id);
      setStep("preview");
    }, "Column mapping or staging failed");
  }

  async function stageRows() {
    if (!batch) return;
    await run(async () => {
      const response = await stageStructuredImportRequest(batch.id);
      setBatch(response.batch);
      await loadRows(response.batch.id);
      setStep("preview");
    }, "Staging failed");
  }

  async function loadRows(batchId = batch?.id) {
    if (!batchId) return;
    const response = await listStructuredStagingRowsRequest(batchId);
    setRows(response.rows);
  }

  async function patchRow(rowId: string, input: Partial<StagingRow>) {
    await run(async () => {
      await updateStructuredStagingRowRequest(rowId, input);
      await loadRows();
    }, "Row update failed");
  }

  async function confirmImport() {
    if (!batch) return;
    await run(async () => {
      const response = await confirmStructuredImportRequest(batch.id);
      setBatch(response.batch);
      setStep("result");
    }, "Final import failed");
  }

  async function run(action: () => Promise<void>, fallback: string) {
    setIsLoading(true);
    setError(null);
    try {
      await action();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : fallback);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    batch,
    canConfirm,
    error,
    file,
    groupName,
    handleFileChange,
    isLoading,
    patchRow,
    rows,
    saveMappings,
    saveAllMappingsAndStage,
    saveSheets,
    scanFile,
    setGroupName,
    stageRows,
    step,
    confirmImport,
  };
}

function replaceSheetMappings(batch: StructuredImportBatch, sheetId: string, mappings: StructuredMapping[]) {
  return {
    ...batch,
    sheets: batch.sheets.map((sheet) => sheet.id === sheetId ? { ...sheet, mappings } : sheet),
  };
}
