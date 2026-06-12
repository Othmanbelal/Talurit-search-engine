import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function listUsedInCards() {
  return prisma.usedInCard.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      spots: { orderBy: { sortOrder: "asc" }, include: { assignments: { where: { returnedAt: null } } } },
      _count: { select: { assignments: true, stockAssignments: { where: { returnedAt: null } } } },
    },
  });
}

export function createUsedInCard(data: Prisma.UsedInCardUncheckedCreateInput) {
  return prisma.usedInCard.create({
    data,
    include: { spots: true, _count: { select: { assignments: true, stockAssignments: { where: { returnedAt: null } } } } },
  });
}

export function createUsedInCardWithSpots(args: {
  createdByUserId: string;
  description?: string | null;
  name: string;
  spotNames: string[];
}) {
  return prisma.usedInCard.create({
    data: {
      createdByUserId: args.createdByUserId,
      description: args.description,
      name: args.name,
      spots: {
        create: uniqueSpotNames(args.spotNames).map((name, index) => ({ name, sortOrder: index })),
      },
    },
    include: { spots: { orderBy: { sortOrder: "asc" } }, _count: { select: { assignments: true, stockAssignments: { where: { returnedAt: null } } } } },
  });
}

export function findUsedInCard(id: string) {
  return prisma.usedInCard.findUnique({
    where: { id },
    include: {
      spots: {
        orderBy: { sortOrder: "asc" },
        include: { assignments: { where: { returnedAt: null } } },
      },
      stockAssignments: {
        where: { returnedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          card: true,
          spot: true,
          sourceInventoryTable: true,
          sourceStockBalance: {
            include: {
              item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
              location: true,
              usedInAssignments: { where: { returnedAt: null }, include: { card: true } },
            },
          },
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        include: {
          inventory: { include: { columns: { orderBy: { sourceIndex: "asc" } } } },
          row: true,
        },
      },
    },
  });
}

export function updateUsedInCardBase(id: string, data: { description?: string | null; name: string }) {
  return prisma.usedInCard.update({
    where: { id },
    data,
    include: {
      spots: { orderBy: { sortOrder: "asc" }, include: { assignments: { where: { returnedAt: null } } } },
      _count: { select: { assignments: true, stockAssignments: { where: { returnedAt: null } } } },
    },
  });
}

export function replaceUsedInCardSpots(cardId: string, spots: { id?: string; name: string }[]) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.usedInSpot.findMany({
      where: { cardId },
      include: { assignments: { where: { returnedAt: null } } },
    });
    const wantedIds = new Set(spots.flatMap((spot) => spot.id ? [spot.id] : []));
    const occupiedRemoved = existing.find((spot) => !wantedIds.has(spot.id) && spot.assignments.length > 0);
    if (occupiedRemoved) throw new Error(`Spot "${occupiedRemoved.name}" has an assigned item and cannot be deleted.`);

    for (const [index, spot] of spots.entries()) {
      if (spot.id) {
        await tx.usedInSpot.update({ where: { id: spot.id, cardId }, data: { name: spot.name, sortOrder: index } });
      } else {
        await tx.usedInSpot.create({ data: { cardId, name: spot.name, sortOrder: index } });
      }
    }
    await tx.usedInSpot.deleteMany({ where: { cardId, id: { notIn: Array.from(wantedIds) }, assignments: { none: { returnedAt: null } } } });
  });
}

export function deleteUsedInCardRecord(id: string) {
  return prisma.usedInCard.delete({ where: { id } });
}

export function countUsedInCardAssignments(id: string) {
  return prisma.$transaction([
    prisma.usedInAssignment.count({ where: { cardId: id } }),
    prisma.usedInStockAssignment.count({ where: { cardId: id, returnedAt: null } }),
  ]);
}

export function findRowsForAssignment(rowIds: string[]) {
  return prisma.dynamicInventoryRow.findMany({
    where: { id: { in: rowIds } },
    select: { id: true, inventoryId: true },
  });
}

export function createUsedInAssignments(args: {
  cardId: string;
  notes?: string | null;
  quantity?: number | null;
  rows: { id: string; inventoryId: string }[];
}) {
  return prisma.usedInAssignment.createMany({
    data: args.rows.map((row) => ({
      cardId: args.cardId,
      inventoryId: row.inventoryId,
      notes: args.notes,
      quantity: args.quantity,
      rowId: row.id,
    })),
    skipDuplicates: true,
  });
}

export function deleteUsedInAssignment(id: string) {
  return prisma.usedInAssignment.delete({ where: { id } });
}

function uniqueSpotNames(spotNames: string[]) {
  return [...new Set(spotNames.map((name) => name.trim()).filter(Boolean))];
}
