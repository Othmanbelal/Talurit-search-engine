import { ToolStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function getAppSettingValue(key: string) {
  return prisma.appSetting.findUnique({
    where: { key },
    select: { value: true },
  });
}

export function getDashboardCounts(args: { weekStart: Date; lowStockThreshold: number }) {
  const queries = {
    totalTools: prisma.tool.count({ where: { isArchived: false } }),
    totalToolTypes: prisma.toolType.count(),
    totalManufacturers: prisma.manufacturer.count(),
    totalLocations: prisma.location.count(),
    lowStockTools: prisma.tool.count({
      where: {
        isArchived: false,
        quantity: { not: null, lte: args.lowStockThreshold },
      },
    }),
    toolsUpdatedThisWeek: prisma.tool.count({
      where: {
        updatedAt: { gte: args.weekStart },
      },
    }),
    issueStateTools: prisma.tool.count({
      where: {
        isArchived: false,
        status: {
          in: [ToolStatus.MISSING, ToolStatus.DAMAGED, ToolStatus.MAINTENANCE],
        },
      },
    }),
  };

  return Promise.all(Object.values(queries)).then(
    ([
      totalTools,
      totalToolTypes,
      totalManufacturers,
      totalLocations,
      lowStockTools,
      toolsUpdatedThisWeek,
      issueStateTools,
    ]) => ({
      totalTools,
      totalToolTypes,
      totalManufacturers,
      totalLocations,
      lowStockTools,
      toolsUpdatedThisWeek,
      issueStateTools,
    }),
  );
}

export function getLatestImport() {
  return prisma.importBatch.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      fileName: true,
      sheetName: true,
      status: true,
      createdAt: true,
    },
  });
}

export function getLatestBackup() {
  return prisma.backupLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      type: true,
      fileName: true,
      status: true,
      createdAt: true,
    },
  });
}

export function getLatestWeeklyEmail() {
  return prisma.weeklySummaryLog.findFirst({
    orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    select: {
      recipientEmail: true,
      subject: true,
      status: true,
      sentAt: true,
    },
  });
}
