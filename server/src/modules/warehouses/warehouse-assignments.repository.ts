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
          identifiers: { select: { type: true, value: true } },
          manufacturer: { select: { id: true, name: true } },
        },
      },
      location: { select: { id: true, code: true, displayName: true } },
      inventoryTable: { select: { id: true, name: true } },
    },
  },
  assignedByUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.WarehouseSlotAssignmentInclude;

const assignableRowInclude = {
  item: {
    select: {
      id: true,
      name: true,
      identifiers: { select: { type: true, value: true } },
      manufacturer: { select: { id: true, name: true } },
    },
  },
  location: { select: { id: true, code: true } },
  inventoryTable: { select: { id: true, name: true } },
  warehouseSlotAssignments: {
    where: { unassignedAt: null },
    select: {
      id: true,
      warehouse: { select: { id: true, name: true } },
      slot: { select: { id: true, slotIndex: true } },
    },
    take: 1,
  },
} satisfies Prisma.StockBalanceInclude;

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
    select: { id: true, warehouseId: true, isActive: true, maxAssignments: true, fackEnabled: true, fackCount: true },
  });
}

export function countActiveSlotAssignments(slotId: string) {
  return prisma.warehouseSlotAssignment.count({ where: { slotId, unassignedAt: null } });
}

export function searchAssignableRows(tableIds: string[], search: string, tableId: string | undefined, limit?: number) {
  if (tableIds.length === 0) return Promise.resolve([]);
  const allowedTableIds = tableId ? (tableIds.includes(tableId) ? [tableId] : []) : tableIds;
  if (allowedTableIds.length === 0) return Promise.resolve([]);
  const searchWhere: Prisma.StockBalanceWhereInput = search.trim() ? {
    OR: [
      { item: { name: { contains: search, mode: "insensitive" } } },
      { item: { manufacturer: { is: { name: { contains: search, mode: "insensitive" } } } } },
      { item: { identifiers: { some: { value: { contains: search, mode: "insensitive" } } } } },
      { location: { code: { contains: search, mode: "insensitive" } } },
    ],
  } : {};

  const where: Prisma.StockBalanceWhereInput = {
    archivedAt: null,
    status: "active",
    inventoryTableId: { in: allowedTableIds },
    ...searchWhere,
  };

  return prisma.stockBalance.findMany({
    where,
    include: assignableRowInclude,
    orderBy: [{ inventoryTable: { name: "asc" } }, { item: { name: "asc" } }],
    ...(limit ? { take: limit } : {}),
  });
}

export function findAssignableRowsByQrCandidates(tableIds: string[], candidates: string[], limit: number) {
  if (tableIds.length === 0 || candidates.length === 0) return Promise.resolve([]);
  return prisma.stockBalance.findMany({
    where: {
      archivedAt: null,
      status: "active",
      inventoryTableId: { in: tableIds },
      item: {
        OR: [
          { qrCodeId: { in: candidates } },
          { id: { in: candidates } },
          { identifiers: { some: { value: { in: candidates } } } },
        ],
      },
    },
    include: assignableRowInclude,
    orderBy: [{ inventoryTable: { name: "asc" } }, { item: { name: "asc" } }],
    take: limit,
  });
}

export function replaceAssignment(data: {
  warehouseId: string;
  slotId: string;
  stockBalanceId: string;
  itemId: string;
  inventoryTableId?: string | null;
  assignedByUserId?: string | null;
  notes?: string | null;
  activeSlotKey: string;
  containerType: string;
  fackNumber: string | null;
}, existingAssignmentId?: string) {
  return prisma.$transaction(async (tx) => {
    if (existingAssignmentId) {
      await tx.warehouseSlotAssignment.update({
        where: { id: existingAssignmentId },
        data: {
          unassignedAt: new Date(),
          unassignedByUserId: data.assignedByUserId,
          activeSlotKey: null,
        },
      });
    }
    return tx.warehouseSlotAssignment.create({
      data: {
        warehouseId: data.warehouseId,
        slotId: data.slotId,
        stockBalanceId: data.stockBalanceId,
        itemId: data.itemId,
        inventoryTableId: data.inventoryTableId,
        assignedByUserId: data.assignedByUserId,
        notes: data.notes,
        activeSlotKey: data.activeSlotKey,
        containerType: data.containerType,
        fackNumber: data.fackNumber,
      },
      include: assignmentInclude,
    });
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
    select: { id: true, itemId: true, inventoryTableId: true, compartment: true },
  });
}
