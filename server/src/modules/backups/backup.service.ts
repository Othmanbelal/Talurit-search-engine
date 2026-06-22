import { access, unlink } from "node:fs/promises";
import { join } from "node:path";
import { JobStatus } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import {
  deployDatabaseMigrations,
  restorePostgresDump,
  validatePostgresDump,
} from "./backup.commands";
import {
  closeFullBackupPackage,
  createFullBackupPackage,
  openFullBackupPackage,
  restorePackageFiles,
} from "./backup.package";
import {
  backupSettingKeys,
  createBackupLog,
  findLatestAutomaticBackup,
  findLatestBackupLog,
  getBackupSettingRows,
  listBackupLogs,
  saveBackupSettingRows,
} from "./backup.repository";
import { getActiveBackupOperation, runExclusiveBackupOperation } from "./backup.runtime";
import type { RestoreBackupInput, UpdateBackupSettingsInput } from "./backup.schemas";
import {
  ensureBackupDirectory,
  getBackupStorageRoot,
  listBackupFiles,
  resolveBackupDirectory,
  resolveBackupFile,
  testBackupDirectory,
} from "./backup.storage";

type BackupTrigger = "manual" | "automatic" | "pre_restore";

export async function getBackupOverview() {
  const settings = await getBackupSettings();
  const [files, logs, lastBackup, lastRestore, lastAutomatic] = await Promise.all([
    listBackupFiles(settings.directory),
    listBackupLogs(),
    findLatestBackupLog("backup"),
    findLatestBackupLog("restore"),
    findLatestAutomaticBackup(),
  ]);

  return {
    settings,
    files,
    logs: logs.map(serializeLog),
    lastBackup: lastBackup ? serializeLog(lastBackup) : null,
    lastRestore: lastRestore ? serializeLog(lastRestore) : null,
    nextAutomaticBackupAt: getNextAutomaticBackupAt(settings, lastAutomatic?.completedAt ?? null),
    activeOperation: serializeActiveOperation(),
  };
}

export async function getBackupSettings() {
  const rows = await getBackupSettingRows();
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const fallbackDirectory = join(getBackupStorageRoot(), "database");
  const configuredDirectory = values.get(backupSettingKeys.directory) || fallbackDirectory;
  let directory = fallbackDirectory;
  try {
    directory = resolveBackupDirectory(configuredDirectory);
  } catch {
    // Invalid legacy settings fall back to the persistent configured root.
  }

  return {
    enabled: values.get(backupSettingKeys.enabled) === "true",
    intervalHours: parseInterval(values.get(backupSettingKeys.intervalHours)),
    directory,
    storageRoot: getBackupStorageRoot(),
  };
}

export async function updateBackupSettings(input: UpdateBackupSettingsInput) {
  const directory = await testBackupDirectory(input.directory);
  await saveBackupSettingRows({
    directory,
    enabled: input.enabled,
    intervalHours: input.intervalHours,
  });
  return getBackupSettings();
}

export async function testConfiguredBackupDirectory(directory: string) {
  return { directory: await testBackupDirectory(directory) };
}

export function runManualBackup(userId: string) {
  return runExclusiveBackupOperation("backup", () => performBackup("manual", userId));
}

export function runAutomaticBackup() {
  return runExclusiveBackupOperation("backup", () => performBackup("automatic", null));
}

export function restoreBackup(input: RestoreBackupInput, userId: string) {
  if (input.confirmation !== input.fileName) {
    throw new AppError("Restore confirmation must exactly match the backup filename.", 400);
  }

  return runExclusiveBackupOperation("restore", async () => {
    const settings = await getBackupSettings();
    const restoreFilePath = resolveBackupFile(settings.directory, input.fileName);
    await access(restoreFilePath);
    const fullPackage = input.fileName.endsWith(".tibackup")
      ? await openFullBackupPackage(restoreFilePath)
      : null;
    if (!fullPackage) await validatePostgresDump(restoreFilePath);
    let safetyBackup: Awaited<ReturnType<typeof performBackup>> | null = null;

    try {
      safetyBackup = await performBackup("pre_restore", userId);
      if (fullPackage) await restorePackageFiles(fullPackage.workDirectory, fullPackage.manifest);
      await prisma.$disconnect();
      await restorePostgresDump(env.DATABASE_URL, fullPackage?.databasePath ?? restoreFilePath);
      await deployDatabaseMigrations();
      await prisma.$connect();
      const restoredUserId = await getExistingUserId(userId);

      // The selected dump predates the safety backup log, so record it again in the restored database.
      await createBackupLog({
        operation: "backup",
        trigger: "pre_restore",
        fileName: safetyBackup.fileName,
        filePath: safetyBackup.filePath,
        status: JobStatus.SUCCESS,
        message: `Safety backup created before restoring ${input.fileName}.`,
        createdByUserId: restoredUserId,
      });
      const log = await createBackupLog({
        operation: "restore",
        trigger: "manual",
        fileName: input.fileName,
        filePath: restoreFilePath,
        status: JobStatus.SUCCESS,
        message: fullPackage
          ? "Full application restore completed: database, managed media, local uploads, and migrations."
          : "Legacy database-only restore completed and migrations were applied.",
        createdByUserId: restoredUserId,
      });
      return serializeLog(log);
    } catch (error) {
      await reconnectDatabase();
      if (!safetyBackup) throw normalizeBackupError(error, "Safety backup creation failed. No restore was attempted.");
      const rollbackError = await rollbackFromSafetyBackup(safetyBackup.filePath);
      const restoredUserId = await getExistingUserId(userId);
      await createFailureLog("restore", "manual", input.fileName, restoreFilePath, error, restoredUserId);
      if (rollbackError) {
        throw new AppError(
          `Restore failed and automatic rollback also failed: ${rollbackError.message}. The safety backup is ${safetyBackup.fileName}.`,
          500,
        );
      }
      throw normalizeBackupError(error, "Restore failed. The previous application state was restored automatically.");
    } finally {
      if (fullPackage) await closeFullBackupPackage(fullPackage.workDirectory);
    }
  });
}

async function performBackup(trigger: BackupTrigger, userId: string | null) {
  const settings = await getBackupSettings();
  const directory = await ensureBackupDirectory(settings.directory);
  const fileName = createBackupFileName(trigger);
  const filePath = join(directory, fileName);

  try {
    const contents = await createFullBackupPackage(env.DATABASE_URL, filePath);
    const log = await createBackupLog({
      operation: "backup",
      trigger,
      fileName,
      filePath,
      status: JobStatus.SUCCESS,
      message: `${trigger === "automatic" ? "Automatic" : "Manual"} full backup completed: database, ${contents.storageObjectCount} managed media files, and ${contents.localUploadCount} local upload files.`,
      createdByUserId: userId,
    });
    return { fileName, filePath, log: serializeLog(log) };
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    await createFailureLog("backup", trigger, fileName, filePath, error, userId);
    throw normalizeBackupError(error, "Database backup failed.");
  }
}

async function createFailureLog(
  operation: "backup" | "restore",
  trigger: BackupTrigger,
  fileName: string,
  filePath: string,
  error: unknown,
  userId: string | null,
) {
  return createBackupLog({
    operation,
    trigger,
    fileName,
    filePath,
    status: JobStatus.FAILED,
    message: error instanceof Error ? error.message.slice(0, 1000) : "Unknown database operation failure.",
    createdByUserId: userId,
  }).catch(() => null);
}

async function reconnectDatabase() {
  await prisma.$connect().catch(() => undefined);
}

async function rollbackFromSafetyBackup(filePath: string) {
  let safetyPackage: Awaited<ReturnType<typeof openFullBackupPackage>> | null = null;
  try {
    safetyPackage = await openFullBackupPackage(filePath);
    await restorePackageFiles(safetyPackage.workDirectory, safetyPackage.manifest);
    await prisma.$disconnect();
    await restorePostgresDump(env.DATABASE_URL, safetyPackage.databasePath);
    await deployDatabaseMigrations();
    await prisma.$connect();
    return null;
  } catch (error) {
    await reconnectDatabase();
    return error instanceof Error ? error : new Error("Unknown rollback failure");
  } finally {
    if (safetyPackage) await closeFullBackupPackage(safetyPackage.workDirectory);
  }
}

async function getExistingUserId(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  return user?.id ?? null;
}

function createBackupFileName(trigger: BackupTrigger) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
  return `tool_inventory_${timestamp}_${trigger}.tibackup`;
}

function parseInterval(value?: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 24 * 31 ? parsed : 24;
}

function getNextAutomaticBackupAt(
  settings: Awaited<ReturnType<typeof getBackupSettings>>,
  lastCompletedAt: Date | null,
) {
  if (!settings.enabled) return null;
  if (!lastCompletedAt) return new Date();
  return new Date(lastCompletedAt.getTime() + settings.intervalHours * 60 * 60 * 1000);
}

function serializeLog(log: Awaited<ReturnType<typeof createBackupLog>> | Awaited<ReturnType<typeof listBackupLogs>>[number]) {
  return {
    id: log.id,
    operation: log.operation,
    trigger: log.trigger,
    fileName: log.fileName,
    filePath: log.filePath,
    status: log.status,
    message: log.message,
    createdByUserName: log.createdByUser?.name ?? null,
    completedAt: log.completedAt,
    createdAt: log.createdAt,
  };
}

function serializeActiveOperation() {
  const active = getActiveBackupOperation();
  return active ? { kind: active.kind, startedAt: active.startedAt } : null;
}

function normalizeBackupError(error: unknown, fallback: string) {
  return error instanceof AppError ? error : new AppError(fallback, 500);
}
