import { apiRequest } from "../../services/http";
import type {
  SheetChoice,
  StagingRow,
  StagingStatus,
  StructuredImportBatch,
  StructuredMapping,
} from "./structuredImportTypes";

export function scanStructuredImportRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ batch: StructuredImportBatch }>("/api/imports/upload", {
    method: "POST",
    body: formData,
  });
}

export function updateStructuredSheetsRequest(batchId: string, groupName: string, sheets: SheetChoice[]) {
  return apiRequest<{ batch: StructuredImportBatch }>(`/api/imports/${batchId}/sheets`, {
    method: "PATCH",
    body: JSON.stringify({ groupName: groupName || undefined, sheets }),
  });
}

export function updateStructuredMappingsRequest(batchId: string, sheetId: string, mappings: StructuredMapping[]) {
  return apiRequest<{ sheet: unknown }>(`/api/imports/${batchId}/sheets/${sheetId}/mappings`, {
    method: "PATCH",
    body: JSON.stringify({ mappings }),
  });
}

export function stageStructuredImportRequest(batchId: string) {
  return apiRequest<{ batch: StructuredImportBatch }>(`/api/imports/${batchId}/stage`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listStructuredStagingRowsRequest(batchId: string, status?: StagingStatus) {
  const query = status ? `?status=${status}` : "";
  return apiRequest<{ rows: StagingRow[] }>(`/api/imports/${batchId}/staging-rows${query}`);
}

export function updateStructuredStagingRowRequest(rowId: string, input: Partial<StagingRow>) {
  return apiRequest<{ row: StagingRow }>(`/api/imports/staging-rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function confirmStructuredImportRequest(batchId: string) {
  return apiRequest<{ batch: StructuredImportBatch }>(`/api/imports/${batchId}/confirm`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
