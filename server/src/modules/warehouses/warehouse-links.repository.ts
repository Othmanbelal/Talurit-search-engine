import { prisma } from "../../db/prisma";

export function findInventoryLinks(warehouseId: string) {
  return Promise.all([
    prisma.warehouseInventoryGroupLink.findMany({
      where: { warehouseId },
      include: {
        inventoryGroup: {
          select: { id: true, name: true, _count: { select: { tables: true } } },
        },
      },
    }),
    prisma.warehouseInventoryTableLink.findMany({
      where: { warehouseId },
      include: {
        inventoryTable: { select: { id: true, name: true, groupId: true } },
      },
    }),
  ]);
}

export function findAvailableGroups(warehouseId: string) {
  return prisma.inventoryGroup.findMany({
    where: { warehouseLinks: { none: { warehouseId } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function findAvailableTables(warehouseId: string) {
  return prisma.inventoryTable.findMany({
    where: { warehouseLinks: { none: { warehouseId } } },
    select: { id: true, name: true, groupId: true },
    orderBy: { name: "asc" },
  });
}

export function createGroupLink(warehouseId: string, groupId: string) {
  return prisma.warehouseInventoryGroupLink.create({
    data: { warehouseId, inventoryGroupId: groupId },
    include: {
      inventoryGroup: {
        select: { id: true, name: true, _count: { select: { tables: true } } },
      },
    },
  });
}

export function deleteGroupLink(warehouseId: string, groupId: string) {
  return prisma.warehouseInventoryGroupLink.deleteMany({
    where: { warehouseId, inventoryGroupId: groupId },
  });
}

export function createTableLink(warehouseId: string, tableId: string) {
  return prisma.warehouseInventoryTableLink.create({
    data: { warehouseId, inventoryTableId: tableId },
    include: {
      inventoryTable: { select: { id: true, name: true, groupId: true } },
    },
  });
}

export function deleteTableLink(warehouseId: string, tableId: string) {
  return prisma.warehouseInventoryTableLink.deleteMany({
    where: { warehouseId, inventoryTableId: tableId },
  });
}
