import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

const shelfInclude = {
  storageLocation: { select: { id: true, code: true, displayName: true } },
  warehouseObject: { select: { id: true, externalObjectId: true, name: true, objectType: true } },
  slots: {
    include: {
      storageLocation: { select: { id: true, code: true } },
      assignments: {
        where: { unassignedAt: null },
        select: {
          stockBalance: {
            select: {
              compartment: true,
              location: { select: { code: true } },
            },
          },
        },
        take: 1,
      },
      _count: { select: { assignments: { where: { unassignedAt: null } } } },
    },
    orderBy: [{ sortOrder: "asc" }, { compartment: "asc" }],
  },
  _count: { select: { slots: true } },
} satisfies Prisma.WarehouseShelfInclude;

export type ShelfRecord = Prisma.WarehouseShelfGetPayload<{ include: typeof shelfInclude }>;

export function listShelfRecords(warehouseId: string) {
  return prisma.warehouseShelf.findMany({
    where: { warehouseId },
    include: shelfInclude,
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
}

export function findShelfRecord(warehouseId: string, shelfId: string) {
  return prisma.warehouseShelf.findFirst({ where: { id: shelfId, warehouseId }, include: shelfInclude });
}

export function findSlotRecord(warehouseId: string, slotId: string) {
  return prisma.warehouseSlot.findFirst({
    where: { id: slotId, warehouseId },
    include: { assignments: { where: { unassignedAt: null }, select: { id: true } } },
  });
}

export function countActiveShelfAssignments(shelfId: string) {
  return prisma.warehouseSlotAssignment.count({ where: { slot: { shelfId }, unassignedAt: null } });
}

export function countActiveSlotAssignments(slotId: string) {
  return prisma.warehouseSlotAssignment.count({ where: { slotId, unassignedAt: null } });
}

export async function deleteShelfRecord(warehouseId: string, shelfId: string) {
  await prisma.warehouseSlot.deleteMany({ where: { shelfId, warehouseId } });
  return prisma.warehouseShelf.delete({ where: { id: shelfId } });
}

export function deleteSlotRecord(slotId: string) {
  return prisma.warehouseSlot.delete({ where: { id: slotId } });
}

export function touchWarehouse(warehouseId: string) {
  return prisma.warehouseLayout.update({ where: { id: warehouseId }, data: { version: { increment: 1 } } });
}

export { shelfInclude };
