import { apiRequest } from "./http";

export function setTableLowStockRequest(tableId: string, enabled: boolean) {
  return apiRequest<{ tableId: string; lowStockEnabled: boolean }>(`/api/low-stock/tables/${tableId}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export type RowLowStockInput = { enabled: boolean; threshold: number | null; reorderUrl: string | null };

export function setRowLowStockRequest(tableId: string, rowId: string, input: RowLowStockInput) {
  return apiRequest<{ rowId: string }>(`/api/low-stock/tables/${tableId}/rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
