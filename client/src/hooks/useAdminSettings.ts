import { useCallback, useEffect, useState } from "react";
import {
  getAdminSettingsRequest,
  sendTestEmailRequest,
  updateAdminSettingsRequest,
} from "../services/admin.service";
import type { AdminSettings, AdminSettingsPayload } from "../types/admin";

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);

    getAdminSettingsRequest()
      .then((result) => {
        setSettings(result.settings);
        setError(null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Settings unavailable");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateSettings = useCallback(async (payload: AdminSettingsPayload) => {
    const result = await updateAdminSettingsRequest(payload);
    setSettings(result.settings);
    return result.settings;
  }, []);

  const sendTestEmail = useCallback((email?: string) => sendTestEmailRequest(email), []);

  return {
    error,
    isLoading,
    sendTestEmail,
    settings,
    updateSettings,
  };
}
