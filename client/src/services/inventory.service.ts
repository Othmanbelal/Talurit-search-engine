import type {
  ConfirmDynamicImportResult,
  DynamicImportPreview,
  DynamicInventory,
  DynamicRowsResponse,
} from "../types/inventory";
import { apiRequest } from "./http";

export function previewDynamicImportRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ preview: DynamicImportPreview }>("/api/inventories/import/preview", {
    method: "POST",
    body: formData,
  });
}

export function confirmDynamicImportRequest(file: File, tableNames: Record<string, string>) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tableNames", JSON.stringify(tableNames));

  return apiRequest<{ import: ConfirmDynamicImportResult }>("/api/inventories/import/confirm", {
    method: "POST",
    body: formData,
  });
}

export function listDynamicInventoriesRequest() {
  return apiRequest<{ inventories: DynamicInventory[] }>("/api/inventories");
}

export function getDynamicInventoryRequest(id: string) {
  return apiRequest<{ inventory: DynamicInventory }>(`/api/inventories/${id}`);
}

export function listDynamicInventoryRowsRequest(id: string, page = 1, pageSize = 50) {
  return apiRequest<DynamicRowsResponse>(
    `/api/inventories/${id}/rows?page=${page}&pageSize=${pageSize}`,
  );
}
