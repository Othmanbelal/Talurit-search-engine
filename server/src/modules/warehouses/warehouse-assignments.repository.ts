import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

const assignmentInclude = {
  slot: {
    select: {
      id: true,
      code: true,
      compartment: true,
      displayName: true,
      storageLocation: { select: { id: true, code: true } },
      shelf: { select: { id: true, code: true, displayName: true } },
    },
  },
  stockBalance: {
    include: {
      item: {
        select: {
          id: true,
          name: true,
          manufacturer: { select: { id: true, name: true } },
        },
      },
      location: { select: { id: true, code: true, displayName: true } },
      inventoryTable: { select: { id: true, name: true } },
    },
  },
  assignedByUser: { select: { id: true, email: true } },
} satisfies Prisma.WarehouseSlotAssignmentInclude;

export type AssignmentRecord = Prisma.WarehouseSlotAssignmentGetPayload<{ include: typeof assignmentInclude }>;

export function findActiveAssignmentsForWarehouse(warehouseId: string) {
  return prisma.warehouseSlotAssignment.findMany({
    where: { warehouseId, unassignedAt: null },
    include: assignmentInclude,
    orderBy: { assignedAt: "desc" },
  });
}

export function findActiveAssignmentsForSlot(slotId: string) {
  return prisma.warehouseSlotAssignment.findMany({
    where: { slotId, unassignedAt: null },
    include: assignmentInclude,
    orderBy: { assignedAt: "desc" },
  });
}

export function findActiveAssignmentByStock(stockBalanceId: string) {
  return prisma.warehouseSlotAssignment.findFirst({
    where: { stockBalanceId, unassignedAt: null },
    include: {
      warehouse: { select: { id: true, name: true } },
      slot: { select: { id: true, code: true, compartment: true, displayName: true } },
    },
  });
}

export function findAssignment(assignmentId: string, warehouseId: string) {
  return prisma.warehouseSlotAssignment.findFirst({
    where: { id: assignmentId, warehouseId, unassignedAt: null },
    select: { id: true, slotId: true, stockBalanceId: true, activeSlotKey: true },
  });
}

export function findSlotForAssignment(slotId: string) {
  return prisma.warehouseSlot.findFirst({
    where: { id: slotId },
    select: { id: true, warehouseId: true, isActive: true, maxAssignments: true },
  });
}

export function countActiveSlotAssignments(slotId: string) {
  return prisma.warehouseSlotAssignment.count({ where: { slotId, unassignedAt: null } });
}

export function searchAssignableRows(warehouseId: string, search: string, tableId: string | undefined, limit: number) {
  const searchWhere: Prisma.StockBalanceWhereInput = search.trim() ? {
    OR: [
      { item: { name: { contains: search, mode: "insensitive" } } },
      { item: { manufacturer: { is: { name: { contains: search, mode: "insensitive" } } } } },
      { location: { code: { contains: search, mode: "insensitive" } } },
    ],
  } : {};

  const where: Prisma.StockBalanceWhereInput = {
    archivedAt: null,
    status: "active",
    warehouseSlotAssignments: { none: { unassignedAt: null } },
    ...(tableId ? { inventoryTableId: tableId } : {}),
    ...searchWhere,
  };

  return prisma.stockBalance.findMany({
    where,
    include: {
      item: {
        select: {
          id: true,
          name: true,
          manufacturer: { select: { id: true, name: true } },
        },
      },
      location: { select: { id: true, code: true } },
      inventoryTable: { select: { id: true, name: true } },
    },
    orderBy: { item: { name: "asc" } },
    take: limit,
  });
}

export function createAssignment(data: {
  warehouseId: string;
  slotId: string;
  stockBalanceId: string;
  itemId: string;
  inventoryTableId?: string | null;
  assignedByUserId?: string | null;
  notes?: string | null;
  activeSlotKey: string;
}) {
  return prisma.warehouseSlotAssignment.create({
    data: {
      warehouseId: data.warehouseId,
      slotId: data.slotId,
      stockBalanceId: data.stockBalanceId,
      itemId: data.itemId,
      inventoryTableId: data.inventoryTableId,
      assignedByUserId: data.assignedByUserId,
      notes: data.notes,
      activeSlotKey: data.activeSlotKey,
    },
    include: assignmentInclude,
  });
}

export function closeAssignment(assignmentId: string, unassignedByUserId?: string | null) {
  return prisma.warehouseSlotAssignment.update({
    where: { id: assignmentId },
    data: { unassignedAt: new Date(), unassignedByUserId, activeSlotKey: null },
  });
}

export function findStockBalanceItemId(stockBalanceId: string) {
  return prisma.stockBalance.findFirst({
    where: { id: stockBalanceId },
    select: { id: true, itemId: true, inventoryTableId: true },
  });
}
