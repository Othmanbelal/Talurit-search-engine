import type {
  Tool,
  ToolFilters,
  ToolListResponse,
  ToolPayload,
  ToolPlacementPayload,
} from "../types/tools";
import { apiRequest } from "./http";

export function listToolsRequest(filters: ToolFilters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value !== null && value !== undefined) {
      params.set(key, String(value));
    }
  }

  return apiRequest<ToolListResponse>(`/api/tools?${params.toString()}`);
}

export function createToolRequest(payload: ToolPayload) {
  return apiRequest<{ tool: Tool }>("/api/tools", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateToolRequest(id: string, payload: Partial<ToolPayload>) {
  return apiRequest<{ tool: Tool }>(`/api/tools/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateToolPlacementRequest(id: string, payload: ToolPlacementPayload) {
  return apiRequest<{ tool: Tool }>(`/api/tools/${id}/placement`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveToolRequest(id: string) {
  return apiRequest<{ tool: Tool }>(`/api/tools/${id}/archive`, { method: "POST" });
}

export function restoreToolRequest(id: string) {
  return apiRequest<{ tool: Tool }>(`/api/tools/${id}/restore`, { method: "POST" });
}

export function deleteToolRequest(id: string) {
  return apiRequest<{ tool: Tool }>(`/api/tools/${id}`, { method: "DELETE" });
}
