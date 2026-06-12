import type { Prisma } from "@prisma/client";
import type { ListToolsQuery } from "./tools.schemas";

export function buildToolWhere(query: ListToolsQuery): Prisma.ToolWhereInput {
  const where: Prisma.ToolWhereInput = {};

  if (query.archived !== "all") {
    where.isArchived = query.archived === "true";
  }

  if (query.status) where.status = query.status;
  if (query.toolTypeId) where.toolTypeId = query.toolTypeId;
  if (query.manufacturerId) where.manufacturerId = query.manufacturerId;
  if (query.locationId) where.locationId = query.locationId;
  if (query.machineId) where.machineId = query.machineId;

  if (query.placement === "machine" && !query.machineId) {
    where.machineId = { not: null };
  }

  if (query.placement === "location" && !query.locationId) {
    where.machineId = null;
    where.locationId = { not: null };
  }

  if (query.placement === "unassigned") {
    where.machineId = null;
    where.locationId = null;
  }

  if (query.q) {
    const contains = query.q;

    // Search targets the fields users naturally know from the workbook.
    where.OR = [
      { productName: { contains, mode: "insensitive" } },
      { articleNumber: { contains, mode: "insensitive" } },
      { alternativeArticleNumber: { contains, mode: "insensitive" } },
      { grade: { contains, mode: "insensitive" } },
      { holder: { contains, mode: "insensitive" } },
      { holderSecondary: { contains, mode: "insensitive" } },
      { machineRaw: { contains, mode: "insensitive" } },
      { notes: { contains, mode: "insensitive" } },
      { manufacturer: { name: { contains, mode: "insensitive" } } },
      { toolType: { name: { contains, mode: "insensitive" } } },
      { location: { rawLabel: { contains, mode: "insensitive" } } },
    ];
  }

  return where;
}

export function buildToolOrderBy(
  query: ListToolsQuery,
): Prisma.ToolOrderByWithRelationInput[] {
  const direction = query.sortDirection;

  if (query.sortBy === "manufacturer") {
    return [{ manufacturer: { name: direction } }, { updatedAt: "desc" }];
  }

  return [{ [query.sortBy]: direction }, { id: "asc" }];
}
