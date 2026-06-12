import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function createDynamicInventory(args: {
  columns: { key: string; name: string; sourceIndex: number }[];
  importedByUserId: string;
  name: string;
  rows: { data: Prisma.InputJsonValue; rowNumber: number }[];
  sourceFileName: string;
  sourceSheetName: string;
}) {
  return prisma.dynamicInventory.create({
    data: {
      importedByUserId: args.importedByUserId,
      name: args.name,
      sourceFileName: args.sourceFileName,
      sourceSheetName: args.sourceSheetName,
      columns: {
        create: args.columns.map((column) => ({
          key: column.key,
          name: column.name,
          sourceIndex: column.sourceIndex,
        })),
      },
      rows: {
        createMany: {
          data: args.rows,
        },
      },
    },
    include: { _count: { select: { columns: true, rows: true } } },
  });
}

export function listDynamicInventories() {
  return prisma.dynamicInventory.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { columns: true, rows: true } } },
  });
}

export function findDynamicInventory(id: string) {
  return prisma.dynamicInventory.findUnique({
    where: { id },
    include: {
      columns: { orderBy: { sourceIndex: "asc" } },
      _count: { select: { rows: true } },
    },
  });
}

export function findDynamicInventoryRows(args: {
  inventoryId: string;
  skip: number;
  take: number;
}) {
  return prisma.$transaction([
    prisma.dynamicInventoryRow.count({ where: { inventoryId: args.inventoryId } }),
    prisma.dynamicInventoryRow.findMany({
      where: { inventoryId: args.inventoryId },
      orderBy: { rowNumber: "asc" },
      skip: args.skip,
      take: args.take,
    }),
  ]);
}
