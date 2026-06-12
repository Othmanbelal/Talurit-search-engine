import { useCallback, useState } from "react";
import { exportInventoryRequest } from "../services/import.service";
import type { ToolFilters } from "../types/tools";
import { downloadBlob } from "../utils/download-file";

export function useExcelExport() {
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportInventory = useCallback(async (filters: ToolFilters) => {
    setError(null);
    setIsExporting(true);

    try {
      const result = await exportInventoryRequest(filters);
      downloadBlob(result.blob, result.fileName);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Excel export failed";
      setError(message);
      throw requestError;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { error, exportInventory, isExporting };
}
