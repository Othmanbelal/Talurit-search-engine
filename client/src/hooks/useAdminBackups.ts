import { useCallback, useEffect, useState } from "react";
import {
  getBackupOverviewRequest,
  restoreBackupRequest,
  runBackupRequest,
  testBackupDirectoryRequest,
  updateBackupSettingsRequest,
} from "../services/admin.service";
import type { BackupOverview, BackupSettings } from "../types/admin";

export function useAdminBackups() {
  const [data, setData] = useState<BackupOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<"backup" | "restore" | "save" | "test" | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getBackupOverviewRequest();
      setData(result.backups);
      setError(null);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(async <T,>(
    kind: NonNullable<typeof activeAction>,
    action: () => Promise<T>,
    reloadAfter = true,
  ) => {
    setActiveAction(kind);
    setError(null);
    try {
      const result = await action();
      if (reloadAfter) await load();
      return result;
    } catch (caught) {
      setError(messageFrom(caught));
      throw caught;
    } finally {
      setActiveAction(null);
    }
  }, [load]);

  const updateSettings = useCallback(
    (settings: Omit<BackupSettings, "storageRoot">) =>
      runAction("save", () => updateBackupSettingsRequest(settings)),
    [runAction],
  );
  const testDirectory = useCallback(
    (directory: string) => runAction("test", () => testBackupDirectoryRequest(directory)),
    [runAction],
  );
  const runBackup = useCallback(() => runAction("backup", runBackupRequest), [runAction]);
  const restore = useCallback(
    (fileName: string, confirmation: string) =>
      runAction("restore", () => restoreBackupRequest(fileName, confirmation), false),
    [runAction],
  );

  return {
    activeAction,
    data,
    error,
    isLoading,
    load,
    restore,
    runBackup,
    testDirectory,
    updateSettings,
  };
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Backup action failed.";
}
