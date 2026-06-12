import { useCallback, useState } from "react";
import { confirmExcelImportRequest, previewExcelImportRequest } from "../services/import.service";
import type { ConfirmImportResult, ExcelPreview } from "../types/import";

export function useImportPreview() {
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const previewFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await previewExcelImportRequest(file);
      setPreview(result.preview);
      setConfirmResult(null);
      return result.preview;
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Import preview failed";
      setError(message);
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmFile = useCallback(async (file: File) => {
    setIsConfirming(true);
    setConfirmError(null);

    try {
      const result = await confirmExcelImportRequest(file);
      setConfirmResult(result.import);
      return result.import;
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Import confirmation failed";
      setConfirmError(message);
      throw requestError;
    } finally {
      setIsConfirming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setConfirmError(null);
    setConfirmResult(null);
    setPreview(null);
  }, []);

  return {
    confirmError,
    confirmFile,
    confirmResult,
    error,
    isConfirming,
    isLoading,
    preview,
    previewFile,
    reset,
  };
}
