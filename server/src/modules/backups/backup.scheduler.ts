import { getBackupSettings, runAutomaticBackup } from "./backup.service";
import { findLatestAutomaticBackup } from "./backup.repository";
import { getActiveBackupOperation } from "./backup.runtime";

const CHECK_INTERVAL_MS = 60_000;
let scheduler: NodeJS.Timeout | null = null;

export function startBackupScheduler() {
  if (scheduler) return;
  setTimeout(() => void checkAutomaticBackup(), 10_000).unref();
  scheduler = setInterval(() => void checkAutomaticBackup(), CHECK_INTERVAL_MS);
  scheduler.unref();
}

async function checkAutomaticBackup() {
  if (getActiveBackupOperation()) return;

  try {
    const settings = await getBackupSettings();
    if (!settings.enabled) return;
    const latest = await findLatestAutomaticBackup();
    const lastTime = latest?.completedAt?.getTime() ?? 0;
    const dueAt = lastTime + settings.intervalHours * 60 * 60 * 1000;
    if (Date.now() >= dueAt) await runAutomaticBackup();
  } catch (error) {
    console.error("[backup] Automatic backup check failed:", error instanceof Error ? error.message : error);
  }
}
