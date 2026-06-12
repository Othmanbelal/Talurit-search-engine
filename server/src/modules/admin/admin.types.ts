import type { BackupType, ImportStatus, JobStatus } from "@prisma/client";

export type DashboardMetric = {
  key: string;
  label: string;
  value: number;
};

export type DashboardStatus = {
  label: string;
  status: string;
  detail: string | null;
  timestamp: string | null;
};

export type AdminDashboard = {
  metrics: DashboardMetric[];
  statuses: {
    latestImport: DashboardStatus;
    latestBackup: DashboardStatus;
    weeklyEmail: DashboardStatus;
  };
  lowStockThreshold: number;
};

export type LatestImportRow = {
  fileName: string;
  sheetName: string | null;
  status: ImportStatus;
  createdAt: Date;
} | null;

export type LatestBackupRow = {
  type: BackupType;
  fileName: string | null;
  status: JobStatus;
  createdAt: Date;
} | null;

export type LatestWeeklyEmailRow = {
  recipientEmail: string;
  subject: string;
  status: JobStatus;
  sentAt: Date | null;
} | null;
