import { startOfCurrentWeek } from "../../utils/date-range";
import {
  getAppSettingValue,
  getDashboardCounts,
  getLatestBackup,
  getLatestImport,
  getLatestWeeklyEmail,
} from "./admin.repository";
import type {
  AdminDashboard,
  DashboardStatus,
  LatestBackupRow,
  LatestImportRow,
  LatestWeeklyEmailRow,
} from "./admin.types";

const defaultLowStockThreshold = 5;

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const lowStockThreshold = await getLowStockThreshold();
  const weekStart = startOfCurrentWeek();

  const [counts, latestImport, latestBackup, weeklyEmail] = await Promise.all([
    getDashboardCounts({ weekStart, lowStockThreshold }),
    getLatestImport(),
    getLatestBackup(),
    getLatestWeeklyEmail(),
  ]);

  return {
    lowStockThreshold,
    metrics: [
      { key: "totalTools", label: "Total tools", value: counts.totalTools },
      { key: "toolTypes", label: "Tool types", value: counts.totalToolTypes },
      { key: "manufacturers", label: "Manufacturers", value: counts.totalManufacturers },
      { key: "locations", label: "Locations", value: counts.totalLocations },
      { key: "lowStock", label: "Low stock", value: counts.lowStockTools },
      { key: "updatedThisWeek", label: "Updated this week", value: counts.toolsUpdatedThisWeek },
      { key: "issueStates", label: "Needs attention", value: counts.issueStateTools },
    ],
    statuses: {
      latestImport: mapLatestImport(latestImport),
      latestBackup: mapLatestBackup(latestBackup),
      weeklyEmail: mapWeeklyEmail(weeklyEmail),
    },
  };
}

async function getLowStockThreshold() {
  const setting = await getAppSettingValue("inventory.lowStockThreshold");
  const parsed = Number.parseInt(setting?.value ?? "", 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultLowStockThreshold;
}

function mapLatestImport(row: LatestImportRow): DashboardStatus {
  if (!row) return emptyStatus("Latest import");

  return {
    label: "Latest import",
    status: row.status,
    detail: row.sheetName ? `${row.fileName} / ${row.sheetName}` : row.fileName,
    timestamp: row.createdAt.toISOString(),
  };
}

function mapLatestBackup(row: LatestBackupRow): DashboardStatus {
  if (!row) return emptyStatus("Latest backup");

  return {
    label: "Latest backup",
    status: row.status,
    detail: row.fileName ? `${row.type}: ${row.fileName}` : row.type,
    timestamp: row.createdAt.toISOString(),
  };
}

function mapWeeklyEmail(row: LatestWeeklyEmailRow): DashboardStatus {
  if (!row) return emptyStatus("Weekly email");

  return {
    label: "Weekly email",
    status: row.status,
    detail: `${row.subject} / ${row.recipientEmail}`,
    timestamp: row.sentAt?.toISOString() ?? null,
  };
}

function emptyStatus(label: string): DashboardStatus {
  return {
    label,
    status: "NOT_CONFIGURED",
    detail: null,
    timestamp: null,
  };
}
