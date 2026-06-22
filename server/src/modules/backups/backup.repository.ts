import { BackupType, JobStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";

export const backupSettingKeys = {
  directory: "backup.directory",
  enabled: "backup.automaticEnabled",
  intervalHours: "backup.intervalHours",
} as const;

export function getBackupSettingRows() {
  return prisma.appSetting.findMany({
    where: { key: { in: Object.values(backupSettingKeys) } },
    select: { key: true, value: true },
  });
}

export async function saveBackupSettingRows(settings: {
  directory: string;
  enabled: boolean;
  intervalHours: number;
}) {
  await prisma.$transaction([
    upsertSetting(backupSettingKeys.directory, settings.directory),
    upsertSetting(backupSettingKeys.enabled, String(settings.enabled)),
    upsertSetting(backupSettingKeys.intervalHours, String(settings.intervalHours)),
  ]);
}

export function createBackupLog(input: {
  operation: "backup" | "restore";
  trigger: "manual" | "automatic" | "pre_restore";
  fileName?: string | null;
  filePath?: string | null;
  status: JobStatus;
  message?: string | null;
  createdByUserId?: string | null;
}) {
  return prisma.backupLog.create({
    data: {
      type: BackupType.DATABASE,
      operation: input.operation,
      trigger: input.trigger,
      fileName: input.fileName,
      filePath: input.filePath,
      status: input.status,
      message: input.message,
      createdByUserId: input.createdByUserId,
      completedAt: new Date(),
    },
    include: { createdByUser: { select: { id: true, name: true } } },
  });
}

export function listBackupLogs(limit = 30) {
  return prisma.backupLog.findMany({
    where: { type: BackupType.DATABASE },
    include: { createdByUser: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function findLatestBackupLog(operation: "backup" | "restore") {
  return prisma.backupLog.findFirst({
    where: { type: BackupType.DATABASE, operation },
    include: { createdByUser: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function findLatestAutomaticBackup() {
  return prisma.backupLog.findFirst({
    where: {
      type: BackupType.DATABASE,
      operation: "backup",
      trigger: "automatic",
      status: JobStatus.SUCCESS,
    },
    orderBy: { completedAt: "desc" },
  });
}

export async function listApplicationStorageReferences() {
  const [profiles, items] = await Promise.all([
    prisma.userProfile.findMany({
      where: { profilePictureUrl: { startsWith: "supabase://" } },
      select: { profilePictureUrl: true },
    }),
    prisma.inventoryItem.findMany({
      where: {
        OR: [
          { imageUrl: { startsWith: "supabase://" } },
          { qrCodeImageUrl: { startsWith: "supabase://" } },
        ],
      },
      select: { imageUrl: true, qrCodeImageUrl: true },
    }),
  ]);

  const references = new Set<string>();
  for (const profile of profiles) {
    if (profile.profilePictureUrl) references.add(profile.profilePictureUrl);
  }
  for (const item of items) {
    if (item.imageUrl?.startsWith("supabase://")) references.add(item.imageUrl);
    if (item.qrCodeImageUrl?.startsWith("supabase://")) references.add(item.qrCodeImageUrl);
  }
  return [...references].sort();
}

function upsertSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
