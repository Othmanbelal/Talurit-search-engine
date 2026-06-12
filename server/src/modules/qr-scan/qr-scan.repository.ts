import { prisma } from "../../db/prisma";

export function findRowsByQrCandidates(candidates: string[]) {
  return prisma.stockBalance.findMany({
    where: {
      status: { not: "archived" },
      item: {
        is: {
          OR: [
            { qrCodeId: { in: candidates } },
            { id: { in: candidates } },
            { qrCodeImageUrl: { in: candidates } },
            { identifiers: { some: { value: { in: candidates } } } },
          ],
        },
      },
    },
    include: {
      inventoryTable: { include: { group: true } },
      item: {
        include: {
          manufacturer: true,
          category: true,
          identifiers: true,
          attributes: true,
        },
      },
      location: true,
      warehouseSlotAssignments: {
        where: { unassignedAt: null },
        include: {
          warehouse: true,
          slot: { include: { shelf: true } },
        },
      },
      usedInAssignments: {
        where: { returnedAt: null },
        include: { card: true, spot: true },
      },
    },
    orderBy: [{ inventoryTable: { name: "asc" } }, { item: { name: "asc" } }],
    take: 25,
  });
}

export function findManagersForRows(tableIds: string[], groupIds: string[]) {
  return prisma.resourceManager.findMany({
    where: {
      OR: [
        { resourceType: "inventory_table", resourceId: { in: tableIds } },
        { resourceType: "inventory_group", resourceId: { in: groupIds } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile: { select: { profilePictureUrl: true, phoneNumber: true } },
        },
      },
    },
  });
}
