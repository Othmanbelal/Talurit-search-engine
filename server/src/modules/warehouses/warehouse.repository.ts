import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type {
  CreateWarehouseInput,
  ListWarehousesQuery,
  UpdateWarehouseInput,
} from "./warehouse.schemas";

const warehouseInclude = {
  createdByUser: { select: { id: true, name: true, email: true } },
  _count: {
    select: {
      assignments: true,
      groupLinks: true,
      objects: true,
      shelves: true,
      slots: true,
      tableLinks: true,
    },
  },
};

export type WarehouseRecord = Prisma.WarehouseLayoutGetPayload<{
  include: typeof warehouseInclude;
}>;

export function findWarehouses(query: ListWarehousesQuery) {
  return prisma.warehouseLayout.findMany({
    where: archiveWhere(query.archived),
    include: warehouseInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export function findWarehouse(id: string) {
  return prisma.warehouseLayout.findUnique({
    where: { id },
    include: warehouseInclude,
  });
}

export function createWarehouseRecord(input: CreateWarehouseInput, userId?: string) {
  return prisma.warehouseLayout.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      layoutData: jsonInput(input.layoutData ?? {}),
      createdByUserId: userId,
    },
    include: warehouseInclude,
  });
}

export function updateWarehouseRecord(id: string, input: UpdateWarehouseInput) {
  return prisma.warehouseLayout.update({
    where: { id },
    data: input,
    include: warehouseInclude,
  });
}

export function saveWarehouseLayoutRecord(id: string, layoutData: Record<string, unknown>) {
  return prisma.warehouseLayout.update({
    where: { id },
    data: { layoutData: jsonInput(layoutData), version: { increment: 1 } },
    include: warehouseInclude,
  });
}

export function archiveWarehouseRecord(id: string) {
  return prisma.warehouseLayout.update({
    where: { id },
    data: { isArchived: true },
    include: warehouseInclude,
  });
}

export function deleteWarehouseRecord(id: string) {
  return prisma.warehouseLayout.delete({ where: { id } });
}

function archiveWhere(archived: ListWarehousesQuery["archived"]): Prisma.WarehouseLayoutWhereInput {
  if (archived === "archived") return { isArchived: true };
  if (archived === "active") return { isArchived: false };
  return {};
}

function jsonInput(value: Record<string, unknown>) {
  return value as Prisma.InputJsonObject;
}
