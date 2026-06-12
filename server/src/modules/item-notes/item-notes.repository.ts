import { prisma } from "../../db/prisma";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  role: true,
  profile: { select: { profilePictureUrl: true } },
} as const;

export async function findNotesByStockBalance(stockBalanceId: string) {
  return prisma.itemNote.findMany({
    where: { stockBalanceId },
    include: { author: { select: AUTHOR_SELECT } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createNote(stockBalanceId: string, authorId: string, content: string) {
  return prisma.itemNote.create({
    data: { stockBalanceId, authorId, content },
    include: { author: { select: AUTHOR_SELECT } },
  });
}

export async function findNoteById(id: string) {
  return prisma.itemNote.findUnique({ where: { id } });
}

export async function deleteNoteById(id: string) {
  return prisma.itemNote.delete({ where: { id } });
}

export async function findRecentNotes(tableId: string | undefined, limit: number) {
  return prisma.itemNote.findMany({
    where: tableId ? { stockBalance: { inventoryTableId: tableId } } : undefined,
    include: {
      author: { select: AUTHOR_SELECT },
      stockBalance: {
        select: {
          id: true,
          inventoryTableId: true,
          inventoryTable: { select: { id: true, name: true } },
          item: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
