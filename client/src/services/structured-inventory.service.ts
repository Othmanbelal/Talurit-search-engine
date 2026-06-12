import type {
  AddStockRowInput,
  ColumnSettingsInput,
  CreateInventoryGroupInput,
  CreateInventoryTableInput,
  ItemInteractionLog,
  StructuredInventoryGroup,
  StructuredInventoryOverview,
  StructuredInventoryTable,
  StructuredDuplicateGroup,
  StructuredStockRowsResponse,
  StructuredStockRow,
  StructuredTableFilters,
  StockMovementInput,
  TakenStockItem,
  UpdateStockRowInput,
  UseInCardInput,
} from "../types/structured-inventory";
import { apiRequest } from "./http";

export function listStructuredInventoriesRequest() {
  return apiRequest<{ inventories: StructuredInventoryOverview }>("/api/structured-inventory");
}

export function getStructuredInventoryGroupRequest(id: string) {
  return apiRequest<{ group: StructuredInventoryGroup }>(`/api/structured-inventory/groups/${id}`);
}

export function createStructuredInventoryGroupRequest(input: CreateInventoryGroupInput) {
  return apiRequest<{ group: StructuredInventoryGroup }>("/api/structured-inventory/groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createStructuredInventoryTableRequest(input: CreateInventoryTableInput) {
  return apiRequest<{ table: StructuredInventoryTable }>("/api/structured-inventory/tables", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getStructuredInventoryTableRequest(id: string) {
  return apiRequest<{ table: StructuredInventoryTable }>(`/api/structured-inventory/tables/${id}`);
}

export function listStructuredInventoryRowsRequest(
  id: string,
  page = 1,
  pageSize = 50,
  search = "",
  archived: "active" | "archived" | "all" = "active",
  filters: StructuredTableFilters = {},
) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set("search", search.trim());
  if (filters.itemName?.trim()) params.set("itemName", filters.itemName.trim());
  if (filters.manufacturerName?.trim()) params.set("manufacturerName", filters.manufacturerName.trim());
  if (filters.categoryName?.trim()) params.set("categoryName", filters.categoryName.trim());
  const attributeFilters = activeAttributeFilters(filters);
  if (attributeFilters.length > 0) params.set("attributeFilters", JSON.stringify(attributeFilters));
  params.set("archived", archived);
  return apiRequest<StructuredStockRowsResponse>(
    `/api/structured-inventory/tables/${id}/rows?${params.toString()}`,
  );
}

export function listStructuredDuplicateGroupsRequest(id: string) {
  return apiRequest<{ groups: StructuredDuplicateGroup[] }>(`/api/structured-inventory/tables/${id}/duplicates`);
}

export function mergeStructuredDuplicateRowsRequest(id: string, input: { primaryRowId: string; rowIds: string[] }) {
  return apiRequest<unknown>(`/api/structured-inventory/tables/${id}/duplicates/merge`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function addStructuredStockRowRequest(id: string, input: AddStockRowInput) {
  return apiRequest<StructuredStockRowsResponse>(`/api/structured-inventory/tables/${id}/rows`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStructuredInventoryColumnsRequest(id: string, input: ColumnSettingsInput) {
  return apiRequest<{ table: StructuredInventoryTable }>(`/api/structured-inventory/tables/${id}/columns`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getStructuredStockRowRequest(tableId: string, rowId: string) {
  return apiRequest<{ row: StructuredStockRow }>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}`);
}

export function updateStructuredStockRowRequest(tableId: string, rowId: string, input: UpdateStockRowInput) {
  return apiRequest<{ row: StructuredStockRow }>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function archiveStructuredStockRowRequest(tableId: string, rowId: string) {
  return emptyRequest(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/archive`, "POST");
}

export function restoreStructuredStockRowRequest(tableId: string, rowId: string) {
  return emptyRequest(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/restore`, "POST");
}

export function deleteStructuredStockRowRequest(tableId: string, rowId: string) {
  return emptyRequest(`/api/structured-inventory/tables/${tableId}/rows/${rowId}`, "DELETE");
}

export function deleteStructuredInventoryTableRequest(id: string) {
  return emptyRequest(`/api/structured-inventory/tables/${id}`, "DELETE");
}

export function deleteStructuredInventoryGroupRequest(id: string) {
  return emptyRequest(`/api/structured-inventory/groups/${id}`, "DELETE");
}

export function takeStructuredStockRowRequest(tableId: string, rowId: string, input: StockMovementInput) {
  return apiRequest<unknown>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/take`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useStructuredStockRowInCardRequest(tableId: string, rowId: string, input: UseInCardInput) {
  return apiRequest<unknown>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/use-in`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listTakenItemsRequest() {
  return apiRequest<{ items: TakenStockItem[] }>("/api/structured-inventory/taken-items");
}

export function returnTakenItemRequest(id: string) {
  return apiRequest<unknown>(`/api/structured-inventory/taken-items/${id}/return`, { method: "POST" });
}

export function getStockRowHistoryRequest(rowId: string) {
  return apiRequest<{ history: ItemInteractionLog[] }>(`/api/structured-inventory/stock-rows/${rowId}/history`);
}

function emptyRequest(path: string, method: "DELETE" | "POST") {
  return apiRequest<unknown>(path, { method });
}

function activeAttributeFilters(filters: StructuredTableFilters) {
  return (filters.attributeFilters ?? [])
    .map((filter) => ({ name: filter.name.trim(), value: filter.value.trim() }))
    .filter((filter) => filter.name && filter.value);
}
