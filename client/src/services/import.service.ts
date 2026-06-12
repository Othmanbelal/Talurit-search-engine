import type { ToolFilters } from "../types/tools";
import type { ConfirmImportResult, ExcelPreview } from "../types/import";
import { apiRequest, buildApiUrl } from "./http";

export function previewExcelImportRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ preview: ExcelPreview }>("/api/excel/import/preview", {
    method: "POST",
    body: formData,
  });
}

export function confirmExcelImportRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ import: ConfirmImportResult }>("/api/excel/import/confirm", {
    method: "POST",
    body: formData,
  });
}

export async function exportInventoryRequest(filters: ToolFilters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (key !== "page" && key !== "pageSize" && value !== "") {
      params.set(key, String(value));
    }
  }

  const response = await fetch(buildApiUrl(`/api/excel/export?${params.toString()}`), {
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Excel export failed");
  }

  return {
    blob: await response.blob(),
    fileName: fileNameFromResponse(response) ?? "tool-inventory-export.xlsx",
  };
}

function fileNameFromResponse(response: Response) {
  const disposition = response.headers.get("Content-Disposition");
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? null;
}
